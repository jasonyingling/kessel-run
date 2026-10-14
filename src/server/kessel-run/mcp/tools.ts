import { z } from 'zod';
import { WorkspaceService } from '../workspace/service';
import { WorkspaceError, pin } from '../workspace/schema';
import { workflowContext } from '../skills/context';
import { KESSEL_RUN_SKILLS } from '@/mastra/skills/catalog';
import type { Grant } from './access-tokens';

const id = z.string().uuid();
const hash = z.string().length(64);
const title = z.string().min(1).max(160);
const body = z.string().max(80000);
const mutation = z.object({ operationId: id, expectedHash: hash });
const page = z.object({ offset: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(20).default(10) });
export const toolSchemas = {
  kr_list_publications: page.strict(),
  kr_list_pieces: page.extend({ publicationId: id.optional() }).strict(),
  kr_get_context: z.object({ outputId: id.optional(), publicationId: id.optional(), voice: pin.nullable().optional(), author: pin.nullable().optional(), section: z.enum(['summary', 'brief', 'voice', 'author', 'preset', 'source', 'output', 'pending', 'artifacts', 'revisions', 'revision', 'profile-proposals']).default('summary'), revisionId: id.optional(), sourceOffset: z.number().int().nonnegative().default(0), offset: z.number().int().nonnegative().default(0) }).strict().refine(value => Boolean(value.outputId) !== Boolean(value.publicationId), 'Select exactly one output or publication'),
  kr_get_workflow: z.object({ name: z.enum(KESSEL_RUN_SKILLS.map(skill => skill.name)).default('kessel-run-start'), offset: z.number().int().nonnegative().default(0) }).strict(),
  kr_create_piece: mutation.extend({ publicationId: id, title, brief: body, mode: z.enum(['guided', 'fast']) }).strict(),
  kr_create_output: mutation.extend({ pieceId: id, title, format: z.string().min(1).max(80), preset: z.string().min(1).max(80), voice: pin, author: pin.nullable() }).strict(),
  kr_save_source: mutation.extend({ pieceId: id, title, body: body.min(1), attribution: z.string().min(1).max(2000), sourceType: z.enum(['notes', 'interview', 'supplied-text']), referenceUrl: z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)).nullable() }).strict(),
  kr_save_artifact: mutation.extend({ pieceId: id, title, kind: z.enum(['research', 'anchor', 'hook', 'outline', 'review']), body }).strict(),
  kr_propose_draft: mutation.extend({ outputId: id, expectedContextHash: hash, prose: body.min(1), declaredModel: z.string().max(160).nullable().default(null) }).strict(),
  kr_propose_profile: mutation.extend({ publicationId: id, title, scope: z.enum(['publication', 'author']), parent: pin.nullable(), authorId: id.nullable(), prior: pin.nullable(), prose: body.min(1), evidence: z.string().min(1).max(24000) }).strict(),
  kr_propose_lessons: mutation.extend({ outputId: id, machineRevisionId: id, finalRevisionId: id, target: z.enum(['publication', 'author']), rules: z.array(z.object({ text: z.string().min(1).max(4000), evidence: z.string().min(1).max(4000) }).strict()).min(1).max(20) }).strict(),
  kr_record_progress: mutation.extend({ pieceId: id, nextAction: z.string().max(2000) }).strict(),
};
export type ToolName = keyof typeof toolSchemas;
export const descriptions: Record<ToolName, string> = {
  kr_list_publications: 'Read scoped publication summaries with hashes. No model inference.',
  kr_list_pieces: 'Read scoped piece summaries and next actions. No model inference.',
  kr_get_context: 'Read exact selected snapshots in 16k-character pages. Read every needed section/source; keep the same contextHash across pages. URLs are references only. External private chat is unavailable.',
  kr_get_workflow: 'Read an allowlisted canonical writing skill and bundled references in bounded pages with a content hash. Start/Resume is the default entry point.',
  kr_create_piece: 'Create a piece under an allowed publication using its exact expectedHash. Does not generate prose or approve editorial decisions.',
  kr_create_output: 'Create an independent output with exact approved voice/author pins and a publication preset. Does not generate prose or inherit another output status.',
  kr_save_source: 'Append supplied notes/interview text with attribution. Does not fetch reference URLs or invent retrieval. Requires source-write permission.',
  kr_save_artifact: 'Save allowlisted research/anchor/hook/outline/review material separately from prose. Cannot make a scorecard final prose.',
  kr_propose_draft: 'Save agent-supplied immutable prose as a pending proposal. Requires expected output and context hashes; cannot overwrite the editor or approve final prose. declaredModel is unverified metadata.',
  kr_propose_profile: 'Propose immutable publication/author rules with evidence and exact prior/parent pins. Never publishes an approved voice version.',
  kr_propose_lessons: 'Propose evidenced rules from an exact retained machine/accepted-final lineage pair. Never approves lessons or changes voice pins.',
  kr_record_progress: 'Record the next action while preserving existing decisions. Cannot manufacture editorial approval.',
};
const readOnly = new Set<ToolName>(['kr_list_publications', 'kr_list_pieces', 'kr_get_context', 'kr_get_workflow']);
function publicationAllowed(grant: Grant, publicationId: string) {
  return grant.publicationIds === null || grant.publicationIds.includes(publicationId);
}
function boundedSummary(entity: Record<string, unknown>) {
  return {
    id: entity.id, title: entity.title, hash: entity.hash,
    publicationId: entity.publicationId, defaultVoice: entity.defaultVoice,
    mode: entity.mode, nextAction: typeof entity.nextAction === 'string' ? entity.nextAction.slice(0, 2000) : undefined,
    presets: entity.presets,
  };
}

export async function executeDomainTool(
  name: ToolName, args: unknown, service: WorkspaceService, grant: Grant,
  provenance: 'model' | 'external-agent' = 'external-agent',
) {
  // Scope is checked before entering the service, including before the journal
  // can return a cached idempotent result. A caller cannot supply an owner ID.
  const state = await service.overview();
  if (state.workspace.id !== grant.workspaceId) throw new WorkspaceError('NOT_FOUND', 'Connection belongs to another workspace');
  if (!readOnly.has(name) && !(name === 'kr_save_source' ? grant.allowSources : grant.allowDrafts)) {
    throw new WorkspaceError('APPROVAL_REQUIRED', 'This connection does not allow that mutation');
  }
  const checkPublication = (publicationId: string) => {
    if (!publicationAllowed(grant, publicationId) || !state.publications.some(publication => publication.id === publicationId)) throw new WorkspaceError('NOT_FOUND', 'Publication is outside the connection scope');
  };
  const checkPiece = (pieceId: string) => {
    const piece = state.pieces.find(piece => piece.id === pieceId);
    if (!piece) throw new WorkspaceError('NOT_FOUND', 'Piece was not found');
    checkPublication(String(piece.publicationId));
  };
  const checkOutput = (outputId: string) => {
    const output = state.outputs.find(output => output.id === outputId);
    if (!output) throw new WorkspaceError('NOT_FOUND', 'Output was not found');
    checkPublication(String(output.publicationId));
    checkPiece(String(output.pieceId));
    const piece = state.pieces.find(piece => piece.id === output.pieceId)!;
    if (piece.publicationId !== output.publicationId) throw new WorkspaceError('NOT_FOUND', 'Output/piece publication links disagree');
  };
  switch (name) {
    case 'kr_list_publications': {
      const input = toolSchemas[name].parse(args);
      const all = state.publications.filter(publication => publicationAllowed(grant, String(publication.id)));
      return { items: all.slice(input.offset, input.offset + input.limit).map(boundedSummary), nextOffset: input.offset + input.limit < all.length ? input.offset + input.limit : null };
    }
    case 'kr_list_pieces': {
      const input = toolSchemas[name].parse(args);
      if (input.publicationId) checkPublication(input.publicationId);
      const all = state.pieces.filter(piece => publicationAllowed(grant, String(piece.publicationId)) && (!input.publicationId || piece.publicationId === input.publicationId));
      return { items: all.slice(input.offset, input.offset + input.limit).map(boundedSummary), nextOffset: input.offset + input.limit < all.length ? input.offset + input.limit : null };
    }
    case 'kr_get_context': {
      const input = toolSchemas[name].parse(args);
      if (input.publicationId) {
        checkPublication(input.publicationId);
        const context = await service.getPublicationContext(input.publicationId, input.voice ?? null, input.author ?? null);
        const sections = { summary: { publication: context.publication, profiles: context.profiles }, voice: context.voice, author: context.author, 'profile-proposals': context.proposals };
        if (!(input.section in sections)) throw new WorkspaceError('INVALID_INPUT', 'Publication context supports summary, voice, author and profile-proposals');
        const serialized = JSON.stringify(sections[input.section as keyof typeof sections]);
        const text = serialized.slice(input.offset, input.offset + 16000);
        return { publicationId: input.publicationId, section: input.section, format: 'json', contextHash: context.contextHash, publicationHash: context.publication.hash, text, nextOffset: input.offset + text.length < serialized.length ? input.offset + text.length : null };
      }
      if (!input.outputId) throw new WorkspaceError('INVALID_INPUT', 'Select an output');
      if (input.voice !== undefined || input.author !== undefined) throw new WorkspaceError('INVALID_INPUT', 'Output context uses its retained pins');
      checkOutput(input.outputId);
      const context = await service.getContext(input.outputId, input.sourceOffset);
      const sections = {
        summary: { outputId: context.output.id, outputHash: context.output.hash, contextHash: context.contextHash, publicationId: context.output.publicationId, pieceId: context.output.pieceId, voice: context.output.voice, author: context.output.author, preset: context.output.preset, status: context.output.status, sourceCount: context.sourceReferences.length, pendingCount: context.pending.length },
        brief: context.brief, voice: context.voice, author: context.author,
        preset: context.preset, source: context.sources[0] ?? null,
        output: context.output, pending: context.pending,
        artifacts: context.artifacts, revisions: context.revisions,
        revision: input.section === 'revision' && input.revisionId ? await service.getRevision(input.outputId, input.revisionId) : null,
        'profile-proposals': context.profileProposals,
      };
      if (input.section === 'revision' && !input.revisionId) throw new WorkspaceError('INVALID_INPUT', 'Select the retained revision ID');
      const serialized = JSON.stringify(sections[input.section]);
      const text = serialized.slice(input.offset, input.offset + 16000);
      return { outputId: input.outputId, section: input.section, format: 'json', contextHash: context.contextHash, outputHash: context.output.hash, text, nextOffset: input.offset + text.length < serialized.length ? input.offset + text.length : null, nextSourceOffset: context.nextSourceOffset };
    }
    case 'kr_get_workflow': {
      const input = toolSchemas[name].parse(args);
      return workflowContext(input.name, input.offset);
    }
    case 'kr_create_piece': {
      const input = toolSchemas[name].parse(args); checkPublication(input.publicationId);
      return service.createPiece(input);
    }
    case 'kr_create_output': {
      const input = toolSchemas[name].parse(args); checkPiece(input.pieceId);
      return service.createOutput(input);
    }
    case 'kr_save_source': {
      const input = toolSchemas[name].parse(args); checkPiece(input.pieceId);
      return service.saveSource(input);
    }
    case 'kr_save_artifact': {
      const input = toolSchemas[name].parse(args); checkPiece(input.pieceId);
      return service.saveArtifact(input);
    }
    case 'kr_propose_draft': {
      const input = toolSchemas[name].parse(args); checkOutput(input.outputId);
      return service.proposeDraft({ ...input, provenance });
    }
    case 'kr_propose_profile': {
      const input = toolSchemas[name].parse(args); checkPublication(input.publicationId);
      return service.proposeProfile(input);
    }
    case 'kr_propose_lessons': {
      const input = toolSchemas[name].parse(args); checkOutput(input.outputId);
      return service.proposeLessons(input);
    }
    case 'kr_record_progress': {
      const input = toolSchemas[name].parse(args); checkPiece(input.pieceId);
      return service.recordProgress(input);
    }
  }
}
