import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccessTokens } from './access-tokens';

it('stores hashes only, reveals a secret once, rotates atomically and revokes on every authentication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kr-token-'));
  try {
    const tokens = new AccessTokens(root);
    const workspaceId = crypto.randomUUID();
    const grant = { workspaceId, clientName: 'Synthetic client', publicationIds: [crypto.randomUUID()], allowDrafts: true, allowSources: false };
    const operationId = crypto.randomUUID();
    const first = await tokens.issue(grant, 0, operationId);
    expect(first.token).toBeTruthy();
    expect(await readFile(join(root, 'mcp-tokens.json'), 'utf8')).not.toContain(first.token!);
    expect(JSON.stringify(await tokens.list(workspaceId))).not.toContain('tokenHash');
    const retry = await tokens.issue(grant, 0, operationId);
    expect(retry.token).toBeNull();
    expect(retry.client.id).toBe(first.client.id);
    await expect(tokens.issue({ ...grant, allowSources: true }, 0, operationId)).rejects.toMatchObject({ code: 'CONFLICT' });
    const rotated = await tokens.rotate(first.client.id, workspaceId, first.version, crypto.randomUUID());
    await expect(tokens.authenticate(first.token!)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await tokens.authenticate(rotated.token!)).publicationIds).toEqual(grant.publicationIds);
    expect((await tokens.authenticate(rotated.token!)).allowSources).toBe(false);
    const revokeOperation = crypto.randomUUID();
    const revoked = await tokens.revoke(rotated.client.id, workspaceId, rotated.version, revokeOperation);
    expect(await tokens.revoke(rotated.client.id, workspaceId, rotated.version, revokeOperation)).toEqual(revoked);
    await expect(tokens.authenticate(rotated.token!)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
