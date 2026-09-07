# Plan 009: Ship the Kessel Run skills to Claude as installable `.skill` files

> **Reconciled 2026-09-06 at `0c2e18e`: NEEDS REVISION (retarget Claude packaging to ChatGPT distribution).**
> See [the current reconciliation](2026-09-06-reconciliation.md) for the specific
> changes needed. The historical steps below are not ready for executor dispatch;
> the original Planned-at stamp is retained so unresolved drift stays visible.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> ```
> git diff --stat 490545a..HEAD -- src/mastra/skills package.json .gitignore
> ```
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. `src/mastra/skills/kessel-run-interview/`
> appearing is plan 007 landing, not drift.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — step 1 prevents data loss; skipping it destroys a file
- **Depends on**: none. Composes with 007 (if 007 has landed, the Interview
  skill gets packaged too, automatically).
- **Category**: dx
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

The Kessel Run skills are used two ways: loaded by the Mastra agent in this app,
and invoked directly in Claude as installed skills. Those two copies are
currently kept in sync by hand, and the hand has already slipped once — see step
1, where a reference file exists in Claude but not in the repo.

There is no build. Every change to a skill reaches Claude only if someone
remembers to re-package and re-install it, and nothing checks that a skill folder
is even *valid* for upload before that happens. Claude's upload path rejects
skills for specific, boring reasons — a description over 1024 characters, an
angle bracket in the description, a name that does not match its directory, more
than one `SKILL.md` in the tree — and today the first time you learn about any of
those is when the upload fails.

This plan makes the repo the source of truth for both surfaces: a test that
enforces upload-readiness on every skill folder, and one command that produces an
installable `.skill` file for each.

## Current state

### The repo and Claude hold identical skills — except for one file

All 11 `SKILL.md` files in `src/mastra/skills/` are **byte-identical** to their
installed counterparts in Claude's managed plugin directory. Verified at
`490545a` with `diff -q` across all 11.

The one divergence: the installed `kessel-run-anchor` carries
`references/publications.md`. The repo copy does not — the repo's skill
directories contain exactly one file each:

```
$ for d in src/mastra/skills/kessel-run-*/; do echo "$(basename $d): $(find $d -type f | wc -l)"; done
kessel-run-analyze: 1
kessel-run-anchor: 1
...
```

```
$ find src/mastra/skills -type d -name references | wc -l
0
```

`kessel-run-anchor/SKILL.md:22` refers to that missing file:

```
2. **The publication** — Where is this going? Each publication has a different
voice, audience, and mission. If the user has a publication profile loaded
(check `references/publications.md` if it exists), use those defaults.
```

**This is why step 1 must run before step 4.** Packaging the repo's anchor
folder as-is and installing it would overwrite the installed skill and delete
`publications.md` — the only copy of three hand-written publication profiles.
Restoring the file into the repo first makes packaging safe.

### Claude's installed plugin directory is read-only and managed

```
~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/<uuid>/<uuid>/
├── .claude-plugin/plugin.json   {"name": "anthropic-skills", ...}
├── manifest.json
└── skills/<skill-name>/SKILL.md
```

It is not a git repo, the path embeds session UUIDs that change, and it is
regenerated from the account's synced skills. **Never author or edit there.**
Authoring happens in this repo; delivery happens through `.skill` files.

### The delivery mechanism

`skill-creator/scripts/package_skill.py` produces a `.skill` file, which is a
ZIP whose entries are named relative to the skill folder's **parent** — i.e. the
archive contains `kessel-run-anchor/SKILL.md`, not `SKILL.md`. Sending that file
to the user surfaces a **Save skill** button that installs it into their profile.

This plan does not depend on that script (its path contains volatile UUIDs). It
reproduces the same archive layout with `zip`, which is at `/usr/bin/zip` on this
machine.

### The upload rules the validation must enforce

Taken from `skill-creator/scripts/quick_validate.py`:

- `SKILL.md` must exist at `<folder>/SKILL.md`, and there must be **exactly one**
  `SKILL.md` in the packaged tree (`__pycache__` and `node_modules` excluded at
  any depth, `evals/` excluded at the root).
- Frontmatter must be a YAML mapping delimited by `---` lines.
- Allowed frontmatter keys, and no others: `name`, `description`, `license`,
  `allowed-tools`, `metadata`, `compatibility`.
- `name` is required, kebab-case (`^[a-z0-9-]+$`), no leading/trailing hyphen, no
  `--`, max 64 characters.
- `description` is required, max 1024 characters, and **must not contain `<` or
  `>`**.
- `compatibility`, if present, max 500 characters.

The repo additionally requires the directory name to equal the frontmatter
`name` — already tested in `src/mastra/skills/catalog.test.ts`.

### `src/mastra/skills/catalog.test.ts:14-20` — the frontmatter-reading pattern to follow

```ts
function frontmatterName(dir: string): string {
  const body = readFileSync(`${SKILLS_DIR}/${dir}/SKILL.md`, "utf-8");
  const match = body.match(/^name:\s*(.+)$/m);
  if (!match) throw new Error(`no name in frontmatter for ${dir}`);
  return match[1].trim();
}
```

Note it reads with `node:fs` synchronously at module scope and uses `SKILLS_DIR`
(`'./src/mastra/skills'`, relative to `process.cwd()`). Match that. Do **not**
add a YAML dependency — the frontmatter in these files is two flat keys and a
regex is sufficient, which is the existing precedent.

### `.gitignore` — relevant lines

```
# local archives (kessel-run-skills/ is committed as source of truth)
*.zip
```

`.skill` files are not covered. Step 5 adds `/dist/`.

### `package.json` scripts — current

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

### Repo conventions to match

- Tests: Vitest, colocated, `*.test.ts` only (`vitest.config.ts` sets
  `include: ["src/**/*.test.ts"]`, `environment: "node"`). A script under
  `scripts/` is therefore **not** reachable by the test runner — which is why the
  validation lives in a test over the skill folders, and the packaging script
  stays dumb.
- `src/mastra/` uses single quotes and semicolons; `catalog.test.ts` uses double
  quotes and semicolons. Match the file you are in.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |
| Package skills | `npm run skills:package` | exit 0, one `.skill` per skill |

**Run `npm install` first** — a `node_modules` predating `87fa9fd` has no
`vitest`. `npm run build` logs a DuckDB lock error; known, pre-existing,
non-fatal, out of scope.

## Scope

**In scope** (the only files you may modify or create):

- `src/mastra/skills/kessel-run-anchor/references/publications.md` (create)
- `src/mastra/skills/skill-package.test.ts` (create)
- `scripts/package-skills.sh` (create)
- `package.json` (add one script entry)
- `.gitignore` (add one line)
- `docs/kessel-run-skills.md` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- Any existing `SKILL.md`. This plan adds a reference file and a build; it
  changes no skill instructions. Wiring the profile into the stages that need it
  is plan 010.
- `src/mastra/skills/catalog.ts` and `catalog.test.ts` — the new validation goes
  in its own test file rather than growing the catalog test.
- Anything under `~/Library/Application Support/Claude/`. Read-only, managed,
  and its path is not stable. Do not write there, and do not add it as a build
  target.
- `src/components/`, `src/app/`, `src/lib/` — no UI or route change.
- The weather demo (`src/mastra/agents/weather-agent.ts`, `src/mastra/tools/weather-tool.ts`,
  `src/mastra/workflows/weather-workflow.ts`, `src/app/chat/`, `src/app/api/chat/`).

## Git workflow

- Branch: `advisor/009-package-skills-for-claude`
- Commit per step or per logical unit. Message style from `git log`: short
  imperative sentence, no prefix.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Restore the lost publication profiles

Create `src/mastra/skills/kessel-run-anchor/references/publications.md` with
exactly this content. It is the file that exists in the installed Claude skill
and is missing from the repo. Copy verbatim.

`````markdown
# Publication Profiles

Load this file when the user starts a new content piece. Use the matching publication profile to set defaults for voice, audience, framing, and mission. If the user hasn't specified a publication, ask which one they're writing for.

---

## Previously on Tech

**Type**: Newsletter
**Voice**: Casual, exploratory, conversational. Short paragraphs. Present tense for immediacy. Concrete numbers over vague claims. Parenthetical asides are welcome. No em dashes. No corporate jargon. No hedging ("I think," "perhaps"). Direct but not aggressive.
**Audience**: Tech-curious builders — developers, agency folks, indie makers, people interested in AI/tech but who value practical application over hype. Assume familiarity with AI tools but not deep ML theory.
**Mission**: Share real outcomes and focus on building. Show the process, not just the result.
**Default framing**: Builder / Analysis
**Hook preferences**: Story openers, specific stats, bold claims. Avoid rhetorical questions and listicle previews.
**Format notes**: Newsletter length. Can have multiple shorter segments. Links to sources encouraged. Casual sign-off.

---

## LinkedIn

**Type**: Professional social post
**Voice**: Builder/leader voice. Slightly more polished than newsletter but still personal. Whitespace-friendly (short paragraphs, line breaks for scannability). Confident without being preachy. First-person experience preferred over abstract advice.
**Audience**: Dev leaders, agency peers, tech professionals. People who manage teams or make technical decisions. They scroll fast — earn every line.
**Mission**: Establish expertise through transparency about process and real results.
**Default framing**: Builder / Story
**Hook preferences**: Bold claims, micro-stories, specific stats. The hook IS the post on LinkedIn — if the first 2 lines don't stop the scroll, nothing else matters. Avoid generic motivational openers.
**Format notes**: ~150–300 words. End with an engagement prompt or question. No hashtag stuffing (3 max if any).

---

## Weller Avenue Blog

**Type**: Long-form article
**Voice**: Indie builder voice. More detailed and reflective than newsletter. Can go deeper on technical topics. Honest about failures and uncertainty. Shows the work — includes specifics like code snippets, screenshots, decision rationale.
**Audience**: Entrepreneurial builders, side-project makers, people considering or actively building toward self-employment. They want specificity they can actually follow.
**Mission**: Document the journey with enough specificity that others can follow the path.
**Default framing**: Builder / Guide
**Hook preferences**: Story openers, before/after scenarios, specific project outcomes. Can be longer hooks since the audience is committed to long-form reading.
**Format notes**: 1000–3000 words. Section headers encouraged. Code blocks and screenshots where relevant. Concrete next steps at the end.

---

## Adding a new publication

When the user wants to create content for a publication not listed here, gather these details through conversation:

1. What's the publication name and type?
2. Describe the voice — how do you write there? What do you avoid?
3. Who reads it? What do they know, care about, and want?
4. What's the content mission — what are you trying to accomplish overall?
5. What framing feels most natural for this publication?
6. Any hook styles that work particularly well or should be avoided?
7. Format constraints — typical length, structural norms, CTA style?

Capture their answers and use them as the profile for the current session. Suggest they save it for future use.
`````

**Verify**: `wc -l < src/mastra/skills/kessel-run-anchor/references/publications.md` → `55`
**Verify**: `grep -c "^## " src/mastra/skills/kessel-run-anchor/references/publications.md` → `4`

### Step 2: Add the upload-readiness test

Create `src/mastra/skills/skill-package.test.ts`. It walks every skill directory
and asserts the rules Claude's upload path enforces, so a violation fails
`npm test` rather than an upload months later.

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILLS_DIR } from "./catalog";

const ALLOWED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "compatibility",
]);

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

/** Every file under `dir`, as paths relative to `dir`. */
function walk(dir: string, prefix = ""): string[] {
  return readdirSync(join(SKILLS_DIR, dir, prefix), { withFileTypes: true })
    .flatMap(entry => {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? walk(dir, rel) : [rel];
    });
}

/**
 * The frontmatter block as raw `key: value` lines.
 *
 * A regex rather than a YAML parser, matching the precedent in catalog.test.ts:
 * these files carry two flat scalar keys, and adding a YAML dependency to test
 * them would be more machinery than the problem deserves.
 */
function frontmatter(dir: string): Record<string, string> {
  const body = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`no frontmatter block in ${dir}/SKILL.md`);
  const out: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}

describe("every skill is packageable for upload to Claude", () => {
  it("finds at least the 11 pipeline and standalone skills", () => {
    expect(skillDirs.length).toBeGreaterThanOrEqual(11);
  });

  it("has exactly one SKILL.md per skill, at the folder root", () => {
    for (const dir of skillDirs) {
      const skillMds = walk(dir).filter(p => p.endsWith("SKILL.md"));
      expect(skillMds, `${dir} must contain exactly one SKILL.md`).toEqual([
        "SKILL.md",
      ]);
    }
  });

  it("uses only frontmatter keys the upload path accepts", () => {
    for (const dir of skillDirs) {
      for (const key of Object.keys(frontmatter(dir))) {
        expect(ALLOWED_FRONTMATTER_KEYS.has(key), `${dir}: ${key}`).toBe(true);
      }
    }
  });

  it("names every skill in kebab-case, matching its directory", () => {
    for (const dir of skillDirs) {
      const name = frontmatter(dir).name;
      expect(name).toBe(dir);
      expect(name).toMatch(/^[a-z0-9-]+$/);
      expect(name.startsWith("-") || name.endsWith("-") || name.includes("--")).toBe(false);
      expect(name.length).toBeLessThanOrEqual(64);
    }
  });

  it("keeps every description under 1024 characters", () => {
    for (const dir of skillDirs) {
      const description = frontmatter(dir).description;
      expect(description, `${dir} has no description`).toBeTruthy();
      expect(description.length, `${dir} description length`).toBeLessThanOrEqual(1024);
    }
  });

  it("keeps angle brackets out of descriptions", () => {
    // The upload path rejects them outright.
    for (const dir of skillDirs) {
      expect(frontmatter(dir).description, dir).not.toMatch(/[<>]/);
    }
  });

  it("references only files that exist", () => {
    for (const dir of skillDirs) {
      const body = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");
      for (const match of body.matchAll(/`(references\/[A-Za-z0-9._/-]+)`/g)) {
        const target = join(SKILLS_DIR, dir, match[1]);
        expect(
          statSync(target, { throwIfNoEntry: false })?.isFile() ?? false,
          `${dir}/SKILL.md points at ${match[1]}, which does not exist`,
        ).toBe(true);
      }
    }
  });
});
```

The last case is the one that would have caught the lost `publications.md`. It
fails if step 1 was skipped.

**Verify**: `npm test` → exit 0, all pass, 7 new tests in `skill-package.test.ts`
**Verify** the dangling-reference test has teeth: temporarily rename
`src/mastra/skills/kessel-run-anchor/references/publications.md` to
`publications.md.bak`, run `npm test`, confirm exactly the
`references only files that exist` case fails, then rename it back and confirm
`npm test` passes again.

### Step 3: Add the packaging script

Create `scripts/package-skills.sh`:

```bash
#!/usr/bin/env bash
# Package every Kessel Run skill as an installable .skill file.
#
# A .skill is a zip whose entries are named relative to the skill folder's
# PARENT — the archive must contain `<skill-name>/SKILL.md`, not `SKILL.md`.
# Running zip from inside the skills directory with the folder name as the
# argument produces exactly that layout.
#
# Validation lives in src/mastra/skills/skill-package.test.ts, not here: it runs
# on every `npm test` rather than only when someone remembers to package.
set -euo pipefail

SKILLS_DIR="src/mastra/skills"
OUT_DIR="dist/skills"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "error: run this from the repo root ($SKILLS_DIR not found)" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
OUT_ABS="$(cd "$OUT_DIR" && pwd)"

count=0
for dir in "$SKILLS_DIR"/*/; do
  name="$(basename "$dir")"
  [ -f "$dir/SKILL.md" ] || { echo "error: $name has no SKILL.md" >&2; exit 1; }
  ( cd "$SKILLS_DIR" && zip -qr "$OUT_ABS/$name.skill" "$name" \
      -x '*/__pycache__/*' '*/node_modules/*' "$name/evals/*" '*/.DS_Store' )
  echo "packaged $name"
  count=$((count + 1))
done

echo
echo "$count skill(s) written to $OUT_DIR/"
```

Make it executable: `chmod +x scripts/package-skills.sh`

Add the npm script to `package.json`, after `"test:watch"`:

```json
    "skills:package": "bash scripts/package-skills.sh"
```

**Verify**: `npm run skills:package` → exit 0, ends with `11 skill(s) written to dist/skills/`
(or `12` if plan 007 has already landed)
**Verify** the archive layout is correct:
`unzip -l dist/skills/kessel-run-anchor.skill` → entries are
`kessel-run-anchor/SKILL.md` and `kessel-run-anchor/references/publications.md`,
with no bare `SKILL.md` entry and no absolute paths.

### Step 4: Ignore the build output

Add to `.gitignore`, under the existing `# local archives` comment block:

```
/dist
```

**Verify**: `git status --porcelain | grep -c "^?? dist"` → `0`

### Step 5: Document the two surfaces and the install path

Create `docs/kessel-run-skills.md`:

```markdown
# Kessel Run skills — source of truth and delivery

The skills in `src/mastra/skills/` serve two surfaces:

1. **This app.** Mastra loads them from disk via `SKILL_PATHS` in
   `src/mastra/skills/catalog.ts`.
2. **Claude directly.** The same folders are packaged as `.skill` files and
   installed into a Claude account.

`src/mastra/skills/` is the source of truth for both. Never edit the installed
copies — they live in an Anthropic-managed directory
(`~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/…`)
that is read-only, is regenerated from the account's synced skills, and has a
path containing session UUIDs that change.

## Shipping a change to Claude

```bash
npm test                  # skill-package.test.ts gates upload-readiness
npm run skills:package    # writes dist/skills/<name>.skill
```

Then send the `.skill` file to Claude in a conversation. The file card shows a
**Save skill** button, which installs it into your profile and replaces any
installed skill of the same name.

**Replacing, not merging.** Installing a `.skill` replaces the whole folder.
Anything in the installed copy that is not in this repo is lost. That is exactly
how `kessel-run-anchor/references/publications.md` nearly went missing; the
`references only files that exist` test in `skill-package.test.ts` is the guard
against a repeat.

## What the upload path rejects

Enforced by `src/mastra/skills/skill-package.test.ts`:

- more than one `SKILL.md` in the packaged tree
- a frontmatter key outside `name`, `description`, `license`, `allowed-tools`,
  `metadata`, `compatibility`
- a `name` that is not kebab-case, is over 64 characters, or does not match the
  directory name
- a `description` over 1024 characters, or containing `<` or `>`

## The personal workspace

Skills carry the *shared* machinery. Personal parameters — voice profiles,
accumulated corrections, and per-piece run directories — live outside the skills
in a workspace directory, so they survive reinstalls and are not overwritten when
a `.skill` is installed. Plan 010 establishes that convention; until it lands,
`references/publications.md` inside the Anchor skill is the only profile store.
```

**Verify**: `test -f docs/kessel-run-skills.md` → exit 0

### Step 6: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `npm run skills:package` → exit 0
**Verify**: `ls dist/skills/*.skill | wc -l` → `11` (or `12` with plan 007 landed)
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

All new tests go in `src/mastra/skills/skill-package.test.ts`, modelled on
`src/mastra/skills/catalog.test.ts` (same `node:fs` module-scope read, same
`describe`/`it` shape, same double-quoted style).

Seven cases, and what each protects:

- **at least 11 skills** — a smoke check that the directory walk resolved.
- **exactly one SKILL.md per folder** — the upload path's hardest rejection.
- **allowed frontmatter keys only** — catches a stray `version:` or `stage:` key
  someone adds by analogy with `catalog.ts`.
- **kebab-case name matching the directory** — catches a rename applied to the
  folder but not the frontmatter, or vice versa.
- **description ≤ 1024 characters** — these descriptions are long trigger-phrase
  paragraphs and are genuinely close to the limit; this is the one most likely
  to fire in practice.
- **no angle brackets in descriptions** — an outright upload rejection that is
  easy to introduce by writing `<topic>` in a trigger example.
- **references resolve** — the regression that motivated this plan.

Verification: `npm test` → all pass. Additionally run the teeth check in step 2
(rename `publications.md`, confirm exactly one test fails, restore).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0; `src/mastra/skills/skill-package.test.ts` exists with 7 passing cases
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `npm run skills:package` exits 0 and `ls dist/skills/*.skill | wc -l` is 11 (12 if 007 landed)
- [ ] `unzip -l dist/skills/kessel-run-anchor.skill` lists `kessel-run-anchor/SKILL.md`
      and `kessel-run-anchor/references/publications.md`, and no bare `SKILL.md`
- [ ] `wc -l < src/mastra/skills/kessel-run-anchor/references/publications.md` → `55`
- [ ] `git check-ignore dist/skills` exits 0
- [ ] No existing `SKILL.md` was modified: `git diff --name-only | grep -c "SKILL.md"` → `0`
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 009 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/mastra/skills/kessel-run-anchor/references/publications.md` already exists
  and differs from the content in step 1. Someone restored it another way;
  report the diff rather than overwriting it.
- The `references only files that exist` test fails on a skill other than
  `kessel-run-anchor`. That means a second reference file was lost too — report
  which, and do not invent its contents.
- `zip` is not available on the machine. Report it; do not add a Node zip
  dependency without being asked.
- Any existing `SKILL.md` fails the new validation. That is a real defect in a
  shipped skill, not something to fix by loosening the test — report the skill
  and the rule it breaks.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **Installing a `.skill` replaces the folder.** Anything in the installed copy
  that is not in this repo is gone. Treat the repo as authoritative and never
  hand-edit an installed skill — that is how `publications.md` diverged.
- **Personal parameters must not live in the skill folders.** A voice profile
  that gets refined over time, or a corrections log that grows every run, would
  be silently reverted by the next install. Plan 010 moves them to a workspace
  directory for exactly this reason; `references/publications.md` stays in the
  skill only as a starter default.
- **A reviewer should scrutinize**: that `publications.md` matches the installed
  copy exactly, that the `.skill` archive has the folder at its root, and that
  no existing `SKILL.md` was touched.
- **Deferred out of this plan**: automatic install (there is no CLI path — the
  Save-skill button is a human step), versioning the `.skill` files, and any
  sync check that compares the repo against what is actually installed.
