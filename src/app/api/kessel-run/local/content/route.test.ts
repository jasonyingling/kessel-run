import { beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
const mocks = vi.hoisted(() => ({ create: vi.fn(), preset: vi.fn(), profile: vi.fn(), authorized: true }));
vi.mock('@/server/kessel-run/local-session', async original => ({ ...await original<typeof import('@/server/kessel-run/local-session')>(), requireLocalSession: async () => { const actual = await original<typeof import('@/server/kessel-run/local-session')>(); if (!mocks.authorized) throw new actual.LocalAccessError(401); return { workspaceId: 'fixture' }; }, requireWorkspaceReference: () => {} }));
vi.mock('@/server/kessel-run/workspace/config', () => ({ configuredWorkspace: async () => ({ configuration: { id: 'fixture' }, service: { createPublication: mocks.create, createPreset: mocks.preset, exportProfile: mocks.profile } }) }));
import { POST } from './route';
beforeEach(() => { mocks.create.mockReset(); mocks.preset.mockReset(); mocks.profile.mockReset(); mocks.authorized = true; });
const request = () => new Request('http://127.0.0.1:3000/api/kessel-run/local/content', { method: 'POST', body: JSON.stringify({ action: 'publication', input: { operationId: crypto.randomUUID() } }) });
it('never labels I/O failure or an unmarked retained-data schema error as rejected', async () => {
  for (const error of [new Error('EIO after retained write'), new z.ZodError([]), new WorkspaceError('CONFLICT', 'Partial-write recovery conflict')]) {
    mocks.create.mockRejectedValueOnce(error);
    expect((await (await POST(request())).json()).outcome).toBe('unknown');
  }
});
it('propagates explicit zero-write / command-boundary rejection evidence', async () => {
  mocks.create.mockRejectedValueOnce(new WorkspaceError('INVALID_INPUT', 'Required title', 'rejected'));
  expect((await (await POST(request())).json()).outcome).toBe('rejected');
});

it('protects new preset creation and exact-profile export behind the same local session boundary', async () => {
  for (const [action, handler] of [['preset-create', mocks.preset], ['profile-export', mocks.profile]] as const) {
    const input = { publicationId: crypto.randomUUID() };
    const make = () => new Request('http://127.0.0.1:3000/api/kessel-run/local/content', { method: 'POST', body: JSON.stringify({ action, input }) });
    mocks.authorized = false;
    expect((await POST(make())).status).toBe(401); expect(handler).not.toHaveBeenCalled();
    mocks.authorized = true; handler.mockResolvedValueOnce({ exact: 'supplied text' });
    const response = await POST(make()); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store'); expect(handler).toHaveBeenCalledWith(input);
  }
});
