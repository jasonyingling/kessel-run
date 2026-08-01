import { describe, expect, it } from "vitest";
import {
  EMPTY_PROJECT_STATE,
  STAGE_ARTIFACT_FIELD,
  projectMetadataSchema,
  projectStateSchema,
  stageIsComplete,
} from "./schema";
import { PIPELINE_SKILLS } from "../skills/catalog";

describe("projectStateSchema", () => {
  it("accepts the empty state", () => {
    expect(projectStateSchema.parse(EMPTY_PROJECT_STATE)).toEqual(EMPTY_PROJECT_STATE);
  });

  it("rejects a stage outside 0..7", () => {
    expect(() =>
      projectStateSchema.parse({ ...EMPTY_PROJECT_STATE, currentStage: 9 }),
    ).toThrow();
  });

  it("requires every anchor field when an anchor is present", () => {
    expect(() =>
      projectStateSchema.parse({ ...EMPTY_PROJECT_STATE, anchor: { idea: "x" } }),
    ).toThrow();
  });
});

describe("STAGE_ARTIFACT_FIELD", () => {
  it("covers every pipeline stage in the catalog", () => {
    const stages = PIPELINE_SKILLS.map(s => s.stage).sort((a, b) => a - b);
    expect(Object.keys(STAGE_ARTIFACT_FIELD).map(Number).sort((a, b) => a - b)).toEqual(stages);
  });
});

describe("stageIsComplete", () => {
  it("is false for every stage of an empty project", () => {
    for (const skill of PIPELINE_SKILLS) {
      expect(stageIsComplete(EMPTY_PROJECT_STATE, skill.stage)).toBe(false);
    }
  });

  it("is true once the stage's artifact is set", () => {
    const withIdeation = { ...EMPTY_PROJECT_STATE, ideationMap: "# Map" };
    expect(stageIsComplete(withIdeation, 2)).toBe(true);
    expect(stageIsComplete(withIdeation, 3)).toBe(false);
  });
});

describe("projectMetadataSchema", () => {
  it("accepts well-formed project metadata", () => {
    const meta = {
      kind: "kessel-run-project" as const,
      publication: "The Newsletter",
      format: "article" as const,
      pinnedSkill: null,
    };
    expect(projectMetadataSchema.parse(meta)).toEqual(meta);
  });

  it("rejects an unknown format", () => {
    expect(() =>
      projectMetadataSchema.parse({
        kind: "kessel-run-project",
        publication: "x",
        format: "podcast",
        pinnedSkill: null,
      }),
    ).toThrow();
  });
});
