# Local app implementation checkpoints

## Phase 1: synthetic API connection slice

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
