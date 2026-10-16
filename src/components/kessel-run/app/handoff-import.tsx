'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
import { localApi } from '@/lib/kessel-run/local-api';
import { AppButton } from './workspace';
import { MarkdownPreview } from './markdown-preview';
import { HandoffSelection } from './handoff-selection';
type Preview = Awaited<ReturnType<WorkspaceService['previewHandoff']>>;
export function HandoffImport({ workspaceHash, empty, onChanged }: { workspaceHash: string; empty: boolean; onChanged: () => Promise<void> }) {
  const [selection] = useState(() => new HandoffSelection<Preview>());
  const state = useSyncExternalStore(selection.subscribe, selection.getSnapshot, selection.getSnapshot);
  const [restoring, setRestoring] = useState(false);
  const restoreInFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const review = selection.confirmation(workspaceHash);
  const preview = review?.preview;
  async function restore() {
    const confirmed = selection.confirmation(workspaceHash);
    if (!confirmed || !empty || restoreInFlight.current) return;
    restoreInFlight.current = true;
    setRestoring(true);
    try {
      await localApi('content', { action: 'handoff-import', input: { operationId: crypto.randomUUID(), expectedHash: confirmed.workspaceHash, previewHash: confirmed.previewHash, markdown: confirmed.markdown } });
      selection.restored(confirmed);
      if (input.current) input.current.value = '';
      await onChanged();
    } catch (error) { selection.restoreFailed(confirmed, error); }
    finally { restoreInFlight.current = false; setRestoring(false); }
  }
  return <details className="kr-panel">
    <summary>Restore an exported Markdown handoff</summary>
    <label className="kr-field">Exported handoff file<input ref={input} disabled={restoring} type="file" accept=".md,text/markdown" onChange={event => { void selection.select(event.target.files?.[0]); }} /></label>
    {state.filename && <p>Selected file: <strong>{state.filename}</strong></p>}
    <AppButton disabled={restoring || state.phase !== 'ready' || state.inspecting} onClick={() => void selection.inspect(workspaceHash, markdown => localApi<Preview>('content', { action: 'handoff-preview', input: { markdown } }))}>{state.inspecting ? 'Preparing preview…' : 'Preview restoration'}</AppButton>
    {preview && <div>
      <h3>{String(preview.output.title)} · {preview.fileCount} editorial files</h3>
      <p>Preview of {review.filename}. Output status: {String(preview.output.status)}. Exact retained revisions, pending proposals and prior human decisions are included.</p>
      <MarkdownPreview prose={preview.output.body} />
      {preview.profiles.map(profile => <details key={`${profile.id}:${profile.version}`}><summary>{String(profile.title)} · v{String(profile.version)} · {String(profile.status)}</summary><MarkdownPreview prose={profile.body} /></details>)}
      <pre>{JSON.stringify(preview.decisions, null, 2)}</pre>
      <AppButton disabled={restoring || !empty} onClick={() => void restore()}>Confirm restoration of these editorial records</AppButton>
      {!empty && <p>Choose a new empty workspace; existing publications are preserved.</p>}
    </div>}
    <p role="status">{state.review && !review ? 'Workspace changed. Preview the file again before restoring.' : state.message}</p>
  </details>;
}
