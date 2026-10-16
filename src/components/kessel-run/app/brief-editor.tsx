'use client';
import { useEffect, useState } from 'react';
import type { Entity } from '@/lib/kessel-run/app-contracts';
import { AppButton } from './app-button';
import { Field } from './field';
import { useStudioCommand } from './studio-command';
export function BriefEditor({ piece, workspaceId, onChanged, onDirty }: { piece: Entity; workspaceId: string; onChanged: () => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const command = useStudioCommand(`${workspaceId}:${piece.id}:brief`, onChanged);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [draft, setDraft] = useState<{ title: string; brief: string; mode: string; hash: string } | null>(null);
  const key = `kr-brief:${workspaceId}:${piece.id}`;
  useEffect(() => {
    // Hydrate the scoped browser recovery record after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const raw = sessionStorage.getItem(key); if (raw) { const saved = JSON.parse(raw); if (typeof saved.title !== 'string' || typeof saved.brief !== 'string' || !['guided', 'fast'].includes(saved.mode) || !/^[a-f0-9]{64}$/.test(saved.hash)) throw new Error(); setDraft(saved); onDirty(true); } setRecoveryReady(true); }
    catch { command.setMessage('Brief recovery is unavailable. Restore browser storage before editing.'); }
    // Scope owns the initial recovery; polling must not replace locally edited fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  function edit(patch: Partial<NonNullable<typeof draft>>) {
    if (!recoveryReady) return;
    const next = { ...(draft ?? { title: String(piece.title), brief: piece.body, mode: String(piece.mode), hash: piece.hash }), ...patch };
    try { sessionStorage.setItem(key, JSON.stringify(next)); setDraft(next); onDirty(true); } catch { command.setMessage('Recovery storage is unavailable. Keep this tab open.'); }
  }
  const value = draft ?? { title: String(piece.title), brief: piece.body, mode: String(piece.mode), hash: piece.hash };
  return <section className="kr-panel"><h2>Brief</h2><fieldset disabled={command.busy || Boolean(command.pending) || !command.ready || !recoveryReady}><Field label="Working title"><input value={value.title} maxLength={160} onChange={event => edit({ title: event.target.value })} /></Field><Field label="Brief"><textarea aria-label="Brief" value={value.brief} maxLength={80000} rows={6} onChange={event => edit({ brief: event.target.value })} /></Field><Field label="Writing approach"><select value={value.mode} onChange={event => edit({ mode: event.target.value })}><option value="guided">Guided</option><option value="fast">Fast</option></select></Field></fieldset>{draft && draft.hash !== piece.hash && <p role="alert">The saved brief changed. Your text is retained. Compare the saved brief before choosing a new save base.</p>}{draft && draft.hash !== piece.hash && <details><summary>Compare saved brief</summary><h3>{String(piece.title)}</h3><pre>{piece.body}</pre><AppButton static disabled={Boolean(command.pending)} onClick={() => edit({ hash: piece.hash })}>Use current brief as save base</AppButton></details>}<div className="kr-toolbar">{!recoveryReady && <AppButton static onClick={() => { try { sessionStorage.removeItem(key); setRecoveryReady(true); command.setMessage('Discarded unreadable brief recovery. The saved brief is available.'); } catch { command.setMessage('Restore browser storage access before continuing.'); } }}>Discard unreadable brief recovery</AppButton>}<AppButton disabled={!recoveryReady || !command.ready || command.busy || (!draft && !command.pending) || !value.title.trim()} onClick={() => void command.run('piece-update', { pieceId: piece.id, expectedHash: value.hash, title: value.title, brief: value.brief, mode: value.mode }, () => { sessionStorage.removeItem(key); setDraft(null); onDirty(false); })}>{command.pending ? 'Retry brief save' : 'Save brief'}</AppButton>{command.pending?.failed && <AppButton static onClick={command.abandon}>Edit failed brief</AppButton>}</div><p role="status">{command.message}</p></section>;
}
