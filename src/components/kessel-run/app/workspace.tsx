'use client';
import { DictationComposer, type ComposerHandle } from './dictation-composer';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button as BaseButton } from '@base-ui/react/button';
import { BookOpen, FileText, Settings, Feather } from 'lucide-react';
import { localApi, getWorkspaceReference, setWorkspaceReference } from '@/lib/kessel-run/local-api';
import type { Entity, OutputContext, WorkspaceOverview } from '@/lib/kessel-run/app-contracts';
import { acknowledgeSave } from './editor-state';
import { WritingPanel } from './writing-panel';
import { MarkdownPreview } from './markdown-preview';
import { ReviewDecisions } from './review-decisions';
import { VoiceStudio } from './voice-studio';
import { HandoffImport } from './handoff-import';

export function AppButton({ static: stationary = false, ...props }: React.ComponentProps<typeof BaseButton> & { static?: boolean }) {
  return <BaseButton {...props} className={`kr-action ${props.className ?? ''}`} data-static={stationary || undefined} />;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="kr-field"><span>{label}</span>{children}</label>;
}
function entityName(entity?: Entity) { return String(entity?.title ?? ''); }

export function WritingWorkspace({ publicationId, pieceId, outputId }: { publicationId?: string; pieceId?: string; outputId?: string }) {
  const [state, setState] = useState<WorkspaceOverview | null>(null);
  const [context, setContext] = useState<OutputContext | null>(null);
  const [materials, setMaterials] = useState<{ sources: Entity[]; artifacts: Entity[] } | null>(null);
  const [message, setMessage] = useState('Loading your workspace…');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'workspace' | 'publication' | 'publication-update' | 'preset-update' | 'profile' | 'piece' | 'output' | 'source' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const sourceComposer = useRef<ComposerHandle>(null);
  const [formIdentity, setFormIdentity] = useState('');
  const [cleanupSource, setCleanupSource] = useState('saved');
  const [cleanupModel, setCleanupModel] = useState('gpt-5-mini');
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
  const [dirty, setDirty] = useState(false);
  const [external, setExternal] = useState<OutputContext | null>(null);
  const dirtyRef = useRef(false);
  const hashRef = useRef<string | null>(null);
  const contextHashRef = useRef<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revisionText, setRevisionText] = useState<string | null>(null);
  const workspaceReady = state !== null;

  async function refresh(allowWorkspaceChange = false) {
    const next = await localApi<WorkspaceOverview>('workspace');
    if (getWorkspaceReference() && getWorkspaceReference() !== next.workspace.id && !allowWorkspaceChange) throw new Error('Workspace selection changed. Your previous editor buffer remains recoverable. Reload this tab to enter the newly selected workspace.');
    setWorkspaceReference(String(next.workspace.id));
    setState(next);
    const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
    if (selectedPiece) setMaterials(await localApi('content', { action: 'piece-context', input: { pieceId: selectedPiece } }));
    if (outputId) {
      const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
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
      const next = await localApi<WorkspaceOverview>('workspace', undefined, controller.signal);
      if (!mounted) return;
      if (getWorkspaceReference() && getWorkspaceReference() !== next.workspace.id) throw new Error('Workspace selection changed. Reload this tab before editing.');
      setWorkspaceReference(String(next.workspace.id));
      setState(next); setMessage('Ready. Manual writing needs no API key.');
      const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
      if (selectedPiece) {
        const material = await localApi<{ sources: Entity[]; artifacts: Entity[] }>('content', { action: 'piece-context', input: { pieceId: selectedPiece } }, controller.signal);
        if (!mounted) return;
        setMaterials(material);
      }
      if (outputId) {
        const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } }, controller.signal);
        if (!mounted) return;
        let recovered: { prose: string; hash: string; contextHash: string } | null = null;
        try { recovered = JSON.parse(sessionStorage.getItem(`kr-recovery:${next.workspace.id}:${outputId}`) ?? 'null'); } catch { /* Keep canonical content when the recovery buffer is invalid. */ }
        const prose = recovered?.prose ?? saved.output.body;
        dirtyRef.current = Boolean(recovered); setDirty(Boolean(recovered));
        const base = recovered ? { ...saved, contextHash: recovered.contextHash, output: { ...saved.output, hash: recovered.hash } } : saved;
        setContext(base); setEditor(prose); editorRef.current = prose; hashRef.current = base.output.hash; contextHashRef.current = base.contextHash;
        if (recovered && (recovered.hash !== saved.output.hash || recovered.contextHash !== saved.contextHash)) setExternal(saved);
      }
    }
    void initialize().catch(error => { if (mounted) setMessage(error.message); });
    return () => { mounted = false; controller.abort(); };
  }, [outputId, pieceId]);

  useEffect(() => {
    if (!workspaceReady) return;
    let active = true; let pending = false;
    const poll = setInterval(() => {
      if (pending) return;
      pending = true;
      void localApi<WorkspaceOverview>('workspace').then(async next => {
        if (!active) return;
        if (getWorkspaceReference() !== next.workspace.id) throw new Error('Workspace selection changed. Unsaved prose remains in its previous workspace buffer; reload this tab before editing.');
        setState(next);
        const selectedPiece = pieceId ?? next.outputs.find(value => value.id === outputId)?.pieceId;
        if (selectedPiece) {
          const material = await localApi<{ sources: Entity[]; artifacts: Entity[] }>('content', { action: 'piece-context', input: { pieceId: selectedPiece } });
          if (active) setMaterials(material);
        }
        if (!outputId) return;
        const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
        if (!active) return;
        if (dirtyRef.current) {
          if (hashRef.current !== saved.output.hash || contextHashRef.current !== saved.contextHash) setExternal(saved);
        } else {
          setContext(saved); setEditor(saved.output.body); editorRef.current = saved.output.body;
          hashRef.current = saved.output.hash; contextHashRef.current = saved.contextHash;
        }
      }).catch(error => { if (active) setMessage(error.message); }).finally(() => { pending = false; });
    }, 1500);
    return () => { active = false; clearInterval(poll); };
  }, [workspaceReady, outputId, pieceId]);

  const output = state?.outputs.find(value => value.id === outputId);
  const piece = state?.pieces.find(value => value.id === (pieceId ?? output?.pieceId));
  const publication = state?.publications.find(value => value.id === (publicationId ?? piece?.publicationId));
  const voices = state?.profiles.filter(value => value.publicationId === publication?.id && value.scope === 'publication' && value.status === 'approved') ?? [];
  const authors = state?.profiles.filter(value => value.publicationId === publication?.id && value.scope === 'author' && value.status === 'approved') ?? [];
  const presets = state?.presets.filter(value => value.publicationId === publication?.id) ?? [];
  const pieces = state?.pieces.filter(value => publication ? value.publicationId === publication.id : filter === 'all' || value.publicationId === filter) ?? [];
  const outputs = state?.outputs.filter(value => (piece ? value.pieceId === piece.id : publication ? value.publicationId === publication.id : filter === 'all' || value.publicationId === filter) && (statusFilter === 'all' || value.status === statusFilter)) ?? [];

  function open(next: NonNullable<typeof form>) {
    setFormIdentity(crypto.randomUUID()); setForm(next); setTitle(''); setBody(''); setPreview(null); setAuthorId(crypto.randomUUID());
    setPreset(String(presets[0]?.id ?? ''));
    const defaultVoice = publication?.defaultVoice as { profileId: string; version: number } | null;
    setVoiceId(defaultVoice ? `${defaultVoice.profileId}:${defaultVoice.version}` : '');
    setAuthorPin('');
    if (next === 'publication-update') { setTitle(entityName(publication)); setBody(publication?.body ?? ''); }
    if (next === 'preset-update') { setTitle(entityName(presets[0])); setBody(presets[0]?.body ?? ''); }
  }
  function pin(value: string) { const [profileId, version] = value.split(':'); return { profileId, version: Number(version) }; }
  async function submit() {
    setBusy(true);
    try {
      const operationId = crypto.randomUUID();
      if (form === 'workspace') await localApi('workspace', { operationId, root, title });
      else if (form === 'publication') await localApi('content', { action: 'publication', input: { operationId, expectedHash: state?.workspace.hash, title, purpose: body, presets: ['Article', 'Short post'] } });
      else if (form === 'publication-update') await localApi('content', { action: form, input: { operationId, expectedHash: publication?.hash, publicationId: publication?.id, title, purpose: body } });
      else if (form === 'preset-update') await localApi('content', { action: form, input: { operationId, expectedHash: presets.find(value => value.id === preset)?.hash, presetId: preset, title, instructions: body } });
      else if (form === 'profile') {
        const input = { publicationId: publication?.id, prose: body, scope, parent: scope === 'author' ? pin(voiceId) : null, authorId: scope === 'author' ? authorId : null };
        if (!preview) {
          setPreview(await localApi('content', { action: 'profile-preview', input }));
          setMessage('Review the exact prose and added metadata, then confirm use.'); return;
        }
        await localApi('content', { action: 'profile-import', input: { ...input, operationId, expectedHash: preview.publicationHash, title, provenance: attribution } });
      } else if (form === 'piece') await localApi('content', { action: 'piece', input: { operationId, expectedHash: publication?.hash, publicationId: publication?.id, title, brief: body, mode } });
      else if (form === 'output') await localApi('content', { action: 'output', input: { operationId, expectedHash: piece?.hash, pieceId: piece?.id, title, format: String(presets.find(value => value.id === preset)?.format ?? ''), preset, voice: pin(voiceId), author: authorPin ? pin(authorPin) : null } });
      else if (form === 'source') await localApi('content', { action: 'source', input: { operationId, expectedHash: piece?.hash, pieceId: piece?.id, title, body: sourceComposer.current?.freeze() ?? body, dictation: sourceComposer.current?.provenance(), attribution, sourceType, referenceUrl: null } });
      setForm(null); await refresh(form === 'workspace'); setMessage('Saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed. Your input remains here.'); }
    finally { setBusy(false); }
  }
  async function saveEditor() {
    if (!context || !outputId) return;
    setBusy(true); setMessage('Saving…');
    const submitted = editorRef.current;
    try {
      const receipt = await localApi<{ hash: string; contextHash: string; revision: string }>('content', { action: 'editor', input: { operationId: crypto.randomUUID(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, prose: submitted } });
      const saved = await localApi<OutputContext>('content', { action: 'context', input: { outputId } });
      const acknowledged = acknowledgeSave(submitted, editorRef.current, receipt.hash, receipt.contextHash);
      const intervened = saved.output.hash !== receipt.hash || saved.contextHash !== receipt.contextHash;
      dirtyRef.current = acknowledged.dirty || intervened; setDirty(dirtyRef.current);
      setContext(intervened ? { ...context, contextHash: receipt.contextHash, output: { ...context.output, hash: receipt.hash, body: submitted, currentRevision: receipt.revision } } : saved);
      hashRef.current = acknowledged.baseHash; contextHashRef.current = receipt.contextHash; setExternal(intervened ? saved : null);
      if (!dirtyRef.current) sessionStorage.removeItem(`kr-recovery:${state?.workspace.id}:${outputId}`);
      else sessionStorage.setItem(`kr-recovery:${state?.workspace.id}:${outputId}`, JSON.stringify({ prose: editorRef.current, hash: receipt.hash, contextHash: receipt.contextHash }));
      setMessage(acknowledged.dirty ? 'Earlier text saved. Your newer edits still need saving.' : 'Saved.');
    } catch (error) { setMessage(error instanceof Error ? `${error.message} Your unsaved prose is retained in the editor.` : 'Save failed. Your prose remains in the editor.'); }
    finally { setBusy(false); }
  }
  async function download() {
    try {
      const exported = await localApi<{ filename: string; handoff: string }>('content', { action: 'export', input: { outputId } });
      const url = URL.createObjectURL(new Blob([exported.handoff], { type: 'text/markdown;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = exported.filename; anchor.click(); URL.revokeObjectURL(url);
      setMessage('Exported saved prose and Markdown handoff.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); }
  }

  return <main className="kr-app">
    <aside className="kr-sidebar"><Link href="/kessel-run" className="kr-brand"><Feather size={23} />Kessel Run</Link><p>Your editorial workspace</p><nav aria-label="Workspace"><Link href="/kessel-run"><BookOpen size={18} />Overview</Link><Link href="/kessel-run/settings"><Settings size={18} />API & agent settings</Link></nav><div className="kr-sidebar-bottom">Local first<br />Your words, your workspace</div></aside>
    <div className="kr-main"><header className="kr-heading"><div><p className="kr-eyebrow">{output ? 'Writing desk' : publication ? 'Publication' : 'Workspace'}</p><h1>{entityName(output ?? piece ?? publication) || 'Your writing, in one place'}</h1><p>{publication ? publication.body : 'Publications, voices and independent outputs.'}</p></div><div className="kr-toolbar">{state && !publication && <><AppButton onClick={() => open('publication')}>New publication</AppButton><AppButton static onClick={() => open('workspace')}>Choose folder</AppButton></>}{publication && <AppButton onClick={() => open('piece')}>New piece</AppButton>}{piece && <AppButton onClick={() => open('output')}>Add output / repurpose</AppButton>}</div></header>
      <p className="kr-status" role="status" aria-live="polite">{message}</p>
      {!state && <section className="kr-panel"><h2>Choose a new workspace</h2><p>Pair this browser through the launcher link in API settings. Choose an empty folder for new app content; existing notes are imported explicitly.</p><AppButton onClick={() => open('workspace')}>Choose folder</AppButton><Link href="/kessel-run/settings">Pair browser / API settings</Link></section>}
      {form && <fieldset disabled={busy} className="kr-panel kr-form" aria-label={`New ${form}`}><h2>{form === 'profile' ? 'Import a voice' : `New ${form}`}</h2><Field label="Title"><input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={Boolean(preview)} /></Field>
        {form === 'workspace' && <Field label="Empty folder path"><input value={root} onChange={event => setRoot(event.target.value)} /></Field>}
        {['publication', 'publication-update', 'preset-update', 'profile', 'piece'].includes(form) && <Field label={form === 'profile' ? 'Exact profile prose (Markdown)' : form === 'source' ? 'Supplied notes, including questions and answers' : 'Purpose or brief'}><textarea value={body} onChange={event => { setBody(event.target.value); setPreview(null); }} rows={9} maxLength={80000} /></Field>}
        {form === 'piece' && <Field label="Writing mode"><select value={mode} onChange={event => setMode(event.target.value)}><option value="guided">Guided · collaborate section by section</option><option value="fast">Fast · complete draft with gaps marked</option></select></Field>}
        {form === 'profile' && <><Field label="Profile scope"><select value={scope} onChange={event => { setScope(event.target.value); setPreview(null); }}><option value="publication">Publication voice</option><option value="author">Author overlay</option></select></Field>{scope === 'author' && <p>Use the title to name this author overlay. Its identity is retained automatically.</p>}</>}
        {(form === 'output' || (form === 'profile' && scope === 'author')) && <Field label="Exact publication voice"><select value={voiceId} onChange={event => { setVoiceId(event.target.value); setPreview(null); }}><option value="">Choose a version</option>{voices.map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{entityName(value)} · v{String(value.version)}</option>)}</select></Field>}
        {form === 'output' && <><Field label="Format preset"><select value={preset} onChange={event => setPreset(event.target.value)}>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field><Field label="Author overlay"><select value={authorPin} onChange={event => setAuthorPin(event.target.value)}><option value="">No author overlay</option>{authors.map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{entityName(value)} · v{String(value.version)}</option>)}</select></Field></>}
        {form === 'source' && <><Field label="Cleanup credential source"><select value={cleanupSource} onChange={event => setCleanupSource(event.target.value)}><option value="saved">Saved local API key</option><option value="environment">Server environment key</option></select></Field><Field label="Cleanup model"><select value={cleanupModel} onChange={event => setCleanupModel(event.target.value)}><option>gpt-5-mini</option><option>gpt-5</option></select></Field><DictationComposer key={String(state?.workspace.id) + String(piece?.id) + formIdentity} value={body} onChange={setBody} scope={String(piece?.id)} scopeKind="source" source={cleanupSource} model={cleanupModel} handle={sourceComposer} limit={80000} disabled={busy} label="Supplied notes, including questions and answers" action={<AppButton disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : 'Save source'}</AppButton>} /><p>Saved body is author-reviewed mixed typed, dictated and edited text. Raw recognition, when present, is retained separately and can contain errors.</p></>}
        {form === 'preset-update' && <Field label="Preset"><select value={preset} onChange={event => { setPreset(event.target.value); const selected = presets.find(value => value.id === event.target.value); setTitle(entityName(selected)); setBody(selected?.body ?? ''); }}>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field>}{form === 'source' && <Field label="Source type"><select value={sourceType} onChange={event => setSourceType(event.target.value)}><option value="notes">Notes</option><option value="interview">Interview</option><option value="supplied-text">Supplied text</option></select></Field>}
        {(form === 'profile' || form === 'source') && <Field label="Attribution / provenance"><input value={attribution} onChange={event => setAttribution(event.target.value)} /></Field>}
        {preview && <div><h3>Added metadata preview</h3><pre>{JSON.stringify(preview.addedMetadata, null, 2)}</pre><p>The profile prose above is preserved verbatim. Sparse profiles are valid.</p></div>}
        <div className="kr-toolbar">{form !== 'source' && <AppButton disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : form === 'profile' ? preview ? 'Confirm use of this profile' : 'Preview import' : 'Save'}</AppButton>}<AppButton static onClick={() => { setForm(null); setPreview(null); }}>Cancel</AppButton></div></fieldset>}
      {publication && !output && <section className="kr-panel"><div className="kr-toolbar"><h2>Voice studio</h2><AppButton static onClick={() => open('publication-update')}>Publication settings</AppButton><AppButton static onClick={() => open('preset-update')}>Format presets</AppButton><AppButton onClick={() => open('profile')}>Import voice / author</AppButton></div><p>Use your existing starter profile. Each output keeps its selected version.</p><WritingPanel key={String(publication.id)} scope={String(publication.id)} scopeKind="voice" mode="guided" onCommitted={refresh} /><VoiceStudio publication={publication} profiles={state?.profiles.filter(value => value.publicationId === publication.id) ?? []} version={Number(state?.workspace.version ?? 0)} onChanged={refresh} /><div className="kr-grid">{state?.profiles.filter(value => value.publicationId === publication.id).map(value => <article key={`${value.id}:${value.version}`} className="kr-card"><h3>{entityName(value)} · v{String(value.version)}</h3><p>{String(value.scope)} · {String(value.status)} · {String(value.evidenceLevel)}</p><details><summary>Rules and provenance</summary><pre>{value.body}</pre><p>{String(value.provenance)}</p></details></article>)}</div></section>}
      {piece && <section className="kr-panel"><div className="kr-toolbar"><h2>Brief & supplied sources</h2><AppButton onClick={() => open('source')}>Add notes / interview</AppButton></div><pre>{piece.body}</pre><p>{String(piece.mode)} mode · Next: {String(piece.nextAction)}</p>{materials?.sources.map(value => <details key={String(value.id)}><summary>{entityName(value)} · {String(value.attribution)}</summary><p>Submitted source text</p><pre>{value.body}</pre>{!!value.dictation && <details><summary>Raw recognition (may contain errors)</summary><pre>{String((value.dictation as { recognizedText: string }).recognizedText)}</pre><p>Cleanup applied: {String((value.dictation as { cleanupApplied: boolean }).cleanupApplied)}</p></details>}</details>)}</section>}
      {context && state && <><ReviewDecisions context={context} state={state} dirty={dirty} onChanged={refresh} /><nav className="kr-tabs" aria-label="Independent outputs">{state?.outputs.filter(value => value.pieceId === context.output.pieceId).map(value => <Link aria-current={value.id === outputId ? 'page' : undefined} key={String(value.id)} href={`/kessel-run/outputs/${value.id}`}>{entityName(value)}</Link>)}</nav><section className="kr-desk"><div className="kr-paper"><div className="kr-toolbar"><h2>Markdown editor</h2><span>{dirty ? 'Unsaved changes' : 'Saved'}</span><AppButton disabled={busy || !dirty} onClick={() => void saveEditor()}>Save prose</AppButton><AppButton static onClick={() => void download()}>Export Markdown</AppButton></div><textarea aria-label="Output prose" value={editor} onChange={event => { setEditor(event.target.value); editorRef.current = event.target.value; setDirty(true); dirtyRef.current = true; try { sessionStorage.setItem(`kr-recovery:${state?.workspace.id}:${outputId}`, JSON.stringify({ prose: event.target.value, hash: context.output.hash, contextHash: context.contextHash })); } catch { setMessage('Recovery storage is unavailable. Keep this tab open until your prose is saved.'); } }} maxLength={80000} rows={24} /><details><summary>Markdown preview</summary><MarkdownPreview prose={editor} /></details>{external && <div className="kr-conflict"><h3>Another client saved a revision</h3><p>Your edits remain in the editor. Read the saved version, reconcile, then retry.</p><pre>{external.output.body}</pre><AppButton static onClick={() => { setContext(external); hashRef.current = external.output.hash; contextHashRef.current = external.contextHash; setExternal(null); }}>Use current revision as save base</AppButton></div>}</div><aside className="kr-panel"><h2>Selected voice</h2><p>{entityName(context.voice)} · v{String(context.voice.version)}</p><p>{context.author ? entityName(context.author) : 'No author overlay'}</p><details><summary>Exact rules</summary><pre>{context.voice.body}</pre><pre>{context.author?.body}</pre></details><h3>Revision history</h3>{context.revisions.map(value => <AppButton static key={String(value.id)} onClick={() => void localApi<{ prose: string }>('content', { action: 'revision', input: { outputId, revisionId: value.id } }).then(value => setRevisionText(value.prose)).catch(error => setMessage(error.message))}>{String(value.provenance)} · {String(value.created)}</AppButton>)}{revisionText !== null && <pre>{revisionText}</pre>}<WritingPanel key={outputId} scope={outputId!} scopeKind="output" mode={piece?.mode === 'fast' ? 'fast' : 'guided'} onCommitted={refresh} /><Link href="/kessel-run/settings">API & agent settings</Link><AppButton static onClick={() => void refresh().catch(error => setMessage(error.message))}>Refresh saved activity</AppButton></aside></section></>}
      {state && !output && <><HandoffImport workspaceHash={state.workspace.hash} empty={state.publications.length === 0} onChanged={refresh} /><div className="kr-toolbar">{!publication && <Field label="Publication"><select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All publications</option>{state.publications.map(value => <option key={String(value.id)} value={String(value.id)}>{entityName(value)}</option>)}</select></Field>}<Field label="Output status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="drafting">Drafting</option><option value="review">Review</option><option value="accepted">Accepted</option></select></Field></div>{!publication && <section><h2>Publications</h2><div className="kr-grid">{state.publications.map(value => <Link className="kr-card" key={String(value.id)} href={`/kessel-run/publications/${value.id}`}><BookOpen size={20} /><h3>{entityName(value)}</h3><p>{value.body || 'Add purpose and a voice to begin.'}</p></Link>)}</div>{!state.publications.length && <p className="kr-empty">Create your first publication, then import its voice.</p>}</section>}<section><h2>Pieces</h2><div className="kr-grid">{pieces.map(value => <Link className="kr-card" key={String(value.id)} href={`/kessel-run/pieces/${value.id}`}><FileText size={20} /><h3>{entityName(value)}</h3><p>{String(value.nextAction)}</p></Link>)}</div>{!pieces.length && <p className="kr-empty">No pieces yet. Start with a topic and supplied notes.</p>}</section><section><h2>Outputs</h2><div className="kr-grid">{outputs.map(value => <Link className="kr-card" key={String(value.id)} href={`/kessel-run/outputs/${value.id}`}><h3>{entityName(value)}</h3><p>{String(value.format)} · {String(value.status)}</p></Link>)}</div></section></>}
    </div>
  </main>;
}
