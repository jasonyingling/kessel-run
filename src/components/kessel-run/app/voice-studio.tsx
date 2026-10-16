'use client';
import { useEffect, useRef, useState } from 'react';
import type { Entity } from '@/lib/kessel-run/app-contracts';
import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
import { localApi } from '@/lib/kessel-run/local-api';
import { emptyPreferences, starterVoice, type StarterPreferences } from '@/lib/kessel-run/starter-voice';
import { AppButton } from './app-button';
import { Field } from './field';
import { MarkdownPreview } from './markdown-preview';
import { WritingPanel } from './writing-panel';
import { useStudioCommand } from './studio-command';
import { voiceDraft, type VoiceDraft as Draft } from './voice-draft';
import { studioLifetime } from './studio-ownership';
type PublicationContext = Awaited<ReturnType<WorkspaceService['getPublicationContext']>>;
const blank = (): Draft => ({ mode: null, title: '', prose: '', provenance: '', preferences: { ...emptyPreferences }, parent: '', authorId: '', preview: null });
const pin = (value: string) => { const [profileId, version] = value.split(':'); return { profileId, version: Number(version) }; };
const versionKey = (value: Entity) => `${value.id}:${value.version}`;

export function VoiceStudio({ publication, profiles, version, workspaceId, blocked = false, onChanged }: { publication: Entity; profiles: Entity[]; version: number; workspaceId: string; blocked?: boolean; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<'Profile' | 'Authors' | 'Evidence'>('Profile');
  const [draft, setDraft] = useState<Draft>(blank);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewOwner = useRef<ReturnType<typeof studioLifetime> | null>(null);
  const previewRequest = useRef<AbortController | null>(null);
  useEffect(() => { const owner = studioLifetime(); previewOwner.current = owner; return () => { owner.dispose(); previewRequest.current?.abort(); }; }, []);
  const [ai, setAi] = useState(false);
  const [context, setContext] = useState<PublicationContext | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [edit, setEdit] = useState<{ prose: string; evidence: string } | null>(null);
  const recoveryKey = `kr-studio-draft:${workspaceId}:${publication.id}`;
  const command = useStudioCommand(`${workspaceId}:voice-studio:${publication.id}`, onChanged);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (saved) { const value = voiceDraft.parse(JSON.parse(saved)); setDraft(value); }
      setRecoveryReady(true);
    } catch { command.setMessage('Your voice draft needs recovery. Keep this tab open and restore browser storage before editing.'); }
    });
    return () => { active = false; };
  // The component is keyed by publication and workspace; each draft belongs to one identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryKey]);
  useEffect(() => {
    let active = true;
    void localApi<PublicationContext>('content', { action: 'publication-context', input: { publicationId: publication.id } }).then(value => { if (active) setContext(value); }).catch(error => { if (active) command.setMessage(error.message); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publication.id, version]);
  function change(next: Draft) {
    // Persist before changing visible state; failure must not claim recoverability.
    try { sessionStorage.setItem(recoveryKey, JSON.stringify(next)); setDraft(next); }
    catch { command.setMessage('Draft recovery storage is unavailable. Keep this tab open and restore access before editing.'); }
  }
  function clearDraft() { sessionStorage.removeItem(recoveryKey); setDraft(blank()); }
  const voices = profiles.filter(value => value.scope === 'publication' && value.status === 'approved');
  const currentPin = publication.defaultVoice as { profileId: string; version: number } | null;
  const current = voices.find(value => value.id === currentPin?.profileId && value.version === currentPin?.version);
  const visible = profiles.filter(value => value.scope === (tab === 'Authors' ? 'author' : 'publication'));
  const selected = profiles.find(value => versionKey(value) === selectedKey) ?? (tab === 'Authors' ? visible.find(value => value.status === 'approved') : current);
  const disabled = blocked || command.busy || Boolean(command.pending) || previewBusy || !command.ready || !recoveryReady;
  function begin(mode: NonNullable<Draft['mode']>) {
    if (draft.mode) { command.setMessage('Finish or discard the recovered draft before starting another.'); return; }
    change({ ...blank(), mode, title: mode === 'author' ? '' : `${publication.title} voice`, provenance: mode === 'starter' ? 'User-authored preferences, explicitly confirmed.' : '', authorId: crypto.randomUUID(), parent: current ? versionKey(current) : '' });
  }
  async function preview() {
    const owner = previewOwner.current;
    if (!owner?.active()) return;
    const controller = new AbortController(); previewRequest.current = controller;
    setPreviewBusy(true);
    try {
      const next = await localApi<{ publicationHash: string }>('content', { action: 'profile-preview', input: { publicationId: publication.id, prose: draft.prose, scope: draft.mode === 'author' ? 'author' : 'publication', parent: draft.mode === 'author' ? pin(draft.parent) : null, authorId: draft.mode === 'author' ? draft.authorId : null } }, controller.signal);
      if (!owner.active() || controller.signal.aborted) return;
      change({ ...draft, preview: { publicationHash: next.publicationHash } }); command.setMessage('Review the exact text below. Confirm only when it reflects your preferences.');
    } catch (error) { if (owner.active() && !controller.signal.aborted) command.setMessage(error instanceof Error ? error.message : 'Preview failed. Your draft remains here.'); }
    finally { if (owner.active()) setPreviewBusy(false); }
  }
  async function confirm() {
    if (!draft.preview) return;
    await command.run('profile-import', { expectedHash: draft.preview.publicationHash, publicationId: publication.id, title: draft.title, prose: draft.prose, provenance: draft.provenance, scope: draft.mode === 'author' ? 'author' : 'publication', parent: draft.mode === 'author' ? pin(draft.parent) : null, authorId: draft.mode === 'author' ? draft.authorId : null }, clearDraft);
  }
  async function exportVersion(profile: Entity) {
    try {
      const exported = await localApi<Awaited<ReturnType<WorkspaceService['exportProfile']>>>('content', { action: 'profile-export', input: { publicationId: publication.id, profile: { profileId: profile.id, version: profile.version } } });
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `voice-${profile.id}-v${profile.version}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      command.setMessage('Exported this exact profile and its metadata. This is a standalone profile, not a workspace restoration.');
    } catch (error) { command.setMessage(error instanceof Error ? error.message : 'Export failed.'); }
  }
  return <section aria-label="Voice studio" className="kr-form kr-studio">
    <div><h2>Voice studio</h2><p>{current ? `Default: ${current.title} · v${current.version}` : 'No approved default voice yet.'}</p><p>Approval records your choice. Evidence maturity records the supplied evidence. Each output keeps its exact selected version.</p></div>
    <div className="kr-tabs" role="tablist" aria-label="Voice studio views">{(['Profile', 'Authors', 'Evidence'] as const).map((value, index) => <AppButton static key={value} type="button" style={{ textDecoration: tab === value ? 'underline' : undefined, textUnderlineOffset: '6px' }} role="tab" id={`studio-tab-${value}`} aria-selected={tab === value} aria-controls="studio-panel" tabIndex={tab === value ? 0 : -1} onClick={() => { setTab(value); setSelectedKey(''); setEdit(null); }} onKeyDown={event => { const tabs = ['Profile', 'Authors', 'Evidence'] as const; const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1; if (next >= 0) { event.preventDefault(); setTab(tabs[next]); setSelectedKey(''); setEdit(null); document.getElementById(`studio-tab-${tabs[next]}`)?.focus(); } }}>{value}</AppButton>)}</div>
    {command.pending && <section className="kr-panel"><h3>Resolve your pending voice save</h3><p>Your exact command is retained. Retry before starting a different save.</p><AppButton disabled={command.busy || blocked} onClick={() => void command.run(undefined, undefined, () => { if (command.pending?.body.action === 'profile-import') clearDraft(); })}>Retry voice submission</AppButton>{command.pending.failed && <AppButton static onClick={command.abandon}>Edit rejected voice submission</AppButton>}</section>}
    <div id="studio-panel" role="tabpanel" aria-labelledby={`studio-tab-${tab}`}>
      {tab !== 'Evidence' && <>
        <div className="kr-toolbar">{tab === 'Profile' ? <><AppButton disabled={disabled || Boolean(draft.mode)} onClick={() => begin('starter')}>Write a starter voice</AppButton><AppButton disabled={disabled || Boolean(draft.mode)} onClick={() => begin('import')}>Import an existing profile</AppButton><AppButton static className="kr-secondary" disabled={disabled} onClick={() => setAi(value => !value)} aria-expanded={ai}>Get AI help</AppButton></> : <AppButton disabled={disabled || !voices.length || Boolean(draft.mode)} onClick={() => begin('author')}>Add author overlay</AppButton>}</div>
        {tab === 'Authors' && <p>{voices.length ? 'An author overlay adds differences to an exact approved publication voice version.' : 'Create or import an approved publication voice before adding an author overlay.'}</p>}
        {tab === 'Profile' && ai && <WritingPanel scope={String(publication.id)} scopeKind="voice" mode="guided" onCommitted={onChanged} />}
        {!visible.length && <p>{tab === 'Profile' ? 'Start with your own preferences or paste a profile you already have. No API key needed.' : 'No author overlays yet.'}</p>}
        {selected && <article className="kr-panel"><Field label="Selected voice version"><select value={versionKey(selected)} onChange={event => { setSelectedKey(event.target.value); setEdit(null); }}>{visible.map(value => <option key={versionKey(value)} value={versionKey(value)}>{String(value.title)} · v{String(value.version)} · {String(value.status)}</option>)}</select></Field><p>Approval: {String(selected.status)} · Evidence maturity: {String(selected.evidenceLevel)}</p>{selected.parent != null && <p>Exact publication parent: {String((selected.parent as { profileId: string }).profileId)} · v{String((selected.parent as { version: number }).version)}</p>}<MarkdownPreview prose={selected.body} /><div className="kr-toolbar"><AppButton static onClick={() => void exportVersion(selected)}>Export selected profile</AppButton>{selected.status === 'approved' && <AppButton static disabled={disabled} onClick={() => setEdit({ prose: selected.body, evidence: '' })}>Propose changes to this version</AppButton>}</div>{edit && <fieldset disabled={disabled} className="kr-form"><Field label="Proposed rules"><textarea rows={10} maxLength={80000} value={edit.prose} onChange={event => setEdit({ ...edit, prose: event.target.value })} /></Field><Field label="Why these changes / supplied evidence"><textarea value={edit.evidence} maxLength={12000} onChange={event => setEdit({ ...edit, evidence: event.target.value })} /></Field><AppButton disabled={!edit.prose.trim() || !edit.evidence.trim()} onClick={() => void command.run('profile-propose', { expectedHash: publication.hash, publicationId: publication.id, title: selected.title, scope: selected.scope, authorId: selected.authorId, parent: selected.parent, prior: { profileId: selected.id, version: selected.version }, prose: edit.prose, evidence: edit.evidence }, () => setEdit(null))}>Propose new profile version</AppButton></fieldset>}</article>}
      </>}
      {tab === 'Evidence' && <section className="kr-form"><h3>Supplied evidence and provenance</h3>{!profiles.length && <p>No stored profile evidence yet. A starter voice records your preferences with sparse evidence maturity.</p>}{profiles.map(value => <article className="kr-panel" key={versionKey(value)}><h4>{String(value.title)} · v{String(value.version)}</h4><p>{String(value.status)} · {String(value.evidenceLevel)} evidence maturity</p><pre>{String(value.provenance) || 'No provenance supplied.'}</pre></article>)}</section>}
    </div>
    {draft.mode && <fieldset disabled={disabled} className="kr-panel kr-form" aria-label="Voice draft"><h3>{draft.mode === 'starter' ? 'Your starter preferences' : draft.mode === 'author' ? 'Import an author overlay' : 'Import a voice profile'}</h3><Field label="Profile title"><input maxLength={160} value={draft.title} onChange={event => change({ ...draft, title: event.target.value, preview: null })} /></Field>
      {draft.mode === 'starter' && !draft.prose && <>{(Object.keys(emptyPreferences) as (keyof StarterPreferences)[]).map(key => <Field key={key} label={{ reader: 'Desired reader experience', tone: 'Tone and opinion level', phrases: 'Phrases to use or avoid', rules: 'Other rules or preferences' }[key]}><textarea maxLength={18000} value={draft.preferences[key]} onChange={event => change({ ...draft, preferences: { ...draft.preferences, [key]: event.target.value } })} /></Field>)}<p>Skip any field. Only words you supply become preferences.</p><AppButton disabled={!starterVoice(draft.preferences)} onClick={() => change({ ...draft, prose: starterVoice(draft.preferences) })}>Review exact preferences</AppButton></>}
      {(draft.mode !== 'starter' || Boolean(draft.prose)) && <><Field label="Exact profile prose (Markdown)"><textarea rows={12} maxLength={80000} value={draft.prose} onChange={event => change({ ...draft, prose: event.target.value, preview: null })} /></Field>{draft.mode === 'author' && <Field label="Exact publication parent"><select value={draft.parent} onChange={event => change({ ...draft, parent: event.target.value, preview: null })}><option value="">Choose an approved version</option>{voices.map(value => <option key={versionKey(value)} value={versionKey(value)}>{String(value.title)} · v{String(value.version)}</option>)}</select></Field>}<Field label="Profile provenance"><textarea maxLength={12000} value={draft.provenance} onChange={event => change({ ...draft, provenance: event.target.value, preview: null })} /></Field>{draft.preview && <section><h4>Confirm these exact words</h4><pre>{draft.prose}</pre><p>This creates approved version 1 with sparse evidence maturity. {draft.mode === 'author' ? 'The exact parent shown above is retained.' : 'It becomes the default for new outputs. Existing output pins stay unchanged.'}</p></section>}<AppButton disabled={!draft.title.trim() || !draft.prose.trim() || !draft.provenance.trim() || (draft.mode === 'author' && !draft.parent)} onClick={() => void (draft.preview ? confirm() : preview())}>{draft.preview ? draft.mode === 'starter' ? 'Use these exact preferences' : 'Confirm use of this profile' : draft.mode === 'starter' ? 'Preview preferences' : 'Preview import'}</AppButton></>}
      <AppButton static onClick={clearDraft}>Discard voice draft</AppButton><p>This draft is recovered in this browser tab after navigation. Discard removes it.</p>
    </fieldset>}
    <details><summary>History and proposals ({context?.proposals.filter(value => value.proposal.state === 'pending').length ?? 0} pending)</summary><p>Approved versions stay unchanged. Proposed rules need a separate human decision.</p>{context?.proposals.filter(value => value.proposal.state === 'pending').map(value => <article className="kr-panel" key={String(value.proposal.id)}><h3>{String(value.profile.title)} · proposed v{String(value.profile.version)}</h3><h4>Previously approved rules</h4><MarkdownPreview prose={profiles.find(profile => profile.id === (value.profile.previousVersion as { profileId?: string } | null)?.profileId && profile.version === (value.profile.previousVersion as { version?: number } | null)?.version)?.body ?? 'No earlier approved version.'} /><h4>Proposed rules</h4><MarkdownPreview prose={value.profile.body} /><pre>{String(value.proposal.evidence)}</pre><p>{String(value.profile.scope)} · {String(value.profile.evidenceLevel)} evidence maturity</p><div className="kr-toolbar">{[true, false].map(accept => <AppButton key={String(accept)} static={!accept} disabled={disabled} onClick={() => void command.run('profile-decision', { publicationId: publication.id, expectedHash: publication.hash, proposalId: value.proposal.id, expectedProfileHash: value.profile.hash, accept })}>{accept ? 'Approve these exact rules' : 'Reject profile proposal'}</AppButton>)}</div></article>)}{profiles.map(value => <p key={versionKey(value)}>{String(value.title)} · v{String(value.version)} · {String(value.status)} · {String(value.evidenceLevel)} evidence</p>)}</details>
    <p role="status">{command.message}</p>
  </section>;
}
