/**
 * Static catalog of the Kessel Run skills.
 *
 * Skill *instructions* live in `src/mastra/skills/<name>/SKILL.md` and are
 * loaded by Mastra at runtime. This module carries only the pipeline metadata
 * the markdown frontmatter has no place for — stage ordering and time targets —
 * plus the display labels the UI needs.
 *
 * `SKILL_DIR` paths are relative to `process.cwd()` because that is how
 * Mastra's LocalSkillSource resolves them.
 */

export const SKILLS_DIR = './src/mastra/skills';

export type KesselRunSkillName =
  | 'kessel-run-research'
  | 'kessel-run-anchor'
  | 'kessel-run-ideation'
  | 'kessel-run-hook'
  | 'kessel-run-architecture'
  | 'kessel-run-draft'
  | 'kessel-run-personalize'
  | 'kessel-run-polish'
  | 'kessel-run-review'
  | 'kessel-run-repurpose'
  | 'kessel-run-analyze';

export type KesselRunSkill = {
  name: KesselRunSkillName;
  /** Short display label for the UI. */
  label: string;
  /** Position in the ordered pipeline, or null for standalone skills. */
  stage: number | null;
  /** Whether the pipeline can proceed without this stage. */
  optional: boolean;
  /** Human-readable time target, taken from the skill's own guidance. */
  timeTarget: string;
  /** One-line summary for cards. The full description lives in SKILL.md. */
  summary: string;
};

export const KESSEL_RUN_SKILLS: readonly KesselRunSkill[] = [
  {
    name: 'kessel-run-research',
    label: 'Research',
    stage: 0,
    optional: true,
    timeTarget: '20–30 min',
    summary: 'Map the landscape and find content gaps before anything is written.',
  },
  {
    name: 'kessel-run-anchor',
    label: 'Anchor',
    stage: 1,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Lock in topic, audience, format, goal, and framing.',
  },
  {
    name: 'kessel-run-ideation',
    label: 'Ideation',
    stage: 2,
    optional: false,
    timeTarget: '~5 min',
    summary: 'Expand the anchor into a thesis, supporting angles, and evidence.',
  },
  {
    name: 'kessel-run-hook',
    label: 'Hook',
    stage: 3,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Generate and score opening hooks, then pick and refine one.',
  },
  {
    name: 'kessel-run-architecture',
    label: 'Architecture',
    stage: 4,
    optional: false,
    timeTarget: '~5 min',
    summary: 'Build the beat-by-beat structural blueprint.',
  },
  {
    name: 'kessel-run-draft',
    label: 'Draft',
    stage: 5,
    optional: false,
    timeTarget: '~8 min',
    summary: 'Write the piece section by section against the beat map.',
  },
  {
    name: 'kessel-run-personalize',
    label: 'Personalize',
    stage: 6,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Audit for authenticity and inject the writer’s own specifics.',
  },
  {
    name: 'kessel-run-polish',
    label: 'Polish',
    stage: 7,
    optional: false,
    timeTarget: '~4 min',
    summary: 'Score across seven dimensions and fix what is weak.',
  },
  {
    name: 'kessel-run-review',
    label: 'Review',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Audit already-published content for accuracy and relevance.',
  },
  {
    name: 'kessel-run-repurpose',
    label: 'Repurpose',
    stage: null,
    optional: false,
    timeTarget: '5–10 min',
    summary: 'Adapt an existing piece into other formats.',
  },
  {
    name: 'kessel-run-analyze',
    label: 'Analyze',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Review post-publish performance and extract lessons.',
  },
] as const;

/** Skills that form the ordered pipeline, sorted by stage. */
export const PIPELINE_SKILLS = KESSEL_RUN_SKILLS
  .filter((s): s is KesselRunSkill & { stage: number } => s.stage !== null)
  .sort((a, b) => a.stage - b.stage);

/** Skills usable on their own, outside the pipeline. */
export const STANDALONE_SKILLS = KESSEL_RUN_SKILLS.filter(s => s.stage === null);

/** Filesystem paths handed to Mastra's `skills` option. */
export const SKILL_PATHS = KESSEL_RUN_SKILLS.map(s => `${SKILLS_DIR}/${s.name}`);

export function getSkill(name: string): KesselRunSkill | undefined {
  return KESSEL_RUN_SKILLS.find(s => s.name === name);
}

export function isKesselRunSkillName(name: string): name is KesselRunSkillName {
  return KESSEL_RUN_SKILLS.some(s => s.name === name);
}
