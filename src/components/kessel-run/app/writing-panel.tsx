'use client';
import { useEffect, useRef, useState } from 'react';
import { AppButton } from './workspace';
import type { ConversationRun } from '@/server/kessel-run/ai/conversations';
import { runEvent } from '@/server/kessel-run/ai/events';
import { getWorkspaceReference } from '@/lib/kessel-run/local-api';

export function WritingPanel({ scope, scopeKind, mode, onCommitted }: { scope: string; scopeKind: 'output' | 'voice'; mode: 'guided' | 'fast'; onCommitted: () => Promise<void> }) {
  const [runs, setRuns] = useState<ConversationRun[]>([]);
  const [message, setMessage] = useState('');
  const messageRef = useRef('');
  const scopeRef = useRef(scope);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('gpt-5');
  const [source, setSource] = useState('saved');
  const [status, setStatus] = useState('Loading saved conversation…');
  const [busy, setBusy] = useState(false);
  const [provisional, setProvisional] = useState('');
  const stop = useRef<AbortController | null>(null);
  const activeId = useRef<string | null>(null);
  async function reload() {
    const response = await fetch(`/api/kessel-run/local/writing?scope=${scope}`, { headers: { 'x-kr-workspace-ref': getWorkspaceReference() ?? '' } });
    if (!response.ok) throw new Error('Conversation could not be reloaded.');
    setRuns(await response.json());
  }
  useEffect(() => {
    scopeRef.current = scope;
    const controller = new AbortController();
    async function load() {
      const response = await fetch(`/api/kessel-run/local/writing?scope=${scope}`, { signal: controller.signal, headers: { 'x-kr-workspace-ref': getWorkspaceReference() ?? '' } });
      if (!response.ok) throw new Error('Pair this browser to load conversations.');
      const saved = await response.json();
      const catalog = await fetch('/api/kessel-run/local/models', { signal: controller.signal });
      if (!catalog.ok) throw new Error('Model configuration unavailable.');
      const available = await catalog.json();
      if (!controller.signal.aborted) { setModels(available.models.map((value: { id: string }) => value.id)); setRuns(saved); setStatus('Ready. Each AI turn may incur API charges.'); }
    }
    void load().catch(error => { if (!controller.signal.aborted) setStatus(error.message); });
    return () => { controller.abort(); stop.current?.abort(); };
  }, [scope]);
  async function send() {
    setBusy(true); setProvisional(''); setStatus('Writing… Streamed text is provisional until a tool saves it.');
    const controller = new AbortController(); stop.current = controller;
    const submitted = messageRef.current;
    const submittedScope = scope;
    try {
      const response = await fetch('/api/kessel-run/local/writing', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-kr-csrf': 'local', 'x-kr-workspace-ref': getWorkspaceReference() ?? '' }, signal: controller.signal,
        body: JSON.stringify({ scope, scopeKind, source, model, mode, message: submitted, operationId: crypto.randomUUID() }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      activeId.current = response.headers.get('x-kr-run-id');
      if (response.headers.get('content-type')?.includes('application/json')) { await reload(); return; }
      const reader = response.body!.getReader(); const decoder = new TextDecoder();
      let pending = ''; const seen = new Set<number>();
      while (true) {
        const part = await reader.read(); if (part.done) break;
        pending += decoder.decode(part.value, { stream: true });
        const lines = pending.split('\n'); pending = lines.pop() ?? '';
        for (const line of lines) {
          if (!line) continue;
          const event = runEvent.parse(JSON.parse(line));
          if (seen.has(event.sequence)) continue; seen.add(event.sequence);
          if (event.type === 'text') setProvisional(value => value + event.text);
          if (event.type === 'operation') { setStatus(`Saved/read operation: ${event.name}`); await onCommitted(); }
          if (event.type === 'terminal') setStatus(event.status === 'completed' ? 'Turn completed. Saved proposals remain reviewable.' : `${event.status}. Partial text is provisional; resume starts a new turn.`);
        }
      }
      if (scopeRef.current === submittedScope && messageRef.current === submitted) { setMessage(''); messageRef.current = ''; }
      if (scopeRef.current === submittedScope) { await reload(); await onCommitted(); }
    } catch (error) { setStatus(error instanceof Error && error.name === 'AbortError' ? 'Stopped. Committed saves survive; partial response is provisional.' : error instanceof Error ? error.message : 'Turn failed.'); }
    finally { setBusy(false); stop.current = null; activeId.current = null; }
  }
  async function cancel() {
    const id = activeId.current;
    stop.current?.abort();
    if (id) await fetch('/api/kessel-run/local/writing', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-kr-csrf': 'local', 'x-kr-workspace-ref': getWorkspaceReference() ?? '' }, body: JSON.stringify({ runId: id }) });
    await reload();
  }
  return <section className="kr-chat"><h2>{scopeKind === 'voice' ? 'Voice setup conversation' : 'AI writing'}</h2><p>Start/Resume follows your saved rules and supplied evidence. No key is required for manual editing or MCP.</p><label className="kr-field">Credential source<select value={source} onChange={event => setSource(event.target.value)}><option value="saved">Saved local API key</option><option value="environment">Server environment key</option></select></label><label className="kr-field">Model<select value={model} onChange={event => setModel(event.target.value)}>{models.map(id => <option key={id}>{id}</option>)}</select></label><p>Live compatibility remains pending a billed connection test.</p><p>Usage is reported after a completed turn; no cost estimate is invented.</p>{runs.map(run => <details key={run.id}><summary>{new Date(run.createdAt).toLocaleString()} · {run.status} · {run.model} · {run.engine === 'fake' ? 'Synthetic fixture' : 'API'}</summary><p>{run.message}</p><pre>{run.response}</pre>{run.usage && <p>{run.engine === 'fake' ? 'Synthetic fixture usage' : 'Provider usage'}: {run.usage.inputTokens ?? 'unknown'} input / {run.usage.outputTokens ?? 'unknown'} output tokens</p>}</details>)}<label className="kr-field">Message<textarea value={message} maxLength={20000} onChange={event => { setMessage(event.target.value); messageRef.current = event.target.value; }} rows={5} /></label><div className="kr-toolbar"><AppButton disabled={busy || !message.trim()} onClick={() => void send()}>Send billed AI turn</AppButton>{busy && <AppButton static onClick={() => void cancel().catch(error => setStatus(error.message))}>Stop</AppButton>}<AppButton static onClick={() => void reload().catch(error => setStatus(error.message))}>Reload conversation</AppButton></div><p role="status">{status}</p>{provisional && <pre aria-label="Provisional response">{provisional}</pre>}</section>;
}
