import { z } from 'zod';
import { boundedJSON, LocalAccessError, requireLocalSession, requireWorkspaceReference } from '@/server/kessel-run/local-session';
import { configuredWorkspace } from '@/server/kessel-run/workspace/config';
import { WorkspaceError } from '@/server/kessel-run/workspace/schema';
import { exportOutput } from '@/server/kessel-run/workspace/import-export';
import { parseHandoff } from '@/server/kessel-run/workspace/handoff';
export const runtime = 'nodejs';
const envelope = z.object({ action: z.enum(['publication', 'publication-update', 'preset-update', 'preset-create', 'profile-export', 'profile-preview', 'profile-import', 'profile-propose', 'profile-decision', 'draft-decision', 'final-accept', 'lessons-propose', 'lessons-decision', 'piece', 'piece-update', 'piece-context', 'output', 'source', 'editor', 'context', 'revision', 'publication-context', 'export', 'handoff-preview', 'handoff-import']), input: z.unknown() }).strict();
type Service = Awaited<ReturnType<typeof configuredWorkspace>>['service'];
function input<T>(value: unknown): T { return value as T; }
export async function POST(request: Request) {
  try {
    const session = await requireLocalSession(request, true);
    const { service, configuration } = await configuredWorkspace();
    if (configuration.id !== session.workspaceId) throw new LocalAccessError();
    requireWorkspaceReference(request, configuration.id);
    const command = envelope.parse(await boundedJSON(request, 10000000));
    let result: unknown;
    switch (command.action) {
      case 'publication': result = await service.createPublication(input<Parameters<Service['createPublication']>[0]>(command.input)); break;
      case 'publication-update': result = await service.updatePublication(input<Parameters<Service['updatePublication']>[0]>(command.input)); break;
      case 'preset-create': result = await service.createPreset(input<Parameters<Service['createPreset']>[0]>(command.input)); break;
      case 'profile-export': result = await service.exportProfile(input<Parameters<Service['exportProfile']>[0]>(command.input)); break;
      case 'preset-update': result = await service.updatePreset(input<Parameters<Service['updatePreset']>[0]>(command.input)); break;
      case 'profile-preview': result = await service.previewProfile(input<Parameters<Service['previewProfile']>[0]>(command.input)); break;
      case 'profile-import': result = await service.confirmProfileImport(input<Parameters<Service['confirmProfileImport']>[0]>(command.input)); break;
      case 'profile-propose': result = await service.proposeProfile(input<Parameters<Service['proposeProfile']>[0]>(command.input)); break;
      case 'profile-decision': result = await service.decideProfile(input<Parameters<Service['decideProfile']>[0]>(command.input)); break;
      case 'draft-decision': result = await service.decideDraft(input<Parameters<Service['decideDraft']>[0]>(command.input)); break;
      case 'final-accept': result = await service.acceptFinal(input<Parameters<Service['acceptFinal']>[0]>(command.input)); break;
      case 'lessons-propose': result = await service.proposeLessons(input<Parameters<Service['proposeLessons']>[0]>(command.input)); break;
      case 'lessons-decision': result = await service.decideLessons(input<Parameters<Service['decideLessons']>[0]>(command.input)); break;
      case 'piece': result = await service.createPiece(input<Parameters<Service['createPiece']>[0]>(command.input)); break;
      case 'piece-update': result = await service.updatePiece(input<Parameters<Service['updatePiece']>[0]>(command.input)); break;
      case 'output': result = await service.createOutput(input<Parameters<Service['createOutput']>[0]>(command.input)); break;
      case 'source': result = await service.saveSource(input<Parameters<Service['saveSource']>[0]>(command.input)); break;
      case 'editor': result = await service.saveEditor(input<Parameters<Service['saveEditor']>[0]>(command.input)); break;
      case 'context': {
        const value = z.object({ outputId: z.string().uuid(), sourceOffset: z.number().int().nonnegative().default(0) }).strict().parse(command.input);
        result = await service.getContext(value.outputId, value.sourceOffset); break;
      }
      case 'piece-context': {
        const value = z.object({ pieceId: z.string().uuid() }).strict().parse(command.input);
        result = await service.getPieceContext(value.pieceId); break;
      }
      case 'revision': {
        const value = z.object({ outputId: z.string().uuid(), revisionId: z.string().uuid() }).strict().parse(command.input);
        result = await service.getRevision(value.outputId, value.revisionId); break;
      }
      case 'publication-context': {
        const value = z.object({ publicationId: z.string().uuid() }).strict().parse(command.input);
        result = await service.getPublicationContext(value.publicationId, null, null); break;
      }
      case 'export': {
        const { outputId, ...expected } = z.object({ outputId: z.string().uuid(), expectedRevision: z.string().uuid().nullable().optional(), expectedHash: z.string().length(64).optional(), expectedContextHash: z.string().length(64).optional() }).strict().parse(command.input);
        result = await exportOutput(service, outputId, expected); break;
      }
      case 'handoff-preview': {
        const value = z.object({ markdown: z.string().max(8000000) }).strict().parse(command.input);
        result = await service.previewHandoff(parseHandoff(value.markdown)); break;
      }
      case 'handoff-import': {
        const value = z.object({ operationId: z.string().uuid(), expectedHash: z.string().length(64), previewHash: z.string().length(64), markdown: z.string().max(8000000) }).strict().parse(command.input);
        const { markdown, ...input } = value;
        result = await service.importHandoff({ ...input, bundle: parseHandoff(markdown) }); break;
      }
    }
    return Response.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code = error instanceof WorkspaceError ? error.code : 'INVALID_INPUT';
    // Only explicit command-boundary / zero-write journal rejection is definitive.
    const outcome = error instanceof WorkspaceError ? error.outcome : 'unknown';
    return Response.json({ code: error instanceof LocalAccessError && error.status === 409 ? 'CONFLICT' : code, outcome, error: error instanceof WorkspaceError ? error.message : error instanceof LocalAccessError && error.status === 409 ? 'Workspace selection changed. Preserve your editor buffer and reload this tab.' : error instanceof LocalAccessError ? 'Pair this browser using the launcher link.' : 'Content operation failed. Preserve your input and check the selected workspace.' }, { status: error instanceof LocalAccessError ? error.status : code === 'CONFLICT' ? 409 : 400 });
  }
}
