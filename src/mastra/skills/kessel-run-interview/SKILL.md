---
name: kessel-run-interview
description: "Interview an author for missing substantive material and capture answers verbatim. Use to develop source notes for a piece; voice-profile setup is handled separately and existing notes may make an interview unnecessary."
---

# Kessel Run — Interview

Ask questions that surface useful source material for the selected piece. Interview answers support claims and attributed opinions; they do not automatically define its writing voice.

## Workspace context

Before starting, read [the shared workspace contract](references/workspace.md) to locate the selected publication, exact voice versions, output and sources, preserve existing notes, and provide a resumable handoff when files are unavailable.

Use the output's selected publication voice and optional author overlay at their pinned versions; keep parent editorial requirements distinct from author differences. Approved sparse profiles or explicit supplied preferences are sufficient. Do not default to the account owner's voice. Ask only for unresolved choices after reading accessible state. Preserve human edits, exact machine drafts and accepted finals as described in the workspace contract.

Use the Brief/output's mode: guided by default, fast when requested. Reuse supplied work and skip unnecessary stages; numbered stages describe available methods, not mandatory gates. All factual and personal claims, including hooks, transitions and endings, need source support from interviews, notes, testing records or attributed research. Profile examples supply style, not new facts. Claim-free connective language is allowed. Use specific placeholders for missing facts and report gaps without blocking supported writing. A confident voice never licenses invented use, tests, results or certainty, or attributing an unexpressed opinion to the author. Supported editorial analysis and provisional recommendations may be proposed with reasoning; label inference rather than presenting it as observed fact. Keep scorecards outside prose; acceptance is not fact verification or publishing authorization.

## Prepare only what is missing

Read the topic, selected publication, output format, brief and relevant existing material. Ask only for missing choices. Existing research, testing notes or user notes may be sufficient: do not require an interview before drafting. If the task is designing a sparse writing voice rather than gathering piece material, use Voice if available or ask explicitly about intended writing preferences.

Offer dictation as an option, not a requirement: spoken or typed answers are equally valid. Explain that you will retain answers verbatim. Never infer a writing style from rambling, filler or transcription artifacts.

## Adaptive panel

Use these perspectives when helpful; label the perspective naturally if it clarifies the question:

| Perspective | Material to uncover |
| --- | --- |
| Practitioner | What happened, how something was used or tested, concrete results |
| Skeptic | Evidence, limitations, uncertainty and defensible objections |
| Historian | Relevant context, prior approach and chronology |
| Human | A real scene, reaction or consequence when pertinent |
| Editor | Intended point, audience needs and what remains unsaid |

Ask one question, wait, and derive follow-ups from the actual answer. Do not supply the answer, invent a memory, or lead the author toward a stronger claim than they hold. Short answers may be sufficient; ask for specificity only where it serves the piece. Preserve disagreements and uncertainty. Do not draft prose during a requested interview.

## Sufficiency and stopping

Use the format and purpose to decide what is enough. A product review may need actual observations, test conditions and limitations; a short sourced update may need no personal story. There is no mandatory story count, contrarian position or exchange count. Stop when the intended point and necessary support are available, the author asks to stop, or remaining gaps should be recorded for later. Summarize material coverage without converting it into invented answers.

## Save the source record

Resolve `Interview.md` from the selected workspace and piece. Keep existing numbering and layout, never modify `Issue.md`, and append a dated session if an Interview already contains material. Follow workspace metadata and relative link conventions.

After the author authorizes saving (including an existing request to capture/save the interview), save or return:

```markdown
---
title: Interview — Piece title
type: interview
id: stable-interview-id
schema_version: 1
publication_id: selected-publication-id
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [kessel-run, writing, interview]
---
# Interview — Piece title
[Publication](relative%20publication%20path.md)
Format: selected format
Topic: selected topic

## Session — date
### 1. Perspective — exact question
[Exact answer, including corrections and transcription artifacts.]

## Material inventory
- Supported point: [answer/exchange reference]
- Observations, opinions and limitations: [separate and attribute]
- Related sources: [links to notes/research actually used]
- Still missing: [specific unresolved material]
```

Do not correct, reorder, paraphrase or merge answers. Keep inventory prose distinct from the verbatim transcript. With no files return the full transcript and resumable handoff without claiming persistence. Name the next useful action based on what is ready, such as Draft from these answers plus supplied research, rather than treating the transcript as the exclusive source for every future claim.
