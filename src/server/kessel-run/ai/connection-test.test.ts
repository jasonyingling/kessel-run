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
const selection = { source: 'saved' as const, model: 'gpt-5' as const };

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
