import { boundedJSON, requireLocalSession } from '@/server/kessel-run/local-session';
import { bootstrapPublication } from '@/server/kessel-run/workspace/bootstrap';
import { workspaceAvailability, selectionResponse } from '@/server/kessel-run/workspace/availability';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try { return Response.json(await workspaceAvailability(await requireLocalSession(request)), { headers: { 'cache-control': 'no-store' } }); }
  catch (error) { return selectionResponse(error); }
}
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    return Response.json(await bootstrapPublication(await boundedJSON(request), session), { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return selectionResponse(error); }
}
