import { z } from 'zod';
import { AccessTokens, grantInput } from '@/server/kessel-run/mcp/access-tokens';
import { configuredWorkspace } from '@/server/kessel-run/workspace/config';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
import { requireLocalSession, LocalAccessError, boundedJSON } from '@/server/kessel-run/local-session';
export const runtime = 'nodejs';
function failure(error: unknown) {
  return Response.json({ code: error instanceof WorkspaceError ? error.code : 'INVALID_INPUT', error: error instanceof WorkspaceError ? error.message : 'Connection operation failed' }, { status: error instanceof LocalAccessError ? error.status : error instanceof WorkspaceError && error.code === 'CONFLICT' ? 409 : 400 });
}
export async function GET(request: Request) {
  try {
    const session = await requireLocalSession(request);
    return Response.json(await new AccessTokens().list(session.workspaceId), { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    const input = grantInput.omit({ workspaceId: true }).extend({ expectedVersion: z.number().int().nonnegative(), operationId: z.string().uuid() }).strict().parse(await boundedJSON(request, 10000));
    const configured = await configuredWorkspace();
    const state = await configured.service.overview();
    if (state.workspace.id !== session.workspaceId) throw new LocalAccessError();
    if (input.publicationIds?.some(id => !state.publications.some(publication => publication.id === id))) throw new WorkspaceError('NOT_FOUND', 'Select publications in this workspace');
    const { expectedVersion, operationId, ...grant } = input;
    return Response.json(await new AccessTokens().issue({ ...grant, workspaceId: session.workspaceId }, expectedVersion, operationId), { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    const input = z.object({ id: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), operationId: z.string().uuid() }).strict().parse(await boundedJSON(request, 2048));
    return Response.json(await new AccessTokens().revoke(input.id, session.workspaceId, input.expectedVersion, input.operationId));
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    const input = z.object({ id: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), operationId: z.string().uuid() }).strict().parse(await boundedJSON(request, 2048));
    return Response.json(await new AccessTokens().rotate(input.id, session.workspaceId, input.expectedVersion, input.operationId), { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return failure(error); }
}
