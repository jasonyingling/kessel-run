import { readFile, realpath } from 'node:fs/promises';
import { z } from 'zod';
import { ownerWrite, privateFile } from '../local-session';
import { WorkspaceService } from './service';
import { assertSelectionSession, readSelectionSession, withSelectionLock, type SelectionSession } from './selection';
import { runSelection, selectionInput, type SelectionFault } from './bootstrap';

export const configuration = z.object({ id: z.string().uuid(), root: z.string(), privateDirectory: z.string() }).strict();
export async function configurationText() {
  try { return await readFile(privateFile('workspace.json'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function configuredWorkspace() {
  const text = await configurationText();
  if (text === null) throw new SelectionError('UNINITIALIZED');
  const value = configuration.parse(JSON.parse(text));
  return { configuration: value, service: new WorkspaceService(value.root, value.privateDirectory) };
}
export class SelectionError extends Error {
  constructor(readonly code: 'UNINITIALIZED' | 'RECOVERY_REQUIRED' | 'SELECTION_CHANGED' | 'CREATION_PENDING' | 'LOCATION_UNAVAILABLE' | 'INVALID_INPUT', readonly outcome: 'rejected' | 'unknown' = 'unknown') { super(code); }
}
export async function commitSelection(value: z.infer<typeof configuration>, session: SelectionSession, fault?: SelectionFault) {
  await assertSelectionSession(session);
  await ownerWrite('workspace.json', configuration.parse({ ...value, root: await realpath(value.root) }));
  fault?.('configuration');
  const current = await assertSelectionSession(session);
  await ownerWrite('session.json', { ...current, workspaceId: value.id });
  fault?.('session');
}
export async function createWorkspace(input: { operationId: string; root: string; title: string }, session?: SelectionSession, fault?: SelectionFault) {
  const validation = z.object({ operationId: z.string().uuid(), root: z.string().min(1).max(4096), title: z.string().trim().min(1).max(160) }).strict().safeParse(input);
  if (!validation.success) throw new SelectionError('INVALID_INPUT', 'rejected');
  const original = validation.data;
  const parsed = selectionInput.parse({ ...original, kind: 'workspace', purpose: '' });
  const authenticated = session ?? await readSelectionSession();
  return withSelectionLock(() => runSelection(parsed, authenticated, fault));
}
