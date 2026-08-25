# Plan 014: Get the Interview skill running in the Obsidian vault today

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> ```
> git diff --stat 490545a..HEAD -- src/mastra/skills package.json
> ```
> On a mismatch against the "Current state" excerpts, treat it as a STOP
> condition.

## Status

- **Priority**: P0 — this is the one that unblocks using the thing
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. Deliberately carved to need nothing else.
- **Category**: direction
- **Planned at**: commit `490545a`, 2026-08-25

## Why this matters

The point of the whole Interview redesign is to talk a topic out and have the
specifics land somewhere the draft can be built from. Everything else planned
around it — the stage renumber, the transcript field in the app's schema, the
packaging build, the workspace convention, the lessons loop — is infrastructure
that makes the pipeline better later. None of it is required to run an interview
tonight.

This plan ships exactly one thing: the Interview skill, installed into the
Obsidian vault as a project-scoped Claude Code skill, writing its transcript into
the vault beside the piece it belongs to. It registers as a **standalone** skill
so it needs no stage renumber, no schema change, and no test churn beyond two
count assertions.

Plan 007 later promotes it to Stage 2 and does the renumber. Nothing here
conflicts with that.

## Current state

### The vault is already a Claude Code project

`/Users/miniying/The Rock/` is an Obsidian vault and a Claude Code project:

```
/Users/miniying/The Rock/
├── CLAUDE.md                          vault agent rules — read by Claude Code
├── .claude/skills/triage-clippings/   an existing, working project-scoped skill
├── 00 - Daily Notes/
├── 01 - Inbox/
├── 10 - Projects/
│   ├── HLK/
│   ├── Previously on Tech/
│   │   ├── 0000 - Link Bank/
│   │   ├── 0013 - Coding Interlude/Issue.md
│   │   └── …47 entries total
│   └── …
├── 40 - Ideas/Content Ideas/
├── Meta/
└── Templates/
```

A skill directory placed in `.claude/skills/` is picked up by Claude Code running
in that directory. That is the whole install mechanism — no `.skill` packaging
and no account upload is needed for the vault workflow.

### The vault rules the skill must obey

From `/Users/miniying/The Rock/CLAUDE.md`, verbatim and load-bearing:

```
2. Never hesitate to create a note — a stub with correct frontmatter in the right folder is better than nothing.
4. Consistent frontmatter is non-negotiable. Every note gets at least: title, type, created, updated, tags.
```

```
- **Daily notes:** YYYY-MM-DD.md format. No exceptions.
- Use spaces in filenames, not hyphens or underscores.
```

```
## What Agents Must Never Do

- Don't modify Previously on Tech issue files without explicit instruction.
- Don't change existing ratings on any media note.
- Don't delete notes from the vault. Ever. Move to 60 - Archives/ instead.
- Don't overwrite substantial content in an existing note. Append, don't replace.
- Don't create duplicate notes. Always check if a note already exists before creating one.
```

Tag conventions are lowercase and hyphenated; `content`, `writing`, and
`newsletter` are already core tags.

Note: `Issue.md` files in Previously on Tech carry **no frontmatter** — they open
straight into prose. The frontmatter rule applies to notes an agent creates, not
to those hand-written issues, which are off limits regardless.

### The existing skill's frontmatter style

`/Users/miniying/The Rock/.claude/skills/triage-clippings/SKILL.md:1-4`:

```
---
name: triage-clippings
description: Weekly clippings triage for this Obsidian vault. Sorts everything in `Clippings/` into Article, Resource, Wiki-linked Article, or Archive-only; …
---
```

Note the description is **unquoted** there, while every Kessel Run skill uses a
double-quoted description. Both parse. Keep the Kessel Run convention for
consistency within its own family.

### The catalog, which the new skill must register in

`src/mastra/skills/catalog.ts` — a standalone entry looks like this:

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

`src/mastra/skills/catalog.test.ts` asserts counts that will move by one:

```ts
  it("has 11 skills", () => {
    expect(KESSEL_RUN_SKILLS).toHaveLength(11);
  });

  it("splits into 8 pipeline stages and 3 standalone skills", () => {
    expect(PIPELINE_SKILLS).toHaveLength(8);
    expect(STANDALONE_SKILLS).toHaveLength(3);
  });
```

It also asserts `skillDirs` equals the catalog names, so **adding the directory
without adding the catalog entry breaks the test suite.** Registering as
standalone (`stage: null`) is what keeps this plan free of the renumber.

### Repo conventions to match

- `src/mastra/` — single quotes, semicolons. `catalog.test.ts` — double quotes,
  semicolons.
- Standalone skills head with `# Kessel Run — <Label>` and **no** stage number,
  and open their description with `"Standalone Kessel Run skill: …"`.
- Skill descriptions must stay under 1024 characters and contain no `<` or `>`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |
| Install to vault | `npm run skills:install` | exit 0, copies the skill |

**Run `npm install` first** — a `node_modules` predating `87fa9fd` has no
`vitest`. `npm run build` logs a DuckDB lock error; known, pre-existing,
non-fatal, out of scope.

## Scope

**In scope**:

- `src/mastra/skills/kessel-run-interview/SKILL.md` (create)
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts` (two count assertions)
- `scripts/install-skills-to-vault.sh` (create)
- `package.json` (one script entry)
- `docs/kessel-run-vault.md` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- **Anything inside `/Users/miniying/The Rock/`.** The install script exists so
  the *user* runs it against their own vault. An executor must never write into
  the vault — not the skill, not `CLAUDE.md`, not a note. Step 5 is a user step
  and is labelled as such.
- The stage renumber, `projectStateSchema`, `STAGE_ARTIFACT_FIELD`, and the
  agent instructions. All of that is plan 007. This skill is standalone for now.
- Every other `SKILL.md`, including Draft. Constraining Draft to the transcript
  is plan 007; this plan gets the transcript made first.
- `.skill` packaging and the upload path — plan 009. Not needed for the vault.
- `src/components/`, `src/app/`, `src/lib/`.
- The weather demo and `/chat`.

## Git workflow

- Branch: `advisor/014-interview-skill-into-vault`
- Commit per step. Message style from `git log`: short imperative sentence.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the Interview skill

Create `src/mastra/skills/kessel-run-interview/SKILL.md` with exactly the content
between the fence markers. Copy verbatim — do not summarize or reword.

`````markdown
---
name: kessel-run-interview
description: "Standalone Kessel Run skill: interviews the author about a topic with a rotating panel of interviewer personas and captures their answers as a verbatim transcript. Use this skill when the author wants to get their thinking out of their head about something they plan to write, before any drafting happens. Also trigger when the user says things like 'interview me,' 'ask me questions about this,' 'let me talk this through,' 'I want to get my thoughts out,' 'record my thinking on this,' or 'I'm ready to answer questions.' Produces an Interview note that later stages build the piece from. Works best with dictation."
---

# Kessel Run — Interview

You are interviewing the author about a piece they are going to write. Your job is to ask questions good enough that their answers become the raw material for the entire piece.

This is the load-bearing stage. Everything after it is shaping. If the interview is thin, the piece will be generic no matter how good the later stages are — and the fix is a better interview, not a better prompt.

## The rule that makes this work

The transcript you produce is the **source of record** for the piece. Later stages are constrained to it: every claim, story, number, opinion, and judgement in the finished piece has to trace back to something the author said here. Nothing gets invented downstream.

That means the interview has to surface the material, because nothing else will. If the author does not say it here, it does not go in the piece.

## Voice first

Say this before the first question:

> "This works best spoken. Use dictation and just talk — ramble, backtrack, go on tangents. I'm not going to clean any of it up, and the messy parts are usually the best material. One question at a time, and I'll build the next one off what you say."

Spoken answers are longer, more specific, and more idiomatic than typed ones. Typed answers to good questions come out short, tidy, and pre-edited, which is the same thing as pre-generified. Encourage talking every time an answer comes back short and clipped.

Never present a list of questions to work through. One question, wait, respond to what they actually said.

## Where this writes

This skill is built for an Obsidian vault that is also a Claude Code project. Read the vault's `CLAUDE.md` before writing anything — its rules override anything here.

**Ask which publication the piece is for**, then place the interview note:

- **Previously on Tech** → `10 - Projects/Previously on Tech/<NNNN - Title>/Interview.md`, in the folder for the issue this is for. If the issue folder does not exist yet, ask for the next issue number and title, and create the folder. **Never modify an existing `Issue.md`** — you create `Interview.md` alongside it, nothing else.
- **Any other publication** → `10 - Projects/<Publication>/<Piece Title>/Interview.md`. Create the folders if they do not exist.
- If the author does not know yet, ask. Do not default silently.

Vault rules that apply to the note you create:

- Filenames use spaces and title case. Not hyphens, not underscores.
- Every created note gets frontmatter with at least `title`, `type`, `created`, `updated`, `tags`.
- Tags are lowercase and hyphenated. Use `content`, `writing`, `kessel-run`, plus the publication's own tag where one fits (`newsletter` for Previously on Tech).
- Add `[[wikilinks]]` to the publication project note and to any people, projects, or tools named in the answers.
- Never delete a note. Never overwrite substantial content in an existing one — if `Interview.md` already exists, append a new dated session rather than replacing it.

Before writing, check whether the note already exists.

**If this session has no filesystem access** — you are in the Claude app rather than Claude Code — say so once, conduct the interview normally, and hand back the finished transcript as a message the author can paste into the vault themselves. Do not stop, and do not pretend to have written a file.

## What you need before starting

The topic, the publication, and the format. If a research brief or a content idea note already exists in the vault for this topic, read it first so your questions can name specifics and ask the author to react.

You do not need a full anchor. If the author arrives with a rough topic, spend one exchange sharpening it, then start asking.

## The panel

You are not one interviewer. You rotate through five, named out loud, each of which extracts a different kind of material. Announce which one is asking — it tells the author what kind of answer is wanted, and it stops the interview from settling into a single register.

| Persona | Extracts | Signature question shape |
| --- | --- | --- |
| **The Practitioner** | Concrete engagement detail | "Give me the specific project where this bit you. What actually broke?" |
| **The Skeptic** | A defended position | "Someone competent thinks the opposite. Why are they wrong?" |
| **The Historian** | Contrast and before-state | "What were you doing before this? What did it cost you?" |
| **The Human** | Moment, texture, feeling | "Where in this did you think it wasn't going to work?" |
| **The Editor** | The unsaid thesis | "You've said three things. What's the one underneath them?" |

Open with The Practitioner or The Skeptic — both force a concrete answer immediately and set the register for everything after. Close with The Editor, whose job is to make the author state the thesis in their own words rather than having one assigned to them later.

Do not run the personas in a fixed rotation. Pick whichever one wants to ask next based on what the last answer left open.

## Rules of the interview

- **One question per turn. Never batch.** Two questions in one message gets you two half-answers.
- **Every follow-up derives from the previous answer**, not from a script. This is the whole difference between an interview and a questionnaire. Quote back the phrase you are pulling on.
- **Any answer under about 30 words gets one follow-up demanding specificity** before you move on. "When was this? What was the number? Who else was in the room? What did you do next?"
- **Push for numbers, names, dates, and project references.** Not "it took a while" but "how long, actually?" Not "the client" but "which one, and what were they trying to do?"
- **Chase the tangents.** If the author wanders into something unexpected, follow it for at least one question before steering back. Tangents are where the non-obvious material lives.
- **Never answer your own question.** Do not offer a menu of possible answers, and do not suggest what they might mean. That imports your framing into what is supposed to be their material.
- **Do not evaluate the answers.** No "great point," no summarizing back what they meant. Acknowledge in a few words and ask the next thing.
- **Do not draft.** No prose, no phrasing suggestions, no "you could open with."

## When to stop

Continue until you have all four of these, in the author's own words:

1. A **defended thesis** — something they believe, stated as a position, with a reason.
2. **At least two concrete stories** with real detail — a project, a moment, what happened, what it cost.
3. **One counterargument they have answered** — a smart objection, and their response to it.
4. **One thing they believe that most of their audience does not.**

Target 6–10 exchanges for an article or newsletter, 4–6 for a LinkedIn post or thread. If you hit the exchange target without all four, say which one is missing and ask for it directly.

When you have all four, say so and stop: "I've got a thesis, two stories, the counterargument, and the contrarian bit. That's enough to build from — anything else you want on the record before I write this up?"

## Output: the Interview note

Write this to the path chosen above, after the author confirms.

```
---
title: Interview — [Piece Title]
type: interview
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
tags: [content, writing, kessel-run]
---

# Interview — [Piece Title]

**Publication**: [[Publication project note]]
**Format**: [article | newsletter | linkedin post | thread]
**Topic**: [one sentence]
**Exchanges**: [count]

---

## 1. [Persona] — [the question you asked, verbatim]

[The author's answer, verbatim]

## 2. [Persona] — [the question, verbatim]

[The author's answer, verbatim]

[repeat for every exchange]

---

## Material inventory

- **Thesis (their words)**: "[direct quote]"
- **Stories**: [one line each, with the exchange number]
- **Counterargument answered**: [one line, with exchange number]
- **Contrarian position**: [one line, with exchange number]
- **Numbers, names, dates given**: [list, with exchange numbers]
- **Still missing**: [anything the panel wanted and did not get]
```

### The verbatim rule

Reproduce the author's answers **exactly as they said them**. Do not:

- fix grammar, punctuation, or speech-to-text artifacts
- remove filler, false starts, repetitions, or self-corrections
- tidy a rambling answer into a tighter one
- merge two answers, reorder them, or paraphrase

The rawness is the point. Those artifacts are what the draft mines for voice, and a cleaned-up transcript is already one generation of averaging away from how the author actually talks. The only text you author in this note is the questions, the frontmatter, and the material inventory.

## Guiding principles

**The interview is the product.** Everything downstream is reorganization. Time spent here is worth more than time spent anywhere else in the pipeline.

**Specificity is the entire defense against generic output.** Every general claim has a specific instance behind it. Your job is to get the instance, not the claim.

**Silence is a question too.** If an answer trails off somewhere interesting, ask what came next rather than moving on.

**Never invent.** You ask; they answer. If the transcript is thin in some area, mark it in "Still missing" — never fill it in yourself, and never write an answer the author did not give.

**Name the next step.** When the note is written: "Transcript's at `[path]`. That's the source of record — the draft gets built from your words in there, not from scratch. Next up is organizing it into a thesis and key points."
`````

**Verify**: `grep -c "^# Kessel Run — Interview" src/mastra/skills/kessel-run-interview/SKILL.md` → `1`
**Verify**: `grep -c "Stage " src/mastra/skills/kessel-run-interview/SKILL.md` → `0`
**Verify** the description is within limits:
```
python3 -c "
import re,sys
b=open('src/mastra/skills/kessel-run-interview/SKILL.md').read()
d=re.search(r'^description:\s*\"(.*)\"$', b, re.M).group(1)
print(len(d), '<' in d or '>' in d)"
```
→ a number below `1024` and `False`

### Step 2: Register it as a standalone skill

In `src/mastra/skills/catalog.ts`:

- Add `| 'kessel-run-interview'` to `KesselRunSkillName`, after `'kessel-run-anchor'`.
- Append to `KESSEL_RUN_SKILLS`, after the `kessel-run-analyze` entry (standalone
  entries sit at the end):

```ts
  {
    name: 'kessel-run-interview',
    label: 'Interview',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Answer a panel of interviewers out loud; capture it verbatim.',
  },
```

`stage: null` is deliberate. It keeps this plan free of the renumber; plan 007
changes it to `stage: 2` and shifts the rest.

**Verify**: `npm run typecheck` → exit 0, no output

### Step 3: Update the two count assertions

In `src/mastra/skills/catalog.test.ts`:

- `it("has 11 skills")` → `it("has 12 skills")`, `toHaveLength(12)`
- `it("splits into 8 pipeline stages and 3 standalone skills")` →
  `"…and 4 standalone skills"`, `STANDALONE_SKILLS` `toHaveLength(4)`.
  `PIPELINE_SKILLS` stays at 8 and the `0..7` stage-sequence assertion is
  unchanged.

**Verify**: `npm test` → exit 0, all pass

### Step 4: Add the vault install script

Create `scripts/install-skills-to-vault.sh`:

```bash
#!/usr/bin/env bash
# Copy Kessel Run skills into an Obsidian vault's project-scoped skill directory,
# where Claude Code running in that vault picks them up.
#
# Usage:  KESSEL_RUN_VAULT="/path/to/vault" npm run skills:install [skill-name ...]
#
# With no skill names, installs every kessel-run-* skill. Copies only — it never
# deletes anything in the vault, because vault rules forbid agents deleting notes
# and the same caution is worth applying to a script.
set -euo pipefail

SKILLS_DIR="src/mastra/skills"

if [ -z "${KESSEL_RUN_VAULT:-}" ]; then
  echo "error: set KESSEL_RUN_VAULT to your vault path, e.g." >&2
  echo "  KESSEL_RUN_VAULT=\"\$HOME/The Rock\" npm run skills:install" >&2
  exit 1
fi

if [ ! -f "$KESSEL_RUN_VAULT/CLAUDE.md" ]; then
  echo "error: $KESSEL_RUN_VAULT does not look like a Claude Code project (no CLAUDE.md)" >&2
  exit 1
fi

DEST="$KESSEL_RUN_VAULT/.claude/skills"
mkdir -p "$DEST"

if [ "$#" -gt 0 ]; then
  names=("$@")
else
  names=()
  for dir in "$SKILLS_DIR"/kessel-run-*/; do
    names+=("$(basename "$dir")")
  done
fi

for name in "${names[@]}"; do
  src="$SKILLS_DIR/$name"
  [ -f "$src/SKILL.md" ] || { echo "error: no such skill: $name" >&2; exit 1; }
  rm -rf "$DEST/$name.incoming"
  cp -R "$src" "$DEST/$name.incoming"
  rm -rf "$DEST/$name"
  mv "$DEST/$name.incoming" "$DEST/$name"
  echo "installed $name -> $DEST/$name"
done

echo
echo "Done. Open Claude Code in $KESSEL_RUN_VAULT and the skills are live."
```

Make it executable: `chmod +x scripts/install-skills-to-vault.sh`

Add to `package.json`, after `"test:watch"`:

```json
    "skills:install": "bash scripts/install-skills-to-vault.sh"
```

**Verify**: `npm run skills:install` with no `KESSEL_RUN_VAULT` set → exits 1 with
the usage message
**Verify** against a scratch directory rather than the real vault:
```
mkdir -p /tmp/fake-vault && touch /tmp/fake-vault/CLAUDE.md
KESSEL_RUN_VAULT=/tmp/fake-vault npm run skills:install kessel-run-interview
test -f "/tmp/fake-vault/.claude/skills/kessel-run-interview/SKILL.md" && echo OK
```
→ prints `OK`. Then `rm -rf /tmp/fake-vault`.

**Do not run it against `/Users/miniying/The Rock`.** That is step 5, and it
belongs to the user.

### Step 5: Hand off to the user (NOT an executor step)

**Executors: skip this step and say so in your report.** It writes into the
user's vault, which is theirs to run.

The user runs:

```bash
KESSEL_RUN_VAULT="$HOME/The Rock" npm run skills:install kessel-run-interview
```

Then opens Claude Code in the vault and says "interview me about X".

Optionally, they add a line to the vault's `CLAUDE.md` under a new
`## Content Pipeline` heading, matching how `triage-clippings` is described
there:

```markdown
## Content Pipeline

Kessel Run content skills live in `.claude/skills/kessel-run-*`. When the user
wants to talk through a piece before writing it, invoke `kessel-run-interview` —
it runs a panel interview and writes a verbatim `Interview.md` beside the piece
in `10 - Projects/<Publication>/`. Dictation is the intended input.
```

### Step 6: Document the vault mapping

Create `docs/kessel-run-vault.md` recording: that the vault is the workspace for
the skills-only workflow; the install command and that skills are project-scoped
under `.claude/skills/`; where each artifact type lands
(`10 - Projects/<Publication>/<Piece>/` for run artifacts, `Meta/Kessel Run/` for
personal parameters once plan 010 lands, `40 - Ideas/Content Ideas/` for Oracle
spikes); the vault rules Kessel Run skills must honor (frontmatter, spaces in
filenames, never modify `Issue.md`, never delete, append don't replace); and that
`src/mastra/skills/` remains the source of truth — the vault copies are installs,
not originals, so edits there are overwritten by the next install.

**Verify**: `test -f docs/kessel-run-vault.md` → exit 0

### Step 7: Full verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `git status --porcelain` → only files from the in-scope list
**Verify**: `git diff --name-only | grep -c "The Rock"` → `0`

## Test plan

No new test file. `catalog.test.ts` already covers a new skill by construction —
it asserts the on-disk directory list equals the catalog names and that each
directory name matches its frontmatter `name`. Two count assertions change.

Confirm that coverage is real rather than assumed: temporarily rename the new
directory to `kessel-run-interviews` (plural), run `npm test`, confirm
`catalog.test.ts` fails on `lists exactly the skills present on disk`, then
rename it back.

Verification: `npm test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `grep -c "Stage " src/mastra/skills/kessel-run-interview/SKILL.md` → `0`
- [ ] The description-length check in step 1 prints a number under 1024 and `False`
- [ ] `npm run skills:install` with no `KESSEL_RUN_VAULT` exits 1
- [ ] The `/tmp/fake-vault` install check in step 4 prints `OK`
- [ ] Nothing under `/Users/miniying/The Rock/` was modified
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 014 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/mastra/skills/kessel-run-interview/` already exists. Plan 007 may have
  landed first, in which case this plan is redundant — report it rather than
  overwriting a Stage 2 version with a standalone one.
- The catalog counts in `catalog.test.ts` are not 11 and 8/3. Read the actual
  values, move each by one, and report what you found.
- The description-length check fails. Cut trigger phrases from the middle of the
  description, keep the opening "Standalone Kessel Run skill:" sentence, and
  report what you cut.
- You are about to write anything into `/Users/miniying/The Rock/`. Do not. That
  is step 5 and it belongs to the user.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **This skill is standalone on purpose, and temporarily.** Plan 007 promotes it
  to Stage 2 and renumbers Ideation through Polish. When 007 runs, its step 5
  should change this entry's `stage: null` to `stage: 2` rather than adding a
  second entry, and its catalog-test edits start from 12 skills and 4 standalone
  rather than 11 and 3.
- **The vault copy is an install, not an original.** Editing
  `.claude/skills/kessel-run-interview/SKILL.md` in the vault works until the next
  `npm run skills:install` overwrites it. Tweak in the repo, reinstall. That will
  be tempting to forget in the first week of iterating on the questions.
- **Two surfaces for the interview.** In Claude Code in the vault it writes the
  note; in the Claude app on a phone it takes the no-filesystem branch and hands
  back the transcript to paste. The second path is why that fallback paragraph
  exists — do not trim it as boilerplate.
- **A reviewer should scrutinize**: that nothing in the vault was touched, that
  the skill never instructs an agent to modify an existing `Issue.md`, and that
  the verbatim rule survived copying intact.
- **Deferred out of this plan**: the transcript constraint on Draft (plan 007),
  the workspace convention for the other personal-parameter files (plan 010), and
  `.skill` packaging for use outside the vault (plan 009).
