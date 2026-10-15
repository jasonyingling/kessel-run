import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceService } from './service';
import { exportOutput } from './import-export';
import { parseHandoff } from './handoff';

let folder: string;
let service: WorkspaceService;
let publicationId: string;
let pieceId: string;
let outputId: string;
let voiceId: string;
const operationId = () => crypto.randomUUID();
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kr-approval-'));
  service = new WorkspaceService(join(folder, 'content'), join(folder, 'private'));
  const home = await service.initialize({ operationId: operationId(), title: 'Synthetic approvals' });
  publicationId = String((await service.createPublication({ operationId: operationId(), expectedHash: home.hash, title: 'Synthetic publication', purpose: 'Supplied audience', presets: ['article', 'email'] })).id);
  let state = await service.overview();
  voiceId = String((await service.confirmProfileImport({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Publication voice', prose: 'Original exact rules.\n', scope: 'publication', parent: null, authorId: null, provenance: 'Human-confirmed synthetic fixture' })).id);
  state = await service.overview();
  pieceId = String((await service.createPiece({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Synthetic piece', brief: 'Supplied workshop brief', mode: 'fast' })).id);
  state = await service.overview();
  outputId = String((await service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId, title: 'Article', format: 'article', preset: 'article', voice: { profileId: voiceId, version: 1 }, author: null })).id);
});
afterEach(async () => { await rm(folder, { recursive: true, force: true }); });

async function acceptedPair(id = outputId) {
  let context = await service.getContext(id);
  const draft = await service.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: id, prose: 'Exact machine draft.\n', provenance: 'model', declaredModel: 'synthetic-model' });
  context = await service.getContext(id);
  await service.decideDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: id, proposalId: String(draft.proposalId), accept: true });
  context = await service.getContext(id);
  await service.saveEditor({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: id, prose: 'Exact human final.\n' });
  context = await service.getContext(id);
  const final = await service.acceptFinal({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: id, revisionId: String(context.output.currentRevision) });
  return { machineId: String(draft.candidateId), finalId: String(final.acceptedRevision) };
}
async function lessons(pair: { machineId: string; finalId: string }, target: 'publication' | 'author' = 'publication', id = outputId) {
  const context = await service.getContext(id);
  return service.proposeLessons({ operationId: operationId(), expectedHash: context.output.hash, outputId: id, machineRevisionId: pair.machineId, finalRevisionId: pair.finalId, target, rules: [
    { text: 'Accepted concrete rule', evidence: 'Exact comparison first change' },
    { text: 'Undecided second rule', evidence: 'Exact comparison second change' },
    { text: 'Rejected third rule', evidence: 'Exact comparison third change' },
  ] });
}
it('ties final acceptance to exact prose, preserves machine/final bytes and rejects stale candidate replacement', async () => {
  const pair = await acceptedPair();
  let context = await service.getContext(outputId);
  expect(context.output.status).toBe('accepted');
  await expect(service.acceptFinal({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, revisionId: pair.machineId })).rejects.toMatchObject({ code: 'CONFLICT' });
  const stale = await service.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, prose: 'Later proposed text', provenance: 'external-agent', declaredModel: null });
  context = await service.getContext(outputId);
  await service.saveEditor({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, prose: 'Later human changes' });
  context = await service.getContext(outputId);
  expect(context.output.acceptedRevision).toBeNull();
  await expect(service.decideDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, proposalId: String(stale.proposalId), accept: true })).rejects.toMatchObject({ code: 'CONFLICT' });
  expect((await service.getRevision(outputId, pair.machineId)).prose).toBe('Exact machine draft.\n');
  expect((await service.getRevision(outputId, pair.finalId)).prose).toBe('Exact human final.\n');
});
it('partially approves lessons, leaves other decisions alone and retains old output pins', async () => {
  const pair = await acceptedPair();
  const proposed = await lessons(pair);
  let context = await service.getContext(outputId);
  let proposal = context.pending.find(value => value.id === proposed.proposalId)!;
  const result = await service.decideLessons({ operationId: operationId(), expectedHash: context.output.hash, outputId, proposalId: String(proposed.proposalId), expectedProposalHash: proposal.hash, expectedProfileHash: context.voice.hash, decisions: [{ index: 0, accept: true }, { index: 2, accept: false }] });
  expect(result.state).toBe('pending');
  const state = await service.overview();
  const nextVoice = state.profiles.find(value => value.id === voiceId && value.version === 2)!;
  expect(nextVoice.body).toContain('Accepted concrete rule');
  expect(nextVoice.body).not.toContain('Undecided second rule');
  expect(nextVoice.body).not.toContain('Rejected third rule');
  context = await service.getContext(outputId);
  expect(context.output.voice).toEqual({ profileId: voiceId, version: 1 });
  expect(context.output.status).toBe('accepted');
  proposal = context.pending.find(value => value.id === proposed.proposalId)!;
  const finished = await service.decideLessons({ operationId: operationId(), expectedHash: context.output.hash, outputId, proposalId: String(proposed.proposalId), expectedProposalHash: proposal.hash, expectedProfileHash: nextVoice.hash, decisions: [{ index: 1, accept: false }] });
  expect(finished.state).toBe('accepted');
  const other = await service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId, title: 'Independent email', format: 'email', preset: 'email', voice: { profileId: voiceId, version: 2 }, author: null });
  expect((await service.getContext(String(other.id))).output.status).toBe('drafting');
  await expect(service.proposeLessons({ operationId: operationId(), expectedHash: context.output.hash, outputId, machineRevisionId: pair.finalId, finalRevisionId: pair.finalId, target: 'publication', rules: [{ text: 'Wrong pair', evidence: 'No machine draft' }] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
it('keeps author lessons scoped to the author and pinned publication parent', async () => {
  let state = await service.overview();
  const author = await service.confirmProfileImport({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Synthetic author', prose: 'Author-specific original rules', scope: 'author', authorId: operationId(), parent: { profileId: voiceId, version: 1 }, provenance: 'Synthetic human-confirmed author' });
  state = await service.overview();
  const output = await service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId, title: 'Author output', format: 'article', preset: 'article', voice: { profileId: voiceId, version: 1 }, author: { profileId: String(author.id), version: 1 } });
  const id = String(output.id);
  const pair = await acceptedPair(id);
  const proposed = await lessons(pair, 'author', id);
  const context = await service.getContext(id);
  const proposal = context.pending.find(value => value.id === proposed.proposalId)!;
  await service.decideLessons({ operationId: operationId(), expectedHash: context.output.hash, outputId: id, proposalId: String(proposed.proposalId), expectedProposalHash: proposal.hash, expectedProfileHash: context.author!.hash, decisions: [{ index: 0, accept: true }] });
  state = await service.overview();
  const updatedAuthor = state.profiles.find(value => value.id === author.id && value.version === 2)!;
  expect(updatedAuthor.parent).toEqual({ profileId: voiceId, version: 1 });
  expect(updatedAuthor.body).toContain('Accepted concrete rule');
  expect(state.publications[0].defaultVoice).toEqual({ profileId: voiceId, version: 1 });
  expect(state.profiles.find(value => value.id === voiceId)!.body).toBe('Original exact rules.\n');
  expect((await service.getContext(id)).output.author).toEqual({ profileId: author.id, version: 1 });
});
it('rejects stale approved bases without dropping newer rules and still permits rejection', async () => {
  const pair = await acceptedPair();
  const proposed = await lessons(pair);
  let state = await service.overview();
  const oldCandidate = await service.proposeProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Older candidate', scope: 'publication', authorId: null, parent: null, prior: { profileId: voiceId, version: 1 }, prose: 'Old proposal rules', evidence: 'Synthetic proposed change' });
  const newer = await service.proposeProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Newer candidate', scope: 'publication', authorId: null, parent: null, prior: { profileId: voiceId, version: 1 }, prose: 'Newer approved rules must survive', evidence: 'Synthetic reviewed change' });
  state = await service.overview();
  const candidate = state.profiles.find(value => value.id === voiceId && value.version === newer.version)!;
  await service.decideProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, proposalId: String(newer.proposalId), expectedProfileHash: candidate.hash, accept: true });
  state = await service.overview();
  const old = state.profiles.find(value => value.id === voiceId && value.version === oldCandidate.version)!;
  await expect(service.decideProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, proposalId: String(oldCandidate.proposalId), expectedProfileHash: old.hash, accept: true })).rejects.toMatchObject({ code: 'CONFLICT' });
  const context = await service.getContext(outputId);
  const proposal = context.pending.find(value => value.id === proposed.proposalId)!;
  const decision = { expectedHash: context.output.hash, outputId, proposalId: String(proposed.proposalId), expectedProposalHash: proposal.hash, expectedProfileHash: context.voice.hash };
  await expect(service.decideLessons({ ...decision, operationId: operationId(), decisions: [{ index: 0, accept: true }] })).rejects.toMatchObject({ code: 'CONFLICT' });
  await service.decideLessons({ ...decision, operationId: operationId(), decisions: [{ index: 0, accept: false }] });
  await service.decideProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, proposalId: String(oldCandidate.proposalId), expectedProfileHash: old.hash, accept: false });
  const defaultPin = (await service.overview()).publications[0].defaultVoice as { profileId: string; version: number };
  const current = await service.getPublicationContext(publicationId, defaultPin, null);
  expect(current.voice!.body).toBe('Newer approved rules must survive');
});
it('round-trips actual sources, artifacts, pending rules/candidates and exact retained final/machine files', async () => {
  const state = await service.overview();
  await service.saveSource({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId, title: 'Interview', body: 'Q: When?\nA: Tuesday.\n', sourceType: 'interview', attribution: 'Supplied interview', referenceUrl: null });
  await service.saveArtifact({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId, title: 'Outline', kind: 'outline', body: 'Exact supplied outline.\n' });
  const pair = await acceptedPair();
  await lessons(pair);
  let context = await service.getContext(outputId);
  await service.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId, prose: 'Pending exact subsequent candidate.\n', provenance: 'external-agent', declaredModel: 'unverified-client-label' });
  const current = await service.overview();
  await service.proposeProfile({ operationId: operationId(), expectedHash: current.publications[0].hash, publicationId, title: 'Pending profile', scope: 'publication', authorId: null, parent: null, prior: { profileId: voiceId, version: 1 }, prose: 'Pending exact proposed profile rules.\n', evidence: 'Supplied profile proposal evidence' });
  const exported = await exportOutput(service, outputId);
  for (const text of ['Pending exact subsequent candidate.', 'Pending exact proposed profile rules.', 'Exact supplied outline.', 'Exact machine draft.', 'Exact human final.', 'Q: When?', 'Undecided second rule']) expect(exported.handoff).toContain(text);
  const bundle = parseHandoff(exported.handoff);
  const restored = new WorkspaceService(join(folder, 'restored-content'), join(folder, 'restored-private'));
  const home = await restored.initialize({ operationId: operationId(), title: 'Explicit restore target' });
  const preview = await restored.previewHandoff(bundle);
  expect(preview.restoresEditorialRecords).toBe(true);
  await restored.importHandoff({ operationId: operationId(), expectedHash: home.hash, previewHash: preview.hash, bundle });
  context = await restored.getContext(outputId);
  expect(context.output.body).toBe('Exact human final.\n');
  expect(context.voice.body).toBe('Original exact rules.\n');
  expect(context.sources[0].body).toBe('Q: When?\nA: Tuesday.\n');
  expect(context.artifacts[0].body).toBe('Exact supplied outline.\n');
  expect((await restored.getRevision(outputId, pair.machineId)).prose).toBe('Exact machine draft.\n');
  expect((await restored.getRevision(outputId, pair.finalId)).prose).toBe('Exact human final.\n');
  expect(context.pending.map(value => value.kind)).toEqual(expect.arrayContaining(['draft', 'lessons']));
  expect(context.profileProposals[0].profile.body).toBe('Pending exact proposed profile rules.\n');
  const oldProfile = bundle.files.find(file => file.path === `Voice Profiles/${voiceId}/v1.md`)!;
  expect(await readFile(join(folder, 'restored-content', oldProfile.path), 'utf8')).toBe(oldProfile.text);
  await expect(service.importHandoff({ operationId: operationId(), expectedHash: (await service.overview()).workspace.hash, previewHash: preview.hash, bundle })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(restored.previewHandoff({ ...bundle, files: [{ path: '../../escape.md', text: 'escape' }, ...bundle.files] })).rejects.toThrow();
});

it('exports readable text and restoration data from one locked snapshot despite a later decision', async () => {
  const pair = await acceptedPair();
  const proposed = await lessons(pair);
  const before = await service.getContext(outputId);
  const original = service.exportSnapshot.bind(service);
  service.exportSnapshot = async id => {
    const snapshot = await original(id);
    const proposal = before.pending.find(value => value.id === proposed.proposalId)!;
    await service.decideLessons({ operationId: operationId(), expectedHash: before.output.hash, outputId, proposalId: String(proposed.proposalId), expectedProposalHash: proposal.hash, expectedProfileHash: before.voice.hash, decisions: [{ index: 0, accept: false }, { index: 1, accept: false }, { index: 2, accept: false }] });
    return snapshot;
  };
  const exported = await exportOutput(service, outputId);
  const bundle = parseHandoff(exported.handoff);
  const proposalFile = bundle.files.find(file => file.path === `Proposals/${proposed.proposalId}.md`)!;
  expect(proposalFile.text).toContain('state: pending');
  expect(exported.handoff).toContain('Lessons from retained draft/final comparison: pending');
  const after = await service.getContext(outputId);
  expect(after.pending.some(value => value.id === proposed.proposalId)).toBe(false);
  expect(after.contextHash).not.toBe(before.contextHash);
});

it('refuses author approval pinned to a draft publication parent', async () => {
  const state = await service.overview();
  const parent = await service.proposeProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Draft parent', scope: 'publication', authorId: null, parent: null, prior: { profileId: voiceId, version: 1 }, prose: 'Unapproved parent rules', evidence: 'Synthetic draft evidence' });
  const author = await service.proposeProfile({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId, title: 'Draft author', scope: 'author', authorId: operationId(), parent: { profileId: String(parent.id), version: Number(parent.version) }, prior: null, prose: 'Author rules', evidence: 'Synthetic author evidence' });
  const next = await service.overview();
  const candidate = next.profiles.find(value => value.id === author.id)!;
  await expect(service.decideProfile({ operationId: operationId(), expectedHash: next.publications[0].hash, publicationId, proposalId: String(author.proposalId), expectedProfileHash: candidate.hash, accept: true })).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
});
