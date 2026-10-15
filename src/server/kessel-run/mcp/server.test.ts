import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { WorkspaceService } from '../workspace/service';
import { AccessTokens } from './access-tokens';
import { handleMcp } from './server';
import { createWritingAgent } from '../ai/provider';

vi.mock('../ai/provider', () => ({ createWritingAgent: vi.fn(() => { throw new Error('MCP must never invoke inference'); }) }));
let folder: string;
let service: WorkspaceService;
let tokens: AccessTokens;
let http: ReturnType<typeof createServer>;
let origin: string;
const clients: Client[] = [];

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kr-mcp-'));
  service = new WorkspaceService(join(folder, 'content'), join(folder, 'workspace-private'));
  tokens = new AccessTokens(join(folder, 'tokens-private'));
  await service.initialize({ operationId: crypto.randomUUID(), title: 'Synthetic MCP workspace' });
  vi.stubEnv('OPENAI_API_KEY', '');
  http = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      const result = await handleMcp(new Request(`${origin}${request.url}`, {
        method: request.method, headers,
        body: request.method === 'POST' ? Buffer.concat(chunks).toString() : undefined,
      }), { tokens, service });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      response.writeHead(500); response.end('Test server operation failed');
    }
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Expected loopback listener');
  origin = `http://127.0.0.1:${address.port}`;
  vi.stubEnv('KESSEL_RUN_ORIGIN', origin);
});
afterEach(async () => {
  await Promise.all(clients.splice(0).map(client => client.close().catch(() => undefined)));
  http.close(); http.closeAllConnections();
  vi.unstubAllEnvs();
  await rm(folder, { recursive: true, force: true });
});

async function publication(title: string) {
  const current = await service.overview();
  const publication = await service.createPublication({ operationId: crypto.randomUUID(), expectedHash: current.workspace.hash, title, purpose: `${title} supplied purpose`, presets: ['article'] });
  const state = await service.overview();
  const selected = state.publications.find(value => value.id === publication.id)!;
  const voice = await service.confirmProfileImport({ operationId: crypto.randomUUID(), expectedHash: selected.hash, publicationId: String(publication.id), prose: `${title} supplied voice rules`, title: `${title} voice`, scope: 'publication', parent: null, authorId: null, provenance: 'Synthetic human-confirmed profile' });
  return { publicationId: String(publication.id), voice: { profileId: String(voice.id), version: 1 } };
}
async function connect(publicationIds: string[] | null, allowDrafts = true, allowSources = true) {
  const state = await service.overview();
  const index = await tokens.list(String(state.workspace.id));
  const issued = await tokens.issue({ workspaceId: String(state.workspace.id), clientName: 'Synthetic SDK client', publicationIds, allowDrafts, allowSources }, index.version);
  const client = new Client({ name: 'synthetic-sdk-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${origin}/api/mcp`), { authProvider: { token: async () => issued.token ?? undefined } });
  await client.connect(transport);
  clients.push(client);
  return { client, issued, workspaceId: String(state.workspace.id) };
}
async function call(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as { type: string; text?: string }[];
  const parsed = JSON.parse(content.find(item => item.type === 'text')!.text!);
  return { ...parsed, isError: result.isError === true };
}

it('discovers and performs the external writing sequence over real SDK HTTP without a model key or call', async () => {
  const pub = await publication('First');
  const { client } = await connect([pub.publicationId]);
  const discovery = await client.listTools();
  expect(discovery.tools).toHaveLength(12);
  expect(discovery.tools.some(tool => tool.name === 'generate_content')).toBe(false);
  const listed = await call(client, 'kr_list_publications', {});
  expect(listed.items).toHaveLength(1);
  expect(listed.items[0].body).toBeUndefined();
  const workflow = await call(client, 'kr_get_workflow', {});
  expect(workflow.name).toBe('kessel-run-start');
  expect(workflow.contentHash).toHaveLength(64);
  const created = await call(client, 'kr_create_piece', { operationId: crypto.randomUUID(), expectedHash: listed.items[0].hash, publicationId: pub.publicationId, title: 'Agent piece', brief: 'Supplied workshop brief', mode: 'fast' });
  expect(created.isError).toBe(false);
  const pieces = await call(client, 'kr_list_pieces', { publicationId: pub.publicationId });
  const output = await call(client, 'kr_create_output', { operationId: crypto.randomUUID(), expectedHash: pieces.items[0].hash, pieceId: created.id, title: 'Article', format: 'article', preset: 'article', voice: pub.voice, author: null });
  expect(output.isError).toBe(false);
  const source = await call(client, 'kr_save_source', { operationId: crypto.randomUUID(), expectedHash: pieces.items[0].hash, pieceId: created.id, title: 'Interview', body: 'Q: When?\nA: Tuesday at ten.', attribution: 'Supplied synthetic interview', sourceType: 'interview', referenceUrl: null });
  expect(source.retrievedUrl).toBe(false);
  const artifact = await call(client, 'kr_save_artifact', { operationId: crypto.randomUUID(), expectedHash: pieces.items[0].hash, pieceId: created.id, title: 'Outline', kind: 'outline', body: 'Workshop structure' });
  expect(artifact.proseChanged).toBe(false);
  const context = await call(client, 'kr_get_context', { outputId: output.id });
  const summary = JSON.parse(context.text);
  const proposalArgs = { operationId: crypto.randomUUID(), expectedHash: summary.outputHash, expectedContextHash: summary.contextHash, outputId: output.id, prose: 'Agent-supplied workshop candidate.', declaredModel: 'unverified-client-model' };
  const proposal = await call(client, 'kr_propose_draft', proposalArgs);
  expect(proposal.isError).toBe(false);
  expect(await call(client, 'kr_propose_draft', proposalArgs)).toEqual(proposal);
  const saved = await service.getContext(output.id);
  expect(saved.pending[0].id).toBe(proposal.proposalId);
  expect(saved.output.body).toBe('');
  const pubState = (await service.overview()).publications[0];
  const profile = await call(client, 'kr_propose_profile', { operationId: crypto.randomUUID(), expectedHash: pubState.hash, publicationId: pub.publicationId, title: 'Proposed voice', scope: 'publication', parent: null, authorId: null, prior: pub.voice, prose: 'Proposed sourced rules', evidence: 'Synthetic supplied editing evidence' });
  expect(profile.state).toBe('pending');
  const progress = await call(client, 'kr_record_progress', { operationId: crypto.randomUUID(), expectedHash: pieces.items[0].hash, pieceId: created.id, nextAction: 'Human reviews the agent proposal.' });
  expect(progress.isError).toBe(false);
  expect(createWritingAgent).not.toHaveBeenCalled();
});

it('reads voice setup before a piece exists with explicit versions and bounds incoming requests', async () => {
  const pub = await publication('Voice setup');
  const { client, issued } = await connect([pub.publicationId]);
  const summary = await call(client, 'kr_get_context', { publicationId: pub.publicationId });
  expect(summary.isError).toBe(false);
  expect(JSON.parse(summary.text).profiles[0].version).toBe(1);
  const unselected = await call(client, 'kr_get_context', { publicationId: pub.publicationId, section: 'voice' });
  expect(JSON.parse(unselected.text)).toBeNull();
  const selected = await call(client, 'kr_get_context', { publicationId: pub.publicationId, section: 'voice', voice: pub.voice });
  expect(JSON.parse(selected.text).body).toBe('Voice setup supplied voice rules');
  const absent = await call(client, 'kr_get_context', { publicationId: pub.publicationId, section: 'voice', voice: { ...pub.voice, version: 2 } });
  expect(absent.isError).toBe(true);
  expect(absent.code).toBe('MISSING_PROFILE_VERSION');
  const response = await fetch(`${origin}/api/mcp`, {
    method: 'POST',
    headers: { authorization: `Bearer ${issued.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ oversized: 'x'.repeat(210000) }),
  });
  expect(response.status).toBe(413);
  expect(createWritingAgent).not.toHaveBeenCalled();
});

it('rejects scope escape, forged approval/unknown fields, readonly mutations and revoked tokens', async () => {
  const first = await publication('Scoped');
  const second = await publication('Other');
  const { client, issued, workspaceId } = await connect([first.publicationId]);
  const listed = await call(client, 'kr_list_publications', {});
  expect(listed.items.map((item: { id: string }) => item.id)).toEqual([first.publicationId]);
  const forbidden = await call(client, 'kr_create_piece', { operationId: crypto.randomUUID(), expectedHash: (await service.overview()).publications.find(value => value.id === second.publicationId)!.hash, publicationId: second.publicationId, title: 'Escape', brief: 'No write', mode: 'guided' });
  expect(forbidden.code).toBe('NOT_FOUND');
  const forged = await client.callTool({ name: 'kr_create_piece', arguments: { operationId: crypto.randomUUID(), expectedHash: listed.items[0].hash, publicationId: first.publicationId, title: 'Forged', brief: '', mode: 'guided', approved: true } });
  expect(forged.isError).toBe(true);
  const readOnly = await connect([first.publicationId], false, false);
  const rejected = await call(readOnly.client, 'kr_create_piece', { operationId: crypto.randomUUID(), expectedHash: listed.items[0].hash, publicationId: first.publicationId, title: 'Read only', brief: '', mode: 'guided' });
  expect(rejected.code).toBe('APPROVAL_REQUIRED');
  const version = (await tokens.list(workspaceId)).version;
  await tokens.revoke(issued.client.id, workspaceId, version);
  await expect(client.callTool({ name: 'kr_list_publications', arguments: {} })).rejects.toThrow();
  expect(createWritingAgent).not.toHaveBeenCalled();
});
