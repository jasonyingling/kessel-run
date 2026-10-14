import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, symlinkSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const script = join(root, "scripts/sync-skill-references.mjs");
const canonical = join(root, "src/mastra/skill-references/workspace.md");
const temps: string[] = [];
function temp() { const path = mkdtempSync(join(tmpdir(), "kr-refs-")); temps.push(path); return path; }
function fixture() {
  const path = temp();
  mkdirSync(join(path, "src/mastra/skill-references"), { recursive: true });
  mkdirSync(join(path, "src/mastra/skills/kessel-run-example/references"), { recursive: true });
  writeFileSync(join(path, "src/mastra/skill-references/workspace.md"), "shared contract\n");
  writeFileSync(join(path, "src/mastra/skill-references/app-runtime.md"), "shared runtime\n");
  writeFileSync(join(path, "src/mastra/skills/kessel-run-example/SKILL.md"), "fixture skill\n");
  return path;
}
const target = (path: string) => join(path, "src/mastra/skills/kessel-run-example/references/workspace.md");
const run = (path: string, check = false) => spawnSync(process.execPath, [script, "--fixture-root", path, ...(check ? ["--check"] : [])], { cwd: tmpdir(), encoding: "utf8" });
afterEach(() => { for (const path of temps.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("portable workspace references", () => {
  it("bundles the canonical contract with a routed reference in every skill", () => {
    const skills = join(root, "src/mastra/skills");
    for (const dir of readdirSync(skills, { withFileTypes: true }).filter(d => d.isDirectory())) {
      expect(readFileSync(join(skills, dir.name, "references/workspace.md"), "utf8")).toBe(readFileSync(canonical, "utf8"));
      expect(readFileSync(join(skills, dir.name, "SKILL.md"), "utf8")).toMatch(/\]\(references\/workspace\.md\)/);
      expect(readFileSync(join(skills, dir.name, "references/app-runtime.md"), "utf8")).toBe(readFileSync(join(root, "src/mastra/skill-references/app-runtime.md"), "utf8"));
      expect(readFileSync(join(skills, dir.name, "SKILL.md"), "utf8")).toMatch(/\]\(references\/app-runtime\.md\)/);
    }
    execFileSync(process.execPath, [script, "--check"], { cwd: tmpdir() });
  });
  it("detects missing and stale copies without modifying them; sync is idempotent and preserves other references", () => {
    const path = fixture();
    expect(run(path, true).status).toBe(1);
    const other = join(path, "src/mastra/skills/kessel-run-example/references/other.md");
    writeFileSync(other, "keep me");
    expect(run(path).status).toBe(0);
    const before = statSync(target(path)).mtimeMs;
    expect(run(path).status).toBe(0);
    expect(statSync(target(path)).mtimeMs).toBe(before);
    expect(readFileSync(other, "utf8")).toBe("keep me");
    expect(run(path, true).status).toBe(0);
    writeFileSync(target(path), "drift");
    expect(run(path, true).status).toBe(1);
    expect(readFileSync(target(path), "utf8")).toBe("drift");
  });
  it("rejects dangling targets before writing any skill copy", () => {
    const path = fixture();
    const outside = join(temp(), "not-created.md");
    const late = join(path, "src/mastra/skills/kessel-run-z/references");
    mkdirSync(late, { recursive: true });
    writeFileSync(join(late, "../SKILL.md"), "fixture skill");
    symlinkSync(outside, join(late, "workspace.md"));
    expect(run(path).status).not.toBe(0);
    expect(existsSync(outside)).toBe(false);
    expect(existsSync(target(path))).toBe(false);
  });
  it("refuses fixture paths that escape through a symlink", () => {
    const path = fixture();
    const outside = temp();
    writeFileSync(join(outside, "workspace.md"), "outside");
    const refs = join(path, "src/mastra/skills/kessel-run-example/references");
    rmSync(refs, { recursive: true });
    symlinkSync(outside, refs);
    expect(run(path).status).not.toBe(0);
    expect(readFileSync(join(outside, "workspace.md"), "utf8")).toBe("outside");
  });
});
