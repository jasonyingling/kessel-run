import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceService } from './service';
import { exportOutput } from './import-export';
let root: string, service: WorkspaceService, outputId: string, pieceId: string;
const id = () => crypto.randomUUID();
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kr-desk-'));
  service = new WorkspaceService(join(root, 'content'), join(root, 'private'));
  const home = await service.initialize({ operationId: id(), title: 'Desk fixture' });
  const publication = await service.createPublication({ operationId: id(), expectedHash: home.hash, title: 'Publication', purpose: '', presets: ['Article'] });
  let state = await service.overview();
  const voice = await service.confirmProfileImport({ operationId: id(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), title: 'Voice', prose: 'Exact rules', scope: 'publication', parent: null, authorId: null, provenance: 'Human preferences' });
  state = await service.overview();
  const piece = await service.createPiece({ operationId: id(), expectedHash: state.publications[0].hash, publicationId: String(publication.id), title: 'Idea', brief: 'Original brief', mode: 'guided' });
  pieceId = String(piece.id); state = await service.overview();
  await service.saveSource({ operationId: id(), expectedHash: state.pieces[0].hash, pieceId, title: 'Source', body: 'Exact words', attribution: 'User', sourceType: 'notes', referenceUrl: null });
  const output = await service.createOutput({ operationId: id(), expectedHash: state.pieces[0].hash, pieceId, title: 'Output', format: 'Article', preset: String(state.presets[0].id), voice: { profileId: String(voice.id), version: 1 }, author: null });
  outputId = String(output.id);
});
afterEach(async () => rm(root, { recursive: true, force: true }));
it('edits the shared brief without changing sources or pins and invalidates stale commands', async () => {
  const old = await service.getContext(outputId);
  const command = { operationId: id(), expectedHash: old.brief.hash, pieceId, title: 'Revised idea', brief: 'Revised brief', mode: 'fast' as const };
  expect(await service.updatePiece(command)).toEqual(await service.updatePiece(command));
  const current = await service.getContext(outputId);
  expect(current.brief).toMatchObject({ title: 'Revised idea', body: 'Revised brief', mode: 'fast' });
  expect(current.sources).toEqual(old.sources); expect(current.output).toEqual(old.output);
  expect(current.contextHash).not.toBe(old.contextHash);
  await expect(service.updatePiece({ ...command, operationId: id() })).rejects.toMatchObject({ code: 'CONFLICT', outcome: 'rejected' });
  await expect(service.saveEditor({ operationId: id(), expectedHash: old.output.hash, expectedContextHash: old.contextHash, outputId, prose: 'Stale' })).rejects.toMatchObject({ code: 'CONFLICT' });
  await expect(service.proposeDraft({ operationId: id(), expectedHash: old.output.hash, expectedContextHash: old.contextHash, outputId, prose: 'Stale', provenance: 'external-agent', declaredModel: null })).rejects.toMatchObject({ code: 'CONFLICT' });
});
it('exports the receipt-bound snapshot and rejects intervening prose or context changes', async () => {
  const old = await service.getContext(outputId);
  const saved = await service.saveEditor({ operationId: id(), expectedHash: old.output.hash, expectedContextHash: old.contextHash, outputId, prose: 'Visible buffer' });
  const expected = { expectedRevision: saved.revision, expectedHash: saved.hash, expectedContextHash: saved.contextHash };
  const exported = await exportOutput(service, outputId, expected);
  expect(exported.identity).toEqual({ revision: saved.revision, hash: saved.hash, contextHash: saved.contextHash });
  expect(exported.prose).toBe('Visible buffer');
  await service.updatePiece({ operationId: id(), expectedHash: old.brief.hash, pieceId, title: 'New brief', brief: '', mode: 'guided' });
  await expect(exportOutput(service, outputId, expected)).rejects.toMatchObject({ code: 'CONFLICT' });
  const current = await service.getContext(outputId);
  await service.saveEditor({ operationId: id(), expectedHash: current.output.hash, expectedContextHash: current.contextHash, outputId, prose: 'Another client' });
  await expect(exportOutput(service, outputId, { expectedRevision: saved.revision })).rejects.toMatchObject({ code: 'CONFLICT' });
  expect((await exportOutput(service, outputId)).prose).toBe('Another client');
});

it('distinguishes an explicit blank revision from an omitted expectation', async () => {
  const blank = await service.getContext(outputId);
  expect((await exportOutput(service, outputId, { expectedRevision: null, expectedHash: blank.output.hash, expectedContextHash: blank.contextHash })).prose).toBe('');
  await service.saveEditor({ operationId: id(), expectedHash: blank.output.hash, expectedContextHash: blank.contextHash, outputId, prose: 'First saved text' });
  await expect(exportOutput(service, outputId, { expectedRevision: null })).rejects.toMatchObject({ code: 'CONFLICT' });
  expect((await exportOutput(service, outputId)).prose).toBe('First saved text');
});
