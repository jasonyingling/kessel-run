# Local app implementation checkpoints

## Phase 1: synthetic API connection slice

## Human decisions and portable restoration

Use a draft candidate only after reviewing its exact retained prose. This does not accept a final. Save human edits, then accept one exact current revision; a new immutable human final snapshot retains the accepted bytes. Later prose edits clear acceptance without changing old machine/final files.

Review lesson evidence against the exact retained machine/final pair. Approve/reject selected rules separately; unselected lessons remain pending. Approved rules append to a new publication or author version. Existing output pins remain unchanged. A newer approved base causes a conflict instead of replacing its rules; reject the outdated proposal or review/rebase through the voice editor. Author rules retain their exact approved publication parent.

Voice edits create immutable draft versions. Human approval creates a separate approved version, preserving both the candidate and earlier approved rules. Compare the displayed previous/proposed rules before deciding. Profile approval, prose acceptance and lesson approval are separate browser capabilities; no model/MCP tool exposes them.

Markdown export includes actual source/interview text, artifacts, proposed rules and lesson decisions, pending candidate prose, exact retained revisions/context, and a validated restoration block. Both readable text and restoration data come from one cross-process locked snapshot. It excludes private run records, tokens and credentials. Restoration requires an explicit preview and confirmation into a new empty app workspace; it preserves exported editorial records, identities and exact prose, and refuses existing content or unsafe/unowned paths. This is distinct from copying private state as a backup.

Requires Node 20 or later. Install dependencies with `npm ci`, then launch
`npm run app:dev`. The launcher binds to `127.0.0.1` and prints a single-use
browser pairing link, valid for ten minutes. Pairing establishes an HttpOnly,
SameSite=Strict session. Browser mutation routes require exact Host/Origin and
CSRF headers. `npm run build` followed by `npm run app:start` uses the same
loopback launcher.

Settings lets the user explicitly select a saved local OpenAI key or the server
`OPENAI_API_KEY`. Status checks do not make model calls. Keys stay outside chat,
content exports and browser storage. The saved-key fallback is an owner-only
local file at `~/.local/share/kessel-run/credential.json`; this checkpoint does
not integrate OS keychain storage. `KESSEL_RUN_PRIVATE_ROOT` selects a different
owner-only directory outside app and content roots. Symlink traversal is
rejected and existing private-directory/file permissions are tightened. Save,
replace and remove are supported. An unavailable selected source does not fall
back to the other source.

The server-owned model list currently contains `gpt-5`. The settings connection
test sends synthetic supplied notes and can incur API charges. It must record
both a completed stream and a saved synthetic candidate before reporting
success. Its maximum duration is one minute, four tool steps and 400 output
tokens; provider retries are disabled. Stop aborts the provider signal. Safe run
records retain messages, tool events, provider/model, completion state and
provider-reported usage outside exported content.

For an explicit billed CLI test, use a fresh pairing token from the launcher:
`npm run app:smoke:api -- PAIRING_TOKEN saved` (or `environment`). This command
prints only the completed run/candidate identifiers and provider usage, not the
key. Do not paste a model API key as the pairing argument. Pairing tokens and
model credentials are distinct.

### Checkpoint limits

This is a bounded synthetic slice, not completed publication writing. Candidates
from the connection test occupy private synthetic records, never user prose.
Durable editorial Markdown, operation journals/idempotency and profile pins are
Phase 2. Cross-process stop routing, orphan-run recovery, remove-key cancellation,
chat deduplication/reconnect and scoped writing history are Phase 5. Stable
workspace identity belongs to Phase 2; the initial launcher pairing scope is
not yet a persisted content workspace. MCP and approvals are not implemented.
Legacy routes are not the supported local release entry path; explicit legacy
guards remain a Phase 7 requirement.

No live API credential was supplied during implementation. Live streaming and
billed smoke verification remain pending. Browser policy blocks inspection and
browser execution; no visual, keyboard, mobile or reduced-motion acceptance is
claimed. Source implementation and permitted unit/SDK/HTTP verification continue
under the amended plan.

## Phase 2: durable Markdown service checkpoint

The shared service creates an explicitly selected empty app-managed workspace.
It refuses existing personal notes; there is no automatic vault or legacy
working-memory migration. Profiles are previewed and imported only through an
explicit human confirmation operation; supplied prose remains byte-identical.
Sparse approved profiles are supported. Publications have readable preset notes;
initial preset labels contain no invented format instructions.

Canonical content occupies `Kessel Run.md`, `Publications/`, `Voice Profiles/`,
`Output Presets/`, and `Pieces/<id>/Brief.md`, sources and independent outputs.
Output files retain complete profile pins and readable relative version links.
Prose revisions have immutable raw Markdown files and separate provenance/context
notes. Candidate proposals retain machine/external text without replacing editor
prose. Context captures all selected source IDs, hashes and text; public source
retrieval paginates. Source URLs are http/https references only, never retrieval
claims. Supplied interview questions and answers remain verbatim with attribution.

Private journals bind to the canonical content root and stable workspace ID.
Reusing them for a different root fails before recovery. The existing LibSQL
client is pinned directly for private SQLite write-transaction coordination;
Markdown remains canonical. SQLite OS locks exclude separate Next/MCP workers
and release on process termination. No Mastra model/observability initialization
is needed for these operations. File and directory fsync precede journal apply
and acknowledgment. Interrupted multi-file changes recover before reads/writes;
intervening external edits produce conflicts rather than being overwritten.
Identical operation IDs return their original result; changed arguments fail.
Rejected stale prose remains in the private journal for reconciliation.

The content index rebuilds from Markdown. Duplicate IDs, corruption, missing
versions and symlink/traversal attempts report errors instead of an empty state.
Externally modifying an immutable voice/source/revision snapshot fails until it
is restored or explicitly imported as a new version. Draft saves check both the
editor hash and the full selected-context hash. Restarted launchers reuse the
configured workspace identity.

Markdown export returns selected prose and a resumable handoff containing actual
rules, sources, selections, decisions and pending work. It excludes private
credentials, tokens, journals and runs. Filenames are sanitized. Raw supplied
HTML remains text; browser preview sanitization/visual testing belongs to the UI
phase and is not claimed by this backend checkpoint.

Remaining phases supply the full HTTP/MCP operation adapters, profile-version
proposal/approval flows, preset editing UI, publication/writing desk UI,
resumable conversations, accepted finals/lessons, and release walkthroughs.
Browser execution and live provider/external Codex checks remain pending.
# Writing conversations and synchronization

The writing desk and publication voice studio persist separate scoped conversation runs. Each turn records its selected credential source, model, Start/Resume hash, exact starting context hash, tool results (including hashes for other workflows actually read), provider usage and terminal status. Streamed text remains provisional; generated prose is a pending saved proposal, never an editor overwrite.

One in-app turn may run per scope. Identical start operation IDs recover the existing run; different arguments conflict. Stop, request disconnect, saved-key removal/replacement and a 90-second duration bound interrupt inference. Dead process owners are marked interrupted on reload. A 95-second recovery bound prevents an unacknowledged terminal-persistence failure from permanently blocking that scope. Committed content survives interruption; ambiguous generation is never automatically replayed.

The app refreshes saved workspace/source activity independently of chat. Dirty prose is preserved, with a per-output session recovery buffer containing prose and revision hashes only. Reconcile external changes explicitly. Save acknowledgements identify the actual committed revision, rather than treating a later read as the acknowledgement.

The server allows `gpt-5` and `gpt-5-mini`; both use the same tested fake-provider text/tool/cancellation adapter. [OpenAI documents text, streaming and function calling for GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini). A catalog claim is not live compatibility evidence: real billed verification remains pending for both models. Models may change between turns; prior run metadata retains the original selection.

Browser/E2E execution, visual/keyboard/mobile acceptance and the real API/Codex/editorial walkthroughs remain pending. Authored browser tests do not establish acceptance.
