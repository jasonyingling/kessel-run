import { expect, it } from 'vitest';
import { acknowledgeSave } from './editor-state';

it('advances the save base while retaining typing that happened during a delayed save', async () => {
  let editor = 'Submitted text';
  const submitted = editor;
  let resolveSave!: (value: { hash: string; contextHash: string }) => void;
  const save = new Promise<{ hash: string; contextHash: string }>(resolve => { resolveSave = resolve; });
  editor += ' plus continued typing';
  resolveSave({ hash: 'acknowledged-revision', contextHash: 'acknowledged-context' });
  const result = await save;
  const state = acknowledgeSave(submitted, editor, result.hash, result.contextHash);
  expect(state.prose).toBe('Submitted text plus continued typing');
  expect(state.dirty).toBe(true);
  expect(state.baseHash).toBe('acknowledged-revision');
  expect(state.contextHash).toBe('acknowledged-context');
  expect(acknowledgeSave(state.prose, state.prose, 'next', 'next-context').dirty).toBe(false);
});
