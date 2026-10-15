# Kessel Run local validation app

## Launch and pair

Requires Node 22.13.0 or later and npm (the installed Mastra/AI dependencies set the app minimum). Install dependencies in this checkout with `npm ci`, then run:

```bash
npm run app:dev
```

For a production build:

```bash
npm run build
npm run app:start
```

Both launchers bind to `127.0.0.1`, default port 3000. Set `PORT` to choose another port. Open the single-use pairing link printed by the launcher within ten minutes. Pairing exchanges that token for an HttpOnly, SameSite=Strict browser session lasting 24 hours. Exact Host/Origin and CSRF checks protect browser mutations. A new pairing replaces the prior local session; restart prints another link. No Codex installation or subscription login is required.

Choose a **new empty folder** for app-managed content. Existing projects, vaults and `Issue.md` are preserved. The selected root and stable workspace ID survive restart. To switch workspaces, choose another empty folder explicitly. Stale tabs are rejected by their expected workspace reference, including when restored entity IDs match the previous workspace.

## Keys and models

Manual editing, Markdown export and MCP work without an app model key. Open API settings to select **Saved local key** or **Server environment** explicitly. There is no credential/provider fallback. An invalid, removed or exhausted selected key fails that turn.

User-entered keys stay on the local server in an **unencrypted owner-only file**, outside the app and content workspace. This validation release does not use an OS keychain. The directory is mode 0700 and files are mode 0600; imported/exported content, browser storage, conversations, tools and logs do not contain provider keys. Replace/remove through settings. Removal is durable and interrupts active writing turns using that saved credential.

The default private root is `~/.local/share/kessel-run`; set `KESSEL_RUN_PRIVATE_ROOT` to an owned directory outside the checkout/content before launching. Existing linked or incorrectly owned private files are refused. Do not move private state into exported content. Environment configuration uses server-side `OPENAI_API_KEY`; never use a `NEXT_PUBLIC_*` variable. See [OpenAI authentication guidance](https://developers.openai.com/api/reference/overview).

The server allows `gpt-5` and `gpt-5-mini`. Their text/tool/stream adapter is tested with fake providers; [OpenAI documents streaming/function calling for GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini). Catalog capability is not proof of live compatibility. Both models still need a real billed verification in the user's environment.

**Run billed connection test** sends a bounded synthetic request and verifies streaming plus a saved tool candidate. Status/model-list checks do not generate. A CLI equivalent requires a fresh pairing token:

```bash
npm run app:smoke:api -- PAIRING_TOKEN saved gpt-5
```

The token is a pairing credential, never an API key. Choose `environment` and/or `gpt-5-mini` explicitly if desired. The smoke test prints safe run IDs, selected provider/model and provider-reported usage. It does not estimate costs. No real key or live test was supplied during implementation.

## Writing and voice setup

Create a publication and import its existing voice profile; preview IDs/version metadata and confirm use. Supplied prose stays verbatim. Sparse profiles are valid. Do not repeat voice setup merely because a starter profile is sparse. No mockup authors/rules or fictional evidence are seeded.

Create a piece with a brief and guided/fast mode, append supplied notes/interviews with attribution, then add independently pinned outputs. Source URLs are references only: no retrieval is claimed. Voice setup can also run directly in the publication studio without a piece. The agent begins with Start/Resume and uses the canonical fifteen skills and available runtime capabilities.

The writing desk has a Markdown editor, safe preview, exact rules, retained revision history and AI conversation. HTML is not executed and remote images are not loaded by preview. A failed save retains the editor buffer. Session recovery buffers contain prose/revision hashes only, scoped to workspace/output. Keep the tab open if recovery storage is unavailable. Dirty buffers never get replaced by polling or AI text.

Save receipts identify the exact committed revision/context. Typing during a save stays dirty against that receipt; a later external save is shown for reconciliation. The app refreshes workspace/source/artifact activity independently of chat. External agents' private conversations are not available; their committed candidates/provenance are.

## Human decisions

Review a saved candidate before using it in the editor. This is separate from final acceptance. Accepting a final creates an immutable human snapshot of one exact current revision. Later prose edits clear acceptance without modifying retained machine/final bytes. A scorecard/artifact cannot become final prose.

Review lessons against the displayed exact machine/final comparison and target rules. Approve/reject selected rules; leave others pending. Approved lessons create a new publication/author version, while earlier outputs retain their pins. Author lessons keep their exact approved publication parent. Stale approved bases conflict rather than dropping newer rules; reject outdated proposals or explicitly rebase in the voice editor.

Editing a profile creates an immutable draft version. A separate human approval creates an approved version while retaining the candidate and prior rules. Model/MCP tools cannot approve profiles, finals or lessons. Repurpose creates another independent output using the chosen format and rules.

## Export, restoration and backups

Export contains current prose, actual rules/sources/artifacts, proposed profile rules, lesson payloads/decisions, pending candidate text and exact retained machine/human/final snapshots with context. Readable text and the restoration block come from one locked snapshot. Safe filenames are used. Export is not publishing.

To restore an exported handoff, choose a new empty app workspace, select its Markdown file, preview the exact prose/profile versions and prior editorial records, then confirm restoration. Existing content is refused; unsafe paths, duplicate IDs and missing/version/prose-hash inconsistencies fail. The UI accepts handoffs up to 8 MB. Restoration preserves exported editorial identities/decisions; it does not restore private conversations or credentials.

For a full local backup, stop the server and copy the content root plus private root separately. The private root may contain an unencrypted saved key: protect it as a credential backup. Private journals bind to the original canonical root/stable ID; do not point an existing journal at another content root. Use explicit handoff restoration for moving editorial content to a new root.

## Durability and recovery

Markdown is canonical: `Kessel Run.md`, publications/profiles/presets, `Brief.md`, source/artifact notes, each `Output.md`, and immutable retained versions. Companion navigation notes provide readable relative links. The index rebuilds from these files.

SQLite OS write locks coordinate separate workers; process exit releases locks. Journals fsync before applying content and before acknowledging commits. Interrupted multi-file writes recover before reads/writes. Identical operation IDs return their original result; changed arguments conflict. External edits invalidate expected hashes. Corruption/missing pinned versions are reported instead of being treated as empty workspaces. Do not edit immutable snapshots in place; explicitly import/propose a new version.

Writing runs record selected source/model/engine, starting context and Start hashes, actual workflow tool result hashes, messages, typed events, usage and terminal state. One active turn is allowed per scope. Stop/disconnect, key removal/replacement and a 90-second bound interrupt inference. Dead owners are marked interrupted; a 95-second recovery bound prevents failed terminal persistence from leaving permanent active ownership. No ambiguous generation is automatically replayed.

Legacy demo URLs/data require `KESSEL_RUN_ENABLE_LEGACY=1` plus a local session. Default launch guards model routes before importing legacy storage, and legacy observability/storage bootstrap is disabled. New content operations do not migrate legacy working memory.

## Verification and remaining gates

Final implementation checkpoint: `npm test` passed 30 files / 116 tests; nonincremental typecheck passed; lint passed with 0 errors and 9 pre-existing vendor warnings; `skills:check` passed 15 workspace + 15 runtime references; production build passed with one Turbopack runtime-filesystem NFT tracing warning. Default build no longer initializes legacy DuckDB storage/observability. Diff checks passed.

The HTTP-only script passed normal production, `fake-production` refusal, and `fake-dev` synthetic streaming/tool modes. All use temporary content/private roots, keys unset, an isolated PATH without Codex, and confirmed owned-server/port shutdown before restarting. Pairing, no-key manual/MCP/export, stable restart identity/prose and stale-workspace rejection passed. These are HTTP/source checks, not browser inspection.

Run unit/SDK checks with `npm test`, typecheck, lint and `skills:check`; build with `npm run build`. Real loopback SDK and production HTTP checks use synthetic temporary roots, no model key and no browser. The reusable HTTP-only check is:

```bash
node tests/e2e/production-http.mjs /absolute/path/to/npm
```

`fake-dev` additionally exercises the compiled development fake-provider path; `fake-production` verifies production refusal. The fake provider requires an explicit server-only flag, an owned private synthetic fixture root containing both content/private state, and synthetic workspace data. It never resolves a model key. It is not a production provider option.

`npm run test:app:e2e` is authored for deterministic synthetic workspaces at 390/768/1440 pixels, including reduced motion. **It has not been executed under the current browser restriction.** No browser, alternate renderer/protocol or server-to-inspect workaround was used. Source/unit/HTTP progress is not visual, keyboard, mobile or physical-device acceptance.

Pending: real billed API streaming/tool/cancellation tests; a real Codex client using its own account; browser/E2E and physical-device inspection; and the user's Greatest Ever Reviews import/draft/edit/accept/lesson/restart/second-output walkthrough with voice/factual/UX assessment. No editorial approval or personal experience was invented. See [MCP setup](kessel-run-mcp.md).

### Inline dictation and optional cleanup (008 candidate)

The writing message and the source-notes form each keep one editable field. Dictate starts only on a click. Stop dictation waits up to 1.5 seconds for final words; Send, Save source, Clean up, Escape, a hidden tab, navigation and unmount immediately invalidate late recognition events. Final segments append to the latest typed text without replacing the writer's selection. Interim words are only a visual hint. Recognition uses the document/browser language (English fallback), and capability detection rather than browser-brand checks. Unsupported browsers keep manual editing available.

Browser speech services may process audio remotely. Kessel Run records and stores no audio; recognition text can be wrong. Dictation is bounded by the field limit (20,000 message / 80,000 source characters), including cumulative recognition across sessions. Overflow stops capture and retains a separate fragment for copying before explicit dismissal; a fragment exceeding the 80,000-character recovery cap has a visible truncation notice. Dictation cannot restart until that fragment is dismissed.

Clean up is optional, billed inference using the explicitly selected credential source and supported model. No key is required for typing, speech or source saving. Cleanup accepts at most 20,000 characters, removes obvious fillers and applies light proofreading; review meaning, names and numbers yourself. It runs through a dedicated agent without tools, skills, content writes or retries, with a 30-second bound. Failure/cancellation keeps the input. Edits, a new request, capture restart, workspace/target changes and Escape invalidate suggestions. Undo restores the original only before intervening edits; otherwise the original remains separately available for comparison/copy. Cleanup never sends or saves automatically.

A source body contains the submitted mixed typed/dictated/edited text. When capture occurred, optional `dictation` metadata separately retains the exact finalized recognition text and whether cleanup remains applied. That fallible raw text is readable in sources, exports and restored handoffs. Older sources and callers without metadata remain valid. Cleanup never overwrites raw recognition or changes evidence eligibility or the eight-stage method.

Verification uses synthetic unit/service/HTTP fixtures only. Browser scenarios are authored for 390/768/1440 widths and reduced motion but were not executed under the existing inspection restriction. Keyboard, actual microphone/browser speech, visual/mobile interaction and an explicitly authorized live billed cleanup remain release gates. Plan 017's pending browser/live API/real Codex/editorial gates remain pending as well.
