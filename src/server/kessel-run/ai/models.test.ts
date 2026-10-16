import { expect, it, vi } from 'vitest';
import { discoverModels } from './models';
import { Credentials } from './credentials';

function fixture() {
  const credentials = new Credentials('/unused');
  const resolve = vi.spyOn(credentials, 'resolve').mockResolvedValue('synthetic-private-key');
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [{ id: 'gpt-6.1-sol' }, { id: 'unrelated-model' }] }));
  return { credentials, resolve, fetcher };
}
it('intersects the account catalog with the two requested choices using only the selected credential', async () => {
  const f = fixture(); const result = await discoverModels('environment', undefined, { credentials: f.credentials, fetch: f.fetcher });
  expect(f.resolve).toHaveBeenCalledExactlyOnceWith('environment');
  expect(f.fetcher).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({ headers: { Authorization: 'Bearer synthetic-private-key' }, redirect: 'error' }));
  expect(result.models).toEqual([{ id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', available: true }, { id: 'gpt-6-luna', label: 'GPT-6 Luna', available: false }]);
  expect(result.checked).toBe(true); expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
});
it('keeps manual no-key access local and never falls back to another source', async () => {
  const f = fixture(); await discoverModels(undefined, undefined, { credentials: f.credentials, fetch: f.fetcher });
  expect(f.resolve).not.toHaveBeenCalled(); f.resolve.mockRejectedValue(Error('private credential detail'));
  const result = await discoverModels('saved', undefined, { credentials: f.credentials, fetch: f.fetcher });
  expect(result.checked).toBe(false); expect(f.fetcher).not.toHaveBeenCalled(); expect(f.resolve).toHaveBeenCalledExactlyOnceWith('saved');
});
it.each([401, 403, 429, 500])('reports safe unavailable state on HTTP %s without disclosing provider details', async status => {
  const f = fixture(); f.fetcher.mockResolvedValue(Response.json({ error: 'private provider detail' }, { status }));
  const result = await discoverModels('saved', undefined, { credentials: f.credentials, fetch: f.fetcher });
  expect(result.models.every(model => model.available === false)).toBe(true); expect(JSON.stringify(result)).not.toContain('private provider detail'); expect(f.fetcher).toHaveBeenCalledTimes(1);
});
it('rejects malformed catalogs and safe-handles aborted/network requests', async () => {
  const f = fixture(); f.fetcher.mockResolvedValue(Response.json({ data: 'invalid' }));
  expect((await discoverModels('saved', undefined, { credentials: f.credentials, fetch: f.fetcher })).checked).toBe(false);
  f.fetcher.mockRejectedValue(Error('private request details')); const signal = new AbortController(); signal.abort();
  const result = await discoverModels('saved', signal.signal, { credentials: f.credentials, fetch: f.fetcher });
  expect(result.checked).toBe(false); expect(JSON.stringify(result)).not.toContain('private request details');
});
