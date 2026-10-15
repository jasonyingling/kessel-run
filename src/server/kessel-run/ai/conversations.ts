import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { z } from 'zod';
import { ownerWrite, privateFile, privateRoot } from '../local-session';
import { hashText } from '../workspace/files';
import { withWorkspaceLock } from '../workspace/lock';
import { WorkspaceError } from '../workspace/schema';
import { runEvent } from './events';

export const conversationRun = z.object({
  id: z.string().uuid(), workspaceId: z.string().uuid(), scope: z.string().uuid(), scopeKind: z.enum(['output', 'voice']), operationId: z.string().uuid(), argumentsHash: z.string(),
  model: z.string(), provider: z.literal('openai'), source: z.enum(['saved', 'environment']),
  mode: z.enum(['guided', 'fast']),
  engine: z.enum(['api', 'fake']).default('api'),
  contextHash: z.string(), skillHash: z.string(), message: z.string(), response: z.string(),
  status: z.enum(['running', 'completed', 'interrupted', 'failed']), ownerPid: z.number().int(), stopRequested: z.boolean(),
  events: z.array(runEvent), createdAt: z.number(), usage: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }).nullable(),
}).strict();
export type ConversationRun = z.infer<typeof conversationRun>;
type StartInput = Pick<ConversationRun, 'workspaceId' | 'scope' | 'scopeKind' | 'operationId' | 'model' | 'source' | 'mode' | 'message' | 'contextHash' | 'skillHash'> & { engine?: 'api' | 'fake' };
type EventInput<T = z.infer<typeof runEvent>> = T extends { sequence: number } ? Omit<T, 'sequence'> : never;

function alive(pid: number) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}
export class Conversations {
  constructor(readonly root = privateRoot()) {}
  private async records() {
    privateFile('conversation-index.guard', this.root);
    const names = (await readdir(this.root)).filter(name => /^conversation-[a-f0-9-]+\.json$/.test(name));
    return Promise.all(names.map(async name => conversationRun.parse(JSON.parse(await readFile(privateFile(name, this.root), 'utf8')))));
  }
  private write(run: ConversationRun) { return ownerWrite(`conversation-${run.id}.json`, conversationRun.parse(run), this.root); }
  private async recover(runs: ConversationRun[]) {
    for (const run of runs) if (run.status === 'running' && (!alive(run.ownerPid) || Date.now() - run.createdAt > 95000)) {
      run.status = 'interrupted';
      run.events.push({ type: 'terminal', sequence: run.events.length, status: 'interrupted' });
      await this.write(run);
    }
  }
  async list(workspaceId: string, scope: string) {
    z.string().uuid().parse(workspaceId); z.string().uuid().parse(scope);
    return withWorkspaceLock(this.root, async () => {
      const runs = await this.records(); await this.recover(runs);
      return runs.filter(run => run.workspaceId === workspaceId && run.scope === scope).sort((a, b) => a.createdAt - b.createdAt);
    });
  }
  async start(input: StartInput) {
    const argumentsHash = hashText(JSON.stringify({ workspaceId: input.workspaceId, scope: input.scope, scopeKind: input.scopeKind, operationId: input.operationId, model: input.model, source: input.source, engine: input.engine ?? 'api', mode: input.mode, message: input.message }));
    return withWorkspaceLock(this.root, async () => {
      const runs = await this.records(); await this.recover(runs);
      const prior = runs.find(run => run.operationId === input.operationId);
      if (prior) {
        if (prior.argumentsHash !== argumentsHash || prior.workspaceId !== input.workspaceId) throw new WorkspaceError('CONFLICT', 'Run operation ID was reused with different arguments');
        return { run: prior, existing: true };
      }
      if (runs.some(run => run.workspaceId === input.workspaceId && run.scope === input.scope && run.status === 'running')) throw new WorkspaceError('CONFLICT', 'A writing turn is already active in this scope');
      const run = conversationRun.parse({ ...input, id: randomUUID(), argumentsHash, provider: 'openai', response: '', status: 'running', ownerPid: process.pid, stopRequested: false, events: [], createdAt: Date.now(), usage: null });
      await this.write(run);
      return { run, existing: false };
    });
  }
  async update(id: string, workspaceId: string, mutate: (run: ConversationRun) => void) {
    return withWorkspaceLock(this.root, async () => {
      const runs = await this.records();
      const run = runs.find(value => value.id === id && value.workspaceId === workspaceId);
      if (!run) throw new WorkspaceError('NOT_FOUND', 'Run is outside this workspace');
      mutate(run); await this.write(run); return run;
    });
  }
  async append(id: string, workspaceId: string, event: EventInput) {
    return this.update(id, workspaceId, run => {
      const item = runEvent.parse({ ...event, sequence: run.events.length });
      run.events.push(item);
      if (item.type === 'text') run.response += item.text;
      if (item.type === 'terminal') run.status = item.status;
    });
  }
  stop(id: string, workspaceId: string) { return this.update(id, workspaceId, run => { run.stopRequested = true; }); }
}
