'use client';
import { useModelCatalog } from './use-model-catalog';
import { DictationComposer, type ComposerHandle } from './dictation-composer';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppButton } from './app-button';
import { Field } from './field';
import { useWorkspaceNavigation } from './app-shell';
import { ProgressBoard } from './progress-board';
import { routeUnavailable, selectProgress } from '@/lib/kessel-run/progress';
import { BookOpen } from 'lucide-react';
import { localApi, LocalApiError, getWorkspaceReference, setWorkspaceReference } from '@/lib/kessel-run/local-api';
import type { Entity, OutputContext, WorkspaceOverview, WorkspaceAvailability } from '@/lib/kessel-run/app-contracts';
import { pairFromLauncher } from './pairing';
import { PublicationEntry } from './publication-entry';
import { operationState, type PendingOperation } from './operation-state';
import { revisionCache } from './revision-cache';
import { BriefEditor } from './brief-editor';
import { CreationFlow } from './creation-flow';
import { ownsStudioCommand, studioLifetime } from './studio-ownership';
import { acknowledgeSave, canExportBuffer, parseEditorRecovery } from './editor-state';
import { WritingPanel } from './writing-panel';
import { MarkdownPreview } from './markdown-preview';
import { ReviewDecisions } from './review-decisions';
import { VoiceStudio } from './voice-studio';
import { PresetSettings } from './preset-settings';
import { HandoffImport } from './handoff-import';

function entityName(entity?: Entity) { return String(entity?.title ?? ''); }

export function WritingWorkspace({ publicationId, pieceId, outputId, view = 'overview', publicationFilter = 'all', statusFilter = 'all', createPublication = false, returnPieceId }: { publicationId?: string; pieceId?: string; outputId?: string; view?: 'overview' | 'content' | 'voices'; publicationFilter?: string; statusFilter?: string; createPublication?: boolean; returnPieceId?: string }) {
  const router = useRouter();
  const lifetime = useRef<ReturnType<typeof studioLifetime> | null>(null);
  const [deskView, setDeskView] = useState('write');
  const [briefDirty, setBriefDirty] = useState(false);
  const [editBase, setEditBase] = useState('');
  const [filterPending, startFilterTransition] = useTransition();
  const [availability, setAvailability] = useState<WorkspaceAvailability | null>(null);
  const [pairRequired, setPairRequired] = useState(false);
  const operations = useRef<ReturnType<typeof operationState> | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);
  const submitting = useRef(false);
  const [state, setState] = useState<WorkspaceOverview | null>(null);
  const [context, setContext] = useState<OutputContext | null>(null);
  const [materials, setMaterials] = useState<{ sources: Entity[]; artifacts: Entity[] } | null>(null);
  const [message, setMessage] = useState('Loading your workspace…');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'workspace' | 'publication' | 'publication-update' | 'preset-update' | 'profile' | 'piece' | 'output' | 'source' | null>(createPublication ? 'publication' : null);
  const [showPresets, setShowPresets] = useState(false);
  const [needsVoice, setNeedsVoice] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const sourceComposer = useRef<ComposerHandle>(null);
  const [formIdentity, setFormIdentity] = useState('');
  const [cleanupSource, setCleanupSource] = useState('environment');
  const cleanupCatalog = useModelCatalog(cleanupSource, 'gpt-6-luna');
  const { model: cleanupModel, setModel: setCleanupModel } = cleanupCatalog;
  const [root, setRoot] = useState('');
  const [attribution, setAttribution] = useState('');
  const [mode, setMode] = useState('guided');
  const [sourceType, setSourceType] = useState('notes');
  const [scope, setScope] = useState('publication');
  const [authorId, setAuthorId] = useState('');
  const [preset, setPreset] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [authorPin, setAuthorPin] = useState('');
  const [preview, setPreview] = useState<{ publicationHash: string; addedMetadata: unknown } | null>(null);
  const [editor, setEditor] = useState('');
  const editorRef = useRef('');
  const editorEpoch = useRef(0);
  const knownIdentity = useRef<{ revision: unknown; hash: string; contextHash: string } | null>(null);
  function remember(saved: OutputContext) { knownIdentity.current = { revision: saved.output.currentRevision, hash: saved.output.hash, contextHash: saved.contextHash }; }
  const [dirty, setDirty] = useState(false);
  const [external, setExternal] = useState<OutputContext | null>(null);
  const dirtyRef = useRef(false);
  const hashRef = useRef<string | null>(null);
  const contextHashRef = useRef<string | null>(null);
  const [revisionText, setRevisionText] = useState<string | null>(null);
  const workspaceReady = state !== null;
  useWorkspaceNavigation(state);
  useEffect(() => { const owner = studioLifetime(); lifetime.current = owner; return () => owner.dispose(); }, [outputId, pieceId, publicationId]);
  useEffect(() => { const sync = () => { sourceComposer.current?.freeze(); setDeskView(['brief', 'write', 'outputs'].includes(location.hash.slice(1)) ? location.hash.slice(1) : outputId ? 'write' : 'brief'); }; sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, [outputId, pieceId]);
  useEffect(() => { const guard = (event: BeforeUnloadEvent) => { if (dirtyRef.current || briefDirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, [briefDirty]);


  async function refresh(allowWorkspaceChange = false) {
    const owner = lifetime.current, epoch = editorEpoch.current; const active = () => owner?.active() && lifetime.current === owner;
    const available = await localApi<WorkspaceAvailability>('bootstrap');
    if (!active()) return;
    setAvailability(available);
    if (available.status !== 'ready') return;
    const next = await localApi<WorkspaceOverview>('workspace');
    if (!active()) return;
    if (getWorkspaceReference() && getWorkspaceReference() !== next.workspace.id && !allowWorkspaceChange) throw new Error('Workspace selection changed. Your previous editor buffer remains recoverable. Reload this tab to enter the newly selected workspace.');
    setWorkspaceReference(String(next.workspace.id));
    setState(next);
    if (routeUnavailable(next, { publicationId, pieceId, outputId })) return;
    const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
    if (selectedPiece) { const material = await localApi<{ sources: Entity[]; artifacts: Entity[] }>('content', { action: 'piece-context', input: { pieceId: selectedPiece } }); if (!active()) return; setMaterials(material); }
    if (outputId) {
      const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
      if (!active() || epoch !== editorEpoch.current) return;
      remember(saved);
      if (dirtyRef.current) {
        if (hashRef.current !== saved.output.hash || contextHashRef.current !== saved.contextHash) setExternal(saved);
      } else {
        setContext(saved); setEditor(saved.output.body); editorRef.current = saved.output.body; hashRef.current = saved.output.hash; contextHashRef.current = saved.contextHash;
      }
    }
  }
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function initialize() {
      await pairFromLauncher();
      const available = await localApi<WorkspaceAvailability>('bootstrap', undefined, controller.signal);
      if (!mounted) return;
      setAvailability(available); setPairRequired(false);
      if (available.status !== 'ready') { setMessage(''); return; }
      operations.current = operationState(sessionStorage, `${available.scope}:${available.workspaceRef}`);
      setPendingOperation(operations.current.read());
      const next = await localApi<WorkspaceOverview>('workspace', undefined, controller.signal);
      if (!mounted) return;
      if (getWorkspaceReference() && getWorkspaceReference() !== next.workspace.id) throw new Error('Workspace selection changed. Reload this tab before editing.');
      setWorkspaceReference(String(next.workspace.id));
      setState(next); setMessage('');
      if (routeUnavailable(next, { publicationId, pieceId, outputId })) return;
      const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
      if (selectedPiece) {
        const material = await localApi<{ sources: Entity[]; artifacts: Entity[] }>('content', { action: 'piece-context', input: { pieceId: selectedPiece } }, controller.signal);
        if (!mounted) return;
        setMaterials(material);
      }
      if (outputId) {
        const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } }, controller.signal);
        if (!mounted) return;
        remember(saved);
        let recovered: { prose: string; hash: string; contextHash: string } | null = null;
        try { recovered = parseEditorRecovery(sessionStorage.getItem(`kr-recovery:${next.workspace.id}:${outputId}`)); } catch { /* Keep canonical content when the recovery buffer is invalid. */ }
        const prose = recovered?.prose ?? saved.output.body;
        dirtyRef.current = Boolean(recovered); setDirty(Boolean(recovered));
        const base = recovered ? { ...saved, contextHash: recovered.contextHash, output: { ...saved.output, hash: recovered.hash } } : saved;
        setContext(base); setEditor(prose); editorRef.current = prose; hashRef.current = base.output.hash; contextHashRef.current = base.contextHash;
        if (recovered && (recovered.hash !== saved.output.hash || recovered.contextHash !== saved.contextHash)) setExternal(saved);
      }
    }
    void initialize().catch(error => { if (mounted) { setMessage(error.message); setPairRequired(error instanceof LocalApiError && error.status === 401); } });
    return () => { mounted = false; controller.abort(); };
  }, [outputId, pieceId, publicationId]);

  useEffect(() => {
    if (!workspaceReady) return;
    let active = true; let pending = false;
    const poll = setInterval(() => {
      if (pending) return;
      pending = true; const epoch = editorEpoch.current;
      void localApi<WorkspaceOverview>('workspace').then(async next => {
        if (!active) return;
        if (getWorkspaceReference() !== next.workspace.id) throw new Error('Workspace selection changed. Unsaved prose remains in its previous workspace buffer; reload this tab before editing.');
        setState(next);
        if (routeUnavailable(next, { publicationId, pieceId, outputId })) return;
        const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
        if (selectedPiece) {
          const material = await localApi<{ sources: Entity[]; artifacts: Entity[] }>('content', { action: 'piece-context', input: { pieceId: selectedPiece } });
          if (active) setMaterials(material);
        }
        if (!outputId) return;
        const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
        if (!active || epoch !== editorEpoch.current) return;
        remember(saved);
        if (dirtyRef.current) {
          if (hashRef.current !== saved.output.hash || contextHashRef.current !== saved.contextHash) setExternal(saved);
        } else {
          setContext(saved); setEditor(saved.output.body); editorRef.current = saved.output.body;
          hashRef.current = saved.output.hash; contextHashRef.current = saved.contextHash;
        }
      }).catch(error => { if (active) setMessage(error.message); }).finally(() => { pending = false; });
    }, 1500);
    return () => { active = false; clearInterval(poll); };
  }, [workspaceReady, outputId, pieceId, publicationId]);

  useEffect(() => {
    const guard = (event: MouseEvent) => {
      if ((!dirtyRef.current && !briefDirty) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as Element).closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.origin === location.origin && destination.pathname !== location.pathname) { event.preventDefault(); event.stopPropagation(); setMessage('Save or reconcile your edits before leaving this desk.'); }
    };
    document.addEventListener('click', guard, true); return () => document.removeEventListener('click', guard, true);
  }, [briefDirty]);
  const output = state?.outputs.find(value => value.id === outputId);
  const piece = state?.pieces.find(value => value.id === (pieceId ?? output?.pieceId));
  const publication = state?.publications.find(value => value.id === (publicationId ?? piece?.publicationId));
  const voices = state?.profiles.filter(value => value.publicationId === publication?.id && value.scope === 'publication' && value.status === 'approved') ?? [];
  const authors = state?.profiles.filter(value => value.publicationId === publication?.id && value.scope === 'author' && value.status === 'approved') ?? [];
  const presets = state?.presets.filter(value => value.publicationId === publication?.id) ?? [];
  const missing = state && routeUnavailable(state, { publicationId, pieceId, outputId });
  const defaultPin = publication?.defaultVoice as { profileId: string; version: number } | null;
  const defaultVoice = voices.find(value => value.id === defaultPin?.profileId && value.version === defaultPin?.version);
  const progress = state ? selectProgress(state, publication ? String(publication.id) : publicationFilter, statusFilter).filter(value => !piece || value.piece.id === piece.id) : [];
  function changeFilter(key: string, value: string) {
    const query = new URLSearchParams();
    if (publicationFilter !== 'all') query.set('publication', publicationFilter);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    if (value === 'all') query.delete(key); else query.set(key, value);
    startFilterTransition(() => router.push(`/kessel-run/content${query.size ? `?${query}` : ''}`));
  }

  function open(next: NonNullable<typeof form>) {
    if (busy) { setMessage('Finish the current save before starting another.'); return; }
    if (pendingOperation) { setMessage('Resolve your pending save before starting another.'); return; }
    if (dirtyRef.current || briefDirty) { setMessage('Save or reconcile your edits before creating another output.'); return; }
    if (next === 'source') switchView('brief');
    setNeedsVoice(false); setFormIdentity(crypto.randomUUID()); setForm(next); setTitle(''); setBody(''); setPreview(null); setAuthorId(crypto.randomUUID());
    setPreset(String(presets[0]?.id ?? ''));
    const defaultVoice = publication?.defaultVoice as { profileId: string; version: number } | null;
    setVoiceId(defaultVoice ? `${defaultVoice.profileId}:${defaultVoice.version}` : '');
    setAuthorPin('');
    if (next === 'publication-update') { setEditBase(publication?.hash ?? ''); setTitle(entityName(publication)); setBody(publication?.body ?? ''); }
    if (next === 'preset-update') { setTitle(entityName(presets[0])); setBody(presets[0]?.body ?? ''); }
  }
  function pin(value: string) { const [profileId, version] = value.split(':'); return { profileId, version: Number(version) }; }
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    const owner = lifetime.current, ownedStore = operations.current; let submitted: PendingOperation | null = null;
    const active = () => Boolean(owner?.active() && lifetime.current === owner && operations.current === ownedStore);
    setBusy(true);
    try {
      const operationId = crypto.randomUUID();
      let command: PendingOperation | null = null;
      if (form === 'workspace') command = { path: 'workspace', body: { operationId, root, title } };
      else if (form === 'publication') command = { path: 'content', body: { action: 'publication', input: { operationId, expectedHash: state?.workspace.hash, title, purpose: body, presets: ['Article', 'Short post'] } } };
      else if (form === 'publication-update') command = { path: 'content', body: { action: form, input: { operationId, expectedHash: editBase, publicationId: publication?.id, title, purpose: body } } };
      else if (form === 'preset-update') command = { path: 'content', body: { action: form, input: { operationId, expectedHash: presets.find(value => value.id === preset)?.hash, presetId: preset, title, instructions: body } } };
      else if (form === 'profile') {
        const input = { publicationId: publication?.id, prose: body, scope, parent: scope === 'author' ? pin(voiceId) : null, authorId: scope === 'author' ? authorId : null };
        if (!preview) {
          setPreview(await localApi('content', { action: 'profile-preview', input }));
          setMessage('Review the exact prose and added metadata, then confirm use.'); return;
        }
        command = { path: 'content', body: { action: 'profile-import', input: { ...input, operationId, expectedHash: preview.publicationHash, title, provenance: attribution } } };
      } else if (form === 'piece') command = { path: 'content', body: { action: 'piece', input: { operationId, expectedHash: publication?.hash, publicationId: publication?.id, title, brief: body, mode } } };
      else if (form === 'output') command = { path: 'content', body: { action: 'output', input: { operationId, expectedHash: piece?.hash, pieceId: piece?.id, title, format: String(presets.find(value => value.id === preset)?.format ?? ''), preset, voice: pin(voiceId), author: authorPin ? pin(authorPin) : null } } };
      else if (form === 'source') command = { path: 'content', body: { action: 'source', input: { operationId, expectedHash: piece?.hash, pieceId: piece?.id, title, body: sourceComposer.current?.freeze() ?? body, dictation: sourceComposer.current?.provenance(), attribution, sourceType, referenceUrl: null } } };
      const store = ownedStore;
      if (!store || (!command && !store.read())) throw new Error('Reload before saving.');
      const frozen = store.read() ?? store.begin(command!);
      submitted = frozen; setPendingOperation(frozen);
      const result = await localApi<{ link?: string }>(frozen.path, frozen.body);
      if (!ownsStudioCommand(active(), store.read(), frozen)) return;
      store.clear(); setPendingOperation(null); setForm(null);
      await refresh(frozen.path === 'workspace'); if (!active()) return; setMessage('Saved.');
      if (result.link) router.push(result.link);
    } catch (error) {
      if (!active()) return;
      try { if (submitted && ownedStore && ownsStudioCommand(active(), ownedStore.read(), submitted)) ownedStore.failed(error); } catch { /* Preserve unknown submission on storage failure. */ }
      setMessage(error instanceof Error ? error.message : 'Save failed. Your input remains here.');
    }
    finally {
      if (!active()) return;
      try { if (operations.current) setPendingOperation(operations.current.read()); }
      catch { setMessage('Browser recovery storage is unavailable. Keep this tab open and restore storage access before retrying.'); }
      setBusy(false); submitting.current = false;
    }
  }
  async function saveEditor() {
    if (!context || !outputId || submitting.current) return null;
    const owner = lifetime.current, original = context, submitted = editorRef.current;
    const active = () => owner?.active() && lifetime.current === owner;
    submitting.current = true; editorEpoch.current++; setBusy(true); setMessage('Saving…');
    try {
      const receipt = await localApi<{ hash: string; contextHash: string; revision: string }>('content', { action: 'editor', input: { operationId: crypto.randomUUID(), expectedHash: original.output.hash, expectedContextHash: original.contextHash, outputId, prose: submitted } });
      if (!active()) return null;
      const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
      if (!active()) return null;
      remember(saved); editorEpoch.current++;
      const acknowledged = acknowledgeSave(submitted, editorRef.current, receipt.hash, receipt.contextHash);
      const intervened = saved.output.hash !== receipt.hash || saved.contextHash !== receipt.contextHash;
      dirtyRef.current = acknowledged.dirty || intervened; setDirty(dirtyRef.current);
      setContext(intervened ? { ...original, contextHash: receipt.contextHash, output: { ...original.output, hash: receipt.hash, body: submitted, currentRevision: receipt.revision } } : saved);
      hashRef.current = receipt.hash; contextHashRef.current = receipt.contextHash; setExternal(intervened ? saved : null);
      if (!dirtyRef.current) sessionStorage.removeItem(`kr-recovery:${state?.workspace.id}:${outputId}`);
      else sessionStorage.setItem(`kr-recovery:${state?.workspace.id}:${outputId}`, JSON.stringify({ prose: editorRef.current, hash: receipt.hash, contextHash: receipt.contextHash }));
      setMessage(acknowledged.dirty ? 'Earlier text saved. Your newer edits still need saving.' : intervened ? 'Another client changed the saved output. Reconcile before continuing.' : 'Saved.');
      return !dirtyRef.current ? { ...receipt, submitted } : null;
    } catch (error) { if (active()) setMessage(error instanceof Error ? `${error.message} Your unsaved prose is retained in the editor.` : 'Save failed. Your prose remains in the editor.'); return null; }
    finally { if (active()) { setBusy(false); submitting.current = false; } }
  }
  async function download() {
    const owner = lifetime.current, submitted = editorRef.current;
    const active = () => owner?.active() && lifetime.current === owner;
    if (!context || submitting.current) return;
    try {
      const identity = dirtyRef.current ? await saveEditor() : { revision: context.output.currentRevision as string | null, hash: context.output.hash, contextHash: context.contextHash };
      if (!active() || !identity) { if (active()) setMessage('Export stopped. Save or reconcile your current text, then try again.'); return; }
      const exported = await localApi<{ filename: string; handoff: string; identity: { revision: string | null; hash: string; contextHash: string } }>('content', { action: 'export', input: { outputId, expectedRevision: identity.revision, expectedHash: identity.hash, expectedContextHash: identity.contextHash } });
      if (!active()) return;
      if (!canExportBuffer(submitted, editorRef.current, identity, exported.identity) || dirtyRef.current || !knownIdentity.current || !canExportBuffer(submitted, editorRef.current, identity, knownIdentity.current)) { setMessage('Export stopped because your text changed. Save and try again.'); return; }
      const url = URL.createObjectURL(new Blob([exported.handoff], { type: 'text/markdown;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = exported.filename; anchor.click(); URL.revokeObjectURL(url);
      setMessage('Exported saved prose and Markdown handoff.');
    } catch (error) { if (active()) setMessage(error instanceof Error ? error.message : 'Export failed.'); }
  }
  async function readHistory(revisionId: string, hash: string) {
    if (!state || !outputId) return;
    const owner = lifetime.current;
    const key = { workspaceId: String(state.workspace.id), outputId, revisionId, hash };
    const result = await revisionCache.read(key, () => localApi<{ prose: string }>('content', { action: 'revision', input: { outputId, revisionId } }), revisionCache.peek(key)?.status === 'error');
    if (!owner?.active() || lifetime.current !== owner) return;
    if (result.status === 'error') setMessage(`${result.error} Select the revision again to retry.`); else setRevisionText(result.prose ?? '');
  }
  function switchView(next: string) { sourceComposer.current?.freeze(); setDeskView(next); window.history.pushState(null, '', `#${next}`); }
  function guardOutput(event: { preventDefault: () => void }) { if (dirtyRef.current || briefDirty || busy) { event.preventDefault(); setMessage('Save or reconcile your edits before switching outputs.'); } }

  if (missing) return <><header className="kr-heading"><div><p className="kr-eyebrow">Unavailable item</p><h1>This {outputId ? 'output' : pieceId ? 'piece' : 'publication'} is unavailable</h1><p>It may have moved or belong to another workspace.</p></div></header><Link href="/kessel-run">Return to overview</Link></>;
  return <>
    <header className="kr-heading"><div><p className="kr-eyebrow">{output ? 'Writing desk' : view === 'voices' ? 'Voice studio' : publication ? 'Publication' : 'Workspace'}</p><h1>{view === 'voices' ? 'Voice studio' : view === 'content' ? 'All content' : entityName(output ?? piece ?? publication) || 'Your writing, in one place'}</h1><p>{publication ? publication.body : view === 'voices' ? 'Choose a publication to work on its voice.' : 'Publications, voices and independent outputs.'}</p></div><div className="kr-toolbar">{state && !publication && <AppButton disabled={busy || Boolean(pendingOperation)} onClick={() => open('publication')}>New publication</AppButton>}{publication && view !== 'voices' && <AppButton disabled={busy || Boolean(pendingOperation)} onClick={() => open('piece')}>New piece</AppButton>}{piece && <AppButton disabled={busy || Boolean(pendingOperation)} onClick={() => open('output')}>Add output / repurpose</AppButton>}</div></header>
    {publication && <nav aria-label="Breadcrumb" className="kr-breadcrumbs"><Link href={`/kessel-run/publications/${publication.id}`} aria-current={!piece && view !== 'voices' ? 'page' : undefined}>{entityName(publication)}</Link>{piece && <><span aria-hidden="true">/</span><Link href={`/kessel-run/pieces/${piece.id}`} aria-current={!output ? 'page' : undefined}>{entityName(piece)}</Link></>}{output && <><span aria-hidden="true">/</span><span aria-current="page">{entityName(output)}</span></>}{view === 'voices' && <><span aria-hidden="true">/</span><span aria-current="page">Voice studio</span></>}</nav>}
    <p className={message ? 'kr-status' : 'kr-announcement'} role="status" aria-live="polite">{message}</p>
      {!state && !availability && !pairRequired && <section className="kr-panel" aria-busy="true"><h2>Opening your writing workspace…</h2></section>}
      {pairRequired && <section className="kr-panel"><h2>Open your local browser link</h2><p>Restart the local launcher and open the link it prints to connect this browser. You do not need an API key.</p></section>}
      {availability && availability.status !== 'ready' && <PublicationEntry key={availability.scope} availability={availability} onReady={() => refresh(true)} />}
      {pendingOperation && <section className="kr-panel"><h2>Resolve your pending save</h2><p>Your exact submission is retained. Retry to recover its result before editing or starting another save.</p><AppButton disabled={busy} onClick={() => void submit()}>Retry saved submission</AppButton>{pendingOperation.failed && <AppButton static onClick={() => { operations.current?.abandon(); setPendingOperation(null); }}>Edit failed submission</AppButton>}</section>}
      {state && publication && (form === 'piece' || form === 'output') && <CreationFlow key={`${state.workspace.id}:${publication.id}:${form === 'output' ? piece?.id : 'new'}`} state={state} publication={publication} piece={form === 'output' ? piece : undefined} onChanged={refresh} onCancel={() => setForm(null)} />}
      {state && form && !['piece', 'output'].includes(form) && <fieldset hidden={form === 'source' && deskView !== 'brief'} disabled={busy || Boolean(pendingOperation)} className="kr-panel kr-form" aria-label={`New ${form}`}><h2>{form === 'profile' ? 'Import a voice' : `New ${form}`}</h2><Field label="Title"><input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={Boolean(preview)} /></Field>
        {form === 'workspace' && <Field label="Empty folder path"><input value={root} onChange={event => setRoot(event.target.value)} /></Field>}
        {['publication', 'publication-update', 'preset-update', 'profile', 'piece'].includes(form) && <Field label={form === 'profile' ? 'Exact profile prose (Markdown)' : form === 'source' ? 'Supplied notes, including questions and answers' : 'Purpose or brief'}><textarea value={body} onChange={event => { setBody(event.target.value); setPreview(null); }} rows={9} maxLength={80000} /></Field>}
        {form === 'piece' && <Field label="Writing mode"><select value={mode} onChange={event => setMode(event.target.value)}><option value="guided">Guided · collaborate section by section</option><option value="fast">Fast · complete draft with gaps marked</option></select></Field>}
        {form === 'profile' && <><Field label="Profile scope"><select value={scope} onChange={event => { setScope(event.target.value); setPreview(null); }}><option value="publication">Publication voice</option><option value="author">Author overlay</option></select></Field>{scope === 'author' && <p>Use the title to name this author overlay. Its identity is retained automatically.</p>}</>}
        {(form === 'output' || (form === 'profile' && scope === 'author')) && <Field label="Exact publication voice"><select value={voiceId} onChange={event => { setVoiceId(event.target.value); setAuthorPin(''); setPreview(null); }}><option value="">Choose a version</option>{voices.map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{entityName(value)} · v{String(value.version)}</option>)}</select></Field>}
        {form === 'output' && <><Field label="Format preset"><select value={preset} onChange={event => setPreset(event.target.value)}>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field><Field label="Author overlay"><select value={authorPin} onChange={event => setAuthorPin(event.target.value)}><option value="">No author overlay</option>{authors.filter(value => { const parent = value.parent as { profileId: string; version: number }; return `${parent.profileId}:${parent.version}` === voiceId; }).map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{entityName(value)} · v{String(value.version)}</option>)}</select></Field><p>Only overlays with this exact publication voice parent are available. Choose a different voice version or create a matching overlay in Voice studio.</p></>}
        {form === 'source' && <><details><summary>Cleanup settings</summary><Field label="Cleanup credential source"><select value={cleanupSource} onChange={event => setCleanupSource(event.target.value)}><option value="saved">Saved local API key</option><option value="environment">Server environment key</option></select></Field><Field label="Cleanup model"><select value={cleanupModel} onChange={event => setCleanupModel(event.target.value)}>{cleanupCatalog.models.map(item => <option key={item.id} value={item.id} disabled={item.available === false}>{item.label}{item.available === false ? " · unavailable" : ""}</option>)}</select></Field><p role="status">{cleanupCatalog.message}</p><AppButton static onClick={cleanupCatalog.refresh}>Refresh models</AppButton></details><DictationComposer key={String(state?.workspace.id) + String(piece?.id) + formIdentity} value={body} onChange={setBody} scope={String(piece?.id)} scopeKind="source" source={cleanupSource} model={cleanupModel} cleanupDisabled={!cleanupCatalog.available} handle={sourceComposer} limit={80000} disabled={busy} label="Supplied notes, including questions and answers" action={<AppButton disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : 'Save source'}</AppButton>} /><p>Saved body is author-reviewed mixed typed, dictated and edited text. Raw recognition, when present, is retained separately and can contain errors.</p></>}
        {form === 'preset-update' && <Field label="Preset"><select value={preset} onChange={event => { setPreset(event.target.value); const selected = presets.find(value => value.id === event.target.value); setTitle(entityName(selected)); setBody(selected?.body ?? ''); }}>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field>}{form === 'source' && <Field label="Source type"><select value={sourceType} onChange={event => setSourceType(event.target.value)}><option value="notes">Notes</option><option value="interview">Interview</option><option value="supplied-text">Supplied text</option></select></Field>}
        {(form === 'profile' || form === 'source') && <Field label="Attribution / provenance"><input value={attribution} onChange={event => setAttribution(event.target.value)} /></Field>}
        {preview && <div><h3>Added metadata preview</h3><pre>{JSON.stringify(preview.addedMetadata, null, 2)}</pre><p>The profile prose above is preserved verbatim. Sparse profiles are valid.</p></div>}
        <div className="kr-toolbar">{form !== 'source' && <AppButton disabled={busy || (form === 'output' && (!voiceId || !preset || !title.trim()))} onClick={() => void submit()}>{busy ? 'Saving…' : form === 'profile' ? preview ? 'Confirm use of this profile' : 'Preview import' : 'Save'}</AppButton>}<AppButton static onClick={() => { setForm(null); setPreview(null); if (createPublication) router.replace('/kessel-run'); }}>Cancel</AppButton></div></fieldset>}
      {state && view === 'voices' && <section className="kr-panel"><Field label="Publication voice"><select value={publicationId ?? ''} onChange={event => router.push(event.target.value ? `/kessel-run/voices?publication=${event.target.value}` : '/kessel-run/voices')}><option value="">Choose a publication</option>{state.publications.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field>{!state.publications.length && <p>Create a publication first. You can add its voice when you are ready.</p>}{publication && <Link href={`/kessel-run/publications/${publication.id}`}>Back to publication</Link>}</section>}
      {publication && view === 'voices' && <section className="kr-panel"><VoiceStudio key={`${state?.workspace.id}:${publication.id}`} workspaceId={String(state?.workspace.id)} publication={publication} profiles={state?.profiles.filter(value => value.publicationId === publication.id) ?? []} version={Number(state?.workspace.version ?? 0)} blocked={busy || Boolean(pendingOperation)} onChanged={refresh} />{returnPieceId && state?.pieces.some(value => value.id === returnPieceId && value.publicationId === publication.id) && <Link href={`/kessel-run/pieces/${returnPieceId}`}>Return to your piece and add an output</Link>}</section>}
      {showPresets && publication && <PresetSettings key={`${state?.workspace.id}:${publication.id}`} workspaceId={String(state?.workspace.id)} publication={publication} presets={presets} blocked={busy || Boolean(pendingOperation)} onChanged={refresh} />}
      {needsVoice && piece && publication && <section className="kr-panel"><h2>Choose or create a voice</h2><p>Your idea is saved. Before creating an output, write starter preferences or import an existing profile and confirm the exact words.</p><Link href={`/kessel-run/voices?publication=${publication.id}&returnPiece=${piece.id}`}>Write a starter voice or import a profile</Link></section>}
      {piece && <><nav className="kr-tabs" role="tablist" aria-label="Writing desk views">{[['brief', 'Brief & sources'], ['write', 'Write & review'], ['outputs', 'Outputs']].map(([key, label]) => <button key={key} role="tab" aria-selected={deskView === key} aria-controls={`desk-${key}`} id={`tab-${key}`} tabIndex={deskView === key ? 0 : -1} onKeyDown={event => { const keys = ['brief', 'write', 'outputs']; let index = keys.indexOf(key); if (event.key === 'ArrowRight') index = (index + 1) % 3; else if (event.key === 'ArrowLeft') index = (index + 2) % 3; else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = 2; else return; event.preventDefault(); switchView(keys[index]); document.getElementById(`tab-${keys[index]}`)?.focus(); }} onClick={() => switchView(key)}>{label}</button>)}</nav><nav className="kr-tabs" aria-label="Independent outputs">{state?.outputs.filter(value => value.pieceId === piece.id).map(value => <Link onNavigate={guardOutput} aria-current={value.id === outputId ? 'page' : undefined} key={String(value.id)} href={`/kessel-run/outputs/${value.id}`}>{entityName(value)}</Link>)}</nav></>}
      {piece && <div hidden={deskView !== 'brief'} role="tabpanel" id="desk-brief" aria-labelledby="tab-brief"><BriefEditor key={`${state?.workspace.id}:${piece.id}`} piece={piece} workspaceId={String(state?.workspace.id)} onChanged={refresh} onDirty={setBriefDirty} /><section className="kr-panel"><div className="kr-toolbar"><h2>Brief & supplied sources</h2><AppButton onClick={() => open('source')}>Add notes / interview</AppButton></div><pre>{piece.body}</pre><p>{String(piece.mode)} mode · Next: {String(piece.nextAction)}</p>{materials?.sources.map(value => <details key={String(value.id)}><summary>{entityName(value)} · {String(value.attribution)}</summary><p>Submitted source text</p><pre>{value.body}</pre>{!!value.dictation && <details><summary>Raw recognition (may contain errors)</summary><pre>{String((value.dictation as { recognizedText: string }).recognizedText)}</pre><p>Cleanup applied: {String((value.dictation as { cleanupApplied: boolean }).cleanupApplied)}</p></details>}</details>)}</section></div>}
      {piece && <section hidden={deskView !== 'outputs'} role="tabpanel" id="desk-outputs" aria-labelledby="tab-outputs" className="kr-panel"><h2>Independent outputs</h2>{state?.outputs.filter(value => value.pieceId === piece.id).map(value => { const voice = value.voice as { profileId: string; version: number }; const author = value.author as { profileId: string; version: number } | null; return <article key={String(value.id)}><Link onNavigate={guardOutput} href={`/kessel-run/outputs/${value.id}`}>{entityName(value)}</Link><p>{String(value.format)} · {value.status === 'accepted' ? 'Ready · approved for export' : String(value.status)}</p><p>Voice: {entityName(state.profiles.find(item => item.id === voice.profileId && item.version === voice.version))} · v{voice.version}{author ? ` · Author: ${entityName(state.profiles.find(item => item.id === author.profileId && item.version === author.version))} · v${author.version}` : ' · No author overlay'}</p></article>; })}</section>}
      {piece && !context && deskView === 'write' && <section className="kr-panel"><h2>Choose an output to start writing</h2><p>Your idea and brief are saved. Add an output when you are ready.</p></section>}
      {context && state && <div hidden={deskView !== 'write'} role="tabpanel" id="desk-write" aria-labelledby="tab-write"><section className="kr-desk"><div className="kr-paper"><div className="kr-toolbar"><h2>Markdown editor</h2><span>{dirty ? 'Unsaved changes' : 'Saved'}</span><AppButton disabled={busy || !dirty} onClick={() => void saveEditor()}>Save prose</AppButton><AppButton static disabled={busy} onClick={() => void download()}>{dirty ? 'Save and export' : 'Export Markdown'}</AppButton></div><textarea aria-label="Output prose" value={editor} onChange={event => { setEditor(event.target.value); editorRef.current = event.target.value; editorEpoch.current++; setDirty(true); dirtyRef.current = true; try { sessionStorage.setItem(`kr-recovery:${state?.workspace.id}:${outputId}`, JSON.stringify({ prose: event.target.value, hash: context.output.hash, contextHash: context.contextHash })); } catch { setMessage('Recovery storage is unavailable. Keep this tab open until your prose is saved.'); } }} maxLength={80000} rows={24} /><details><summary>Markdown preview</summary><MarkdownPreview prose={editor} /></details>{external && <div className="kr-conflict"><h3>Another client saved a revision</h3><p>Your edits remain in the editor. Read the saved version, reconcile, then retry.</p><pre>{external.output.body}</pre><AppButton static onClick={() => { setContext(external); hashRef.current = external.output.hash; contextHashRef.current = external.contextHash; setExternal(null); }}>Use current revision as save base</AppButton></div>}</div><aside className="kr-panel"><h2>Selected voice</h2><p>{entityName(context.voice)} · v{String(context.voice.version)}</p><p>{context.author ? entityName(context.author) : 'No author overlay'}</p><details><summary>Exact rules</summary><pre>{context.voice.body}</pre><pre>{context.author?.body}</pre></details><h3>Revision history</h3>{context.revisions.map(value => <AppButton static key={String(value.id)} onClick={() => void readHistory(String(value.id), String(value.proseHash))}>{String(value.provenance)} · {String(value.created)}</AppButton>)}{revisionText !== null && <pre>{revisionText}</pre>}<WritingPanel key={outputId} active={deskView === 'write'} scope={outputId!} scopeKind="output" mode={piece?.mode === 'fast' ? 'fast' : 'guided'} onCommitted={refresh} /><div className="kr-toolbar kr-assistant-tools"><Link href="/kessel-run/settings">API & agent settings</Link><AppButton static onClick={() => void refresh().catch(error => setMessage(error.message))}>Refresh saved activity</AppButton></div></aside></section><ReviewDecisions context={context} state={state} dirty={dirty} onChanged={refresh} /></div>}

      {publication && !piece && view !== 'voices' && <section className="kr-panel kr-voice-summary"><div><h2>Publication voice</h2><p>{defaultVoice ? `${entityName(defaultVoice)} · v${String(defaultVoice.version)}` : 'No approved default voice yet.'}</p><p>Each output keeps its selected voice version.</p></div><div className="kr-toolbar"><Link href={`/kessel-run/voices?publication=${publication.id}`}>Manage voice</Link><AppButton static disabled={busy || Boolean(pendingOperation)} onClick={() => open('publication-update')}>Publication settings</AppButton><AppButton static disabled={busy || Boolean(pendingOperation)} onClick={() => setShowPresets(value => !value)} aria-expanded={showPresets}>Format presets</AppButton></div></section>}
      {state && !piece && !output && view !== 'voices' && <>
        {!publication && view === 'overview' && <section><h2>Publications</h2><div className="kr-grid">{state.publications.map(value => <Link className="kr-card" key={String(value.id)} href={`/kessel-run/publications/${value.id}`}><BookOpen size={20} aria-hidden="true" /><h3>{entityName(value)}</h3><p>{value.body || 'A home for your writing.'}</p><p>{state.pieces.filter(item => item.publicationId === value.id).length} {state.pieces.filter(item => item.publicationId === value.id).length === 1 ? 'piece' : 'pieces'} · {state.outputs.filter(item => item.publicationId === value.id).length} {state.outputs.filter(item => item.publicationId === value.id).length === 1 ? 'output' : 'outputs'}</p></Link>)}</div>{!state.publications.length && <p className="kr-empty">Create your first publication to give your writing a home.</p>}</section>}
        {view === 'content' && <section className="kr-toolbar" aria-label="Content filters"><Field label="Publication"><select disabled={filterPending} value={publicationFilter} onChange={event => changeFilter('publication', event.target.value)}><option value="all">All publications</option>{!state.publications.some(value => value.id === publicationFilter) && publicationFilter !== 'all' && <option value={publicationFilter}>Unavailable publication</option>}{state.publications.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field><Field label="Output status"><select disabled={filterPending} value={statusFilter} onChange={event => changeFilter('status', event.target.value)}><option value="all">All statuses</option><option value="ideas">Ideas · no outputs</option><option value="drafting">Drafting</option><option value="review">Review</option><option value="accepted">Ready · approved for export</option>{!['all', 'ideas', 'drafting', 'review', 'accepted'].includes(statusFilter) && <option value={statusFilter}>Unavailable status</option>}</select></Field>{(publicationFilter !== 'all' || statusFilter !== 'all') && <Link href="/kessel-run/content">Reset filters</Link>}</section>}
        <ProgressBoard items={progress} filtered={publicationFilter !== 'all' || statusFilter !== 'all'} />
        {!piece && view === 'overview' && <HandoffImport workspaceHash={state.workspace.hash} empty={state.publications.length === 0} onChanged={refresh} />}
      </>}
  </>;
}
