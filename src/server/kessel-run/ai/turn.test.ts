import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { WorkspaceService } from '../workspace/service';
import { Conversations } from './conversations';
import { Credentials } from './credentials';
import { startWritingTurn } from './turn';

let root: string;
let service: WorkspaceService;
let conversations: Conversations;
let credentials: Credentials;
let workspaceId: string;
let publicationId: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kr-writing-turn-'));
  service = new WorkspaceService(join(root, 'content'), join(root, 'journal'));
  conversations = new Conversations(join(root, 'runs'));
  credentials = new Credentials(join(root, 'credentials'), () => undefined);
  workspaceId = String((await service.initialize({ operationId: crypto.randomUUID(), title: 'Synthetic turn workspace' })).id);
  const state = await service.overview();
  publicationId = String((await service.createPublication({ operationId: crypto.randomUUID(), expectedHash: state.workspace.hash, title: 'Voice setup fixture', purpose: 'Supplied purpose', presets: ['article'] })).id);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
function input(model: 'gpt-5' | 'gpt-5-mini' = 'gpt-5') {
  return { source: 'saved' as const, model, operationId: crypto.randomUUID(), scope: publicationId, scopeKind: 'voice' as const, mode: 'guided' as const, message: 'Use supplied synthetic notes for voice setup.' };
}
const usage = { inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } };
function answer(text = 'Synthetic answer') {
  return new MockLanguageModelV3({ doStream: { stream: simulateReadableStream({ chunks: [
    { type: 'text-start', id: 'text' }, { type: 'text-delta', id: 'text', delta: text }, { type: 'text-end', id: 'text' },
    { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
  ] }) } });
}
it('reloads completed scoped conversations, deduplicates starts and records model changes and hashes', async () => {
  const args = input();
  const model = answer();
  const response = await startWritingTurn(args, workspaceId, service, new AbortController().signal, { conversations, credentials, model });
  expect(await response.text()).toContain('completed');
  const duplicate = await startWritingTurn(args, workspaceId, service, new AbortController().signal, { conversations, credentials, model });
  expect((await duplicate.json()).existing).toBe(true);
  expect(model.doStreamCalls).toHaveLength(1);
  const next = await startWritingTurn(input('gpt-5-mini'), workspaceId, service, new AbortController().signal, { conversations, credentials, model: answer('Second model answer') });
  await next.text();
  const runs = await new Conversations(join(root, 'runs')).list(workspaceId, publicationId);
  expect(runs.map(run => run.model)).toEqual(['gpt-5', 'gpt-5-mini']);
  expect(runs[0].response).toBe('Synthetic answer');
  expect(runs[0].contextHash).toHaveLength(64);
  expect(runs[0].skillHash).toHaveLength(64);
  expect(runs[0].usage).toEqual({ inputTokens: 3, outputTokens: 2 });
  expect(await conversations.list(crypto.randomUUID(), publicationId)).toEqual([]);
});
it('records rate-limit/provider stream failure without success, raw errors or fallback', async () => {
  const model = new MockLanguageModelV3({ doStream: { stream: simulateReadableStream({ chunks: [
    { type: 'error', error: new Error('Synthetic raw provider rate-limit error') },
  ] }) } });
  const response = await startWritingTurn(input(), workspaceId, service, new AbortController().signal, { conversations, credentials, model });
  const text = await response.text();
  expect(text).toContain('failed');
  expect(text).not.toContain('Synthetic raw provider');
  expect((await conversations.list(workspaceId, publicationId))[0].status).toBe('failed');
  expect(model.doStreamCalls).toHaveLength(1);
});
it('cancels the response body and settles even when terminal persistence fails', async () => {
  let providerAborted = false;
  const model = new MockLanguageModelV3({ doStream: async options => ({ stream: new ReadableStream({ start(controller) {
    controller.enqueue({ type: 'text-start', id: 'text' });
    controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Provisional text' });
    options.abortSignal?.addEventListener('abort', () => { providerAborted = true; controller.error(new DOMException('Stopped', 'AbortError')); }, { once: true });
  } }) }) });
  const original = conversations.append.bind(conversations);
  conversations.append = async (id, workspace, event) => {
    if (event.type === 'terminal') throw new Error('Synthetic persistence failure');
    return original(id, workspace, event);
  };
  const response = await startWritingTurn(input(), workspaceId, service, new AbortController().signal, { conversations, credentials, model });
  const reader = response.body!.getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('Provisional text');
  await reader.cancel();
  expect(providerAborted).toBe(true);
  const run = (await conversations.list(workspaceId, publicationId))[0];
  expect(run.response).toBe('Provisional text');
  expect(run.status).toBe('running'); // Failure was never acknowledged as success.
  await conversations.update(run.id, workspaceId, value => { value.createdAt = Date.now() - 100000; });
  expect((await conversations.list(workspaceId, publicationId))[0].status).toBe('interrupted');
});
it('removing a saved key stops an active provider and preserves interrupted history', async () => {
  await credentials.replace('synthetic-key-never-transmitted');
  let providerAborted = false;
  const model = new MockLanguageModelV3({ doStream: async options => ({ stream: new ReadableStream({ start(controller) {
    controller.enqueue({ type: 'text-start', id: 'text' }); controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Partial' });
    options.abortSignal?.addEventListener('abort', () => { providerAborted = true; controller.error(new DOMException('Stopped', 'AbortError')); }, { once: true });
  } }) }) });
  const response = await startWritingTurn(input(), workspaceId, service, new AbortController().signal, { conversations, credentials, model });
  const reader = response.body!.getReader(); await reader.read();
  await credentials.remove();
  while (!(await reader.read()).done) { /* Drain terminal interruption. */ }
  expect(providerAborted).toBe(true);
  const runs = await conversations.list(workspaceId, publicationId);
  expect(runs[0].status).toBe('interrupted');
  expect(JSON.stringify(runs)).not.toContain('synthetic-key-never-transmitted');
});
