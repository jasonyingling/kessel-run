'use client';

import { useEffect, useState } from 'react';

type Connection = { id: string; clientName: string; publicationIds: string[] | null; allowDrafts: boolean; allowSources: boolean; revokedAt: number | null };
type Index = { version: number; clients: Connection[] };
const headers = { 'content-type': 'application/json', 'x-kr-csrf': 'local' };

export function AgentConnections() {
  const [index, setIndex] = useState<Index | null>(null);
  const [name, setName] = useState('');
  const [publicationIds, setPublicationIds] = useState<string[] | null>(null);
  const [publications, setPublications] = useState<{ id: string; title: string }[]>([]);
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
    const controller = new AbortController();
    async function initialize() {
      const response = await fetch('/api/kessel-run/local/connections', { signal: controller.signal });
      if (!response.ok) throw new Error('Pair this browser and choose a workspace before connecting your agent.');
      const result = await response.json();
      const workspaceResponse = await fetch('/api/kessel-run/local/workspace', { signal: controller.signal });
      if (!workspaceResponse.ok) throw new Error('Choose a workspace before issuing a connection.');
      const workspace = await workspaceResponse.json();
      if (controller.signal.aborted) return;
      setIndex(result);
      setPublications(workspace.publications.map((value: { id: string; title: string }) => ({ id: value.id, title: value.title })));
      setEndpoint(`${window.location.origin}/api/mcp`);
      setMessage('Each client has a separate revocable token.');
    }
    void initialize().catch(error => {
      if (!controller.signal.aborted) setMessage(error.message);
    });
    return () => controller.abort();
  }, []);

  async function mutate(method: string, id?: string) {
    setBusy(true);
    setSecret(null);
    try {
      const payload = id ? { id } : {
        clientName: name,
        publicationIds,
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
    <fieldset className="space-y-2"><legend>Connection scope</legend><label className="flex gap-2"><input type="radio" name="scope" checked={publicationIds === null} onChange={() => setPublicationIds(null)} />Entire selected workspace</label><label className="flex gap-2"><input type="radio" name="scope" checked={publicationIds !== null} onChange={() => setPublicationIds([])} />Selected publications</label>{publicationIds !== null && publications.map(publication => <label className="flex gap-2" key={publication.id}><input type="checkbox" checked={publicationIds.includes(publication.id)} onChange={event => setPublicationIds(event.target.checked ? [...publicationIds, publication.id] : publicationIds.filter(id => id !== publication.id))} />{publication.title}</label>)}</fieldset>
    <label className="flex items-center gap-2"><input type="checkbox" checked={drafts} onChange={event => setDrafts(event.target.checked)} />Allow draft, artifact and profile proposals</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={sources} onChange={event => setSources(event.target.checked)} />Allow supplied source notes</label>
    <button disabled={busy || !index || !name.trim()} onClick={() => void mutate('POST')} className="rounded-md border px-4 py-2 disabled:opacity-50">Create connection</button>
    {secret && <div className="space-y-2 rounded-md border p-3"><label className="block">One-time access token<textarea readOnly value={secret} className="mt-2 block w-full break-all rounded-md border bg-background p-2" /></label><button onClick={() => setSecret(null)} className="rounded-md border px-3 py-2">Hide token</button></div>}
    <p role="status" className="rounded-md border p-3">{message}</p>
    {index?.clients.map(connection => <div key={connection.id} className="space-y-2 border-t pt-3">
      <h3 className="font-medium">{connection.clientName}</h3>
      <p className="text-sm">{connection.revokedAt !== null ? 'Revoked' : 'Active'} · {connection.publicationIds?.map(id => publications.find(value => value.id === id)?.title ?? 'Unavailable publication').join(', ') ?? 'Workspace scope'} · Drafts {connection.allowDrafts ? 'allowed' : 'disabled'} · Sources {connection.allowSources ? 'allowed' : 'disabled'}</p>
      {connection.revokedAt === null && <div className="flex gap-3"><button disabled={busy} onClick={() => void mutate('PUT', connection.id)} className="rounded-md border px-3 py-2">Rotate token</button><button disabled={busy} onClick={() => void mutate('DELETE', connection.id)} className="rounded-md border px-3 py-2">Revoke</button></div>}
    </div>)}
    <p className="text-sm">Configure Codex manually with <code>url</code> and <code>bearer_token_env_var</code> in its MCP settings. See docs/kessel-run-mcp.md. Never place a provider key in this configuration.</p>
  </section>;
}
