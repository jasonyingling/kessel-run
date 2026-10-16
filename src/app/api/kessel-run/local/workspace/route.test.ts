import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ownerWrite } from '@/server/kessel-run/local-session';
import { GET, POST } from './route';
let root: string;
const token = 'a'.repeat(64);
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'kr-route-')); vi.stubEnv('KESSEL_RUN_PRIVATE_ROOT', root); vi.stubEnv('KESSEL_RUN_ORIGIN', 'http://127.0.0.1:3000'); await ownerWrite('session.json', { tokenHash: createHash('sha256').update(token).digest('hex'), expires: Date.now() + 60000, workspaceId: crypto.randomUUID() }); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });
const request = (paired = true) => new Request('http://127.0.0.1:3000/api/kessel-run/local/workspace', { headers: { host: '127.0.0.1:3000', ...(paired ? { cookie: `kr-local-session=${token}` } : {}) } });
it('distinguishes unpaired, genuinely missing configuration and corrupt configuration', async () => {
  expect((await GET(request(false))).status).toBe(401);
  const missing = await GET(request()); expect((await missing.json()).code).toBe('UNINITIALIZED');
  await writeFile(join(root, 'workspace.json'), '{not-json');
  const corrupt = await GET(request());
  const body = await corrupt.json(); expect(body.code).toBe('RECOVERY_REQUIRED'); expect(JSON.stringify(body)).not.toContain(root);
  expect(corrupt.headers.get('cache-control')).toBe('no-store');
});
it('classifies invalid advanced selection before creating a durable intent', async () => {
  const invalid = new Request('http://127.0.0.1:3000/api/kessel-run/local/workspace', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', cookie: `kr-local-session=${token}`, 'x-kr-csrf': 'local' }, body: JSON.stringify({ operationId: crypto.randomUUID(), root: '', title: '' }) });
  const response = await POST(invalid); expect(response.status).toBe(400); expect((await response.json()).code).toBe('INVALID_INPUT');
});
