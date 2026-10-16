'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Entity, WorkspaceOverview } from '@/lib/kessel-run/app-contracts';
import { localApi } from '@/lib/kessel-run/local-api';
import { AppButton } from './app-button';
import { Field } from './field';
import { creationState, type CreationDraft } from './creation-state';
import { studioLifetime } from './studio-ownership';
const pin = (value: string) => { const [profileId, version] = value.split(':'); return { profileId, version: Number(version) }; };
export function CreationFlow({ state, publication, piece, onCancel, onChanged }: { state: WorkspaceOverview; publication: Entity; piece?: Entity; onCancel: () => void; onChanged: () => Promise<void> }) {
  const router = useRouter(), scope = `${state.workspace.id}:${publication.id}:${piece?.id ?? 'new'}`;
  const owner = useRef<ReturnType<typeof studioLifetime> | null>(null), store = useRef<ReturnType<typeof creationState> | null>(null), running = useRef(false);
  const [draft, setDraft] = useState<CreationDraft | null>(null), [busy, setBusy] = useState(false), [pending, setPending] = useState(false), [rejected, setRejected] = useState(false), [message, setMessage] = useState('');
  const voices = state.profiles.filter(value => value.publicationId === publication.id && value.scope === 'publication' && value.status === 'approved');
  const presets = state.presets.filter(value => value.publicationId === publication.id);
  useEffect(() => {
    const lifetime = studioLifetime(); owner.current = lifetime;
    try {
      const saved = creationState(sessionStorage, scope); store.current = saved;
      const defaultPin = publication.defaultVoice as { profileId: string; version: number } | null;
      // Hydrate the scoped browser recovery record after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved.read() ?? { publicationId: String(publication.id), title: piece ? `${piece.title} · ${presets[0]?.title ?? 'Output'}` : '', brief: piece?.body ?? '', mode: piece?.mode === 'fast' ? 'fast' : 'guided', preset: String(presets[0]?.id ?? ''), voice: defaultPin ? `${defaultPin.profileId}:${defaultPin.version}` : '', author: '', piece: piece ? { id: String(piece.id), link: `/kessel-run/pieces/${piece.id}` } : null });
      setPending(Boolean(saved.commands.read())); setRejected(Boolean(saved.commands.read()?.failed));
    } catch { setMessage('Restore browser recovery storage before creating this piece.'); }
    return () => lifetime.dispose();
    // Initial fields and command ownership belong to this scope, not refreshed polling props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  function edit(patch: Partial<CreationDraft>) {
    if (!draft || !store.current) return;
    const next = { ...draft, ...patch };
    try { store.current.write(next); setDraft(next); } catch { setMessage('Browser recovery storage is unavailable. Your previous input is retained.'); }
  }
  async function create(target: 'idea' | 'output' | 'voice') {
    const lifetime = owner.current, saved = store.current;
    if (!draft || !lifetime || !saved || running.current) return;
    const active = () => lifetime.active() && owner.current === lifetime && store.current === saved;
    running.current = true; setBusy(true); setMessage('Saving…');
    let current = { ...draft, target: draft.target ?? target };
    try {
      saved.write(current);
      if (!current.piece || saved.commands.read()?.body.action === 'piece') {
        const result = await saved.step('piece', { expectedHash: publication.hash, publicationId: publication.id, title: current.title, brief: current.brief, mode: current.mode }, active, body => localApi('content', body), result => { current = { ...current, piece: result }; saved.write(current); setDraft(current); });
        if (!result || !active()) return;
      }
      const selectedPiece = current.piece!;
      if (current.target === 'output') {
        const material = await localApi<{ piece: Entity }>('content', { action: 'piece-context', input: { pieceId: selectedPiece.id } });
        if (!active()) return;
        const preset = presets.find(value => value.id === current.preset);
        const result = current.output && !saved.commands.read() ? current.output : await saved.step('output', { expectedHash: material.piece.hash, pieceId: selectedPiece.id, title: current.title, format: String(preset?.format ?? ''), preset: current.preset, voice: pin(current.voice), author: current.author ? pin(current.author) : null }, active, body => localApi('content', body), result => { current = { ...current, output: result }; saved.write(current); });
        if (!result || !active()) return;
        if (!/^\/kessel-run\/outputs\/[a-f0-9-]{36}$/.test(result.link)) throw new Error('Saved output has an invalid destination. Open it from All content.');
        saved.clear(); router.push(result.link); return;
      }
      if (!/^\/kessel-run\/pieces\/[a-f0-9-]{36}$/.test(selectedPiece.link)) throw new Error('Open the saved idea from All content.');
      if (current.target === 'voice') {
        creationState(sessionStorage, `${state.workspace.id}:${publication.id}:${selectedPiece.id}`).write({ ...current, target: undefined });
        if (scope !== `${state.workspace.id}:${publication.id}:${selectedPiece.id}`) saved.clear(); router.push(`/kessel-run/voices?publication=${publication.id}&returnPiece=${selectedPiece.id}`);
      } else { saved.clear(); router.push(selectedPiece.link); }
      await onChanged();
    } catch (error) { if (active()) setMessage(error instanceof Error ? error.message : 'Save failed. Retry the retained step.'); }
    finally { if (active()) { setDraft(saved.read() ?? current); setPending(Boolean(saved.commands.read())); setRejected(Boolean(saved.commands.read()?.failed)); setBusy(false); running.current = false; } }
  }
  return <section className="kr-panel kr-form" aria-label={piece ? 'Add output' : 'New piece'}><h2>{piece ? 'Add an independent output' : 'Start a piece'}</h2><p>{String(publication.title)} · Manual writing needs no AI connection.</p>{draft && <><fieldset disabled={busy || pending}><Field label="Title"><input value={draft.title} maxLength={160} onChange={event => edit({ title: event.target.value })} /></Field>{!piece && <Field label="Purpose or brief"><textarea disabled={Boolean(draft.piece)} value={draft.brief} rows={5} maxLength={80000} onChange={event => edit({ brief: event.target.value })} /></Field>}{!piece && <Field label="Writing mode"><select disabled={Boolean(draft.piece)} value={draft.mode} onChange={event => edit({ mode: event.target.value as 'guided' | 'fast' })}><option value="guided">Guided · collaborate section by section</option><option value="fast">Fast · complete draft with gaps marked</option></select></Field>}{piece && <p>Writing approach: {String(piece.mode)}. Edit the shared brief to change it.</p>}<p>This describes optional AI collaboration. You can always write yourself.</p><Field label="Format preset"><select value={draft.preset} onChange={event => edit({ preset: event.target.value })}>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{String(value.title)}</option>)}</select></Field>{voices.length > 0 && <><Field label="Exact publication voice"><select value={draft.voice} onChange={event => edit({ voice: event.target.value, author: '' })}><option value="">Choose a version</option>{voices.map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{String(value.title)} · v{String(value.version)}</option>)}</select></Field><Field label="Author overlay"><select value={draft.author} onChange={event => edit({ author: event.target.value })}><option value="">No author overlay</option>{state.profiles.filter(value => { const parent = value.parent as { profileId: string; version: number } | null; return value.publicationId === publication.id && value.scope === 'author' && value.status === 'approved' && `${parent?.profileId}:${parent?.version}` === draft.voice; }).map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{String(value.title)} · v{String(value.version)}</option>)}</select></Field></>}</fieldset><div className="kr-toolbar">{pending ? <AppButton disabled={busy} onClick={() => void create(draft.target ?? 'output')}>Retry saved submission</AppButton> : <><AppButton disabled={busy || !draft.title.trim() || !draft.voice || !draft.preset} onClick={() => void create('output')}>Create and write</AppButton>{!piece && <AppButton static disabled={busy || !draft.title.trim()} onClick={() => void create('idea')}>Save idea</AppButton>}{!voices.length && <AppButton disabled={busy || !draft.title.trim()} onClick={() => void create('voice')}>Create a starter voice</AppButton>}</>}{rejected && <AppButton static onClick={() => { store.current?.commands.abandon(); edit({ target: undefined }); setPending(false); setRejected(false); }}>Edit failed submission</AppButton>}<AppButton static disabled={busy || pending} onClick={() => { store.current?.clear(); onCancel(); void onChanged(); }}>Cancel</AppButton></div>{draft.piece && !piece && <p>Your idea is saved. Brief and approach are locked here; edit them from Brief & sources. The title above now names this output. Cancel keeps the idea in All content.</p>}</>}<p role="status">{message}</p></section>;
}
