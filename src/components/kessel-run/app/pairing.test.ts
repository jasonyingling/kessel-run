import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('strips the fragment immediately, shares a single exchange and handles later hash-only launcher links', async () => {
  let listener: (() => void) | undefined;
  const location = { hash: '#pair=' + 'a'.repeat(64), pathname: '/kessel-run', search: '', reload: vi.fn() };
  const replaceState = vi.fn(() => { location.hash = ''; });
  vi.stubGlobal('window', { location, history: { replaceState }, addEventListener: (_: string, callback: () => void) => { listener = callback; } });
  const fetch = vi.fn(async () => Response.json({ paired: true })); vi.stubGlobal('fetch', fetch);
  const { pairFromLauncher } = await import('./pairing');
  const first = pairFromLauncher();
  expect(location.hash).toBe('');
  await Promise.all([first, pairFromLauncher()]); expect(fetch).toHaveBeenCalledTimes(1);
  location.hash = '#pair=' + 'b'.repeat(64); listener!(); expect(location.reload).toHaveBeenCalledOnce();
});
