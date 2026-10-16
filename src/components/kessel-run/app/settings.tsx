'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useModelCatalog } from './use-model-catalog';
import { connectionFailure } from '@/lib/kessel-run/connection-result';
import { AgentConnections } from './connections';

type Status = { environment: boolean; saved: { reference: string; masked: string } | null; storage: string };
const headers = { 'content-type': 'application/json', 'x-kr-csrf': 'local' };
export function AppSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState('');
  const [source, setSource] = useState('environment');
  const catalog = useModelCatalog(source);
  const { model, setModel, refresh: refreshModels } = catalog;
  const [message, setMessage] = useState('Loading credential status…');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const stop = useRef<AbortController | null>(null);
  async function reload() {
    const response = await fetch('/api/kessel-run/local/credentials');
    if (!response.ok) throw new Error('Pair this browser using the link printed by app:dev or app:start.');
    setStatus(await response.json());
    setMessage('Ready. Status checks do not call the model.');
  }
  useEffect(() => {
    async function initialize() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('pair');
      window.history.replaceState(null, '', window.location.pathname);
      if (token) {
        const response = await fetch('/api/kessel-run/local/pair', { method: 'POST', headers, body: JSON.stringify({ token }) });
        if (!response.ok) throw new Error('Pairing expired or was already used. Restart the local launcher for a new link.');
      }
      await reload();
      refreshModels();

    }
    void initialize().catch(error => setMessage(error.message));
    return () => stop.current?.abort();
  }, [refreshModels]);
  async function save() {
    setBusy(true);
    const submitted = key; setKey('');
    try {
      const response = await fetch('/api/kessel-run/local/credentials', { method: 'PUT', headers, body: JSON.stringify({ key: submitted }) });
      if (!response.ok) throw new Error('Key was not saved. Enter it again and retry.');
      await reload(); setSource('saved'); refreshModels(); setMessage('Saved key. It stays in an unencrypted owner-only local file outside exported content.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { const response = await fetch('/api/kessel-run/local/credentials', { method: 'DELETE', headers }); if (!response.ok) throw new Error('Removal failed.'); await reload(); refreshModels(); setMessage('Saved key removed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Removal failed'); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setTesting(true); stop.current = new AbortController(); setMessage('Running a billed synthetic test…');
    try {
      const response = await fetch('/api/kessel-run/local/connection-test', { method: 'POST', headers, signal: stop.current.signal, body: JSON.stringify({ source, model }) });
      if (!response.ok) throw new Error('Test failed. Check the selected key. No fallback was attempted.');
      await response.text();
      // The persisted result distinguishes interruption, limits and missing tool saves.
      const runId = response.headers.get('x-kr-run-id');
      const saved = await fetch(`/api/kessel-run/local/runs/${runId}`);
      if (!saved.ok) throw new Error('Persisted test result could not be reloaded.');
      const run = await saved.json();
      const failure = connectionFailure(run);
      if (failure) throw new Error(failure);
      const usage = run.usage ? ` Provider reported ${run.usage.inputTokens ?? 'unknown'} input and ${run.usage.outputTokens ?? 'unknown'} output tokens.` : '';
      setMessage(`Connected. ${model} generated and saved the test sentence.${usage}`);
    } catch (error) { setMessage(error instanceof Error && error.name === 'AbortError' ? 'Stopped. Partial text is provisional.' : error instanceof Error ? error.message : 'Test failed'); }
    finally { setBusy(false); setTesting(false); stop.current = null; }
  }
  return <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
    <Link className="underline underline-offset-4" href="/kessel-run">Back to writing</Link>
    <h1 className="text-3xl font-semibold">AI connection</h1>
    <p>Connect an OpenAI API key to write with AI or clean up dictated text. You can use the workspace without one.</p>
    <div className="space-y-4 rounded-xl border p-5">
      <label className="block">Credential source<select value={source} onChange={event => setSource(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2"><option value="saved">Saved local key {status?.saved?.masked ?? '(not configured)'}</option><option value="environment">Server environment {status?.environment ? '(configured)' : '(not configured)'}</option></select></label>
      <p className="text-sm">The selected source is used explicitly. An invalid or exhausted key never triggers a fallback.</p>
      <label className="block">Replace saved key<input type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2" /></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy || key.length < 20} onClick={save} className="rounded-md border px-4 py-2 disabled:opacity-50">Save key</button><button disabled={busy || !status?.saved} onClick={remove} className="rounded-md border px-4 py-2 disabled:opacity-50">Remove saved key</button></div>
      <label className="block">Model<select disabled={busy} value={model} onChange={event => setModel(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2">{catalog.models.map(item => <option key={item.id} value={item.id} disabled={item.available === false}>{item.label}{item.available === false ? " · unavailable" : ""}</option>)}</select></label>
      <p className="text-sm" role="status">{catalog.message}</p><button disabled={busy} onClick={refreshModels} className="underline underline-offset-4">Refresh models</button>
      <p className="text-sm">Connection testing sends supplied synthetic notes and may incur API charges. It saves a synthetic candidate in private test records.</p>
      <div className="flex gap-3"><button disabled={busy || !status || !catalog.available} onClick={test} className="rounded-md border px-4 py-2 disabled:opacity-50">Check AI connection</button>{testing && <button onClick={() => stop.current?.abort()} className="rounded-md border px-4 py-2">Stop</button>}</div>
    </div>
    <p role="status" aria-live="polite" className="rounded-md border p-3">{message}</p>
    <AgentConnections />
  </main>;
}
