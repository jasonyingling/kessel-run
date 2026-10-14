import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import { Journal } from './journal';
import type { Write } from './journal';
import { hashText, markdownPaths, noteText, parseNote, readText, safePath } from './files';
import type { Note } from './files';
import * as schemas from './schema';

const text = z.string().max(80000);
const expectedHash = z.string().length(64);
const baseInput = z.object({ operationId: schemas.id, expectedHash });
const now = () => new Date().toISOString();
const kinds: Record<string, z.ZodType> = {
  workspace: schemas.workspace, publication: schemas.publication,
  'voice-profile': schemas.profile, 'content-brief': schemas.piece,
  'content-output': schemas.output, source: schemas.source,
  revision: schemas.revision, proposal: schemas.proposal,
  'output-preset': schemas.preset,
};
function metadata(type: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    type, title, id: randomUUID(), schema_version: 1,
    created: now(), updated: now(), tags: ['kessel-run'], ...extra,
  };
}
function changed(note: Note, extra: Record<string, unknown>, body = note.body): Write {
  return {
    path: note.path, previousHash: note.hash,
    text: noteText({ ...note.metadata, ...extra, updated: now() }, body),
  };
}
function created(path: string, data: Record<string, unknown>, body: string): Write {
  return { path, previousHash: null, text: noteText(data, body) };
}
function summary(note: Note): Record<string, unknown> & { hash: string; body: string } {
  return { ...note.metadata, hash: note.hash, body: note.body };
}

export class WorkspaceService {
  private readonly journal: Journal;
  constructor(readonly root: string, readonly privateDirectory: string) {
    this.journal = new Journal(root, privateDirectory);
  }

  private async index(): Promise<Note[]> {
    const notes: Note[] = [];
    const seen = new Map<string, string>();
    const entityTypes = new Map<string, string>();
    for (const path of await markdownPaths(this.root)) {
      if (path.endsWith('.prose.md')) continue;
      const content = await readText(this.root, path);
      if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) continue;
      const note = parseNote(content, path);
      const type = String(note.metadata.type);
      if (!kinds[type]) continue;
      try { kinds[type].parse(note.metadata); }
      catch { throw new schemas.WorkspaceError('INVALID_INPUT', `Corrupt entity metadata: ${path}`); }
      const identity = String(note.metadata.id);
      const existingType = entityTypes.get(identity);
      if (existingType && existingType !== type) throw new schemas.WorkspaceError('INVALID_INPUT', `Duplicate entity ID: ${identity}`);
      entityTypes.set(identity, type);
      const key = type === 'voice-profile' ? `${identity}:v${note.metadata.version}` : identity;
      if (seen.has(key)) throw new schemas.WorkspaceError('INVALID_INPUT', `Duplicate entity ID: ${identity}`);
      seen.set(key, type);
      notes.push(note);
    }
    if (notes.filter(note => note.metadata.type === 'workspace').length !== 1) {
      throw new schemas.WorkspaceError('INVALID_INPUT', 'Workspace identity is missing or duplicated');
    }
    for (const note of notes.filter(value => value.metadata.type === 'content-output')) {
      const output = schemas.output.parse(note.metadata);
      for (const revisionId of [...output.revisions, output.currentRevision, output.acceptedRevision].filter((value): value is string => Boolean(value))) {
        const revision = notes.find(value => value.metadata.type === 'revision' && value.metadata.id === revisionId);
        if (!revision || revision.metadata.outputId !== output.id) throw new schemas.WorkspaceError('INVALID_INPUT', 'Output references a missing or unrelated retained revision');
      }
    }
    return notes;
  }

  private find(notes: Note[], id: string, type: string): Note {
    schemas.id.parse(id);
    const note = notes.find(value => value.metadata.id === id && value.metadata.type === type);
    if (!note) throw new schemas.WorkspaceError('NOT_FOUND', 'Selected entity was not found');
    return note;
  }

  private version(notes: Note[], pin: schemas.Pin, publicationId: string, visited = new Set<string>()) {
    const key = `${pin.profileId}:v${pin.version}`;
    if (visited.has(key)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Profile parent cycle detected');
    visited.add(key);
    const note = notes.find(value => value.metadata.type === 'voice-profile' && value.metadata.id === pin.profileId && value.metadata.version === pin.version);
    if (!note) throw new schemas.WorkspaceError('MISSING_PROFILE_VERSION', 'The exact pinned voice version is missing');
    const profile = schemas.profile.parse(note.metadata);
    if (profile.publicationId !== publicationId) throw new schemas.WorkspaceError('NOT_FOUND', 'Voice belongs to another publication');
    if (profile.parent) {
      const parent = this.version(notes, profile.parent, publicationId, visited);
      if (parent.profile.scope !== 'publication') throw new schemas.WorkspaceError('INVALID_INPUT', 'Author parent must be a publication profile');
    }
    return { note, profile };
  }

  private check(note: Note, expected: string) {
    if (note.hash !== expected) throw new schemas.WorkspaceError('CONFLICT', 'Saved Markdown changed. Preserve your text and reload the current revision.');
  }

  private async mutate<T extends Record<string, unknown>>(
    operationId: string, argumentsValue: unknown,
    prepare: (notes: Note[]) => Promise<{ writes: Write[]; result: T }>,
  ) {
    return this.journal.transaction(operationId, argumentsValue, async () => {
      const notes = await this.index();
      const prepared = await prepare(notes);
      const home = notes.find(note => note.metadata.type === 'workspace')!;
      prepared.writes.push(changed(home, { version: Number(home.metadata.version) + 1 }));
      return prepared;
    });
  }

  async initialize(input: { operationId: string; title: string }) {
    const parsed = z.object({ operationId: schemas.id, title: z.string().min(1).max(160) }).strict().parse(input);
    return this.journal.transaction(parsed.operationId, parsed, async () => {
      await safePath(this.root, 'Kessel Run.md', true);
      if ((await readdir(this.root)).length) {
        throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose a new empty app workspace. Existing notes require explicit import.');
      }
      const home = metadata('workspace', parsed.title, { version: 0 });
      const write = created('Kessel Run.md', home, `# ${parsed.title}\n\n[Publications](Publications/) · [Pieces](Pieces/)\n`);
      return { writes: [write], result: { id: home.id, hash: hashText(write.text), version: 0 } };
    });
  }

  async overview() {
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      return {
        workspace: summary(notes.find(note => note.metadata.type === 'workspace')!),
        publications: notes.filter(note => note.metadata.type === 'publication').map(summary),
        pieces: notes.filter(note => note.metadata.type === 'content-brief').map(summary),
        outputs: notes.filter(note => note.metadata.type === 'content-output').map(summary),
        profiles: notes.filter(note => note.metadata.type === 'voice-profile').map(summary),
        presets: notes.filter(note => note.metadata.type === 'output-preset').map(summary),
      };
    });
  }

  async list(type: 'publication' | 'content-brief', offset = 0, limit = 20) {
    z.number().int().nonnegative().parse(offset);
    z.number().int().min(1).max(50).parse(limit);
    return this.journal.readLocked(async () => {
      const all = (await this.index()).filter(note => note.metadata.type === type);
      return { items: all.slice(offset, offset + limit).map(summary), nextOffset: offset + limit < all.length ? offset + limit : null };
    });
  }

  async createPublication(input: { operationId: string; expectedHash: string; title: string; purpose: string; presets: string[] }) {
    const parsed = baseInput.extend({ title: z.string().min(1).max(160), purpose: text, presets: z.array(z.string().min(1).max(80)).max(20) }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const home = notes.find(note => note.metadata.type === 'workspace')!;
      this.check(home, parsed.expectedHash);
      if (new Set(parsed.presets).size !== parsed.presets.length) throw new schemas.WorkspaceError('INVALID_INPUT', 'Preset labels must be unique within a publication');
      const publication = metadata('publication', parsed.title, { defaultVoice: null, presets: [] });
      const presets = parsed.presets.map(title => metadata('output-preset', title, { publicationId: publication.id, format: title }));
      const publicationMetadata = { ...publication, presets: presets.map(preset => preset.id) };
      const path = `Publications/${publication.id}.md`;
      return { writes: [created(path, publicationMetadata, parsed.purpose), ...presets.map(preset => created(`Output Presets/${preset.id}.md`, preset, ''))], result: { id: publication.id, presets: presets.map(preset => ({ id: preset.id, title: preset.title })), link: `/kessel-run/publications/${publication.id}` } };
    });
  }

  async previewProfile(input: { publicationId: string; prose: string; scope: 'publication' | 'author'; parent: schemas.Pin | null; authorId: string | null }) {
    const parsed = z.object({ publicationId: schemas.id, prose: text.min(1), scope: z.enum(['publication', 'author']), parent: schemas.pin.nullable(), authorId: schemas.id.nullable() }).strict().parse(input);
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const publication = this.find(notes, parsed.publicationId, 'publication');
      if (parsed.scope === 'author') {
        if (!parsed.parent || !parsed.authorId) throw new schemas.WorkspaceError('INVALID_INPUT', 'Select the author and exact publication parent');
        this.version(notes, parsed.parent, parsed.publicationId);
      }
      return { prose: parsed.prose, publicationHash: publication.hash, addedMetadata: { version: 1, scope: parsed.scope, parent: parsed.parent, evidenceLevel: 'sparse', status: 'approved after human confirmation' }, requiresHumanConfirmation: true };
    });
  }

  // Called only by the browser's explicit human import-confirmation path.
  // This capability is deliberately absent from model and MCP tool registries.
  async confirmProfileImport(input: {
    operationId: string; expectedHash: string; publicationId: string; prose: string;
    title: string; scope: 'publication' | 'author'; parent: schemas.Pin | null;
    authorId: string | null; provenance: string;
  }) {
    const parsed = baseInput.extend({ publicationId: schemas.id, prose: text.min(1), title: z.string().min(1).max(160), scope: z.enum(['publication', 'author']), parent: schemas.pin.nullable(), authorId: schemas.id.nullable(), provenance: z.string().min(1).max(12000) }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      if (parsed.parent) this.version(notes, parsed.parent, parsed.publicationId);
      const profile = schemas.profile.parse(metadata('voice-profile', parsed.title, {
        publicationId: parsed.publicationId, version: 1, scope: parsed.scope,
        authorId: parsed.authorId, parent: parsed.parent, status: 'approved',
        evidenceLevel: 'sparse', provenance: parsed.provenance,
        parent_snapshot_link: parsed.parent ? `[Parent v${parsed.parent.version}](../${parsed.parent.profileId}/v${parsed.parent.version}.md)` : null,
      }));
      const path = `Voice Profiles/${profile.id}/v1.md`;
      const writes = [created(path, profile, parsed.prose)];
      if (profile.scope === 'publication') writes.push(changed(publication, { defaultVoice: { profileId: profile.id, version: 1 }, default_voice_link: `[Voice v1](../Voice%20Profiles/${profile.id}/v1.md)` }));
      return { writes, result: { id: profile.id, version: 1, proseHash: hashText(parsed.prose) } };
    });
  }

  async createPiece(input: { operationId: string; expectedHash: string; publicationId: string; title: string; brief: string; mode: 'guided' | 'fast' }) {
    const parsed = baseInput.extend({ publicationId: schemas.id, title: z.string().min(1).max(160), brief: text, mode: z.enum(['guided', 'fast']) }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      const piece = metadata('content-brief', parsed.title, { publicationId: parsed.publicationId, mode: parsed.mode, nextAction: 'Supply notes and select an output.', decisions: [] });
      const path = `Pieces/${piece.id}/Brief.md`;
      return { writes: [created(path, piece, parsed.brief)], result: { id: piece.id, link: `/kessel-run/pieces/${piece.id}` } };
    });
  }

  async createOutput(input: { operationId: string; expectedHash: string; pieceId: string; title: string; format: string; preset: string; voice: schemas.Pin; author: schemas.Pin | null }) {
    const parsed = baseInput.extend({ pieceId: schemas.id, title: z.string().min(1).max(160), format: z.string().min(1).max(80), preset: z.string().min(1).max(80), voice: schemas.pin, author: schemas.pin.nullable() }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const publicationId = String(piece.metadata.publicationId);
      const publication = schemas.publication.parse(this.find(notes, publicationId, 'publication').metadata);
      const preset = notes.find(note => note.metadata.type === 'output-preset' && note.metadata.publicationId === publicationId && (note.metadata.id === parsed.preset || note.metadata.title === parsed.preset));
      if (!preset || !publication.presets.includes(String(preset.metadata.id))) throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose an allowed publication preset');
      const voice = this.version(notes, parsed.voice, publicationId);
      if (voice.profile.scope !== 'publication' || voice.profile.status !== 'approved') throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Select an approved publication voice');
      if (parsed.author) {
        const author = this.version(notes, parsed.author, publicationId).profile;
        if (author.scope !== 'author' || author.status !== 'approved') throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Select an approved author overlay');
        if (author.parent?.profileId !== parsed.voice.profileId || author.parent.version !== parsed.voice.version) throw new schemas.WorkspaceError('MISSING_PROFILE_VERSION', 'Author parent does not match selected publication voice');
      }
      const output = metadata('content-output', parsed.title, {
        publicationId, pieceId: parsed.pieceId, format: parsed.format, preset: String(preset.metadata.id),
        voice: parsed.voice, author: parsed.author, status: 'drafting', currentRevision: null,
        acceptedRevision: null, revisions: [], proposals: [],
        voice_link: `[Voice v${parsed.voice.version}](../../../../Voice%20Profiles/${parsed.voice.profileId}/v${parsed.voice.version}.md)`,
        author_link: parsed.author ? `[Author v${parsed.author.version}](../../../../Voice%20Profiles/${parsed.author.profileId}/v${parsed.author.version}.md)` : null,
        preset_link: `[Preset](../../../../Output%20Presets/${preset.metadata.id}.md)`,
        brief_link: '[Brief](../../Brief.md)', revision_links: [],
      });
      const path = `Pieces/${parsed.pieceId}/Outputs/${output.id}/Output.md`;
      return { writes: [created(path, output, '')], result: { id: output.id, hash: hashText(noteText(output, '')), link: `/kessel-run/outputs/${output.id}` } };
    });
  }

  async getContext(outputId: string, sourceOffset = 0) {
    z.number().int().nonnegative().parse(sourceOffset);
    return this.journal.readLocked(async () => this.context(await this.index(), outputId, sourceOffset));
  }

  private context(notes: Note[], outputId: string, sourceOffset = 0, fullSources = false) {
    const output = this.find(notes, outputId, 'content-output');
    const data = schemas.output.parse(output.metadata);
    const voice = this.version(notes, data.voice, data.publicationId);
    const author = data.author ? this.version(notes, data.author, data.publicationId) : null;
    if (voice.profile.scope !== 'publication' || voice.profile.status !== 'approved') {
      throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Output publication voice must be approved');
    }
    if (author && (author.profile.scope !== 'author' || author.profile.status !== 'approved')) {
      throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Output author overlay must be approved');
    }
    if (author && (author.profile.parent?.profileId !== data.voice.profileId || author.profile.parent.version !== data.voice.version)) {
      throw new schemas.WorkspaceError('MISSING_PROFILE_VERSION', 'Output author parent does not match the exact publication pin');
    }
    const piece = this.find(notes, data.pieceId, 'content-brief');
    if (piece.metadata.publicationId !== data.publicationId) throw new schemas.WorkspaceError('NOT_FOUND', 'Output piece belongs to another publication');
    const preset = this.find(notes, data.preset, 'output-preset');
    if (preset.metadata.publicationId !== data.publicationId) throw new schemas.WorkspaceError('NOT_FOUND', 'Output preset belongs to another publication');
    const sources = notes.filter(note => note.metadata.type === 'source' && note.metadata.pieceId === data.pieceId);
    const pending = data.proposals.map(id => this.find(notes, id, 'proposal')).filter(note => note.metadata.state === 'pending');
    const sourceReferences = sources.map(note => ({ id: note.metadata.id, hash: note.hash }));
    const contextHash = hashText(JSON.stringify({ output: output.hash, brief: piece.hash, preset: preset.hash, voice: voice.note.hash, author: author?.note.hash ?? null, sourceReferences }));
    return {
      output: summary(output), brief: summary(piece), voice: summary(voice.note),
      author: author ? summary(author.note) : null,
      preset: summary(preset),
      sources: (fullSources ? sources : sources.slice(sourceOffset, sourceOffset + 1)).map(summary),
      sourceReferences, contextHash,
      nextSourceOffset: sourceOffset + 1 < sources.length ? sourceOffset + 1 : null,
      pending: pending.map(summary),
    };
  }

  async saveSource(input: { operationId: string; expectedHash: string; pieceId: string; title: string; body: string; attribution: string; sourceType: 'notes' | 'interview' | 'supplied-text'; referenceUrl: string | null }) {
    const parsed = baseInput.extend({ pieceId: schemas.id, title: z.string().min(1).max(160), body: text.min(1), attribution: z.string().min(1).max(2000), sourceType: schemas.source.shape.sourceType, referenceUrl: schemas.source.shape.referenceUrl }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const source = metadata('source', parsed.title, { pieceId: parsed.pieceId, attribution: parsed.attribution, sourceType: parsed.sourceType, referenceUrl: parsed.referenceUrl });
      return { writes: [created(`Pieces/${parsed.pieceId}/Sources/${source.id}.md`, source, parsed.body)], result: { id: source.id, hash: hashText(parsed.body), retrievedUrl: false } };
    });
  }

  private draftWrites(notes: Note[], output: Note, prose: string, provenance: 'human' | 'model' | 'external-agent', declaredModel: string | null) {
    const data = schemas.output.parse(output.metadata);
    const context = this.context(notes, data.id, 0, true);
    const revision = schemas.revision.parse(metadata('revision', 'Retained prose revision', {
      outputId: data.id, parentRevision: data.currentRevision, provenance, declaredModel,
      context, prosePath: '', proseHash: hashText(prose),
    }));
    const folder = output.path.slice(0, -'Output.md'.length);
    revision.prosePath = `${folder}Revisions/${revision.id}.prose.md`;
    return {
      revision,
      writes: [
        { path: String(revision.prosePath), previousHash: null, text: prose },
        created(`${folder}Revisions/${revision.id}.md`, revision, `[Exact prose](./${revision.id}.prose.md)\n`),
      ],
    };
  }

  async saveEditor(input: { operationId: string; expectedHash: string; expectedContextHash: string; outputId: string; prose: string }) {
    const parsed = baseInput.extend({ outputId: schemas.id, expectedContextHash: expectedHash, prose: text }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      if (this.context(notes, parsed.outputId).contextHash !== parsed.expectedContextHash) {
        throw new schemas.WorkspaceError('CONFLICT', 'Selected context changed. Reload it and reconcile before saving.');
      }
      const data = schemas.output.parse(output.metadata);
      const draft = this.draftWrites(notes, output, parsed.prose, 'human', null);
      const write = changed(output, { currentRevision: draft.revision.id, acceptedRevision: null, status: 'drafting', revisions: [...data.revisions, draft.revision.id], revision_links: [...(Array.isArray(data.revision_links) ? data.revision_links : []), `[Revision](./Revisions/${draft.revision.id}.prose.md)`] }, parsed.prose);
      return { writes: [...draft.writes, write], result: { id: parsed.outputId, revision: draft.revision.id, hash: hashText(write.text) } };
    });
  }

  async proposeDraft(input: { operationId: string; expectedHash: string; expectedContextHash: string; outputId: string; prose: string; provenance: 'model' | 'external-agent'; declaredModel: string | null }) {
    const parsed = baseInput.extend({ outputId: schemas.id, expectedContextHash: expectedHash, prose: text.min(1), provenance: z.enum(['model', 'external-agent']), declaredModel: z.string().max(160).nullable() }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      if (this.context(notes, parsed.outputId).contextHash !== parsed.expectedContextHash) {
        throw new schemas.WorkspaceError('CONFLICT', 'Selected context changed. Read current context before proposing.');
      }
      const data = schemas.output.parse(output.metadata);
      const draft = this.draftWrites(notes, output, parsed.prose, parsed.provenance, parsed.declaredModel);
      const proposal = metadata('proposal', 'Draft proposal', {
        kind: 'draft', state: 'pending', targetId: data.id, targetHash: output.hash,
        evidence: 'Agent-supplied candidate; human reconciliation and acceptance required.',
        payload: { revisionId: draft.revision.id },
      });
      const folder = output.path.slice(0, -'Output.md'.length);
      const write = changed(output, { proposals: [...data.proposals, proposal.id], candidate_links: [...(Array.isArray(data.candidate_links) ? data.candidate_links : []), `[Candidate](./Revisions/${draft.revision.id}.prose.md)`] });
      return {
        writes: [...draft.writes, created(`${folder}Proposals/${proposal.id}.md`, proposal, ''), write],
        result: { id: data.id, candidateId: draft.revision.id, proposalId: proposal.id, hash: hashText(write.text), link: `/kessel-run/outputs/${data.id}` },
      };
    });
  }

  async recordProgress(input: { operationId: string; expectedHash: string; pieceId: string; nextAction: string }) {
    const parsed = baseInput.extend({ pieceId: schemas.id, nextAction: z.string().max(2000) }).strict().parse(input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const write = changed(piece, { nextAction: parsed.nextAction });
      return { writes: [write], result: { id: parsed.pieceId, hash: hashText(write.text) } };
    });
  }
}
