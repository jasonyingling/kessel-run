# Plan 012: Add `kessel-run-lessons`, which learns from the edits you already make

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
> condition. Files created by plans 007 and 009–011 appearing is those plans
> landing, not drift.

> **Note (2026-08-25)**: the workspace this plan reads and writes is the Obsidian
> vault, not `~/kessel-run/`. See decision 10 in `plans/README.md` and the mapping
> in `plans/014-interview-skill-into-vault.md`. Plan 010 must be revised for the
> vault first; the paths named here inherit whatever that revision settles on.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/009-package-skills-for-claude.md,
  plans/010-workspace-and-run-directory.md
- **Category**: direction
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

`kessel-run-analyze` learns from published performance. That is useful and it is
also slow, sparse, and conditional on the author having analytics discipline
weeks after publishing.

There is a second signal, generated on every single run whether anyone wants it
or not: the difference between what Claude wrote and what the author actually
published. It is free, immediate, dense, and currently discarded in full.

The author already does a manual version of this. The Previously on Tech voice
rules — no em dashes, no "X not Y", no agency-speak, blurbs two to five sentences
— exist because they noticed Claude doing things they disliked and wrote them
down. This plan automates that noticing: diff the draft against the final,
abstract the diff into rules rather than edits, confirm each one, and append to a
corrections log that every writing stage reads before it writes.

It is the only part of the pipeline that improves without deliberate effort.

## Current state

### Nothing captures the final edit

`src/mastra/skills/kessel-run-polish/SKILL.md:190-194` is where a piece is
declared done:

```
Congratulate the user briefly and present the final piece: "This is ready. Here's your finished piece." Present the complete draft as the final deliverable. Offer the next stage options:

- "Mark as complete" — The piece is done in its primary format.
- "Continue to Review (Stage 8)" — Optional stress testing with different lenses.
- "Continue to Repurpose (Stage 9)" — Generate other content forms from this piece.
```

(Plan 007 rewrites the two parenthesized stage numbers. If 007 has landed, those
lines read `"Continue to Review"` and `"Continue to Repurpose"`. Either form is
fine for this plan's purposes; anchor your edit on the surrounding text.)

The author then takes the piece away and edits it before publishing. Nothing
asks for that edited version back, so the edit is never seen.

### The workspace already reserves the two files this needs

`WORKSPACE_BLOCK` in `src/lib/kessel-run/workspace.ts` (plan 010) names both:

```
  content-lessons.md    corrections the author has already given
  runs/<YYYY-MM-DD-slug>/
    research.md  anchor.md  transcript.md  ideation.md  hook.md
    beats.md  draft.md  personalize.md  polish.md  final.md
```

and instructs every skill to read `content-lessons.md` if it exists. So the read
path is already wired by plan 010; this plan builds the write path and makes the
read explicit where it matters.

### Draft's current instruction about the author's edits

`src/mastra/skills/kessel-run-draft/SKILL.md`, under "Responding to user edits":

```
- **If they edited the text directly**: Read their edits carefully. They're showing you what their voice actually sounds like. Adjust your calibration for subsequent sections to match their edits, not your original draft.
```

That adaptation lives only inside one drafting session and dies with it. The
lessons log is the same idea made durable.

### Repo conventions to match

- Standalone skills use `# Kessel Run — <Label>` with no stage number, and their
  frontmatter description opens `"Standalone Kessel Run skill: …"`. See
  `kessel-run-analyze/SKILL.md`.
- `src/mastra/` — single quotes, semicolons. `src/lib/kessel-run/` — double
  quotes, no semicolons.
- The frontmatter `description` must stay under 1024 characters with no `<` or
  `>` — enforced by `skill-package.test.ts`.

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

- `src/mastra/skills/kessel-run-lessons/SKILL.md` (create)
- `src/mastra/skills/kessel-run-polish/SKILL.md` (add the `final.md` handoff)
- `src/mastra/skills/kessel-run-draft/SKILL.md` (make the lessons read explicit)
- `src/mastra/skills/kessel-run-personalize/SKILL.md` (same)
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts`
- `src/lib/kessel-run/workspace.ts` (one entry in `RUN_FILE_BY_SKILL`)
- `docs/kessel-run-workspace.md` (one paragraph)
- `plans/README.md` (status row only)

**Out of scope**:

- `WORKSPACE_BLOCK` itself. Both files it needs are already named there. Do not
  edit the block in this plan — that would force a re-propagation across every
  skill for no gain.
- `kessel-run-analyze`. It learns from published performance; this learns from
  edits. They are complementary and neither replaces the other.
- Any automated diffing in the app. This is a skill that runs in Claude with a
  filesystem; the Mastra agent has no `final.md` to diff against.
- Seeding `content-lessons.md` with the existing Previously on Tech voice rules.
  Tempting, but those rules are the author's to transcribe and confirm, and a
  corrections log whose first entries nobody approved undermines the confirm step
  that makes the rest trustworthy. Recorded in "Maintenance notes".
- The weather demo and `/chat`.

## Git workflow

- Branch: `advisor/012-lessons-loop-skill`
- Commit per step. Message style from `git log`: short imperative sentence.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the skill

Create `src/mastra/skills/kessel-run-lessons/SKILL.md`. Insert the rendered
`WORKSPACE_BLOCK` verbatim where marked, followed by
`You do not own a run-directory file. Read what is there; write nothing to it.`

`````markdown
---
name: kessel-run-lessons
description: "Standalone Kessel Run skill: compares the draft Claude produced against the version the author actually published, abstracts the difference into reusable rules, and appends them to the corrections log every writing stage reads. Use this skill after the author has done their final edit on a piece and it is ready to publish or already published. Also trigger when the user says things like 'capture what I changed,' 'learn from my edits,' 'why do I keep fixing the same thing,' 'update my content lessons,' 'run the lessons loop,' or 'compare my final to the draft.' This is the part of the pipeline that improves without anyone doing extra work."
---

# Kessel Run — Lessons

You are turning one author's edit pass into rules that stop the same edit being necessary next time.

The signal here is free. The author was going to edit the draft anyway. Every change they made is a statement about the difference between competent writing and their writing, and none of it is currently kept. Your job is to read that difference, generalize it correctly, and get it written down.

[INSERT WORKSPACE_BLOCK HERE]

You do not own a run-directory file. Read what is there; write nothing to it.

## What you need

Two versions of the same piece:

- **What the pipeline produced** — `draft.md`, or `polish.md` if Polish revised it. Use the latest machine-produced version, not the earliest.
- **What the author published** — `final.md`.

If `final.md` does not exist, ask for it. Accept a paste, a file path, or a URL to the published piece. Write it to the run directory as `final.md` before continuing, so the next run of this skill has it.

If you cannot get both versions, stop. There is nothing to learn from one version of a document, and guessing at what "would have been" edited produces rules that are worse than none.

## The loop

### 1. Diff, at the right granularity

Compare the two versions section by section. Classify every difference:

- **Substantive** — a claim added, cut, or reversed. Usually the author supplying material the draft could not have known. Interesting for the interview, not for the voice rules.
- **Structural** — sections reordered, merged, split, or dropped.
- **Line-level** — the same point, said differently.
- **Mechanical** — typos, formatting, link fixes. Ignore these entirely.

Line-level and structural changes are where the lessons are.

### 2. Abstract to rules, not edits

This is the step that determines whether the log is worth anything.

A recorded edit is useless: "changed 'leverage' to 'use' in section 3." A rule is reusable: "Never write 'leverage' as a verb. Use 'use'."

For each candidate lesson, require all three:

- **It recurs, or would.** A one-off phrasing preference from a single piece is noise. Either find a second instance in this diff, or state plainly that it is provisional.
- **It is stated as a rule a writer could follow.** If you cannot imagine applying it to an unwritten sentence, it is not abstract enough.
- **It has a reason.** Not "the author prefers this" — *why*. "Reads as machine-written", "buries the point", "claims authority the piece has not earned."

Two failure modes to avoid. **Over-abstraction**: one deleted sentence becomes "avoid long sentences", which is not what happened and will damage future drafts. **Under-abstraction**: the log fills with single-instance phrasing notes and stops being read. When in doubt, state the narrower rule.

### 3. Categorize

Sort each lesson into: **Tone**, **Structure and flow**, **Language**, or **Sourcing**. These are the categories the writing stages scan.

### 4. Confirm, one at a time

Present each proposed lesson to the author with the evidence — the before and after, quoted — and the reason. They accept, reject, or reword.

Never append an unconfirmed lesson. This log is read as law by Draft, Personalize, and Polish, and a rule the author never agreed to will quietly distort every piece after it.

Watch for the author rejecting a lesson because *this particular piece* wanted the thing you flagged. That is a real signal too — the lesson may be right with a scope condition attached ("in newsletters, not in long-form").

### 5. Append

Add confirmed lessons to `<workspace>/content-lessons.md`, under their category, in this format:

```
### [The rule, as an imperative]

**Why**: [The reason it reads wrong]
**Seen in**: [piece slug, date]
**Instead of**: "[the rejected construction, verbatim]"
**Write**: "[what the author replaced it with, verbatim]"
```

Append. Never rewrite or reorder existing entries, and never delete one — the author removes lessons, you do not. If a new lesson contradicts an existing one, say so explicitly and ask which wins rather than silently adding both.

If the file does not exist, create it with the four category headings and a one-line note at the top saying it is append-only and read by every writing stage.

## Output

After appending, report:

```
## Lessons captured — [piece slug]

**Diff size**: [N] substantive, [N] structural, [N] line-level changes
**Proposed**: [N] · **Confirmed**: [N] · **Rejected**: [N]

### Added to content-lessons.md
- [Category] [rule]

### Rejected, with the author's reason
- [rule] — [reason]

### Noticed but not a lesson
[Substantive additions — material the author supplied that the draft could not have. If there are many, that is a signal the interview was thin, not that the draft was bad. Say so.]
```

That last section matters. A run where most of the diff is the author adding facts and stories means the problem is upstream in the Interview, and no amount of writing rules will fix it.

## Guiding principles

**Rules, not edits.** The test is whether a rule applies to a sentence nobody has written yet.

**Confirmed or not recorded.** No exceptions.

**Append-only.** The log's value is that it accumulates rejections over time. Regenerating it would lose exactly the thing that makes it more accurate than a derived voice guide.

**Say when the problem is upstream.** A thin interview looks like a bad draft. Name it when you see it, instead of writing rules that cannot fix it.

**Name the next step.** When lessons are appended: "Added [N] lessons to `content-lessons.md`. Draft, Personalize, and Polish read this file before they write, so the next piece starts from here. Run this again after your next final edit."
`````

**Verify**: `test -f src/mastra/skills/kessel-run-lessons/SKILL.md` → exit 0
**Verify**: `grep -c "^# Kessel Run — Lessons" src/mastra/skills/kessel-run-lessons/SKILL.md` → `1`
**Verify**: `grep -c "Stage " src/mastra/skills/kessel-run-lessons/SKILL.md` → `0`

### Step 2: Make Polish hand off the final version

In `src/mastra/skills/kessel-run-polish/SKILL.md`, in the block that offers the
next-stage options after a piece is marked ready, add a third bullet after the
Repurpose one:

```
- "Run the lessons loop" — After you have done your own final edit, save it to the run directory as `final.md` and run `kessel-run-lessons`. It compares your version against this one and turns the difference into rules the pipeline follows next time.
```

And in the same skill's closing `**Name what's next.**` paragraph, add a sentence
telling the author to save their edited version as `final.md` when they are done
with it.

**Verify**: `grep -c "final.md" src/mastra/skills/kessel-run-polish/SKILL.md` → `2`

### Step 3: Make the lessons read explicit where it matters

`WORKSPACE_BLOCK` already tells every skill to read `content-lessons.md`. Two
skills need it stated as a constraint rather than an input.

In `src/mastra/skills/kessel-run-draft/SKILL.md`, add to the
`## What you must never do` list:

```
**Never repeat a correction the author already gave.** `<workspace>/content-lessons.md` is a log of rules they have confirmed. Read it before drafting and treat every entry as a hard filter, exactly like a voice anti-pattern. Breaking one is the single fastest way to make the draft feel like it was not worth running the pipeline for.
```

In `src/mastra/skills/kessel-run-personalize/SKILL.md`, add an equivalent line to
its review criteria: passages violating a `content-lessons.md` rule are flagged
the same way generic passages are.

**Verify**: `grep -c "content-lessons.md" src/mastra/skills/kessel-run-draft/SKILL.md` → at least `1`
**Verify**: `grep -c "content-lessons.md" src/mastra/skills/kessel-run-personalize/SKILL.md` → at least `1`

### Step 4: Register it

In `src/mastra/skills/catalog.ts`:

- Add `| 'kessel-run-lessons'` to `KesselRunSkillName`.
- Append to `KESSEL_RUN_SKILLS`:

```ts
  {
    name: 'kessel-run-lessons',
    label: 'Lessons',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Turn your final edits into rules the pipeline follows next time.',
  },
```

In `src/lib/kessel-run/workspace.ts`, add `"kessel-run-lessons": null,` to
`RUN_FILE_BY_SKILL`.

Update the two count assertions in `src/mastra/skills/catalog.test.ts` — read the
current values and move each by one; the standalone count grows, the pipeline
count does not.

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run skills:package` → exit 0, `dist/skills/kessel-run-lessons.skill` exists

### Step 5: Document it

Add a paragraph to `docs/kessel-run-workspace.md` under the `content-lessons.md`
entry: what writes it (`kessel-run-lessons`), that it is append-only and never
regenerated, that entries are confirmed by the author before landing, and that it
is the file to hand-edit when a rule turns out to be wrong — unlike `voice.md`,
which is derived and overwritten.

**Verify**: `grep -c "kessel-run-lessons" docs/kessel-run-workspace.md` → at least `1`

### Step 6: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `npm run skills:package` → exit 0
**Verify**: `git status --porcelain` → only files from the in-scope list

## Test plan

No new test file — the existing suites cover a new skill by construction:

- `skill-package.test.ts` (plan 009) checks frontmatter keys, kebab-case name,
  description length and angle brackets, exactly one `SKILL.md`, and that any
  `references/` path resolves.
- `workspace-block.test.ts` (plan 010) checks the workspace block is verbatim and
  present exactly once, and that the standalone run-file line is there.
- `catalog.test.ts` checks the on-disk directory list matches the catalog and
  that the frontmatter name equals the directory name.

Changed assertions: the two count assertions in `catalog.test.ts`.

Confirm the coverage is real rather than assumed: temporarily change the `name:`
in the new `SKILL.md` to `kessel-run-lesson` (singular), run `npm test`, confirm
`catalog.test.ts` fails on the directory/frontmatter mismatch, then restore it.

Verification: `npm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `npm run skills:package` exits 0 and `dist/skills/kessel-run-lessons.skill` exists
- [ ] `grep -c "Stage " src/mastra/skills/kessel-run-lessons/SKILL.md` → `0`
- [ ] `grep -c "final.md" src/mastra/skills/kessel-run-polish/SKILL.md` → `2`
- [ ] `grep -l "content-lessons.md" src/mastra/skills/kessel-run-draft/SKILL.md src/mastra/skills/kessel-run-personalize/SKILL.md | wc -l` → `2`
- [ ] `git diff --name-only src/lib/kessel-run/workspace.ts` shows only the
      `RUN_FILE_BY_SKILL` addition — `WORKSPACE_BLOCK` is unchanged
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 012 updated

## STOP conditions

Stop and report back (do not improvise) if:

- You changed `WORKSPACE_BLOCK` and `workspace-block.test.ts` now fails across
  every skill. Revert the block; this plan does not need it changed.
- `kessel-run-polish/SKILL.md` has no next-stage options block matching the
  excerpt in "Current state" — plan 007 may have rewritten it further than
  expected. Report what is actually there.
- `skill-package.test.ts` fails on description length. Shorten by cutting trigger
  phrases from the middle and report what you cut; keep the opening "Standalone
  Kessel Run skill:" sentence.
- You are tempted to pre-fill `content-lessons.md` with rules from anywhere. Do
  not — every entry must be confirmed by the author at the moment it is captured.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **The first few runs will feel thin, then compound.** The log is worth more at
  run twenty than at run two. Resist the urge to seed it to make it feel useful
  early — unconfirmed rules are exactly what this design exists to prevent.
- **Seeding is a human step, if wanted.** The existing Previously on Tech voice
  rules (no em dashes, no "X not Y", no agency-speak, blurbs two to five
  sentences) are already a hand-maintained version of this file. Transcribing
  them into `content-lessons.md` is reasonable — but do it by confirming each one
  deliberately, not by bulk paste.
- **Watch the "noticed but not a lesson" section.** If it is consistently large,
  the interview is too thin and the fix is upstream. That section is the pipeline
  reporting on itself.
- **`content-lessons.md` is append-only; `voice.md` is derived.** Hand-edit the
  former, re-run the latter. Getting this backwards loses work.
- **A reviewer should scrutinize**: that the skill refuses to append without
  confirmation, that it stops rather than guessing when `final.md` is missing,
  and that `WORKSPACE_BLOCK` was left alone.
- **Deferred out of this plan**: running the diff automatically when `final.md`
  appears, deduplicating near-identical lessons, and any UI for the log.
