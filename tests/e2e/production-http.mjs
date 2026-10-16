// HTTP-only production launch verification. This never opens/renders a browser.
import { mkdtemp, mkdir, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createConnection } from 'node:net';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const npmPath = process.argv[2];
const launchMode = process.argv[3] === 'fake-dev' ? 'dev' : 'start';
const fake = ['fake-dev', 'fake-production'].includes(process.argv[3]);
if (!npmPath) throw new Error('Pass the installed npm CLI path; no global configuration is read.');
const root = await mkdtemp(join(tmpdir(), 'kr-production-http-'));
const privateRoot = join(root, 'private');
const bin = join(root, 'bin');
await mkdir(bin); await symlink(process.execPath, join(bin, 'node'));
const origin = 'http://127.0.0.1:3198';
let child;
const clients = [];
function check(value, label) { if (!value) throw new Error(`Production HTTP check failed: ${label}`); }
async function shutdown() {
  if (!child) return;
  const exited = child.exitCode === null && child.signalCode === null ? once(child, 'exit') : Promise.resolve();
  const killGroup = signal => { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  killGroup('SIGTERM');
  const force = setTimeout(() => killGroup('SIGKILL'), 5000);
  await exited;
  let closed = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    const listening = await new Promise(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port: 3198 });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => { socket.destroy(); resolve(false); });
      socket.setTimeout(300, () => { socket.destroy(); resolve(true); });
    });
    if (!listening) { closed = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  clearTimeout(force); check(closed, 'owned server stops listening before restart');
  child = undefined;
}
async function launch() {
  let output = '';
  child = spawn(process.execPath, [await realpath(npmPath), 'run', `app:${launchMode}`], {
    env: { ...process.env, NODE_ENV: launchMode === 'dev' ? 'development' : 'production', PATH: `${bin}:/usr/bin:/bin`, PORT: '3198', OPENAI_API_KEY: '', KESSEL_RUN_ENABLE_LEGACY: '', KESSEL_RUN_TEST_PROVIDER: fake ? 'fake' : '', KESSEL_RUN_TEST_ROOT: root, KESSEL_RUN_PRIVATE_ROOT: privateRoot, KESSEL_RUN_CONTENT_PARENT: join(root, 'content') }, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', value => { output += value.toString(); });
  child.stderr.on('data', () => { /* No raw runtime logs or pairing secrets are printed by this check. */ });
  for (let count = 0; count < 120; count++) {
    check(child.exitCode === null, 'launcher remains running');
    try { if ((await fetch(`${origin}/kessel-run`)).ok && /#pair=[a-f0-9]{64}/.test(output)) break; } catch { /* Wait for loopback readiness. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const pairing = output.match(/#pair=([a-f0-9]{64})/)?.[1];
  check(pairing, 'single-use pairing emitted');
  const paired = await fetch(`${origin}/api/kessel-run/local/pair`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ token: pairing }) });
  if (!paired.ok) {
    const reason = (await paired.json()).reason;
    check(false, `pairing exchange status ${paired.status}, boundary ${['local-access', 'configured-origin', 'host', 'url-origin', 'origin', 'cross-site', 'invalid-input'].includes(reason) ? reason : 'unknown'}`);
  }
  const cookie = paired.headers.get('set-cookie')?.split(';')[0];
  check(cookie, 'HttpOnly session issued');
  check(paired.headers.get('set-cookie')?.includes('HttpOnly'), 'HttpOnly attribute');
  return { cookie, headers: { cookie, origin, 'content-type': 'application/json', 'x-kr-csrf': 'local' } };
}
async function request(path, headers, input) {
  const response = await fetch(`${origin}/api/kessel-run/local/${path}`, { method: input === undefined ? 'GET' : 'POST', headers, body: input === undefined ? undefined : JSON.stringify(input) });
  check(response.ok, `${path} returned success`);
  return response.json();
}
const operationId = () => crypto.randomUUID();
try {
  const session = await launch();
  check((await fetch(`${origin}/api/kessel-run/local/credentials`)).status === 401, 'unpaired read denied');
  const status = await request('credentials', session.headers);
  check(status.environment === false && status.saved === null, 'no model key configured');
  check((await fetch(`${origin}/api/kessel-run/local/models?source=environment`)).status === 401, 'unpaired model discovery denied');
  const catalog = await request('models', session.headers);
  check(JSON.stringify(catalog.models.map(model => model.id)) === JSON.stringify(['gpt-6.1-sol', 'gpt-6-luna']), 'requested model choices');
  const unavailable = await request('models?source=saved', session.headers);
  check(!unavailable.checked && unavailable.models.every(model => model.available === false), 'no-key discovery preserves unavailable state without inference');
  check((await fetch(`${origin}/api/kessel-run/local/models?source=invalid`, { headers: session.headers })).status === 400, 'invalid discovery source denied');
  check((await fetch(`${origin}/api/chat`, { method: 'POST', headers: session.headers, body: '{}' })).status === 403, 'legacy generation disabled');
  check((await request('bootstrap', session.headers)).status === 'uninitialized', 'genuine first use is explicit');
  const bootstrapInput = { operationId: operationId(), title: 'Synthetic publication' };
  // Fake-provider checks retain their explicit Synthetic workspace guard. The
  // normal mode above/below exercises the real keyless publication bootstrap.
  const workspace = fake ? await request('workspace', session.headers, { operationId: operationId(), title: 'Synthetic production HTTP workspace', root: join(root, 'fake-content') }) : await request('bootstrap', session.headers, bootstrapInput);
  if (!fake) check(JSON.stringify(await request('bootstrap', session.headers, bootstrapInput)) === JSON.stringify(workspace), 'identical bootstrap retry returns original result');
  session.headers['x-kr-workspace-ref'] = workspace.id;
  let state = await request('workspace', session.headers);
  const publication = fake ? await request('content', session.headers, { action: 'publication', input: { operationId: operationId(), expectedHash: state.workspace.hash, title: 'Synthetic publication', purpose: 'Supplied synthetic purpose', presets: ['Article', 'Short post'] } }) : { id: workspace.publicationId };
  state = await request('workspace', session.headers);
  const profile = await request('content', session.headers, { action: 'profile-import', input: { operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: publication.id, title: 'Synthetic voice', prose: 'Use supplied facts only.\n', scope: 'publication', authorId: null, parent: null, provenance: 'Explicitly confirmed synthetic HTTP fixture' } });
  state = await request('workspace', session.headers);
  const piece = await request('content', session.headers, { action: 'piece', input: { operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: publication.id, title: 'Synthetic piece', brief: 'Supplied workshop notes', mode: 'fast' } });
  state = await request('workspace', session.headers);
  const output = await request('content', session.headers, { action: 'output', input: { operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: piece.id, title: 'Article', format: 'Article', preset: state.presets.find(preset => preset.title === 'Article').id, voice: { profileId: profile.id, version: 1 }, author: null } });
  let context = await request('content', session.headers, { action: 'context', input: { outputId: output.id } });
  await request('content', session.headers, { action: 'editor', input: { operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: output.id, prose: 'Exact synthetic human prose.\n' } });
  const tokenIndex = await request('connections', session.headers);
  const issued = await request('connections', session.headers, { clientName: 'Synthetic production SDK client', publicationIds: [publication.id], allowDrafts: true, allowSources: true, expectedVersion: tokenIndex.version, operationId: operationId() });
  const client = new Client({ name: 'production-http-fixture', version: '1.0.0' });
  clients.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/api/mcp`), { authProvider: { token: async () => issued.token } }));
  check((await client.listTools()).tools.length === 12, 'real SDK discovery');
  context = await request('content', session.headers, { action: 'context', input: { outputId: output.id } });
  const result = await client.callTool({ name: 'kr_propose_draft', arguments: { operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: output.id, prose: 'Exact external SDK candidate.\n', declaredModel: 'unverified-client-model' } });
  check(!result.isError, 'external candidate committed with no app key');
  const after = await request('content', session.headers, { action: 'context', input: { outputId: output.id } });
  check(after.output.body === 'Exact synthetic human prose.\n' && after.pending.length === 1, 'shared revisions preserve editor and candidate');
  const cleanupInput = { requestId: operationId(), scope: output.id, scopeKind: 'output', text: 'Synthetic um supplied notes.', source: 'saved', model: 'gpt-6-luna' };
  const cleanupRequest = (headers, input = cleanupInput) => fetch(origin + '/api/kessel-run/local/cleanup', { method: 'POST', headers, body: JSON.stringify(input) });
  check((await cleanupRequest({ origin, 'content-type': 'application/json' })).status === 401, 'cleanup unpaired rejected');
  check((await cleanupRequest({ ...session.headers, 'x-kr-csrf': '' })).status === 403, 'cleanup CSRF rejected');
  check((await cleanupRequest({ ...session.headers, origin: 'https://invalid.example' })).status === 403, 'cleanup foreign origin rejected');
  check((await cleanupRequest({ ...session.headers, 'x-kr-workspace-ref': operationId() })).status === 409, 'cleanup stale workspace rejected');
  check((await cleanupRequest(session.headers, { ...cleanupInput, scope: operationId() })).status === 400, 'cleanup nonexistent target rejected');
  check((await cleanupRequest(session.headers, { ...cleanupInput, text: 'x'.repeat(20001) })).status === 400, 'cleanup oversized text rejected');
  const cleaned = await cleanupRequest(session.headers);
  if (fake && launchMode === 'dev') check(cleaned.ok && (await cleaned.json()).suggestion === 'Synthetic cleaned fixture text.', 'guarded synthetic cleanup round-trip');
  else check(cleaned.status === 400, fake ? 'production cleanup fake refusal' : 'cleanup no-key safe failure');
  const afterCleanup = await request('content', session.headers, { action: 'context', input: { outputId: output.id } });
  check(JSON.stringify(afterCleanup) === JSON.stringify(after), 'cleanup does not mutate content or proposals');
  let expectedPending = 1;
  if (fake) {
    const response = await fetch(`${origin}/api/kessel-run/local/writing`, { method: 'POST', headers: session.headers, body: JSON.stringify({ operationId: operationId(), scope: output.id, scopeKind: 'output', message: 'Supplied synthetic fixture notes.', mode: 'fast', source: 'saved', model: 'gpt-6-luna' }) });
    if (launchMode === 'dev') {
      check(response.ok && (await response.text()).includes('completed'), 'development fake provider round-trip');
      const runResponse = await fetch(`${origin}/api/kessel-run/local/writing?scope=${output.id}`, { headers: session.headers });
      const runs = await runResponse.json();
      check(runs[0].engine === 'fake' && runs[0].status === 'completed', 'fixture engine metadata');
      expectedPending = 2;
    } else check(response.status === 400, 'production refuses fake provider');
  }
  const exported = await request('content', session.headers, { action: 'export', input: { outputId: output.id } });
  check(exported.handoff.includes('Exact external SDK candidate.') && exported.prose === 'Exact synthetic human prose.\n', 'complete no-key export');
  const csrf = await fetch(`${origin}/api/kessel-run/local/content`, { method: 'POST', headers: { cookie: session.cookie, origin, 'content-type': 'application/json', 'x-kr-workspace-ref': workspace.id }, body: JSON.stringify({ action: 'context', input: { outputId: output.id } }) });
  check(csrf.status === 403, 'CSRF denied');
  await Promise.all(clients.splice(0).map(client => client.close()));
  await shutdown();
  const restarted = await launch();
  restarted.headers['x-kr-workspace-ref'] = workspace.id;
  const resumed = await request('workspace', restarted.headers);
  check(resumed.workspace.id === workspace.id, 'stable identity after production restart');
  const reloaded = await request('content', restarted.headers, { action: 'context', input: { outputId: output.id } });
  check(reloaded.output.body === 'Exact synthetic human prose.\n' && reloaded.pending.length === expectedPending, 'durable text/candidate after restart');
  const next = await request('workspace', restarted.headers, { operationId: operationId(), root: join(root, 'new-content'), title: 'Synthetic switched workspace' });
  check(next.id !== workspace.id, 'explicit new workspace identity');
  const stale = await fetch(`${origin}/api/kessel-run/local/content`, { method: 'POST', headers: restarted.headers, body: JSON.stringify({ action: 'context', input: { outputId: output.id } }) });
  check(stale.status === 409, 'stale tab workspace scope denied');
  console.log(JSON.stringify({ launch: launchMode, launchResult: 'passed', fakeGuard: fake ? launchMode === 'dev' ? 'fixture round-trip passed' : 'production refusal passed' : 'not enabled', restart: 'passed', manualWithoutKey: 'passed', sdkMcpWithoutKey: 'passed', export: 'passed', cleanup: 'auth/CSRF/origin/scope/limits/no-mutation passed', browserInspection: 'not attempted', liveInference: 'not attempted', codexInstalled: 'not required' }));
} finally {
  await Promise.all(clients.map(client => client.close().catch(() => undefined)));
  await shutdown(); await rm(root, { recursive: true, force: true });
}
