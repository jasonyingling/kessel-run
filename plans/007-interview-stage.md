# Plan 007: Add an Interview stage that captures the author's own words, and constrain Draft to them

> **Reconciled 2026-09-06 at `0c2e18e`: NEEDS REVISION (014 landed; reconcile source rules, skill adaptation, and guide scope).**
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
> git diff --stat 490545a..HEAD -- src/mastra/skills src/mastra/projects src/mastra/agents src/lib/kessel-run
> ```
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. `src/mastra/skills/kessel-run-interview/`
> showing as new is this plan's own work, not drift.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none (plans 001–006 are all merged). Composes with
  plans/014-interview-skill-into-vault.md if that landed first — see the note in
  step 5.
- **Category**: direction
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

The pipeline currently has no stage that extracts the author's own raw material.
Ideation asks some interview-shaped questions in passing, and Personalize (Stage
6) exists almost entirely to find paragraphs that read like nobody wrote them and
then ask the questions that should have been asked before drafting started. That
is remediation, applied after the prose is already set.

This plan moves that questioning to the front. A new Interview stage runs a
rotating panel of interviewer personas, one adaptive question per turn, and
captures the answers **verbatim** as a `transcript` artifact. Draft is then
constrained: every claim, story, number, opinion, and judgement in the piece must
trace to a line in that transcript. Anything it cannot source becomes a
placeholder or a flagged connective sentence.

The payoff is that generic prose stops being written in the first place, rather
than being detected and patched afterwards. The interview is also the one stage
of a content pipeline that is genuinely better spoken than typed — spoken answers
are longer, messier, and full of the specific asides that make writing sound like
a person. Plan 008 adds the microphone; this plan makes the stage worth talking
into.

## Current state

### The pipeline is defined in three places that must agree

- `src/mastra/skills/catalog.ts` — the ordered list of 11 skills, each with a
  `stage` number (0–7) or `null` for standalone. Drives the stage rail, the
  skill gallery, and the filesystem paths handed to Mastra.
- `src/mastra/projects/schema.ts` — the Zod working-memory schema. One nullable
  field per stage artifact, plus `STAGE_ARTIFACT_FIELD` mapping stage number →
  field name.
- `src/mastra/skills/<name>/SKILL.md` — each skill states its own stage number
  in its frontmatter description, its `#` heading, and in cross-references to
  other stages. There are 76 `Stage N` occurrences across the 11 files at commit `490545a`.

Everything in the UI derives from those three. `src/components/kessel-run/stage-rail.tsx`
and `src/lib/kessel-run/artifacts.ts` read `PIPELINE_SKILLS` and
`STAGE_ARTIFACT_FIELD` and need no edits beyond what the tests below cover.

### `src/mastra/skills/catalog.ts:20-31` — the skill-name union

```ts
export type KesselRunSkillName =
  | 'kessel-run-research'
  | 'kessel-run-anchor'
  | 'kessel-run-ideation'
  | 'kessel-run-hook'
  | 'kessel-run-architecture'
  | 'kessel-run-draft'
  | 'kessel-run-personalize'
  | 'kessel-run-polish'
  | 'kessel-run-review'
  | 'kessel-run-repurpose'
  | 'kessel-run-analyze';
```

### `src/mastra/skills/catalog.ts:55-69` — the shape of one catalog entry

```ts
  {
    name: 'kessel-run-anchor',
    label: 'Anchor',
    stage: 1,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Lock in topic, audience, format, goal, and framing.',
  },
  {
    name: 'kessel-run-ideation',
    label: 'Ideation',
    stage: 2,
    optional: false,
    timeTarget: '~5 min',
    summary: 'Expand the anchor into a thesis, supporting angles, and evidence.',
  },
```

### `src/mastra/projects/schema.ts:47-72` — the working-memory schema

```ts
export const projectStateSchema = z.object({
  /** Highest pipeline stage completed, or null before Anchor. 0..7. */
  currentStage: z.number().min(0).max(7).nullable(),
  /** Stage 0 — research brief, markdown. */
  researchBrief: z.string().nullable(),
  /** Stage 1 — the structured anchor. */
  anchor: anchorSchema.nullable(),
  /** Stage 2 — ideation map, markdown. */
  ideationMap: z.string().nullable(),
  ...
```

### `src/mastra/projects/schema.ts:104-116` — the stage → field map

```ts
export const STAGE_ARTIFACT_FIELD = {
  0: 'researchBrief',
  1: 'anchor',
  2: 'ideationMap',
  3: 'hook',
  4: 'beatMap',
  5: 'draft',
  6: 'personalizationNotes',
  7: 'polishScorecard',
} as const satisfies Record<number, keyof ProjectState>;
```

### `src/mastra/projects/store.ts:78-88` — why the new schema field needs a default

```ts
  const raw = await memory.getWorkingMemory({ threadId: projectId, resourceId });
  if (!raw) return EMPTY_PROJECT_STATE;

  try {
    return projectStateSchema.parse(JSON.parse(raw));
  } catch {
    // A malformed or older-shaped blob must not take down the project view.
    return EMPTY_PROJECT_STATE;
  }
```

**This is load-bearing.** Every project that already exists has a working-memory
blob with no `transcript` key. If the new field is added as a plain
`z.string().nullable()`, `parse` throws on every one of those blobs and the
`catch` silently replaces a project's entire artifact set with the empty state —
the user's anchor, ideation map, and draft all vanish from the UI with no error.
Step 3 requires `.default(null)` for exactly this reason. Do not drop it.

### Repo conventions to match

- **Skill files**: one `SKILL.md` per directory, directory name identical to the
  frontmatter `name`. Frontmatter is exactly two keys, `name` and a
  double-quoted single-line `description`. Body opens with
  `# Kessel Run — Stage N: <Label>`. See
  `src/mastra/skills/kessel-run-anchor/SKILL.md` as the exemplar.
- **TypeScript in `src/mastra/`**: single quotes, semicolons, 2-space indent.
  **TypeScript in `src/lib/` and `src/components/`**: double quotes, no
  semicolons. Match whichever file you are editing; do not normalize.
- **Tests**: colocated `*.test.ts`, Vitest, `describe`/`it`. See
  `src/mastra/skills/catalog.test.ts`.
- Comments in this repo explain *why*, not *what*. Match that density — the
  existing schema and store comments are the calibration.

### The stage renumbering this plan performs

Interview takes Stage 2. Everything from the old Stage 2 up shifts by one:

| Skill | Old stage | New stage |
|---|---|---|
| Research | 0 | 0 |
| Anchor | 1 | 1 |
| **Interview** | — | **2** |
| Ideation | 2 | 3 |
| Hook | 3 | 4 |
| Architecture | 4 | 5 |
| Draft | 5 | 6 |
| Personalize | 6 | 7 |
| Polish | 7 | 8 |
| Review / Repurpose / Analyze | null | null |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |

**Run `npm install` first.** A `node_modules` predating commit `87fa9fd` has no
`vitest`, and both `npm test` and `npm run typecheck` fail with
`Cannot find module 'vitest'` until you install. That failure is environmental,
not a defect in your work.

`npm run build` logs `IO Error: Could not set lock on file .../mastra.duckdb`.
That is a known pre-existing issue (Next's parallel build workers contend on the
observability store). It is non-fatal; the build still exits 0. Do not try to
fix it — it is out of scope.

## Scope

**In scope** (the only files you may modify or create):

- `src/mastra/skills/kessel-run-interview/SKILL.md` (create)
- `src/mastra/skills/kessel-run-research/SKILL.md`
- `src/mastra/skills/kessel-run-anchor/SKILL.md`
- `src/mastra/skills/kessel-run-ideation/SKILL.md`
- `src/mastra/skills/kessel-run-hook/SKILL.md`
- `src/mastra/skills/kessel-run-architecture/SKILL.md`
- `src/mastra/skills/kessel-run-draft/SKILL.md`
- `src/mastra/skills/kessel-run-personalize/SKILL.md`
- `src/mastra/skills/kessel-run-polish/SKILL.md`
- `src/mastra/skills/kessel-run-analyze/SKILL.md`
- `src/mastra/skills/kessel-run-review/SKILL.md` (only if a `Stage N` reference exists — check)
- `src/mastra/skills/kessel-run-repurpose/SKILL.md` (only if a `Stage N` reference exists — check)
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts`
- `src/mastra/projects/schema.ts`
- `src/mastra/projects/schema.test.ts`
- `src/mastra/agents/kessel-run-agent.ts`
- `src/lib/kessel-run/artifacts.test.ts`
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `src/components/ai-elements/` and `src/components/ui/` — vendored library code
  carrying hand-applied compatibility fixes.
- `src/components/kessel-run/*.tsx` — the stage rail and artifacts panel derive
  everything from the catalog and `STAGE_ARTIFACT_FIELD`. If you find yourself
  wanting to edit one, you have made a mistake in the catalog instead.
- `src/mastra/projects/store.ts`, `src/mastra/index.ts`,
  `src/app/api/**` — no route or store change is needed.
- Microphone / voice input. That is plan 008.
- `src/mastra/agents/weather-agent.ts`, `src/mastra/tools/weather-tool.ts`,
  `src/mastra/workflows/weather-workflow.ts`, `src/app/chat/`, `src/app/api/chat/`
  — the reference implementation, deliberately preserved.
- Removing or shrinking the Personalize stage. It is now partly redundant by
  design, but deleting it is a separate decision. See "Maintenance notes".

## Git workflow

- Branch: `advisor/007-interview-stage`
- Commit per step or per logical unit. Message style from `git log`: short
  imperative sentence, no prefix, e.g. `Add project workspace route, loading, and not-found pages`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the three stale stage references in Polish

`kessel-run-polish/SKILL.md` refers to `Review (Stage 8)`, `Repurpose (Stage 9)`
and `Distribute (Stage 10)`. Review and Repurpose are standalone skills with no
stage number, and there is no Distribute skill at all. These must be fixed
**before** the renumber in step 2, because after the shift Polish itself becomes
Stage 8 and the collision would be confusing.

Make exactly these three replacements in `src/mastra/skills/kessel-run-polish/SKILL.md`:

- Line 193: `- "Continue to Review (Stage 8)" — Optional stress testing with different lenses.`
  → `- "Continue to Review" — Optional stress testing with different lenses.`
- Line 194: `- "Continue to Repurpose (Stage 9)" — Generate other content forms from this piece.`
  → `- "Continue to Repurpose" — Generate other content forms from this piece.`
- Line 238: replace
  `From here you can move to Review (Stage 8) for stress testing, Repurpose (Stage 9) to generate other formats like LinkedIn posts or threads, or Distribute (Stage 10) for publishing logistics.`
  with
  `From here you can move to Review for stress testing, or Repurpose to generate other formats like LinkedIn posts or threads.`

**Verify**: `grep -c "Stage 8\|Stage 9\|Stage 10" src/mastra/skills/kessel-run-polish/SKILL.md` → `0`

### Step 2: Shift every stage number 2–7 up by one

Apply the substitutions in **descending order** across all `SKILL.md` files.
Descending order is what prevents a cascade (7→8 first means the newly written
`Stage 8` is never re-matched by the 6→7 pass).

Run these six commands from the repo root, in exactly this order. Do not
reorder them and do not collapse them into a loop — a shell loop that relies on
word splitting behaves differently in zsh (this repo's shell) than in bash, and
the ordering is the entire correctness argument.

```bash
sed -i '' 's/Stage 7/Stage 8/g' src/mastra/skills/*/SKILL.md
sed -i '' 's/Stage 6/Stage 7/g' src/mastra/skills/*/SKILL.md
sed -i '' 's/Stage 5/Stage 6/g' src/mastra/skills/*/SKILL.md
sed -i '' 's/Stage 4/Stage 5/g' src/mastra/skills/*/SKILL.md
sed -i '' 's/Stage 3/Stage 4/g' src/mastra/skills/*/SKILL.md
sed -i '' 's/Stage 2/Stage 3/g' src/mastra/skills/*/SKILL.md
```

(These are the macOS `sed` flags, which is what this repo is developed on. On
Linux, drop the `''` after `-i`.)

This is a pure text shift — it is correct precisely because step 1 removed the
only pre-existing references to stages above 7.

**Verify**: `grep -rno "Stage [0-9]\+" src/mastra/skills/*/SKILL.md | wc -l` → `71`

The count must be **identical before and after** this step — the shift renames
occurrences, it never creates or destroys them. The baseline is 76 occurrences
at commit `490545a`, minus the 5 that step 1 removed (`Stage 8` and `Stage 9` on
lines 193–194, and `Stage 8`, `Stage 9`, `Stage 10` on line 238), which is 71.
Run the same command *before* step 2 as well and confirm it also says 71. If the
before and after counts differ, that is a STOP condition.

**Verify**: `grep -c "Stage 2" src/mastra/skills/*/SKILL.md | grep -v ":0"` →
no output. Nothing should reference Stage 2 yet; Interview does not exist.

### Step 3: Retitle the six skills whose own stage changed

The shift in step 2 already updated every `Stage N` string, including each
skill's own heading and description. Confirm each file now self-describes
correctly:

| File | Expected `#` heading (line 6) |
|---|---|
| `kessel-run-ideation/SKILL.md` | `# Kessel Run — Stage 3: Ideation` |
| `kessel-run-hook/SKILL.md` | `# Kessel Run — Stage 4: Hook` |
| `kessel-run-architecture/SKILL.md` | `# Kessel Run — Stage 5: Architecture` |
| `kessel-run-draft/SKILL.md` | `# Kessel Run — Stage 6: Draft` |
| `kessel-run-personalize/SKILL.md` | `# Kessel Run — Stage 7: Personalize` |
| `kessel-run-polish/SKILL.md` | `# Kessel Run — Stage 8: Polish` |

Research (`Stage 0`) and Anchor (`Stage 1`) are unchanged.

Then make these two content edits, which the mechanical shift cannot know about:

**a.** `src/mastra/skills/kessel-run-anchor/SKILL.md`, last line (the
`**Name the next step.**` paragraph). It now reads
`"Your anchor is set. Stage 3 is Ideation — that's where we'll build out the thesis, key points, supporting angles, and figure out what makes this piece worth reading. Ready to move on?"`
Replace that quoted sentence with:

```
"Your anchor is set. Stage 2 is Interview — that's where I ask you about this one question at a time and capture your answers in your own words. Talk them out rather than typing if you can; the transcript is what the whole piece gets built from. Ready?"
```

**b.** `src/mastra/skills/kessel-run-research/SKILL.md` line 74. It now reads
`This document feeds directly into Stage 1 (Anchor) as source material and informs Stage 3 (Ideation).`
Replace with:

```
This document feeds directly into Stage 1 (Anchor) as source material, and gives the author quotes and data points to pull into their spoken answers in Stage 2 (Interview).
```

**Verify**: `grep -n "Stage 2 (Interview)" src/mastra/skills/kessel-run-research/SKILL.md` → one match
**Verify**: `grep -c "Stage 2 is Interview" src/mastra/skills/kessel-run-anchor/SKILL.md` → `1`

### Step 4: Create the Interview skill

Create the directory `src/mastra/skills/kessel-run-interview/` and write
`SKILL.md` with exactly the content between the fence markers below. Copy it
verbatim — do not summarize, reword, or reformat it.

`````markdown
---
name: kessel-run-interview
description: "Stage 2 of the Kessel Run content pipeline: interviews the user about their anchor with a rotating panel of interviewer personas and captures their answers as a verbatim transcript. Use this skill when the user has a confirmed anchor and needs to get their own thinking out of their head before any writing happens. Also trigger when the user says things like 'interview me,' 'ask me questions about this,' 'let me talk this through,' 'I want to get my thoughts out,' 'record my thinking on this,' or 'I'm ready to answer questions.' This skill produces the transcript that Ideation organizes and that Draft is constrained to."
---

# Kessel Run — Stage 2: Interview

You are interviewing the user about the piece they are going to write. The user arrives with a confirmed anchor (Stage 1) and possibly a research brief (Stage 0). Your job is to ask questions good enough that their answers become the raw material for the entire piece.

This is the load-bearing stage of the pipeline. Everything after it is shaping. If the interview is thin, the piece will be generic no matter how good the later stages are — and the fix is a better interview, not a better prompt.

## The rule that makes this work

The transcript you produce here is the **source of record** for the piece. Stage 6 (Draft) is constrained to it: every claim, story, number, opinion, and judgement in the finished piece has to trace back to something the user said in this conversation. Nothing gets invented downstream.

That means the interview has to surface the material, because nothing else will. If the user does not say it here, it does not go in the piece.

## Voice first

Say this at the start, before the first question:

> "This works best spoken. Use the mic button and just talk — ramble, backtrack, go on tangents. I'm not going to clean any of it up, and the messy parts are usually the best material. One question at a time, and I'll build the next one off what you say."

Spoken answers are longer, more specific, and more idiomatic than typed ones. Typed answers to good questions come out short, tidy, and pre-edited, which is the same thing as pre-generified. Encourage talking every time an answer comes back short and clipped.

Never present a list of questions for the user to work through. One question, wait, respond to what they actually said.

## What you need before starting

- **The anchor** (Stage 1): idea, publication, format, audience, goal, framing, scope.
- **The research brief** (Stage 0), if one exists — read it so your questions can name specific things other people have said and ask the user to react.

If there is no anchor, do not start interviewing. Ask the user to run Stage 1 first, or spend two minutes establishing at least the idea, audience, and format.

## The panel

You are not one interviewer. You rotate through five, named out loud, each of which extracts a different kind of material. Announce which one is asking — it tells the user what kind of answer is wanted, and it stops the interview from settling into a single register.

| Persona | Extracts | Signature question shape |
| --- | --- | --- |
| **The Practitioner** | Concrete engagement detail | "Give me the specific project where this bit you. What actually broke?" |
| **The Skeptic** | A defended position | "Someone competent thinks the opposite. Why are they wrong?" |
| **The Historian** | Contrast and before-state | "What were you doing before this? What did it cost you?" |
| **The Human** | Moment, texture, feeling | "Where in this did you think it wasn't going to work?" |
| **The Editor** | The unsaid thesis | "You've said three things. What's the one underneath them?" |

Open with The Practitioner or The Skeptic — both force a concrete answer immediately and set the register for everything after. Close with The Editor, whose job is to make the user state the thesis in their own words rather than having one assigned to them later.

Do not run the personas in a fixed rotation. Pick whichever one wants to ask next based on what the last answer left open.

## Rules of the interview

- **One question per turn. Never batch.** Two questions in one message gets you two half-answers.
- **Every follow-up derives from the previous answer**, not from a script. This is the whole difference between an interview and a questionnaire. Quote back the phrase you are pulling on.
- **Any answer under about 30 words gets one follow-up demanding specificity** before you move on. "When was this? What was the number? Who else was in the room? What did you do next?"
- **Push for numbers, names, dates, and project references.** Not "it took a while" but "how long, actually?" Not "the client" but "which one, and what were they trying to do?"
- **Chase the tangents.** If the user wanders into something unexpected, follow it for at least one question before steering back. Tangents are where the non-obvious material lives.
- **Never answer your own question.** Do not offer the user a menu of possible answers to pick from, and do not suggest what they might mean. That imports your framing into what is supposed to be their material.
- **Do not evaluate the answers.** No "great point," no summarizing back what they meant. Acknowledge in a few words and ask the next thing.
- **Do not draft.** No prose, no phrasing suggestions, no "you could open with." That is Stage 4 and Stage 6.

## When to stop

Continue until the panel has all four of these, in the user's own words:

1. A **defended thesis** — something they believe, stated as a position, with a reason.
2. **At least two concrete stories** with real detail — a project, a moment, what happened, what it cost.
3. **One counterargument they have answered** — a smart objection, and their response to it.
4. **One thing they believe that most of their audience does not.**

Target 6–10 exchanges for an article or newsletter, 4–6 for a LinkedIn post or thread. If you hit the exchange target without all four, say which one is missing and ask for it directly.

When you have all four, say so and stop: "I've got a thesis, two stories, the counterargument, and the contrarian bit. That's enough to build from — anything else you want on the record before I write this up?"

## Output: the transcript

Compile the exchange and present it in this format, then ask the user to confirm before writing it to the project's `transcript` field.

```
## Interview Transcript

**Anchor**: [one-sentence anchor from Stage 1]
**Format**: [content format]
**Exchanges**: [count]

---

### 1. [Persona] — [the question you asked, verbatim]

[The user's answer, verbatim]

### 2. [Persona] — [the question, verbatim]

[The user's answer, verbatim]

[repeat for every exchange]

---

### Material inventory

- **Thesis (their words)**: "[direct quote]"
- **Stories**: [one line each, with the exchange number they came from]
- **Counterargument answered**: [one line, with exchange number]
- **Contrarian position**: [one line, with exchange number]
- **Numbers, names, dates given**: [list, with exchange numbers]
- **Still missing**: [anything the panel wanted and did not get]
```

### The verbatim rule

Reproduce the user's answers **exactly as they said them**. Do not:

- fix grammar, punctuation, or speech-to-text artifacts
- remove filler, false starts, repetitions, or self-corrections
- tidy a rambling answer into a tighter one
- merge two answers, reorder them, or paraphrase

The rawness is the point. Those artifacts are what the draft mines for voice, and a cleaned-up transcript is already one generation of averaging away from how the user actually talks. The only text you author in this artifact is the questions and the material inventory.

## Guiding principles

**The interview is the product.** Everything downstream is reorganization. Time spent here is worth more than time spent anywhere else in the pipeline.

**Specificity is the entire defense against generic output.** Every general claim has a specific instance behind it. Your job is to get the instance, not the claim.

**Silence is a question too.** If an answer trails off somewhere interesting, ask what came next rather than moving on.

**Never invent.** You ask; they answer. If the transcript is thin in some area, mark it in "Still missing" — never fill it in yourself, and never write an answer the user did not give.

**Name the next step.** When the transcript is confirmed: "Transcript's saved. Stage 3 is Ideation — that's where we organize what you just said into a thesis, key points, evidence, and counterarguments. It works from your transcript, not from scratch. Ready?"
`````

**Verify**: `test -f src/mastra/skills/kessel-run-interview/SKILL.md && head -2 src/mastra/skills/kessel-run-interview/SKILL.md | tail -1 | cut -c1-25` → `name: kessel-run-intervi`
**Verify**: `grep -c "^# Kessel Run — Stage 2: Interview" src/mastra/skills/kessel-run-interview/SKILL.md` → `1`

### Step 5: Add the skill to the catalog

> **If plan 014 has already landed**, `kessel-run-interview` is registered as a
> standalone skill (`stage: null`) and the union member already exists. In that
> case do not add a second entry — change the existing entry's `stage: null` to
> `stage: 2` and move it from the end of `KESSEL_RUN_SKILLS` to between
> `kessel-run-anchor` and `kessel-run-ideation`. Its `label`, `timeTarget`, and
> `summary` stay as they are. Step 4 is then a no-op for the file's existence:
> compare the on-disk `SKILL.md` against this plan's version and update the
> heading, description, and stage cross-references to the Stage 2 wording, rather
> than overwriting the file wholesale. The catalog-test edits in step 9 also start
> from 12 skills / 4 standalone rather than 11 / 3.

In `src/mastra/skills/catalog.ts`:

**a.** Add `| 'kessel-run-interview'` to `KesselRunSkillName`, positioned after
`'kessel-run-anchor'`.

**b.** Insert a new entry into `KESSEL_RUN_SKILLS` between the `kessel-run-anchor`
and `kessel-run-ideation` entries:

```ts
  {
    name: 'kessel-run-interview',
    label: 'Interview',
    stage: 2,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Answer a panel of interviewers out loud; capture it verbatim.',
  },
```

**c.** Renumber the `stage` values of the entries that follow, to match the table
in "Current state": ideation `3`, hook `4`, architecture `5`, draft `6`,
personalize `7`, polish `8`.

**Verify**: `grep -c "stage: " src/mastra/skills/catalog.ts` → `12`

### Step 6: Add the transcript to the working-memory schema

In `src/mastra/projects/schema.ts`:

**a.** Widen `currentStage` to `.max(8)` and update its doc comment to say `0..8`.

**b.** Insert the transcript field between `anchor` and `ideationMap`:

```ts
  /**
   * Stage 2 — the verbatim interview transcript, markdown.
   *
   * Defaulted rather than plain-nullable on purpose: every project created
   * before this field existed has a working-memory blob with no `transcript`
   * key, and a required field would make `getProjectState`'s parse throw and
   * silently fall back to the empty state — wiping that project's anchor,
   * draft, and everything else from the UI.
   */
  transcript: z.string().nullable().default(null),
```

**c.** Add `transcript: null,` to `EMPTY_PROJECT_STATE`, in the same position.

**d.** Update `STAGE_ARTIFACT_FIELD` to:

```ts
export const STAGE_ARTIFACT_FIELD = {
  0: 'researchBrief',
  1: 'anchor',
  2: 'transcript',
  3: 'ideationMap',
  4: 'hook',
  5: 'beatMap',
  6: 'draft',
  7: 'personalizationNotes',
  8: 'polishScorecard',
} as const satisfies Record<number, keyof ProjectState>;
```

**Verify**: `npm run typecheck` → exit 0, no output

**Verify**: `grep -n "transcript: z.string().nullable().default(null)" src/mastra/projects/schema.ts` → one match

The backward-compatibility guarantee itself is verified by a test, added in
step 9:

```ts
  it("parses an old blob that predates the transcript field", () => {
    const { transcript: _dropped, ...old } = EMPTY_PROJECT_STATE;
    expect(projectStateSchema.parse(old).transcript).toBeNull();
  });
```

That test is the one place the hazard is pinned down. If it does not exist and
pass, step 6 is not done.

### Step 7: Teach Ideation and Draft to use the transcript

**a.** `src/mastra/skills/kessel-run-ideation/SKILL.md`

Replace the paragraph at line 10 (`Your role is depth miner: ...`) with:

```
Your role changed when the Interview stage landed upstream. You are no longer the extraction stage — the user has already said what they think, out loud, and it is sitting in the transcript. Your role is **organizer**: read the transcript, pull the thesis out of their own words, sequence the key points, inventory what is actually evidenced, and name what is missing. Go deeper on fewer ideas rather than wider on many.
```

Then insert this section immediately before the existing `## What you're working with` heading:

```
## Work from the transcript

The interview transcript (Stage 2) is the source of record. Everything in the ideation map should be traceable to a line in it.

- **Quote, don't paraphrase.** When you state the thesis or a key point, use the user's own phrasing wherever it works. Their words survive into the draft; yours get flagged as generic later.
- **Cite the exchange.** Every key point, story beat, and piece of evidence gets a `(from exchange N)` marker so Draft knows where to look.
- **Flag anything untraceable.** If you add an angle, a counterargument, or a framing that the user never said, mark it `[NOT IN TRANSCRIPT]`. Those are material the user has to supply or cut before drafting — do not let them slide through unlabelled.
- **Missing beats a filled gap.** Where a key point has no story and no number behind it in the transcript, say so and ask. Do not smooth over it.

If no transcript exists, say so and offer to run Stage 2 first. You can still run Ideation without one — but tell the user plainly that the draft will be thinner for it, because the writer will have less of their material to work from.
```

**Verify**: `grep -c "NOT IN TRANSCRIPT" src/mastra/skills/kessel-run-ideation/SKILL.md` → `1`

**b.** `src/mastra/skills/kessel-run-draft/SKILL.md`

Add a bullet at the top of the list under `## What you're working with`, before
the `- **Beat map**` bullet:

```
- **Interview transcript** (from Interview, Stage 2): the user's own words, verbatim. This is the source of record. Read it before you write a single sentence.
```

Then insert this section immediately before the `## Voice profile application`
heading:

```
## Source discipline — the transcript rule

Every claim, opinion, story, example, number, name, date, and judgement in this piece must trace to a line in the interview transcript. External facts may also come from the research brief, with attribution. Nothing else is a source — not your priors, not what is generally true about the topic, not what would make the paragraph flow better.

You may write **connective tissue**: transitions, section lead-ins, and framing sentences that carry no new claim, written in the user's voice. That allowance exists so you are not forced to bolt quotes together. It is not a loophole. A sentence that asserts anything — that something is common, that it matters, that most people get it wrong — is a claim, not connective tissue, and it needs a transcript line behind it.

The hook, the bridge, and the closing may be authored, but they are not exempt from source discipline. Any factual or personal claim in them needs the same source support as a claim in the body.

When you need something the transcript does not have:

- A specific detail only the user has → `[PLACEHOLDER: the exact number of hours the migration took]`
- A claim you think the piece needs but cannot source → `[FROM TRANSCRIPT?: you'd need to say something here about why the old workflow held on so long]`

Never write generic filler where one of those belongs. "The results were impressive" is filler. A placeholder is honest.

At the end of every section, report the sourcing:

**Sourcing**: N sentences from transcript (exchanges 2, 5, 7) · M connective · P placeholders · Q from-transcript flags

If the connective count is climbing above roughly a quarter of a section, stop and say so. That is the signal that the transcript is too thin for this beat, and the fix is going back to the user for material — not writing more connective tissue.
```

Add a bullet at the top of the `## What you must never do` list:

```
**Never write an unsourced claim.** If it is not in the transcript, not in the research brief, and not connective tissue, it does not go in the draft. Placeholder it or flag it.
```

Update the per-section output block so it reads:

```
**Voice check**: [Any notes on voice profile application — patterns used, anti-patterns avoided, signature moves deployed]
**Sourcing**: [N from transcript (exchanges ...) · M connective · P placeholders · Q from-transcript flags]
```

**Verify**: `grep -c "Source discipline" src/mastra/skills/kessel-run-draft/SKILL.md` → `1`
**Verify**: `grep -c "FROM TRANSCRIPT?" src/mastra/skills/kessel-run-draft/SKILL.md` → `2`

### Step 8: Update the agent instructions

In `src/mastra/agents/kessel-run-agent.ts`, in the `instructions` string:

**a.** In the final paragraph, change the artifact list from

`the research brief, anchor, ideation map, hook, beat map, draft, personalization notes, and polish scorecard`

to

`the research brief, anchor, interview transcript, ideation map, hook, beat map, draft, personalization notes, and polish scorecard`.

**b.** Add this bullet to the "Principles that hold across every stage" list,
immediately after the `**Never invent.**` bullet:

```
- The transcript is the source of record. Once an interview transcript exists, the piece is built from the user's own words. You reorganize, compress, and sequence; you do not supply new claims, stories, or opinions. Anything you cannot trace to the transcript is a placeholder or a flagged gap, never invented prose.
```

**Verify**: `grep -c "source of record" src/mastra/agents/kessel-run-agent.ts` → `1`

### Step 9: Update the tests

**a.** `src/mastra/skills/catalog.test.ts` — three assertions change:

- `it("has 11 skills")` → `it("has 12 skills")`, expecting `toHaveLength(12)`
- `it("splits into 8 pipeline stages and 3 standalone skills")` →
  `it("splits into 9 pipeline stages and 3 standalone skills")`, expecting
  `PIPELINE_SKILLS` `toHaveLength(9)`
- `it("numbers pipeline stages 0..7 with no gaps or duplicates")` →
  `0..8`, expecting `[0, 1, 2, 3, 4, 5, 6, 7, 8]`

**b.** `src/mastra/projects/schema.test.ts`:

- `it("rejects a stage outside 0..7")` → `0..8`; change the rejected value from
  `9` to `10` so it is unambiguously outside the new range, and add an
  assertion that `8` is accepted.
- In `stageIsComplete`, the `withIdeation` case asserts stage `2` is complete
  and `3` is not. Ideation is now stage 3, so change to
  `expect(stageIsComplete(withIdeation, 3)).toBe(true)` and
  `expect(stageIsComplete(withIdeation, 4)).toBe(false)`.
- Add the old-blob parse test shown in step 6.
- Add a test that stage 2 maps to `transcript`:
  ```ts
  it("maps stage 2 to the interview transcript", () => {
    expect(STAGE_ARTIFACT_FIELD[2]).toBe("transcript");
  });
  ```

**c.** `src/lib/kessel-run/artifacts.test.ts`:

- `it("returns 8 entries, ...")` → 9 entries.
- `it("returns views in stage order 0..7")` → `0..8`, expecting
  `[0, 1, 2, 3, 4, 5, 6, 7, 8]`.
- `it("is 0.25 when two of eight stages are complete")` → rename to
  `"is two ninths when two of nine stages are complete"` and change the
  assertion to `expect(pipelineProgress(state)).toBeCloseTo(2 / 9)`.
- Add a test that a transcript renders as its own string:
  ```ts
  it("round-trips the transcript artifact", () => {
    const state: ProjectState = { ...EMPTY_PROJECT_STATE, transcript: "### 1. The Skeptic" }
    const view = toArtifactViews(state).find((v) => v.field === "transcript")
    expect(view?.stage).toBe(2)
    expect(view?.complete).toBe(true)
  })
  ```

**Verify**: `npm test` → exit 0, all pass (36 prior tests plus the new ones;
expect roughly 40)

### Step 10: Full verification

Run all four gates and confirm the counts.

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0 (DuckDB lock warnings expected, see above)
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

All new tests go in the existing colocated test files listed in step 9; model
them on the assertions already in those files.

New cases, and what each protects:

- **`schema.test.ts` — old blob parses.** The regression this plan is most
  likely to cause: a required new field silently blanking every existing
  project's artifacts. This is the one test that must not be dropped.
- **`schema.test.ts` — stage 2 maps to `transcript`.** Catches a half-applied
  renumber where `STAGE_ARTIFACT_FIELD` and the catalog disagree.
- **`schema.test.ts` — stage 8 accepted, stage 10 rejected.** Pins the widened
  `currentStage` bound.
- **`artifacts.test.ts` — transcript round-trips at stage 2.** Proves the
  artifacts panel will actually show the transcript.
- The existing `STAGE_ARTIFACT_FIELD` coverage test in `schema.test.ts`
  (`covers every pipeline stage in the catalog`) already cross-checks the
  catalog against the schema. It needs no edit and will fail loudly if step 5
  and step 6 disagree — that is the safety net for the renumber.

Verification: `npm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all tests pass, and the new cases from step 9 exist
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `ls src/mastra/skills | wc -l` → `12` directories plus `catalog.ts` and `catalog.test.ts` (i.e. `14` entries)
- [ ] `grep -rn "Stage 9\|Stage 10" src/mastra/skills/` returns no matches
- [ ] Every pipeline skill self-describes its new stage. This command prints the
      nine heading lines; each must match the table in step 3 plus
      `# Kessel Run — Stage 2: Interview`:
      ```
      grep -h "^# Kessel Run — Stage" src/mastra/skills/*/SKILL.md | sort
      ```
      Expected, in order: Stage 0: Research, Stage 1: Anchor, Stage 2: Interview,
      Stage 3: Ideation, Stage 4: Hook, Stage 5: Architecture, Stage 6: Draft,
      Stage 7: Personalize, Stage 8: Polish
- [ ] `grep -n "2: 'transcript'" src/mastra/projects/schema.ts` returns one match
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows any in-scope file changed since `490545a`, and the
  "Current state" excerpts no longer match what is on disk.
- The `Stage N` occurrence count changes across step 2 (it must be 71 both
  before and after). That means the descending shift cascaded or missed, and
  re-running it will make things worse — report both counts and the diff.
- `npm test` or `npm run typecheck` fails twice after a reasonable fix attempt.
- You find yourself needing to edit `src/components/kessel-run/*.tsx` or
  `src/mastra/projects/store.ts`. Neither should need a change; wanting to means
  the catalog or schema edit is wrong.
- The assumption "the UI derives all stage numbering from `PIPELINE_SKILLS` and
  `STAGE_ARTIFACT_FIELD`" turns out to be false — i.e. you find a hardcoded
  stage number or stage count in a component.

## Maintenance notes

For whoever owns this next:

- **Personalize (now Stage 7) is partly redundant by design.** Its whole job is
  finding paragraphs that read like nobody wrote them, and the transcript rule is
  supposed to stop those from being written. Do not delete it yet — run a few
  pieces through the new pipeline first and see what it still catches. If it
  reliably catches nothing, that is the evidence for cutting it, and cutting it
  is another renumber.
- **The transcript rule is only as good as the transcript.** If drafts come back
  full of `[FROM TRANSCRIPT?]` flags, that is the system working: the interview
  was thin. Fix the interview, not the draft prompt.
- **`currentStage` is still never written** by the agent despite the instructions
  saying to set it (known open item from plan 006). Nothing in this plan depends
  on it — `stageIsComplete` reads the artifact field — but the widened `0..8`
  bound will not be exercised until that is fixed.
- **A reviewer should scrutinize**: the `.default(null)` on `transcript` (drop it
  and existing projects lose their artifacts), the stage numbers in `catalog.ts`
  against `STAGE_ARTIFACT_FIELD`, and whether the Interview SKILL.md was copied
  verbatim rather than paraphrased.
- **Deferred out of this plan**: the lessons loop (diff final vs. draft →
  `content-lessons.md`), derived voice profiles from the Previously on Tech and
  Weller Avenue archives, the Oracle/Vault idea sourcing, and upgrading Polish to
  a multi-persona council. All four are from the same gap analysis and none of
  them block this one.
