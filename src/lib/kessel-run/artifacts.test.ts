import { describe, expect, it } from "vitest"
import { pipelineProgress, toArtifactViews } from "./artifacts"
import { EMPTY_PROJECT_STATE, type ProjectState } from "@/mastra/projects/schema"

describe("toArtifactViews", () => {
  it("returns 8 entries, all incomplete, for the empty state", () => {
    const views = toArtifactViews(EMPTY_PROJECT_STATE)
    expect(views).toHaveLength(8)
    expect(views.every((v) => v.complete === false)).toBe(true)
    expect(views.every((v) => v.content === null)).toBe(true)
  })

  it("returns views in stage order 0..7", () => {
    const views = toArtifactViews(EMPTY_PROJECT_STATE)
    expect(views.map((v) => v.stage)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it("round-trips a markdown artifact as its own string", () => {
    const state: ProjectState = { ...EMPTY_PROJECT_STATE, ideationMap: "# Map" }
    const views = toArtifactViews(state)
    const ideation = views.find((v) => v.field === "ideationMap")
    expect(ideation?.content).toBe("# Map")
    expect(ideation?.complete).toBe(true)
  })

  it("formats a structured artifact with humanized camelCase keys", () => {
    const state: ProjectState = {
      ...EMPTY_PROJECT_STATE,
      anchor: {
        idea: "A great idea",
        publication: "The Newsletter",
        format: "article",
        audience: "Builders",
        goal: "Inform",
        framing: "guide",
        missionAlignment: "Strong",
        keySourceMaterial: "Interview notes",
        scopeNotes: "Keep it tight",
      },
    }
    const views = toArtifactViews(state)
    const anchor = views.find((v) => v.field === "anchor")
    expect(anchor?.complete).toBe(true)
    expect(anchor?.content).toContain("**Idea**:")
    expect(anchor?.content).toContain("**Key Source Material**:")
  })
})

describe("pipelineProgress", () => {
  it("is 0 for the empty state", () => {
    expect(pipelineProgress(EMPTY_PROJECT_STATE)).toBe(0)
  })

  it("is 0.25 when two of eight stages are complete", () => {
    const state: ProjectState = {
      ...EMPTY_PROJECT_STATE,
      researchBrief: "# Brief",
      ideationMap: "# Map",
    }
    expect(pipelineProgress(state)).toBe(0.25)
  })
})
