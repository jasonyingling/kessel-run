import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { createWorkspaceAgent } from './agent';
import { WorkspaceService } from '../workspace/service';
import { AccessTokens } from '../mcp/access-tokens';

it('wraps the same scoped content operations as native Mastra tools and retains model provenance', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kr-native-tools-'));
  try {
    const service = new WorkspaceService(join(folder, 'content'), join(folder, 'workspace-private'));
    const home = await service.initialize({ operationId: crypto.randomUUID(), title: 'Native tools fixture' });
    const publication = await service.createPublication({ operationId: crypto.randomUUID(), expectedHash: home.hash, title: 'Synthetic publication', purpose: 'Synthetic audience', presets: ['article'] });
    let state = await service.overview();
    const voice = await service.confirmProfileImport({ operationId: crypto.randomUUID(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), prose: 'Supplied concrete voice rules.', title: 'Voice', scope: 'publication', parent: null, authorId: null, provenance: 'Synthetic confirmed profile' });
    state = await service.overview();
    const piece = await service.createPiece({ operationId: crypto.randomUUID(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), title: 'Piece', brief: 'Supplied workshop detail.', mode: 'fast' });
    state = await service.overview();
    const output = await service.createOutput({ operationId: crypto.randomUUID(), expectedHash: state.pieces[0].hash, pieceId: String(piece.id), title: 'Article', format: 'article', preset: 'article', voice: { profileId: String(voice.id), version: 1 }, author: null });
    const context = await service.getContext(String(output.id));
    const tokens = new AccessTokens(join(folder, 'token-private'));
    const issued = await tokens.issue({ workspaceId: String(home.id), clientName: 'Synthetic native grant', publicationIds: [String(publication.id)], allowDrafts: true, allowSources: true }, 0);
    const grant = await tokens.authenticate(issued.token!);
    const usage = { inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } };
    const model = new MockLanguageModelV3({ doStream: [
      { stream: simulateReadableStream({ chunks: [{ type: 'tool-call', toolCallId: 'context', toolName: 'kr_get_context', input: JSON.stringify({ outputId: output.id }) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage }] }) },
      { stream: simulateReadableStream({ chunks: [{ type: 'tool-call', toolCallId: 'save', toolName: 'kr_propose_draft', input: JSON.stringify({ operationId: crypto.randomUUID(), outputId: output.id, expectedHash: context.output.hash, expectedContextHash: context.contextHash, prose: 'Native model candidate.' }) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage }] }) },
      { stream: simulateReadableStream({ chunks: [{ type: 'text-start', id: 'text' }, { type: 'text-delta', id: 'text', delta: 'Candidate proposed.' }, { type: 'text-end', id: 'text' }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage }] }) },
    ] });
    const agent = await createWorkspaceAgent({ source: 'saved', model: 'gpt-6.1-sol' }, service, grant, { model });
    const result = await agent.stream('Read context and propose prose.', { maxSteps: 4, modelSettings: { maxRetries: 0 } });
    await result.consumeStream();
    const saved = await service.getContext(String(output.id));
    const payload = saved.pending[0].payload as { revisionId: string };
    expect((await service.getRevision(String(output.id), payload.revisionId)).provenance).toBe('model');
    expect(saved.output.body).toBe('');
    expect(model.doStreamCalls).toHaveLength(3);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
