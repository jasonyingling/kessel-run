# Plan 022: Finish UI states and integrate the Run mark

> Executor: work in isolation, follow the gates and preserve the model-fix baseline. Update status with evidence. No merge/push without operator instruction.

## Status / drift

- IN PROGRESS · final integration authorized after reviewed021 merge. P2 · effort M · risk LOW–MED · UI/correctness.
- Depends on 019–021 for final shell/studio/desk surfaces; the handoff-file bug can be fixed earlier as a scoped unit.
- Planned 2026-10-16 at `939adc5c2dbb36034fd2def4f4a395ba708d7be0` plus uncommitted Luna/Sol changes. Run `git diff --stat 939adc5..HEAD -- src/app src/components/kessel-run src/components/ui/skeleton.tsx public tests docs` and `node plans/2026-10-16-ui-review/check-baseline.mjs`. Reconcile expected 018–021 changes; unexpected contract drift or missing model fixes means STOP.

### Final integration reconciliation

018–020 are reviewed and merged. The reviewed021 source candidate is `f79e30b`; final execution waits for the primary's independent browser gate and merge. The original hash checker is expected to report predecessor changes; it is not an instruction to restore old implementations. Preserve the shared shell/leaf controls, publication-first operation identities, scoped studio recovery and exact voice pins, connected creation, brief conflicts, retained desk panels, dictation provenance/undo, save ownership, immutable revision cache and receipt/context-bound exports. Final source scope is presentation and assets only. The early022 handoff/mark unit is already merged; independent icon/skeleton commit `4f2efdf` remains on the executor branch and must be retained when merging the approved main baseline into that branch.

The primary inspected021 desktop Outputs and tablet conflict captures: layout is intact, while composer-note contrast and the adjacent settings-link/refresh-button spacing remain within this final polish scope. Capture screenshots at scroll top after fonts, layout and status settle. Keep provider/model behavior, authentication grants and editorial contracts unchanged.

### Focused verification refinement after two-repair stop

The first browser gate found two genuine transition defects: pointer-scale residue when keyboard focus arrives, and intermediate disabled-background contrast. Scoped CSS corrections cancel transform interpolation on keyboard focus and transitions on disabled controls. Both pass the follow-up browser checks. A subsequently strengthened focus assertion must use a real keyboard gesture: after pointer-hover contrast, focus the preceding Markdown preview summary, press Tab to the link, assert the link is focused, then check visible outline style, width of at least2px and contrast. Programmatic link.focus() after hover does not establish keyboard modality and is not a valid test of :focus-visible. The primary reviewed that gesture mismatch and authorizes this narrow test correction and a fresh final gate; retain the stronger assertions and all handoff client-consumption checks. No additional source redesign is authorized. Distinguish CSS zoom, served icon assets and source skeleton checks from actual browser zoom, tab-chrome rendering and runtime skeleton animation.

## Why / current state

Polish needs to survive every surface and state. The current dark shell uses pale links even on light paper, static cards advertise hover, settings/loading use another theme, and handoff selection can act on stale file contents. The generic Feather should become a recognizable original mark. This plan finishes the redesigned surfaces without adding ornamental animation or replacing working controls.

- `src/app/globals.css:153,168`: app links `#b8ccff`, paper `#f2f4f8`; declared contrast approximately 1.45:1. `markdown-preview.tsx:7` emits normal links inheriting those styles.
- `globals.css:195`: composer note uses root `--muted-foreground` rather than app palette.
- `globals.css:173`: `.kr-card:hover` affects static articles; `.kr-action:hover` includes disabled controls.
- `src/components/ui/skeleton.tsx:7`: `animate-pulse` has no reduced-motion guard. `src/app/kessel-run/loading.tsx:9`: `w-96` inside a padded layout. Shell work may already replace these; reconcile rather than duplicate.
- `handoff-import.tsx:28`: `setPreview(null)` does not clear prior `markdown` for invalid file; `file.text().then(setMarkdown)` can resolve out of order.
- `workspace.tsx:207` uses Lucide Feather as brand. Prototype `artifacts/kessel-run-app.html:775` uses a small orbit. Neither is the new identity.
- Existing `AppButton` preserves `data-static`, exact .96 press and explicit 150ms transitions. Retain that convention. `MarkdownPreview` disables raw HTML and remote images; do not weaken it.

## Scope

`src/app/globals.css`; shared shell/controls created by 019; `src/components/kessel-run/app/{handoff-import,markdown-preview,dictation-composer}.tsx` and focused helper/tests; app loading components; `src/components/ui/skeleton.tsx`; new `src/components/kessel-run/brand.tsx`, `public/kessel-run-mark.svg`, `src/app/icon.svg`, deliberate favicon replacement if needed; `src/app/layout.tsx` only icon metadata; `tests/e2e/ui-polish.spec.ts` (new) and affected existing assertions; `docs/kessel-run-app.md`; plan/index.

Out of scope: schema/provider changes, key handling, editorial workflow redesign, new theme toggle, new animation dependency, blanket restyling of legacy pages, prototype changes and user content. SVG concept assets under `plans/2026-10-16-ui-review/` are design inputs, not deployed assets.

### Reviewed integration details

Parallel execution refinement: after reviewed020, the existing022 executor may finish the independent `src/app/icon.svg`, `src/app/favicon.ico` and generic `src/components/ui/skeleton.tsx` unit in isolation while021 works. These files do not overlap the desk contract or presentation. Preserve the approved mark geometry and perform asset/XML checks and focused type/lint checks. Do not integrate shell, shared CSS, connection controls, workspace wording or final UI/browser tests until reviewed021 is available; stack onto that reviewed base before completing the whole plan. This independent unit is not final022 acceptance.

019 already fixes the Geist binding and uses bounded, static application loading skeletons; preserve those instead of duplicating the work. Include `connections.tsx` only for shared leaf controls, panel styling and settled-state browser evidence; its connection grants, authorization and token behavior must remain unchanged. Include publication-card count wording in `workspace.tsx` for correct singular/plural labels. Existing AgentConnections native borders and disabled controls need the same visual checks as Settings. The current favicon has 16/32/48/256px entries; deliberately replace it with the planned coherent 16/32/48 set. Installed Next16 file-based icon metadata supports the favicon and icon.svg without adding redundant layout metadata. Use existing local image tooling rather than introducing a generation dependency.

## Design specification

- Shared shell stays deep navy; writing paper remains light. Fix links with a paper-scoped readable color plus persistent underline. Use app-muted token on dark composer notes. Assert ≥4.5:1 for ordinary text and ≥3:1 for essential control boundaries/focus against adjacent surfaces. Check computed runtime colors, including hover/focus/disabled; disabled contrast is not a blanket reason to hide state labels.
- Borders communicate structure, selection and focus. Retain them. Use existing low-opacity white ring for dark elevated panels. Only fix concentric radii for close, evenly inset surfaces: outer = inner + padding; layers beyond 24px padding or asymmetric inset are independent. Do not turn every divider into a shadow.
- Interactive cards alone have hover; disabled controls never scale or gain actionable hover. Preserve focus outlines. Pointer press scale is exactly 0.96 with `static` escape and no scale under reduced motion/keyboard focus.
- High-frequency response is instant or opacity/color ≤150ms; name transition properties. No `transition: all`, staged page entrance or speculative `will-change`. If an icon actually changes state and needs animation, use opacity 0→1, scale .25→1, blur 4→0, Motion spring duration .3/bounce 0; if CSS, curve `cubic-bezier(.2,0,0,1)`. Include static label/color cue and reduced-motion fallback. Do not animate icons merely because a library exists.
- Keep Lucide for controls: currentColor, stroke 1.5 next to regular text, 2 next to semibold; use consistent native sizes. Brand artwork is distinct from control-icon strokes. Loading uses bounded fluid widths and motion-safe pulse with static reduced-motion state. No page-wide horizontal overflow at 390px or 200% zoom.

## Logo assets

Use `plans/2026-10-16-ui-review/kessel-run-mark.svg` as the canonical geometry: two filled shapes form a split K, with forward-cut arms and a simple silhouette. `logo-preview.svg` shows dark/light use and 16/20/24/28/32px samples. These are concept assets created in this planning turn, not a claim of final browser-tab validation.

Implement inline `KesselRunMark` using the same path geometry and currentColor, width/height props and no baked-in text. Use 28px desktop and 24px compact header unless real screenshot alignment warrants a documented correction. Visible “Kessel Run” supplies accessible link name; adjacent SVG is aria-hidden. Standalone icon-only use needs a name. Do not mirror the logo in RTL.

Standalone favicon uses self-contained contrasting colors; it cannot inherit page currentColor. Read installed Next icon metadata docs, inspect the existing ICO, and deliberately choose one coherent set of 16/32/48px ICO entries plus icon.svg if needed. Avoid competing stale assets. Preserve exact geometry between inline and standalone assets. No script, external resource, font dependency, filter or raster embedded in the canonical mark.

## Steps / verification

1. **Fix handoff selection identity.** Clear content/preview immediately on every selection; show selected filename and reading/error state. Associate each asynchronous read with a monotonically increasing selection generation; ignore stale results/errors. Empty/invalid/oversize file disables preview. Freeze the reviewed content/hash through confirmation; prevent an old preview from importing after selection changes. Preserve existing empty-workspace-only restoration rule and explicit confirmation.
   - Verify: `npm test -- src/components/kessel-run/app` → new selection helper tests pass for A→B out-of-order, invalid B after valid A, read failure, cancel selection and preview/confirm identity. Add browser assertion that visible filename and preview match.
2. **Finish surface, icon and motion rules.** Apply scoped tokens and enabled-only interactions; verify skeleton behavior. Use the same leaf controls across settings/studio/desk. Keep plaintext/privacy notes readable.
   - Verify: `npm run typecheck -- --incremental false` and `npm run lint` → 0 errors. `npm run test:app:e2e -- tests/e2e/ui-polish.spec.ts` → computed paper-link contrast, app font, disabled states, motion preference, no overflow and handoff identity cases pass.
3. **Integrate the SVG identity.** Add shared mark, public asset and app icons; replace Feather brand without replacing navigation iconography. Inspect 16/20/24/28/32px at 1×/2× on white and navy, plus real browser tab and keyboard-focused brand link.
   - Verify: `npm run build` → exit 0, app icon routes generated; `npm run test:app:e2e -- tests/e2e/ui-polish.spec.ts` → brand accessible name and served icon asset checks pass. XML validation of new SVGs succeeds, and no external resource/script is present.
4. **Complete state review.** Capture empty/populated/loading/error/success states for entry, publication, studio, desk and settings. Walk hover/focus/active/disabled states. Replay any actual state animation at 10% speed where tooling supports it, then test reduced motion. Record unavailable checks as Not verified, not passed. Check keyboard tab order, status announcements, 390px layout and zoom; don't add snapshot tests that merely mirror every component.
   - Verify: `npm run test:app:e2e` → all configured projects pass using isolated fixtures, without live model/microphone calls. Attach screenshots and a concise state checklist to execution notes.

## Final gates / done

`npm test`, `npm run typecheck -- --incremental false`, `npm run lint`, `npm run skills:check`, `npm run build` → exit 0, with prior warnings identified. Build in an isolated checkout. Canonical SVG XML and application asset paths validate; the same logo appears in shell and browser tab; no stale import preview can be confirmed. All HIGH UI findings must be resolved before acceptance. Unverified states stay explicit; never call the whole UI approved based only on source.

Use Node ≥22.13/npm, `npm ci` only for fresh checkout, installed Next16 icon guides and better-ui skill references. Branch `codex/022-ui-polish-brand`; descriptive commits. Do not add dependencies solely to animate the logo.

## STOP / maintenance

Stop for relaxed sanitization, changed restoration permissions, altered editorial contracts, unexpected baseline drift, out-of-scope work or a gate failing twice after reasonable fixes. If the logo is not legible at 16px, refine the geometry and present the updated concept instead of adding fine detail or a different unrelated icon. Keep future brand assets synchronized and future surface colors scoped to their background. No motion should become the only indicator of state.
