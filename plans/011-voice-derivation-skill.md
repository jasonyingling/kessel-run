# Plan 011: Add `kessel-run-voice`, which derives a voice guide from what the author actually published

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> ```
> git diff --stat 490545a..HEAD -- src/mastra/skills src/lib/kessel-run
> ```
> On a mismatch against the "Current state" excerpts, treat it as a STOP
> condition. Files created by plans 007, 009, and 010 appearing is those plans
> landing, not drift.

> **Note (2026-08-25)**: the workspace this plan reads and writes is the Obsidian
> vault, not `~/kessel-run/`. See decision 10 in `plans/README.md` and the mapping
> in `plans/014-interview-skill-into-vault.md`. Plan 010 must be revised for the
> vault first; the paths named here inherit whatever that revision settles on.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/009-package-skills-for-claude.md,
  plans/010-workspace-and-run-directory.md
- **Category**: direction
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

`kessel-run-anchor/references/publications.md` holds three publication profiles.
They are specific and opinionated — "No em dashes", "No hedging", "The hook IS
the post on LinkedIn". They are also entirely hand-written, which means they
describe how the author *believes* they write.

Draft treats them as law: "The voice profile is not a suggestion — it is a
constraint. Every sentence you write should be filterable through the profile."
A constraint that strict deserves evidence behind it.

The author has the evidence sitting unused: roughly 40 issues of Previously on
Tech in Notion, a Weller Avenue archive, and LinkedIn history. A derivation pass
over that corpus produces a voice guide where every claim cites a real sentence
the author actually published, and it will contradict the hand-written profile in
at least a couple of places. Those contradictions are the valuable part.

This plan adds the skill that runs that pass. It is deliberately a skill rather
than a one-time script: voice drifts, the archive grows, and this should be
re-runnable once or twice a year.

## Current state

### The hand-written profile this skill produces evidence for or against

`src/mastra/skills/kessel-run-anchor/references/publications.md` (restored by
plan 009) carries three profiles — Previously on Tech, LinkedIn, Weller Avenue —
each with `Type`, `Voice`, `Audience`, `Mission`, `Default framing`,
`Hook preferences`, `Format notes`. Extract from the first:

```
## Previously on Tech

**Type**: Newsletter
**Voice**: Casual, exploratory, conversational. Short paragraphs. Present tense for immediacy. Concrete numbers over vague claims. Parenthetical asides are welcome. No em dashes. No corporate jargon. No hedging ("I think," "perhaps"). Direct but not aggressive.
**Audience**: Tech-curious builders — developers, agency folks, indie makers, people interested in AI/tech but who value practical application over hype. Assume familiarity with AI tools but not deep ML theory.
```

Every one of those claims is checkable against 40 published issues. None of them
currently is.

### Where the output goes

Plan 010 established the workspace. `WORKSPACE_BLOCK` in
`src/lib/kessel-run/workspace.ts` names two files this skill writes:

```
  publications.md       per-publication voice, audience, mission, format notes
  voice.md              derived voice guide, if one has been built
```

and states the precedence rule: the workspace copy wins over the starter copy
bundled in the Anchor skill.

### The skill file format to match

`src/mastra/skills/kessel-run-research/SKILL.md` is the closest structural
sibling — a research-shaped skill that gathers, synthesizes, and emits a
structured document. Match its shape: two-key frontmatter (`name`, a
double-quoted single-line `description`), an `# Kessel Run — <Label>` heading,
the workspace block, then sections, an `## Output:` section with a fenced
template, and a closing `## Guiding principles` with a `**Name the next step.**`
item.

Standalone skills (Review, Repurpose, Analyze) use `# Kessel Run — <Label>` with
**no** stage number. This skill is standalone — it runs outside a piece's
pipeline — so it takes that form.

### Catalog registration

`src/mastra/skills/catalog.ts` requires a `KesselRunSkillName` union member and a
`KESSEL_RUN_SKILLS` entry with `stage: null` for standalone skills:

```ts
  {
    name: 'kessel-run-analyze',
    label: 'Analyze',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Review post-publish performance and extract lessons.',
  },
```

`catalog.test.ts` asserts skill counts, so those assertions move by one.

### Repo conventions to match

- `src/mastra/` — single quotes, semicolons. `catalog.test.ts` — double quotes,
  semicolons.
- The frontmatter `description` must stay under 1024 characters and contain no
  `<` or `>` — enforced by `skill-package.test.ts` from plan 009.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |
| Package skills | `npm run skills:package` | exit 0 |

## Scope

**In scope**:

- `src/mastra/skills/kessel-run-voice/SKILL.md` (create)
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts`
- `src/lib/kessel-run/workspace.ts` (one entry in `RUN_FILE_BY_SKILL`)
- `docs/kessel-run-workspace.md` (one paragraph)
- `plans/README.md` (status row only)

**Out of scope**:

- **Actually running the derivation.** This plan ships the skill; it does not
  produce `voice.md`. An executor has no access to the author's Notion or their
  published archive, and inventing a voice guide would be worse than not having
  one. Running it is a human step, recorded in "Maintenance notes".
- Rewriting `references/publications.md`. The skill writes the workspace copy at
  runtime; the bundled starter stays as-is.
- `src/mastra/projects/schema.ts` and `STAGE_ARTIFACT_FIELD` — this is a
  standalone skill with no pipeline stage and no working-memory artifact.
- Every other `SKILL.md`. Plan 010 already pointed Draft, Personalize, and Polish
  at `<workspace>/voice.md`; nothing further is needed here.
- The weather demo and `/chat`.

## Git workflow

- Branch: `advisor/011-voice-derivation-skill`
- Commit per step. Message style from `git log`: short imperative sentence.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the skill

Create `src/mastra/skills/kessel-run-voice/SKILL.md` with the content below.
Insert the rendered `WORKSPACE_BLOCK` from `src/lib/kessel-run/workspace.ts`
where the placeholder line says so — the exact text, so
`workspace-block.test.ts` passes — followed by
`You do not own a run-directory file. Read what is there; write nothing to it.`

`````markdown
---
name: kessel-run-voice
description: "Standalone Kessel Run skill: derives an evidence-backed voice guide from the author's own published work, rather than from how they think they write. Use this skill when the user wants to build or refresh their voice profile, calibrate the pipeline against what actually performs, or check whether their stated voice rules match their real ones. Also trigger when the user says things like 'build my voice guide,' 'what does my writing actually sound like,' 'derive my voice from my newsletter,' 'update my publication profiles,' 'analyze my past posts,' or 'why does the draft not sound like me.' Produces voice.md and an evidence-backed publications.md in the Kessel Run workspace, which every drafting stage then reads."
---

# Kessel Run — Voice

You are deriving the author's voice guide from what they have actually published, not from what they say about their writing.

This distinction is the whole point. A hand-written voice guide describes how someone believes they write. A derived one describes how they write when it lands. The two disagree in interesting places, and the disagreements are the most useful output of this stage.

[INSERT WORKSPACE_BLOCK HERE]

You do not own a run-directory file. Read what is there; write nothing to it.

## What you need before starting

A corpus, per publication. Ask the author where each lives and how to reach it:

- **Previously on Tech** — the newsletter archive. Roughly 40 issues, in Notion.
- **Weller Avenue** — the long-form blog archive.
- **LinkedIn / X** — recent posts, and whichever ones they consider their best.

You need at least 10 pieces per publication to derive anything worth trusting. Below that, say so and offer to derive a provisional guide clearly labelled as thin, rather than pretending 4 posts establish a pattern.

Ask which pieces performed best and how they know — opens, replies, comments, inbound, whatever signal they actually have. If they have no performance data, say so in the output and derive from the full corpus instead of a top slice. Do not silently substitute "most recent" for "best".

## The derivation

Work publication by publication. For each:

### 1. Read before you generalize

Read the actual pieces. Not summaries, not titles — the prose. Everything below has to cite a real sentence, so you need the sentences.

### 2. Hook formulas that worked

Pull the opening 1–3 sentences of every piece. Group them into recurring shapes and name each shape. For each formula, quote two real openings verbatim and note which pieces they came from. Rank by the performance signal if there is one.

Then name the openings that appear once and never again. A shape the author tried and abandoned is information.

### 3. Structures that worked

For each piece, record its skeleton — section count, what the second section does, where the story lands relative to the argument, how it closes. Name the recurring structures. Note the typical length and how much it varies.

### 4. Recurring language patterns

This is the highest-value section and the easiest to fake. Rules:

- Every pattern gets **at least two verbatim quotes** from different pieces.
- A pattern that appears in one piece is not a pattern. Drop it.
- Count, do not estimate. "Uses second person in 31 of 38 issues" is a finding. "Often uses second person" is a vibe.
- Cover sentence length and rhythm, paragraph length, person and tense, punctuation habits (including whether the author actually avoids em dashes or only believes they do), contractions, hedging, technical register, humor, and how they handle numbers.

### 5. Anti-patterns, derived

What is *absent* from the corpus matters as much as what is present. Look specifically for constructions the author never uses despite being common in the genre. Quote a near-miss where they could have used one and did something else instead.

### 6. Topic categories

Cluster the corpus by subject. Note the proportions, and which categories correlate with the performance signal.

### 7. Core DNA and the number one rule

Compress everything above into a short statement of what makes this voice recognizable, and a single rule that, if followed, gets a draft most of the way there. Both must be defensible from the evidence you just gathered.

### 8. Where the derived guide contradicts the stated one

Read the author's existing `publications.md`. For every claim in it, mark:

- **Confirmed** — the corpus backs it. Cite the evidence.
- **Contradicted** — the corpus does not back it. Quote the counterexamples and say how often.
- **Unverifiable** — nothing in the corpus speaks to it.

Present the contradictions to the author before writing anything. Do not overwrite a stated rule on your own authority. A rule can be aspirational on purpose — "no em dashes" may be a habit they are actively breaking, and the corpus lagging behind is the expected result, not an error.

## Output

Two files, both written only after the author confirms.

### `<workspace>/voice.md`

```
# Voice Guide — [Publication]

*Derived [date] from [N] pieces spanning [date range]. Performance signal: [what was used, or "none available"].*

## Executive summary
[3–5 sentences on what this voice is]

## Core DNA
[One paragraph — what makes it recognizable]

## The number one rule
[One sentence]

## Hook formulas that worked
### [Formula name] — [N] pieces
> [verbatim opening]
> — [piece, date]
> [verbatim opening]
> — [piece, date]

## Structures that worked
[Named skeletons, with counts and typical lengths]

## Recurring language patterns
### [Pattern] — [N] of [total] pieces
> [verbatim quote] — [piece]
> [verbatim quote] — [piece]

## Derived anti-patterns
[Constructions absent from the corpus, with near-misses]

## Topic categories
[Clusters with proportions]

## Best-performing pieces
[Top 10 with one line each on what worked]

## Against the stated profile
| Stated claim | Verdict | Evidence |
| --- | --- | --- |
```

### `<workspace>/publications.md`

Rewrite the profile for this publication with the derived evidence folded in, keeping the existing field structure (`Type`, `Voice`, `Audience`, `Mission`, `Default framing`, `Hook preferences`, `Format notes`) so the rest of the pipeline keeps working. Leave the other publications' sections untouched. Where a stated claim was contradicted and the author chose to keep it, mark it `(aspirational)` so downstream stages know it is a goal rather than an observation.

## Guiding principles

**Every claim cites a sentence.** If you cannot quote it, you cannot claim it. A derived guide with six evidenced patterns beats one with twenty asserted ones.

**Count, do not estimate.** Numbers are what make this document more trustworthy than the one it replaces.

**Never invent a quote.** If you could not read the corpus, say which parts you could not reach and derive only from what you did read. A guide with a stated gap is usable. A guide with a fabricated example poisons every draft that follows.

**Contradictions belong to the author.** Present them, let them decide. Your job is to show them what the archive says, not to overrule what they want their voice to become.

**Name the next step.** When the files are written: "Your voice guide is at `<workspace>/voice.md` and `publications.md` is updated. Draft, Personalize, and Polish all read these, so the next piece you run through the pipeline will be calibrated against your actual writing. Worth re-running this after another 10 or so pieces."
`````

**Verify**: `test -f src/mastra/skills/kessel-run-voice/SKILL.md` → exit 0
**Verify**: `head -2 src/mastra/skills/kessel-run-voice/SKILL.md | tail -1 | cut -c1-20` → `name: kessel-run-voi`
**Verify**: `grep -c "^# Kessel Run — Voice" src/mastra/skills/kessel-run-voice/SKILL.md` → `1`
**Verify**: `grep -c "Stage " src/mastra/skills/kessel-run-voice/SKILL.md` → `0` (standalone skills carry no stage number)

### Step 2: Register it in the catalog

In `src/mastra/skills/catalog.ts`:

- Add `| 'kessel-run-voice'` to `KesselRunSkillName`, after `'kessel-run-analyze'`.
- Append to `KESSEL_RUN_SKILLS`, after the `kessel-run-analyze` entry:

```ts
  {
    name: 'kessel-run-voice',
    label: 'Voice',
    stage: null,
    optional: false,
    timeTarget: '30–45 min',
    summary: 'Derive a voice guide from what you actually published.',
  },
```

In `src/lib/kessel-run/workspace.ts`, add to `RUN_FILE_BY_SKILL`:

```ts
  "kessel-run-voice": null,
```

**Verify**: `npm run typecheck` → exit 0, no output

### Step 3: Update the tests

In `src/mastra/skills/catalog.test.ts`, the skill counts move by one:

- `it("has 12 skills")` → `13` (or `has 11 skills` → `12` if plan 007 has not
  landed — read the current value rather than assuming)
- `it("splits into N pipeline stages and 3 standalone skills")` → the standalone
  count becomes `4`; the pipeline count is unchanged
- The stage-sequence assertion is unchanged — this skill has `stage: null`

`workspace-block.test.ts` and `skill-package.test.ts` iterate the directories on
disk and need no edit, but both will now cover the new skill — which is the point.

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run skills:package` → exit 0, and `ls dist/skills/kessel-run-voice.skill` exists

### Step 4: Document it

Add a paragraph to `docs/kessel-run-workspace.md` under the `voice.md` entry:
that `voice.md` is produced by the `kessel-run-voice` skill, that it is derived
rather than authored, that it is worth re-running after roughly ten new pieces,
and that Draft, Personalize, and Polish read it.

**Verify**: `grep -c "kessel-run-voice" docs/kessel-run-workspace.md` → at least `1`

### Step 5: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `npm run skills:package` → exit 0
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

No new test file. The three existing suites already cover a new skill by
construction, and that coverage is worth stating explicitly because it is what
makes adding a skill cheap:

- `skill-package.test.ts` (plan 009) walks every directory — it checks this
  skill's frontmatter keys, kebab-case name, description length, angle brackets,
  single `SKILL.md`, and that any `references/` path it names exists.
- `workspace-block.test.ts` (plan 010) checks the workspace block landed verbatim
  and exactly once, and that the standalone run-file line is present.
- `catalog.test.ts` checks the directory list matches the catalog and that the
  frontmatter name equals the directory name.

Changed assertions: the two count assertions in `catalog.test.ts`.

Verification: `npm test` → all pass. Confirm by deleting the
`"kessel-run-voice": null` line from `RUN_FILE_BY_SKILL` and checking that
`workspace-block.test.ts` fails with `kessel-run-voice is not listed in
RUN_FILE_BY_SKILL`, then restoring it.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `npm run skills:package` exits 0 and `dist/skills/kessel-run-voice.skill` exists
- [ ] `unzip -l dist/skills/kessel-run-voice.skill` lists exactly
      `kessel-run-voice/SKILL.md`
- [ ] `grep -c "Stage " src/mastra/skills/kessel-run-voice/SKILL.md` → `0`
- [ ] `grep -c "kessel-run-voice" src/mastra/skills/catalog.ts` → `2`
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 011 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `skill-package.test.ts` fails on the description length. The description above
  is close to the limit; shorten it by cutting trigger phrases from the middle,
  and report what you cut. Do not remove the leading "Standalone Kessel Run
  skill:" sentence — the other standalone skills all use that opening and the
  routing depends on it.
- The current skill count in `catalog.test.ts` is not what step 3 expects. Read
  the file and adjust by one from whatever is actually there; report the values.
- You are tempted to write an example `voice.md` with real-looking quotes. Do
  not. That is fabricated evidence about a person's writing, and it would be read
  as authoritative by every later draft.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **The skill is shipped, the guide is not.** Running the derivation is a human
  step: install the packaged skill, open Claude with access to the Notion
  archive, and invoke it. Expect 30–45 minutes and expect it to disagree with the
  hand-written profile somewhere. Budget time to decide which claims are
  aspirational and which were just wrong.
- **Re-run it, do not hand-edit `voice.md`.** Corrections you make by hand belong
  in `content-lessons.md` (plan 012), which is append-only and never regenerated.
  `voice.md` is derived output and the next run overwrites it.
- **The `(aspirational)` marker is load-bearing.** It is how a downstream stage
  tells "this is how you write" from "this is how you want to write". If Draft
  starts ignoring it, that is a Draft bug, not a voice-guide bug.
- **A reviewer should scrutinize**: that the skill never instructs the model to
  produce a quote it did not read, that the workspace block is verbatim, and that
  the catalog counts moved by exactly one.
- **Deferred out of this plan**: automatic corpus discovery (the skill asks where
  the archive is rather than knowing), performance-data ingestion beyond whatever
  the author reports, and per-format voice guides below the publication level.
