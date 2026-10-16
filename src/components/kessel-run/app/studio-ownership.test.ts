import { expect, it } from 'vitest';
import { operationState } from './operation-state';
import { ownsStudioCommand, studioLifetime } from './studio-ownership';
import { LocalApiError } from '@/lib/kessel-run/local-api';
it('a delayed old owner cannot acknowledge or reject a newer command and draft', () => {
  const data = new Map<string, string>(); const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const store = operationState(storage, 'same-workspace:studio');
  const old = studioLifetime();
  const first = store.begin({ path: 'content', body: { action: 'profile-import', input: { operationId: 'A', prose: 'First text' } } });
  old.dispose(); // Navigation unmounts the old owner. The new instance retries A.
  expect(ownsStudioCommand(true, store.read(), first)).toBe(true); store.clear();
  const second = store.begin({ path: 'content', body: { action: 'profile-import', input: { operationId: 'B', prose: 'New text' } } });
  let draft = 'New text';
  if (ownsStudioCommand(old.active(), store.read(), first)) { store.clear(); draft = ''; }
  if (ownsStudioCommand(old.active(), store.read(), first)) store.failed(new LocalApiError(400, 'INVALID_INPUT', 'Late rejection', 'rejected'));
  expect(store.read()).toEqual(second); expect(draft).toBe('New text');
  expect(ownsStudioCommand(true, store.read(), first)).toBe(false);
});
it('a preview callback from a disposed owner cannot replace the recovered draft', () => {
  const owner = studioLifetime(); let draft = 'Original';
  const latePreview = () => { if (owner.active()) draft = 'Original with preview'; };
  owner.dispose(); draft = 'Newer recovered text'; latePreview();
  expect(draft).toBe('Newer recovered text');
});
