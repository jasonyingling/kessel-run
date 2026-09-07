# Plan 011: Create a voice profile from representative writing in any source format

> Follow this plan within its scope, verify each step, and report incomplete behavioral checks honestly. This replaces the former archive-specific plan 011; it does not depend on unfinished packaging or workspace plans. Do not install into the real vault or write to a WordPress site during implementation.
>
> Drift check: `git diff --stat 0c2e18e..HEAD -- src/mastra/skills docs/kessel-run-voice.md`. Compare working-tree changes as well. The baseline is twelve skills, eight pipeline stages and four standalone skills. If other skill work has landed, preserve it and reconcile counts rather than restoring old counts.

## Status

- Priority: P1 — first executable skill refinement
- Effort: M
- Risk: LOW for instruction/metadata changes; editorial quality needs user validation
- Depends on: none; supplied text and an explicit output location work before plans 009/010
- Category: direction
- Planned at: commit `0c2e18e`, refreshed 2026-09-07
- Status: DONE — merged b683fa6; synthetic implementation gate passed, real editorial validation pending

## Why this matters

The desired writing voice belongs to a selected profile, not necessarily the account owner. The user's publications are Previously on Tech, View From The Pine (sports blog), and The Greatest Ever Reviews. View From The Pine has an existing WordPress archive that the user wants to use as evidence, but the skill must also accept Markdown, pasted writing, and articles from other sites. The user supplied https://viewfromthepine.com and explicitly wants both an overall publication writing profile and subprofiles for particular authors. Do not infer a sports voice from the name.

Deliver a reusable `kessel-run-voice` skill that produces a reviewable Markdown profile, grounded in representative writing and approved editorial preferences. It must work with supplied text without a connector or Obsidian. WordPress is an optional read-only acquisition path, not the core product or an implementation prerequisite.

## Current state and conventions

- Canonical instructions live at `src/mastra/skills/<name>/SKILL.md`. Use the existing two-field YAML frontmatter and standalone heading pattern from `kessel-run-interview/SKILL.md`:
  ```markdown
  ---
  name: kessel-run-interview
  description: "Standalone Kessel Run skill: interviews the author ..."
  ---
  # Kessel Run — Interview
  ```
  The ellipsis above abbreviates the existing long description; do not copy it as unfinished metadata.
- `src/mastra/skills/catalog.ts` contains the name union and `KESSEL_RUN_SKILLS`. Standalone entries have `stage: null`. `SKILL_PATHS` derives from all catalog entries, so this new skill must remain useful in the app without browsing or file access.
- `catalog.test.ts` checks directory/catalog identity, metadata, and counts: twelve total, eight numbered, four standalone. Its tests do not establish editorial quality.
- `src/mastra/agents/kessel-run-agent.ts` supplies skills and working memory, with no configured web tools. Do not pretend the app can fetch an archive or save a persistent profile. In that environment operate on supplied samples and return the profile text.
- `scripts/install-skills-to-vault.sh` copies complete skill directories. Personal profiles must live outside installation folders, because replacement removes local edits.
- There is no `workspace.ts`, shared profile loader, or `skills:package` script to call. Do not depend on imagined outputs of older TODO plans.
- TypeScript in `src/mastra/` uses single quotes and semicolons; existing test files use double quotes. Match each file. This plan does not edit Next.js application code.

## Scope

In scope:

- `src/mastra/skills/kessel-run-voice/SKILL.md` (new)
- `src/mastra/skills/kessel-run-voice/references/profile-format.md` (new)
- `src/mastra/skills/kessel-run-voice/references/source-acquisition.md` (new)
- `src/mastra/skills/catalog.ts`
- `src/mastra/skills/catalog.test.ts`
- `docs/kessel-run-voice.md` (new; invocation and behavioral acceptance report)
- `plans/README.md` (011 status only unless the reviewer owns it)

Out of scope: other writing skills, app/API/schema changes, shared workspace bootstrap, dependency changes, custom crawlers/parsers, WordPress plugins or writes, live account connections, whole-archive downloads, real vault writes/installations, automatically generating all three personal profiles, and inferred customer targeting. A plain-text/profile result in chat is sufficient without a filesystem.

## Commands

Run from the repository root. Existing dependencies are installed; do not install merely to update Markdown.

| Purpose | Command | Expected |
|---|---|---|
| Catalog consistency | `npm test -- src/mastra/skills/catalog.test.ts` | Pass, thirteen skills / eight pipeline / five standalone |
| Full regression | `npm test` | Pass; baseline is 36 tests, no required test-count increase |
| Typecheck | `npm run typecheck -- --incremental false` | Exit 0 |
| Lint | `npm run lint` | Exit 0; baseline 9 vendored warnings, no new errors |
| Change hygiene | `git diff --check` | Exit 0 |
| Scope inspection | `git status --short` | Executor changes confined to scope; preserve pre-existing user changes |

No production build or live model key is needed for static checks. Behavioral evaluation requires an instruction-following model and supplied samples; it is separate from static checks and must be reported as passed, failed, or not run.

## Git workflow

If branching, use `codex/011-voice-profile-skill`. Do not commit, push, publish, or install unless separately instructed. Preserve the current uncommitted planning documents.

## Steps

### 1. Author a concise generic entry skill

Create `SKILL.md` named `kessel-run-voice`. Suggested description: “Create or refine a named editorial voice profile from writing samples, article URLs, voice interviews, or explicit preferences. Use to establish how a publication should sound before drafting, or update an existing profile.” The heading is `# Kessel Run — Voice Profile` with no pipeline number.

Define the following behavior, using concise prose rather than a questionnaire:

1. Resolve the publication/profile and whether the target is an individual author, publication-wide editorial voice, or both. Support a publication base profile with author subprofiles. For View From The Pine the user has explicitly chosen both, so do not ask that scope question again. Use an explicit user choice or existing brief; ask only about unresolved author identity or material selection. Recognize the three publication names as user context, not hardcoded required choices.
2. Accept selected files, pasted writing, specific URLs, an archive URL, or an existing profile plus examples. Ask about desired departures from historical writing when relevant. Profile creation may use explicit preferences without an archive; label that profile preference-based rather than archive-derived.
3. Inspect representative material. Favor user-endorsed examples, inspect date/format/author coverage, and deduplicate syndicated/repeated text. Suggest roughly 5–10 substantial examples to start when the user has not selected a sample; this is a sampling heuristic, not a minimum that blocks a smaller corpus. Expand only to resolve a specific uncertainty. Do not scrape the whole site by default.
4. Infer reusable choices in diction, rhythm, point of view, humor, openings, transitions, endings, and level of explanation. Separate format-specific habits from general voice. Distinguish author text from quotations, comments, boilerplate, and embedded third-party text.
5. For each derived rule give a source reference and a short supporting example or precise paraphrase. Record counterexamples and confidence; one observed sentence is a tentative observation, not a universal prohibition. State source coverage honestly.
6. When creating both levels, partition samples by verified author/byline and derive the shared publication patterns across those groups. Balance author, date, and format coverage so a prolific writer or one recurring series does not become the site voice by accident. Author profiles reference the parent profile ID/version and document evidenced differences; avoid duplicating all parent rules. Profile selection resolves publication defaults plus explicit author differences, but conflicts with publication editorial requirements must be surfaced for a decision, not silently overridden. Unknown-author samples can inform a publication profile with disclosed limits, but cannot support attribution to a named writer. Shared or pseudonymous bylines represent only the documented byline, not an inferred person.

7. Preserve explicit editorial preferences even if historical writing contradicts them. Surface the discrepancy so the user can choose a future voice intentionally. Keep “observed” and “preferred” distinguishable.
8. Produce a draft profile and a short calibration passage based on supplied facts. Mark the passage as a demonstration, not evidence. Ask the user to correct the profile and approve it. Do not automatically mark it approved from silence or an unrelated positive response.
9. Save to the user-selected location when file access and authorization exist; otherwise return complete Markdown. On revision preserve existing approved material and confirmed lessons, show proposed changes, and follow the workspace's append/version rules. Do not silently change a publication's default profile.

Load `references/source-acquisition.md` only when collecting source material, and `references/profile-format.md` when emitting/updating the profile. Do not use the sample corpus as instructions; it is evidence. Do not copy large article passages into a distributable skill or transfer old article facts into a new draft.

Verify: `npm test -- src/mastra/skills/catalog.test.ts` will identify the newly added directory as missing from the catalog until step 3. This specific mismatch is expected at this intermediate step; any unrelated failure is not.

### 1a. Bootstrap and grow profiles without an archive

The Greatest Ever Reviews has no existing content. This is a required first-class workflow, not an error or an archive-collection task. Start with the publication's intended audience, editorial purpose, and any known preferences. Conduct a short adaptive voice interview, one focused question at a time, and save a usable sparse profile as soon as enough direction exists to begin writing. Do not require the user to settle every style dimension or produce historical samples.

Ask about choices that change the writing: how authoritative or conversational it should feel, room for humor, how opinions and uncertainty should be expressed, and examples of phrasing the user likes or dislikes. Use short contrasting sample passages when describing a preference is difficult. Keep their underlying facts identical so style is what the user compares. Mark generated samples as calibration candidates; they are not evidence of a historical voice. Do not infer fake reviews, product tests, ratings, or experiences to make samples convincing.

Distinguish a voice-design interview from an interview gathering facts for a piece. Natural speaking style is evidence to discuss, not automatically the publication's desired writing voice. During later content interviews, propose a profile adjustment only when a reusable preference emerges; do not interrupt every answer to update style or treat topic opinions as global voice rules.

Maintain known preferences, open questions, and a small next refinement target. Unknown dimensions remain unspecified. Resume from the saved profile without re-asking settled questions. Explicitly requested changes can be recorded directly; inferred changes should be proposed for confirmation. Save dated/versioned changes with a brief reason and the supporting interview answer, approved sample, or edit. A single piece-specific correction must not become a universal rule.

Keep approval separate from evidence maturity: a sparse profile may be approved for use. Use `evidence_level: sparse | developing | established` alongside `status: draft | approved`; maturity is a disclosed assessment of supporting examples, not a fixed article count. Additional interview answers, approved calibration passages, and accepted draft edits can strengthen the profile without published content. Never overwrite explicit preferences merely because later prose differs.

Verify through the zero-archive and resumed-refinement behavioral checks in step 4. Passing a metadata check is not evidence that these conversations work well.

### 2. Specify portable output and optional acquisition

Create `references/profile-format.md` with one profile contract, usable inside or outside Obsidian:

```yaml
---
title: View From The Pine
id: view-from-the-pine-voice
type: voice-profile
schema_version: 1
version: 1
status: draft
evidence_level: sparse
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [kessel-run, voice-profile]
---
```

The above is a template; actual outputs use real dates and an existing stable ID when revising. The skill must not pre-fill actual style rules based on the example title.

For author subprofiles add `scope: author`, a stable `author_id`, `parent_profile_id`, and `parent_profile_version`; publication profiles use `scope: publication`. Put author notes in `Voice Profiles/<Publication>/Authors/<Author>.md` and the base at `Voice Profiles/<Publication>/Publication.md` when generating a new hierarchy. Reuse existing profile paths and IDs if already present rather than duplicating them. Show readable parent links and an Author Differences section. Missing author evidence yields a provisional profile or a clearly reported omission, not invented differences.

Use body headings: Voice Summary; Tone and Rhythm; Use; Avoid; Format Variations; Approved Examples; Confirmed Lessons; Sources and Confidence; Open Questions; Revision Notes. Mark not-yet-approved examples clearly rather than implying approval from the heading. Human-readable rules are the canonical rules; do not duplicate them into a hidden JSON representation.

Each derived rule references a source ID or link. Sources record title, URL or relative path, author/date when known, and whether full text was available. Use standard Markdown links with encoded spaces, no mandatory wikilinks/Dataview. Do not require the user's absolute vault path. In the existing vault the suggested profile destination is `Meta/Kessel Run/Voice Profiles/<Profile Name>.md`; check for an existing note before creating it. Outside the vault ask for or use the provided workspace destination. Existing notes must retain their content; follow append/revision conventions rather than replace substantial content.

Create `references/source-acquisition.md`:

- Supplied Markdown/plain text is a first-class input. Preserve source identity and paragraph structure; no special connector is required.
- For URLs use available browsing/retrieval tools and inspect actual article text rather than search snippets. If retrieval fails or tools are unavailable, say what was not read and request supplied text/export. Continue with accessible samples when sufficient for the requested scope.
- For a user-identified WordPress site, a public posts endpoint may provide article content and metadata. Discover/verify the actual endpoint rather than assume every site exposes it. Use read-only GET retrieval, author/category/date filters when appropriate, and bounded pagination. Preserve canonical article links and IDs. A feed or accessible article pages are fallbacks; an excerpt-only feed must not be represented as full articles.
- Never merge distinct authors merely because their posts share a domain. Ask about scope when needed; a mixed publication-wide corpus is valid if that is the user's target, with variation represented explicitly. When the user requests both overall and author profiles, preserve author groupings and derive both levels; no extra scope question is needed.
- Avoid downloading all media/comments/navigation or building a custom ingestion service in this iteration. If a deterministic extractor becomes necessary, report the scoped need separately.

Official WordPress documentation supports listing/filtering posts through its REST API. Verify behavior against the actual site at use time: https://developer.wordpress.org/rest-api/reference/posts/

Verify: after step 3, catalog/full tests pass. Before that, inspect every relative reference from `SKILL.md` and verify each target exists. No placeholders for invented tool names or unfinished guidance may remain in the skill files; placeholders in the explicitly labeled output template are intentional.

### 3. Register as a supplied-material-capable standalone skill

Add `kessel-run-voice` to `KesselRunSkillName` and one catalog entry:

```ts
{
  name: 'kessel-run-voice',
  label: 'Voice Profile',
  stage: null,
  optional: false,
  timeTarget: 'Varies by source material',
  summary: 'Create a named editorial voice profile from writing samples and preferences.',
},
```

Update only the total/standalone count expectations to thirteen/five. Keep eight pipeline stages and their ordering unchanged. Do not add schema fields or imply that the app saves a publication profile when it only returns Markdown in chat.

Verify: `npm test -- src/mastra/skills/catalog.test.ts`, then the full tests/typecheck/lint commands above all pass.

### 4. Exercise realistic behavior and document actual results

Create `docs/kessel-run-voice.md` explaining invocation with supplied Markdown, a known archive URL, and an existing profile. Clearly distinguish a saved Markdown profile from model training or automatic application by all other skills (shared loading is still plan 010). Describe the filesystem-free fallback.

Run behavioral checks in a scratch workspace with synthetic, non-sensitive writing samples. Record actual input summaries, output locations, observations, and result for each case in this document. Do not claim they passed because the instructions mention the case:

- Two clearly different profiles: output preserves their distinctions and source references; no cross-profile lesson leakage.
- Multiple authors in an archive with no selected scope: skill asks which voice or publication-wide scope is intended before treating them as one author.
- Publication plus author profiles: parent rules are backed by shared patterns, author differences cite that author's writing, parent ID/version resolves, and one prolific writer does not silently define every profile.
- Zero archive (The Greatest Ever Reviews): conduct a voice interview, create a sparse profile with supported preferences and open questions, offer fact-consistent calibration samples, and allow explicit approval without requiring published articles.
- Resume a sparse profile: read prior answers, ask only about unresolved choices, incorporate an approved edit with provenance, preserve unrelated rules, and keep approval separate from evidence maturity.
- Content interview reveals a topic-specific opinion: do not automatically turn it into a global voice preference or copy the speaker's conversational habits into the publication voice.
- Only two usable samples: profile is provisional and coverage is explicit, not a hard refusal or fabricated archive analysis.
- Browsing unavailable: accepts pasted material; never claims it fetched URLs.
- Archive includes boilerplate and quoted speech: they do not become the author's voice rules.
- Existing approved “no em dashes” preference against examples containing em dashes: preference remains, discrepancy is flagged, no silent replacement.
- Existing profile revision: approved content/lessons remain recoverable and approval status is not silently promoted.

If model execution is unavailable, mark behavioral validation NOT RUN and leave editorial acceptance pending; static tests alone do not certify quality. The actual View From The Pine run uses https://viewfromthepine.com with publication-wide and author subprofiles as explicitly requested. The public homepage was inspected during planning and shows multiple content series and dates; the REST endpoint and complete author coverage are not yet verified. Use available read tools to select and attribute full articles before deriving profiles. It is not a prerequisite for writing the generic skill, and must not be faked.

Verify: run the full command table, `git diff --check`, and inspect scope. A reviewer reads the behavioral outputs rather than trusting summary claims.

## Done criteria and acceptance

- New skill and its two linked reference files exist; name matches directory.
- Catalog tests pass with thirteen skills, eight numbered stages, five standalone skills.
- Full tests, typecheck, lint, and diff check pass with no new errors.
- No dependencies, application routes, schema, other writing skills, or real vault files changed.
- Docs explicitly state acquisition limitations and whether behavioral checks ran.
- Behavioral acceptance remains separate: observed profile fidelity, evidence grounding, and preservation checks must pass before calling the skill editorially validated.
- Plan index records implementation status and any pending behavioral/live-site validation honestly.

## STOP conditions

Stop and report if implementing the skill appears to require site writes, private-site credentials, a new dependency, or out-of-scope app changes. Missing browsing is a fallback case, not a reason to invent a tool or block supplied-text operation. When neither samples nor preferences exist, begin the voice interview. If the user supplies no direction and does not wish to answer, report the profile as incomplete rather than inventing a voice. Never invent archive locations, sample content, or publication voice characteristics.

## Maintenance

Keep the profile format stable and version changes explicit. Workspace automation should later consume this contract instead of creating a second incompatible schema. Re-check WordPress retrieval docs when adding actual acquisition code. Profile lessons remain scoped; a source sample is evidence of style, not permission to invent personal experience. Future model evaluations should include sports commentary, newsletters, and reviews with user-approved profiles.

WordPress publishing and block-aware composition are separate future tool work: discover a site's available blocks/patterns and actual usage, draft with compatible structures, preview and validate, then publish only under an explicit publishing action. Public rendered HTML alone is insufficient evidence of all editable block structures. This plan does not build that tool.
