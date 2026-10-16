import { LocalApiError } from '@/lib/kessel-run/local-api';
export type PendingOperation = { path: string; body: Record<string, unknown>; failed?: boolean };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function operationState(storage: Storage, scope: string) {
  const key = `kr-operation:${scope}`;
  return {
    read(): PendingOperation | null {
      const value = storage.getItem(key);
      if (!value) return null;
      let parsed;
      try { parsed = JSON.parse(value); }
      catch { throw new Error('Pending save needs recovery. Keep this tab open and restore browser storage.'); }
      if (!['content', 'bootstrap', 'workspace'].includes(parsed.path) || !parsed.body || typeof parsed.body !== 'object') throw new Error('Pending save needs recovery. Keep this tab open.');
      return parsed;
    },
    begin(value: PendingOperation) {
      const prior = this.read();
      if (prior) return prior;
      // Failure to retain a command stops the request before any remote write.
      storage.setItem(key, JSON.stringify(value));
      return this.read()!;
    },
    failed(error: unknown) {
      const pending = this.read();
      if (pending && error instanceof LocalApiError && error.outcome === 'rejected') storage.setItem(key, JSON.stringify({ ...pending, failed: true }));
    },
    clear() { storage.removeItem(key); },
    abandon() {
      if (!this.read()?.failed) throw new Error('Resolve this save before changing it.');
      this.clear();
    },
  };
}
