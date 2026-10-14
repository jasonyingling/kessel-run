import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceService } from './service';
import { markdownPaths, parseNote, noteText, safePath } from './files';

let folder: string;
let root: string;
let privateDirectory: string;
let service: WorkspaceService;
const operationId = () => crypto.randomUUID();

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kr-content-'));
  root = join(folder, 'content');
  privateDirectory = join(folder, 'private');
  service = new WorkspaceService(root, privateDirectory);
  await service.initialize({ operationId: operationId(), title: 'Synthetic workspace' });
});
afterEach(async () => { await rm(folder, { recursive: true, force: true }); });

async function fixture() {
  const overview = await service.overview();
  const publication = await service.createPublication({ operationId: operationId(), expectedHash: overview.workspace.hash, title: 'Synthetic publication', purpose: 'Supplied synthetic audience', presets: ['article', 'email'] });
  let state = await service.overview();
  const imported = await service.confirmProfileImport({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), prose: 'Write with concrete detail.\n\nUnknown section stays verbatim.\n', title: 'Supplied voice', scope: 'publication', parent: null, authorId: null, provenance: 'Supplied synthetic profile, explicitly confirmed by test human' });
  state = await service.overview();
  const piece = await service.createPiece({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), title: 'Synthetic piece', brief: 'Supplied workshop notes', mode: 'guided' });
  state = await service.overview();
  const output = await service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: String(piece.id), title: 'Article', format: 'article', preset: 'article', voice: { profileId: String(imported.id), version: 1 }, author: null });
  return { publicationId: String(publication.id), profileId: String(imported.id), pieceId: String(piece.id), outputId: String(output.id) };
}

it('reopens fresh state with exact imported prose and independent output pins', async () => {
  const data = await fixture();
  const state = await new WorkspaceService(root, privateDirectory).overview();
  expect(state.workspace.version).toBe(4);
  expect(state.profiles[0].body).toBe('Write with concrete detail.\n\nUnknown section stays verbatim.\n');
  const second = await service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'Email', format: 'email', preset: 'email', voice: { profileId: data.profileId, version: 1 }, author: null });
  const saved = await service.saveEditor({ operationId: operationId(), expectedHash: String(state.outputs[0].hash), expectedContextHash: (await service.getContext(data.outputId)).contextHash, outputId: data.outputId, prose: 'Human workshop prose.\n' });
  const resumed = await new WorkspaceService(root, privateDirectory).overview();
  expect(resumed.outputs.find(output => output.id === data.outputId)?.currentRevision).toBe(saved.revision);
  expect(resumed.outputs.find(output => output.id === second.id)?.currentRevision).toBeNull();
  expect(resumed.outputs.find(output => output.id === second.id)?.voice).toEqual({ profileId: data.profileId, version: 1 });
});

it('preserves both texts across stale UI/agent races and repeats identical operation results', async () => {
  const data = await fixture();
  const originalContext = await service.getContext(data.outputId);
  const current = originalContext.output;
  const args = { operationId: operationId(), expectedHash: current.hash, expectedContextHash: originalContext.contextHash, outputId: data.outputId, prose: 'Human saved version' };
  const saved = await service.saveEditor(args);
  expect(await new WorkspaceService(root, privateDirectory).saveEditor(args)).toEqual(saved);
  await expect(service.saveEditor({ ...args, prose: 'Changed same operation' })).rejects.toMatchObject({ code: 'CONFLICT' });
  const stale = { operationId: operationId(), expectedHash: current.hash, expectedContextHash: originalContext.contextHash, outputId: data.outputId, prose: 'External competing candidate', provenance: 'external-agent' as const, declaredModel: null };
  await expect(service.proposeDraft(stale)).rejects.toMatchObject({ code: 'CONFLICT' });
  expect((await service.getContext(data.outputId)).output.body).toBe('Human saved version');
  expect(await readFile(join(privateDirectory, 'operations.json'), 'utf8')).toContain('External competing candidate');
});

it('retains exact machine draft without replacing human prose and preserves interview attribution', async () => {
  const data = await fixture();
  let context = await service.getContext(data.outputId);
  const candidate = await service.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: data.outputId, prose: 'Exact machine draft.\n', provenance: 'external-agent', declaredModel: 'unverified-client-label' });
  context = await service.getContext(data.outputId);
  expect(context.output.body).toBe('');
  expect(context.pending).toHaveLength(1);
  const path = (await markdownPaths(root)).find(path => path.endsWith(`${candidate.candidateId}.prose.md`))!;
  expect(await readFile(join(root, path), 'utf8')).toBe('Exact machine draft.\n');
  const state = await service.overview();
  const interview = 'Q: When does the workshop start?\nA: Tuesday at ten.\n';
  await service.saveSource({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'Interview', body: interview, attribution: 'Supplied synthetic interview participant', sourceType: 'interview', referenceUrl: 'https://example.com/reference-only' });
  expect((await service.getContext(data.outputId)).sources[0].body).toBe(interview);
  expect((await service.getContext(data.outputId)).sources[0].attribution).toBe('Supplied synthetic interview participant');
  await expect(service.saveSource({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'Unsafe reference', body: 'supplied', attribution: 'synthetic', sourceType: 'notes', referenceUrl: 'javascript:alert(1)' })).rejects.toThrow();
});

it('rejects missing versions, mismatched author parent pins and duplicate IDs', async () => {
  const data = await fixture();
  const state = await service.overview();
  await expect(service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'Missing', format: 'article', preset: 'article', voice: { profileId: data.profileId, version: 99 }, author: null })).rejects.toMatchObject({ code: 'MISSING_PROFILE_VERSION' });
  const author = await service.confirmProfileImport({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: data.publicationId, prose: 'Author-specific rules', title: 'Author overlay', scope: 'author', parent: { profileId: data.profileId, version: 1 }, authorId: operationId(), provenance: 'Supplied synthetic author profile' });
  const otherVoice = await service.confirmProfileImport({ operationId: operationId(), expectedHash: state.publications[0].hash, publicationId: data.publicationId, prose: 'Different publication voice', title: 'Other voice', scope: 'publication', parent: null, authorId: null, provenance: 'Synthetic second voice' });
  await expect(service.createOutput({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'Mismatch', format: 'article', preset: 'article', voice: { profileId: String(otherVoice.id), version: 1 }, author: { profileId: String(author.id), version: 1 } })).rejects.toMatchObject({ code: 'MISSING_PROFILE_VERSION' });
  const publicationPath = (await markdownPaths(root)).find(path => path.startsWith('Publications/'))!;
  await copyFile(join(root, publicationPath), join(root, 'Duplicate.md'));
  await expect(service.overview()).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});

it('preserves unknown metadata/body sections and reports corruption instead of empty state', async () => {
  const data = await fixture();
  const piecePath = `Pieces/${data.pieceId}/Brief.md`;
  const note = parseNote(await readFile(join(root, piecePath), 'utf8'), piecePath);
  const body = `${note.body}\n## Unknown notes\nRetain these.\n`;
  await writeFile(join(root, piecePath), noteText({ ...note.metadata, custom_metadata: { nested: true } }, body));
  const current = (await service.overview()).pieces[0];
  await service.recordProgress({ operationId: operationId(), expectedHash: current.hash, pieceId: data.pieceId, nextAction: 'Continue from saved notes' });
  const updated = parseNote(await readFile(join(root, piecePath), 'utf8'), piecePath);
  expect(updated.metadata.custom_metadata).toEqual({ nested: true });
  expect(updated.body).toBe(body);
  await writeFile(join(root, piecePath), '---\ntype: content-brief\nid: broken\n---\nRetained corrupt note');
  await expect(service.overview()).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});

it('rejects traversal/symlink escapes and refuses to initialize existing personal notes', async () => {
  await expect(safePath(root, '../outside.md')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await symlink(folder, join(root, 'escape'));
  await expect(service.overview()).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const existing = join(folder, 'personal');
  await mkdir(existing);
  await writeFile(join(existing, 'Issue.md'), 'Personal notes stay intact');
  await expect(new WorkspaceService(existing, join(folder, 'other-private')).initialize({ operationId: operationId(), title: 'No migration' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(await readFile(join(existing, 'Issue.md'), 'utf8')).toBe('Personal notes stay intact');
});

it('rejects externally changed pinned snapshots and detects newly selected source context', async () => {
  const data = await fixture();
  const original = await service.getContext(data.outputId);
  const state = await service.overview();
  await service.saveSource({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title: 'New supplied notes', body: 'Additional Tuesday fact', attribution: 'Synthetic user', sourceType: 'notes', referenceUrl: null });
  await expect(service.proposeDraft({ operationId: operationId(), expectedHash: original.output.hash, expectedContextHash: original.contextHash, outputId: data.outputId, prose: 'Candidate using old context', provenance: 'external-agent', declaredModel: null })).rejects.toMatchObject({ code: 'CONFLICT' });
  const profilePath = (await markdownPaths(root)).find(path => path.startsWith('Voice Profiles/'))!;
  await writeFile(join(root, profilePath), (await readFile(join(root, profilePath), 'utf8')).replace('Write with concrete detail.', 'Externally changed rules.'));
  await expect(service.getContext(data.outputId)).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('retains all selected source IDs/hashes and exact source text in candidate provenance', async () => {
  const data = await fixture();
  const state = await service.overview();
  for (const title of ['First', 'Second']) {
    await service.saveSource({ operationId: operationId(), expectedHash: state.pieces[0].hash, pieceId: data.pieceId, title, body: `${title} supplied text`, attribution: 'Synthetic user', sourceType: 'notes', referenceUrl: null });
  }
  const context = await service.getContext(data.outputId);
  expect(context.sources).toHaveLength(1);
  expect(context.sourceReferences).toHaveLength(2);
  expect(context.nextSourceOffset).toBe(1);
  const candidate = await service.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: data.outputId, prose: 'Candidate with both supplied sources', provenance: 'external-agent', declaredModel: null });
  const path = (await markdownPaths(root)).find(path => path.endsWith(`${candidate.candidateId}.md`))!;
  const revision = parseNote(await readFile(join(root, path), 'utf8'), path);
  const retained = revision.metadata.context as { sources: { body: string }[]; sourceReferences: unknown[] };
  expect(retained.sources.map(source => source.body).sort()).toEqual(['First supplied text', 'Second supplied text']);
  expect(retained.sourceReferences).toHaveLength(2);
});

it('serializes simultaneous UI/agent mutations and preserves the conflicting caller text', async () => {
  const data = await fixture();
  const context = await service.getContext(data.outputId);
  const otherClient = new WorkspaceService(root, privateDirectory);
  const attempts = await Promise.allSettled([
    service.saveEditor({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: data.outputId, prose: 'Concurrent human prose' }),
    otherClient.proposeDraft({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: data.outputId, prose: 'Concurrent external prose', provenance: 'external-agent', declaredModel: null }),
  ]);
  expect(attempts.filter(attempt => attempt.status === 'fulfilled')).toHaveLength(1);
  expect(attempts.filter(attempt => attempt.status === 'rejected')).toHaveLength(1);
  const journal = await readFile(join(privateDirectory, 'operations.json'), 'utf8');
  expect(journal).toContain('Concurrent human prose');
  expect(journal).toContain('Concurrent external prose');
});

it('does not silently replace missing profile pins after external output metadata edits', async () => {
  const data = await fixture();
  const outputPath = `Pieces/${data.pieceId}/Outputs/${data.outputId}/Output.md`;
  const original = parseNote(await readFile(join(root, outputPath), 'utf8'), outputPath);
  await writeFile(join(root, outputPath), noteText({ ...original.metadata, voice: { profileId: data.profileId, version: 42 } }, original.body));
  await expect(service.getContext(data.outputId)).rejects.toMatchObject({ code: 'MISSING_PROFILE_VERSION' });
});

it('exports actual rules, all supplied sources and pending work without private credentials', async () => {
  const data = await fixture();
  const { Credentials } = await import('../ai/credentials');
  const { exportOutput, safeFilename } = await import('./import-export');
  await new Credentials(privateDirectory, () => undefined).replace('synthetic-private-key-must-never-export');
  const context = await service.getContext(data.outputId);
  await service.saveEditor({ operationId: operationId(), expectedHash: context.output.hash, expectedContextHash: context.contextHash, outputId: data.outputId, prose: '<script>supplied text stays text</script>\n' });
  const exported = await exportOutput(service, data.outputId);
  expect(exported.prose).toBe('<script>supplied text stays text</script>\n');
  expect(exported.handoff).toContain('Write with concrete detail.');
  expect(exported.handoff).toContain('Supplied workshop notes');
  expect(exported.handoff).not.toContain('synthetic-private-key-must-never-export');
  expect(safeFilename('../../unsafe/name')).not.toContain('/');
});
