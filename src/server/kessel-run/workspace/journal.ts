import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { z } from 'zod';
import { ownerWrite, privateFile, securePrivateRoot } from '../local-session';
import { atomicWrite, hashText, optionalText, parseNote } from './files';
import { WorkspaceError } from './schema';
import { withWorkspaceLock } from './lock';

const mutation = z.object({ path: z.string(), previousHash: z.string().nullable(), text: z.string() }).strict();
const entry = z.object({
  operationId: z.string().uuid(), argumentsHash: z.string(),
  state: z.enum(['pending', 'committed', 'conflict']),
  writes: z.array(mutation), result: z.record(z.string(), z.unknown()),
  rejectedArguments: z.unknown().optional(),
}).strict();
type Entry = z.infer<typeof entry>;
export type Write = z.infer<typeof mutation>;
function stableJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJSON((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export class Journal {
  constructor(private readonly root: string, private readonly privateDirectory: string) {}

  private async bind(operations: Entry[]) {
    let cursor = resolve(this.root);
    const missing: string[] = [];
    while (true) {
      try { cursor = await realpath(cursor); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        missing.unshift(basename(cursor));
        cursor = dirname(cursor);
      }
    }
    const canonicalRoot = resolve(cursor, ...missing);
    const path = privateFile('workspace-binding.json', this.privateDirectory);
    const home = await optionalText(this.root, 'Kessel Run.md');
    const workspaceId = home ? String(parseNote(home, 'Kessel Run.md').metadata.id) : null;
    const firstHomeWrite = operations.flatMap(operation => operation.writes).find(write => write.path === 'Kessel Run.md');
    const journalWorkspaceId = firstHomeWrite ? String(parseNote(firstHomeWrite.text, 'Kessel Run.md').metadata.id) : null;
    let binding: { root: string; workspaceId: string | null };
    try {
      binding = z.object({ root: z.string(), workspaceId: z.string().uuid().nullable() }).strict().parse(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || operations.length) throw new WorkspaceError('INVALID_INPUT', 'Workspace journal binding is missing or corrupt');
      binding = { root: canonicalRoot, workspaceId };
      await ownerWrite('workspace-binding.json', binding, this.privateDirectory);
    }
    const boundId = binding.workspaceId ?? journalWorkspaceId;
    if (binding.root !== canonicalRoot || (boundId && workspaceId && boundId !== workspaceId)) {
      throw new WorkspaceError('CONFLICT', 'Private journal belongs to a different workspace. No recovery was applied.');
    }
    if (!binding.workspaceId && (boundId || workspaceId)) await ownerWrite('workspace-binding.json', { ...binding, workspaceId: boundId ?? workspaceId }, this.privateDirectory);
  }

  private async verifyImmutable(operations: Entry[]) {
    const immutable = new Map<string, string>();
    for (const operation of operations.filter(value => value.state === 'committed')) {
      for (const write of operation.writes) {
        if (write.path.startsWith('Voice Profiles/') || write.path.includes('/Revisions/') || write.path.includes('/Sources/')) {
          immutable.set(write.path, hashText(write.text));
        }
      }
    }
    for (const [path, expected] of immutable) {
      const current = await optionalText(this.root, path);
      if (current === null || hashText(current) !== expected) {
        throw new WorkspaceError('CONFLICT', `Retained snapshot changed outside the app: ${path}. Restore or explicitly import a new version.`);
      }
    }
  }

  private async read(): Promise<Entry[]> {
    try {
      const text = await readFile(privateFile('operations.json', this.privateDirectory), 'utf8');
      const entries = z.array(entry).parse(JSON.parse(text));
      if (new Set(entries.map(value => value.operationId)).size !== entries.length) throw new Error('Duplicate operation ID');
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new WorkspaceError('INVALID_INPUT', 'Operation journal is corrupt; preserve files and recover from backup');
    }
  }

  private async apply(operation: Entry, fault?: (index: number) => void) {
    for (const [index, write] of operation.writes.entries()) {
      const current = await optionalText(this.root, write.path);
      const currentHash = current === null ? null : hashText(current);
      if (currentHash !== hashText(write.text)) {
        if (currentHash !== write.previousHash) {
          throw new WorkspaceError('CONFLICT', 'Recovery found an intervening Markdown edit. Both texts are retained in the journal.');
        }
        await atomicWrite(this.root, write.path, write.text);
      }
      fault?.(index);
    }
  }

  async transaction<T extends Record<string, unknown>>(
    operationId: string,
    argumentsValue: unknown,
    prepare: () => Promise<{ writes: Write[]; result: T }>,
    fault?: (index: number) => void,
  ): Promise<T> {
    z.string().uuid().parse(operationId);
    const privateDirectory = securePrivateRoot(this.privateDirectory);
    return withWorkspaceLock(privateDirectory, async () => {
      const operations = await this.read();
      await this.bind(operations);
      for (const operation of operations.filter(value => value.state === 'pending')) {
        await this.apply(operation);
        operation.state = 'committed';
        await ownerWrite('operations.json', operations, privateDirectory);
      }
      await this.verifyImmutable(operations);
      const argumentsHash = hashText(stableJSON(argumentsValue));
      const prior = operations.find(value => value.operationId === operationId);
      if (prior) {
        if (prior.argumentsHash !== argumentsHash) throw new WorkspaceError('CONFLICT', 'Operation ID was reused with different arguments');
        if (prior.state === 'conflict') throw new WorkspaceError('CONFLICT', 'This rejected operation is retained for reconciliation', prior.writes.length === 0 ? 'rejected' : 'unknown');
        return prior.result as T;
      }
      let prepared: { writes: Write[]; result: T };
      try {
        prepared = await prepare();
      } catch (error) {
        if (error instanceof WorkspaceError || error instanceof z.ZodError) {
          const code = error instanceof WorkspaceError ? error.code : 'INVALID_INPUT';
          operations.push({ operationId, argumentsHash, state: 'conflict', writes: [], result: { error: code }, rejectedArguments: argumentsValue });
          await ownerWrite('operations.json', operations, privateDirectory);
          // Only the prepare phase can prove this command has made no writes.
          // Recovery/apply failures above/below this block remain unknown.
          throw new WorkspaceError(code, error instanceof WorkspaceError ? error.message : 'Invalid command input', 'rejected');
        }
        throw error;
      }
      const operation: Entry = { operationId, argumentsHash, state: 'pending', ...prepared };
      entry.parse(operation);
      operations.push(operation);
      await ownerWrite('operations.json', operations, privateDirectory);
      await this.apply(operation, fault);
      operation.state = 'committed';
      await ownerWrite('operations.json', operations, privateDirectory);
      await this.bind(operations);
      return prepared.result;
    });
  }

  async readLocked<T>(task: () => Promise<T>): Promise<T> {
    const privateDirectory = securePrivateRoot(this.privateDirectory);
    return withWorkspaceLock(privateDirectory, async () => {
      const operations = await this.read();
      await this.bind(operations);
      for (const operation of operations.filter(value => value.state === 'pending')) {
        await this.apply(operation);
        operation.state = 'committed';
        await ownerWrite('operations.json', operations, privateDirectory);
      }
      await this.verifyImmutable(operations);
      await this.bind(operations);
      return task();
    });
  }
}
