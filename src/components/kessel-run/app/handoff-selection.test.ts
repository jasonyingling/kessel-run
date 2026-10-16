import { describe, expect, it, vi } from 'vitest';
import { HandoffSelection } from './handoff-selection';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function file(name: string, text: () => Promise<string>, size = 10) { return { name, size, text }; }
const ready = (name = 'a.md', markdown = 'A contents') => file(name, async () => markdown);
const preview = async (markdown: string) => ({ hash: `hash:${markdown}`, body: markdown });

describe('handoff selection identity', () => {
  it('clears content synchronously and ignores A when B finishes first', async () => {
    const selection = new HandoffSelection<Awaited<ReturnType<typeof preview>>>();
    const a = deferred<string>();
    const b = deferred<string>();
    const readA = selection.select(file('a.md', () => a.promise));
    const readB = selection.select(file('b.md', () => b.promise));
    expect(selection.getSnapshot()).toMatchObject({ filename: 'b.md', phase: 'reading', markdown: '', review: null });
    b.resolve('B contents'); await readB;
    a.resolve('A contents'); await readA;
    expect(selection.getSnapshot()).toMatchObject({ filename: 'b.md', phase: 'ready', markdown: 'B contents' });
  });
  it.each([['b.txt', 10], ['b.md', 0], ['b.md', 8_000_001]])('invalid %s (%i bytes) invalidates A immediately and cannot preview', async (name, size) => {
    const selection = new HandoffSelection<{ hash: string }>();
    await selection.select(ready());
    await selection.inspect('workspace', preview);
    expect(selection.confirmation('workspace')).not.toBeNull();
    const read = vi.fn(async () => 'invalid');
    await selection.select(file(name, read, size));
    const inspect = vi.fn(preview);
    await selection.inspect('workspace', inspect);
    expect(read).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
    expect(selection.getSnapshot()).toMatchObject({ filename: name, phase: 'error', markdown: '', review: null });
    expect(selection.confirmation('workspace')).toBeNull();
  });
  it('rejects whitespace-only content and reports a read failure without retaining old contents', async () => {
    const selection = new HandoffSelection<{ hash: string }>();
    await selection.select(ready());
    await selection.select(ready('blank.md', ' \n '));
    expect(selection.getSnapshot()).toMatchObject({ phase: 'error', markdown: '' });
    await selection.select(file('failed.md', async () => { throw new Error('unreadable'); }));
    expect(selection.getSnapshot()).toMatchObject({ filename: 'failed.md', phase: 'error', markdown: '', review: null });
    expect(selection.getSnapshot().message).toContain('could not be read');
  });
  it('ignores stale read errors and invalidates a pending read when selection is canceled', async () => {
    const selection = new HandoffSelection<{ hash: string }>();
    const a = deferred<string>();
    const readA = selection.select(file('a.md', () => a.promise));
    await selection.select(ready('b.md', 'B'));
    a.reject(new Error('old error')); await readA;
    expect(selection.getSnapshot()).toMatchObject({ filename: 'b.md', phase: 'ready', markdown: 'B' });
    const c = deferred<string>();
    const readC = selection.select(file('c.md', () => c.promise));
    await selection.select();
    c.resolve('C'); await readC;
    expect(selection.getSnapshot()).toMatchObject({ filename: '', phase: 'empty', markdown: '', review: null });
    expect(selection.confirmation('workspace')).toBeNull();
  });
  it('freezes the reviewed content and hash, and requires the same workspace and selection to confirm', async () => {
    const selection = new HandoffSelection<{ hash: string }>();
    await selection.select(ready());
    const inspect = vi.fn(preview);
    await selection.inspect('workspace-v1', inspect);
    expect(inspect).toHaveBeenCalledWith('A contents');
    const reviewed = selection.confirmation('workspace-v1')!;
    expect(Object.isFrozen(reviewed)).toBe(true);
    expect(reviewed).toMatchObject({ filename: 'a.md', markdown: 'A contents', previewHash: 'hash:A contents', workspaceHash: 'workspace-v1' });
    expect(selection.confirmation('workspace-v2')).toBeNull();
    await selection.select(ready('b.md', 'B contents'));
    expect(selection.confirmation('workspace-v1')).toBeNull();
    selection.restored(reviewed);
    expect(selection.getSnapshot().filename).toBe('b.md');
  });
  it.each(['success', 'error'])('ignores a late preview %s after a newer selection is reviewed', async outcome => {
    const selection = new HandoffSelection<{ hash: string }>();
    await selection.select(ready());
    const a = deferred<{ hash: string }>();
    const inspectA = selection.inspect('workspace', () => a.promise);
    await selection.select(ready('b.md', 'B contents'));
    await selection.inspect('workspace', preview);
    const reviewedB = selection.confirmation('workspace');
    if (outcome === 'success') a.resolve({ hash: 'hash:A' });
    else a.reject(new Error('stale failure'));
    await inspectA;
    expect(selection.confirmation('workspace')).toBe(reviewedB);
    expect(reviewedB).toMatchObject({ filename: 'b.md', markdown: 'B contents', previewHash: 'hash:B contents' });
    expect(selection.getSnapshot().message).not.toContain('stale failure');
  });
  it('clears a successful restoration so the same preview cannot be confirmed again', async () => {
    const selection = new HandoffSelection<{ hash: string }>();
    await selection.select(ready());
    await selection.inspect('workspace', preview);
    const reviewed = selection.confirmation('workspace')!;
    selection.restored(reviewed);
    expect(selection.confirmation('workspace')).toBeNull();
    expect(selection.getSnapshot()).toMatchObject({ phase: 'empty', markdown: '', review: null });
  });
});
