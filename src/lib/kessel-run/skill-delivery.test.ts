import { afterEach, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { collectSkills, packageSkills, walk, hash, REPO_ROOT } from "../../../scripts/package-skills.mjs";
import { installSkills } from "../../../scripts/install-skills.mjs";

const temps: string[] = [];
const temp = () => { const root = mkdtempSync(join(realpathSync(tmpdir()), "kr-delivery-")); temps.push(root); return root; };
function put(path: string, body: string) { mkdirSync(resolve(path, ".."), { recursive: true }); writeFileSync(path, body); }
function fixture() {
  const root = temp();
  put(join(root, "src/mastra/skill-references/workspace.md"), "shared contract\n");
  for (const name of ["kessel-run-a", "kessel-run-b"]) {
    const base = join(root, "src/mastra/skills", name);
    put(join(base, "SKILL.md"), `---\nname: ${name}\ndescription: Fixture\n---\n[Workspace](references/workspace.md)\n[Guide](references/guide.md)\n`);
    put(join(base, "references/workspace.md"), "shared contract\n");
    put(join(base, "references/guide.md"), "Guide\n```markdown\n[User note](missing-user-note.md)\n```\n");
  }
  cpSync(join(REPO_ROOT, "plugin/kessel-run"), join(root, "plugin/kessel-run"), { recursive: true });
  return root;
}
const source = (root: string, name = "kessel-run-a") => join(root, "src/mastra/skills", name);
const digest = (path: string) => walk(path).map(file => [file.relative, hash(readFileSync(file.path))]);
afterEach(() => { for (const path of temps.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("skill packaging", () => {
  it("packages deterministic lists and matching hashes, includes real references and excludes debris", () => {
    const root = fixture();
    put(join(source(root), ".env"), "fixture only");
    put(join(source(root), "references/sample.test.ts"), "test debris");
    put(join(source(root), "references/cache.db"), "database debris");
    put(join(source(root), "unrelated.md"), "not a skill resource");
    const first = packageSkills({ repoRoot: root });
    const before = digest(first.output);
    const second = packageSkills({ repoRoot: root });
    expect(second.manifest).toEqual(first.manifest);
    expect(digest(second.output)).toEqual(before);
    for (const file of second.manifest.files) expect(hash(readFileSync(join(second.output, file.path)))).toBe(file.sha256);
    expect(second.manifest.files.some(file => file.path.endsWith("references/guide.md"))).toBe(true);
    expect(second.manifest.files.some(file => /\.env|sample.test|cache.db|unrelated/.test(file.path))).toBe(false);
    // Read the actual canonical source too: every live resource link must resolve.
    expect(collectSkills(REPO_ROOT).size).toBe(15);
  });
  it.each(["drift", "missing-resource"])("rejects %s before replacing output", issue => {
    const root = fixture(); const first = packageSkills({ repoRoot: root }); const before = digest(first.output);
    if (issue === "drift") put(join(source(root), "references/workspace.md"), "stale");
    else rmSync(join(source(root), "references/guide.md"));
    expect(() => packageSkills({ repoRoot: root })).toThrow(/workspace|reference/i);
    expect(digest(first.output)).toEqual(before);
  });
  it("rejects source symlinks and output ancestor symlinks, including dangling links", () => {
    const root = fixture(); const outside = temp();
    const original = digest(outside);
    symlinkSync(outside, join(source(root), "assets"));
    expect(() => packageSkills({ repoRoot: root })).toThrow(/symlink/i);
    rmSync(join(source(root), "assets"));
    symlinkSync(outside, join(root, "build"));
    expect(() => packageSkills({ repoRoot: root })).toThrow(/symlink/i);
    expect(digest(outside)).toEqual(original);
    rmSync(join(root, "build"));
    mkdirSync(join(root, "build"));
    symlinkSync(join(outside, "not-created"), join(root, "build/kessel-run"));
    expect(() => packageSkills({ repoRoot: root })).toThrow(/symlink/i);
    expect(existsSync(join(outside, "not-created"))).toBe(false);
  });
  it("rejects output overlap/escape without changing source or template", () => {
    const root = fixture(); const before = digest(root);
    for (const outputRoot of [root, source(root), join(source(root), "nested"), join(root, "plugin"), join(root, "plugin/kessel-run/nested"), temp()]) {
      expect(() => packageSkills({ repoRoot: root, outputRoot })).toThrow(/overlap|escape/i);
    }
    expect(digest(root)).toEqual(before);
  });
});

describe("portable installation", () => {
  it("validates the whole requested batch before mutation", () => {
    const root = fixture(); const destination = join(root, "install/skills");
    for (const bad of ["../escape", "/absolute", "kessel-run-missing"]) {
      expect(() => installSkills({ repoRoot: root, destination, names: ["kessel-run-a", bad] })).toThrow();
      expect(existsSync(destination)).toBe(false);
    }
  });
  it("backs up complete customized installs outside discovery and leaves unchanged installs alone", () => {
    const root = fixture(); const destination = join(root, "install/skills");
    installSkills({ repoRoot: root, destination });
    const target = join(destination, "kessel-run-a");
    put(join(target, "references/custom.md"), "my custom reference");
    const before = digest(target);
    const results = installSkills({ repoRoot: root, destination });
    const backup = results.find(result => result.name === "kessel-run-a")!.backup!;
    expect(backup.startsWith(`${destination}/`)).toBe(false);
    expect(digest(backup)).toEqual(before);
    expect(readFileSync(join(backup, "references/custom.md"), "utf8")).toBe("my custom reference");
    const mtime = statSync(join(target, "SKILL.md")).mtimeMs;
    expect(installSkills({ repoRoot: root, destination }).every(result => result.status === "unchanged")).toBe(true);
    expect(statSync(join(target, "SKILL.md")).mtimeMs).toBe(mtime);
  });
  it("restores the full original after a simulated failure following backup", () => {
    const root = fixture(); const destination = join(root, "install/skills");
    installSkills({ repoRoot: root, destination });
    const target = join(destination, "kessel-run-a"); put(join(target, "custom.md"), "preserve this");
    const before = digest(target);
    expect(() => installSkills({ repoRoot: root, destination, names: ["kessel-run-a"], beforeActivate: () => { throw new Error("simulated activation failure"); } })).toThrow(/original restored/);
    expect(digest(target)).toEqual(before);
  });
  it("reports earlier successful backups when a later skill fails and is restored", () => {
    const root = fixture(); const destination = join(root, "install/skills");
    installSkills({ repoRoot: root, destination });
    for (const name of ["kessel-run-a", "kessel-run-b"]) put(join(destination, name, "custom.md"), name);
    const beforeB = digest(join(destination, "kessel-run-b"));
    try {
      installSkills({ repoRoot: root, destination, beforeActivate: name => { if (name === "kessel-run-b") throw new Error("second failed"); } });
      throw new Error("Expected failure");
    } catch (error) {
      const failure = error as Error & { results: { name: string; destination: string; backup: string }[] };
      expect(failure.message).toMatch(/original restored/);
      expect(failure.results).toHaveLength(1);
      expect(readFileSync(join(failure.results[0].backup, "custom.md"), "utf8")).toBe("kessel-run-a");
      expect(failure.results[0].destination).toBe(join(destination, "kessel-run-a"));
    }
    expect(digest(join(destination, "kessel-run-b"))).toEqual(beforeB);
  });
  it("rejects case aliases of existing protected roots on insensitive filesystems", () => {
    const root = fixture(); const alias = join(root, "src/MASTRA/SKILLS");
    if (!existsSync(alias)) return; // On case-sensitive filesystems this is a distinct path.
    put(join(source(root), "custom.md"), "source must survive");
    const before = digest(root);
    expect(() => installSkills({ repoRoot: root, destination: alias })).toThrow(/overlap/);
    expect(() => packageSkills({ repoRoot: root, outputRoot: alias })).toThrow(/overlap|escape/);
    expect(digest(root)).toEqual(before);
    for (const destination of [join(root, "install/.KESSEL-RUN-SKILL-BACKUPS"), join(root, "install/.KESSEL-RUN-SKILL-STAGING")]) expect(() => installSkills({ repoRoot: root, destination })).toThrow(/Reserved/);
  });
  it("rejects destination, backup and staging symlinks before writing", () => {
    const root = fixture(); const outside = temp(); const parent = join(root, "install"); mkdirSync(parent);
    const destination = join(parent, "skills");
    for (const name of ["skills", ".kessel-run-skill-backups", ".kessel-run-skill-staging"]) {
      const link = join(parent, name); const missing = join(outside, name);
      symlinkSync(missing, link);
      expect(() => installSkills({ repoRoot: root, destination })).toThrow(/symlink/i);
      expect(existsSync(missing)).toBe(false);
      rmSync(link);
    }
    symlinkSync(outside, destination);
    expect(() => installSkills({ repoRoot: root, destination })).toThrow(/symlink/i);
    expect(digest(outside)).toEqual([]);
  });
  it("rejects destination ancestors, installed symlinks and source overlaps", () => {
    const root = fixture(); const outside = temp();
    for (const destination of [root, source(root), join(source(root), "nested"), `${root}/x/../y`]) expect(() => installSkills({ repoRoot: root, destination })).toThrow();
    symlinkSync(outside, join(root, "install"));
    expect(() => installSkills({ repoRoot: root, destination: join(root, "install/skills") })).toThrow(/symlink/i);
    rmSync(join(root, "install"));
    const destination = join(root, "install/skills"); mkdirSync(destination, { recursive: true });
    symlinkSync(outside, join(destination, "kessel-run-b"));
    expect(() => installSkills({ repoRoot: root, destination })).toThrow(/symlink/i);
    expect(existsSync(join(destination, "kessel-run-a"))).toBe(false);
  });
  it("runs real portable and legacy CLIs from another working directory, without a CLAUDE.md requirement", () => {
    const root = temp(); const destination = join(root, "portable/skills");
    execFileSync(process.execPath, [join(REPO_ROOT, "scripts/install-skills.mjs"), "--destination", destination, "kessel-run-start"], { cwd: root });
    expect(existsSync(join(destination, "kessel-run-start/references/workspace.md"))).toBe(true);
    const vault = join(root, "vault"); mkdirSync(vault);
    execFileSync("bash", [join(REPO_ROOT, "scripts/install-skills-to-vault.sh"), "kessel-run-voice"], { cwd: root, env: { ...process.env, KESSEL_RUN_VAULT: vault } });
    expect(existsSync(join(vault, ".claude/skills/kessel-run-voice/SKILL.md"))).toBe(true);
  });
});
