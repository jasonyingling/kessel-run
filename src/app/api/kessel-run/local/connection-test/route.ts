import { providerSelection } from '@/server/kessel-run/ai/provider';
import { connectionTest } from '@/server/kessel-run/ai/connection-test';
import { requireLocalSession, LocalAccessError, boundedJSON } from '@/server/kessel-run/local-session';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    const selection = providerSelection.parse(await boundedJSON(request, 1024));
    return await connectionTest(selection, request.signal, session.workspaceId);
  }
  catch (error) { return Response.json({ error: 'Connection test unavailable. Check the selected credential and model.' }, { status: error instanceof LocalAccessError ? error.status : 400 }); }
}
