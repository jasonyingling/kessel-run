import { LocalAccessError, requireLocalSession } from './local-session';
export async function legacyDenied(request: Request, mutation = false) {
  if (process.env.KESSEL_RUN_ENABLE_LEGACY !== '1') return Response.json({ error: 'Legacy demo access is disabled. Use the local writing workspace.' }, { status: 403 });
  try { await requireLocalSession(request, mutation); return null; }
  catch (error) { return Response.json({ error: 'Local session required for legacy access' }, { status: error instanceof LocalAccessError ? error.status : 403 }); }
}
