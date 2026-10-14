import { createClient } from '@libsql/client';
import type { Transaction } from '@libsql/client';
import { pathToFileURL } from 'node:url';
import { privateFile, securePrivateRoot } from '../local-session';

// BEGIN IMMEDIATE takes SQLite's cross-process OS lock. Process exit releases
// the lock; application code never deletes a lock another worker may own.
// timeout=0 is intentional: synchronous native busy waits would block this
// process's event loop while the current owner awaits filesystem operations.
export async function withWorkspaceLock<T>(root: string, task: () => Promise<T>, timeoutMs = 10000): Promise<T> {
  securePrivateRoot(root);
  const filename = privateFile('workspace-lock.db', root);
  let client = createClient({ url: pathToFileURL(filename).href, timeout: 0 });
  privateFile('workspace-lock.db', root);
  const deadline = Date.now() + timeoutMs;
  let transaction: Transaction | undefined;
  try {
    while (!transaction) {
      try {
        transaction = await client.transaction('write');
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (!code?.startsWith('SQLITE_BUSY') && !code?.startsWith('SQLITE_LOCKED')) throw error;
        // A failed BEGIN in the installed native driver can retain a prepared
        // statement. Close that connection before retrying on a fresh one.
        client.close();
        if (Date.now() > deadline) throw new Error('CONFLICT: Workspace is busy');
        await new Promise(resolve => setTimeout(resolve, 10));
        client = createClient({ url: pathToFileURL(filename).href, timeout: 0 });
      }
    }
    const result = await task();
    await transaction.commit();
    return result;
  } finally {
    transaction?.close();
    client.close();
  }
}
