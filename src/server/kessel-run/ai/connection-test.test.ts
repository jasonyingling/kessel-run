import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { connectionTest } from './connection-test';
import { Credentials } from './credentials';
import { RunStore } from './run-store';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'kr-probe-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
const selection = { source: 'saved' as const, model: 'gpt-6.1-sol' as const };

it('cleans up setup failures, retains a safe failed record and never falls back', async () => {
  const credentials = new Credentials(root, () => 'synthetic-environment-key');
  await expect(connectionTest(selection, new AbortController().signal, crypto.randomUUID(), {
    root, credentials,
  })).rejects.toThrow('unavailable');
  const files = await readdir(root);
  expect(files.filter(name => name.startsWith('active-'))).toHaveLength(0);
  const runFile = files.find(name => name.startsWith('run-'))!;
  const run = await new RunStore(root).get(runFile.slice(4, -5));
  expect(run.status).toBe('failed');
  expect(JSON.stringify(run)).not.toContain('synthetic-environment-key');
});

it('rejects an already stopped request without starting a model or run', async () => {
  const stop = new AbortController();
  stop.abort();
  await expect(connectionTest(selection, stop.signal, crypto.randomUUID(), { root })).rejects.toThrow();
  expect(await readdir(root)).toHaveLength(0);
});

it('reloads the completed streamed candidate and provider usage', async () => {
  const usage = {
    inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 4, text: 4, reasoning: 0 },
  };
  const model = new MockLanguageModelV3({ doStream: [
    { stream: simulateReadableStream({ chunks: [
      { type: 'tool-call', toolCallId: 'save', toolName: 'kr_propose_draft', input: JSON.stringify({
        prose: 'Synthetic workshop sentence.', expectedRevision: 'synthetic-v1', operationId: crypto.randomUUID(),
      }) },
      { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage },
    ] }) },
    { stream: simulateReadableStream({ chunks: [
      { type: 'text-start', id: 'text' },
      { type: 'text-delta', id: 'text', delta: 'Saved.' },
      { type: 'text-end', id: 'text' },
      { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
    ] }) },
  ] });
  const response = await connectionTest(selection, new AbortController().signal, crypto.randomUUID(), { root, model });
  expect(await response.text()).toContain('Saved.');
  const run = await new RunStore(root).get(response.headers.get('x-kr-run-id')!);
  expect(run.status).toBe('completed');
  expect(run.candidateId).toBeTruthy();
  expect(run.response).toBe('Saved.');
  expect(run.usage).toEqual({ inputTokens: 6, outputTokens: 8 });
});

it('cancels the integrated response body, aborts inference and persists interrupted status', async () => {
  let providerAborted = false;
  const model = new MockLanguageModelV3({ doStream: async options => ({
    stream: new ReadableStream({ start(controller) {
      controller.enqueue({ type: 'text-start', id: 'text' });
      controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Provisional synthetic text' });
      options.abortSignal?.addEventListener('abort', () => {
        providerAborted = true;
        controller.error(new DOMException('Stopped', 'AbortError'));
      }, { once: true });
    } }),
  }) });
  const response = await connectionTest(selection, new AbortController().signal, crypto.randomUUID(), { root, model });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let provisional = '';
  while (!provisional.includes('Provisional synthetic text')) {
    const part = await reader.read();
    if (part.done) throw new Error('Expected provisional streamed text');
    provisional += decoder.decode(part.value);
  }
  await reader.cancel();
  const store = new RunStore(root);
  let run = await store.get(response.headers.get('x-kr-run-id')!);
  const deadline = Date.now() + 2000;
  while (run.status === 'running' && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
    run = await store.get(run.id);
  }
  expect(providerAborted).toBe(true);
  expect(run.status).toBe('interrupted');
  expect(run.candidateId).toBeNull();
  expect(model.doStreamCalls).toHaveLength(1);
  expect((await readdir(root)).filter(name => name.startsWith('active-'))).toHaveLength(0);
});

it('redacts invalid-provider errors from the response and persisted run without retrying', async () => {
  const model = new MockLanguageModelV3({ doStream: async () => {
    throw new Error('Invalid credential synthetic-api-secret-not-for-client');
  } });
  const response = await connectionTest(selection, new AbortController().signal, crypto.randomUUID(), { root, model });
  expect(await response.text()).not.toContain('synthetic-api-secret-not-for-client');
  const run = await new RunStore(root).get(response.headers.get('x-kr-run-id')!);
  expect(run.status).toBe('failed');
  expect(JSON.stringify(run)).not.toContain('synthetic-api-secret-not-for-client');
  expect(model.doStreamCalls).toHaveLength(1);
});

it.each(['stop', 'length'] as const)('explains a %s finish without a candidate and uses a focused reasoning-compatible probe', async finishReason => {
  const model = new MockLanguageModelV3({ doStream: { stream: simulateReadableStream({ chunks: [
    { type: 'finish', finishReason: { unified: finishReason, raw: finishReason }, usage: { inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 4000, text: 0, reasoning: 4000 } } },
  ] }) } });
  const response = await connectionTest(selection, new AbortController().signal, crypto.randomUUID(), { root, model });
  await response.text();
  const run = await new RunStore(root).get(response.headers.get('x-kr-run-id')!);
  expect(run.status).toBe('failed'); expect(run.failure).toBe(finishReason === 'length' ? 'output-limit' : 'no-candidate');
  const call = model.doStreamCalls[0];
  expect(call.maxOutputTokens).toBe(4000);
  expect(call.providerOptions?.openai).toMatchObject({ forceReasoning: true, reasoningEffort: 'low' });
  expect(call.tools?.map(tool => tool.name).sort()).toEqual(['kr_get_context', 'kr_propose_draft']);
});
