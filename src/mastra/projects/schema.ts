import { z } from 'zod';

/** Content formats the pipeline supports, from the Anchor skill's format list. */
export const CONTENT_FORMATS = [
  'article',
  'newsletter',
  'linkedin-post',
  'thread',
  'video-script',
  'short-social',
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

/** Framing options offered by the Anchor skill. */
export const FRAMINGS = [
  'builder',
  'guide',
  'analysis',
  'story',
  'contrarian',
] as const;

export const anchorSchema = z.object({
  idea: z.string(),
  publication: z.string(),
  format: z.enum(CONTENT_FORMATS),
  audience: z.string(),
  goal: z.string(),
  framing: z.string(),
  missionAlignment: z.string(),
  keySourceMaterial: z.string(),
  scopeNotes: z.string(),
});

/**
 * Working-memory shape for one content project.
 *
 * Every artifact is nullable and starts null. The agent fills them in via
 * Mastra's working-memory tool as it completes each stage; nothing else writes
 * here. Markdown strings are used for the artifacts the skills emit as prose.
 */
export const projectStateSchema = z.object({
  /** Highest pipeline stage completed, or null before Anchor. 0..7. */
  currentStage: z.number().min(0).max(7).nullable(),
  /** Stage 0 — research brief, markdown. */
  researchBrief: z.string().nullable(),
  /** Stage 1 — the structured anchor. */
  anchor: anchorSchema.nullable(),
  /** Stage 2 — ideation map, markdown. */
  ideationMap: z.string().nullable(),
  /** Stage 3 — chosen hook and its bridge sentence. */
  hook: z
    .object({
      opening: z.string(),
      bridge: z.string(),
    })
    .nullable(),
  /** Stage 4 — beat-by-beat blueprint, markdown. */
  beatMap: z.string().nullable(),
  /** Stage 5 — the draft, markdown. */
  draft: z.string().nullable(),
  /** Stage 6 — authenticity audit notes, markdown. */
  personalizationNotes: z.string().nullable(),
  /** Stage 7 — seven-dimension scorecard, markdown. */
  polishScorecard: z.string().nullable(),
});

export type ProjectState = z.infer<typeof projectStateSchema>;
export type Anchor = z.infer<typeof anchorSchema>;

/** A project with nothing produced yet. */
export const EMPTY_PROJECT_STATE: ProjectState = {
  currentStage: null,
  researchBrief: null,
  anchor: null,
  ideationMap: null,
  hook: null,
  beatMap: null,
  draft: null,
  personalizationNotes: null,
  polishScorecard: null,
};

/** Thread metadata marking a thread as a Kessel Run project. */
export const PROJECT_THREAD_KIND = 'kessel-run-project';

export const projectMetadataSchema = z.object({
  kind: z.literal(PROJECT_THREAD_KIND),
  /** Publication this piece is for. */
  publication: z.string(),
  /** Target format. */
  format: z.enum(CONTENT_FORMATS),
  /** Skill the UI last pinned for this project, if any. */
  pinnedSkill: z.string().nullable(),
});

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

/**
 * Which pipeline stage maps to which artifact field. Used by the UI to show
 * what a stage produced, and by `stageIsComplete` below.
 */
export const STAGE_ARTIFACT_FIELD = {
  0: 'researchBrief',
  1: 'anchor',
  2: 'ideationMap',
  3: 'hook',
  4: 'beatMap',
  5: 'draft',
  6: 'personalizationNotes',
  7: 'polishScorecard',
} as const satisfies Record<number, keyof ProjectState>;

export function stageIsComplete(state: ProjectState, stage: number): boolean {
  const field = STAGE_ARTIFACT_FIELD[stage as keyof typeof STAGE_ARTIFACT_FIELD];
  return field !== undefined && state[field] !== null;
}
