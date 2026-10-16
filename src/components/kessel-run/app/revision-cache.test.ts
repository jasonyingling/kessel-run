import { expect, it, vi } from 'vitest';
import { RevisionCache } from './revision-cache';
const key = { workspaceId: 'one', outputId: 'output', revisionId: 'revision', hash: 'hash' };
it('unchanged polls and concurrent consumers read once; new revisions read once each', async () => {
  const cache = new RevisionCache(), read = vi.fn(async () => ({ prose: 'Exact revision' }));
  await Promise.all([cache.read(key, read), cache.read({ ...key }, read)]);
  for (let i = 0; i < 8; i++) await cache.read({ ...key }, read);
  expect(read).toHaveBeenCalledTimes(1);
  await cache.read({ ...key, revisionId: 'new' }, read); expect(read).toHaveBeenCalledTimes(2);
});
it('retains error state until explicit retry and separates late output and workspace completions', async () => {
  const cache = new RevisionCache(); let resolve!: (value: { prose: string }) => void;
  const late = cache.read(key, () => new Promise(done => { resolve = done; }));
  const other = { ...key, outputId: 'other' }; await cache.read(other, async () => ({ prose: 'Other' }));
  resolve({ prose: 'First' }); await late;
  expect(cache.peek(other)?.prose).toBe('Other');
  const restored = { ...key, workspaceId: 'restored' }; const fail = vi.fn(async () => { throw new Error('Try again'); });
  await cache.read(restored, fail); await cache.read(restored, fail); expect(fail).toHaveBeenCalledTimes(1);
  expect(cache.peek(restored)?.status).toBe('error');
  await cache.read(restored, async () => ({ prose: 'Restored exact text' }), true); expect(cache.peek(restored)?.prose).toBe('Restored exact text');
  expect(cache.peek(key)?.prose).toBe('First');
});
