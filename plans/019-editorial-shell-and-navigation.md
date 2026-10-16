# Plan 019: Give publications and content a shared editorial shell

> Executor: work in an isolated branch; preserve user changes; complete the gates below. Update status only with actual evidence. No merge/push without operator instruction.

## Status and drift

- TODO · P1 · effort L · risk MED · direction/architecture/UI.
- Depends on 018's typed entry states and stable create operations. No requirement to configure AI.
- Planned 2026-10-16 at `939adc5c2dbb36034fd2def4f4a395ba708d7be0` plus uncommitted Luna/Sol changes. Run `git diff --stat 939adc5..HEAD -- src/app src/components/kessel-run src/lib/kessel-run tests/e2e docs` and `node plans/2026-10-16-ui-review/check-baseline.mjs`. Reconcile intentional 018 changes against the contracts below; stop for unrelated behavioral drift or missing model changes.

## Why

The prototype separates publications, all content and voice work. Production has only Overview/settings navigation and repeats voice setup before publication and piece content. Settings switches to a different palette, and the font token makes both screens render Times. Restore a consistent structure so the user can find a publication, see progress and resume writing.

## Current state / conventions

- `src/components/kessel-run/app/workspace.tsx:207`: `<nav aria-label="Workspace">` contains Overview and API & agent settings only; brand uses `<Feather size={23} />`.
- `workspace.tsx:223`: `{publication && !output && ...}` renders the full voice studio before content. Line 226 renders flat pieces/outputs grids.
- `workspace.tsx:18`: exported `AppButton` wraps Base UI Button with `data-static`; child components import it from their parent, forming circular imports.
- `src/app/kessel-run/publications/[publicationId]/page.tsx` awaits Promise params and renders keyed `WritingWorkspace`; match installed Next16 conventions.
- `src/components/kessel-run/app/settings.tsx:75`: separate `<main className="mx-auto max-w-2xl ...">`; `src/app/kessel-run/loading.tsx:5` similarly bypasses shell.
- `src/app/globals.css:11`: `--font-sans: var(--font-sans)`; `src/app/layout.tsx:8` defines `--font-geist-sans`. Browser confirmed Times.
- `globals.css:134,176`: desktop grid becomes one column on mobile but min-height grid row distribution leaves a large blank sidebar region.
- Prototype reference: `artifacts/kessel-run-app.html:775–780` defines Overview, All content, Voice studio, publication links and progress board. Treat its sample data as illustration only.
- Preserve durable entity IDs, strict typed service responses and `aria-current` convention already used for independent outputs at `workspace.tsx:225`.

## Scope

Modify current routes under `src/app/kessel-run/` except legacy `projects/`; add shared layout and `content/`, `voices/` pages; modify `src/components/kessel-run/app/` only for shell/control extraction, navigation and overview/publication presentation; add pure progress selectors/tests under `src/lib/kessel-run/`; `src/app/globals.css`; `src/app/layout.tsx` only if font binding needs it; route loading skeletons; `tests/e2e/{workspace,onboarding}.spec.ts` and new `navigation.spec.ts`; `docs/kessel-run-app.md`; plan/index.

Out of scope: persistence schema, AI provider changes, key management behavior, voice approvals, desk editing/recovery rewrite, drag/drop status writes, publishing, logo integration (022). Preserve existing plain Markdown and independent output pins.

## Destination contract

- `/kessel-run`: overview. Empty state from 018; otherwise publication cards and recent/active work. New publication remains discoverable. Never seed prototype publications.
- `/kessel-run/content`: All content. Publication and status filters, readable progress board/list and empty results with clear reset action.
- `/kessel-run/voices?publication=<id>`: dedicated voice destination. Initially host existing studio/import functionality there; 020 improves it. Resolve selection from real IDs; invalid IDs show an unavailable state, not unrelated content.
- `/kessel-run/publications/<id>`: publication desk, New piece, content list/board, compact approved-default voice summary with Manage voice link, and publication settings/presets actions. No expanded assistant on normal publication/piece landing.
- Existing piece/output routes stay valid. Add breadcrumbs Publication → Piece → Output where applicable. Unknown IDs get an explicit missing-item view and safe navigation.
- Settings remains `/kessel-run/settings`, with Workspace, AI connection and Agent connections sections, common navigation and colors. AI stays optional; keep explicit connection-test cost notice at that action, not as onboarding copy. Preserve currently selected credential source and Luna/Sol catalog behavior.
- Shared sidebar: Overview, All content, Voice studio, named publications, New publication, Settings. Use real links and `aria-current="page"`; labels and icon weight are consistent. Mobile uses compact header and accessible expandable navigation, with focus return/Escape behavior. Do not turn the desktop sidebar into a tall first grid row.

### Progress semantics

Ideas = pieces with zero outputs. Drafting / Review / Ready = outputs with persisted `drafting` / `review` / `accepted`, displaying parent piece + format. Ready is **approved for export**. Count outputs and ideas explicitly; never label all outputs ready from one accepted sibling. No synthetic stage changes or drag/drop in this plan. Maintain a list alternative on narrow screens, without a four-column overflow trap. Empty columns, zero publications and filtered no-results each have distinct useful copy.

## Steps

### 1. Extract independent shell and controls

Move AppButton/Field to leaf UI modules; update direct child imports without behavioral changes. Add one shell used by real application routes and loading. Preserve 018 entry state machine. Avoid nested `<main>` elements or duplicate navigation. Fix sans binding to Geist and mobile row sizing. Keep existing dark tokens and light writing paper.

**Verify:** `npm run typecheck -- --incremental false` and `npm test -- src/components/kessel-run/app` → exit 0. `rg -n "from './workspace'" src/components/kessel-run/app` → no AppButton imports remain (route/controller imports must be justified).

### 2. Add navigation and truthful progress selectors

Create pure functions selecting publication work and grouping ideas/outputs. Add routes and link state. Use existing overview data; no new storage model. Do not refactor polling/editor state here. Show an unavailable-item state rather than falling back to overview for bad route IDs.

**Verify:** `npm test -- src/lib/kessel-run/progress.test.ts` → pass new cases: no outputs, mixed sibling statuses, multiple publications, accepted output with drafting sibling, empty filter and unknown IDs. `npm run typecheck -- --incremental false` → exit 0.

### 3. Compose publication home, studio destination and settings

Extract current presentation into focused route views. Retain working import/proposal/approval actions under Voice studio. Publication home leads with work, not AI controls. Preserve dirty-output buffers on navigation; keep the existing guard until 021 explicitly improves it. Render loading in the same shell with bounded widths and static reduced-motion fallback.

**Verify:** `npm run test:app:e2e -- tests/e2e/navigation.spec.ts` → new tests pass across the three configured projects. Cover active links, publication switching, browser back/forward, settings continuity, unknown IDs, filtering and no horizontal overflow at 390px. Assert computed sans font includes Geist rather than Times. Use disposable fixtures, not the user's workspace.

### 4. Verify visual and keyboard continuity

Capture overview empty/populated, publication, content, studio, settings and loading at desktop/tablet/mobile. Walk navigation by keyboard, including expandable mobile nav and focus restoration. Inspect headings/current location without relying only on color. Assert that a piece's independent statuses remain visible.

**Verify:** `npm run test:app:e2e -- tests/e2e/onboarding.spec.ts tests/e2e/navigation.spec.ts tests/e2e/workspace.spec.ts` → pass. If browser execution is blocked, report which states remain unverified and do not mark fully accepted.

## Commands / done

Use Node ≥22.13 and npm; `npm ci` only in a fresh executor checkout. Read installed Next routing/layout/font guides before coding. Branch suggestion `codex/019-editorial-shell`; descriptive commit style, e.g. “Add publication navigation and shared editorial shell.”

Required final gates: `npm test`, `npm run typecheck -- --incremental false`, `npm run lint`, `npm run skills:check`, `npm run build` → exit 0 (record existing lint warnings separately). Run build isolated from the user's running dev checkout. E2E commands above pass with no inference or real content changes. Diff stays in scope and index records actual browser coverage.

## STOP / maintenance

Stop for changed storage/approval requirements, disappearing editor recovery, missing Luna/Sol baseline, unexpected dependency drift, out-of-scope edits or a gate failing after two reasonable attempts. Read-only browser permission does not authorize testing writes against the user's content; use isolated fixtures.

Future output states must be explicitly mapped by the pure selector. All route additions use the shared shell and leaf controls. Keep selected publication in URL/navigation state; don't persist one global selection that leaks into a different route. Detailed studio and desk work follows in 020/021; do not duplicate it here.
