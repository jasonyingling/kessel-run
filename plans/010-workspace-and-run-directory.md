# Plan 010: Give Kessel Run a personal workspace and run directory, and stop using the human as the state bus

> **Reconciled 2026-09-06 at `0c2e18e`: NEEDS REVISION (define portable state plus ChatGPT, app, and optional vault adapters).**
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
> git diff --stat 490545a..HEAD -- src/mastra/skills src/lib/kessel-run docs
> ```
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Files that plans 007 and 009 create
> appearing is those plans landing, not drift.

> **⚠ SUPERSEDED IN PART — revise before executing (2026-08-25).** This plan
> specifies a `~/kessel-run/` workspace. The workspace is now the Obsidian vault
> at `/Users/miniying/The Rock` (decision 10 in `plans/README.md`), whose own
> conventions contradict this layout: filenames use spaces and title case rather
> than hyphenated slugs, every created note needs
> `title`/`type`/`created`/`updated`/`tags` frontmatter, and artifacts belong
> inside the PARA structure — run files beside the piece in
> `10 - Projects/<Publication>/<Piece>/`, personal parameters in
> `Meta/Kessel Run/`. The vault's `CLAUDE.md` also forbids modifying a Previously
> on Tech `Issue.md`, deleting any note, and overwriting substantial content.
> `plans/014-interview-skill-into-vault.md` already reflects the correct mapping —
> use it as the reference. Re-plan this file's `WORKSPACE_BLOCK` against the vault
> before dispatching an executor.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — edits every skill file; the guard is an exact-match test
- **Depends on**: plans/009-package-skills-for-claude.md (the packaging path and
  the `references only files that exist` test both matter here)
- **Category**: tech-debt
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

Every Kessel Run skill opens by listing what it needs from earlier stages and
saying to ask the user for it if missing. Ideation wants the anchor. Hook wants
the anchor and the ideation map. Architecture wants the hook and the ideation
map. Draft wants all of it plus a voice profile. Nothing writes those artifacts
anywhere, so the person is the state bus: they carry each output into the next
skill by hand, in a chat window, from memory.

That is why a pipeline gets built and then used four times.

It also breaks the voice profile outright. `kessel-run-anchor/SKILL.md:22` is the
**only** skill that names `references/publications.md`. Draft's entire "Voice
profile application" section — "the voice profile is not a suggestion, it is a
constraint", patterns, anti-patterns, signature moves, reference samples — has no
stated way to find the profile. Inside one long conversation it half-works,
because Anchor's output is still in context. Invoked as a separate skill, which
is how these are actually used, Draft is writing in a voice it has never seen.

This plan gives the skills a place to read from and write to: a workspace holding
the author's personal parameters, and a run directory per piece. Shared machinery
in the skills, personal parameters outside them — which is also what keeps a
`.skill` reinstall from reverting a voice profile you have been refining for
months.

## Current state

### Each skill states its inputs and asks the human for them

`src/mastra/skills/kessel-run-ideation/SKILL.md:14-16`:

```
## What you're working with

The user should have a completed anchor. If they don't, ask them to define one first (or point them to Stage 1). A complete anchor includes:
```

`src/mastra/skills/kessel-run-draft/SKILL.md:12-20`:

```
## What you're working with

You need all of these in context to draft well:

- **Beat map** (from Architecture): Section order, purpose tags, energy levels, key content assignments, transition plans, estimated lengths
- **Ideation map** (from Ideation): Thesis, key points with evidence, counterarguments with response strategies, story beats, evidence inventory
- **Hook + bridge** (from Hook): The confirmed opening and the promise it makes
- **Publication profile**: Voice patterns, anti-patterns, signature moves, tone spectrum, audience definition

If any of these are missing, ask the user to provide them before starting.
```

### Only Anchor knows where the publication profile lives

```
$ grep -rln "publications.md\|references/" src/mastra/skills/*/SKILL.md
src/mastra/skills/kessel-run-anchor/SKILL.md
```

`src/mastra/skills/kessel-run-anchor/SKILL.md:22`:

```
2. **The publication** — Where is this going? Each publication has a different voice, audience, and mission. If the user has a publication profile loaded (check `references/publications.md` if it exists), use those defaults. If not, ask:
```

### There are two runtimes, and only one has a filesystem

- **Claude directly** (desktop, web, Claude Code, Cowork): the skills are
  installed and run with whatever tools that surface provides. Claude Code and
  Cowork have filesystem access; the desktop and web apps may not.
- **This app**: `src/mastra/agents/kessel-run-agent.ts` loads the same skills and
  has **no filesystem tools at all**. It carries state in Mastra working memory
  (`projectStateSchema`), which already does the job the run directory does.

So the workspace instructions must degrade gracefully. The standard block in step
2 ends with an explicit fallback for exactly this reason, and step 6 verifies the
app still behaves.

### `src/lib/kessel-run/artifacts.ts` — the app's equivalent mapping, for reference

```ts
export function toArtifactViews(state: ProjectState): ArtifactView[] {
  return PIPELINE_SKILLS.map((skill) => {
    const field =
      STAGE_ARTIFACT_FIELD[skill.stage as keyof typeof STAGE_ARTIFACT_FIELD]
```

The run-directory filenames in this plan intentionally parallel
`STAGE_ARTIFACT_FIELD` so the two surfaces stay conceptually aligned.

### Repo conventions to match

- `src/lib/kessel-run/` uses **double quotes, no semicolons**. `src/mastra/`
  uses single quotes with semicolons. Match the file you are in.
- Tests: Vitest, colocated, `*.test.ts`, `environment: "node"`. Reading skill
  markdown from tests with `node:fs` at module scope is established — see
  `src/mastra/skills/catalog.test.ts`.
- Skills are plain markdown with no include mechanism. Shared text has to be
  duplicated into each file, which is why step 3 adds a test that pins the copies
  together.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |
| Package skills | `npm run skills:package` | exit 0 (added by plan 009) |

**Run `npm install` first.** `npm run build` logs a DuckDB lock error; known,
pre-existing, non-fatal, out of scope.

## Scope

**In scope**:

- `src/lib/kessel-run/workspace.ts` (create — the canonical block and file map)
- `src/lib/kessel-run/workspace.test.ts` (create)
- `src/mastra/skills/workspace-block.test.ts` (create)
- All `SKILL.md` files under `src/mastra/skills/` (add one standard section each)
- `src/mastra/skills/kessel-run-anchor/references/publications.md` (add a
  precedence note at the top; do not change the three profiles)
- `docs/kessel-run-workspace.md` (create)
- `docs/kessel-run-skills.md` (update the "personal workspace" paragraph plan 009 left)
- `plans/README.md` (status row only)

**Out of scope**:

- Creating the actual `~/kessel-run/` directory on anyone's machine. The skills
  offer to create it at runtime; a plan that writes to the user's home directory
  is not something an executor should do.
- `src/mastra/agents/kessel-run-agent.ts` and `projectStateSchema`. The app keeps
  using working memory; this plan must not change how it stores state.
- `src/components/`, `src/app/`, `src/mastra/projects/`, `src/mastra/skills/catalog.ts`.
- The lessons loop, the voice derivation, and the Oracle. Those are plans 011,
  012, and 013 and they build on the workspace this one defines. Create
  `content-lessons.md` and `voice.md`? No — this plan only *names* them in the
  layout. Nothing writes them yet.
- The weather demo and `/chat`.

## Git workflow

- Branch: `advisor/010-workspace-and-run-directory`
- Commit per step or per logical unit. Message style from `git log`: short
  imperative sentence, no prefix.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Define the canonical workspace block in one place

Create `src/lib/kessel-run/workspace.ts`. This module is the single source of
truth for the text that gets duplicated into every skill, and for the run-file
map. Nothing in the app imports it at runtime — it exists so a test can pin the
twelve copies together.

```ts
/**
 * The workspace convention shared by every Kessel Run skill.
 *
 * Skills are plain markdown with no include mechanism, so this text has to be
 * duplicated into all of them. `workspace-block.test.ts` asserts every SKILL.md
 * contains WORKSPACE_BLOCK verbatim, which is what stops the copies drifting.
 *
 * Edit here, then propagate. Never edit a copy in a SKILL.md directly.
 */
export const WORKSPACE_BLOCK = `## Workspace and run directory

Kessel Run keeps the author's personal parameters and in-progress pieces outside
the skills, so they survive a skill reinstall.

Resolve the workspace in this order: the \`KESSEL_RUN_HOME\` environment variable
if it is set, otherwise \`~/kessel-run/\`. If it does not exist, say so and offer
to create it with the layout below. Never create it silently.

\`\`\`
<workspace>/
  profile.md            who the author is, what they promote, which publications
  publications.md       per-publication voice, audience, mission, format notes
  voice.md              derived voice guide, if one has been built
  content-lessons.md    corrections the author has already given
  runs/<YYYY-MM-DD-slug>/
    research.md  anchor.md  transcript.md  ideation.md  hook.md
    beats.md  draft.md  personalize.md  polish.md  final.md
\`\`\`

Before you start, read whichever of these exist: \`publications.md\`,
\`voice.md\`, \`content-lessons.md\`, and every file already in the current run
directory. Those are your inputs. Do not ask the author to paste back something
an earlier stage already wrote, and do not ask them to re-describe the piece.

When the author confirms your stage's output, write it to the run directory under
the filename named below, and tell them the path you wrote.

If this session has no filesystem access, say so once, then carry the artifacts in
the conversation instead and continue normally. Do not stop, and do not pretend to
have read files you could not read.`

/** Which run-directory file each skill owns. Standalone skills own none. */
export const RUN_FILE_BY_SKILL: Record<string, string | null> = {
  "kessel-run-research": "research.md",
  "kessel-run-anchor": "anchor.md",
  "kessel-run-interview": "transcript.md",
  "kessel-run-ideation": "ideation.md",
  "kessel-run-hook": "hook.md",
  "kessel-run-architecture": "beats.md",
  "kessel-run-draft": "draft.md",
  "kessel-run-personalize": "personalize.md",
  "kessel-run-polish": "polish.md",
  "kessel-run-review": null,
  "kessel-run-repurpose": null,
  "kessel-run-analyze": null,
}
```

**Note on `kessel-run-interview`**: it only exists if plan 007 has landed. The
map may name a skill that is not on disk yet — the tests in step 3 iterate over
the directories that exist, not over this map, so that is fine.

Create `src/lib/kessel-run/workspace.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { RUN_FILE_BY_SKILL, WORKSPACE_BLOCK } from "./workspace"

describe("WORKSPACE_BLOCK", () => {
  it("starts with the section heading skills insert it under", () => {
    expect(WORKSPACE_BLOCK.startsWith("## Workspace and run directory")).toBe(true)
  })

  it("names both workspace resolution paths", () => {
    expect(WORKSPACE_BLOCK).toContain("KESSEL_RUN_HOME")
    expect(WORKSPACE_BLOCK).toContain("~/kessel-run/")
  })

  it("carries the no-filesystem fallback", () => {
    expect(WORKSPACE_BLOCK).toContain("no filesystem access")
  })
})

describe("RUN_FILE_BY_SKILL", () => {
  it("gives every pipeline skill a distinct run file", () => {
    const files = Object.values(RUN_FILE_BY_SKILL).filter(
      (f): f is string => f !== null,
    )
    expect(new Set(files).size).toBe(files.length)
  })

  it("gives the three standalone skills no run file", () => {
    expect(RUN_FILE_BY_SKILL["kessel-run-review"]).toBeNull()
    expect(RUN_FILE_BY_SKILL["kessel-run-repurpose"]).toBeNull()
    expect(RUN_FILE_BY_SKILL["kessel-run-analyze"]).toBeNull()
  })
})
```

**Verify**: `npm test` → exit 0, 5 new tests in `workspace.test.ts` pass

### Step 2: Insert the block into every skill

For each `SKILL.md` under `src/mastra/skills/`, insert the rendered
`WORKSPACE_BLOCK` text (the string value, with the escaped backticks and `${`
sequences resolved to literal characters) as a new `##` section, placed
**immediately before** the skill's existing `## What you're working with` section
— or, for skills with no such section, immediately before their first `##`
heading after the intro paragraphs.

Immediately after the block, add one skill-specific line:

- For a skill with a run file, e.g. Draft:
  `Your run-directory file is \`draft.md\`.`
- For a standalone skill (review, repurpose, analyze):
  `You do not own a run-directory file. Read what is there; write nothing to it.`

Use the exact filename from `RUN_FILE_BY_SKILL`.

Then, in `kessel-run-anchor/SKILL.md:22`, replace:

```
If the user has a publication profile loaded (check `references/publications.md` if it exists), use those defaults. If not, ask:
```

with:

```
Publication profiles come from the workspace first and the skill second: read `<workspace>/publications.md` if it exists, otherwise fall back to the starter copy bundled at `references/publications.md`. Use those defaults. If neither exists, ask:
```

And in `kessel-run-draft/SKILL.md`, in the `## What you're working with` list,
replace the bullet:

```
- **Publication profile**: Voice patterns, anti-patterns, signature moves, tone spectrum, audience definition
```

with:

```
- **Publication profile** and **voice guide**: read `<workspace>/publications.md` and `<workspace>/voice.md`. These are the constraint this stage is measured against — if neither exists, say so plainly before drafting rather than writing in a default voice and hoping.
```

Make the same substitution in `kessel-run-personalize/SKILL.md` and
`kessel-run-polish/SKILL.md` wherever they refer to the publication profile or
voice profile without saying where it comes from.

**Verify**: `grep -l "## Workspace and run directory" src/mastra/skills/*/SKILL.md | wc -l`
→ `11` (or `12` if plan 007 landed)
**Verify**: `grep -rc "publications.md" src/mastra/skills/*/SKILL.md | grep -v ":0" | wc -l` → at least `2`

### Step 3: Pin the copies together with a test

Create `src/mastra/skills/workspace-block.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKILLS_DIR } from "./catalog";
import { RUN_FILE_BY_SKILL, WORKSPACE_BLOCK } from "@/lib/kessel-run/workspace";

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

function body(dir: string): string {
  return readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");
}

describe("the workspace block is identical in every skill", () => {
  it("appears verbatim in every SKILL.md", () => {
    for (const dir of skillDirs) {
      expect(
        body(dir).includes(WORKSPACE_BLOCK),
        `${dir}/SKILL.md is missing the workspace block, or its copy has drifted from WORKSPACE_BLOCK in src/lib/kessel-run/workspace.ts`,
      ).toBe(true);
    }
  });

  it("appears exactly once per skill", () => {
    for (const dir of skillDirs) {
      const occurrences = body(dir).split(WORKSPACE_BLOCK).length - 1;
      expect(occurrences, dir).toBe(1);
    }
  });

  it("is followed by that skill's own run-file line", () => {
    for (const dir of skillDirs) {
      const runFile = RUN_FILE_BY_SKILL[dir];
      expect(runFile, `${dir} is not listed in RUN_FILE_BY_SKILL`).not.toBeUndefined();
      const expected =
        runFile === null
          ? "You do not own a run-directory file."
          : `Your run-directory file is \`${runFile}\`.`;
      expect(body(dir), dir).toContain(expected);
    }
  });
});
```

This is the guard that makes step 2 safe to repeat: change `WORKSPACE_BLOCK`,
re-propagate, and the test tells you exactly which copy you missed.

**Verify**: `npm test` → exit 0, 3 new tests pass
**Verify** the test has teeth: delete one line from the block inside
`kessel-run-hook/SKILL.md`, run `npm test`, confirm the `appears verbatim` case
fails naming `kessel-run-hook`, then restore the line and confirm it passes.

### Step 4: Note the precedence in the bundled starter profile

At the top of `src/mastra/skills/kessel-run-anchor/references/publications.md`,
above the existing `# Publication Profiles` heading, insert:

```
> **This is a starter copy.** The live profiles live at
> `<workspace>/publications.md` (see the workspace section in any Kessel Run
> SKILL.md). If that file exists, it wins — this copy is what a fresh install
> falls back to, and installing an updated `.skill` overwrites it. Edit the
> workspace copy, not this one.
```

Do not change the three profiles themselves.

**Verify**: `head -1 src/mastra/skills/kessel-run-anchor/references/publications.md`
→ `> **This is a starter copy.** The live profiles live at`
**Verify**: `grep -c "^## " src/mastra/skills/kessel-run-anchor/references/publications.md` → `4`

### Step 5: Document the workspace

Create `docs/kessel-run-workspace.md` describing: the resolution order
(`KESSEL_RUN_HOME`, then `~/kessel-run/`), the directory layout, what each file
is for, the run-file map from `RUN_FILE_BY_SKILL`, the precedence rule (workspace
beats bundled starter), and the two-runtime note — that this app has no
filesystem and keeps using Mastra working memory, so the workspace applies only
when the skills run in Claude.

Then update the "The personal workspace" section at the end of
`docs/kessel-run-skills.md` (created by plan 009), replacing its "Plan 010
establishes that convention; until it lands…" sentence with a pointer to
`docs/kessel-run-workspace.md`.

**Verify**: `test -f docs/kessel-run-workspace.md` → exit 0
**Verify**: `grep -c "until it lands" docs/kessel-run-skills.md` → `0`

### Step 6: Confirm the app still works

The skills now tell the reader to go read files. The Mastra agent has no
filesystem tools, so it must take the fallback branch rather than stalling or
inventing file contents.

With `npm run dev` running, open a project at `/kessel-run/projects/<id>`, pin
**Anchor**, and send: `I want to write about onboarding emails.`

Expected: the agent proceeds with the Anchor conversation. It may mention once
that it cannot reach a workspace. It must **not** refuse to continue, and must
not claim to have read `publications.md`.

**If you are an executor without a browser, SKIP this step and say so in your
report. Do not fabricate it.** A reviewer performs it.

**Verify**: the Anchor conversation proceeds and writes the `anchor` artifact, as
in plan 006's walkthrough.

### Step 7: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `npm run skills:package` → exit 0
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

- `src/lib/kessel-run/workspace.test.ts` — 5 cases over the canonical constants:
  heading, both resolution paths, the no-filesystem fallback, distinct run files,
  standalone skills have none. These protect the *content* of the convention.
- `src/mastra/skills/workspace-block.test.ts` — 3 cases over the propagated
  copies: present verbatim, present exactly once, followed by the right run-file
  line. These protect against *drift*, which is the actual failure mode when
  shared text lives in twelve files.
- Model both on `src/mastra/skills/catalog.test.ts` for structure and on
  `src/lib/kessel-run/artifacts.test.ts` for style in the `lib` file.
- Plan 009's `references only files that exist` test already covers the
  `references/publications.md` pointer and needs no change.
- Run the teeth check in step 3 — a test that cannot fail is not a guard.

Verification: `npm test` → all pass, 8 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0; `workspace.test.ts` (5 cases) and
      `workspace-block.test.ts` (3 cases) exist and pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `npm run skills:package` exits 0
- [ ] `grep -l "## Workspace and run directory" src/mastra/skills/*/SKILL.md | wc -l`
      equals the number of skill directories
- [ ] `grep -c "check \`references/publications.md\` if it exists" src/mastra/skills/kessel-run-anchor/SKILL.md` → `0`
- [ ] `test -f docs/kessel-run-workspace.md` exits 0
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] Step 6 either performed and reported, or explicitly reported as skipped
- [ ] `plans/README.md` status row for 010 updated

## STOP conditions

Stop and report back (do not improvise) if:

- A skill has no `## What you're working with` section and no obvious insertion
  point that keeps the block above the skill's substantive instructions. Report
  which skill rather than guessing a placement — placement affects whether the
  model reads it before acting.
- The `appears verbatim` test fails after propagation and the difference is
  whitespace you cannot locate. Report the failing skill and a `diff` rather than
  hand-tweaking twelve files.
- Step 6 shows the agent refusing to proceed, stalling on a missing file, or
  claiming to have read a workspace file. That means the fallback wording is not
  strong enough and needs rewording in `WORKSPACE_BLOCK` — report it; do not
  patch a single skill.
- You find yourself wanting to change `projectStateSchema` or the agent
  instructions to accommodate the workspace. The app deliberately keeps working
  memory; that is a separate decision.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **Change `WORKSPACE_BLOCK`, then re-propagate to every skill.** The test will
  name the ones you missed. Never edit a copy inside a `SKILL.md` directly — the
  next propagation will silently revert it.
- **The run-file map is duplicated in spirit, not in code.** `RUN_FILE_BY_SKILL`
  and `STAGE_ARTIFACT_FIELD` in `src/mastra/projects/schema.ts` describe the same
  pipeline for two different runtimes. If you add a stage, update both. There is
  deliberately no shared type between them, because the app's stage numbering and
  the run directory's filenames are allowed to diverge.
- **Two runtimes, one set of skills.** Anything you add to a skill that assumes a
  filesystem must carry a fallback, or the app's agent will behave badly. That
  constraint is permanent unless the app grows filesystem tools.
- **A reviewer should scrutinize**: that the block landed above each skill's
  substantive instructions rather than at the bottom, that Anchor's
  `publications.md` pointer now names the workspace first, and that the app
  walkthrough in step 6 actually happened.
- **Deferred out of this plan**: creating the workspace on disk, a bootstrap
  skill or `npm run` task that scaffolds it, and any migration of existing
  Mastra projects into run directories.
