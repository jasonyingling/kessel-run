'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LocalApiError, localApi, setWorkspaceReference } from '@/lib/kessel-run/local-api';
import type { WorkspaceAvailability } from '@/lib/kessel-run/app-contracts';
import { operationState } from './operation-state';

export function PublicationEntry({ availability, onReady }: { availability: WorkspaceAvailability; onReady: () => Promise<void> }) {
  const router = useRouter();
  const serverPending = availability.pending;
  const [recovery] = useState(() => {
    try { const store = operationState(sessionStorage, `${availability.scope}:entry`); return { store, retained: store.read(), error: '' }; }
    catch { return { store: null, retained: null, error: 'Browser recovery storage is unavailable or damaged. Keep this tab open and restore access, then reload to resume safely.' }; }
  });
  const { store, retained } = recovery;
  const starting = serverPending ?? retained?.body as { title?: string; purpose?: string; root?: string } | undefined;
  const [title, setTitle] = useState(starting?.title ?? '');
  const [purpose, setPurpose] = useState(starting?.purpose ?? '');
  const [root, setRoot] = useState(starting?.root ?? '');
  const [pending, setPending] = useState(Boolean(serverPending || retained));
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState<string | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !store) return;
    inFlight.current = true; setBusy(true);
    try {
      const body = serverPending ? { operationId: serverPending.operationId, title: serverPending.title, ...(serverPending.kind === 'publication' ? { purpose: serverPending.purpose } : {}), root: serverPending.root } : { operationId: crypto.randomUUID(), title, purpose, root };
      const command = store.begin({ path: serverPending?.kind === 'workspace' ? 'workspace' : 'bootstrap', body });
      setPending(true);
      const result = await localApi<{ id: string; link: string }>(command.path, command.body);
      store.clear(); setWorkspaceReference(result.id); setCompleted(result.link);
      setMessage('Publication created. Opening your publication…');
      router.push(result.link);
      await onReady().catch(() => setMessage('Your publication was created. Open it to continue.'));
    } catch (error) {
      try {
        store.failed(error);
        if (error instanceof LocalApiError && error.outcome === 'rejected' && !serverPending) { store.abandon(); setPending(false); }
      } catch { /* Keep the exact pending submission when storage becomes unavailable. */ }
      setMessage(error instanceof Error ? error.message : 'The outcome is unknown. Resume creation to recover the same publication.');
      requestAnimationFrame(() => status.current?.focus());
    } finally { setBusy(false); inFlight.current = false; }
  }
  if (completed) return <section className="kr-panel"><h2>Publication created</h2><Link href={completed}>Open your publication</Link><p role="status">{message}</p></section>;
  if (recovery.error) return <section className="kr-panel"><h2>Creation recovery needs attention</h2><p role="alert">{recovery.error}</p><button className="kr-action" onClick={() => window.location.reload()}>Retry recovery</button></section>;
  if (availability.status === 'recovery' || availability.status === 'selection-changed') return <section className="kr-panel"><h2>{availability.status === 'recovery' ? 'Your workspace needs attention' : 'Workspace selection changed'}</h2><p>Your saved files have been preserved. {availability.status === 'recovery' ? 'Restore the existing configuration or content, then try again. Creating another workspace will not repair it.' : 'Reload this tab to enter the selected workspace.'}</p><button className="kr-action" onClick={() => window.location.reload()}>Try again</button><Link href="/kessel-run/settings">Storage and settings</Link></section>;
  return <section className="kr-panel"><h2>{pending ? 'Resume creation' : 'Create your first publication'}</h2><p>A publication is a home for your writing, its voice and its pieces.</p><form onSubmit={event => void create(event)}><fieldset className="kr-form" disabled={busy || pending}><label className="kr-field"><span>Publication name</span><input required autoComplete="organization" maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="kr-field"><span>What is it for? <span>(optional)</span></span><textarea rows={3} maxLength={80000} value={purpose} onChange={event => setPurpose(event.target.value)} /></label><details><summary>Storage location</summary><p>Your work is saved as Markdown on this computer, in Documents / Kessel Run / Workspaces. You can choose a different empty folder.</p><label className="kr-field"><span>Empty folder path (optional)</span><input value={root} onChange={event => setRoot(event.target.value)} /></label><p>Existing notes stay untouched. Import them explicitly after creation.</p></details></fieldset><p>Your work is saved as Markdown on this computer.</p><button className="kr-action" type="submit" disabled={busy || (!pending && !title.trim())}>{busy ? 'Creating…' : pending ? 'Resume creation' : 'Create publication'}</button><p ref={status} tabIndex={-1} role="status" aria-live="polite">{message}</p></form></section>;
}
