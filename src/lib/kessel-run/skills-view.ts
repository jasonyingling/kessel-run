import { mastra } from '@/mastra'
import { PIPELINE_SKILLS, STANDALONE_SKILLS } from '@/mastra/skills/catalog'
import type { SkillSummary, SkillsResponse } from '@/lib/kessel-run/api-types'

/**
 * Builds the skills view the UI and the `/api/kessel-run/skills` route both
 * need: catalog entries (stage order, time targets, summaries) decorated with
 * the full frontmatter description Mastra loads from each skill's SKILL.md.
 */
export async function getSkillsView(): Promise<SkillsResponse> {
  const loaded = await mastra.getAgentById('kessel-run-agent').listSkills()
  const descriptions = new Map(loaded.map(s => [s.name, s.description]))

  const decorate = (
    skill: (typeof PIPELINE_SKILLS)[number] | (typeof STANDALONE_SKILLS)[number],
  ): SkillSummary => ({
    name: skill.name,
    label: skill.label,
    stage: skill.stage,
    optional: skill.optional,
    timeTarget: skill.timeTarget,
    summary: skill.summary,
    description: descriptions.get(skill.name) ?? '',
  })

  return {
    pipeline: PIPELINE_SKILLS.map(decorate),
    standalone: STANDALONE_SKILLS.map(decorate),
  }
}
