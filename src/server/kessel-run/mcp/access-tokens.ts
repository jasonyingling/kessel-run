import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { ownerWrite, privateFile, privateRoot } from '../local-session';
import { withWorkspaceLock } from '../workspace/lock';
import { WorkspaceError } from '../workspace/schema';

export const grantInput = z.object({
  workspaceId: z.string().uuid(), clientName: z.string().min(1).max(120),
  publicationIds: z.array(z.string().uuid()).max(50).nullable(),
  allowDrafts: z.boolean(), allowSources: z.boolean(),
}).strict();
const tokenRecord = grantInput.extend({
  id: z.string().uuid(), tokenHash: z.string().length(64),
  createdAt: z.number(), revokedAt: z.number().nullable(),
});
const managementOperation = z.object({ id: z.string().uuid(), argumentsHash: z.string(), result: z.record(z.string(), z.unknown()) }).strict();
const issuedResult = z.object({ client: tokenRecord.omit({ tokenHash: true }), version: z.number().int().nonnegative() }).strict();
const indexSchema = z.object({ version: z.number().int().nonnegative(), tokens: z.array(tokenRecord), operations: z.array(managementOperation) }).strict();
export type Grant = z.infer<typeof tokenRecord>;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function publicRecord(record: Grant) {
  return {
    id: record.id, workspaceId: record.workspaceId, clientName: record.clientName,
    publicationIds: record.publicationIds, allowDrafts: record.allowDrafts,
    allowSources: record.allowSources, createdAt: record.createdAt, revokedAt: record.revokedAt,
  };
}

export class AccessTokens {
  constructor(private readonly root = privateRoot()) {}

  private async read() {
    try { return indexSchema.parse(JSON.parse(await readFile(privateFile('mcp-tokens.json', this.root), 'utf8'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 0, tokens: [], operations: [] };
      throw new WorkspaceError('INVALID_INPUT', 'Access-token index is corrupt');
    }
  }

  async list(workspaceId: string) {
    const index = await this.read();
    return { version: index.version, clients: index.tokens.filter(record => record.workspaceId === workspaceId).map(publicRecord) };
  }

  async issue(input: z.infer<typeof grantInput>, expectedVersion: number, operationId: string = randomUUID()) {
    const grant = grantInput.parse(input);
    z.string().uuid().parse(operationId);
    const argumentsHash = hash(JSON.stringify({ kind: 'issue', grant, expectedVersion }));
    return withWorkspaceLock(this.root, async () => {
      const index = await this.read();
      const prior = index.operations.find(operation => operation.id === operationId);
      if (prior) {
        if (prior.argumentsHash !== argumentsHash) throw new WorkspaceError('CONFLICT', 'Operation ID was reused with different connection arguments');
        return { ...issuedResult.parse(prior.result), token: null, secretUnavailable: true };
      }
      if (index.version !== expectedVersion) throw new WorkspaceError('CONFLICT', 'Connection settings changed; refresh before issuing a token');
      const token = `kr_mcp_${randomBytes(32).toString('hex')}`;
      const record = tokenRecord.parse({ ...grant, id: randomUUID(), tokenHash: hash(token), createdAt: Date.now(), revokedAt: null });
      index.tokens.push(record);
      index.version++;
      const result = { client: publicRecord(record), version: index.version };
      index.operations.push({ id: operationId, argumentsHash, result });
      await ownerWrite('mcp-tokens.json', index, this.root);
      return { token, ...result };
    });
  }

  async revoke(id: string, workspaceId: string, expectedVersion: number, operationId: string = randomUUID()) {
    z.string().uuid().parse(id);
    z.string().uuid().parse(operationId);
    const argumentsHash = hash(JSON.stringify({ kind: 'revoke', id, workspaceId, expectedVersion }));
    return withWorkspaceLock(this.root, async () => {
      const index = await this.read();
      const prior = index.operations.find(operation => operation.id === operationId);
      if (prior) {
        if (prior.argumentsHash !== argumentsHash) throw new WorkspaceError('CONFLICT', 'Operation ID was reused with different connection arguments');
        return prior.result;
      }
      if (index.version !== expectedVersion) throw new WorkspaceError('CONFLICT', 'Connection settings changed; refresh before revoking');
      const record = index.tokens.find(record => record.id === id && record.workspaceId === workspaceId);
      if (!record) throw new WorkspaceError('NOT_FOUND', 'Connection was not found');
      record.revokedAt = Date.now();
      index.version++;
      const result = { revoked: true, version: index.version };
      index.operations.push({ id: operationId, argumentsHash, result });
      await ownerWrite('mcp-tokens.json', index, this.root);
      return result;
    });
  }

  async authenticate(token: string): Promise<Grant> {
    if (!/^kr_mcp_[a-f0-9]{64}$/.test(token)) throw new WorkspaceError('NOT_FOUND', 'Connection credential is invalid or revoked');
    const index = await this.read();
    const grant = index.tokens.find(record => record.tokenHash === hash(token) && record.revokedAt === null);
    if (!grant) throw new WorkspaceError('NOT_FOUND', 'Connection credential is invalid or revoked');
    return grant;
  }

  async rotate(id: string, workspaceId: string, expectedVersion: number, operationId: string = randomUUID()) {
    z.string().uuid().parse(id);
    z.string().uuid().parse(operationId);
    const argumentsHash = hash(JSON.stringify({ kind: 'rotate', id, workspaceId, expectedVersion }));
    return withWorkspaceLock(this.root, async () => {
      const index = await this.read();
      const prior = index.operations.find(operation => operation.id === operationId);
      if (prior) {
        if (prior.argumentsHash !== argumentsHash) throw new WorkspaceError('CONFLICT', 'Operation ID was reused with different connection arguments');
        return { ...issuedResult.parse(prior.result), token: null, secretUnavailable: true };
      }
      if (index.version !== expectedVersion) throw new WorkspaceError('CONFLICT', 'Connection settings changed; refresh before rotating');
      const original = index.tokens.find(record => record.id === id && record.workspaceId === workspaceId && record.revokedAt === null);
      if (!original) throw new WorkspaceError('NOT_FOUND', 'Active connection was not found');
      const token = `kr_mcp_${randomBytes(32).toString('hex')}`;
      const record = tokenRecord.parse({ ...original, id: randomUUID(), tokenHash: hash(token), createdAt: Date.now(), revokedAt: null });
      original.revokedAt = Date.now();
      index.tokens.push(record);
      index.version++;
      const result = { client: publicRecord(record), version: index.version };
      index.operations.push({ id: operationId, argumentsHash, result });
      await ownerWrite('mcp-tokens.json', index, this.root);
      return { ...result, token };
    });
  }
}
