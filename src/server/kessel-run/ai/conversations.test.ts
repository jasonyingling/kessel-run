import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Conversations } from './conversations';

let root: string;
let store: Conversations;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'kr-conversations-')); store = new Conversations(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
function input() {
  return { workspaceId: crypto.randomUUID(), scope: crypto.randomUUID(), scopeKind: 'voice' as const, operationId: crypto.randomUUID(), source: 'saved' as const, mode: 'guided' as const, model: 'gpt-5', message: 'Supplied synthetic voice notes', contextHash: 'context-v1', skillHash: 'skill-v1' };
}
it('deduplicates starts across instances, rejects overlapping turns and preserves scoped history', async () => {
  const args = input();
  const started = await store.start(args);
  const other = new Conversations(root);
  expect((await other.start({ ...args, contextHash: 'refreshed-context' })).run.id).toBe(started.run.id);
  await expect(other.start({ ...args, operationId: crypto.randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
  await expect(other.start({ ...args, message: 'Different same operation' })).rejects.toMatchObject({ code: 'CONFLICT' });
  await other.append(started.run.id, args.workspaceId, { type: 'text', text: 'Retained partial answer' });
  await other.append(started.run.id, args.workspaceId, { type: 'terminal', status: 'interrupted' });
  const next = await other.start({ ...args, operationId: crypto.randomUUID(), model: 'future-model' });
  expect(next.existing).toBe(false);
  const history = await store.list(args.workspaceId, args.scope);
  expect(history[0].response).toBe('Retained partial answer');
  expect(history[0].events.map(event => event.sequence)).toEqual([0, 1]);
  expect(history[1].model).toBe('future-model');
  expect(await store.list(crypto.randomUUID(), args.scope)).toEqual([]);
  await expect(other.stop(started.run.id, crypto.randomUUID())).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('marks dead owners interrupted instead of replaying generation and supports durable stop', async () => {
  const args = input();
  const started = await store.start(args);
  await store.stop(started.run.id, args.workspaceId);
  expect((await store.list(args.workspaceId, args.scope))[0].stopRequested).toBe(true);
  await store.update(started.run.id, args.workspaceId, run => { run.ownerPid = 2147483647; });
  const recovered = (await new Conversations(root).list(args.workspaceId, args.scope))[0];
  expect(recovered.status).toBe('interrupted');
  expect(recovered.events.at(-1)?.type).toBe('terminal');
  expect((await store.start({ ...args, operationId: crypto.randomUUID() })).existing).toBe(false);
});
