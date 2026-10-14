'use client';
import { useEffect, useRef, useState } from 'react';
import type { OutputContext, WorkspaceOverview } from '@/lib/kessel-run/app-contracts';
import { localApi } from '@/lib/kessel-run/local-api';
import { AppButton } from './workspace';
import { MarkdownPreview } from './markdown-preview';

type Rule = { text: string; evidence: string };
export function ReviewDecisions({ context, state, dirty, onChanged }: { context: OutputContext; state: WorkspaceOverview; dirty: boolean; onChanged: () => Promise<void> }) {
  const [candidates, setCandidates] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<Record<string, number[]>>({});
  const [machineId, setMachineId] = useState('');
  const [pair, setPair] = useState<{ machineId: string; finalId: string; machine: string; final: string } | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, { machine: string; final: string }>>({});
  const comparisonEpoch = useRef(0);
  const [rules, setRules] = useState<Rule[]>([{ text: '', evidence: '' }]);
  const [target, setTarget] = useState('publication');
  const [message, setMessage] = useState('Draft use, final acceptance and lessons are separate decisions.');
  const [busy, setBusy] = useState(false);
  const outputId = String(context.output.id);
  useEffect(() => {
    let active = true;
    async function load() {
      const pairs = await Promise.all(context.pending.filter(value => value.kind === 'draft').map(async value => {
        const payload = value.payload as { revisionId: string };
        const revision = await localApi<{ prose: string }>('content', { action: 'revision', input: { outputId, revisionId: payload.revisionId } });
        return [String(value.id), revision.prose] as const;
      }));
      if (active) setCandidates(Object.fromEntries(pairs));
      const comparisons = await Promise.all(context.pending.filter(value => value.kind === 'lessons').map(async value => {
        const payload = value.payload as { machineRevisionId: string; finalRevisionId: string };
        const [machine, final] = await Promise.all([payload.machineRevisionId, payload.finalRevisionId].map(revisionId => localApi<{ prose: string }>('content', { action: 'revision', input: { outputId, revisionId } })));
        return [String(value.id), { machine: machine.prose, final: final.prose }] as const;
      }));
      if (active) setComparisons(Object.fromEntries(comparisons));
    }
    void load().catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [context.pending, outputId]);
  useEffect(() => { comparisonEpoch.current++; }, [context.output.acceptedRevision]);
  async function act(action: string, input: Record<string, unknown>) {
    setBusy(true);
    try {
      await localApi('content', { action, input: { operationId: crypto.randomUUID(), expectedHash: context.output.hash, outputId, ...input } });
      await onChanged(); setSelection({}); setMessage('Human decision saved. Existing output pins remain unchanged.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Decision failed.'); }
    finally { setBusy(false); }
  }
  async function readPair(id: string) {
    setMachineId(id); setPair(null);
    if (!id || !context.output.acceptedRevision) return;
    const epoch = ++comparisonEpoch.current;
    const finalId = String(context.output.acceptedRevision);
    try {
      const [machine, final] = await Promise.all([id, finalId].map(revisionId => localApi<{ prose: string }>('content', { action: 'revision', input: { outputId, revisionId } })));
      if (epoch === comparisonEpoch.current) setPair({ machineId: id, finalId, machine: machine.prose, final: final.prose });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Comparison unavailable.'); }
  }
  return <section className="kr-panel"><h2>Review & acceptance</h2><p>Current output: {String(context.output.status)}. Acceptance targets one exact saved revision. Any prose edit invalidates it.</p>
    <AppButton disabled={busy || dirty || !context.output.currentRevision || context.output.status === 'accepted'} onClick={() => void act('final-accept', { expectedContextHash: context.contextHash, revisionId: context.output.currentRevision })}>Accept this exact final prose</AppButton>
    {dirty && <p>Save or reconcile your editor buffer before making an editorial decision.</p>}
    {context.pending.map(proposal => {
      const id = String(proposal.id);
      if (proposal.kind === 'draft') return <article key={id}><h3>Draft candidate</h3><MarkdownPreview prose={candidates[id] ?? 'Loading exact retained candidate…'} /><p>{String(proposal.evidence)}</p><div className="kr-toolbar"><AppButton disabled={busy || dirty || !candidates[id]} onClick={() => void act('draft-decision', { proposalId: id, expectedContextHash: context.contextHash, accept: true })}>Use candidate in editor</AppButton><AppButton static disabled={busy} onClick={() => void act('draft-decision', { proposalId: id, expectedContextHash: context.contextHash, accept: false })}>Reject candidate</AppButton></div></article>;
      if (proposal.kind !== 'lessons') return null;
      const payload = proposal.payload as { rules: Rule[]; profile: { profileId: string; version: number }; scope: string; machineRevisionId: string; finalRevisionId: string };
      const approvedPin = (proposal.approvedProfile ?? payload.profile) as { profileId: string; version: number };
      const profile = state.profiles.find(value => value.id === approvedPin.profileId && value.version === approvedPin.version);
      const decisions = (proposal.ruleDecisions ?? {}) as Record<string, boolean>;
      const selected = selection[id] ?? [];
      const decide = (accept: boolean) => act('lessons-decision', { proposalId: id, expectedProposalHash: proposal.hash, expectedProfileHash: profile?.hash, decisions: selected.map(index => ({ index, accept })) });
      return <article key={id}><h3>{payload.scope === 'author' ? 'Author-only' : 'Publication'} lesson proposals</h3><details><summary>Exact retained comparison and target rules</summary><h4>Machine draft</h4><pre>{comparisons[id]?.machine ?? 'Loading exact draft…'}</pre><h4>Accepted final</h4><pre>{comparisons[id]?.final ?? 'Loading exact final…'}</pre><h4>Current approval base: v{String(approvedPin.version)}</h4><MarkdownPreview prose={profile?.body ?? 'Missing exact profile version'} /></details>{payload.rules.map((rule, index) => <label key={index} className="kr-lesson"><input type="checkbox" disabled={busy || String(index) in decisions} checked={selected.includes(index)} onChange={event => setSelection({ ...selection, [id]: event.target.checked ? [...selected, index] : selected.filter(value => value !== index) })} /><span>{rule.text}<br /><small>Evidence: {rule.evidence}{String(index) in decisions ? decisions[String(index)] ? ' · Approved' : ' · Rejected' : ' · Pending'}</small></span></label>)}<div className="kr-toolbar"><AppButton disabled={busy || !selected.length || !comparisons[id]} onClick={() => void decide(true)}>Approve selected lessons</AppButton><AppButton static disabled={busy || !selected.length} onClick={() => void decide(false)}>Reject selected lessons</AppButton></div></article>;
    })}
    {Boolean(context.output.acceptedRevision) && <details><summary>Propose lessons from a retained comparison</summary><label className="kr-field">Machine draft<select value={machineId} onChange={event => void readPair(event.target.value)}><option value="">Choose the exact draft</option>{context.revisions.filter(value => value.provenance !== 'human').map(value => <option key={String(value.id)} value={String(value.id)}>{String(value.provenance)} · {String(value.created)}</option>)}</select></label>{pair && pair.machineId === machineId && pair.finalId === context.output.acceptedRevision && <div className="kr-grid"><div><h3>Exact machine draft</h3><pre>{pair.machine}</pre></div><div><h3>Exact accepted final</h3><pre>{pair.final}</pre></div></div>}<label className="kr-field">Lesson scope<select value={target} onChange={event => setTarget(event.target.value)}><option value="publication">Publication voice</option>{context.author && <option value="author">This author overlay only</option>}</select></label>{rules.map((rule, index) => <div className="kr-form" key={index}><label className="kr-field">Proposed rule<input value={rule.text} maxLength={4000} onChange={event => setRules(rules.map((value, position) => position === index ? { ...value, text: event.target.value } : value))} /></label><label className="kr-field">Evidence from this exact comparison<textarea value={rule.evidence} maxLength={4000} onChange={event => setRules(rules.map((value, position) => position === index ? { ...value, evidence: event.target.value } : value))} /></label></div>)}<div className="kr-toolbar"><AppButton static disabled={rules.length >= 20} onClick={() => setRules([...rules, { text: '', evidence: '' }])}>Add lesson</AppButton><AppButton disabled={busy || !pair || pair.machineId !== machineId || pair.finalId !== context.output.acceptedRevision || rules.some(rule => !rule.text.trim() || !rule.evidence.trim())} onClick={() => void act('lessons-propose', { machineRevisionId: pair?.machineId, finalRevisionId: pair?.finalId, target, rules })}>Save lesson proposals for review</AppButton></div></details>}
    <p role="status">{message}</p>
  </section>;
}
