import type { ContentFormat, ProjectState } from '@/mastra/projects/schema'

/** One skill as the UI sees it: catalog metadata plus the SKILL.md description. */
export type SkillSummary = {
  name: string
  label: string
  stage: number | null
  optional: boolean
  timeTarget: string
  summary: string
  /** Full description from the skill's frontmatter. May be long. */
  description: string
}

export type SkillsResponse = {
  pipeline: SkillSummary[]
  standalone: SkillSummary[]
}

export type ProjectSummary = {
  id: string
  title: string
  publication: string
  format: ContentFormat
  pinnedSkill: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectDetail = ProjectSummary & {
  state: ProjectState
}

export type CreateProjectBody = {
  title: string
  publication: string
  format: ContentFormat
}

export type ApiError = { error: string }
