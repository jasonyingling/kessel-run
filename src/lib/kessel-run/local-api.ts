let workspaceReference: string | null = null;
export function setWorkspaceReference(id: string) { workspaceReference = id; }
export function getWorkspaceReference() { return workspaceReference; }
export class LocalApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly outcome: 'rejected' | 'unknown' = 'unknown') { super(message); }
}
export async function localApi<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/kessel-run/local/${path}`, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: body === undefined ? undefined : { 'content-type': 'application/json', 'x-kr-csrf': 'local', ...(['content', 'cleanup'].includes(path) ? { 'x-kr-workspace-ref': workspaceReference ?? '' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new LocalApiError(response.status, result.code ?? String(response.status), result.error ?? 'Local operation failed', result.outcome === 'rejected' ? 'rejected' : 'unknown');
  return result;
}
