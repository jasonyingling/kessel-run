import { expect, it, vi } from 'vitest';
import { legacyDenied } from './legacy';
import { requireWorkspaceReference } from './local-session';

it('denies default legacy model routes before any storage/model bootstrap', async () => {
  vi.stubEnv('KESSEL_RUN_ENABLE_LEGACY', '');
  try {
    const denied = await legacyDenied(new Request('http://127.0.0.1:3000/api/chat'), true);
    expect(denied?.status).toBe(403);
    expect((await denied?.json()).error).toContain('disabled');
  } finally { vi.unstubAllEnvs(); }
});
it('does not accept legacy opt-in without the authenticated local session', async () => {
  vi.stubEnv('KESSEL_RUN_ENABLE_LEGACY', '1');
  try {
    const denied = await legacyDenied(new Request('http://127.0.0.1:3000/api/chat', { headers: { host: '127.0.0.1:3000' } }));
    expect(denied?.status).toBe(401);
  } finally { vi.unstubAllEnvs(); }
});
it('rejects stale browser workspace references even when entity IDs are identical after restoration', () => {
  const oldWorkspace = crypto.randomUUID();
  const newWorkspace = crypto.randomUUID();
  const request = new Request('http://127.0.0.1:3000/api/kessel-run/local/content', { headers: { 'x-kr-workspace-ref': oldWorkspace } });
  expect(() => requireWorkspaceReference(request, oldWorkspace)).not.toThrow();
  expect(() => requireWorkspaceReference(request, newWorkspace)).toThrow();
  expect(() => requireWorkspaceReference(new Request(request.url), oldWorkspace)).toThrow();
});
