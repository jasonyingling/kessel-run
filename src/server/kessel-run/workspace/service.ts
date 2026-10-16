import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import { Journal } from './journal';
import type { Write } from './journal';
import { hashText, markdownPaths, noteText, optionalText, parseNote, readText, safePath } from './files';
import type { Note } from './files';
import * as schemas from './schema';
import { handoffBundle, handoffHash } from './handoff';
import type { HandoffBundle } from './handoff';

const text = z.string().max(80000);
const expectedHash = z.string().length(64);
const baseInput = z.object({ operationId: schemas.id, expectedHash });
const now = () => new Date().toISOString();
// Only call at the public command boundary, before journal recovery or writes.
function validatedCommand<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new schemas.WorkspaceError('INVALID_INPUT', 'Check the required fields and try again.', 'rejected');
  return result.data;
}
const kinds: Record<string, z.ZodType> = {
  workspace: schemas.workspace, publication: schemas.publication,
  'voice-profile': schemas.profile, 'content-brief': schemas.piece,
  'content-output': schemas.output, source: schemas.source,
  revision: schemas.revision, proposal: schemas.proposal,
  'output-preset': schemas.preset,
  'workflow-artifact': schemas.artifact,
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
    for (const note of notes.filter(value => value.metadata.type === 'publication')) {
      const publication = schemas.publication.parse(note.metadata);
      if (publication.defaultVoice) this.version(notes, publication.defaultVoice, publication.id);
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

  private async navigationWrite(output: Note, line: string): Promise<Write> {
    const path = output.path.slice(0, -'Output.md'.length) + 'Navigation.md';
    const current = await optionalText(this.root, path);
    if (!current) return created(path, metadata('output-navigation', 'Output navigation', { outputId: output.metadata.id }), `# Output navigation\n\n${line}\n`);
    const note = parseNote(current, path);
    if (note.metadata.outputId !== output.metadata.id) throw new schemas.WorkspaceError('CONFLICT', 'Navigation note belongs to another output');
    return changed(note, {}, `${note.body}\n${line}\n`);
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

  async initialize(input: { operationId: string; title: string; workspaceId?: string }) {
    const parsed = validatedCommand(z.object({ operationId: schemas.id, title: z.string().min(1).max(160), workspaceId: schemas.id.optional() }).strict(), input);
    return this.journal.transaction(parsed.operationId, parsed, async () => {
      await safePath(this.root, 'Kessel Run.md', true);
      if ((await readdir(this.root)).length) {
        throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose a new empty app workspace. Existing notes require explicit import.');
      }
      const home = metadata('workspace', parsed.title, { version: 0, ...(parsed.workspaceId ? { id: parsed.workspaceId } : {}) });
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

  async createPublication(input: { operationId: string; expectedHash: string; title: string; purpose: string; presets: string[]; publicationId?: string }) {
    const parsed = validatedCommand(baseInput.extend({ title: z.string().min(1).max(160), purpose: text, presets: z.array(z.string().min(1).max(80)).max(20), publicationId: schemas.id.optional() }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const home = notes.find(note => note.metadata.type === 'workspace')!;
      this.check(home, parsed.expectedHash);
      if (new Set(parsed.presets).size !== parsed.presets.length) throw new schemas.WorkspaceError('INVALID_INPUT', 'Preset labels must be unique within a publication');
      if (parsed.publicationId && notes.some(note => note.metadata.id === parsed.publicationId)) throw new schemas.WorkspaceError('CONFLICT', 'Publication identity already exists');
      const publication = metadata('publication', parsed.title, { defaultVoice: null, presets: [], ...(parsed.publicationId ? { id: parsed.publicationId } : {}) });
      const presets = parsed.presets.map(title => metadata('output-preset', title, { publicationId: publication.id, format: title }));
      const publicationMetadata = { ...publication, presets: presets.map(preset => preset.id) };
      const path = `Publications/${publication.id}.md`;
      return { writes: [created(path, publicationMetadata, parsed.purpose), ...presets.map(preset => created(`Output Presets/${preset.id}.md`, preset, ''))], result: { id: publication.id, presets: presets.map(preset => ({ id: preset.id, title: preset.title })), link: `/kessel-run/publications/${publication.id}` } };
    });
  }

  async previewProfile(input: { publicationId: string; prose: string; scope: 'publication' | 'author'; parent: schemas.Pin | null; authorId: string | null }) {
    const parsed = validatedCommand(z.object({ publicationId: schemas.id, prose: text.min(1), scope: z.enum(['publication', 'author']), parent: schemas.pin.nullable(), authorId: schemas.id.nullable() }).strict(), input);
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const publication = this.find(notes, parsed.publicationId, 'publication');
      if (parsed.scope === 'author') {
        if (!parsed.parent || !parsed.authorId) throw new schemas.WorkspaceError('INVALID_INPUT', 'Select the author and exact publication parent');
        const parent = this.version(notes, parsed.parent, parsed.publicationId);
        if (parent.profile.scope !== 'publication' || parent.profile.status !== 'approved') throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Select an approved publication parent');
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
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, prose: text.min(1), title: z.string().min(1).max(160), scope: z.enum(['publication', 'author']), parent: schemas.pin.nullable(), authorId: schemas.id.nullable(), provenance: z.string().min(1).max(12000) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      if (parsed.parent) {
        const parent = this.version(notes, parsed.parent, parsed.publicationId);
        if (parent.profile.scope !== 'publication' || parent.profile.status !== 'approved') throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Select an approved publication parent');
      }
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
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, title: z.string().min(1).max(160), brief: text, mode: z.enum(['guided', 'fast']) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      const piece = metadata('content-brief', parsed.title, { publicationId: parsed.publicationId, mode: parsed.mode, nextAction: 'Supply notes and select an output.', decisions: [] });
      const path = `Pieces/${piece.id}/Brief.md`;
      return { writes: [created(path, piece, parsed.brief)], result: { id: piece.id, link: `/kessel-run/pieces/${piece.id}` } };
    });
  }

  async createOutput(input: { operationId: string; expectedHash: string; pieceId: string; title: string; format: string; preset: string; voice: schemas.Pin; author: schemas.Pin | null }) {
    const parsed = validatedCommand(baseInput.extend({ pieceId: schemas.id, title: z.string().min(1).max(160), format: z.string().min(1).max(80), preset: z.string().min(1).max(80), voice: schemas.pin, author: schemas.pin.nullable() }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const publicationId = String(piece.metadata.publicationId);
      const publication = schemas.publication.parse(this.find(notes, publicationId, 'publication').metadata);
      const preset = notes.find(note => note.metadata.type === 'output-preset' && note.metadata.publicationId === publicationId && (note.metadata.id === parsed.preset || note.metadata.title === parsed.preset));
      if (!preset || !publication.presets.includes(String(preset.metadata.id))) throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose an allowed publication preset');
      if (parsed.format !== preset.metadata.format) throw new schemas.WorkspaceError('INVALID_INPUT', 'The selected preset format changed. Reload and choose its current format.');
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
      const navigation = `# ${parsed.title}\n\n[Publication](../../../../Publications/${publicationId}.md) · [Brief](../../Brief.md)\n\n[Voice v${parsed.voice.version}](../../../../Voice%20Profiles/${parsed.voice.profileId}/v${parsed.voice.version}.md)\n\n${parsed.author ? `[Author v${parsed.author.version}](../../../../Voice%20Profiles/${parsed.author.profileId}/v${parsed.author.version}.md)\n\n` : ''}[Preset](../../../../Output%20Presets/${preset.metadata.id}.md)\n\n## Retained versions\n`;
      return { writes: [created(path, output, ''), created(path.replace('Output.md', 'Navigation.md'), metadata('output-navigation', parsed.title, { outputId: output.id }), navigation)], result: { id: output.id, hash: hashText(noteText(output, '')), link: `/kessel-run/outputs/${output.id}` } };
    });
  }

  async getContext(outputId: string, sourceOffset = 0) {
    z.number().int().nonnegative().parse(sourceOffset);
    return this.journal.readLocked(async () => this.context(await this.index(), outputId, sourceOffset));
  }

  async getPieceContext(pieceId: string) {
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const piece = this.find(notes, pieceId, 'content-brief');
      this.find(notes, String(piece.metadata.publicationId), 'publication');
      return { piece: summary(piece), sources: notes.filter(note => note.metadata.type === 'source' && note.metadata.pieceId === pieceId).map(summary), artifacts: notes.filter(note => note.metadata.type === 'workflow-artifact' && note.metadata.pieceId === pieceId && note.metadata.publicationId === piece.metadata.publicationId).map(summary) };
    });
  }

  private async selection(notes: Note[], outputId: string): Promise<HandoffBundle> {
      const selected = this.context(notes, outputId, 0, true);
      const publicationId = selected.output.publicationId;
      const pieceId = selected.output.pieceId;
      const included = notes.filter(note => {
        const data = note.metadata;
        return (data.type === 'publication' && data.id === publicationId)
          || (['voice-profile', 'output-preset'].includes(String(data.type)) && data.publicationId === publicationId)
          || (data.type === 'content-brief' && data.id === pieceId)
          || (data.type === 'content-output' && data.id === outputId)
          || (['source', 'workflow-artifact'].includes(String(data.type)) && data.pieceId === pieceId)
          || (data.type === 'revision' && data.outputId === outputId)
          || (data.type === 'proposal' && [publicationId, outputId].includes(data.targetId));
      });
      const files = included.map(note => ({ path: note.path, text: noteText(note.metadata, note.body) }));
      for (const note of included.filter(value => value.metadata.type === 'revision')) {
        const revision = schemas.revision.parse(note.metadata);
        const path = `${selected.output.pieceId ? `Pieces/${selected.output.pieceId}/Outputs/${outputId}/` : ''}Revisions/${revision.id}.prose.md`;
        if (revision.prosePath !== path) throw new schemas.WorkspaceError('INVALID_INPUT', 'Retained prose path disagrees');
        const prose = await readText(this.root, path);
        if (hashText(prose) !== revision.proseHash) throw new schemas.WorkspaceError('CONFLICT', 'Retained prose changed');
        files.push({ path, text: prose });
      }
      return handoffBundle.parse({ format: 'kessel-run-handoff-v1', outputId, files });
  }

  async exportSelection(outputId: string) {
    return this.journal.readLocked(async () => this.selection(await this.index(), outputId));
  }

  async exportSnapshot(outputId: string) {
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const context = this.context(notes, outputId, 0, true);
      const bundle = await this.selection(notes, outputId);
      const revisions = notes.filter(note => note.metadata.type === 'revision' && note.metadata.outputId === outputId).map(note => {
        const revision = schemas.revision.parse(note.metadata);
        return { ...revision, prose: bundle.files.find(file => file.path === revision.prosePath)!.text, acceptedFinal: note.metadata.acceptedFinal === true };
      });
      return { context, bundle, revisions };
    });
  }

  private validateHandoff(bundle: HandoffBundle) {
    const value = handoffBundle.parse(bundle);
    const paths = new Set<string>();
    const notes: Note[] = [];
    const identities = new Set<string>();
    for (const file of value.files) {
      if (paths.has(file.path)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Duplicate restoration path');
      paths.add(file.path);
      if (file.path.endsWith('.prose.md')) continue;
      const note = parseNote(file.text, file.path);
      const type = String(note.metadata.type);
      if (!kinds[type] || type === 'workspace') throw new schemas.WorkspaceError('INVALID_INPUT', 'Unsupported restoration entity');
      kinds[type].parse(note.metadata);
      const key = type === 'voice-profile' ? `${note.metadata.id}:v${note.metadata.version}` : String(note.metadata.id);
      if (identities.has(key)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Duplicate restoration identity');
      identities.add(key); notes.push(note);
    }
    const output = this.find(notes, value.outputId, 'content-output');
    const data = schemas.output.parse(output.metadata);
    if (notes.filter(note => note.metadata.type === 'content-output').length !== 1 || notes.filter(note => note.metadata.type === 'publication').length !== 1 || notes.filter(note => note.metadata.type === 'content-brief').length !== 1) throw new schemas.WorkspaceError('INVALID_INPUT', 'Restore one selected output and its publication/piece');
    this.find(notes, data.publicationId, 'publication');
    for (const note of notes) {
      const item = note.metadata;
      let path: string;
      switch (item.type) {
        case 'publication': path = `Publications/${item.id}.md`; break;
        case 'voice-profile': path = `Voice Profiles/${item.id}/v${item.version}.md`; this.version(notes, { profileId: String(item.id), version: Number(item.version) }, data.publicationId); break;
        case 'output-preset': path = `Output Presets/${item.id}.md`; break;
        case 'content-brief': path = `Pieces/${item.id}/Brief.md`; break;
        case 'content-output': path = `Pieces/${data.pieceId}/Outputs/${item.id}/Output.md`; break;
        case 'source': path = `Pieces/${data.pieceId}/Sources/${item.id}.md`; break;
        case 'workflow-artifact': path = `Pieces/${data.pieceId}/Artifacts/${item.id}.md`; break;
        case 'revision': path = `Pieces/${data.pieceId}/Outputs/${data.id}/Revisions/${item.id}.md`; break;
        case 'proposal': path = item.kind === 'draft' ? `Pieces/${data.pieceId}/Outputs/${data.id}/Proposals/${item.id}.md` : `Proposals/${item.id}.md`; break;
        default: throw new schemas.WorkspaceError('INVALID_INPUT', 'Unsupported restoration path');
      }
      if (note.path !== path || (item.publicationId && item.publicationId !== data.publicationId) || (item.pieceId && item.pieceId !== data.pieceId) || (item.outputId && item.outputId !== data.id) || (item.targetId && item.targetId !== (item.kind === 'profile' ? data.publicationId : data.id))) throw new schemas.WorkspaceError('INVALID_INPUT', 'Restoration paths or entity scopes disagree');
    }
    const revisions = notes.filter(note => note.metadata.type === 'revision');
    const rawPaths = new Set<string>();
    for (const note of revisions) {
      const revision = schemas.revision.parse(note.metadata);
      const path = `Pieces/${data.pieceId}/Outputs/${data.id}/Revisions/${revision.id}.prose.md`;
      const file = value.files.find(file => file.path === path);
      if (revision.prosePath !== path || !file || hashText(file.text) !== revision.proseHash) throw new schemas.WorkspaceError('INVALID_INPUT', 'Restoration prose hash disagrees');
      rawPaths.add(path);
      if (revision.parentRevision && !revisions.some(note => note.metadata.id === revision.parentRevision)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Restoration parent revision is missing');
    }
    if (value.files.some(file => file.path.endsWith('.prose.md') && !rawPaths.has(file.path))) throw new schemas.WorkspaceError('INVALID_INPUT', 'Unowned restoration prose file');
    for (const revisionId of [...data.revisions, data.currentRevision, data.acceptedRevision].filter(Boolean)) if (!revisions.some(note => note.metadata.id === revisionId)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Referenced restoration revision is missing');
    const context = this.context(notes, data.id, 0, true);
    return { value, notes, context };
  }

  async previewHandoff(bundle: HandoffBundle) {
    const validated = this.validateHandoff(bundle);
    return { hash: handoffHash(validated.value), output: validated.context.output, profiles: validated.notes.filter(note => note.metadata.type === 'voice-profile').map(summary), fileCount: validated.value.files.length, decisions: validated.context.pending, restoresEditorialRecords: true };
  }

  async importHandoff(input: { operationId: string; expectedHash: string; previewHash: string; bundle: HandoffBundle }) {
    const parsed = validatedCommand(baseInput.extend({ previewHash: expectedHash, bundle: handoffBundle }).strict(), input);
    const validated = this.validateHandoff(parsed.bundle);
    if (handoffHash(validated.value) !== parsed.previewHash) throw new schemas.WorkspaceError('CONFLICT', 'Restoration preview changed');
    return this.mutate(parsed.operationId, parsed, async notes => {
      const home = notes.find(note => note.metadata.type === 'workspace')!;
      this.check(home, parsed.expectedHash);
      if (notes.some(note => note.metadata.type !== 'workspace')) throw new schemas.WorkspaceError('INVALID_INPUT', 'Restore into a new empty app-managed workspace; existing content is preserved');
      return { writes: validated.value.files.map(file => ({ ...file, previousHash: null })), result: { outputId: validated.value.outputId, restoredFiles: validated.value.files.length } };
    });
  }

  async updatePublication(input: { operationId: string; expectedHash: string; publicationId: string; title: string; purpose: string }) {
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, title: z.string().min(1).max(160), purpose: text }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      return { writes: [changed(publication, { title: parsed.title }, parsed.purpose)], result: { id: parsed.publicationId } };
    });
  }

  async createPreset(input: { operationId: string; expectedHash: string; publicationId: string; title: string; format: string; instructions: string }) {
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, title: z.string().trim().min(1).max(80), format: z.string().trim().min(1).max(80), instructions: text }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      if (notes.some(note => note.metadata.type === 'output-preset' && note.metadata.publicationId === parsed.publicationId && String(note.metadata.title).trim().toLowerCase() === parsed.title.toLowerCase())) throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose a unique preset name in this publication.');
      const preset = metadata('output-preset', parsed.title, { publicationId: parsed.publicationId, format: parsed.format });
      return { writes: [created(`Output Presets/${preset.id}.md`, preset, parsed.instructions), changed(publication, { presets: [...schemas.publication.parse(publication.metadata).presets, preset.id] })], result: { id: preset.id } };
    });
  }

  async updatePreset(input: { operationId: string; expectedHash: string; presetId: string; title: string; instructions: string; format?: string }) {
    const parsed = validatedCommand(baseInput.extend({ presetId: schemas.id, title: z.string().trim().min(1).max(80), instructions: text, format: z.string().trim().min(1).max(80).optional() }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const preset = this.find(notes, parsed.presetId, 'output-preset');
      this.check(preset, parsed.expectedHash);
      const publication = schemas.publication.parse(this.find(notes, String(preset.metadata.publicationId), 'publication').metadata);
      if (!publication.presets.includes(parsed.presetId)) throw new schemas.WorkspaceError('INVALID_INPUT', 'This preset is not available in its publication.');
      if (notes.some(note => note.metadata.type === 'output-preset' && note.metadata.publicationId === publication.id && note.metadata.id !== parsed.presetId && String(note.metadata.title).trim().toLowerCase() === parsed.title.toLowerCase())) throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose a unique preset name in this publication.');
      return { writes: [changed(preset, { title: parsed.title, ...(parsed.format === undefined ? {} : { format: parsed.format }) }, parsed.instructions)], result: { id: parsed.presetId } };
    });
  }

  async exportProfile(input: { publicationId: string; profile: schemas.Pin }) {
    const parsed = validatedCommand(z.object({ publicationId: schemas.id, profile: schemas.pin }).strict(), input);
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      this.find(notes, parsed.publicationId, 'publication');
      const { note, profile } = this.version(notes, parsed.profile, parsed.publicationId);
      // A standalone editorial profile, never a workspace restoration bundle.
      return { format: 'kessel-run-profile-v1' as const, metadata: { id: profile.id, title: profile.title, publicationId: profile.publicationId, version: profile.version, scope: profile.scope, authorId: profile.authorId, parent: profile.parent, status: profile.status, evidenceLevel: profile.evidenceLevel, provenance: profile.provenance }, prose: note.body, proseHash: hashText(note.body) };
    });
  }

  async getPublicationContext(publicationId: string, voicePin: schemas.Pin | null, authorPin: schemas.Pin | null) {
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const publication = this.find(notes, publicationId, 'publication');
      const voice = voicePin ? this.version(notes, voicePin, publicationId) : null;
      const author = authorPin ? this.version(notes, authorPin, publicationId) : null;
      if (voice && voice.profile.scope !== 'publication') throw new schemas.WorkspaceError('INVALID_INPUT', 'Select a publication voice version');
      if (author && (author.profile.scope !== 'author' || !voicePin || author.profile.parent?.profileId !== voicePin.profileId || author.profile.parent.version !== voicePin.version)) {
        throw new schemas.WorkspaceError('MISSING_PROFILE_VERSION', 'Select the exact publication parent of the author version');
      }
      const proposals = notes.filter(note => note.metadata.type === 'proposal' && note.metadata.kind === 'profile' && note.metadata.targetId === publicationId).map(note => {
        const proposal = schemas.proposal.parse(note.metadata);
        const selected = schemas.pin.parse({ profileId: proposal.payload.profileId, version: proposal.payload.version });
        return { proposal: summary(note), profile: summary(this.version(notes, selected, publicationId).note) };
      });
      const profiles = notes.filter(note => note.metadata.type === 'voice-profile' && note.metadata.publicationId === publicationId).map(note => ({ id: note.metadata.id, version: note.metadata.version, scope: note.metadata.scope, status: note.metadata.status, parent: note.metadata.parent, hash: note.hash }));
      const contextHash = hashText(JSON.stringify({ publication: publication.hash, voice: voice?.note.hash ?? null, author: author?.note.hash ?? null, proposals: proposals.map(value => value.proposal.hash), profiles }));
      return { publication: summary(publication), voice: voice ? summary(voice.note) : null, author: author ? summary(author.note) : null, profiles, proposals, contextHash };
    });
  }

  async getRevision(outputId: string, revisionId: string) {
    return this.journal.readLocked(async () => {
      const notes = await this.index();
      const output = this.find(notes, outputId, 'content-output');
      const revision = this.find(notes, revisionId, 'revision');
      const data = schemas.revision.parse(revision.metadata);
      const folder = output.path.slice(0, -'Output.md'.length);
      if (data.outputId !== outputId || data.prosePath !== `${folder}Revisions/${revisionId}.prose.md`) throw new schemas.WorkspaceError('NOT_FOUND', 'Revision is outside the selected output');
      const prose = await readText(this.root, data.prosePath);
      if (hashText(prose) !== data.proseHash) throw new schemas.WorkspaceError('CONFLICT', 'Retained revision prose changed');
      return { ...data, prose };
    });
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
    const linkedProposals = data.proposals.map(id => this.find(notes, id, 'proposal'));
    if (linkedProposals.some(note => note.metadata.targetId !== data.id || !['draft', 'lessons'].includes(String(note.metadata.kind)))) {
      throw new schemas.WorkspaceError('NOT_FOUND', 'Output references a proposal owned by another target');
    }
    const pending = linkedProposals.filter(note => note.metadata.state === 'pending');
    const artifacts = notes.filter(note => note.metadata.type === 'workflow-artifact' && note.metadata.pieceId === data.pieceId && note.metadata.publicationId === data.publicationId);
    const revisions = notes.filter(note => note.metadata.type === 'revision' && note.metadata.outputId === data.id);
    const profileProposals = notes.filter(note => note.metadata.type === 'proposal' && note.metadata.kind === 'profile' && note.metadata.targetId === data.publicationId && note.metadata.state === 'pending').map(note => {
      const proposal = schemas.proposal.parse(note.metadata);
      const profilePin = schemas.pin.parse({ profileId: proposal.payload.profileId, version: proposal.payload.version });
      return { proposal: summary(note), profile: summary(this.version(notes, profilePin, data.publicationId).note) };
    });
    const sourceReferences = sources.map(note => ({ id: note.metadata.id, hash: note.hash }));
    const contextHash = hashText(JSON.stringify({ output: output.hash, brief: piece.hash, preset: preset.hash, voice: voice.note.hash, author: author?.note.hash ?? null, sourceReferences, artifacts: artifacts.map(note => note.hash), proposals: linkedProposals.map(note => note.hash), profileProposals: profileProposals.map(value => value.proposal.hash) }));
    return {
      output: summary(output), brief: summary(piece), voice: summary(voice.note),
      author: author ? summary(author.note) : null,
      preset: summary(preset),
      sources: (fullSources ? sources : sources.slice(sourceOffset, sourceOffset + 1)).map(summary),
      sourceReferences, contextHash,
      nextSourceOffset: sourceOffset + 1 < sources.length ? sourceOffset + 1 : null,
      pending: pending.map(summary),
      artifacts: artifacts.map(summary),
      revisions: revisions.map(note => ({ id: note.metadata.id, parentRevision: note.metadata.parentRevision, provenance: note.metadata.provenance, declaredModel: note.metadata.declaredModel, proseHash: note.metadata.proseHash, created: note.metadata.created })),
      profileProposals,
    };
  }

  async saveSource(input: { operationId: string; expectedHash: string; pieceId: string; title: string; body: string; attribution: string; sourceType: 'notes' | 'interview' | 'supplied-text'; referenceUrl: string | null; dictation?: { recognizedText: string; cleanupApplied: boolean } }) {
    const parsed = validatedCommand(baseInput.extend({ pieceId: schemas.id, title: z.string().min(1).max(160), body: text.min(1), attribution: z.string().min(1).max(2000), sourceType: schemas.source.shape.sourceType, referenceUrl: schemas.source.shape.referenceUrl, dictation: schemas.source.shape.dictation }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const source = metadata('source', parsed.title, { pieceId: parsed.pieceId, attribution: parsed.attribution, sourceType: parsed.sourceType, referenceUrl: parsed.referenceUrl, ...(parsed.dictation ? { dictation: parsed.dictation } : {}) });
      return { writes: [created(`Pieces/${parsed.pieceId}/Sources/${source.id}.md`, source, parsed.body)], result: { id: source.id, hash: hashText(parsed.body), retrievedUrl: false } };
    });
  }

  private draftWrites(notes: Note[], output: Note, prose: string, provenance: 'human' | 'model' | 'external-agent', declaredModel: string | null) {
    const data = schemas.output.parse(output.metadata);
    const selected = this.context(notes, data.id, 0, true);
    const context = {
      snapshotVersion: 1,
      outputSelections: { id: data.id, publicationId: data.publicationId, pieceId: data.pieceId, format: data.format, preset: data.preset, voice: data.voice, author: data.author, currentRevision: data.currentRevision, editorHash: output.hash },
      editorProse: output.body, brief: selected.brief, voice: selected.voice,
      author: selected.author, preset: selected.preset, sources: selected.sources,
      sourceReferences: selected.sourceReferences, artifacts: selected.artifacts,
      pendingDecisions: selected.pending.map(note => ({ id: note.id, state: note.state, kind: note.kind, targetHash: note.targetHash, evidence: note.evidence })),
      pendingProfileProposals: selected.profileProposals.map(value => ({ id: value.proposal.id, hash: value.proposal.hash, evidence: value.proposal.evidence })),
      contextHash: selected.contextHash,
    };
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
    const parsed = validatedCommand(baseInput.extend({ outputId: schemas.id, expectedContextHash: expectedHash, prose: text }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      if (this.context(notes, parsed.outputId).contextHash !== parsed.expectedContextHash) {
        throw new schemas.WorkspaceError('CONFLICT', 'Selected context changed. Reload it and reconcile before saving.');
      }
      const data = schemas.output.parse(output.metadata);
      const draft = this.draftWrites(notes, output, parsed.prose, 'human', null);
      const write = changed(output, { currentRevision: draft.revision.id, acceptedRevision: null, status: 'drafting', revisions: [...data.revisions, draft.revision.id], revision_links: [...(Array.isArray(data.revision_links) ? data.revision_links : []), `[Revision](./Revisions/${draft.revision.id}.prose.md)`] }, parsed.prose);
      const navigation = await this.navigationWrite(output, `[Draft revision](./Revisions/${draft.revision.id}.prose.md)`);
      const acknowledged = this.context(notes.map(note => note === output ? parseNote(write.text, write.path) : note), parsed.outputId);
      return { writes: [...draft.writes, write, navigation], result: { id: parsed.outputId, revision: draft.revision.id, hash: hashText(write.text), contextHash: acknowledged.contextHash } };
    });
  }

  async proposeDraft(input: { operationId: string; expectedHash: string; expectedContextHash: string; outputId: string; prose: string; provenance: 'model' | 'external-agent'; declaredModel: string | null }) {
    const parsed = validatedCommand(baseInput.extend({ outputId: schemas.id, expectedContextHash: expectedHash, prose: text.min(1), provenance: z.enum(['model', 'external-agent']), declaredModel: z.string().max(160).nullable() }).strict(), input);
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
      const navigation = await this.navigationWrite(output, `[Pending candidate](./Revisions/${draft.revision.id}.prose.md)`);
      return {
        writes: [...draft.writes, created(`${folder}Proposals/${proposal.id}.md`, proposal, ''), write, navigation],
        result: { id: data.id, candidateId: draft.revision.id, proposalId: proposal.id, hash: hashText(write.text), link: `/kessel-run/outputs/${data.id}` },
      };
    });
  }

  async recordProgress(input: { operationId: string; expectedHash: string; pieceId: string; nextAction: string }) {
    const parsed = validatedCommand(baseInput.extend({ pieceId: schemas.id, nextAction: z.string().max(2000) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const write = changed(piece, { nextAction: parsed.nextAction });
      return { writes: [write], result: { id: parsed.pieceId, hash: hashText(write.text) } };
    });
  }

  async saveArtifact(input: { operationId: string; expectedHash: string; pieceId: string; title: string; kind: 'research' | 'anchor' | 'hook' | 'outline' | 'review'; body: string }) {
    const parsed = validatedCommand(baseInput.extend({ pieceId: schemas.id, title: z.string().min(1).max(160), kind: schemas.artifact.shape.kind, body: text }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const piece = this.find(notes, parsed.pieceId, 'content-brief');
      this.check(piece, parsed.expectedHash);
      const artifact = metadata('workflow-artifact', parsed.title, { publicationId: piece.metadata.publicationId, pieceId: parsed.pieceId, kind: parsed.kind });
      return { writes: [created(`Pieces/${parsed.pieceId}/Artifacts/${artifact.id}.md`, artifact, parsed.body)], result: { id: artifact.id, kind: parsed.kind, proseChanged: false } };
    });
  }

  async proposeProfile(input: {
    operationId: string; expectedHash: string; publicationId: string; title: string;
    scope: 'publication' | 'author'; parent: schemas.Pin | null; authorId: string | null;
    prior: schemas.Pin | null; prose: string; evidence: string;
  }) {
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, title: z.string().min(1).max(160), scope: z.enum(['publication', 'author']), parent: schemas.pin.nullable(), authorId: schemas.id.nullable(), prior: schemas.pin.nullable(), prose: text.min(1), evidence: z.string().min(1).max(24000) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      const prior = parsed.prior ? this.version(notes, parsed.prior, parsed.publicationId) : null;
      if (prior && (prior.profile.scope !== parsed.scope || prior.profile.authorId !== parsed.authorId)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Profile scope/author cannot be changed by a proposal');
      if (parsed.parent) this.version(notes, parsed.parent, parsed.publicationId);
      const profileId = prior?.profile.id ?? randomUUID();
      const version = 1 + Math.max(0, ...notes.filter(note => note.metadata.type === 'voice-profile' && note.metadata.id === profileId).map(note => Number(note.metadata.version)));
      const profile = schemas.profile.parse(metadata('voice-profile', parsed.title, {
        id: profileId, publicationId: parsed.publicationId, version, scope: parsed.scope,
        authorId: parsed.authorId, parent: parsed.parent, previousVersion: parsed.prior,
        status: 'draft', evidenceLevel: prior?.profile.evidenceLevel ?? 'sparse', provenance: parsed.evidence,
      }));
      const proposal = metadata('proposal', 'Voice profile proposal', {
        kind: 'profile', state: 'pending', targetId: parsed.publicationId, targetHash: publication.hash,
        evidence: parsed.evidence, payload: { profileId, version, previousVersion: parsed.prior },
      });
      return {
        writes: [created(`Voice Profiles/${profileId}/v${version}.md`, profile, parsed.prose), created(`Proposals/${proposal.id}.md`, proposal, '')],
        result: { id: profileId, version, proposalId: proposal.id, state: 'pending', link: `/kessel-run/voices/${profileId}` },
      };
    });
  }

  async proposeLessons(input: {
    operationId: string; expectedHash: string; outputId: string; machineRevisionId: string;
    finalRevisionId: string; target: 'publication' | 'author'; rules: { text: string; evidence: string }[];
  }) {
    const parsed = validatedCommand(baseInput.extend({ outputId: schemas.id, machineRevisionId: schemas.id, finalRevisionId: schemas.id, target: z.enum(['publication', 'author']), rules: z.array(z.object({ text: z.string().min(1).max(4000), evidence: z.string().min(1).max(4000) }).strict()).min(1).max(20) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      const data = schemas.output.parse(output.metadata);
      if (data.acceptedRevision !== parsed.finalRevisionId) throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Lessons require the exact human-accepted final snapshot');
      const machine = schemas.revision.parse(this.find(notes, parsed.machineRevisionId, 'revision').metadata);
      const final = schemas.revision.parse(this.find(notes, parsed.finalRevisionId, 'revision').metadata);
      if (machine.outputId !== data.id || final.outputId !== data.id || machine.provenance === 'human') throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose a retained machine/final pair from this output');
      let ancestor = final.parentRevision;
      const visited = new Set<string>();
      while (ancestor && ancestor !== machine.id) {
        if (visited.has(ancestor)) throw new schemas.WorkspaceError('INVALID_INPUT', 'Revision lineage is corrupt');
        visited.add(ancestor);
        const intermediate = schemas.revision.parse(this.find(notes, ancestor, 'revision').metadata);
        if (intermediate.outputId !== data.id) throw new schemas.WorkspaceError('INVALID_INPUT', 'Revision lineage crosses output scope');
        ancestor = intermediate.parentRevision;
      }
      if (ancestor !== machine.id) throw new schemas.WorkspaceError('INVALID_INPUT', 'Final does not descend from the selected machine draft');
      const pin = parsed.target === 'author' ? data.author : data.voice;
      if (!pin) throw new schemas.WorkspaceError('INVALID_INPUT', 'This output has no selected author overlay');
      this.version(notes, pin, data.publicationId);
      const proposal = metadata('proposal', 'Lessons from retained draft/final comparison', {
        kind: 'lessons', state: 'pending', targetId: data.id, targetHash: output.hash,
        evidence: 'Each rule cites the exact retained machine/final comparison pair.',
        payload: { profile: pin, scope: parsed.target, rules: parsed.rules, machineRevisionId: machine.id, machineHash: machine.proseHash, finalRevisionId: final.id, finalHash: final.proseHash },
      });
      return {
        writes: [created(`Proposals/${proposal.id}.md`, proposal, ''), changed(output, { proposals: [...data.proposals, proposal.id] })],
        result: { proposalId: proposal.id, state: 'pending', profile: pin, humanApprovalRequired: true },
      };
    });
  }

  // Human-only decisions: these methods are absent from both agent tool registries.
  async decideDraft(input: { operationId: string; expectedHash: string; expectedContextHash: string; outputId: string; proposalId: string; accept: boolean }) {
    const parsed = validatedCommand(baseInput.extend({ expectedContextHash: expectedHash, outputId: schemas.id, proposalId: schemas.id, accept: z.boolean() }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      if (this.context(notes, parsed.outputId).contextHash !== parsed.expectedContextHash) throw new schemas.WorkspaceError('CONFLICT', 'Review the updated context before deciding');
      const data = schemas.output.parse(output.metadata);
      const note = this.find(notes, parsed.proposalId, 'proposal');
      const proposal = schemas.proposal.parse(note.metadata);
      if (proposal.targetId !== data.id || proposal.kind !== 'draft' || !data.proposals.includes(proposal.id)) throw new schemas.WorkspaceError('NOT_FOUND', 'Draft proposal is outside this output');
      if (proposal.state !== 'pending') throw new schemas.WorkspaceError('CONFLICT', 'This proposal already has a decision');
      const revision = this.find(notes, schemas.id.parse(proposal.payload.revisionId), 'revision');
      const candidate = schemas.revision.parse(revision.metadata);
      if (candidate.outputId !== data.id) throw new schemas.WorkspaceError('NOT_FOUND', 'Candidate belongs to another output');
      const prose = await readText(this.root, candidate.prosePath);
      if (candidate.prosePath !== `${output.path.slice(0, -'Output.md'.length)}Revisions/${candidate.id}.prose.md`) throw new schemas.WorkspaceError('NOT_FOUND', 'Candidate prose is outside this output');
      if (hashText(prose) !== candidate.proseHash) throw new schemas.WorkspaceError('CONFLICT', 'Candidate prose changed');
      if (parsed.accept && candidate.parentRevision !== data.currentRevision) throw new schemas.WorkspaceError('CONFLICT', 'The editor changed after this candidate. Reconcile both texts manually before accepting.');
      const writes = [changed(note, { state: parsed.accept ? 'accepted' : 'rejected', humanDecision: { at: now(), action: parsed.accept ? 'use-candidate' : 'reject-candidate' } })];
      if (parsed.accept) writes.push(changed(output, { currentRevision: candidate.id, acceptedRevision: null, status: 'review', revisions: [...new Set([...data.revisions, candidate.id])] }, prose));
      return { writes, result: { id: data.id, candidateId: candidate.id, decision: parsed.accept ? 'used' : 'rejected', finalAccepted: false } };
    });
  }

  async acceptFinal(input: { operationId: string; expectedHash: string; expectedContextHash: string; outputId: string; revisionId: string }) {
    const parsed = validatedCommand(baseInput.extend({ expectedContextHash: expectedHash, outputId: schemas.id, revisionId: schemas.id }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      if (this.context(notes, parsed.outputId).contextHash !== parsed.expectedContextHash) throw new schemas.WorkspaceError('CONFLICT', 'Review the exact current context before accepting');
      const data = schemas.output.parse(output.metadata);
      if (data.currentRevision !== parsed.revisionId) throw new schemas.WorkspaceError('CONFLICT', 'Final acceptance must target the exact current prose revision');
      const current = schemas.revision.parse(this.find(notes, parsed.revisionId, 'revision').metadata);
      if (current.outputId !== data.id || current.proseHash !== hashText(output.body)) throw new schemas.WorkspaceError('CONFLICT', 'Editor prose differs from its retained revision');
      const snapshot = this.draftWrites(notes, output, output.body, 'human', null);
      const metadataWrite = snapshot.writes.find(write => write.path.endsWith(`${snapshot.revision.id}.md`))!;
      const snapshotNote = parseNote(metadataWrite.text, metadataWrite.path);
      metadataWrite.text = noteText({ ...snapshotNote.metadata, acceptedFinal: true, humanDecisionAt: now() }, snapshotNote.body);
      const write = changed(output, { acceptedRevision: snapshot.revision.id, currentRevision: snapshot.revision.id, status: 'accepted', revisions: [...data.revisions, snapshot.revision.id] });
      const navigation = await this.navigationWrite(output, `[Accepted final](./Revisions/${snapshot.revision.id}.prose.md)`);
      return { writes: [...snapshot.writes, write, navigation], result: { id: data.id, acceptedRevision: snapshot.revision.id, proseHash: hashText(output.body) } };
    });
  }

  async decideProfile(input: { operationId: string; expectedHash: string; publicationId: string; proposalId: string; expectedProfileHash: string; accept: boolean }) {
    const parsed = validatedCommand(baseInput.extend({ publicationId: schemas.id, proposalId: schemas.id, expectedProfileHash: expectedHash, accept: z.boolean() }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const publication = this.find(notes, parsed.publicationId, 'publication');
      this.check(publication, parsed.expectedHash);
      const note = this.find(notes, parsed.proposalId, 'proposal');
      const proposal = schemas.proposal.parse(note.metadata);
      if (proposal.kind !== 'profile' || proposal.targetId !== parsed.publicationId) throw new schemas.WorkspaceError('NOT_FOUND', 'Profile proposal belongs to another publication');
      if (proposal.state !== 'pending') throw new schemas.WorkspaceError('CONFLICT', 'Profile proposal already has a decision');
      const selected = schemas.pin.parse({ profileId: proposal.payload.profileId, version: proposal.payload.version });
      const candidate = this.version(notes, selected, parsed.publicationId);
      this.check(candidate.note, parsed.expectedProfileHash);
      const writes = [changed(note, { state: parsed.accept ? 'accepted' : 'rejected', humanDecision: { at: now(), accept: parsed.accept } })];
      let approved: schemas.Pin | null = null;
      if (parsed.accept) {
        if (publication.hash !== proposal.targetHash) throw new schemas.WorkspaceError('CONFLICT', 'Publication changed since this profile proposal. Review current rules and submit a new proposal.');
        const approvedVersions = notes.filter(value => value.metadata.type === 'voice-profile' && value.metadata.id === selected.profileId && value.metadata.status === 'approved');
        const latest = approvedVersions.sort((a, b) => Number(b.metadata.version) - Number(a.metadata.version))[0];
        const prior = candidate.note.metadata.previousVersion ? schemas.pin.parse(candidate.note.metadata.previousVersion) : null;
        if (latest && (!prior || latest.metadata.version !== prior.version || latest.metadata.id !== prior.profileId)) throw new schemas.WorkspaceError('CONFLICT', 'A newer approved profile exists. Rebase the proposal explicitly.');
        if (candidate.profile.parent) {
          const parent = this.version(notes, candidate.profile.parent, parsed.publicationId);
          if (parent.profile.scope !== 'publication' || parent.profile.status !== 'approved') throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'Author approval requires an approved publication parent');
        }
        const version = 1 + Math.max(...notes.filter(value => value.metadata.type === 'voice-profile' && value.metadata.id === selected.profileId).map(value => Number(value.metadata.version)));
        const profile = { ...candidate.profile, version, status: 'approved', created: now(), updated: now(), approvedFrom: selected, humanDecisionAt: now() };
        approved = { profileId: selected.profileId, version };
        writes.push(created(`Voice Profiles/${selected.profileId}/v${version}.md`, profile, candidate.note.body));
        if (candidate.profile.scope === 'publication') writes.push(changed(publication, { defaultVoice: approved, default_voice_link: `[Voice v${version}](../Voice%20Profiles/${selected.profileId}/v${version}.md)` }));
      }
      return { writes, result: { proposalId: proposal.id, approved, state: parsed.accept ? 'accepted' : 'rejected' } };
    });
  }

  async decideLessons(input: { operationId: string; expectedHash: string; outputId: string; proposalId: string; expectedProposalHash: string; expectedProfileHash: string; decisions: { index: number; accept: boolean }[] }) {
    const parsed = validatedCommand(baseInput.extend({ outputId: schemas.id, proposalId: schemas.id, expectedProposalHash: expectedHash, expectedProfileHash: expectedHash, decisions: z.array(z.object({ index: z.number().int().nonnegative(), accept: z.boolean() }).strict()).min(1).max(20) }).strict(), input);
    return this.mutate(parsed.operationId, parsed, async notes => {
      const output = this.find(notes, parsed.outputId, 'content-output');
      this.check(output, parsed.expectedHash);
      const data = schemas.output.parse(output.metadata);
      const proposalNote = this.find(notes, parsed.proposalId, 'proposal');
      this.check(proposalNote, parsed.expectedProposalHash);
      const proposal = schemas.proposal.parse(proposalNote.metadata);
      if (proposal.kind !== 'lessons' || proposal.targetId !== data.id || !data.proposals.includes(proposal.id)) throw new schemas.WorkspaceError('NOT_FOUND', 'Lesson proposal belongs to another output');
      if (proposal.state !== 'pending') throw new schemas.WorkspaceError('CONFLICT', 'Lessons already have final decisions');
      if (data.acceptedRevision !== proposal.payload.finalRevisionId) throw new schemas.WorkspaceError('APPROVAL_REQUIRED', 'The exact comparison final must still be accepted');
      const machine = schemas.revision.parse(this.find(notes, schemas.id.parse(proposal.payload.machineRevisionId), 'revision').metadata);
      const final = schemas.revision.parse(this.find(notes, schemas.id.parse(proposal.payload.finalRevisionId), 'revision').metadata);
      if (machine.outputId !== data.id || final.outputId !== data.id || machine.proseHash !== proposal.payload.machineHash || final.proseHash !== proposal.payload.finalHash) throw new schemas.WorkspaceError('CONFLICT', 'Comparison snapshots disagree');
      const originalPin = schemas.pin.parse(proposal.payload.profile);
      const scopedPin = proposal.payload.scope === 'author' ? data.author : data.voice;
      if (!scopedPin || scopedPin.profileId !== originalPin.profileId || scopedPin.version !== originalPin.version) throw new schemas.WorkspaceError('CONFLICT', 'Lesson target differs from the output pin');
      const basePin = proposalNote.metadata.approvedProfile ? schemas.pin.parse(proposalNote.metadata.approvedProfile) : originalPin;
      const base = this.version(notes, basePin, data.publicationId);
      if (base.profile.scope !== proposal.payload.scope || base.profile.status !== 'approved') throw new schemas.WorkspaceError('INVALID_INPUT', 'Lesson profile scope or approval disagrees');
      this.check(base.note, parsed.expectedProfileHash);
      const latest = notes.filter(value => value.metadata.type === 'voice-profile' && value.metadata.id === basePin.profileId && value.metadata.status === 'approved').sort((a, b) => Number(b.metadata.version) - Number(a.metadata.version))[0];
      const approving = parsed.decisions.some(decision => decision.accept);
      if (approving && (!latest || latest.metadata.version !== basePin.version)) throw new schemas.WorkspaceError('CONFLICT', 'A newer approved profile exists. Review and rebase lessons instead of replacing its rules.');
      if (approving && base.profile.scope === 'publication') {
        const publication = schemas.publication.parse(this.find(notes, data.publicationId, 'publication').metadata);
        if (publication.defaultVoice?.profileId !== basePin.profileId || publication.defaultVoice.version !== basePin.version) throw new schemas.WorkspaceError('CONFLICT', 'Publication default changed. Review the current voice before approving these lessons.');
      }
      const rules = z.array(z.object({ text: z.string(), evidence: z.string() }).strict()).parse(proposal.payload.rules);
      const priorDecisions = z.record(z.string(), z.boolean()).parse(proposalNote.metadata.ruleDecisions ?? {});
      const seen = new Set<number>();
      for (const decision of parsed.decisions) {
        if (decision.index >= rules.length || seen.has(decision.index) || String(decision.index) in priorDecisions) throw new schemas.WorkspaceError('INVALID_INPUT', 'Choose each undecided lesson once');
        seen.add(decision.index); priorDecisions[String(decision.index)] = decision.accept;
      }
      const accepted = parsed.decisions.filter(value => value.accept).map(value => rules[value.index]);
      const writes: Write[] = [];
      let approvedProfile = basePin;
      if (accepted.length) {
        const version = 1 + Math.max(...notes.filter(value => value.metadata.type === 'voice-profile' && value.metadata.id === basePin.profileId).map(value => Number(value.metadata.version)));
        approvedProfile = { profileId: basePin.profileId, version };
        const body = `${base.note.body}\n\n## Approved lessons\n\n${accepted.map(rule => `- ${rule.text}\n  Evidence: ${rule.evidence}`).join('\n')}\n`;
        const profile = { ...base.profile, version, status: 'approved', previousVersion: basePin, created: now(), updated: now(), lessonComparison: { machineRevisionId: machine.id, finalRevisionId: final.id }, humanDecisionAt: now() };
        writes.push(created(`Voice Profiles/${basePin.profileId}/v${version}.md`, profile, body));
        if (base.profile.scope === 'publication') {
          const publication = this.find(notes, data.publicationId, 'publication');
          writes.push(changed(publication, { defaultVoice: approvedProfile, default_voice_link: `[Voice v${version}](../Voice%20Profiles/${basePin.profileId}/v${version}.md)` }));
        }
      }
      const complete = Object.keys(priorDecisions).length === rules.length;
      const state = complete ? Object.values(priorDecisions).some(Boolean) ? 'accepted' : 'rejected' : 'pending';
      writes.push(changed(proposalNote, { state, ruleDecisions: priorDecisions, approvedProfile, humanDecisionAt: now() }));
      return { writes, result: { proposalId: proposal.id, state, approvedProfile, decisions: priorDecisions } };
    });
  }
}
