import { expect, it, vi } from 'vitest';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkspace, configuredWorkspace } from './config';
import { ownerWrite } from '../local-session';

it('persists stable workspace identity and private namespace across restarts/retries', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kr-config-'));
  const privateRoot = join(folder, 'private');
  const root = join(folder, 'content');
  vi.stubEnv('KESSEL_RUN_PRIVATE_ROOT', privateRoot);
  try {
    await ownerWrite('session.json', { tokenHash: 'a'.repeat(64), expires: Date.now() + 10000, workspaceId: crypto.randomUUID() });
    const input = { operationId: crypto.randomUUID(), root, title: 'Configured synthetic workspace' };
    const created = await createWorkspace(input);
    expect(await createWorkspace(input)).toEqual(created);
    const reopened = await configuredWorkspace();
    expect(reopened.configuration.id).toBe(created.id);
    expect(reopened.configuration.root).toBe(await realpath(root));
    expect((await reopened.service.overview()).workspace.id).toBe(created.id);
    const session = JSON.parse(await readFile(join(privateRoot, 'session.json'), 'utf8'));
    expect(session.workspaceId).toBe(created.id);
    expect(session.tokenHash).toBe('a'.repeat(64));
  } finally {
    vi.unstubAllEnvs();
    await rm(folder, { recursive: true, force: true });
  }
});
