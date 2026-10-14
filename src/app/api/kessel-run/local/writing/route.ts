import { z } from 'zod';
import { boundedJSON, LocalAccessError, requireLocalSession, requireWorkspaceReference } from '@/server/kessel-run/local-session';
import { configuredWorkspace } from '@/server/kessel-run/workspace/config';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
import { Conversations } from '@/server/kessel-run/ai/conversations';
import { startWritingTurn, writingTurn } from '@/server/kessel-run/ai/turn';
export const runtime = 'nodejs';
function failure(error: unknown) {
  return Response.json({ code: error instanceof WorkspaceError ? error.code : 'CAPABILITY_UNAVAILABLE', error: error instanceof WorkspaceError ? error.message : 'Writing unavailable. Check the selected credential and local session. No fallback was attempted.' }, { status: error instanceof LocalAccessError ? error.status : error instanceof WorkspaceError && error.code === 'CONFLICT' ? 409 : 400 });
}
export async function GET(request: Request) {
  try {
    const session = await requireLocalSession(request);
    requireWorkspaceReference(request, session.workspaceId);
    const scope = z.string().uuid().parse(new URL(request.url).searchParams.get('scope'));
    const runs = await new Conversations().list(session.workspaceId, scope);
    return Response.json(runs, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    requireWorkspaceReference(request, session.workspaceId);
    const configured = await configuredWorkspace();
    if (configured.configuration.id !== session.workspaceId) throw new LocalAccessError();
    const input = writingTurn.parse(await boundedJSON(request, 24000));
    if (process.env.KESSEL_RUN_TEST_PROVIDER === 'fake') {
      const { fixtureModel, requireFixtureServer } = await import('@/server/kessel-run/ai/fake-provider');
      await requireFixtureServer(configured.service);
      return await startWritingTurn(input, session.workspaceId, configured.service, request.signal, { model: await fixtureModel(configured.service, input.scope, input.scopeKind) });
    }
    return await startWritingTurn(input, session.workspaceId, configured.service, request.signal);
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    requireWorkspaceReference(request, session.workspaceId);
    const { runId } = z.object({ runId: z.string().uuid() }).strict().parse(await boundedJSON(request, 1024));
    await new Conversations().stop(runId, session.workspaceId);
    return Response.json({ stopRequested: true });
  } catch (error) { return failure(error); }
}
