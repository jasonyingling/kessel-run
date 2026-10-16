import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile, mkdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootstrapPublication, readSelectionIntent, type SelectionFault } from './bootstrap';
import { configuredWorkspace, createWorkspace } from './config';
import { ownerWrite } from '../local-session';
import { readSelectionSession, type SelectionSession } from './selection';
import { workspaceAvailability } from './availability';
let folder: string;
let session: SelectionSession;
const input = () => ({ operationId: crypto.randomUUID(), title: 'Test publication', purpose: 'Firsthand reviews' });
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kr-bootstrap-'));
  vi.stubEnv('KESSEL_RUN_PRIVATE_ROOT', join(folder, 'private'));
  vi.stubEnv('KESSEL_RUN_CONTENT_PARENT', join(folder, 'content'));
  session = { tokenHash: 'a'.repeat(64), expires: Date.now() + 60000, workspaceId: crypto.randomUUID() };
  await ownerWrite('session.json', session);
});
it('rejects readonly parents and empty targets before intent, allowing another location', async () => {
  const readonly = join(folder, 'readonly'); await mkdir(readonly); await chmod(readonly, 0o500);
  try {
    vi.stubEnv('KESSEL_RUN_CONTENT_PARENT', readonly);
    await expect(bootstrapPublication(input(), session)).rejects.toMatchObject({ code: 'LOCATION_UNAVAILABLE', outcome: 'rejected' });
    expect(await readSelectionIntent()).toBeNull();
    for (const root of [readonly, join(readonly, 'child')]) {
      await expect(bootstrapPublication({ ...input(), root }, session)).rejects.toMatchObject({ code: 'LOCATION_UNAVAILABLE', outcome: 'rejected' });
      expect(await readSelectionIntent()).toBeNull();
    }
    expect((await bootstrapPublication({ ...input(), root: join(folder, 'writable') }, session)).publicationId).toBeTruthy();
  } finally { await chmod(readonly, 0o700); }
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(folder, { recursive: true, force: true }); });
it('creates a publication without credentials and recovers an identical lost response', async () => {
  expect((await workspaceAvailability(session)).status).toBe('uninitialized');
  const command = input();
  const created = await bootstrapPublication(command, session);
  expect(await bootstrapPublication(command, session)).toEqual(created);
  const configured = await configuredWorkspace();
  const overview = await configured.service.overview();
  expect(overview.publications).toHaveLength(1);
  expect(overview.publications[0].id).toBe(created.publicationId);
  expect(overview.profiles).toHaveLength(0);
  expect(created.link).toBe(`/kessel-run/publications/${created.publicationId}`);
  expect((await workspaceAvailability(await readSelectionSession())).status).toBe('ready');
  expect(await readdir(join(folder, 'content'))).toHaveLength(1);
  await expect(bootstrapPublication({ ...command, title: 'Changed' }, session)).rejects.toMatchObject({ code: 'SELECTION_CHANGED' });
});
it.each(['intent', 'initialized', 'publication', 'configuration', 'session'] as const)('recovers after %s interruption with stable IDs after re-pairing', async stage => {
  const command = input();
  const fault: SelectionFault = value => { if (value === stage) throw new Error('synthetic interruption'); };
  await expect(bootstrapPublication(command, session, fault)).rejects.toThrow('synthetic interruption');
  const intent = (await readSelectionIntent())!;
  expect((await workspaceAvailability(await readSelectionSession())).status).toBe('pending');
  const replacement = { ...session, tokenHash: 'b'.repeat(64), workspaceId: crypto.randomUUID() };
  await ownerWrite('session.json', replacement);
  await expect(bootstrapPublication(command, session)).rejects.toMatchObject({ status: 401 });
  expect((await readSelectionSession()).tokenHash).toBe(replacement.tokenHash);
  const resumed = await bootstrapPublication(command, replacement);
  expect(resumed.id).toBe(intent.workspaceId);
  expect(resumed.publicationId).toBe(intent.publicationId);
  expect((await (await configuredWorkspace()).service.overview()).publications).toHaveLength(1);
});
it('serializes conflicting selections and converges concurrent identical submissions', async () => {
  const command = input();
  const results = await Promise.all([bootstrapPublication(command, session), bootstrapPublication(command, session)]);
  expect(results[0]).toEqual(results[1]);
  await expect(bootstrapPublication(input(), session)).rejects.toThrow();
  expect(await readdir(join(folder, 'content'))).toHaveLength(1);
});
it('never reuses an old completed selection ID after another workspace was selected', async () => {
  const first = { operationId: crypto.randomUUID(), title: 'First', root: join(folder, 'first') };
  await createWorkspace(first, session);
  const second = await createWorkspace({ operationId: crypto.randomUUID(), title: 'Second', root: join(folder, 'second') }, await readSelectionSession());
  await expect(createWorkspace(first, await readSelectionSession())).rejects.toMatchObject({ code: 'SELECTION_CHANGED' });
  expect((await configuredWorkspace()).configuration.id).toBe(second.id);
});
it('rejects stale requests before committing selection after external session replacement', async () => {
  const command = input();
  await expect(bootstrapPublication(command, session, stage => { if (stage === 'initialized') throw new Error('stop'); })).rejects.toThrow();
  await ownerWrite('session.json', { ...session, tokenHash: 'b'.repeat(64) });
  await expect(bootstrapPublication(command, session)).rejects.toMatchObject({ status: 401 });
  await expect(readFile(join(folder, 'private', 'workspace.json'))).rejects.toMatchObject({ code: 'ENOENT' });
});
it('treats corrupt configuration and journals as recovery, preserving original bytes', async () => {
  await ownerWrite('workspace.json', { malformed: true });
  expect((await workspaceAvailability(session)).status).toBe('recovery');
  await expect(bootstrapPublication(input(), session)).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
  await expect(createWorkspace({ operationId: crypto.randomUUID(), root: join(folder, 'other'), title: 'Other' }, session)).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
  expect(JSON.parse(await readFile(join(folder, 'private', 'workspace.json'), 'utf8'))).toEqual({ malformed: true });
  await rm(join(folder, 'private', 'workspace.json'));
  await bootstrapPublication(input(), session);
  const configured = await configuredWorkspace();
  await writeFile(join(configured.configuration.privateDirectory, 'operations.json'), '{corrupt');
  expect((await workspaceAvailability(await readSelectionSession())).status).toBe('recovery');
});
it('refuses nonempty, linked, app-contained and private-contained content locations before intent', async () => {
  const existing = join(folder, 'notes');
  await mkdir(existing); await writeFile(join(existing, 'mine.md'), 'keep this');
  await symlink(existing, join(folder, 'linked'));
  for (const root of [existing, join(folder, 'linked', 'new'), join(folder, 'private', 'content'), process.cwd(), folder]) {
    await expect(bootstrapPublication({ ...input(), root }, session)).rejects.toMatchObject({ code: 'LOCATION_UNAVAILABLE' });
    expect(await readSelectionIntent()).toBeNull();
  }
  expect(await readFile(join(existing, 'mine.md'), 'utf8')).toBe('keep this');
});
it('offers a different location when the default parent is unavailable', async () => {
  await writeFile(join(folder, 'blocked'), 'file');
  vi.stubEnv('KESSEL_RUN_CONTENT_PARENT', join(folder, 'blocked'));
  await expect(bootstrapPublication(input(), session)).rejects.toMatchObject({ code: 'LOCATION_UNAVAILABLE' });
  expect(await readSelectionIntent()).toBeNull();
  expect((await bootstrapPublication({ ...input(), root: join(folder, 'chosen') }, session)).publicationId).toBeTruthy();
});
