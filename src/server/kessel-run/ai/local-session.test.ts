import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, mkdir, stat, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exchangePairing, ownerWrite, requireLocalSession, requireLocalRequest, securePrivateRoot, SESSION_COOKIE } from '../local-session';
let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'kr-session-')); vi.stubEnv('KESSEL_RUN_PRIVATE_ROOT', root); vi.stubEnv('KESSEL_RUN_ORIGIN', 'http://127.0.0.1:3000'); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });
function request(headers: Record<string, string> = {}, method = 'POST') { return new Request('http://127.0.0.1:3000/api/kessel-run/local', { method, headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', ...headers } }); }
async function pairing(expires = Date.now() + 60000) { const token = 'a'.repeat(64); await ownerWrite('pairing.json', { tokenHash: createHash('sha256').update(token).digest('hex'), expires, workspaceId: crypto.randomUUID() }); return token; }
it('enforces exact Host/Origin and CSRF with authenticated scope', async () => {
  expect(() => requireLocalRequest(request({ host: 'attacker.example' }))).toThrow();
  expect(() => requireLocalRequest(request({ origin: 'http://attacker.example' }), true)).toThrow();
  expect(() => requireLocalRequest(request({ 'sec-fetch-site': 'cross-site' }))).toThrow();
  await expect(requireLocalSession(request())).rejects.toThrow();
  const token = await exchangePairing(request(), await pairing());
  const headers = { cookie: `${SESSION_COOKIE}=${token}` };
  await expect(requireLocalSession(request(headers), true)).rejects.toThrow();
  expect((await requireLocalSession(request({ ...headers, 'x-kr-csrf': 'local' }), true)).workspaceId).toBeTruthy();
});
it('pairs only once across simultaneous requests and rejects expiry', async () => {
  const token = await pairing();
  const attempts = await Promise.allSettled([exchangePairing(request(), token), exchangePairing(request(), token)]);
  expect(attempts.filter(v => v.status === 'fulfilled')).toHaveLength(1);
  await expect(exchangePairing(request(), token)).rejects.toThrow();
  await expect(exchangePairing(request(), await pairing(Date.now() - 1))).rejects.toThrow();
});
it('keeps private state outside content and rejects linked paths; tightens existing directory permissions', async () => {
  vi.stubEnv('KESSEL_RUN_WORKSPACE_ROOT', join(root, 'content'));
  await mkdir(join(root, 'content'));
  expect(() => securePrivateRoot(join(root, 'content', 'private'))).toThrow();
  await symlink(join(root, 'content'), join(root, 'linked'));
  expect(() => securePrivateRoot(join(root, 'linked', 'private'))).toThrow();
  securePrivateRoot(root);
  expect((await stat(root)).mode & 0o777).toBe(0o700);
});
