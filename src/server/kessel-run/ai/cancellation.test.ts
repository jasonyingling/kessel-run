import { expect, it } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { createWritingAgent } from './provider';
it('passes Stop to the actual provider signal and does not replay the turn', async () => {
  const stop = new AbortController();
  let providerAborted = false;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const model = new MockLanguageModelV3({ doStream: async options => {
    started();
    expect(options.abortSignal).toBeDefined();
    return { stream: new ReadableStream({ start(controller) {
      controller.enqueue({ type: 'text-start', id: 'provisional' });
      controller.enqueue({ type: 'text-delta', id: 'provisional', delta: 'Interrupted candidate' });
      options.abortSignal?.addEventListener('abort', () => { providerAborted = true; controller.error(new DOMException('Stopped', 'AbortError')); }, { once: true });
    } }) };
  } });
  const agent = await createWritingAgent({ source: 'saved', model: 'gpt-5' }, { readContext: async () => ({ text: '', revision: 'v1' }), saveCandidate: async () => { throw new Error('Must not save interrupted prose'); } }, undefined, model);
  const output = await agent.stream('Draft', { abortSignal: stop.signal, maxSteps: 2, modelSettings: { maxRetries: 0, maxOutputTokens: 100 } });
  const consuming = output.consumeStream().catch(() => undefined);
  await began;
  stop.abort();
  await consuming;
  expect(providerAborted).toBe(true);
  expect(model.doStreamCalls).toHaveLength(1);
});
