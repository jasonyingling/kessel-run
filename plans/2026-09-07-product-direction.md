# Agreed direction: validate the skills, then build the publication workspace

> **Sequence updated 2026-10-13:** The user now wants to validate writing inside
> the app. Their latest decision uses an API key for in-app AI and MCP for users
> working through their own agents; Sign in with ChatGPT is deferred.
> [Plan 017](017-app-api-keys-and-mcp.md) supersedes this document's blanket
> deferral of app implementation. The publication/voice/output model and editorial
> quality requirements below still apply. A successful starter voice profile is
> confirmed by the user; full drafting/lessons/resume validation is still pending.
> Hosted SaaS and publishing remain later work.

Recorded 2026-09-07 from the user's clarification. This supersedes the September 6 recommendation to prioritize ChatGPT packaging and develop SaaS foundations alongside skill work. It records product direction; it is not an executor-ready implementation plan.

## Decisions

- Refine the content skills first and validate the resulting content through actual use.
- The Obsidian vault is an acceptable workspace for the personal skill workflow. Preserve its existing note and publication protections. A new storage service is not a prerequisite for validation.
- ChatGPT remains a desired skill surface. Verify its access to supplied material separately; do not assume a ChatGPT session can read the local vault. Broader distribution packaging should not block trying the improved method in a working environment.
- Build the SaaS after the user is satisfied that the workflow produces good content.
- The SaaS should provide a polished UI for managing multiple publications and their various outputs. Buffer is a design reference.
- Content format and audience remain user-defined. Customer targeting remains deferred.
- The writing target is the selected **voice profile**, not the account owner’s personal voice. The publications are **Previously on Tech**, **View From The Pine** (sports blog), and **The Greatest Ever Reviews**. Their voice characteristics must be supplied or approved, not inferred from the category alone.

## Markdown workspace: human and bot readability

Confirmed requirement: the workspace must be easy for a person to review in Obsidian and for a bot to navigate, and must also work as ordinary Markdown files without Obsidian. Obsidian provides a convenient editor and navigation layer; it is not a runtime dependency.

Use a small `Kessel Run.md` home note with standard relative Markdown links to each publication, its voice profile, and output presets. Keep prose and examples in the note body; use YAML frontmatter for a small set of machine-readable fields. Preserve the vault's required `title`, `type`, `created`, `updated`, and `tags`; add stable `id`, `schema_version`, and relationship IDs where applicable. Profile notes also have a version and draft/approved status. Stable IDs survive note renames; readable links help people navigate. Validate that links resolve and IDs are unique when implementing.

Proposed settings layout inside the existing vault:

```text
Meta/Kessel Run/
  Kessel Run.md
  Publications/
    Previously on Tech.md
    View From The Pine.md
    The Greatest Ever Reviews.md
  Voice Profiles/
    Previously on Tech.md
    View From The Pine.md
    The Greatest Ever Reviews.md
  Output Presets/
    Newsletter.md
    Blog Article.md
    Review.md
```

The three initial voice-profile names match the publications for easy navigation; the profile relationship remains explicit so profiles can later be shared or overridden. Their actual voice rules are not known merely from their names and must be authored or derived and approved. Output presets above are proposed starting examples, not asserted publication requirements.

Each publication note summarizes purpose/audience and links to its default profile and supported presets. Each profile uses consistent headings: Voice Summary, Tone and Rhythm, Use, Avoid, Approved Examples, and Confirmed Lessons. Keep examples linked to their source notes and show dated lesson additions. Avoid a separate human summary and machine rules file that can contradict each other: readable Markdown is the canonical content.

Pieces remain under `10 - Projects/<Publication>/<Piece>/` in the vault. Each `Brief.md` records the publication/profile/preset IDs and selected profile version, alongside readable links and the editorial brief. Existing Previously on Tech `Issue.md` files remain protected. Skills should find existing notes before creating any of this layout; do not create duplicate publication records merely because paths differ.

Outside Obsidian, the same note structure can live under an ordinary workspace folder. Workspace setup supplies the settings and pieces roots; the skills must not hardcode a user's absolute path or require PARA folder names. Resolve relative links from the containing note and use ordinary Markdown links as the portable baseline (encode spaces in link destinations). Wikilinks may be an optional vault convenience but must not be the only way to resolve a required reference. No Dataview query, Obsidian plugin, hidden application state, or database is required to understand or use the files.

Bots should begin with the home note, follow the selected publication's explicit references, and read the brief when resuming a piece. Ask only when the publication/profile selection is missing or ambiguous. Do not scan every publication or infer a voice solely from its name. No workspace files have been created by this planning update.

## Publication and author voice hierarchy

The user wants an overall writing profile plus author subprofiles. A publication base captures shared editorial patterns; an author subprofile links to the base and records evidenced differences. Sample by author as well as date/format, preserve byline attribution, and do not let a prolific writer silently stand in for the whole publication. Keep sparse-author profiles provisional and unknown bylines unattributed.

For newly generated hierarchical profiles, use `Voice Profiles/<Publication>/Publication.md` and `Voice Profiles/<Publication>/Authors/<Author>.md`; this extends the flat initial layout above. Existing paths may remain if their links/IDs are explicit. Author metadata includes parent profile ID/version. Selection is publication voice by default, or publication plus the chosen author subprofile. Surface conflicts with required publication rules for a decision. Author-specific corrections stay with that author; promotion to the publication profile requires an explicit choice.

## Profiles without an archive

The Greatest Ever Reviews has no existing content. The user requires a sparse starting profile that develops over time through interviews. Voice creation therefore supports two equally valid starting paths: derive from an existing archive, or establish an intended voice through a short interview and calibration passages.

A sparse profile records known choices and open questions; it can be approved for writing immediately. Approval and evidence maturity are separate. Later voice interviews, approved samples, and accepted edits support versioned refinements with provenance. Reuse answered questions, keep corrections scoped, and never infer a desired publication voice solely from the author's speaking habits. Interviews about a piece may surface candidate preferences but do not silently change the profile.

Validation must include starting The Greatest Ever Reviews with zero articles, using its provisional profile to draft, then resuming and refining it after feedback. Publication is not required to learn from an accepted draft.

## Voice-profile contract

A voice profile defines the editorial voice a piece should match: tone, vocabulary, sentence rhythm, point of view, humor, patterns to use or avoid, and approved examples. It may represent a publication or editorial persona rather than an individual author. Profiles may be explicitly authored or derived from selected samples and then approved.

Each publication selects a default profile. Each content piece/output records the selected profile and its version; an explicit override may select a different profile. Output presets govern format and length without silently replacing the voice. Drafting, personalization, polish, and repurposing must read the selected profile. If none is available, request or establish one rather than claiming voice fidelity.

Keep three inputs separate: **voice profile** (how to write), **source material** (what can be claimed), and **output brief** (what to produce and for whom). A style example is not permission to reuse its facts or invent a first-person experience. An interview is one source option, not a requirement for every sports article or review; supplied research, notes, or documented testing can serve as appropriate evidence.

Confirmed lessons belong to the selected profile by default. A correction for Previously on Tech must not automatically change the sports-blog or review profile. Distinguish profile-wide preferences from one-piece edits and format-specific requirements. Broader promotion of a lesson requires an explicit choice.

## Voice creation and future WordPress tool

The user selected a generic voice-profile creation skill as the next concrete feature. Plan 011 is refreshed for files, pasted writing, article URLs, or archives, with no dependency on WordPress, Obsidian, packaging, or a finished workspace loader. View From The Pine's existing WordPress articles are the first real acquisition/validation candidate; The URL is https://viewfromthepine.com; the user explicitly requests an overall publication profile and subprofiles for particular authors. Produce explicit, reviewable profile rules grounded in samples, then let the user confirm desired voice choices.

WordPress acquisition should use existing read capabilities where possible. Its REST posts endpoint supports content retrieval and author/category/date filtering, subject to actual site availability. [WordPress Posts API](https://developer.wordpress.org/rest-api/reference/posts/)

A future, separate WordPress tool could learn a site's block/pattern conventions, assemble compatible draft layouts, preview them, and publish on request. WordPress has a structured block serialization/parser system; rendered article HTML should not be treated as a complete inventory of editable blocks. That integration needs its own discovery/round-trip validation and publishing authorization, and may become an independent product. No plugin, connector, or publishing implementation is authorized by recording this option. [WordPress block parser](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-serialization-default-parser/)

## Skill refinement order

0. Execute refreshed plan 011: generic voice-profile creation, initially from supplied text and then the selected WordPress archive. This can validate the profile format before workspace automation.
1. Refresh plan 010 around publication profiles, reusable voice preferences, and per-piece artifacts in the existing vault. Make the selected voice profile an explicit input to all writing and review stages. Define simple stable identifiers and explicit inputs/outputs that can later map to app records, without building a generic storage framework now.
2. Refresh plan 007 around the shipped Interview, consistent source discipline, and downstream reuse. Separate skill changes from app schema/rail integration so the latter does not delay validating the writing. Preserve sources and exact user answers; attributed research and personal experience must remain distinguishable.
3. Add the accepted start/resume entry point and an optional faster drafting mode. Reuse existing material and only ask for missing information. Preserve guided drafting as an option.
4. Refine the implemented voice skill through real use and refresh plan 012 for confirmed lessons from draft-to-final edits. Scope preferences to the appropriate publication and retain examples supporting them. Keep final prose distinct from a polish scorecard.
5. Verify ChatGPT delivery when needed for actual use, using the canonical skills. Leave broad distribution, Oracle, and SaaS-specific work behind content validation.

## Proposed validation gate

Use a small batch of real pieces across the user's publications and more than one output format. Suggested starting sample: five pieces; the user's judgment, not an arbitrary count, decides readiness.

For each piece retain the inputs, publication/voice profile, original draft, accepted final, voice-profile version, and skill version. Judge whether the output matches that profile, rather than whether it sounds like the account owner. Include distinct profiles (for example Previously on Tech, View From The Pine, and The Greatest Ever Reviews) and check that their preferences do not bleed into each other. Record active author time, repeated questions, substantial rewrites, unsupported claims, and whether the author considers the result publishable. Include at least one resumed session and one source piece adapted into multiple outputs to expose context loss and format-specific problems.

The gate is passed when the user reports consistently good content, acceptable editing effort, and reliable context/voice across repeated runs. Do not infer quality from passing code tests or promise a time saving before measuring it. Record remaining failure patterns and revise the skills before proceeding to the SaaS.

## Proposed SaaS information model

| Object | Purpose |
|---|---|
| Publication | Persistent identity, audience, purpose, default voice-profile reference, and available output presets |
| Voice profile | Named, versioned editorial voice with approved examples, style rules, and scoped lessons; reusable through explicit selection |
| Output preset | Reusable format requirements: length, structure, tone adjustments, and intended destination |
| Content piece | The topic or editorial project, with shared interview/research material |
| Output | An actual newsletter, article, post, script, or other rendition of a piece; owns its draft revisions and editorial status |
| Destination | Where an output is intended to go; distinct from the publication and the format |

Example: a publication defines newsletter and social-post presets. One interview supports a newsletter edition and two individually editable social posts. Those outputs share source material but retain their own revisions and readiness status. This relationship is proposed design, not a schema migration decision.

## Proposed UI direction after validation

- Publication navigation with an all-publications overview.
- A publication home for its default voice profile, output presets, and active pieces.
- A voice-profile editor with rules and examples; show the active profile in the piece/output editor so the user can verify which voice is being applied.
- Clear draft, review, and ready views, with cards or lists that make progress easy to scan.
- A piece workspace showing related outputs, an editor/preview, sources, and contextual writing assistance.
- A later calendar/planning view if real usage warrants it. Planned dates and manually recorded publication status must not imply automated delivery.

Buffer's documented queue/draft views, list/calendar options, and per-channel composer are useful references for clarity and output management. Kessel Run's proposed organizing unit is the publication with related content outputs. This reference is not a commitment to reproduce Buffer's integrations, scheduling service, or feature set. [Buffer Publish](https://buffer.com/publish)

## Deferred until the content gate passes

SaaS UI implementation, multi-user identity, billing and usage enforcement, hosted persistence/recovery, app transcript wiring, and connectors. The security/reliability findings from the September 6 review remain prerequisites before commercial hosting; deferring them does not waive them. A SaaS implementation plan should be informed by the artifacts and friction observed in the validation batch.
