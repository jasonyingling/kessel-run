# Kessel Run in the Obsidian vault

`/Users/miniying/The Rock/` is an Obsidian vault that is also a Claude Code
project — it has its own `.claude/skills/` directory and its own `CLAUDE.md`
with vault-specific agent rules. That vault is the workspace for the
**skills-only** Kessel Run workflow: no app, no database, just Claude Code
running in the vault with the Kessel Run skills installed as project-scoped
skills.

This document records how the two repos relate, so future work here does not
have to rediscover it.

## Source of truth vs. installs

`src/mastra/skills/` in this repo is the **source of truth** for every Kessel
Run skill. The copies that end up in the vault are **installs**, not
originals. Editing a `SKILL.md` inside the vault directly will work until the
next install overwrites it — always edit here and reinstall.

## Installing skills into the vault

```bash
KESSEL_RUN_VAULT="$HOME/The Rock" npm run skills:install [skill-name ...]
```

- With no skill names, every `kessel-run-*` skill in `src/mastra/skills/` is
  installed.
- The script (`scripts/install-skills-to-vault.sh`) refuses to run without
  `KESSEL_RUN_VAULT` set, and refuses to target a directory that has no
  `CLAUDE.md` (i.e. does not look like a Claude Code project).
- Skills are project-scoped: they land in `<vault>/.claude/skills/<name>/`,
  which is exactly where `triage-clippings`, the vault's other existing
  skill, already lives.
- The script only copies. It never deletes anything already in the vault,
  matching the vault's own rule that agents never delete notes.

This is a manual, user-run step — an executor working in this repo must never
run it against the real vault, only against a scratch directory.

## Where pipeline artifacts land in the vault

| Artifact | Vault location |
| --- | --- |
| Interview transcripts, drafts, and other per-piece run artifacts | `10 - Projects/<Publication>/<Piece>/` (for Previously on Tech specifically: `10 - Projects/Previously on Tech/<NNNN - Title>/`) |
| Personal voice/parameters used across pieces | `Meta/Kessel Run/` (once plan 010 lands) |
| Oracle/research spikes and loose content ideas | `40 - Ideas/Content Ideas/` |

## Vault rules Kessel Run skills must honor

These come from the vault's own `CLAUDE.md` and are non-negotiable for any
skill running there:

- **Frontmatter is required.** Every note a skill creates gets at least
  `title`, `type`, `created`, `updated`, `tags`.
- **Filenames use spaces and title case**, not hyphens or underscores (daily
  notes are the one fixed exception: `YYYY-MM-DD.md`).
- **Never modify an existing `Issue.md`** in Previously on Tech without
  explicit instruction. Those files carry no frontmatter and are off limits
  regardless of the frontmatter rule above.
- **Never delete notes.** Move to `60 - Archives/` instead.
- **Never overwrite substantial content in an existing note.** Append a new
  dated section instead of replacing what is there.
- **Never create a duplicate note.** Check whether a note already exists
  before creating one.
- Tags are lowercase and hyphenated (`content`, `writing`, `newsletter`,
  `kessel-run`).

## Relationship to the rest of the pipeline

The vault workflow currently runs the Kessel Run skills as standalone tools —
there is no app, no `projectStateSchema`, no stage rail, and no transcript
field wiring them together. That infrastructure (stage renumbering, the
Interview transcript becoming a constraint on Draft, the workspace convention
that ties runs together) is separate, later work. Nothing about running
skills in the vault today depends on it landing first.
