import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { LocalAccessError, privateFile, privateRoot } from '../local-session';
import { withWorkspaceLock } from './lock';

// Lock order is always selection (private root) -> content (workspace namespace).
// SQLite releases this cross-process lock on process exit; no stale lock deletion.
export const withSelectionLock = <T>(task: () => Promise<T>) => withWorkspaceLock(privateRoot(), task);
export const sessionRecord = z.object({ tokenHash: z.string().regex(/^[a-f0-9]{64}$/), expires: z.number().finite(), workspaceId: z.string().uuid() }).strict();
export type SelectionSession = z.infer<typeof sessionRecord>;
export async function readSelectionSession() {
  return sessionRecord.parse(JSON.parse(await readFile(privateFile('session.json'), 'utf8')));
}
export async function assertSelectionSession(expected: SelectionSession) {
  const actual = await readSelectionSession();
  if (actual.tokenHash !== expected.tokenHash || actual.expires !== expected.expires || actual.expires < Date.now()) throw new LocalAccessError(401);
  return actual;
}
// Safe for client recovery keys; never expose the token hash.
export const sessionScope = (session: SelectionSession) => createHash('sha256').update(`recovery:${session.tokenHash}`).digest('hex');
