# Portable voice profile contract

Use YAML frontmatter and readable Markdown sections. Human-readable rules are canonical; do not maintain a second hidden JSON rule set. Use real dates, stable IDs, and increment the profile version on revision. This is an illustrative template, not a prefilled voice:

```yaml
---
title: Publication name
id: publication-voice
type: voice-profile
schema_version: 1
version: 1
scope: publication
status: draft
evidence_level: sparse
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [kessel-run, voice-profile]
---
```

Remove the illustrative values when producing a real profile. `status` is `draft` or `approved`; approval needs an explicit user decision. `evidence_level` is `sparse`, `developing`, or `established`, an explained assessment of support rather than a fixed article count. Preference-based profiles can be sparse and approved. Identify the basis (observations, preferences, or both) in Voice Summary.

Author subprofiles use `scope: author` and add stable `author_id`, `parent_profile_id`, and `parent_profile_version`. Include a readable parent link and an **Author Differences** section. Cite that author's evidence for differences. If evidence is missing, keep the author profile provisional with unspecified differences or report its omission; never invent a distinctive voice.

## Body sections

- **Voice Summary** — intended identity/audience/purpose, basis, maturity rationale, and scope.
- **Tone and Rhythm** — supported patterns; unspecified dimensions stay unspecified.
- **Use** — actionable preferred or observed choices, clearly labeled.
- **Avoid** — confirmed constraints versus tentative observations; include discrepancies.
- **Format Variations** — format-specific changes, without promoting them to universal rules.
- **Approved Examples** — approved excerpts or calibration passages with provenance. Label unapproved candidates explicitly as “pending approval,” not approved examples. Keep article quotations short.
- **Confirmed Lessons** — profile-scoped, confirmed reusable edits/preferences and their provenance. Keep existing lessons intact.
- **Sources and Confidence** — source IDs, titles, URL or relative path, author/date if known, full-text versus excerpt coverage, confidence, counterexamples, missing coverage, and sampling balance. Interview answers and approved examples can be sources; distinguish generated calibration from historical prose.
- **Open Questions** — unresolved choices and one small next refinement target.
- **Revision Notes** — date/version, changed rule, reason, supporting source/answer/edit, and approval decision when given.

Every derived rule links to a source ID/link and includes a short example or precise paraphrase. Explicit preferences cite the user answer or confirmed edit. Every cited source ID must resolve to an entry in Sources and Confidence; retain the relevant answer or edit there when no source file exists. When source transcripts or prior versions are files, provide working relative Markdown links so a reader can follow the provenance. Empty sections may say “Not yet established”; do not fill gaps with conventional genre assumptions. Preserve disagreements and exceptions rather than manufacturing certainty.

## Files and revision

Use the bundled [workspace contract](workspace.md) for publication assignments, piece/output selections, and handoffs. A pinned version must link to an actual retained profile snapshot or delimited historical version; revision notes alone cannot reconstruct it. Each author subprofile links the exact parent version it was derived against.

Use standard Markdown links with encoded spaces and relative paths where possible. No Obsidian plugins, wikilinks, Dataview, or absolute vault paths are required.

For a new hierarchy, choose a profile root (typically `Voice Profiles/` beneath the workspace settings folder), then use these paths relative to that root:

```text
<Publication>/Publication.md
<Publication>/Authors/<Author>.md
```

In an existing vault, the root may be `Meta/Kessel Run/Voice Profiles/`. Inspect for existing notes first, including older flat `<Profile Name>.md` paths. Reuse existing paths and IDs rather than duplicating or migrating profiles implicitly. Outside a vault use the provided workspace destination or ask for it if needed to save. Never put personal content inside installed skill directories, which may be replaced during upgrades. Without file access, return the full Markdown and suggested relative filename without claiming it was saved.

Before revising, read the complete existing profile and its version/append convention. Preserve approved content and confirmed lessons. Show changes as proposals until confirmed; retain the approved original using the workspace convention or, if none exists, an explicitly labeled proposed revision beside the unchanged original. Explicitly requested changes may be recorded directly with provenance. Approval applies only to what was approved: a proposed version stays draft, even when its parent version was approved. Link or retain the prior version so approved material remains recoverable. Do not change a publication's default profile assignment as a side effect.
