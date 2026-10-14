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
