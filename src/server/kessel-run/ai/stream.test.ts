import { expect, it } from 'vitest';
import { validateTypes } from '@ai-sdk/provider-utils';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { createUIMessageStreamResponse, readUIMessageStream, uiMessageChunkSchema } from 'ai';
import type { UIMessageChunk } from 'ai';
import { toAISdkStream } from '@mastra/ai-sdk';
import { createWritingAgent } from './provider';
const usage = { inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 4, text: 4, reasoning: 0 } };
it('runs real Mastra fixture and saving tools through its v5 stream into the installed v7 UI consumer', async () => {
  let saved = '';
  let reads = 0;
  const operationId = crypto.randomUUID();
  const model = new MockLanguageModelV3({ doStream: [
    { stream: simulateReadableStream({ chunks: [{ type: 'tool-call', toolCallId: 'read', toolName: 'kr_get_context', input: '{}' }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage }] }) },
    { stream: simulateReadableStream({ chunks: [{ type: 'tool-call', toolCallId: 'save', toolName: 'kr_propose_draft', input: JSON.stringify({ prose: 'Synthetic candidate.', expectedRevision: 'fixture-v1', operationId }) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage }] }) },
    { stream: simulateReadableStream({ chunks: [{ type: 'text-start', id: 'text' }, { type: 'text-delta', id: 'text', delta: 'Candidate saved.' }, { type: 'text-end', id: 'text' }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage }] }) },
  ] });
  const agent = await createWritingAgent({ source: 'saved', model: 'gpt-6.1-sol' }, {
    readContext: async () => { reads++; return { text: 'Synthetic notes', revision: 'fixture-v1' }; },
    saveCandidate: async input => { saved = input.prose; return { candidateId: operationId, revision: 'candidate-v1' }; },
  }, undefined, model);
  const output = await agent.stream('Read context, then save a candidate and summarize.', { maxSteps: 4, modelSettings: { maxOutputTokens: 100, maxRetries: 0 } });
  const stream = toAISdkStream(output, { from: 'agent', version: 'v5' });
  const chunks: UIMessageChunk[] = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(await validateTypes({ value, schema: uiMessageChunkSchema }));
  }
  const validated = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  const response = createUIMessageStreamResponse({ stream: validated });
  expect(await response.text()).toContain('Candidate saved.');
  const consumed = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  let final;
  for await (const message of readUIMessageStream({ stream: consumed })) final = message;
  expect(final?.parts).toContainEqual({ type: 'text', text: 'Candidate saved.', state: 'done' });
  expect(reads).toBe(1);
  expect(saved).toBe('Synthetic candidate.');
  expect(model.doStreamCalls).toHaveLength(3);
  expect(model.doStreamCalls[2].prompt.some(message => message.role === 'tool')).toBe(true);
});
