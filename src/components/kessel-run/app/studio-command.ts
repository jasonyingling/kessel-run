'use client';
import { useEffect, useRef, useState } from 'react';
import { localApi } from '@/lib/kessel-run/local-api';
import { operationState, type PendingOperation } from './operation-state';
import { ownsStudioCommand, studioLifetime } from './studio-ownership';

/** Each studio surface owns a distinct durable command slot, never the workspace form's slot. */
export function useStudioCommand(scope: string, onCommitted: () => Promise<void>) {
  const store = useRef<ReturnType<typeof operationState> | null>(null);
  const lifetime = useRef<ReturnType<typeof studioLifetime> | null>(null);
  const running = useRef(false);
  const [pending, setPending] = useState<PendingOperation | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const owner = studioLifetime(); lifetime.current = owner;
    try { store.current = operationState(sessionStorage, scope); setPending(store.current.read()); setReady(true); }
    catch { setMessage('Browser recovery storage is unavailable. Keep this tab open and restore storage access before saving.'); }
    return () => owner.dispose();
  }, [scope]);
  async function run(action?: string, input?: Record<string, unknown>, acknowledge?: () => void) {
    const ownedStore = store.current, owner = lifetime.current;
    if (running.current || !ownedStore || !owner?.active()) return false;
    running.current = true; setBusy(true);
    let committed = false, submitted: PendingOperation | null = null;
    const active = () => owner.active() && lifetime.current === owner && store.current === ownedStore;
    try {
      const saved = ownedStore.read();
      if (!saved && (!action || !input)) throw new Error('There is no pending submission to retry.');
      submitted = saved ?? ownedStore.begin({ path: 'content', body: { action, input: { ...input, operationId: crypto.randomUUID() } } });
      setPending(submitted);
      await localApi(submitted.path, submitted.body);
      // Navigation or a newer owner's retry may already have consumed this result.
      if (!ownsStudioCommand(active(), ownedStore.read(), submitted)) return false;
      ownedStore.clear(); setPending(null); committed = true;
      acknowledge?.();
      await onCommitted(); if (active()) setMessage('Saved. Earlier output selections stay unchanged.');
    } catch (error) {
      if (!active()) return false;
      if (!committed && submitted) { try { if (ownsStudioCommand(active(), ownedStore.read(), submitted)) ownedStore.failed(error); } catch { /* Keep unknown command retained. */ } }
      setMessage(error instanceof Error ? error.message : 'Save failed. Your exact submission remains recoverable.');
    } finally {
      if (active()) {
        try { setPending(ownedStore.read()); } catch { setMessage('Restore browser storage access before retrying this save.'); }
        setBusy(false); running.current = false;
      }
    }
    return committed;
  }
  function abandon() {
    try { store.current?.abandon(); setPending(null); setMessage('The rejected submission can now be edited.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Resolve this save before changing it.'); }
  }
  return { pending, busy, ready, message, setMessage, run, abandon };
}
