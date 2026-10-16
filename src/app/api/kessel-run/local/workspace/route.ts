import { requireLocalSession, boundedJSON } from '@/server/kessel-run/local-session';
import { configuredWorkspace, createWorkspace, SelectionError } from '@/server/kessel-run/workspace/config';
import { selectionResponse } from '@/server/kessel-run/workspace/availability';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const session = await requireLocalSession(request);
    const workspace = await configuredWorkspace();
    if (workspace.configuration.id !== session.workspaceId) throw new SelectionError('SELECTION_CHANGED');
    return Response.json(await workspace.service.overview(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return selectionResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    return Response.json(await createWorkspace(await boundedJSON(request, 8192), session), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return selectionResponse(error);
  }
}
