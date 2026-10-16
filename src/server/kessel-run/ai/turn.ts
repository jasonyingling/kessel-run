import { z } from 'zod';
import type { MastraModelConfig } from '@mastra/core/llm';
import type { WorkspaceService } from '../workspace/service';
import { WorkspaceError } from '../workspace/schema';
import { workflowContext } from '../skills/context';
import { Credentials } from './credentials';
import { Conversations } from './conversations';
import { createWorkspaceAgent } from './agent';
import { providerSelection } from './provider';

export const writingTurn = providerSelection.extend({
  operationId: z.string().uuid(), scope: z.string().uuid(), scopeKind: z.enum(['output', 'voice']),
  message: z.string().min(1).max(20000), mode: z.enum(['guided', 'fast']),
}).strict();

export async function startWritingTurn(
  input: z.infer<typeof writingTurn>, workspaceId: string, service: WorkspaceService, signal: AbortSignal,
  dependencies: { conversations?: Conversations; credentials?: Credentials; model?: MastraModelConfig } = {},
) {
  const parsed = writingTurn.parse(input); signal.throwIfAborted();
  const conversations = dependencies.conversations ?? new Conversations();
  const credentials = dependencies.credentials ?? new Credentials();
  const state = await service.overview();
  if (state.workspace.id !== workspaceId) throw new WorkspaceError('NOT_FOUND', 'Workspace scope changed');
  const context = parsed.scopeKind === 'output' ? await service.getContext(parsed.scope) : await service.getPublicationContext(parsed.scope, null, null);
  const skill = await workflowContext('kessel-run-start');
  const initialCredential = await credentials.status();
  const started = await conversations.start({ ...parsed, workspaceId, engine: dependencies.model ? 'fake' : 'api', contextHash: context.contextHash, skillHash: skill.contentHash });
  if (started.existing) return Response.json({ existing: true, runId: started.run.id, status: started.run.status });
  const run = started.run;
  const abort = new AbortController();
  const stop = () => abort.abort(); signal.addEventListener('abort', stop, { once: true });
  if (signal.aborted) stop();
  let canceled = false;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  const encoder = new TextEncoder();
  const emit = async (event: Parameters<Conversations['append']>[2]) => {
    const saved = await conversations.append(run.id, workspaceId, event);
    const item = saved.events[saved.events.length - 1];
    if (!canceled && streamController) streamController.enqueue(encoder.encode(`${JSON.stringify(item)}\n`));
  };
  let polling = false;
  const interval = setInterval(() => {
    if (polling) return;
    polling = true;
    void Promise.all([conversations.list(workspaceId, parsed.scope), credentials.status()]).then(([runs, status]) => {
      if (runs.find(value => value.id === run.id)?.stopRequested || (parsed.source === 'saved' && initialCredential.saved?.reference !== status.saved?.reference)) stop();
    }).catch(stop).finally(() => { polling = false; });
  }, 250);
  const timeout = setTimeout(stop, 90000);
  const cleanup = () => { clearInterval(interval); clearTimeout(timeout); signal.removeEventListener('abort', stop); };
  let reader: ReadableStreamDefaultReader<string> | undefined;
  let finish!: () => void;
  const completion = new Promise<void>(resolve => { finish = resolve; });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamController = controller;
      try {
        const history = (await conversations.list(workspaceId, parsed.scope)).filter(value => value.id !== run.id).slice(-4).flatMap(value => [
          { role: 'user' as const, content: value.message.slice(0, 10000) },
          { role: 'assistant' as const, content: `${value.status === 'completed' ? '' : '[Interrupted or failed turn; text is provisional] '} ${value.response.slice(0, 16000)}` },
        ]);
        const agent = await createWorkspaceAgent({ source: parsed.source, model: parsed.model }, service, {
          id: run.id, workspaceId, clientName: 'In-app writing', publicationIds: null, allowDrafts: true, allowSources: true, tokenHash: '', createdAt: Date.now(), revokedAt: null,
        }, { credentials, model: dependencies.model, signal: abort.signal, onOperation: async (name, result) => emit({ type: 'operation', name, result }) });
        const output = await agent.stream([...history, { role: 'user', content: `Scope: ${parsed.scopeKind} ${parsed.scope}. Mode: ${parsed.mode}. Current context hash: ${context.contextHash}.\n\n${parsed.message}` }], {
          providerOptions: { openai: { forceReasoning: true } }, abortSignal: abort.signal, maxSteps: 8, modelSettings: { maxRetries: 0, maxOutputTokens: 8000 },
        });
        reader = output.textStream.getReader();
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          await emit({ type: 'text', text: chunk.value });
        }
        if (output.error || await output.finishReason === 'error') throw new Error('Provider stream failed');
        if (!abort.signal.aborted) {
          const usage = await output.totalUsage;
          await conversations.update(run.id, workspaceId, record => { record.usage = { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }; });
        }
        await emit({ type: 'terminal', status: abort.signal.aborted ? 'interrupted' : 'completed' });
      } catch {
        try { await emit({ type: 'terminal', status: abort.signal.aborted ? 'interrupted' : 'failed' }); }
        catch { if (!canceled) controller.error(new Error('Run status could not be persisted. Reload saved activity before retrying.')); }
      } finally {
        try {
          cleanup();
          if (!canceled) { try { controller.close(); } catch { /* Already errored by persistence failure. */ } }
        } finally { finish(); }
      }
    },
    async cancel() { canceled = true; stop(); try { await reader?.cancel(); } finally { await completion; } },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store', 'x-kr-run-id': run.id } });
}
