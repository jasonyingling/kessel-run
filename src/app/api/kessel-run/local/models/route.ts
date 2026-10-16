import { LocalAccessError, requireLocalSession } from '@/server/kessel-run/local-session';
import { credentialSelection } from '@/server/kessel-run/ai/credentials';
import { discoverModels } from '@/server/kessel-run/ai/models';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireLocalSession(request);
    const raw = new URL(request.url).searchParams.get('source');
    const source = raw === null ? undefined : credentialSelection.parse(raw);
    return Response.json({ provider: 'openai', ...await discoverModels(source, request.signal) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return Response.json({ error: 'Model access unavailable. Check the selected key source and local session.' }, { status: error instanceof LocalAccessError ? error.status : 400, headers: { 'cache-control': 'no-store' } }); }
}
