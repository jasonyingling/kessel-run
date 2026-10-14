import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

export default async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'kr-browser-fixture-'));
  const privateRoot = join(root, 'private');
  await mkdir(privateRoot, { mode: 0o700 });
  const session = randomBytes(32).toString('hex');
  await writeFile(join(privateRoot, 'session.json'), JSON.stringify({ tokenHash: createHash('sha256').update(session).digest('hex'), workspaceId: randomUUID(), expires: Date.now() + 3600000 }), { mode: 0o600 });
  process.env.KR_E2E_SESSION = session;
  process.env.KR_E2E_ROOT = root;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3197'], {
    env: { ...process.env, OPENAI_API_KEY: '', KESSEL_RUN_PRIVATE_ROOT: privateRoot, KESSEL_RUN_ORIGIN: 'http://127.0.0.1:3197' }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error('Synthetic server exited before readiness');
      try { ready = (await fetch('http://127.0.0.1:3197/kessel-run')).ok; } catch { /* Waiting for readiness. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('Synthetic server did not become ready');
    return async () => { server.kill('SIGTERM'); await rm(root, { recursive: true, force: true }); };
  } catch (error) {
    server.kill('SIGTERM'); await rm(root, { recursive: true, force: true }); throw error;
  }
}
