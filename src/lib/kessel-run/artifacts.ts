import {
  STAGE_ARTIFACT_FIELD,
  stageIsComplete,
  type ProjectState,
} from "@/mastra/projects/schema"
import { PIPELINE_SKILLS } from "@/mastra/skills/catalog"

export type ArtifactView = {
  stage: number
  label: string
  field: keyof ProjectState
  complete: boolean
  /** Rendered form of the artifact, or null when the stage has not run. */
  content: string | null
}

/**
 * Turn raw project state into something renderable, in pipeline order.
 *
 * Artifacts are a mix of markdown strings and structured objects (the anchor,
 * the hook). Structured ones are formatted here so the panel only ever deals
 * with strings.
 */
export function toArtifactViews(state: ProjectState): ArtifactView[] {
  return PIPELINE_SKILLS.map((skill) => {
    const field =
      STAGE_ARTIFACT_FIELD[skill.stage as keyof typeof STAGE_ARTIFACT_FIELD]
    return {
      stage: skill.stage,
      label: skill.label,
      field,
      complete: stageIsComplete(state, skill.stage),
      content: formatArtifact(state[field]),
    }
  })
}

function formatArtifact(
  value: ProjectState[keyof ProjectState],
): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)

  // Structured artifacts (anchor, hook) render as labelled markdown lines so
  // the panel can treat everything uniformly.
  return Object.entries(value)
    .map(([key, val]) => `**${humanize(key)}**: ${val}`)
    .join("\n\n")
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
}

/** How far through the pipeline this project is, 0..1. */
export function pipelineProgress(state: ProjectState): number {
  const views = toArtifactViews(state)
  if (views.length === 0) return 0
  return views.filter((v) => v.complete).length / views.length
}
