import { z } from 'zod';

export const id = z.string().uuid();
export const pin = z.object({ profileId: id, version: z.number().int().positive() }).strict();
export const errorCodes = z.enum(['NOT_FOUND', 'CONFLICT', 'INVALID_INPUT', 'MISSING_PROFILE_VERSION', 'APPROVAL_REQUIRED', 'CAPABILITY_UNAVAILABLE']);
export type ErrorCode = z.infer<typeof errorCodes>;
export class WorkspaceError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.code = code; }
}
export const common = z.object({
  id, title: z.string().min(1).max(160), schema_version: z.literal(1),
  created: z.string(), updated: z.string(), tags: z.array(z.string()),
}).passthrough();
export const workspace = common.extend({ type: z.literal('workspace'), version: z.number().int().nonnegative() });
export const publication = common.extend({ type: z.literal('publication'), defaultVoice: pin.nullable(), presets: z.array(id) });
export const preset = common.extend({ type: z.literal('output-preset'), publicationId: id, format: z.string().min(1).max(80) });
export const profile = common.extend({
  type: z.literal('voice-profile'), publicationId: id, version: z.number().int().positive(),
  scope: z.enum(['publication', 'author']), authorId: id.nullable(), parent: pin.nullable(),
  status: z.enum(['draft', 'approved']), evidenceLevel: z.enum(['sparse', 'developing', 'established']),
  provenance: z.string().max(12000),
}).superRefine((value, context) => {
  if (value.scope === 'author' && (!value.authorId || !value.parent)) {
    context.addIssue({ code: 'custom', message: 'Author profiles require an exact parent and author ID' });
  }
});
export const piece = common.extend({
  type: z.literal('content-brief'), publicationId: id, mode: z.enum(['guided', 'fast']),
  nextAction: z.string().max(2000), decisions: z.array(z.string().max(2000)),
});
export const output = common.extend({
  type: z.literal('content-output'), publicationId: id, pieceId: id, format: z.string().min(1).max(80),
  voice: pin, author: pin.nullable(), preset: z.string().min(1).max(80),
  status: z.enum(['drafting', 'review', 'accepted']), currentRevision: id.nullable(),
  acceptedRevision: id.nullable(), revisions: z.array(id), proposals: z.array(id),
});
export const source = common.extend({
  type: z.literal('source'), pieceId: id, attribution: z.string().min(1).max(2000),
  sourceType: z.enum(['notes', 'interview', 'supplied-text']),
  referenceUrl: z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'References must use http or https').nullable(),
});
export const revision = common.extend({
  type: z.literal('revision'), outputId: id, parentRevision: id.nullable(),
  provenance: z.enum(['human', 'model', 'external-agent']), declaredModel: z.string().max(160).nullable(),
  context: z.record(z.string(), z.unknown()), prosePath: z.string(), proseHash: z.string(),
});
export const proposal = common.extend({
  type: z.literal('proposal'), kind: z.enum(['draft', 'profile', 'lessons']),
  state: z.enum(['pending', 'accepted', 'rejected']), targetId: id, targetHash: z.string(),
  evidence: z.string().max(24000), payload: z.record(z.string(), z.unknown()),
});
export const artifact = common.extend({
  type: z.literal('workflow-artifact'), publicationId: id, pieceId: id,
  kind: z.enum(['research', 'anchor', 'hook', 'outline', 'review']),
});
export const entitySchemas = { workspace, publication, profile, piece, output, source, revision, proposal };
export type Pin = z.infer<typeof pin>;
export type Output = z.infer<typeof output>;
export type WorkspaceEntity = z.infer<typeof workspace>;
export type OutputEntity = { metadata: Output; body: string; hash: string; path: string };
