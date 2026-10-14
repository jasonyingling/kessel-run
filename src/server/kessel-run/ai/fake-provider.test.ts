import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, mkdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceService } from '../workspace/service';
import { fixtureModel, requireFixtureServer } from './fake-provider';
import { startWritingTurn } from './turn';
import { Conversations } from './conversations';
import { Credentials } from './credentials';

let root: string;
let service: WorkspaceService;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kr-fake-guard-'));
  await mkdir(join(root, 'private'), { mode: 0o700 });
  vi.stubEnv('KESSEL_RUN_TEST_ROOT', root);
  vi.stubEnv('KESSEL_RUN_PRIVATE_ROOT', join(root, 'private'));
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('OPENAI_API_KEY', '');
  service = new WorkspaceService(join(root, 'content'), join(root, 'journal'));
  await service.initialize({ operationId: crypto.randomUUID(), title: 'Synthetic fake-provider fixture' });
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

it('requires development and an owned private fixture containing both content/private state', async () => {
  await expect(requireFixtureServer(service)).resolves.toBeUndefined();
  vi.stubEnv('NODE_ENV', 'production');
  await expect(requireFixtureServer(service)).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('KESSEL_RUN_TEST_ROOT', join(root, 'private'));
  await expect(requireFixtureServer(service)).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
  vi.stubEnv('KESSEL_RUN_TEST_ROOT', root);
  await chmod(root, 0o755);
  await expect(requireFixtureServer(service)).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
});
it('saves a synthetic voice proposal through real shared tools without resolving a model credential', async () => {
  const state = await service.overview();
  const publication = await service.createPublication({ operationId: crypto.randomUUID(), expectedHash: state.workspace.hash, title: 'Synthetic voice scope', purpose: 'Synthetic supplied purpose', presets: ['article'] });
  await requireFixtureServer(service);
  const model = await fixtureModel(service, String(publication.id), 'voice');
  const credentials = new Credentials(join(root, 'private'), () => undefined);
  const conversations = new Conversations(join(root, 'private'));
  const response = await startWritingTurn({ operationId: crypto.randomUUID(), scope: String(publication.id), scopeKind: 'voice', source: 'saved', model: 'gpt-5', mode: 'guided', message: 'Synthetic supplied notes' }, String(state.workspace.id), service, new AbortController().signal, { model, credentials, conversations });
  expect(await response.text()).toContain('completed');
  const context = await service.getPublicationContext(String(publication.id), null, null);
  expect(context.proposals[0].proposal.state).toBe('pending');
  expect(context.proposals[0].profile.status).toBe('draft');
  expect((await conversations.list(String(state.workspace.id), String(publication.id)))[0].engine).toBe('fake');
  expect((await credentials.status()).saved).toBeNull();
});
