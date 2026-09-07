# Kessel Run

Kessel Run is a set of publication-aware writing skills and an evolving Next.js app. The skills use plain Markdown workspaces with publication voices, optional author profiles, source notes and independent outputs. Obsidian is optional; SaaS workspace development follows content-quality validation.

## Use the skills

Canonical skills live in [src/mastra/skills](src/mastra/skills/). Keep each skill folder and its references together. Build the distributable plugin with:

```bash
npm run skills:check
npm run skills:package
```

The validated folder is `build/kessel-run/kessel-run`; its companion `manifest.json` lists payload hashes. This builds files, not a host/account installation. See [delivery instructions](docs/kessel-run-skills.md) for explicit local destinations, backups, the legacy Claude wrapper and ChatGPT/plugin distinctions.

After the skills are available in your host, select one and ask:

- **kessel-run-voice:** “Create a sparse voice profile for The Greatest Ever Reviews through an interview.”
- **kessel-run-start:** “Resume this View From The Pine Brief using its saved Jason and parent voice versions.”
- **kessel-run-lessons:** “Compare this exact machine draft with my accepted final and propose reusable profile lessons.”

ChatGPT uses `@` skill selection; Codex CLI/IDE supports `$` or `/skills`. Local installation and plugin distribution are distinct. [Official OpenAI skill guidance](https://learn.chatgpt.com/docs/build-skills)

Read the [writing guide](docs/kessel-run/README.md), [workspace structure](docs/kessel-run-workspace.md) and [vault conventions](docs/kessel-run-vault.md). Personal content stays outside installed skill folders. Without file tools, supply the relevant profiles and sources and use a full resumable Markdown handoff.

## Run the app locally

With dependencies installed and your existing local configuration in place:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The app does not yet implement the full Markdown workspace persistence or provide file/browsing tools merely because a skill asks for them.

Repository checks:

```bash
npm test
npm run typecheck -- --incremental false
npm run lint
```

Implementation plans and review status are in [plans](plans/README.md). Packaging tests and synthetic writing exercises establish limited technical behavior; actual publication quality still needs human review.
