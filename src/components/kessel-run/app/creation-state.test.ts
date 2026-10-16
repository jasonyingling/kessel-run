import { expect, it } from 'vitest';
import { creationState, type CreationDraft } from './creation-state';
import { LocalApiError } from '@/lib/kessel-run/local-api';
const storage = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } }; };
const draft = (): CreationDraft => ({ publicationId: crypto.randomUUID(), title: 'Idea', brief: 'Words', mode: 'guided', preset: 'Article', voice: '', author: '', piece: null });
it('retries lost responses with identical commands and retains piece identity before advancing', async () => {
  const state = creationState(storage(), 'workspace:publication'); state.write(draft());
  const commands: unknown[] = []; const result = { id: crypto.randomUUID(), link: '/kessel-run/pieces/saved' };
  const request = async (body: unknown) => { commands.push(body); if (commands.length === 1) throw new Error('Lost response'); return result; };
  await expect(state.step('piece', { title: 'Idea' }, () => true, request, () => {})).rejects.toThrow();
  await state.step('piece', { title: 'Changed UI must not alter command' }, () => true, request, receipt => state.write({ ...state.read()!, piece: receipt }));
  expect(commands[0]).toEqual(commands[1]); expect(state.read()?.piece).toEqual(result);
  await expect(state.step('output', {}, () => true, async () => { throw new Error('Lost output response'); }, () => {})).rejects.toThrow();
  expect(state.read()?.piece).toEqual(result); expect(state.commands.read()?.body.action).toBe('output');
});
it('late old owners cannot clear or reject a new owner command or overwrite its draft', async () => {
  const mem = storage(), old = creationState(mem, 'scope'), next = creationState(mem, 'scope'); old.write(draft());
  let active = true, resolve!: (value: { id: string; link: string }) => void;
  const delayed = old.step('piece', {}, () => active, () => new Promise(done => { resolve = done; }), () => old.clear());
  active = false;
  await next.step('piece', {}, () => true, async () => ({ id: crypto.randomUUID(), link: '/saved' }), result => next.write({ ...next.read()!, piece: result }));
  const newer = next.commands.begin({ path: 'content', body: { action: 'output', input: { operationId: crypto.randomUUID() } } });
  resolve({ id: crypto.randomUUID(), link: '/old' }); await delayed;
  expect(next.commands.read()).toEqual(newer); expect(next.read()?.piece?.link).toBe('/saved');
  let reject!: (error: Error) => void; active = true;
  const failed = old.step('output', {}, () => active, () => new Promise((_, fail) => { reject = fail; }), () => {});
  active = false; reject(new LocalApiError(409, 'CONFLICT', 'Rejected', 'rejected')); await expect(failed).rejects.toThrow();
  expect(next.commands.read()?.failed).toBeUndefined();
});
it('only explicit rejected output may be abandoned; canceling a draft does not erase a saved piece', async () => {
  const state = creationState(storage(), 'scope'), saved = { id: crypto.randomUUID(), link: '/piece' }; state.write({ ...draft(), piece: saved });
  await expect(state.step('output', {}, () => true, async () => { throw new LocalApiError(409, 'CONFLICT', 'Rejected', 'rejected'); }, () => {})).rejects.toThrow();
  state.commands.abandon(); expect(state.read()?.piece).toEqual(saved);
});
it('retains acknowledged identity when clearing a command fails and replays its original action', async () => {
  const mem = storage(); let fail = true;
  const state = creationState({ ...mem, removeItem(key) { if (key.includes('kr-operation:') && fail) { fail = false; throw new Error('Storage interrupted'); } mem.removeItem(key); } }, 'scope');
  state.write(draft()); const result = { id: crypto.randomUUID(), link: '/kessel-run/pieces/saved' }; let calls = 0;
  const request = async () => { calls++; return result; };
  await expect(state.step('piece', {}, () => true, request, receipt => state.write({ ...state.read()!, piece: receipt }))).rejects.toThrow('Storage interrupted');
  expect(state.read()?.piece).toEqual(result); expect(state.commands.read()?.body.action).toBe('piece');
  await state.step('piece', {}, () => true, request, receipt => state.write({ ...state.read()!, piece: receipt }));
  expect(calls).toBe(2); expect(state.commands.read()).toBeNull(); expect(state.read()?.piece).toEqual(result);
});
