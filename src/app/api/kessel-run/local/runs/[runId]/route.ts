import { RunStore } from '@/server/kessel-run/ai/run-store';
import { requireLocalSession, LocalAccessError } from '@/server/kessel-run/local-session';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const session = await requireLocalSession(request);
    const { runId } = await context.params;
    const record = await new RunStore().get(runId);
    if (record.workspaceId !== session.workspaceId) throw new LocalAccessError(404);
    return Response.json(record, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: 'Run unavailable' }, {
      status: error instanceof LocalAccessError ? error.status : 404,
    });
  }
}
