import { afterEach, expect, it, vi } from 'vitest';
import { createWritingAgent } from './provider';
import { Credentials } from './credentials';
afterEach(() => vi.unstubAllGlobals());
it.each(['gpt-6-luna', 'gpt-6.1-sol'] as const)('routes %s through Responses with reasoning settings, never Chat Completions', async model => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(init.body) });
    throw Error('Synthetic transport stop; no network used');
  }));
  const credentials = new Credentials('/unused');
  vi.spyOn(credentials, 'resolve').mockResolvedValue('synthetic-key-no-network');
  const agent = await createWritingAgent({ source: 'saved', model }, { readContext: async () => ({ text: 'Synthetic', revision: 'v1' }), saveCandidate: async () => ({ candidateId: crypto.randomUUID(), revision: 'v2' }) }, credentials, undefined, 'connection-test');
  await expect(agent.generate('Synthetic probe', { maxSteps: 1, modelSettings: { maxRetries: 0, maxOutputTokens: 4000 }, providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low' } } })).rejects.toThrow();
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('https://api.openai.com/v1/responses');
  expect(requests[0].body).toMatchObject({ model, reasoning: { effort: 'low' }, max_output_tokens: 4000 });
  expect((requests[0].body.tools as unknown[])).toHaveLength(2);
});
