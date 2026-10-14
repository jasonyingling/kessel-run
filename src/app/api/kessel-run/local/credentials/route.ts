import { z } from 'zod';
import { Credentials } from '@/server/kessel-run/ai/credentials';
import { LocalAccessError, requireLocalSession } from '@/server/kessel-run/local-session';
export const runtime = 'nodejs';
const failure = (error: unknown) => Response.json({ error: 'Credential operation failed' }, { status: error instanceof LocalAccessError ? error.status : 400 });
export async function GET(request: Request) {
  try { await requireLocalSession(request); return Response.json(await new Credentials().status(), { headers: { 'cache-control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try { await requireLocalSession(request, true); const { key } = z.object({ key: z.string().min(20).max(512) }).strict().parse(await request.json()); return Response.json(await new Credentials().replace(key)); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try { await requireLocalSession(request, true); await new Credentials().remove(); return Response.json({ removed: true }); }
  catch (error) { return failure(error); }
}
