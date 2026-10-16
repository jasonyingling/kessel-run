import { randomUUID } from 'node:crypto';
import { access, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import { ownerWrite, privateFile, privateRoot } from '../local-session';
import { configuration, configurationText, commitSelection, SelectionError } from './config';
import { WorkspaceService } from './service';
import { assertSelectionSession, withSelectionLock, type SelectionSession } from './selection';

export const selectionInput = z.object({
  kind: z.enum(['publication', 'workspace']), operationId: z.string().uuid(),
  title: z.string().trim().min(1).max(160), purpose: z.string().max(80000), root: z.string().max(4096).default(''),
}).strict();
const intentSchema = z.object({
  input: selectionInput, workspaceId: z.string().uuid(), publicationId: z.string().uuid(),
  initOperationId: z.string().uuid(), publicationOperationId: z.string().uuid(),
  root: z.string(), privateDirectory: z.string(), previousConfiguration: z.string().nullable(),
  initiator: z.string(), initialWorkspaceId: z.string().uuid(),
  progress: z.enum(['intent', 'initialized', 'publication', 'complete']), initialHash: z.string().optional(),
}).strict();
export type SelectionFault = (stage: 'intent' | 'initialized' | 'publication' | 'configuration' | 'session') => void;
export async function readSelectionIntent() {
  try { return intentSchema.parse(JSON.parse(await readFile(privateFile('selection.json'), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw new SelectionError('RECOVERY_REQUIRED'); }
}
async function saveIntent(intent: z.infer<typeof intentSchema>) {
  // Keep identity history when a later explicit selection replaces the active
  // pointer. A delayed request must never turn a completed ID into a new folder.
  await ownerWrite('selection.json', intent);
  await ownerWrite(`selection-${intent.input.operationId}.json`, intent);
}
const inside = (parent: string, child: string) => { const path = relative(parent, child); return !path || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path)); };
async function canonicalFuture(path: string) {
  let cursor = resolve(path);
  const missing: string[] = [];
  while (true) {
    try { return resolve(await realpath(cursor), ...missing); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; missing.unshift(basename(cursor)); cursor = dirname(cursor); }
  }
}
export async function validateContentRoot(path: string) {
  const absolute = resolve(path);
  let cursor = absolute;
  while (true) {
    const info = await lstat(cursor).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (info?.isSymbolicLink() && !['/tmp', '/var'].includes(cursor)) throw new SelectionError('LOCATION_UNAVAILABLE');
    if (cursor === absolute && info && (!info.isDirectory() || (process.getuid && info.uid !== process.getuid()))) throw new SelectionError('LOCATION_UNAVAILABLE');
    if (cursor === dirname(cursor)) break;
    cursor = dirname(cursor);
  }
  const canonical = await canonicalFuture(absolute);
  for (const forbidden of [privateRoot(), await realpath(process.cwd())]) {
    if (inside(forbidden, canonical) || inside(canonical, forbidden)) throw new SelectionError('LOCATION_UNAVAILABLE');
  }
  return canonical;
}
async function chooseRoot(input: z.infer<typeof selectionInput>, workspaceId: string) {
  try {
    if (input.root) {
      const root = await validateContentRoot(input.root);
      const contents = await readdir(root).catch(error => { if (error.code !== 'ENOENT') throw error; return []; });
      if (contents.length) throw new SelectionError('LOCATION_UNAVAILABLE');
      await mkdir(root, { recursive: true, mode: 0o700 });
      await access(root, constants.W_OK);
      await validateContentRoot(root);
      return root;
    }
    const parent = process.env.KESSEL_RUN_CONTENT_PARENT ?? resolve(homedir(), 'Documents', 'Kessel Run', 'Workspaces');
    const canonical = await validateContentRoot(parent);
    await mkdir(canonical, { recursive: true, mode: 0o700 });
    await validateContentRoot(canonical);
    const root = await validateContentRoot(resolve(canonical, workspaceId));
    await mkdir(root, { mode: 0o700 });
    await access(root, constants.W_OK);
    await validateContentRoot(root);
    return root;
  } catch { throw new SelectionError('LOCATION_UNAVAILABLE', 'rejected'); }
}
export async function bootstrapPublication(input: { operationId: string; title: string; purpose?: string; root?: string }, session: SelectionSession, fault?: SelectionFault) {
  const validation = selectionInput.omit({ kind: true }).extend({ purpose: z.string().max(80000).default('') }).strict().safeParse(input);
  if (!validation.success) throw new SelectionError('INVALID_INPUT', 'rejected');
  const original = validation.data;
  const parsed = selectionInput.parse({ ...original, kind: 'publication' });
  return withSelectionLock(() => runSelection(parsed, session, fault));
}
// Caller owns the global lock. Persist intent before content, retaining IDs and
// expected hash across response loss and process exit.
export async function runSelection(input: z.infer<typeof selectionInput>, session: SelectionSession, fault?: SelectionFault) {
  const current = await assertSelectionSession(session);
  let intent = await readSelectionIntent();
  const before = await configurationText();
  if (intent?.input.operationId === input.operationId) {
    if (JSON.stringify(intent.input) !== JSON.stringify(input)) throw new SelectionError('SELECTION_CHANGED');
    const selected = (() => { try { return before && configuration.parse(JSON.parse(before)); } catch { return null; } })();
    if (before !== intent.previousConfiguration && (!selected || selected.id !== intent.workspaceId || selected.root !== intent.root || selected.privateDirectory !== intent.privateDirectory)) throw new SelectionError('SELECTION_CHANGED');
    // Re-pairing can explicitly resume. A stale request was rejected above.
    intent.initiator = current.tokenHash;
    await saveIntent(intent);
  } else {
    try {
      await readFile(privateFile(`selection-${input.operationId}.json`));
      throw new SelectionError('SELECTION_CHANGED');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (intent && intent.progress !== 'complete') throw new SelectionError('CREATION_PENDING');
    if (intent && before === null) throw new SelectionError('RECOVERY_REQUIRED');
    if (current.workspaceId !== session.workspaceId) throw new SelectionError('SELECTION_CHANGED');
    if (input.kind === 'publication' && before !== null) throw new SelectionError('RECOVERY_REQUIRED');
    if (before !== null) { try { configuration.parse(JSON.parse(before)); } catch { throw new SelectionError('RECOVERY_REQUIRED'); } }
    const workspaceId = randomUUID();
    intent = { input, workspaceId, publicationId: randomUUID(), initOperationId: randomUUID(), publicationOperationId: randomUUID(), root: await chooseRoot(input, workspaceId), privateDirectory: resolve(privateRoot(), `workspace-${workspaceId}`), previousConfiguration: before, initiator: current.tokenHash, initialWorkspaceId: current.workspaceId, progress: 'intent' };
    await saveIntent(intent);
    fault?.('intent');
  }
  await validateContentRoot(intent.root);
  const service = new WorkspaceService(intent.root, intent.privateDirectory);
  const initialized = await service.initialize({ operationId: intent.initOperationId, title: input.kind === 'workspace' ? input.title : 'My writing', workspaceId: intent.workspaceId });
  intent.initialHash ??= initialized.hash;
  intent.progress = 'initialized';
  await saveIntent(intent);
  fault?.('initialized');
  let link = '/kessel-run';
  if (input.kind === 'publication') {
    const publication = await service.createPublication({ operationId: intent.publicationOperationId, expectedHash: intent.initialHash, publicationId: intent.publicationId, title: input.title, purpose: input.purpose, presets: ['Article', 'Short post'] });
    link = publication.link;
    intent.progress = 'publication';
    await saveIntent(intent);
    fault?.('publication');
  }
  await commitSelection({ id: intent.workspaceId, root: intent.root, privateDirectory: intent.privateDirectory }, current, fault);
  intent.progress = 'complete';
  await saveIntent(intent);
  return { id: intent.workspaceId, root: intent.root, publicationId: input.kind === 'publication' ? intent.publicationId : undefined, link };
}
