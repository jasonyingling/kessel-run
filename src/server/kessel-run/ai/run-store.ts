import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { privateFile, privateRoot, ownerWrite, securePrivateRoot } from '../local-session';
import { withWorkspaceLock } from '../workspace/lock';

const recordSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  scope: z.string().uuid(),
  operationId: z.string().uuid(),
  model: z.string(),
  provider: z.literal('openai'),
  status: z.enum(['running', 'completed', 'interrupted', 'failed']),
  message: z.string(),
  response: z.string(),
  candidateId: z.string().uuid().nullable(),
  failure: z.enum(['canceled', 'output-limit', 'no-candidate', 'provider']).nullable().optional(),
  events: z.array(z.unknown()),
  usage: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }).nullable(),
  createdAt: z.number(),
  ownerPid: z.number().int().default(0),
}).strict();

export type RunRecord = z.infer<typeof recordSchema>;

export class RunStore {
  constructor(private readonly root = privateRoot()) {}

  async get(id: string) {
    z.string().uuid().parse(id);
    const content = await readFile(privateFile(`run-${id}.json`, this.root), 'utf8');
    const record = recordSchema.parse(JSON.parse(content));
    let alive = record.ownerPid > 0;
    try { if (alive) process.kill(record.ownerPid, 0); }
    catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
    if (record.status === 'running' && !alive) { record.status = 'interrupted'; await this.save(record); }
    return record;
  }

  async save(record: RunRecord) {
    recordSchema.parse(record);
    await ownerWrite(`run-${record.id}.json`, record, this.root);
  }

  async lock(scope: string) {
    z.string().uuid().parse(scope);
    const lock = resolve(securePrivateRoot(this.root), `scope-${scope}`);
    let acquired!: () => void;
    let failed!: (error: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => { acquired = resolve; failed = reject; });
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const task = withWorkspaceLock(lock, async () => { acquired(); await held; }, 100);
    void task.catch(failed);
    await ready;
    return async () => { release(); await task; };
  }

  async start(scope: string, operationId: string, model: string, message: string, workspaceId = scope) {
    const record: RunRecord = {
      id: randomUUID(), workspaceId, scope, operationId, model, provider: 'openai',
      message, response: '', status: 'running', candidateId: null, events: [],
      usage: null, createdAt: Date.now(), ownerPid: process.pid,
    };
    await this.save(record);
    return record;
  }
}
