export type RevisionKey = { workspaceId: string; outputId: string; revisionId: string; hash?: string };
export type RevisionState = { status: 'loading' | 'loaded' | 'error'; prose?: string; error?: string };
export class RevisionCache {
  private values = new Map<string, RevisionState>();
  private requests = new Map<string, Promise<RevisionState>>();
  key(value: RevisionKey) { return JSON.stringify([value.workspaceId, value.outputId, value.revisionId, value.hash ?? '']); }
  peek(value: RevisionKey) { return this.values.get(this.key(value)); }
  read(value: RevisionKey, fetcher: () => Promise<{ prose: string }>, retry = false): Promise<RevisionState> {
    const key = this.key(value), pending = this.requests.get(key), cached = this.values.get(key);
    if (pending) return pending;
    if (cached && !retry) return Promise.resolve(cached);
    this.values.set(key, { status: 'loading' });
    const request = fetcher().then(result => ({ status: 'loaded' as const, prose: result.prose }), error => ({ status: 'error' as const, error: error instanceof Error ? error.message : 'Revision could not be loaded.' })).then(result => { this.values.set(key, result); this.requests.delete(key); return result; });
    this.requests.set(key, request); return request;
  }
}
export const revisionCache = new RevisionCache();
