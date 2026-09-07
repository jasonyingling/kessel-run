import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KESSEL_RUN_SKILLS,
  PIPELINE_SKILLS,
  SKILLS_DIR,
  STANDALONE_SKILLS,
} from "./catalog";

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

function frontmatterName(dir: string): string {
  const body = readFileSync(`${SKILLS_DIR}/${dir}/SKILL.md`, "utf-8");
  const match = body.match(/^name:\s*(.+)$/m);
  if (!match) throw new Error(`no name in frontmatter for ${dir}`);
  return match[1].trim();
}

describe("skill catalog", () => {
  it("lists exactly the skills present on disk", () => {
    expect(skillDirs).toEqual([...KESSEL_RUN_SKILLS].map(s => s.name).sort());
  });

  it("has 13 skills", () => {
    expect(KESSEL_RUN_SKILLS).toHaveLength(13);
  });

  it("names every directory after its frontmatter name", () => {
    for (const dir of skillDirs) {
      expect(frontmatterName(dir)).toBe(dir);
    }
  });

  it("gives every skill a non-empty description in frontmatter", () => {
    for (const dir of skillDirs) {
      const body = readFileSync(`${SKILLS_DIR}/${dir}/SKILL.md`, "utf-8");
      expect(body).toMatch(/^description:\s*\S/m);
    }
  });

  it("splits into 8 pipeline stages and 5 standalone skills", () => {
    expect(PIPELINE_SKILLS).toHaveLength(8);
    expect(STANDALONE_SKILLS).toHaveLength(5);
  });

  it("numbers pipeline stages 0..7 with no gaps or duplicates", () => {
    expect(PIPELINE_SKILLS.map(s => s.stage)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
