import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), discover: vi.fn() }));
vi.mock('@/server/kessel-run/local-session', async original => ({ ...await original<typeof import('@/server/kessel-run/local-session')>(), requireLocalSession: mocks.session }));
vi.mock('@/server/kessel-run/ai/models', () => ({ discoverModels: mocks.discover }));
import { GET } from './route';
import { LocalAccessError } from '@/server/kessel-run/local-session';
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({}); mocks.discover.mockResolvedValue({ models: [], checked: true, message: 'Synthetic' }); });
it('checks authentication and source before contacting OpenAI', async () => {
  mocks.session.mockRejectedValue(new LocalAccessError());
  expect((await GET(new Request('http://localhost/models?source=environment'))).ok).toBe(false);
  expect(mocks.discover).not.toHaveBeenCalled();
  mocks.session.mockResolvedValue({});
  expect((await GET(new Request('http://localhost/models?source=invalid'))).status).toBe(400);
  expect(mocks.discover).not.toHaveBeenCalled();
});
it('passes explicit credential source and cancellation with no-store responses', async () => {
  const request = new Request('http://localhost/models?source=saved');
  const response = await GET(request);
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.discover).toHaveBeenCalledWith('saved', request.signal);
});
