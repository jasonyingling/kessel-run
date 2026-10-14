import { randomUUID } from 'node:crypto';
import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';
import { WorkspaceError } from '../workspace/schema';
import type { WorkspaceService } from '../workspace/service';
import { privateRoot } from '../local-session';

// Deterministic fixtures only. Production always rejects the explicit test flag.
// This factory never resolves a provider credential or calls a network model.
export async function requireFixtureServer(service: WorkspaceService) {
  const root = process.env.KESSEL_RUN_TEST_ROOT;
  if (process.env.NODE_ENV !== 'development' || !root || !isAbsolute(root)) throw new WorkspaceError('CAPABILITY_UNAVAILABLE', 'Fake provider requires an explicit development fixture root');
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || (process.getuid && info.uid !== process.getuid()) || (info.mode & 0o077) !== 0) throw new WorkspaceError('CAPABILITY_UNAVAILABLE', 'Fixture root must be an owned private directory');
  const canonical = await realpath(root);
  for (const selected of [await realpath(service.root), await realpath(privateRoot())]) {
    const path = relative(canonical, selected);
    if (!path || path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new WorkspaceError('CAPABILITY_UNAVAILABLE', 'Fake provider cannot access content outside its fixture root');
  }
}
export async function fixtureModel(service: WorkspaceService, scope: string, kind: 'output' | 'voice') {
  const state = await service.overview();
  if (!String(state.workspace.title).startsWith('Synthetic')) throw new WorkspaceError('CAPABILITY_UNAVAILABLE', 'Fake provider requires a synthetic fixture workspace');
  const { MockLanguageModelV3, simulateReadableStream } = await import('ai/test');
  const context = kind === 'output' ? await service.getContext(scope) : await service.getPublicationContext(scope, null, null);
  let name: string;
  let input: Record<string, unknown>;
  if ('output' in context) {
    name = 'kr_propose_draft';
    input = { operationId: randomUUID(), outputId: scope, expectedHash: context.output.hash, expectedContextHash: context.contextHash, prose: 'Synthetic fixture candidate from supplied workshop notes.', declaredModel: 'synthetic-fixture' };
  } else {
    name = 'kr_propose_profile';
    input = { operationId: randomUUID(), publicationId: scope, expectedHash: context.publication.hash, title: 'Synthetic proposed voice', scope: 'publication', parent: null, authorId: null, prior: null, prose: 'Use only supplied synthetic facts.', evidence: 'Explicit synthetic test fixture' };
  }
  const usage = { inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } };
  return new MockLanguageModelV3({ doStream: [
    { stream: simulateReadableStream({ chunks: [{ type: 'tool-call', toolCallId: 'fixture-save', toolName: name, input: JSON.stringify(input) }, { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage }] }) },
    { stream: simulateReadableStream({ chunks: [{ type: 'text-start', id: 'fixture-text' }, { type: 'text-delta', id: 'fixture-text', delta: 'Synthetic candidate saved for human review.' }, { type: 'text-end', id: 'fixture-text' }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage }] }) },
  ] });
}
