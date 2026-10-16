import { beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/server/kessel-run/local-session', async original => ({ ...await original<typeof import('@/server/kessel-run/local-session')>(), requireLocalSession: async () => ({ workspaceId: 'fixture' }), requireWorkspaceReference: () => {} }));
vi.mock('@/server/kessel-run/workspace/config', () => ({ configuredWorkspace: async () => ({ configuration: { id: 'fixture' }, service: { createPublication: mocks.create } }) }));
import { POST } from './route';
beforeEach(() => mocks.create.mockReset());
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
