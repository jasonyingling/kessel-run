'use client';
import { useState } from 'react';
import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
import { localApi } from '@/lib/kessel-run/local-api';
import { AppButton } from './workspace';
import { MarkdownPreview } from './markdown-preview';
type Preview = Awaited<ReturnType<WorkspaceService['previewHandoff']>>;
export function HandoffImport({ workspaceHash, empty, onChanged }: { workspaceHash: string; empty: boolean; onChanged: () => Promise<void> }) {
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState('Restoration preserves exported editorial records. Choose a new empty workspace first.');
  const [busy, setBusy] = useState(false);
  async function inspect() {
    setBusy(true);
    try { setPreview(await localApi('content', { action: 'handoff-preview', input: { markdown } })); setMessage('Review exact prose, profile versions and prior editorial decisions before restoring.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Preview failed.'); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (!preview) return;
    setBusy(true);
    try {
      await localApi('content', { action: 'handoff-import', input: { operationId: crypto.randomUUID(), expectedHash: workspaceHash, previewHash: preview.hash, markdown } });
      await onChanged(); setPreview(null); setMarkdown(''); setMessage('Restored into the selected empty workspace.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Restoration failed.'); }
    finally { setBusy(false); }
  }
  return <details className="kr-panel"><summary>Restore an exported Markdown handoff</summary><label className="kr-field">Exported handoff file<input disabled={busy} type="file" accept=".md,text/markdown" onChange={event => { const file = event.target.files?.[0]; setPreview(null); if (file && file.size <= 8000000) void file.text().then(setMarkdown).catch(() => setMessage('File could not be read.')); else setMessage('Choose a Markdown handoff smaller than 8 MB.'); }} /></label><AppButton disabled={busy || !markdown} onClick={() => void inspect()}>Preview restoration</AppButton>{preview && <div><h3>{String(preview.output.title)} · {preview.fileCount} editorial files</h3><p>Output status: {String(preview.output.status)}. Exact retained revisions, pending proposals and prior human decisions are included.</p><MarkdownPreview prose={preview.output.body} />{preview.profiles.map(profile => <details key={`${profile.id}:${profile.version}`}><summary>{String(profile.title)} · v{String(profile.version)} · {String(profile.status)}</summary><MarkdownPreview prose={profile.body} /></details>)}<pre>{JSON.stringify(preview.decisions, null, 2)}</pre><AppButton disabled={busy || !empty} onClick={() => void restore()}>Confirm restoration of these editorial records</AppButton>{!empty && <p>Choose a new empty workspace; existing publications are preserved.</p>}</div>}<p role="status">{message}</p></details>;
}
