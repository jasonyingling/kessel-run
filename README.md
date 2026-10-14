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

Use Node 22.13.0 or later. Install dependencies, then use the paired loopback launcher:

```bash
npm ci
npm run app:dev
```

Open the single-use pairing link printed by the launcher. Choose a new empty workspace, create a publication and import its existing voice profile. Markdown storage supports independent outputs, supplied source/interview notes, exact retained revisions, human approvals and resumable conversations. Manual writing/export and external-agent MCP need no app model key.

In-app AI uses an explicitly selected OpenAI API key; user-entered keys use an unencrypted owner-only local file outside content. Configure/remove it in settings. Connect external agents separately with scoped revocable MCP tokens; no subscription integration or automatic client configuration is included.

For production, run `npm run build` then `npm run app:start`. See [local app/key/recovery instructions](docs/kessel-run-app.md) and [MCP connection instructions](docs/kessel-run-mcp.md). Browser, live API/Codex and human editorial acceptance remain pending; source/unit/HTTP checks do not establish those gates.

Repository checks:

```bash
npm test
npm run typecheck -- --incremental false
npm run lint
```

Implementation plans and review status are in [plans](plans/README.md). Packaging tests and synthetic writing exercises establish limited technical behavior; actual publication quality still needs human review.
