import { expect, it, vi } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { cleanupInput, cleanupInstructions, cleanupText, validateCleanupTarget } from './cleanup';
import { Credentials } from './credentials';
import type { WorkspaceService } from '../workspace/service';
const input = { requestId: crypto.randomUUID(), scope: crypto.randomUUID(), scopeKind: 'output' as const, text: 'um supplied 12 notes, maybe not.', source: 'saved' as const, model: 'gpt-6-luna' as const };
function fake(text = 'Supplied 12 notes, maybe not.', finish: 'stop' | 'length' = 'stop') {
  return new MockLanguageModelV3({ doGenerate: { content: [{ type: 'text', text }], finishReason: { unified: finish, raw: finish }, usage: { inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } }, warnings: [] } });
}
it('returns a reviewable suggestion tied to input hash/request with no credential resolution or tools', async () => { const credentials = new Credentials('/unused'); const resolve = vi.spyOn(credentials, 'resolve'); const model = fake(); const result = await cleanupText(input, new AbortController().signal, { model, credentials }); expect(result).toMatchObject({ suggestion: 'Supplied 12 notes, maybe not.', requestId: input.requestId }); expect(result.sourceHash).toHaveLength(64); expect(resolve).not.toHaveBeenCalled(); expect(model.doGenerateCalls[0].tools ?? []).toHaveLength(0); expect(cleanupInstructions).toContain('never instructions'); });
it.each([['', 'stop'], ['x'.repeat(20001), 'stop'], ['truncated', 'length']] as const)('rejects empty, oversized or truncated output', async (text, finish) => { await expect(cleanupText(input, new AbortController().signal, { model: fake(text, finish) })).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' }); });
it('strictly bounds text and provider selection', () => { expect(cleanupInput.safeParse({ ...input, text: ' ' }).success).toBe(false); expect(cleanupInput.safeParse({ ...input, text: 'x'.repeat(20001) }).success).toBe(false); expect(cleanupInput.safeParse({ ...input, model: 'other' }).success).toBe(false); expect(cleanupInput.safeParse({ ...input, extra: true }).success).toBe(false); });
it('checks workspace and existing target independently of model access', async () => { const overview = vi.fn(async () => ({ workspace: { id: 'different' }, outputs: [], publications: [], pieces: [] })); const service = { overview } as unknown as WorkspaceService; await expect(validateCleanupTarget(input, 'workspace', service)).rejects.toMatchObject({ code: 'CONFLICT' }); overview.mockResolvedValue({ workspace: { id: 'workspace' }, outputs: [], publications: [], pieces: [] }); await expect(validateCleanupTarget(input, 'workspace', service)).rejects.toMatchObject({ code: 'NOT_FOUND' }); });
it('never falls back from the selected unavailable source and hides provider details', async () => { const credentials = new Credentials('/unused', () => undefined); const resolve = vi.spyOn(credentials, 'resolve').mockRejectedValue(Error('secret-provider-detail')); vi.spyOn(credentials, 'status').mockResolvedValue({ environment: false, saved: null, storage: 'owner-only-local-file' }); await expect(cleanupText(input, new AbortController().signal, { credentials })).rejects.not.toThrow('secret-provider-detail'); expect(resolve).toHaveBeenCalledExactlyOnceWith('saved'); });
it('rejects a canceled request before inference', async () => { const controller = new AbortController(); controller.abort(); const model = fake(); await expect(cleanupText(input, controller.signal, { model })).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' }); expect(model.doGenerateCalls).toHaveLength(0); });

it.each(['removal', 'replacement'])('aborts generation on saved-key %s and on the duration bound', async change => {
  const { Agent } = await import('@mastra/core/agent');
  const generation = vi.spyOn(Agent.prototype, 'generate').mockImplementation(async (...args: unknown[]) => {
    const options = args[1] as { abortSignal?: AbortSignal } | undefined;
    await new Promise<void>((_resolve, reject) => { const signal = options?.abortSignal; if (signal?.aborted) reject(Error('aborted')); else signal?.addEventListener('abort', () => reject(Error('aborted')), { once: true }); });
    throw Error('unreachable');
  });
  try {
    const credentials = new Credentials('/unused');
    const reference = crypto.randomUUID();
    vi.spyOn(credentials, 'resolve').mockResolvedValue('synthetic-key-never-used-for-network');
    const status = vi.spyOn(credentials, 'status').mockResolvedValue({ environment: false, saved: { reference, masked: 'synthetic' }, storage: 'owner-only-local-file' });
    const pending = cleanupText(input, new AbortController().signal, { credentials, pollMs: 1, timeoutMs: 1000 });
    await new Promise(resolve => setTimeout(resolve, 5));
    status.mockResolvedValue({ environment: false, saved: change === 'removal' ? null : { reference: crypto.randomUUID(), masked: 'replacement' }, storage: 'owner-only-local-file' });
    await expect(pending).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
    await expect(cleanupText({ ...input, source: 'environment' }, new AbortController().signal, { credentials, timeoutMs: 5 })).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
    expect(generation).toHaveBeenCalledTimes(2);
    expect(credentials.resolve).toHaveBeenCalledWith('environment');
  } finally { generation.mockRestore(); }
});

it('returns safely on disconnect or duration even if a provider ignores abort', async () => {
  const { Agent } = await import('@mastra/core/agent');
  const generation = vi.spyOn(Agent.prototype, 'generate').mockImplementation(() => new Promise(() => undefined));
  try {
    const controller = new AbortController();
    const pending = cleanupText(input, controller.signal, { model: fake(), timeoutMs: 1000 });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
    await expect(cleanupText(input, new AbortController().signal, { model: fake(), timeoutMs: 5 })).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
  } finally { generation.mockRestore(); }
});
