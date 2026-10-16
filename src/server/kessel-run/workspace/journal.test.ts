import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Journal } from './journal';
import { WorkspaceService } from './service';
import { hashText } from './files';
import { WorkspaceError } from './schema';

let folder: string;
let root: string;
let privateDirectory: string;
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kr-recovery-'));
  root = join(folder, 'content');
  privateDirectory = join(folder, 'private');
  await new WorkspaceService(root, privateDirectory).initialize({ operationId: crypto.randomUUID(), title: 'Recovery fixture' });
});
afterEach(async () => { await rm(folder, { recursive: true, force: true }); });

it('replays an interrupted multi-file change before reads and returns the original result', async () => {
  const operationId = crypto.randomUUID();
  const argumentsValue = { body: 'Synthetic candidate', target: 'fixture' };
  const journal = new Journal(root, privateDirectory);
  await expect(journal.transaction(operationId, argumentsValue, async () => ({
    writes: [
      { path: 'Retained.md', previousHash: null, text: 'Synthetic candidate' },
      { path: 'Pointer.md', previousHash: null, text: '[Retained](Retained.md)' },
    ], result: { saved: 'original-result' },
  }), index => { if (index === 0) throw new Error('Injected crash after retained write'); })).rejects.toThrow('Injected crash');
  expect(await readFile(join(root, 'Retained.md'), 'utf8')).toBe('Synthetic candidate');
  const reopened = new Journal(root, privateDirectory);
  await reopened.readLocked(async () => {
    expect(await readFile(join(root, 'Pointer.md'), 'utf8')).toBe('[Retained](Retained.md)');
  });
  const result = await reopened.transaction(operationId, { target: 'fixture', body: 'Synthetic candidate' }, async () => {
    throw new Error('Identical operation must not prepare twice');
  });
  expect(result).toEqual({ saved: 'original-result' });
});

it('rejects recovery into a switched workspace root and retains the original journal', async () => {
  const journal = new Journal(root, privateDirectory);
  await expect(journal.transaction(crypto.randomUUID(), { synthetic: true }, async () => ({
    writes: [
      { path: 'First.md', previousHash: null, text: 'first' },
      { path: 'Second.md', previousHash: null, text: 'second' },
    ], result: { saved: true },
  }), () => { throw new Error('Injected crash'); })).rejects.toThrow();
  const otherRoot = join(folder, 'different-content');
  await mkdir(otherRoot);
  await expect(new Journal(otherRoot, privateDirectory).readLocked(async () => undefined)).rejects.toMatchObject({ code: 'CONFLICT' });
  await expect(readFile(join(otherRoot, 'First.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await readFile(join(privateDirectory, 'operations.json'), 'utf8')).toContain('pending');
  await new Journal(root, privateDirectory).readLocked(async () => undefined);
  expect(await readFile(join(root, 'Second.md'), 'utf8')).toBe('second');
});

it('preserves an external pointer edit and incoming text on ambiguous recovery', async () => {
  await writeFile(join(root, 'Pointer.md'), 'original');
  const journal = new Journal(root, privateDirectory);
  await expect(journal.transaction(crypto.randomUUID(), { body: 'incoming' }, async () => ({
    writes: [
      { path: 'Retained.md', previousHash: null, text: 'incoming' },
      { path: 'Pointer.md', previousHash: hashText('original'), text: 'incoming pointer' },
    ], result: { saved: true },
  }), index => { if (index === 0) throw new Error('Injected crash'); })).rejects.toThrow();
  await writeFile(join(root, 'Pointer.md'), 'external human edit');
  await expect(new Journal(root, privateDirectory).readLocked(async () => undefined)).rejects.toMatchObject({ code: 'CONFLICT', outcome: 'unknown' });
  expect(await readFile(join(root, 'Pointer.md'), 'utf8')).toBe('external human edit');
  expect(await readFile(join(root, 'Retained.md'), 'utf8')).toBe('incoming');
  expect(await readFile(join(privateDirectory, 'operations.json'), 'utf8')).toContain('incoming pointer');
});
it('distinguishes durable zero-write rejection from a conflict after a partial commit', async () => {
  const journal = new Journal(root, privateDirectory);
  const rejected = crypto.randomUUID();
  await expect(journal.transaction(rejected, { input: 'old' }, async () => { throw new WorkspaceError('CONFLICT', 'Stale base'); })).rejects.toMatchObject({ outcome: 'rejected' });
  await expect(journal.transaction(rejected, { input: 'old' }, async () => { throw new Error('must not prepare again'); })).rejects.toMatchObject({ outcome: 'rejected' });
  const pending = crypto.randomUUID();
  await expect(journal.transaction(pending, { input: 'same' }, async () => ({ writes: [{ path: 'First.md', text: 'saved', previousHash: null }, { path: 'Second.md', text: 'pending', previousHash: null }], result: { saved: true } }), index => { if (index === 0) throw new Error('I/O failure after write'); })).rejects.toThrow('I/O failure');
  await writeFile(join(root, 'Second.md'), 'intervening edit');
  await expect(journal.transaction(pending, { input: 'same' }, async () => { throw new Error('must not prepare again'); })).rejects.toMatchObject({ code: 'CONFLICT', outcome: 'unknown' });
  expect(await readFile(join(root, 'First.md'), 'utf8')).toBe('saved');
});

it('reports journal corruption without overwriting content or returning empty state', async () => {
  await writeFile(join(privateDirectory, 'operations.json'), '{broken');
  await expect(new WorkspaceService(root, privateDirectory).overview()).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(await readFile(join(root, 'Kessel Run.md'), 'utf8')).toContain('Recovery fixture');
});
