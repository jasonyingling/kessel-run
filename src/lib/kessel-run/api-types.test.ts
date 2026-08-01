import { describe, expect, it } from "vitest";
import { CONTENT_FORMATS } from "@/mastra/projects/schema";
import { isKesselRunSkillName } from "@/mastra/skills/catalog";

describe("request validation contracts", () => {
  it("accepts every catalog format", () => {
    for (const format of CONTENT_FORMATS) {
      expect(CONTENT_FORMATS.includes(format)).toBe(true);
    }
  });

  it("rejects a format outside the catalog", () => {
    expect(CONTENT_FORMATS.includes("podcast" as never)).toBe(false);
  });

  it("accepts a real skill name for pinning", () => {
    expect(isKesselRunSkillName("kessel-run-anchor")).toBe(true);
  });

  it("rejects an unknown skill name for pinning", () => {
    expect(isKesselRunSkillName("../../etc/passwd")).toBe(false);
    expect(isKesselRunSkillName("kessel-run-nonexistent")).toBe(false);
  });
});
