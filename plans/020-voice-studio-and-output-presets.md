# Plan 020: Make starter voices and output formats usable without AI

> Executor: follow the gates, preserve user changes and work in an isolated branch. No merge/push without operator instruction. Update this plan/index with actual completion evidence.

## Status / drift

- IMPLEMENTED · awaiting independent final review/merge · P1 · M–L · MED risk · direction/correctness.
- Depends on 018 (stable operations, publication entry), 019 (studio destination/shared controls).
- Planned 2026-10-16 at `939adc5c2dbb36034fd2def4f4a395ba708d7be0` plus intentional uncommitted Luna/Sol fixes. Run `git diff --stat 939adc5..HEAD -- src/components/kessel-run/app src/server/kessel-run/workspace src/app/api/kessel-run/local src/app/kessel-run tests docs` and `node plans/2026-10-16-ui-review/check-baseline.mjs`. Reconcile expected 018/019 extractions; unexpected contract drift or missing model changes means STOP.

## Why / current state

### Reconciled predecessor contracts

018 and reviewed019 candidate `dde48c6` supply the current implementation baseline. The original line references below describe the audited behavior; the same studio and preset logic now lives behind `/kessel-run/voices?publication=<id>`, with `AppButton` and `Field` extracted into leaf modules and a shared `AppShell`. Preserve URL selection, unavailable-ID handling, the publication return link, pending-command recovery and same-document pairing. Only explicit `LocalApiError.outcome === 'rejected'` permits abandoning a command; uncertain outcomes retain their exact identity and body. Existing format/pin validation must continue to accept historical outputs after preset edits: enforce new format agreement only in `createOutput`, not in context reads, schema migration or restoration. Preset hashes already participate in output context fingerprints. Profile exports are standalone exact-text metadata envelopes, distinct from whole-workspace handoff restoration. Expected predecessor drift has been inspected; no model/provider changes are needed. Existing dictation tests also navigate through the studio; narrow navigation/label updates to that suite are in scope while preserving every capture/cleanup/provenance assertion.

A new publication can be created without AI, but its voice path emphasizes an assistant or “Import.” The existing manual voice editor only starts from an approved version. Output creation offers an empty required voice selector. Users should be able to write a few preferences, confirm them, and start writing. Presets also need real format semantics: renaming Article to Newsletter currently retains `format: Article`.

- `workspace.tsx:165–171` previews and explicitly confirms imported prose. Reuse this exact-prose contract; don't invent a model requirement.
- `voice-studio.tsx:30`: the “Approved version” select only edits existing profiles. Lines 31–35 separately approve/reject proposals.
- `service.ts:211–220` stores confirmed imports as approved v1 with `evidenceLevel: 'sparse'`; publication default changes, existing output pins do not.
- `workspace.tsx:162` passes `presets: ['Article', 'Short post']`; line 173 uses selected preset `.format` for outputs.
- `service.ts:403–409`: `changed(preset, { title: parsed.title }, parsed.instructions)` never updates format.
- `schema.ts:24–37` distinguishes publication/author scope, exact parent, approval and evidence maturity. `createOutput` rejects an unapproved publication voice or author with a different parent version.
- Prototype `artifacts/kessel-run-app.html:781,800–805,815` separates profile/authors/evidence and exports a profile. Its preferences interview is not automatic inference; sample evidence/bylines are not real.
- Conventions: strict Zod command parsing, journaled mutations, expected hashes, UUID operation IDs and human decisions. Follow `WorkspaceService.updatePublication`/`updatePreset` and tests in `workspace/service.test.ts` and `approval.test.ts`.

## Scope

`src/components/kessel-run/app/{voice-studio,workspace,writing-panel}.tsx` and studio/preset modules extracted by 019; `src/app/kessel-run/voices/`; `src/server/kessel-run/workspace/{service,schema,import-export}.ts` plus focused tests; `src/app/api/kessel-run/local/content/route.ts` plus tests; `src/lib/kessel-run/app-contracts.ts`; optional pure starter-voice formatter/tests in `src/lib/kessel-run/`; `tests/e2e/voice-studio.spec.ts` (new) and existing workspace/navigation assertions; `docs/kessel-run-app.md`; plan/index.

Out of scope: archive crawler, automatic website import, model/provider replacement, MCP capabilities, skill rewriting, invented voice rules, old-file migration, output repinning and publication of content.

## Target behavior

### Voice studio

Use a publication selector and Profile / Authors / Evidence views. Display the current default and evidence maturity separately. History and proposals are explicit secondary sections. Existing-output pins remain exact when default changes.

For no voice, give equal clear paths: **Write a starter voice**, **Import an existing profile**, and secondary **Get AI help**. Manual path asks for desired reader experience, tone/opinion level, phrases to use/avoid, plus freeform rules; all fields except some actual preference text may be skipped. Assemble only supplied text under descriptive Markdown headings. Show exact resulting prose for editing and explicit **Use these exact preferences** confirmation. Mark provenance as user-authored preferences and maturity sparse. No key, model request, invented traits or silent approval. Keep draft preferences on accidental navigation with the same recovery conventions as other forms; Save for later must actually persist/recover a draft or be omitted.

Import retains verbatim prose and provenance. The user's existing starter profile should be easy to paste/import, not forced through another interview. Author overlay creation selects an exact approved publication parent and requires explicit confirmation; show compatible parent versions and actionable mismatch copy. Evidence shows stored provenance only, with honest no-evidence state and no invented coverage scores.

Voice export returns exact selected profile text/metadata and, for an author overlay, identifies its exact parent. Label selected version and approval/maturity. Generate server-side export through existing authenticated content route/service boundaries. Never regenerate prose with AI and never include private run/session data. Export/import needs byte-preserving prose tests; do not silently convert a standalone profile export into a whole-workspace restoration.

### Output presets

Add a preset through publication settings: display name, actual format, optional instructions. Suggested templates may include Article, Newsletter, Review, Social post and Video script; arbitrary nonempty bounded format text remains supported. Prefer a small initial selection instead of auto-seeding every choice. Clearly distinguish display name and format when editing.

Add a journaled `preset-create` command and extend `preset-update` with optional format (omission preserves existing callers). Check publication ownership, name uniqueness and expected hashes. New output creation must use the selected preset's actual format; reject contradictory supplied format at the service boundary rather than trusting a spoofable UI. Existing outputs retain their stored format and voice pins when a preset changes. Existing instruction-context behavior remains hash-checked; do not introduce retroactive prose changes or claim preset versions are pinned if they are not.

If a user tries Add output without an approved voice, show **Choose or create a voice**, with manual/import routes and a return target. Never present an enabled Save that cannot meet the invariant. Capturing an idea remains possible immediately.

## Steps / verification

1. **Add preset commands and exact voice export.** Extend strict parsing and authenticated dispatch, preserve old `preset-update` callers, use existing transaction/hash patterns. Test ownership, duplicates, stale hash, operation retry, format agreement, export exact text and no private files.
   - Verify: `npm test -- src/server/kessel-run/workspace src/app/api/kessel-run/local/content` → all pass. Confirm existing format and voice pins remain unchanged after preset edits.
2. **Add manual starter flow and prerequisite routing.** Build exact supplied-text preview, optional editing and explicit approval using existing import/approval services. Reuse stable operation helper from 018; return to the pending creation flow by real publication identity.
   - Verify: `npm test -- src/lib/kessel-run src/components/kessel-run/app` and `npm run typecheck -- --incremental false` → exit 0. Add formatter tests proving unanswered fields generate no claims and authored prose remains exact.
3. **Organize studio and preset UI.** Move existing proposal decisions/history into clear views, add exact-version export and honest evidence empty states. Keep AI controls secondary; Luna/Sol options and no-fallback credential semantics are unchanged.
   - Verify: `npm run test:app:e2e -- tests/e2e/voice-studio.spec.ts` → passes all projects. New fixture covers no-key starter, import, author parent mismatch, new approved version with unchanged old output pins, custom Review/Newsletter preset and exact export.
4. **Review keyless journey.** Fresh publication → author starter → confirm → create output with chosen preset → edit manually. Assert no inference request; optional AI help prompts configuration only when chosen. Verify keyboard tab views, mobile stacking and long profile text.
   - Verify: `npm run test:app:e2e -- tests/e2e/onboarding.spec.ts tests/e2e/voice-studio.spec.ts tests/e2e/workspace.spec.ts` → pass. Browser evidence must distinguish no-key manual work from synthetic-provider tests.

## Final gates / done

`npm test`, `npm run typecheck -- --incremental false`, `npm run lint`, `npm run skills:check`, `npm run build` → exit 0; record existing warnings separately. Build only in isolated checkout. All required E2E cases pass and exact profile export is inspected. No API key needed for manual path, no generated rule is silently approved, old output pins/format stay unchanged, and status/index records any remaining browser acceptance gaps.

Use Node ≥22.13/npm (`npm ci` only if fresh checkout); read installed Next docs before code changes. Suggested branch `codex/020-voice-studio`; descriptive commits matching repository style. No dependency upgrade.

## STOP / maintenance

Stop if implementation requires modifying immutable approved profiles, inferring author traits, defaulting to an unapproved voice, changing MCP authorization or replacing stored output versions. Stop for unrelated drift/out-of-scope edits or two failed repair attempts. Keep approval distinct from maturity in future UI. Future preset versioning is a separate design decision; this plan makes current format semantics truthful without claiming immutable preset snapshots.


## Execution evidence — 2026-10-16

Implemented in isolated branch `codex/020-voice-studio` from reviewed baseline `1af3e83`. Baseline drift checks reconciled reviewed 018/019, early 022 and intentional Luna/Sol changes; model/provider behavior was preserved. Read the installed Next.js guides and applied better-ui standards. No dependencies, credentials, real user content, MCP authorization or immutable approved profile versions were changed.

### Completed steps

1. Added journaled preset creation, optional-format updates, membership/name/hash checks and new-output format agreement. Added authenticated standalone profile export with exact prose and whitelisted metadata. Historical output formats/pins remain readable and exportable; empty-instruction export copy uses the output's stored format. Focused workspace/content gates passed (52 tests across 10 files at the backend checkpoint).
2. Added supplied-preference formatting, editable exact preview and explicit confirmation, no-voice prerequisite routing, validated return target and tab-local draft recovery. Focused library/app gates passed (69 tests across 16 files at the UI checkpoint). Strict recovery parsing rejects malformed draft fields.
3. Added Profile/Authors/Evidence views, exact parent selection, selected-version export, prior/proposed comparison and explicit decisions. Added real preset settings with separate display name/format. Captured form hashes reject external preset edits rather than silently overwriting them. AI help is secondary and remains closed until chosen.
4. Verified the full keyless journey through real local launcher fixtures, including no inference, delayed/lost responses, recovery across navigation, exact export, imported long prose, author mismatch, retained draft v2/separate approved v3, old output v1 pins and stored format, and optional AI configuration prompt only after choosing AI help. No API key or paid request was used.

### Review corrections

Independent review identified and verified fixes for late unmounted command completions/failures clearing newer commands, stale previews overwriting recovered drafts, and polled hashes overwriting locally dirty preset forms. Deterministic browser tests hold actual responses across remounts and assert both the current draft and retained storage/command identity. The pre-existing approval service retains proposed v2 and creates approved v3; the browser expectation was reconciled to that contract with explicit authorization after the repair-limit pause. Earlier locator failures were corrected to accessible named textbox/combobox locators without changing product behavior.

### Final verification

- `npm test`: **215 passed, 52 files**.
- `npm run typecheck -- --incremental false`: passed.
- `npm run lint`: passed, **0 errors / 9 pre-existing warnings** in shared AI elements.
- `npm run skills:check`: **15 workspace / 15 runtime references** checked.
- `npm run build`: passed; existing Next NFT tracing warning remains.
- Combined `npm run test:app:e2e -- tests/e2e/onboarding.spec.ts tests/e2e/voice-studio.spec.ts tests/e2e/workspace.spec.ts tests/e2e/navigation.spec.ts tests/e2e/dictation.spec.ts --output=test-results-020-final`: **24 passed** across 1440px desktop, 768px tablet and 390px mobile with reduced motion. Fixture teardown completed; no owned server remains running.
- `git diff --check`: passed.

Screenshots are preserved locally in ignored `test-results/020-final/`; each studio project contains empty, exact preview, uncertain save, approved/exported, preset rejection and long-profile captures. Final desktop approved, tablet preview, mobile approved and mobile preset rejection were visually inspected; content stacks without observed horizontal overflow. Keyboard tab arrows/Home and reduced-motion behavior are automated. No separate slow-motion animation acceptance was performed; studio controls use static shared buttons. Broader visual polish remains plan 022.

The studio and onboarding suites use real disposable keyless local workspaces. Existing dictation/navigation coverage uses synthetic fixtures where established; it is regression evidence, not proof of live provider or microphone behavior. Parent owns the plans index, independent final gate rerun and merge decision. No merge or push was performed by this executor.
