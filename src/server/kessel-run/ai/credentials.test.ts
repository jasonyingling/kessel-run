import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Credentials } from './credentials';
import { modelSelection, turnSchema } from './provider';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, {
    recursive: true,
    force: true,
  })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'kr-credentials-'));
  roots.push(root);
  return {
    root,
    credentials: new Credentials(root, () => 'synthetic-environment-key'),
  };
}

describe('server-only credentials', () => {
  it('requires the explicitly selected source without fallback', async () => {
    const { credentials } = await fixture();
    await expect(credentials.resolve('saved')).rejects.toThrow('unavailable');
    expect(await credentials.resolve('environment')).toBe('synthetic-environment-key');
  });

  it('stores owner-only and returns only reference/masked status; removal works', async () => {
    const { root, credentials } = await fixture();
    const key = 'synthetic-saved-secret-1234';
    await credentials.replace(key);

    expect(JSON.stringify(await credentials.status())).not.toContain(key);
    const info = await stat(join(root, 'credential.json'));
    expect(info.mode & 0o777).toBe(0o600);
    const persisted = await readFile(join(root, 'credential.json'), 'utf8');
    expect(persisted).toContain(key);

    await credentials.remove();
    await expect(credentials.resolve('saved')).rejects.toThrow('unavailable');
  });

  it('rejects malformed and removed credentials', async () => {
    const { credentials } = await fixture();
    await expect(credentials.replace('bad')).rejects.toThrow();
    await credentials.replace('synthetic-replacement-key');
    await credentials.remove();
    expect((await credentials.status()).saved).toBeNull();
  });

  it('allows only validated model and turn fields', () => {
    expect(modelSelection.safeParse('gpt-6.1-sol').success).toBe(true);
    expect(modelSelection.safeParse('unknown').success).toBe(false);
    const request = {
      message: 'hello',
      scope: crypto.randomUUID(),
      operationId: crypto.randomUUID(),
      model: 'gpt-6.1-sol',
      mode: 'guided',
      apiKey: 'forged',
    };
    expect(turnSchema.safeParse(request).success).toBe(false);
  });
});
