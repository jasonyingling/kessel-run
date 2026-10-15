import { boundedJSON, LocalAccessError, requireLocalSession, requireWorkspaceReference } from '@/server/kessel-run/local-session';
import { configuredWorkspace } from '@/server/kessel-run/workspace/config';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
import { cleanupInput, cleanupText, validateCleanupTarget } from '@/server/kessel-run/ai/cleanup';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    requireWorkspaceReference(request, session.workspaceId);
    const configured = await configuredWorkspace();
    if (configured.configuration.id !== session.workspaceId) throw new LocalAccessError();
    const input = cleanupInput.parse(await boundedJSON(request, 125000));
    await validateCleanupTarget(input, session.workspaceId, configured.service);
    let model;
    if (process.env.KESSEL_RUN_TEST_PROVIDER === 'fake') {
      const { cleanupFixtureModel } = await import('@/server/kessel-run/ai/fake-provider');
      model = await cleanupFixtureModel(configured.service);
    }
    return Response.json(await cleanupText(input, request.signal, { model }), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ code: error instanceof WorkspaceError ? error.code : 'CAPABILITY_UNAVAILABLE', error: error instanceof WorkspaceError ? error.message : 'Cleanup unavailable. Your original text is safe.' }, { status: error instanceof LocalAccessError ? error.status : error instanceof WorkspaceError && error.code === 'CONFLICT' ? 409 : 400, headers: { 'cache-control': 'no-store' } });
  }
}
