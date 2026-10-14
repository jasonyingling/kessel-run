import { z } from 'zod';
import { exchangePairing, LocalAccessError, SESSION_COOKIE, boundedJSON, requireLocalRequest } from '@/server/kessel-run/local-session';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireLocalRequest(request, true);
    const { token } = z.object({ token: z.string().length(64) }).strict().parse(await boundedJSON(request, 1024));
    const session = await exchangePairing(request, token);
    return Response.json({ paired: true }, { headers: { 'set-cookie': `${SESSION_COOKIE}=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`, 'cache-control': 'no-store' } });
  } catch (error) { return Response.json({ error: 'Pairing failed' }, { status: error instanceof LocalAccessError ? error.status : 400 }); }
}
