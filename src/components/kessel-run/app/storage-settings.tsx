'use client';
import { useEffect, useRef, useState } from 'react';
import { localApi } from '@/lib/kessel-run/local-api';
import type { WorkspaceAvailability } from '@/lib/kessel-run/app-contracts';
import { pairFromLauncher } from './pairing';
import { operationState } from './operation-state';

export function StorageSettings() {
  const [availability, setAvailability] = useState<WorkspaceAvailability | null>(null);
  const [root, setRoot] = useState('');
  const [title, setTitle] = useState('My writing');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => { let active = true; void pairFromLauncher().then(() => localApi<WorkspaceAvailability>('bootstrap')).then(value => { if (active) setAvailability(value); }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  async function select(event: React.FormEvent) {
    event.preventDefault();
    if (!availability || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    let store: ReturnType<typeof operationState> | null = null;
    try {
      store = operationState(sessionStorage, `${availability.scope}:storage`);
      const command = store.begin({ path: 'workspace', body: { operationId: crypto.randomUUID(), root, title } });
      setPending(true);
      await localApi(command.path, command.body);
      store.clear(); window.location.assign('/kessel-run');
    } catch (error) {
      try {
        store?.failed(error);
        if (store?.read()?.failed) { store.abandon(); setPending(false); }
      } catch { /* Preserve unknown commands when recovery storage is inaccessible. */ }
      setMessage(error instanceof Error ? error.message : 'Resume selection to recover the saved result.');
    } finally { setBusy(false); inFlight.current = false; }
  }
  return <section><h2 className="text-2xl font-semibold">Workspace</h2><p>Your publications are saved as Markdown on this computer. Existing notes are imported explicitly.</p><details><summary>Advanced: choose a new workspace folder</summary><p>This selects a new empty workspace. Your previous workspace files remain where they are. Open tabs will stop editing until reloaded.</p>{availability?.status === 'ready' ? <form onSubmit={event => void select(event)} className="kr-form"><fieldset disabled={busy || pending}><label className="kr-field"><span>Workspace name</span><input required value={title} onChange={event => setTitle(event.target.value)} /></label><label className="kr-field"><span>Empty folder path</span><input required value={root} onChange={event => setRoot(event.target.value)} /></label></fieldset><button className="kr-action" disabled={busy}>{busy ? 'Selecting…' : pending ? 'Resume selection' : 'Choose folder'}</button></form> : <p>Return to writing to create your first publication, resume unfinished creation, or recover the existing workspace.</p>}</details><p role="status">{message}</p></section>;
}
