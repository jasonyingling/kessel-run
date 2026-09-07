# Kessel Run in a Markdown or Obsidian vault

The vault holds publications, voice profiles and content. Installed skills hold reusable instructions. The same Markdown workspace works without Obsidian; no plugin or `CLAUDE.md` is required by the workspace contract. Select your actual root/home note instead of assuming a particular machine path.

## Source and installation

[src/mastra/skills](../src/mastra/skills/) is canonical. Edits made directly to an installed skill will be replaced on the next changed install, with the full older directory retained in a backup outside discovery. Replacement is not a merge of custom instructions.

For the legacy Claude Code destination, a user may run:

```bash
KESSEL_RUN_VAULT="/absolute/path/to/existing/vault" npm run skills:install
```

Optional trailing names select individual skills. The wrapper validates that the vault directory exists and installs into `<vault>/.claude/skills/<name>/`. The shared installer validates the batch, stages copies, and preserves changed installs under `<vault>/.claude/.kessel-run-skill-backups/` with unique names. It prints each backup path. Unchanged installs are skipped; a failed activation restores that skill's original. Earlier successful replacements remain reported. No publication notes are changed.

This command is Claude-specific. [Portable installation and plugin packaging](kessel-run-skills.md) cover other destinations and distinguish local folders from ChatGPT account availability. Implementation tests use scratch directories only; the user's real vault has not been installed or modified.

## Workspace locations

Existing folders, IDs, numbering and links take precedence. For a new Obsidian layout, the home note links settings under `Meta/Kessel Run/` and pieces under `10 - Projects/`:

| Material | Suggested location |
| --- | --- |
| Publication defaults | `Meta/Kessel Run/Publications/<Name>.md` |
| Publication voice | `Meta/Kessel Run/Voice Profiles/<Publication>/Publication.md` |
| Author differences | `Meta/Kessel Run/Voice Profiles/<Publication>/Authors/<Author>.md` |
| Output format presets | `Meta/Kessel Run/Output Presets/<Name>.md` |
| Brief and sources | `10 - Projects/<Publication>/<Piece>/` |
| Independent outputs | `<Piece>/Outputs/<Output>/Output.md`, Draft, Review and accepted Final |

Keep existing flat Draft/Final notes where they are; record explicit per-output profile versions in Brief. Previously on Tech can retain existing issue-numbered folders. Never modify `Issue.md`, delete notes or overwrite substantial content. Preserve dated sessions or separate revisions with current-version links. New notes use readable Markdown links and the common metadata defined in the [workspace contract](../src/mastra/skill-references/workspace.md); don't rewrite old notes merely to add metadata.

## Writing and learning

Start / Resume finds the next useful action from saved selections and sources. An Interview is optional when notes or attributed research suffice. Draft supports guided sections or complete fast prose; Voice can establish an approved sparse profile before any archive exists. Lessons compares the exact machine draft with an accepted final and proposes profile-scoped changes for confirmation. Profile history and the selected author/parent versions remain explicit.

These skills do not depend on app state or stage renumbering. Without filesystem access, use supplied material and a complete Markdown handoff containing rules, inputs and current prose; the skill cannot read a Mac vault by path alone.
