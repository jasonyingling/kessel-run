import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import { PIPELINE_SKILLS, STANDALONE_SKILLS } from '@/mastra/skills/catalog'
import type { SkillSummary, SkillsResponse } from '@/lib/kessel-run/api-types'

export async function GET() {
  const loaded = await mastra.getAgentById('kessel-run-agent').listSkills()
  const descriptions = new Map(loaded.map(s => [s.name, s.description]))

  const decorate = (skill: (typeof PIPELINE_SKILLS)[number] | (typeof STANDALONE_SKILLS)[number]): SkillSummary => ({
    name: skill.name,
    label: skill.label,
    stage: skill.stage,
    optional: skill.optional,
    timeTarget: skill.timeTarget,
    summary: skill.summary,
    description: descriptions.get(skill.name) ?? '',
  })

  const body: SkillsResponse = {
    pipeline: PIPELINE_SKILLS.map(decorate),
    standalone: STANDALONE_SKILLS.map(decorate),
  }

  return NextResponse.json(body)
}
