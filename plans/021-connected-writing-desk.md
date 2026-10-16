# Plan 021: Connect idea creation, writing, review and export

> Executor: implement on an isolated branch; run every gate and preserve existing user changes. No merge/push without operator instruction. Record actual verification in plan/index.

## Status / drift

- TODO · P1 · effort L · risk MED · direction/correctness/performance.
- Depends on 018 stable operations, 019 shell/routes, 020 approved starter voices and real presets.
- Planned 2026-10-16 at `939adc5c2dbb36034fd2def4f4a395ba708d7be0` plus uncommitted Luna/Sol work. Run `git diff --stat 939adc5..HEAD -- src/components/kessel-run/app src/server/kessel-run/workspace src/app/api/kessel-run/local/content src/lib/kessel-run src/app/kessel-run tests docs` and `node plans/2026-10-16-ui-review/check-baseline.mjs`. Map expected predecessor extractions to their new files; STOP for unrelated contract drift or missing model fixes.

## Why / current state

Current create forms save a piece, then require the user to find it, add an output, find that output and open it. The desk stacks review ahead of writing; a saved brief cannot be edited. Export can silently download older text than the dirty editor. Restore the prototype's focused flow while retaining production revision safety.

- `workspace.tsx:172–175`: createPiece/createOutput results are ignored before refresh. Services already return `{ id, link }` at `service.ts:231,264`.
- `workspace.tsx:214,224`: mode only chosen at creation; brief displayed in `<pre>{piece.body}</pre>`.
- `src/app/api/kessel-run/local/content/route.ts:8`: action enum has no piece-update.
- `workspace.tsx:179–195`: `saveEditor` snapshots `editorRef.current`, uses expected output/context hashes, calls `acknowledgeSave`, retains newer edits and stores recovery. Preserve this behavior.
- `workspace.tsx:197–202`: export fetches persisted handoff; line 225 allows it when `dirty`.
- `workspace.tsx:115–134`: 1500ms poll reassigns context; `review-decisions.tsx:24–39` reacts to new pending-array identity and reloads D draft + 2L lesson revision texts.
- `review-decisions.tsx:59–74` separates use-candidate, exact-final acceptance and scoped lessons. Those are different decisions, not one wizard checkbox.
- Prototype `artifacts/kessel-run-app.html:785,796–810`: Brief & sources / Write & review / Outputs, short creation flow, independent outputs and optional lessons.
- Domain: a piece is the shared brief/sources; each output has its own prose, preset, voice/author pins, revisions and final acceptance. Ready means approved for export, not published.

## Scope

`src/components/kessel-run/app/{workspace,writing-panel,review-decisions,dictation-composer,editor-state}.tsx` or `.ts` as existing, and extracted desk/create/review/polling modules/tests; existing shell/controls only for integration; `src/app/kessel-run/{pieces,outputs}/`; `src/server/kessel-run/workspace/{service,schema,import-export}.ts` plus focused service/import-export tests; `src/app/api/kessel-run/local/content/route.ts` plus tests; `src/lib/kessel-run/app-contracts.ts`; `src/app/globals.css` desk rules; `tests/e2e/{workspace,dictation}.spec.ts` and new `writing-desk.spec.ts`; `docs/kessel-run-app.md`; plan/index.

Out of scope: AI routing, new generation pipeline, credentials, MCP permissions, storage migration, implicit acceptance, publishing/scheduling, rewriting sources or automatic repinning. Source capture and dictation provenance must remain exact.

## Target behavior

### Create and resume

Short New piece flow: publication (preselected in publication context), working title/idea, optional brief; then first output preset and writing approach. Guided/Fast describes optional AI collaboration, not permission to create or manually write. Without an approved voice offer **Save idea** and **Create a starter voice**. Return after voice approval without losing the form. With a voice show its exact version and optional compatible author.

Create the piece with a stable command ID, retain its returned identity, then create the output with a separate stable command ID and current expected hash. Persist resumable operation state if the second operation fails; retry only the incomplete step. Do not create duplicate pieces or silently drop a saved idea. Navigate via the real returned link. Cancel after partial success keeps the saved idea visible.

### Desk structure

Breadcrumb and title; three views: **Brief & sources**, **Write & review**, **Outputs**. Use real URL-backed view state or accessible tabs, with back/forward behavior specified in tests. Default a new idea to brief, existing output to writing. Output selector stays visible. Desktop pairs paper editor and writing assistant; narrow layout stacks them without hiding save/export/state.

Brief view edits title, brief and approach via new hash-checked `piece-update` command. Match `updatePublication`'s strict parser/transaction pattern; do not rewrite source snapshots or outputs. A changed piece context must invalidate stale AI/editor commands through the existing context fingerprint. Report conflict and preserve local brief/prose. Confirm by inspecting `getContext` before extending it; don't add a parallel hash system.

Sources show supplied notes/interviews and attribution, with raw recognition behind disclosure. Keep plan 008's direct-field Dictate/Stop dictation, editable text, Clean text preview/Undo and explicit Send or Save source. Missing AI disables only optional cleanup/generation, not typing, dictation capability or source saving. Hide credential-source/model plumbing in an assistant settings disclosure; show clear one-time Connect AI action only when needed.

Writing view leads with saved/unsaved/conflict state and editor. Assistant has plain **Send** with model and billing context nearby; no new request is made on route entry. Review is contextual alongside/below writing: retained candidate comparison, explicit use/reject, exact final approval and optional lessons. Don't force an immediate lesson modal after approval. Separate generation state from saved editorial state.

Outputs view lists each format, status and exact selected voice/author; Add output reuses the resumable flow and starts an independent draft. Changing the publication default never changes existing pins.

### Honest export and responsive saves

When clean, **Export Markdown** exports current saved prose. When dirty, **Save and export** snapshots the visible buffer, saves it through existing hash checks, then exports only if current buffer, saved receipt and exported revision still match. If the user types during save, another client saves, or save fails/conflicts, retain all text and stop the automatic download with clear retry guidance. Do not silently accept final prose. Extend the export action with optional expected revision/output hash/context hash, pass them through `exportOutput` in `import-export.ts:8` into `WorkspaceService.exportSnapshot` at `service.ts:310`, and compare them inside its existing `journal.readLocked` callback against the exact exported snapshot. Return exported revision/hash/context identity alongside the handoff so the client can verify it. A separate preflight read is insufficient because it races with another writer. Stale exports return conflict before download; existing callers omitting expectations retain their documented saved-export behavior.

### Polling

Cache retained revision text by workspace ID + output ID + immutable revision ID (and hash when supplied). Derive pending revision keys rather than depending on new array identity. Fetch missing revisions only, discard late responses on output changes, and retain error/retry state. Keep external context detection even when user text is dirty; never suppress it just to avoid requests. An unchanged poll should cause zero extra revision-text reads after the initial load. Measure with request counts in deterministic tests, not a guessed performance percentage.

## Steps / gates

1. **Add piece update and receipt-bound export contracts.** Extend strict dispatch/service; test stale piece hash, unchanged output pins, changed context invalidating old commands, unchanged source snapshots and export conflict. Preserve old clean export callers if adding optional expected revision fields.
   - Verify: `npm test -- src/server/kessel-run/workspace src/app/api/kessel-run/local/content` → all pass, including new edit/context/export cases.
2. **Implement resumable piece + first-output flow.** Reuse 018 operation helper; support idea-only and return from starter voice. Store returned identity after each successful step; validate allowed return destinations within app routes.
   - Verify: `npm test -- src/components/kessel-run/app src/lib/kessel-run` → pass new tests for lost responses, partial success, second-step retry and cancellation without duplicates; `npm run typecheck -- --incremental false` → exit 0.
3. **Compose desk views without losing editor safety.** Move presentation into focused modules. Keep editor refs, dirty recovery and output-specific keys in a stable owner across tabs; save/reconcile before crossing outputs. Add keyboard-accessible tabs/navigation and meaningful pending/error announcements. Implement Save and export contract.
   - Verify: `npm test -- src/components/kessel-run/app/editor-state.test.ts` → existing cases plus typing-during-save and export guards pass. `npm run test:app:e2e -- tests/e2e/writing-desk.spec.ts` → creation-to-desk, brief edit, dirty navigation, conflicts, truthful export and independent-output status pass on all projects.
4. **Eliminate unchanged revision refetches.** Add a small cache/selector with race handling; leave transaction and context checks in place.
   - Verify: `npm test -- src/components/kessel-run/app` → new deterministic request-count tests assert zero extra revision reads for unchanged poll, one fetch per newly referenced revision, no late output crossover and working retries. Browser external-change test still surfaces conflict without replacing local prose.
5. **Verify end-to-end editorial decisions.** Use isolated synthetic fixtures for optional generation; separate no-key manual flow. Exercise clean/dirty export, draft rejection/use, final acceptance, post-acceptance edits and scoped lesson proposals. Keep dictation tests against same-field editing and cleanup undo.
   - Verify: `npm run test:app:e2e -- tests/e2e/writing-desk.spec.ts tests/e2e/workspace.spec.ts tests/e2e/dictation.spec.ts` → pass all configured viewport/motion projects. No billed provider call is necessary.

## Final gates / done

`npm test`, `npm run typecheck -- --incremental false`, `npm run lint`, `npm run skills:check`, `npm run build` → exit 0, baseline warnings recorded separately. Capture actual populated desk/review/outputs screenshots at 1440/768/390px, keyboard paths, saved/dirty/loading/error states and reduced motion. Record Not verified for blocked checks. Scope diff is clean, manual path makes no inference requests, and exact approval/provenance tests remain passing.

Use Node ≥22.13/npm; `npm ci` only in fresh checkout. Read installed Next docs before changing routes. Suggested branch `codex/021-writing-desk`, descriptive commits. Build away from the user's running checkout.

## STOP / maintenance

Stop for lost dirty buffers, hidden automatic approval, replacement of immutable source/revision content, inability to bind export to its saved revision, expanded MCP privileges, unrelated baseline drift or out-of-scope work. Stop after two failed repair attempts at a gate. Reviewers should scrutinize context hashes, async editor ownership and partial-success recovery, not only screenshots. Future routing changes must preserve these contracts; future cached revisions must remain scoped by output identity.
