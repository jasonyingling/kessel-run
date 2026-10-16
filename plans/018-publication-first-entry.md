# Plan 018: Open directly into publication creation

> Executor: implement in an isolated branch, follow each verification gate, preserve the existing working tree, and update this plan/index only after review. Do not push or merge without operator instruction.
>
> Drift: planned at `939adc5c2dbb36034fd2def4f4a395ba708d7be0` on 2026-10-16 **plus uncommitted model fixes**. Run `git diff --stat 939adc5..HEAD -- scripts src docs tests` and `node plans/2026-10-16-ui-review/check-baseline.mjs`. Compare changed files with the excerpts below. Missing model changes or unexpected behavioral drift is a STOP condition. The manifest records the actual reviewed source, not just HEAD.

## Status

- Priority P1; effort L; risk MED; category direction/correctness; status TODO.
- Depends on: 017/008 merged; preserve the working-tree Luna/Sol fixes before isolating execution.

## Why this matters

The user wants to enter Kessel Run and create a publication immediately. Currently the launcher opens API settings, the app asks for an empty folder, and only afterward offers New publication. Manual editorial work already requires no model key. Replace this front door while retaining local authentication and recoverable Markdown storage.

## Current state and conventions

- `scripts/kessel-run-local.mjs:44`: launcher emits `/kessel-run/settings#pair=…`; `settings.tsx:27–36` exchanges the fragment once and removes it from history.
- `src/components/kessel-run/app/workspace.tsx:160–175` creates `const operationId = crypto.randomUUID()` inside each submit, then discards create results and refreshes.
- `workspace.tsx:210`: `!state` renders “Choose a new workspace” during loading and failure as well as first use.
- `src/server/kessel-run/workspace/config.ts:16–20` performs `service.initialize(...)`, `ownerWrite('workspace.json', value)`, then reads/writes `session.json`. These are separate operations; content journal locking does not serialize global selection.
- `src/app/api/kessel-run/local/workspace/route.ts:10–11` maps non-access errors to generic 404.
- `src/server/kessel-run/workspace/service.ts:169–178` already creates a publication with no voice or AI and returns `{ id, presets, link }`.
- Follow strict Zod input schemas, `WorkspaceError`, hash comparisons and journal receipts. Example: `journal.ts:121–126` returns a prior receipt only when operation ID **and arguments hash** match. Do not remove that check.
- Domain: workspace is the local content container; publication is the user's editorial identity; pieces contain independent outputs. Profiles can be sparse, but approval is explicit. Credentials and journals stay outside content.

## Scope

Only modify `scripts/kessel-run-local.mjs`; `src/server/kessel-run/workspace/{config,service}.ts` and their tests; add selection/bootstrap modules and tests in that directory; `src/server/kessel-run/local-session.ts` and `src/server/kessel-run/ai/local-session.test.ts` only for guarded selection/session coordination; `src/app/api/kessel-run/local/{workspace,pair}/` and new `bootstrap/` route/tests; `src/lib/kessel-run/{local-api,app-contracts}.ts`; `src/components/kessel-run/app/{workspace,settings}.tsx` and new entry/pairing/operation-state helpers/tests; `tests/e2e/{setup,workspace}.ts` or `.spec.ts` as applicable and new `onboarding.spec.ts`; `tests/e2e/production-http.mjs`; new isolated onboarding fixture helpers under `tests/e2e/` and `playwright.config.ts` only to separate their server lifecycle; launcher tests under `src/server/kessel-run/workspace/`; `docs/kessel-run-app.md`; this plan/index.

Review refinement: the new client retry state must distinguish a known rejected command from an unknown or partially applied outcome. The existing content route maps unexpected failures to `INVALID_INPUT`, and journal recovery may return `CONFLICT` after partial writes; neither code alone proves abandonment is safe. A minimal extension to `src/app/api/kessel-run/local/content/route.ts`, workspace journal/schema and focused tests is in scope to expose authoritative rejection evidence while retaining original IDs through uncertain outcomes.

Test compatibility refinement: `tests/e2e/dictation.spec.ts` is also in scope solely for fixture creation, navigation and retry selectors affected by the new entry flow. Preserve its dictation/cleanup assertions. Fake-provider suites must retain the Synthetic-workspace guard and explicitly create such a workspace; the real no-key onboarding suite remains separate.

Out of scope: UI-wide redesign, presets/voice workflow expansion, provider/model routing, MCP permission changes, portable skill storage, existing user content, `.env` and credentials. Never overwrite, auto-import or relocate an existing notes folder.

## Target interaction and storage contract

1. Launcher opens `/kessel-run#pair=…`. Its current configuration JSON parse can abort before Next starts: allow safe recovery-mode startup when a regular, owner-controlled configuration file is malformed. Preserve that file unchanged, use a temporary unbound session identity, and expose only the recovery screen until explicit repair/selection. Do not weaken symlink, ownership, origin or private-root checks, and never treat corrupt configuration as first use. Shared entry controller exchanges the single-use token, strips it immediately, then loads availability. Keep old settings pairing links functional by using the same controller there.
2. States are explicit: loading, pairing required/expired, genuinely uninitialized, ready, selection changed, unavailable/recovery. Use safe machine-readable codes; only missing configuration (`ENOENT`) means uninitialized. Corrupt JSON/journal, missing pinned versions and denied paths are recovery errors. Do not expose credentials/private absolute paths in generic errors.
3. Paired first-use screen: heading **Create your first publication**, required Publication name, optional What is it for?, primary **Create publication**. Show “Your work is saved as Markdown on this computer.” Storage details are a secondary disclosure; API setup is absent.
4. On explicit create, provision `~/Documents/Kessel Run/Workspaces/<workspace UUID>` through a validated app-owned parent, separate from private storage and repository. Support an injected content parent for disposable tests and an advanced empty-folder override. Validate ownership, symlinks and canonical containment using existing service rules. If the default parent is unavailable, preserve form values and offer location selection; never silently choose an unrelated folder.
5. Persist a durable bootstrap intent in private storage before creating content. It contains stable operation IDs for workspace initialization and first publication, exact validated input, chosen root and progress/receipts. Resume that operation after response loss or process restart. Completion returns the real publication link. Repeated completion returns the same identity.
6. Serialize global selection with a cross-process private-root lock, distinct from per-workspace content locks. Define one lock order (selection then content); no reverse acquisition. Persist selection intent before updating workspace config and session binding; recover interrupted updates under that lock. Bind the intent to the initiating session identity/generation; never overwrite a newly paired/replaced session from a stale operation. Reject concurrent conflicting selection cleanly.
7. Existing valid workspace goes to its overview; adding a publication uses it. Never replace it because loading fails. Advanced Choose folder remains in settings, with explicit empty-folder/import constraints.
8. Client retains the exact logical submission and its operation ID while outcome is unknown. A retry sends the identical snapshot, including expected hashes, to recover the receipt. Editing into a new command waits for reconciliation or explicit abandonment of a known failed command; do not resubmit already committed work with a fresh ID. Keep compact pending-command recovery scoped to session/workspace; clear on successful reconciliation. Do not store keys or pairing tokens there.
9. Navigate to the returned publication link after success. Publication is usable before voice or AI setup. A subsequent page can offer starter voice/import and capture idea; those detailed flows are plan 020/021.

## Steps and verification

### 1. Add typed availability and recoverable selection

Add safe availability codes and typed client errors; keep HTTP authentication/CSRF semantics. Implement global lock/selection intent and deterministic recovery. Extend config tests with concurrent selections, failure after initialization, failure between config/session writes, replaced session and corrupt configuration. Use temp directories and `vi.stubEnv` as in `config.test.ts:8`.

**Verify:** `npm test -- src/server/kessel-run/workspace/config.test.ts src/server/kessel-run/ai/local-session.test.ts` → all selected tests pass. Add route tests in `src/app/api/kessel-run/local/workspace/route.test.ts`; `npm test -- src/app/api/kessel-run/local/workspace` → all pass, with missing versus damaged states distinct.

### 2. Add publication bootstrap

Implement authenticated bootstrap endpoint and service orchestration using the existing initialize/createPublication journaled commands. Hold/recover selection consistently, preserve receipts across restart, and restrict paths. A partial failure must offer Resume creation, not a second publication. Add fault-injection seams only to internal services, never public request fields.

**Verify:** `npm test -- src/server/kessel-run/workspace src/app/api/kessel-run/local/bootstrap` → pass, including identical retry, changed-input conflict, concurrent creation and nonempty/symlink/private-root rejection. Assert exactly one publication on disk after lost response and restart.

### 3. Replace first-run UI and launcher destination

Extract pairing from settings; replace null-state branching with explicit states. Use the target copy and optional location disclosure. Preserve user input on errors, label the primary action while pending, prevent duplicate submits, focus the first error or resulting heading. Retain logical operation identity for existing publication/piece/output/source form submissions too; future UI plans reuse this helper. Settings handles advanced storage selection and optional AI separately.

**Verify:** `npm run typecheck -- --incremental false` → no errors. `npm test -- src/components/kessel-run/app` → pass, including new operation-state tests for exact retries and changed input. `rg -n 'settings#pair' scripts/kessel-run-local.mjs` → no matches.

### 4. Prove a real keyless first-use journey

Add `tests/e2e/onboarding.spec.ts` starting from an isolated private root and actual pairing exchange, **without injecting a session cookie or fake AI provider**. Override content parent to a disposable directory; never use the user's Documents. Create a publication with name only, assert no path/key required and no inference request, reload/restart, and observe the same publication. Include expired pairing, missing config, corrupt journal, lost response and double-submit. Use an onboarding-owned launcher with its own temporary private/content roots and dedicated loopback port, separate from the existing globalSetup server on 3197. It must not prewrite a session or enable KESSEL_RUN_TEST_PROVIDER. Clear inherited provider keys explicitly. Provide deterministic teardown and restart hooks; allow Playwright fixture/project configuration to support this isolation. Keep the existing fake-provider workflow as separate coverage. Add a launcher-level malformed-config test proving the recovery UI can actually start, and retain symlink/ownership rejection tests. Update setup/production HTTP fixtures accordingly.

**Verify:** `npm run test:app:e2e -- tests/e2e/onboarding.spec.ts` → passes desktop, tablet and mobile-reduced-motion projects. `node tests/e2e/production-http.mjs /opt/homebrew/bin/npm`, `node tests/e2e/production-http.mjs /opt/homebrew/bin/npm fake-production`, and `node tests/e2e/production-http.mjs /opt/homebrew/bin/npm fake-dev` → all three modes and new entry/recovery checks pass after build. Resolve the installed npm CLI path if this host differs; the first argument is required. Do not claim browser acceptance if unavailable.

## Final gates / done

- `npm test` and `npm run typecheck -- --incremental false` exit 0.
- `npm run lint` → 0 errors; record pre-existing warnings (baseline had nine).
- `npm run skills:check` exits 0; canonical skills remain untouched.
- `npm run build` exits 0; then production HTTP check above passes. Run build in isolated checkout, not alongside the user's dev server in its checkout.
- Browser screenshots at 1440, 768 and 390px show publication-first empty, loading, error and successful publication states. Keyboard can create and recover; narrow layouts do not overflow.
- No provider key/inference needed; no private token in screenshots/logs; no data migration or approval bypass.
- Review diff against scope and update status with actual evidence, separating technical completion from user editorial acceptance.

## STOP conditions

Stop if safe bootstrap requires relaxing authentication, initializing a nonempty user folder, placing private credentials in content, silently replacing a configured workspace, or accepting a stale session. Stop for unexpected baseline drift, out-of-scope changes or a gate that still fails after two reasonable repairs. Report blocked browser checks rather than bypassing policy.

## Executor references and maintenance

Read applicable installed Next docs under `node_modules/next/dist/docs/` before route/component changes; use existing React/Next16, strict TypeScript, Zod and Vitest conventions. Branch suggestion `codex/018-publication-first`; commit style matches “Add inline dictation and optional reviewable cleanup.” `npm ci` is only needed in a new executor checkout. Do not alter lockfile for this work.

Selection recovery is a security boundary: future multi-workspace support must preserve the global ordering and stale-session checks. New create flows must reuse stable command identities. Keep generic UI errors helpful and secret-free, while preserving specific recovery causes. The shared shell follows in 019; this plan should not attempt that redesign.
