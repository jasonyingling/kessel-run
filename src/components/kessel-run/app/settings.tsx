'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Status = { environment: boolean; saved: { reference: string; masked: string } | null; storage: string };
const headers = { 'content-type': 'application/json', 'x-kr-csrf': 'local' };
export function AppSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState('');
  const [source, setSource] = useState('saved');
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
    }
    void initialize().catch(error => setMessage(error.message));
    return () => stop.current?.abort();
  }, []);
  async function save() {
    setBusy(true);
    const submitted = key; setKey('');
    try {
      const response = await fetch('/api/kessel-run/local/credentials', { method: 'PUT', headers, body: JSON.stringify({ key: submitted }) });
      if (!response.ok) throw new Error('Key was not saved. Enter it again and retry.');
      await reload(); setMessage('Saved key. It stays in the owner-only private store outside exported content.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { const response = await fetch('/api/kessel-run/local/credentials', { method: 'DELETE', headers }); if (!response.ok) throw new Error('Removal failed.'); await reload(); setMessage('Saved key removed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Removal failed'); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setTesting(true); stop.current = new AbortController(); setMessage('Running a billed synthetic test…');
    try {
      const response = await fetch('/api/kessel-run/local/connection-test', { method: 'POST', headers, signal: stop.current.signal, body: JSON.stringify({ source, model: 'gpt-5' }) });
      if (!response.ok) throw new Error('Test failed. Check the selected key. No fallback was attempted.');
      const body = await response.text();
      if (body.includes('"type":"error"')) throw new Error('Test failed or stopped. Check the selected key.');
      const runId = response.headers.get('x-kr-run-id');
      const saved = await fetch(`/api/kessel-run/local/runs/${runId}`);
      if (!saved.ok) throw new Error('Persisted test result could not be reloaded.');
      const run = await saved.json();
      if (run.status !== 'completed' || !run.candidateId) throw new Error('The test did not record a completed candidate save.');
      const usage = run.usage ? ` Provider reported ${run.usage.inputTokens ?? 'unknown'} input and ${run.usage.outputTokens ?? 'unknown'} output tokens.` : '';
      setMessage(`Synthetic stream and candidate save completed. Run ${runId}.${usage}`);
    } catch (error) { setMessage(error instanceof Error && error.name === 'AbortError' ? 'Stopped. Partial text is provisional.' : error instanceof Error ? error.message : 'Test failed'); }
    finally { setBusy(false); setTesting(false); stop.current = null; }
  }
  return <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
    <Link className="underline underline-offset-4" href="/kessel-run">Back to writing</Link>
    <h1 className="text-3xl font-semibold">API settings</h1>
    <p>OpenAI powers AI inside Kessel Run. Manual writing and your external agent use separate access.</p>
    <div className="space-y-4 rounded-xl border p-5">
      <label className="block">Credential source<select value={source} onChange={event => setSource(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2"><option value="saved">Saved local key {status?.saved?.masked ?? '(not configured)'}</option><option value="environment">Server environment {status?.environment ? '(configured)' : '(not configured)'}</option></select></label>
      <p className="text-sm">The selected source is used explicitly. An invalid or exhausted key never triggers a fallback.</p>
      <label className="block">Replace saved key<input type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2" /></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy || key.length < 20} onClick={save} className="rounded-md border px-4 py-2 disabled:opacity-50">Save key</button><button disabled={busy || !status?.saved} onClick={remove} className="rounded-md border px-4 py-2 disabled:opacity-50">Remove saved key</button></div>
      <label className="block">Model<select disabled className="mt-2 block w-full rounded-md border bg-background p-2"><option>gpt-5 · text and tools</option></select></label>
      <p className="text-sm">Connection testing sends supplied synthetic notes and may incur API charges. It saves a synthetic candidate in private test records.</p>
      <div className="flex gap-3"><button disabled={busy || !status} onClick={test} className="rounded-md border px-4 py-2 disabled:opacity-50">Run billed connection test</button>{testing && <button onClick={() => stop.current?.abort()} className="rounded-md border px-4 py-2">Stop</button>}</div>
    </div>
    <p role="status" aria-live="polite" className="rounded-md border p-3">{message}</p>
  </main>;
}
