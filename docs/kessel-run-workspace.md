# A readable workspace for Kessel Run

Kessel Run skills share a plain Markdown contract. Obsidian can navigate the notes, but plugins and Obsidian itself are optional. This is a file convention and skill instruction set, not a filesystem connector for ChatGPT or the app.

## Set up

Choose a folder and tell the skill its path, or supply an existing `Kessel Run.md` home note. Use the [canonical contract and starting templates](../src/mastra/skill-references/workspace.md) to create only the notes you need. Fill real dates and IDs, and make every link relative to its containing note. In a new ordinary folder:

```text
Kessel Run.md
Publications/
  Previously on Tech.md
  View From The Pine.md
  The Greatest Ever Reviews.md
Voice Profiles/
  <Publication>/Publication.md
  <Publication>/Authors/<Author>.md
Output Presets/
  Article.md
Pieces/
  <Publication>/<Piece>/Brief.md
  <Publication>/<Piece>/Interview.md
  <Publication>/<Piece>/Outputs/Article/Output.md
  <Publication>/<Piece>/Outputs/Article/Draft.md
```

This tree shows possible notes, not mandatory empty scaffolding. Only create author profiles where useful. Publication names do not imply voice rules. The Greatest Ever Reviews can begin with an approved sparse profile based on an interview; View From The Pine can derive publication and author profiles from selected evidence. The [Voice skill profile format](../src/mastra/skills/kessel-run-voice/references/profile-format.md) defines their full readable schema.

In Obsidian, keep the home at the vault root, link Settings to `Meta/Kessel%20Run/` and Pieces to `10%20-%20Projects/`, and adjust the template links accordingly. Existing homes and folder conventions take precedence. Obsidian-specific wikilinks already present need not be rewritten; new portable notes use ordinary Markdown links.

## Resume and make multiple outputs

“Resume the View From The Pine article using Jason's saved profile” resolves the piece Brief, selected Output note, linked profile snapshots and required sources. The bot should not read unrelated publications or your whole archive. Missing IDs or versions require clarification.

Brief selections are defaults for creating new outputs. Article and social outputs each retain a complete selection, independent review status, draft and revisions. A change to Brief's voice or publication does not change an existing output. You may choose another profile for a new output explicitly. Destination labels are organizational and do not publish content.

Keep a real v1 snapshot before editing a profile to v2, and link the output to v1 when it remains pinned there. Author profiles pin the parent publication version too. Approval of v1 does not approve a proposed v2. Human edits and confirmed lessons remain recoverable. Before editing a draft, retain its exact machine-written version; preserve the accepted final separately so later learning can compare actual texts.

## Adopt existing notes

Keep existing issue folders, numbering, flat Draft/Final notes, and links. Never modify `Issue.md`. Record the complete selection for each flat output in Brief rather than relocating it. Do not add metadata to every old note just for uniformity. Resolve missing historical profile versions with the author; a log saying “v1 existed” is not the original rules. Append interview sessions by date instead of replacing earlier answers.

## Work without files

Supply selected profile rules, inputs and current draft in conversation or attached documents. The skill returns Markdown with suggested filenames and an explicit handoff containing the actual rules and versions, author differences, input text/provenance, current output selections and draft, decisions, progress and questions. Copy that into the next session. It must identify missing material and cannot claim to have saved files. The current Mastra app uses only matching existing memory fields; other workspace structures stay in conversation/handoffs until app support is built.

## Maintain skill copies

Edit `src/mastra/skill-references/workspace.md`, then run `npm run skills:sync`. Each skill ships a self-contained `references/workspace.md`; keep that file when copying a skill. Run `npm run skills:check` to detect missing or stale copies without writing. The script resolves paths from its own location, so it works outside the repository directory. New `kessel-run-*` skill folders participate automatically and must route to their bundled reference. Tests use temporary fixtures, never mutate the canonical reference, and reject fixture symlinks escaping the fixture root.

## Validation evidence (2026-09-07)

An independent agent completed a local synthetic walkthrough using the actual Anchor skill and bundled contract. It reopened a legacy flat article with publication v1/Jason v1, added a social output using its own v2/no-author selection, and emitted a self-contained handoff containing profile rules, inputs and both drafts. Baseline hashes confirmed Issue and the human-edited Draft stayed byte-identical; Brief changed by append, and workspace links resolved. Artifacts are in `/private/tmp/kr-workspace-walkthrough/` (`REPORT.md`, `workspace/Handoff.md`, and the piece notes); these are temporary review evidence, not shipped personal content.

This demonstrates one instruction-following file exercise, not ChatGPT/Mastra runtime compatibility or content quality validation. The evaluator read the complete small fixture, so minimal retrieval was not demonstrated. Missing versions and mismatched IDs were not exercised. Anchor's drafting boundary versus an explicit resume request remains for the workflow refinement plan; the evaluator followed the explicit request and confirmed stored anchor. Script tests independently cover copy equality, routing, missing/drift detection, idempotence, preserved sibling references, and existing/dangling symlink escapes.
