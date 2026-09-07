# Package and use Kessel Run skills

The maintained source is [src/mastra/skills](../src/mastra/skills/). Personal publications, voice profiles, sources and drafts belong in your [Markdown workspace](kessel-run-workspace.md), outside installed skill folders. Installs are replaceable program instructions; your workspace is your content.

## Build a distribution

With repository dependencies already installed, run:

```bash
npm run skills:check
npm run skills:package
```

The packager first verifies workspace reference equality and actual local resource links. It fails rather than silently syncing stale copies. It creates:

```text
build/kessel-run/
  manifest.json
  kessel-run/
    .codex-plugin/plugin.json
    skills/<skill-name>/SKILL.md
    skills/<skill-name>/references/...
```

`manifest.json` lists every payload path relative to `build/kessel-run/` and its SHA-256 content hash. It excludes itself to avoid a recursive self-hash. Entries are sorted and contain no build timestamp. Current output has 33 payload files across 15 skills plus the plugin manifest. Rebuilding the same inputs produces the same list and content hashes. The generated build directory is already ignored by Git; edit source and the [plugin template](../plugin/kessel-run/.codex-plugin/plugin.json), not generated copies.

Only skill entrypoints and supported `references`, `assets`, `scripts` and `agents` resources are eligible. Hidden files, dependency folders, database/archive and test debris are excluded; missing required resources fail the build. Source symlinks are rejected. The output is confined to the repository build tree, with source/template overlap and symlinked ancestors rejected before replacement. No personal workspace is copied. The folder is the required artifact; this implementation does not generate a zip.

## Install explicit local skill folders

Choose an actual skills destination, not a publication workspace root:

```bash
npm run skills:install:portable -- --destination "/absolute/path/to/project/.agents/skills"
```

To install only selected skills:

```bash
npm run skills:install:portable -- --destination "/absolute/path/to/project/.agents/skills" kessel-run-start kessel-run-voice kessel-run-lessons
```

These examples are user-run commands; no account or personal installation was performed during implementation. The installer is script-relative, so invoking its absolute script path from another directory also works. All requested names must be actual canonical `kessel-run-*` skills; validation of the complete batch happens before writes. Traversal, source overlap, symlink destinations/ancestors and reserved administrative destinations are rejected.

Changed skills are staged before installation. An existing install is **replaced after being moved to a unique backup**, not merged. The backup lives in a sibling `.kessel-run-skill-backups/` directory outside the skills discovery destination, preserving custom files and references. The CLI prints destination and backup paths. Unchanged installs are a no-op. Keep custom instruction changes in source when they should survive future releases; recover an older customization from its reported backup when needed.

If activation fails, that skill's original is restored. Earlier successful skills remain installed, and their results/backup paths are still reported. The imported API exposes these as `error.results`. If restoration itself fails, the error names the backup holding the original. Staging and backup ancestors are validated, including dangling symlinks; never use these administrative folders as the skill destination. This is per-skill rollback, not a whole-batch transaction. Do not run concurrent installers against the same destination.

## Codex versus ChatGPT

Official OpenAI guidance documents `.agents/skills` for repository-local Codex discovery and `$HOME/.agents/skills` for user-wide skills. It distinguishes direct local folders from reusable plugin distribution. It also documents `@` selection in ChatGPT and `$` or `/skills` in Codex CLI/IDE. These host behaviors require the skill to be available in that host; copying files to a Mac folder does not install them into a ChatGPT account. [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)

The generated plugin is a validated distribution artifact. Account availability, plugin directory publication, installation, cache refresh and actual host recognition are separate operations and have not been performed. Use the official plugin distribution process available to your host/account; this guide does not invent an upload UI or claim that the Claude destination below is ChatGPT discovery.

Once available, try selecting Start / Resume and asking to continue a Brief; select Voice to build an approved sparse profile; select Lessons to compare exact machine prose with an accepted final. See [writing examples](kessel-run/README.md).

Without filesystem tools, supply the relevant profile rules, sources and current draft in attachments or conversation. Request the full resumable Markdown handoff. Skills do not gain access to a local vault merely by knowing its path, and must not claim to save files when they cannot.

## Legacy Claude destination

The existing command remains available:

```bash
KESSEL_RUN_VAULT="/absolute/path/to/existing/vault" npm run skills:install -- kessel-run-start
```

It requires an existing vault directory, then invokes the same installer for `<vault>/.claude/skills`. No `CLAUDE.md` is required for a generic Markdown workspace. This is a Claude-specific destination adapter, not a ChatGPT installer. Backups live in `<vault>/.claude/.kessel-run-skill-backups`. Publication notes and `Issue.md` are not modified. See [vault conventions](kessel-run-vault.md).

## Validation and limits (2026-09-07)

The implementation passed 53 tests across 9 files, typechecking, reference check for all 15 skills, and diff checks. Lint had 0 errors and 9 pre-existing warnings. The installed plugin-creator validator accepted the generated plugin; skill-creator validation accepted all 15 packaged skills. Tests cover deterministic hashes, actual resource links, missing/drift failures before output replacement, source/output/destination symlink rejection, overlap/case aliases, full-batch name validation, custom-file backup fidelity, no-op installation, rollback and partial-result reporting.

A real scratch CLI exercise ran from a different CWD, installed Start, added a synthetic custom reference, replaced it and inspected that reference in the backup, then confirmed a no-op. It packaged the real source twice with identical manifest bytes. Persistent temporary evidence is `report.json` under `/private/var/folders/nl/27txcfp94pjd2crz2w23dvgc0000gn/T/kr-delivery-smoke-9hhbXg/`. The legacy wrapper was also exercised in an isolated temporary vault without `CLAUDE.md`. No actual personal vault, marketplace or account install was attempted. Host discovery and editorial content quality remain unverified by these packaging tests.

For maintenance, edit canonical instructions, run `skills:sync` if the shared contract changed, check and rebuild. Increment the plugin version for a release. Keep approval/history and personal profiles in the content workspace; packaging does not migrate them.
