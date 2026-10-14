import { readFile, mkdir, rmdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { privateFile, privateRoot, ownerWrite, securePrivateRoot } from '../local-session';

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
  events: z.array(z.unknown()),
  usage: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }).nullable(),
  createdAt: z.number(),
}).strict();

export type RunRecord = z.infer<typeof recordSchema>;

export class RunStore {
  constructor(private readonly root = privateRoot()) {}

  async get(id: string) {
    z.string().uuid().parse(id);
    const content = await readFile(privateFile(`run-${id}.json`, this.root), 'utf8');
    return recordSchema.parse(JSON.parse(content));
  }

  async save(record: RunRecord) {
    recordSchema.parse(record);
    await ownerWrite(`run-${record.id}.json`, record, this.root);
  }

  async lock(scope: string) {
    z.string().uuid().parse(scope);
    const lock = resolve(securePrivateRoot(this.root), `active-${scope}`);
    try {
      await mkdir(lock, { mode: 0o700 });
    } catch {
      throw new Error('CONFLICT: An active turn already owns this scope.');
    }
    return async () => { await rmdir(lock); };
  }

  async start(scope: string, operationId: string, model: string, message: string, workspaceId = scope) {
    const record: RunRecord = {
      id: randomUUID(), workspaceId, scope, operationId, model, provider: 'openai',
      message, response: '', status: 'running', candidateId: null, events: [],
      usage: null, createdAt: Date.now(),
    };
    await this.save(record);
    return record;
  }
}
