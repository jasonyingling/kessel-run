'use client';
import { useEffect, useState } from 'react';
import type { Entity } from '@/lib/kessel-run/app-contracts';
import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
import { localApi } from '@/lib/kessel-run/local-api';
import { AppButton } from './app-button';
import { MarkdownPreview } from './markdown-preview';
type PublicationContext = Awaited<ReturnType<WorkspaceService['getPublicationContext']>>;

export function VoiceStudio({ publication, profiles, version, onChanged }: { publication: Entity; profiles: Entity[]; version: number; onChanged: () => Promise<void> }) {
  const [context, setContext] = useState<PublicationContext | null>(null);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [prose, setProse] = useState('');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState('Profile edits become reviewable versions; earlier output pins stay exact.');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void localApi<PublicationContext>('content', { action: 'publication-context', input: { publicationId: publication.id } }).then(value => { if (active) setContext(value); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [publication.id, version]);
  async function act(action: string, input: Record<string, unknown>) {
    setBusy(true);
    try {
      await localApi('content', { action, input: { operationId: crypto.randomUUID(), publicationId: publication.id, expectedHash: publication.hash, ...input } });
      await onChanged(); setSelected(null); setMessage('Saved. Rules are approved only through a separate human decision.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Voice operation failed.'); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy} className="kr-voice-editor"><h3>Edit a voice version</h3><label className="kr-field">Approved version<select value={selected ? `${selected.id}:${selected.version}` : ''} onChange={event => { const value = profiles.find(value => `${value.id}:${value.version}` === event.target.value) ?? null; setSelected(value); setProse(value?.body ?? ''); setEvidence(''); }}><option value="">Choose a version to edit</option>{profiles.filter(value => value.status === 'approved').map(value => <option key={`${value.id}:${value.version}`} value={`${value.id}:${value.version}`}>{String(value.title)} · {String(value.scope)} · v{String(value.version)}</option>)}</select></label>{selected && <div className="kr-form"><label className="kr-field">Proposed rules<textarea value={prose} rows={12} maxLength={80000} onChange={event => setProse(event.target.value)} /></label><label className="kr-field">Why these changes / supplied evidence<textarea value={evidence} maxLength={12000} onChange={event => setEvidence(event.target.value)} /></label><AppButton disabled={busy || !prose.trim() || !evidence.trim()} onClick={() => void act('profile-propose', { title: selected.title, scope: selected.scope, authorId: selected.authorId, parent: selected.parent, prior: { profileId: selected.id, version: selected.version }, prose, evidence })}>Propose new profile version</AppButton></div>}
    {context?.proposals.filter(value => value.proposal.state === 'pending').map(value => {
      const priorPin = value.profile.previousVersion as { profileId: string; version: number } | null;
      const prior = priorPin ? profiles.find(profile => profile.id === priorPin.profileId && profile.version === priorPin.version) : null;
      return <article key={String(value.proposal.id)} className="kr-panel"><h3>{String(value.profile.title)} · proposed v{String(value.profile.version)}</h3><div className="kr-grid"><div><h4>Previously approved rules</h4><MarkdownPreview prose={prior?.body ?? 'No earlier version.'} /></div><div><h4>Proposed rules</h4><MarkdownPreview prose={value.profile.body} /></div></div><p>Evidence: {String(value.proposal.evidence)}</p><p>{String(value.profile.scope)} scope · {String(value.profile.evidenceLevel)} evidence maturity</p><div className="kr-toolbar"><AppButton disabled={busy} onClick={() => void act('profile-decision', { proposalId: value.proposal.id, expectedProfileHash: value.profile.hash, accept: true })}>Approve these exact rules</AppButton><AppButton static disabled={busy} onClick={() => void act('profile-decision', { proposalId: value.proposal.id, expectedProfileHash: value.profile.hash, accept: false })}>Reject profile proposal</AppButton></div></article>;
    })}<p role="status">{message}</p>
  </fieldset>;
}
