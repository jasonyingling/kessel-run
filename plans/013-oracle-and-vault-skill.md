# Plan 013: Add `kessel-run-oracle`, which finds the ideas so the pipeline stops starting from a blank page

> **Reconciled 2026-09-06 at `0c2e18e`: NEEDS REVISION (workspace, capability gating, and delivery dependencies; defer).**
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
> On a mismatch against the "Current state" excerpts, treat it as a STOP
> condition. Files created by plans 007 and 009–012 appearing is those plans
> landing, not drift.

> **Note (2026-08-25)**: the workspace this plan reads and writes is the Obsidian
> vault, not `~/kessel-run/`. See decision 10 in `plans/README.md` and the mapping
> in `plans/014-interview-skill-into-vault.md`. Plan 010 must be revised for the
> vault first; the paths named here inherit whatever that revision settles on.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED — step 2 changes `WORKSPACE_BLOCK`, which must be re-propagated
  to every skill
- **Depends on**: plans/009-package-skills-for-claude.md,
  plans/010-workspace-and-run-directory.md
- **Category**: direction
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

Kessel Run's earliest stage is Research, and Research requires arriving with a
topic already in hand. Every run begins with the author remembering something
worth writing about. That is the blank-page problem, unsolved, sitting at the
front of an otherwise complete pipeline — and it is the reason a pipeline gets
built and then used four times.

The fix is a scan the author does not have to initiate: read the last week of
what they actually touched, plus a curated external reading list, score what is
there for *raw material density*, and hand back a shortlist. The scoring rubric
is the interesting part. It ranks on whether a story is attached, whether a
strong point of view is present, and whether specific examples exist — which is
not a measure of how interesting a topic is, but of how much the Interview stage
will be able to extract from it. A topic with no story, no position, and no
example produces a thin interview and therefore a thin piece, however good the
topic sounds.

Every spike goes to a vault whether or not it gets used. That is the part that is
easy to skip and should not be: after a few months it is hundreds of scored,
dated fragments drawn from real work, searchable on the days the scan comes up
dry. It is the difference between a pipeline that resets daily and one that
accumulates.

## Current state

### The pipeline has no entry point before Research

`src/mastra/skills/catalog.ts` — Research is stage 0:

```ts
  {
    name: 'kessel-run-research',
    label: 'Research',
    stage: 0,
    optional: true,
    timeTarget: '20–30 min',
    summary: 'Map the landscape and find content gaps before anything is written.',
  },
```

`src/mastra/skills/kessel-run-research/SKILL.md:23`:

```
If the user has a publication in mind, note it — the audience and mission will help you evaluate which findings are most relevant. But research doesn't require a publication selection. That happens in Stage 1.
```

Research takes a topic as given. Nothing produces one.

### The workspace layout needs two additions

`WORKSPACE_BLOCK` in `src/lib/kessel-run/workspace.ts` (plan 010) currently
lists:

```
<workspace>/
  profile.md            who the author is, what they promote, which publications
  publications.md       per-publication voice, audience, mission, format notes
  voice.md              derived voice guide, if one has been built
  content-lessons.md    corrections the author has already given
  runs/<YYYY-MM-DD-slug>/
    research.md  anchor.md  transcript.md  ideation.md  hook.md
    beats.md  draft.md  personalize.md  polish.md  final.md
```

The Oracle needs `sources.md` (the curated reading list) and `vault/` (the spike
archive). Plan 010 built the mechanism for changing this safely: edit the
constant, re-propagate to every `SKILL.md`, and `workspace-block.test.ts` names
any copy you missed.

### Which connectors are actually available

This skill runs in Claude, not in this app, so it uses whatever connectors the
session has. In the author's environment that is Gmail, Google Calendar, Google
Drive, Notion, and Todoist, plus web search. There is no Slack, Linear, or git
connector, so the skill must ask what is available rather than assume the list
from any external spec.

The Previously on Tech link bank already lives in Notion and already has a weekly
cadence. It is a functioning idea vault that is simply not wired to Kessel Run.

### Repo conventions to match

- Standalone skills use `# Kessel Run — <Label>` with no stage number, and the
  frontmatter description opens `"Standalone Kessel Run skill: …"`.
- `src/mastra/` — single quotes, semicolons. `src/lib/kessel-run/` — double
  quotes, no semicolons.
- `description` under 1024 characters, no `<` or `>` — enforced by
  `skill-package.test.ts`.

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

- `src/mastra/skills/kessel-run-oracle/SKILL.md` (create)
- `src/lib/kessel-run/workspace.ts` (`WORKSPACE_BLOCK` layout + one
  `RUN_FILE_BY_SKILL` entry)
- `src/lib/kessel-run/workspace.test.ts` (two assertions)
- Every `SKILL.md` under `src/mastra/skills/` — re-propagate the changed block
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts`
- `docs/kessel-run-workspace.md`
- `plans/README.md` (status row only)

**Out of scope**:

- **Scheduling.** The source system runs the Oracle daily on a timer. Setting up
  a recurring run is a user action in their Claude environment, not something a
  plan should configure. The skill is written to be invoked, and to be
  schedulable later without change.
- **Connector configuration.** The skill asks what is reachable and works with
  what it gets. Do not hardcode a connector list and do not add MCP config.
- Any change to `kessel-run-research` beyond nothing — the Oracle hands a spike
  to Anchor or Research, and neither needs to know the Oracle exists.
- Automated vault search from other skills. The vault is written here and read by
  a human for now.
- The Mastra app. It has no connectors and no filesystem; the Oracle is a
  Claude-only skill. It still gets registered in the catalog so packaging picks
  it up, but nothing in the app will invoke it usefully.
- The weather demo and `/chat`.

## Git workflow

- Branch: `advisor/013-oracle-and-vault-skill`
- Commit per step. Message style from `git log`: short imperative sentence.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the workspace layout

In `src/lib/kessel-run/workspace.ts`, inside the fenced layout in
`WORKSPACE_BLOCK`, add two lines so the block reads:

```
<workspace>/
  profile.md            who the author is, what they promote, which publications
  publications.md       per-publication voice, audience, mission, format notes
  voice.md              derived voice guide, if one has been built
  content-lessons.md    corrections the author has already given
  sources.md            curated external reading list the Oracle scans
  vault/<YYYY-MM-DD>.md every spike the Oracle has ever surfaced
  runs/<YYYY-MM-DD-slug>/
    research.md  anchor.md  transcript.md  ideation.md  hook.md
    beats.md  draft.md  personalize.md  polish.md  final.md
```

Change nothing else in the block. In particular, do not add `sources.md` or
`vault/` to the "Before you start, read whichever of these exist" sentence — no
pipeline stage needs them, and widening that list makes every stage do pointless
reads.

Add two assertions to `src/lib/kessel-run/workspace.test.ts`:

```ts
  it("names the Oracle's sources list and vault", () => {
    expect(WORKSPACE_BLOCK).toContain("sources.md")
    expect(WORKSPACE_BLOCK).toContain("vault/")
  })
```

**Verify**: `npm test` → `workspace.test.ts` passes; `workspace-block.test.ts`
**fails** for every skill. That failure is expected and is what step 2 fixes.

### Step 2: Re-propagate the block to every skill

Replace the workspace block in every `SKILL.md` under `src/mastra/skills/` with
the updated text. Only the two added lines change; the skill-specific run-file
line that follows each block stays as it is.

**Verify**: `npm test` → exit 0, all pass, including
`workspace-block.test.ts`'s `appears verbatim` and `appears exactly once` cases
**Verify**: `grep -lc "sources.md" src/mastra/skills/*/SKILL.md | wc -l` equals
the number of skill directories

### Step 3: Write the skill

Create `src/mastra/skills/kessel-run-oracle/SKILL.md`. Insert the **updated**
rendered `WORKSPACE_BLOCK` where marked, followed by
`You do not own a run-directory file. Read what is there; write nothing to it.`

`````markdown
---
name: kessel-run-oracle
description: "Standalone Kessel Run skill: scans the author's own week of work and a curated reading list, scores what it finds for how much raw material it would yield, and hands back a shortlist of content ideas. Every idea is archived to a vault whether or not it gets used. Use this skill when the author wants something to write about, is starting a content session with no topic, or wants to know what happened this week that is worth a post. Also trigger when the user says things like 'what should I write about,' 'find me content ideas,' 'run the oracle,' 'what did I do this week,' 'anything worth posting,' or 'check my sources.' This is the entry point to the Kessel Run pipeline, upstream of Research and Anchor."
---

# Kessel Run — Oracle

You are finding the author things to write about, from what they already did and what they already read.

The premise: the bottleneck in content is not writing, it is getting from a blank page to a concrete idea. Most pieces never get made because nobody could name one, not because nobody could type. So this stage does the naming, and it does it from real material rather than from brainstorming.

[INSERT UPDATED WORKSPACE_BLOCK HERE]

You do not own a run-directory file. Read what is there; write nothing to it.

## Before you scan

Ask two things, once, and remember the answers in `profile.md` if it exists:

1. **What can you reach?** List the connectors actually available in this session — mail, calendar, documents, notes, task tracker, code hosting, chat. Do not assume; check. Report what you have and what you are therefore not covering.
2. **How far back?** Default to seven days. The author may want longer after a break.

Read `<workspace>/sources.md` for the external reading list. If it does not exist, offer to create it and ask for a starting set of accounts, newsletters, and sites, with a note on what lens each one provides. An Oracle with no external sources still works — it just runs internal-only, and you should say so.

## The two passes

### Internal — what the author actually did

Scan the lookback window across every available system. You are looking for moments, not topics: a decision made and the reasoning behind it, something that broke and what it took to fix, a client problem solved a particular way, an argument had, a tool adopted or abandoned, a number that surprised someone.

Skip anything that is only an artifact of process — routine scheduling, status updates, notifications. A calendar full of meetings is not fifteen spikes.

### External — what the author could respond to

Scan the sources in `sources.md`. This pass produces a different kind of spike: not "write about this" but "respond to this." Someone the author follows published a take; there is a reply, a quote-post, or a counter-piece available.

This is a distinct content mode with a much lower production cost, and it keeps the author in conversation rather than broadcasting. Do not let the external pass turn into a news summary — a spike is only a spike if the author has something of their own to say back.

### Archive — what is worth re-cutting

Also scan the author's own published archive for repurpose candidates: pieces that have aged well, that a recent event has made newly relevant, or that were published in one format and never adapted. Flag these separately; they route to `kessel-run-repurpose`, not to Anchor.

## Scoring

Score every spike on three signals, each 0–2, and total them:

| Signal | 0 | 1 | 2 |
| --- | --- | --- | --- |
| **Story attached** | No specific incident | A situation, no narrative | A real moment with a beginning and an end |
| **Point of view present** | No position | A mild preference | A position the author would defend |
| **Specific examples exist** | Abstract only | One example | Named projects, numbers, dates |

Understand what this rubric is for. It does not measure how interesting a topic is. It measures **how much the Interview stage will be able to pull out of it.** A fascinating topic with a 1/6 will produce a thin interview and therefore a thin piece; a mundane one with a 6/6 will not. Rank by the total, and say so when a high-scoring spike is on a boring-sounding topic — that is the rubric doing its job, not a mistake.

Do not adjust scores toward what you think the author wants to write about. Present the ranking you actually derived.

## The vault

**Write every spike to `<workspace>/vault/<YYYY-MM-DD>.md`, used or not, before presenting anything.**

This costs nothing and is the easiest step to skip. Do not skip it. After a few months the vault holds hundreds of scored, dated fragments drawn from real work, and it is what you search on the days the scan comes up dry. A pipeline whose ideas evaporate at the end of each session is a pipeline that resets; one with a vault accumulates.

Append to the day's file if it already exists. Never overwrite a previous day.

Vault entry format:

```
## [Spike title]

**Score**: [N]/6 (story [n], position [n], specifics [n])
**Source**: [internal | external | archive] — [where it came from]
**Date seen**: [YYYY-MM-DD]

[Two or three sentences: what the raw material actually is, in enough detail that
this is still usable in three months without the source at hand.]

**The angle**: [What the piece would argue]
**Why it scored what it did**: [One line]
```

## Output

Present roughly 15 spikes, aiming for a rough half-and-half split between
internal and external, plus archive candidates listed separately. If one pass
came up empty, say so rather than padding from the other.

```
## Oracle — [date], [N]-day lookback

**Scanned**: [systems] · **Sources**: [N] from sources.md · **Not covered**: [what you could not reach]
**Spikes found**: [N] internal, [N] external, [N] archive · all written to vault/[date].md

### Internal — from your week
1. **[Title]** — [N]/6
   [One sentence on the raw material] · **Angle**: [one line]

### External — worth responding to
1. **[Title]** — [N]/6
   [What they said] · **Your angle**: [one line]

### From your archive — worth re-cutting
1. **[Piece, original date]** — [why it is live again]

---

Pick one and I will hand it to Anchor. If it is ground you do not already own,
Research first. Archive picks go to Repurpose.
```

## Guiding principles

**Real material only.** Every spike traces to something that actually happened or something someone actually published. Never generate a topic because it would be a good topic — that is brainstorming, and the author can already do that badly on their own.

**The rubric is about extractability.** Story, position, specifics. Rank on the total honestly, even when it puts a dull-sounding item on top.

**Vault first, present second.** The archive is the compounding asset. The shortlist is disposable.

**Say what you could not see.** An Oracle that silently skipped mail because the connector was missing produces a confidently incomplete answer, which is worse than a short one.

**Fifteen, not fifty.** A long list is a second blank-page problem.

**Name the next step.** "Pick a spike and I will hand it to Anchor — or to Research first if it is not ground you already own. Everything here is in `vault/[date].md` either way, so nothing is lost by not picking it today."
`````

**Verify**: `test -f src/mastra/skills/kessel-run-oracle/SKILL.md` → exit 0
**Verify**: `grep -c "^# Kessel Run — Oracle" src/mastra/skills/kessel-run-oracle/SKILL.md` → `1`
**Verify**: `grep -c "Stage " src/mastra/skills/kessel-run-oracle/SKILL.md` → `0`

### Step 4: Register it

In `src/mastra/skills/catalog.ts`:

- Add `| 'kessel-run-oracle'` to `KesselRunSkillName`.
- Append to `KESSEL_RUN_SKILLS`:

```ts
  {
    name: 'kessel-run-oracle',
    label: 'Oracle',
    stage: null,
    optional: false,
    timeTarget: '5–10 min',
    summary: 'Scan your week and your sources for things worth writing about.',
  },
```

In `src/lib/kessel-run/workspace.ts`, add `"kessel-run-oracle": null,` to
`RUN_FILE_BY_SKILL`.

Move the two count assertions in `src/mastra/skills/catalog.test.ts` by one — read
the current values rather than assuming; the standalone count grows, the pipeline
count does not.

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run skills:package` → exit 0, `dist/skills/kessel-run-oracle.skill` exists

### Step 5: Document it

Update `docs/kessel-run-workspace.md`: add `sources.md` and `vault/` to the
documented layout, say that `kessel-run-oracle` writes the vault append-only and
that `sources.md` is hand-maintained, and note that the Oracle is Claude-only —
this app has no connectors, so the skill is packaged but not useful inside it.

**Verify**: `grep -c "sources.md" docs/kessel-run-workspace.md` → at least `1`
**Verify**: `grep -c "vault" docs/kessel-run-workspace.md` → at least `1`

### Step 6: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `npm run skills:package` → exit 0
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

- `src/lib/kessel-run/workspace.test.ts` — one added case asserting the block
  names `sources.md` and `vault/`. This is what makes the layout change
  deliberate rather than incidental.
- `workspace-block.test.ts` (plan 010) is the real test of step 2: after the
  constant changes it fails for every skill until each copy is updated, then
  passes. Do not weaken it to get past step 1 — that failure is the mechanism
  working.
- `skill-package.test.ts` (plan 009) and `catalog.test.ts` cover the new skill by
  construction: frontmatter validity, name/directory agreement, description
  limits, single `SKILL.md`.
- Changed assertions: the two count assertions in `catalog.test.ts`.

Confirm the propagation guard is real: after step 2, revert the block in exactly
one skill, run `npm test`, confirm `appears verbatim` fails naming that skill,
then re-apply.

Verification: `npm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `npm run skills:package` exits 0 and `dist/skills/kessel-run-oracle.skill` exists
- [ ] `grep -l "sources.md" src/mastra/skills/*/SKILL.md | wc -l` equals the
      number of skill directories
- [ ] `grep -c "Stage " src/mastra/skills/kessel-run-oracle/SKILL.md` → `0`
- [ ] `grep -c "vault/" src/lib/kessel-run/workspace.ts` → at least `1`
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 013 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `workspace-block.test.ts` still fails after step 2 and you cannot locate the
  difference. Report the failing skill and a `diff` of its block against
  `WORKSPACE_BLOCK`; do not hand-tweak individual files until it goes green.
- You are tempted to add `sources.md` or `vault/` to the "Before you start, read
  whichever of these exist" sentence. That would make every pipeline stage read
  the Oracle's files for no reason. Leave it.
- `skill-package.test.ts` fails on description length — the description above is
  long. Cut trigger phrases from the middle, keep the opening "Standalone Kessel
  Run skill:" sentence, and report what you cut.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **The vault is the point; the shortlist is disposable.** If the skill ever gets
  optimized and someone drops the write-everything-to-vault step because most
  spikes go unused, the system quietly reverts to resetting daily. Guard that
  step in review.
- **`sources.md` is hand-maintained and will rot.** Worth a look every few
  months — a reading list of accounts that have gone quiet produces a weak
  external pass, and the symptom is an Oracle that keeps returning internal-only
  results without saying why.
- **Scheduling is the obvious follow-up.** The skill is written to be invoked and
  is schedulable without change. Once a daily run exists, the vault fills whether
  or not the author shows up, which is when it starts being worth searching.
- **Connector coverage will drift.** The skill asks rather than assumes, so
  adding Slack or a git host later needs no skill change — but the "Not covered"
  line in its output is the only signal that a connector went missing. Read it.
- **A reviewer should scrutinize**: that the vault write happens before the
  presentation, that scoring is not described as measuring topic quality, and
  that the workspace block is byte-identical across every skill after step 2.
- **Deferred out of this plan**: automatic vault search from Anchor when the
  author arrives without a topic, deduplicating spikes against previous days, and
  any performance feedback from `kessel-run-analyze` into the scoring rubric.
