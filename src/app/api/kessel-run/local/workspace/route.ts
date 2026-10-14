import { requireLocalSession, LocalAccessError } from '@/server/kessel-run/local-session';
import { configuredWorkspace, createWorkspace } from '@/server/kessel-run/workspace/config';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const session = await requireLocalSession(request);
    const workspace = await configuredWorkspace();
    if (workspace.configuration.id !== session.workspaceId) throw new LocalAccessError(401);
    return Response.json(await workspace.service.overview(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: 'Workspace unavailable or not selected' }, { status: error instanceof LocalAccessError ? error.status : 404 });
  }
}
export async function POST(request: Request) {
  try {
    await requireLocalSession(request, true);
    return Response.json(await createWorkspace(await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof LocalAccessError ? 'Local access denied' : 'Choose a new empty folder outside the private credential store. Existing notes are preserved.' }, { status: error instanceof LocalAccessError ? error.status : 400 });
  }
}
