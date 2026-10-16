import { randomUUID } from 'node:crypto';
import { validateTypes } from '@ai-sdk/provider-utils';
import { uiMessageChunkSchema, createUIMessageStreamResponse } from 'ai';
import { toAISdkStream } from '@mastra/ai-sdk';
import type { MastraModelConfig } from '@mastra/core/llm';
import type { UIMessageChunk } from 'ai';
import type { z } from 'zod';
import { createWritingAgent, providerSelection } from './provider';
import { ownerWrite, privateRoot } from '../local-session';
import { RunStore } from './run-store';
import { Credentials } from './credentials';

export async function connectionTest(
  selection: z.infer<typeof providerSelection>,
  signal: AbortSignal,
  workspaceId: string,
  dependencies: { root?: string; credentials?: Credentials; model?: MastraModelConfig } = {},
) {
  providerSelection.parse(selection);
  signal.throwIfAborted();
  const root = dependencies.root ?? privateRoot();
  const scope = randomUUID();
  const operationId = randomUUID();
  const store = new RunStore(root);
  const release = await store.lock(scope);
  const abort = new AbortController();
  const stop = () => abort.abort();
  signal.addEventListener('abort', stop, { once: true });
  if (signal.aborted) stop();
  const timeout = setTimeout(stop, 60000);
  let proposed: string | null = null;
  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timeout);
    signal.removeEventListener('abort', stop);
    await release();
  };
  let run;
  try {
    run = await store.start(scope, operationId, selection.model,
      'Synthetic connection test: read the fixture, propose a short candidate, then confirm the save.', workspaceId);
    const agent = await createWritingAgent(selection, {
      readContext: async () => ({
        text: 'Synthetic fixture: The workshop begins at 10 a.m. on Tuesday. Write one sentence using only this supplied fact.',
        revision: 'synthetic-v1',
      }),
      saveCandidate: async input => {
        if (abort.signal.aborted) throw new Error('CAPABILITY_UNAVAILABLE');
        if (input.expectedRevision !== 'synthetic-v1') throw new Error('CONFLICT');
        const candidateId = randomUUID();
        await ownerWrite(`probe-${candidateId}.json`, {
          ...input, candidateId, scope, provenance: 'model', model: selection.model,
        }, root);
        proposed = candidateId;
        return { candidateId, revision: 'synthetic-candidate-v1' };
      },
    }, dependencies.credentials, dependencies.model, 'connection-test');
    const output = await agent.stream(run.message, {
      abortSignal: abort.signal, maxSteps: 4,
      modelSettings: { maxRetries: 0, maxOutputTokens: 4000 },
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low' } },
    });
    const reader = toAISdkStream(output, {
      from: 'agent', version: 'v5',
      onError: () => 'Connection test failed. Check the selected credential.',
    }).getReader();
    const record = run;
    let canceled = false;
    let finished!: () => void;
    const completion = new Promise<void>(resolve => { finished = resolve; });
    const stream = new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = await validateTypes({ value, schema: uiMessageChunkSchema });
            if (chunk.type === 'error') throw new Error('Provider failure');
            if (chunk.type === 'text-delta') record.response += chunk.delta;
            record.events.push(chunk);
            if (!canceled) controller.enqueue(chunk);
          }
          record.candidateId = proposed;
          const finishReason = await output.finishReason;
          if (finishReason === 'error' || output.error) throw Error('Provider stream failed');
          record.failure = abort.signal.aborted ? 'canceled' : !proposed ? (finishReason === 'length' ? 'output-limit' : 'no-candidate') : null;
          record.status = abort.signal.aborted ? 'interrupted' : proposed ? 'completed' : 'failed';
          if (!abort.signal.aborted) {
            const usage = await output.totalUsage;
            record.usage = { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
          }
          await cleanup();
          await store.save(record);
          if (!canceled) controller.close();
        } catch {
          record.status = abort.signal.aborted ? 'interrupted' : 'failed';
          record.failure = abort.signal.aborted ? 'canceled' : 'provider';
          record.candidateId = proposed;
          await cleanup();
          await store.save(record);
          if (!canceled) {
            controller.enqueue({ type: 'error', errorText: 'Connection test failed or stopped. No credential fallback was attempted.' });
            controller.close();
          }
        } finally {
          try { await cleanup(); }
          finally { finished(); }
        }
      },
      async cancel() {
        canceled = true;
        stop();
        await reader.cancel();
        await completion;
      },
    });
    return createUIMessageStreamResponse({
      stream, headers: { 'x-kr-run-id': record.id, 'cache-control': 'no-store' },
    });
  } catch {
    try {
      if (run) {
        run.status = abort.signal.aborted ? 'interrupted' : 'failed';
        await store.save(run);
      }
    } finally {
      await cleanup();
    }
    throw new Error('Connection test unavailable. Check the selected credential.');
  }
}
