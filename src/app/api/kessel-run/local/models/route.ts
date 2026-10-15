import { LocalAccessError, requireLocalSession } from '@/server/kessel-run/local-session';
import { supportedModels } from '@/server/kessel-run/ai/provider';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireLocalSession(request);
    return Response.json({ provider: 'openai', models: supportedModels.map(id => ({ id, liveVerified: false, supports: ['text', 'tools', 'streaming'] })) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return Response.json({ error: 'Local access denied' }, { status: error instanceof LocalAccessError ? error.status : 400 }); }
}
