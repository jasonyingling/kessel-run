# Kessel Run writing skills

Kessel Run has **15 skills: eight numbered stages (0–7) and seven standalone skills**. The numbers describe writing methods, not a required sequence. Start from your selected publication voice and available material; use only the stages the piece needs.

The maintained skill folders are in [src/mastra/skills](../../src/mastra/skills/). Each contains `SKILL.md` and bundled references. Keep the folder together when copying it to a compatible skill environment. These instructions do not install a filesystem or browsing connector in ChatGPT; delivery and runtime access must be verified separately.

## Start or resume

Use [Start / Resume](../../src/mastra/skills/kessel-run-start/SKILL.md) when beginning a piece or continuing saved work. It locates the Brief, selected output, pinned publication and author voice versions, needed sources and next action. It asks only for unresolved choices. You can also invoke a specific writing skill directly.

For an ordinary Markdown folder:

> Use kessel-run-start with workspace `/path/to/writing`. Resume the selected article in `Pieces/View From The Pine/Season opener/Brief.md`.

For an existing Obsidian vault:

> Use kessel-run-start with the home note `/path/to/vault/Kessel Run.md`. Continue my Previously on Tech piece in `10 - Projects/Previously on Tech/0042 - Topic/Brief.md`.

Paths above are examples; supply your actual folder or home note. Existing layouts win, including flat drafts and issue numbering. `Issue.md` is never modified. See [workspace setup](../kessel-run-workspace.md) for readable publication notes, profile snapshots and independent outputs.

## Choose the writing mode

**Guided** is the default: draft a meaningful section, receive your edits or approval, then continue. Already approved sections are not reopened automatically. Short posts can be one section.

**Fast** produces a complete coherent draft from adequate supplied material, without section approval stops. Missing facts stay visible; fast does not mean accepted or fact-verified.

> Draft a 600-word review for The Greatest Ever Reviews in fast mode using its selected profile and these product/testing notes. I have not used the product myself.

Notes, attributed research and testing records are valid sources. An Interview is optional when they supply enough material. A confident review voice never turns another person's testing into first-person experience.

## Voices can start sparse

[Voice](../../src/mastra/skills/kessel-run-voice/SKILL.md) can establish writing preferences through an interview before any archive exists. An approved sparse profile is usable. Publication and author profiles are separate: an author's differences refer to a pinned parent profile version. Existing output selections remain stable as profiles evolve.

> Start a short piece for The Greatest Ever Reviews using its approved sparse profile and these notes. No author subprofile for this output.

Your publications can be Previously on Tech, View From The Pine and The Greatest Ever Reviews, each with independent voice choices. Names do not imply styles. Speaking style, topic facts and one-piece corrections do not automatically become profile rules.

## Pick the useful method

| Stage | Skill | Purpose |
| --- | --- | --- |
| 0 | Research | Gather evidence or explore a topic to the needed depth |
| 1 | Anchor | Clarify topic, audience and outcome |
| 2 | Ideation | Develop substance and supporting points |
| 3 | Hook | Write a supported opening and bridge |
| 4 | Architecture | Organize the piece proportionately |
| 5 | Draft | Guided sections or complete fast prose |
| 6 | Personalize | Align the selected publication/author voice |
| 7 | Polish | Editorial review, targeted fixes and separate scorecard |
| Standalone | Start / Resume | Load context and choose the next useful action |
| Standalone | Voice | Create or refine a publication/author profile |
| Standalone | [Lessons](../kessel-run-lessons.md) | Confirm scoped voice improvements from accepted edits |
| Standalone | Interview | Gather missing material verbatim |
| Standalone | Review | Audit existing content for freshness |
| Standalone | Repurpose | Make independent renditions |
| Standalone | Analyze | Learn from supplied performance evidence |

A short sourced post may go directly from Brief to Draft and Polish. A longer developing argument may benefit from Interview, Ideation and Architecture. Research has no minimum source quota and never simulates retrieval when tools are absent.

## More than one output

> Repurpose this article into a newsletter item and a short social post in fast mode. Keep the same publication voice for the newsletter; use the explicitly selected View From The Pine profile for the social output.

Each rendition gets its own profile/version selection, draft, status and revision history. Repurposing preserves the original and reuses supported evidence, not unsupported claims. A different format need not mean a different publication. Changing Brief defaults does not retarget existing outputs.

## Without filesystem access

Provide the relevant profile rules, source notes and current draft as attachments or conversation text. Ask:

> Resume from this Kessel Run handoff in guided mode. Continue the pending section; retain the saved voice and author versions.

The handoff includes actual rules, sources/provenance, selections, current prose, decisions, gaps and next action so it remains useful without the original links. Skills must not claim files were saved. The current app uses only matching existing memory fields; unsupported workspace state remains in conversation/handoff.

See the [quick reference](QUICK-REFERENCE.md) and [implementation validation evidence](../kessel-run-writing-flow.md). Editorial acceptance, factual verification, and publication are separate decisions.
