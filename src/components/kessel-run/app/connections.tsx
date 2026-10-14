'use client';

import { useEffect, useState } from 'react';

type Connection = { id: string; clientName: string; publicationIds: string[] | null; allowDrafts: boolean; allowSources: boolean; revokedAt: number | null };
type Index = { version: number; clients: Connection[] };
const headers = { 'content-type': 'application/json', 'x-kr-csrf': 'local' };

export function AgentConnections() {
  const [index, setIndex] = useState<Index | null>(null);
  const [name, setName] = useState('');
  const [publications, setPublications] = useState('');
  const [drafts, setDrafts] = useState(false);
  const [sources, setSources] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading connections…');
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState('/api/mcp');

  async function reload() {
    const response = await fetch('/api/kessel-run/local/connections');
    if (!response.ok) throw new Error('Pair this browser and choose a workspace before connecting your agent.');
    setIndex(await response.json());
    setEndpoint(`${window.location.origin}/api/mcp`);
  }
  useEffect(() => {
    void reload().then(() => setMessage('Each client has a separate revocable token.')).catch(error => setMessage(error.message));
  }, []);

  async function mutate(method: string, id?: string) {
    setBusy(true);
    setSecret(null);
    try {
      const payload = id ? { id } : {
        clientName: name,
        publicationIds: publications.trim() ? publications.split(',').map(value => value.trim()) : null,
        allowDrafts: drafts,
        allowSources: sources,
      };
      const response = await fetch('/api/kessel-run/local/connections', {
        method, headers,
        body: JSON.stringify({ ...payload, expectedVersion: index?.version, operationId: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Connection change failed.');
      setSecret(result.token ?? null);
      await reload();
      setMessage(result.token ? 'Copy this token now. It is shown once. Keep it in your agent’s private environment.' : result.secretUnavailable ? 'The token cannot be shown again. Rotate it to issue a new secret.' : 'Connection revoked.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connection change failed.');
    } finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-xl border p-5" aria-labelledby="agent-connections">
    <h2 id="agent-connections" className="text-xl font-semibold">Connect your agent</h2>
    <p>Your agent supplies the prose. MCP does not call Kessel Run’s model or require an API key.</p>
    <p className="break-all text-sm">Streamable HTTP endpoint: <code>{endpoint}</code></p>
    <p className="text-sm">A client must reach this machine. Cloud agents need a separately authorized connection. SDK transport is tested; a real Codex connection remains unverified.</p>
    <label className="block">Client name<input value={name} onChange={event => setName(event.target.value)} maxLength={120} className="mt-2 block w-full rounded-md border bg-background p-2" /></label>
    <label className="block">Publication IDs, separated by commas<input value={publications} onChange={event => setPublications(event.target.value)} className="mt-2 block w-full rounded-md border bg-background p-2" /><span className="text-sm">Leave empty to grant this workspace. Use IDs from publication details to narrow access.</span></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={drafts} onChange={event => setDrafts(event.target.checked)} />Allow draft, artifact and profile proposals</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={sources} onChange={event => setSources(event.target.checked)} />Allow supplied source notes</label>
    <button disabled={busy || !index || !name.trim()} onClick={() => void mutate('POST')} className="rounded-md border px-4 py-2 disabled:opacity-50">Create connection</button>
    {secret && <div className="space-y-2 rounded-md border p-3"><label className="block">One-time access token<textarea readOnly value={secret} className="mt-2 block w-full break-all rounded-md border bg-background p-2" /></label><button onClick={() => setSecret(null)} className="rounded-md border px-3 py-2">Hide token</button></div>}
    <p role="status" className="rounded-md border p-3">{message}</p>
    {index?.clients.map(connection => <div key={connection.id} className="space-y-2 border-t pt-3">
      <h3 className="font-medium">{connection.clientName}</h3>
      <p className="text-sm">{connection.revokedAt !== null ? 'Revoked' : 'Active'} · {connection.publicationIds?.join(', ') ?? 'Workspace scope'} · Drafts {connection.allowDrafts ? 'allowed' : 'disabled'} · Sources {connection.allowSources ? 'allowed' : 'disabled'}</p>
      {connection.revokedAt === null && <div className="flex gap-3"><button disabled={busy} onClick={() => void mutate('PUT', connection.id)} className="rounded-md border px-3 py-2">Rotate token</button><button disabled={busy} onClick={() => void mutate('DELETE', connection.id)} className="rounded-md border px-3 py-2">Revoke</button></div>}
    </div>)}
    <p className="text-sm">Configure Codex manually with <code>url</code> and <code>bearer_token_env_var</code> in its MCP settings. See docs/kessel-run-mcp.md. Never place a provider key in this configuration.</p>
  </section>;
}
