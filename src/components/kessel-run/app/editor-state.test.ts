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

import { canExportBuffer, parseEditorRecovery } from './editor-state';
it('refuses changed buffers and any mismatched export identity', () => {
  const saved = { revision: 'revision', hash: 'hash', contextHash: 'context' };
  expect(canExportBuffer('visible', 'visible', saved, saved)).toBe(true);
  expect(canExportBuffer('visible', 'new typing', saved, saved)).toBe(false);
  for (const field of ['revision', 'hash', 'contextHash']) expect(canExportBuffer('visible', 'visible', saved, { ...saved, [field]: 'other' })).toBe(false);
});
it('rejects malformed recovered editor buffers', () => {
  expect(parseEditorRecovery(JSON.stringify({ prose: 42, hash: 'a'.repeat(64), contextHash: 'b'.repeat(64) }))).toBeNull();
  expect(parseEditorRecovery(JSON.stringify({ prose: 'Retained', hash: 'a'.repeat(64), contextHash: 'b'.repeat(64) }))?.prose).toBe('Retained');
});
