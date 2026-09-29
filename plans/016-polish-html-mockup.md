# Plan 016: Polish the standalone editorial workspace mockup

> **Executor instructions:** Read this entire plan, then execute the steps in order. Preserve the existing editorial workflows and visual identity. Update this plan's row in `plans/README.md` only after recording verification. This is a plan for implementation; no source was changed during planning.
>
> **Drift check:** From the repository root, run `git diff --stat 63177e4..HEAD -- artifacts/kessel-run-app.html artifacts/README.md` and `git status --short`. Both artifact files were **untracked** when this plan was written, so an empty git diff is insufficient. Before your first edit, compare the SHA-256 hashes below with `shasum -a 256 artifacts/kessel-run-app.html artifacts/README.md`. If the files are missing or differ, reconcile the current-state excerpts and report material differences before proceeding. An isolated worktree will not contain these untracked files unless they are explicitly carried over from the source checkout.

## Status

- **Priority:** P1 for feedback/focus fixes; P2 for visual polish
- **Effort:** M
- **Risk:** MED — modal lifecycle and full-page rendering can lose focus or disrupt workflows
- **Depends on:** none; this standalone concept does not require the deferred SaaS plans
- **Category:** tech-debt / UI quality
- **Planned at:** commit `63177e4`, 2026-09-15
- **State:** MERGED — user-authorized fast-forward to `eca1ba9` on 2026-09-19; required browser acceptance remains unverified

## Why this matters

The mockup already demonstrates publication voices, writing, independent outputs, and explicit editorial approvals. Its visual and interaction details are inconsistent: toast text is nearly white on a pale background, keyboard focus is discarded during DOM replacement, cards jump on hover, and icons mix SVG strokes with text glyphs. This plan makes those interactions clearer and more consistent without changing the product model or turning the mockup into the Next.js application.

## Current state and constraints

Repository root: `/Users/miniying/Apps/kessel-run`.

| File | Role / baseline |
| --- | --- |
| `artifacts/kessel-run-app.html` | Current interactive mockup: standalone HTML, inline CSS, inline JavaScript, template-string rendering, in-memory data; 71 physical lines, with most CSS on line 8. SHA-256: `ddc6c5091b9e9ee6c19e4b993c75fd191a801c75e7c13af2a5c02984e5e6c430` |
| `artifacts/README.md` | Walkthrough, visual direction, and prototype boundaries. SHA-256: `53c4cdf3b9d8d4573ee127b2e72a813aed5ba1c7764713e46152053f3cab2d12` |
| `prototype/index.html` | Older pipeline presentation; **not the target**. Do not copy its palette, theme switcher, or stage-rail model. |
| `plans/2026-09-07-product-direction.md` | Publication-first model; voice preferences require explicit approval, outputs retain selected profile versions, production SaaS work follows content validation. |
| `package.json`, `vitest.config.ts`, `eslint.config.mjs` | npm project with Next.js 16.2.12, React 19, TypeScript, Tailwind 4, shadcn/Base UI, `motion`, and Vitest. The standalone HTML imports none of these libraries. Tests cover `src/**/*.test.ts` in Node, not this mockup. ESLint/typecheck do not validate its inline JavaScript or rendered UI. |

No CI configuration or separate design-system specification was found. The main app is run with `npm run dev`; this mockup needs no app server or build. There is no configured browser-test suite for it. Do not install one for this change.

The artifact README at line 22 specifies: “cosmic blue palette, deep navy surfaces, cool blue and violet publication identities, compact navigation, and a separate writing surface.” It also rules out colored card-edge accents and diagonal arrows. Preserve these choices, the existing typefaces/fallbacks, content density, and publication names. The README at lines 18–20 states that content is illustrative, changes are session-only, and there is no connected AI, crawler, scheduling, publishing, or vault sync. Preserve these boundaries and all explicit approval steps.

### Source excerpts to anchor the work

From `artifacts/kessel-run-app.html:8`:

```css
.btn:hover{filter:brightness(.97)}
.card{background:var(--paper);border:1px solid var(--line);border-radius:13px;padding:21px;text-align:left;transition:box-shadow .15s}
.piece:hover{transform:translateY(-2px);border-color:#6185bf}
.editor{width:100%;min-height:390px;resize:vertical;border:0;background:transparent;outline:none;font:17px/1.95 Georgia,serif;color:#c9d5ee}
.close{width:28px;height:28px;border-radius:50%;background:#22314f;font-size:18px}
.toast{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);background:var(--ink);color:white;padding:13px 22px;border-radius:9px;z-index:40;box-shadow:0 4px 15px #0002;font-size:12px}
```

Here `--ink` is `#e7edff`, giving white toast text approximately **1.17:1** contrast. This value was calculated from the declared colors, not sampled from a browser.

From lines 18, 39–40, and 65:

```js
const icon=n=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.file}</svg>`;
function modal(body){document.getElementById('modal').innerHTML=`<div class="dialog-backdrop"><dialog open aria-modal="true" aria-label="Kessel Run workflow">${body}</dialog></div>`;setTimeout(()=>document.querySelector('dialog input,dialog textarea,dialog button')?.focus(),20)}
function closeModal(){document.getElementById('modal').innerHTML=''}
function render(){sidebar();document.getElementById('crumb').innerHTML=`Workspace <span style="margin:0 10px;color:#526586">/</span> <strong>${{home:'Overview',library:'All content',publication:pubs[state.pub].name,voices:'Voice studio',piece:'Writing desk'}[state.page]}</strong>`;document.getElementById('app').innerHTML=({home,library,publication,voices,piece:editor}[state.page])()}
```

Conventions to preserve: `esc()` at line 21 escapes user-authored text before interpolation; `icon()` and `badge()` are shared rendering helpers; `flow()` at line 32 owns per-piece output arrays, profile versions/rule snapshots, and authors. Keep their roles. Preserve native buttons, selects, labels, and textareas. Add small named vanilla-JavaScript helpers in the same file, not a framework or new dependency. Keep dynamic text escaped.

## Findings, grouped by principle

Locations are baseline physical lines; use selectors/function names after formatting. Each row is a root cause, not a separate implementation plan. Confidence is HIGH for the cited source behavior; visual execution remains unverified.

### Legible, persistent feedback and keyboard continuity

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `artifacts/kessel-run-app.html:8,23` (`.toast`, `toast`) | White text on `--ink: #e7edff`; fixed centered toast lacks a narrow-screen width limit | Use `color:var(--bg)` on the existing pale background; limit width to viewport minus 32px; wrap long messages | Feedback must remain readable. Validation and save/export messages currently have about 1.17:1 contrast. Effort S; fix risk LOW. |
| HIGH | `artifacts/kessel-run-app.html:8,39,40,43,48,50,54,65,66` (`.editor`, modal helpers, `render`, keydown handler) | Editor removes its outline; DOM replacement destroys focused controls; dialog has no native modal isolation or return-focus lifecycle | Visible editor focus; native modal isolation; focus restoration and stable focus targets through in-place view updates | Keyboard users need a visible location and predictable continuation after dismissing a dialog or changing a tab. Effort M; fix risk MED. |

### Motion restraint and press feedback

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `artifacts/kessel-run-app.html:8` (`.piece:hover`, `.nav:hover`, `.btn:hover`, `.card.clickable:hover`) | Cards jump by 2px; hover styles apply on touch; brightness filter affects entire buttons | Stationary cards and navigation; pointer-capability-gated hover feedback; explicit surface/color properties, at most 150ms | Frequent interactions should not repeatedly move content or leave touch hover states behind. Effort S; risk LOW. |
| LOW | `artifacts/kessel-run-app.html:8` (enabled action buttons) | No deliberate press response | Pointer-only `scale:0.96` with 150ms custom ease-out; static opt-out; keyboard/reduced-motion/disabled controls do not move | Exact better-ui press feedback, with Emil's keyboard and frequency restraint. Effort S; risk LOW. |

### Shadows for elevation, borders for structure

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `artifacts/kessel-run-app.html:8` (`.card`, `.piece`, `.panel`, `.btn`, `dialog`) | Arbitrary depth borders and dark shadows compete with structural separators | Shared dark-mode white shadow rings for elevation; preserve inputs, selection boundaries, and layout dividers | Consistent depth makes cards/actions easier to distinguish without changing the navy identity. Effort S; risk LOW. |

### Match icon stroke to text weight; optical alignment

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `artifacts/kessel-run-app.html:18,27,29,30,31,35,36,41,43,48,50,52,53,58` (`icon`, generated controls) | Fixed 1.6px stroke mixed with text `+`, arrows, `×`, and checkmarks in action labels | Reuse the inline SVG family with `currentColor`; 1.5px beside regular text, 2px beside semibold; explicit icon slots | Consistent weight and alignment avoid platform-dependent glyph shapes. Effort S; risk LOW. |

No evidence justifies adding entrance staggering, a theme toggle, animated icon swaps, image outlines, or a motion library. There are no raster images, contextual icon swaps, or theme changes in the target. Avoid mechanically applying concentric radii to a logo placed inside a larger card: those are independent surfaces, not matching inset containers.

## Commands you will need

Run from `/Users/miniying/Apps/kessel-run` or the equivalent executor checkout.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Drift / untracked baseline | `git status --short` and `shasum -a 256 artifacts/kessel-run-app.html artifacts/README.md` | Initial hashes match above; preserve unrelated work |
| Parse the artifact's script | **Gate A**, below | `PASS: 1 inline script parses`, exit 0 |
| Diff hygiene | `git diff --check` | Exit 0; note that untracked artifacts require direct inspection too |
| App tests, only if a broader repository check is requested | `npm test` | Exit 0; does not establish mockup correctness |
| App typecheck, same qualification | `npm run typecheck -- --incremental false` | Exit 0; does not inspect this HTML |
| App lint, same qualification | `npm run lint` | Exit 0; record existing warnings separately |
| App dev/build, reference only | `npm run dev` / `npm run build` | Not needed for standalone HTML; do not run for this plan |

**Gate A — syntax verification** (passed at planning time):

```sh
node - <<'NODE'
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('artifacts/kessel-run-app.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (scripts.length !== 1) throw new Error('Expected one inline script');
scripts.forEach(m => new vm.Script(m[1]));
console.log('PASS: 1 inline script parses');
NODE
```

**Gate B — browser assertions** means run the specific read-only JavaScript assertions below in an allowed browser inspection environment after the stated UI action. All must return `true`. Use supported browser tools for interactions; do not use evaluation to simulate user actions. Do not bypass a tool's browser security restrictions.

## Scope

**Implementation files permitted:**

- `artifacts/kessel-run-app.html`
- `artifacts/README.md` — accurately update the verification section
- `plans/016-polish-html-mockup.md` — append execution evidence/status
- `plans/README.md` — update only this plan's status/evidence

**Out of scope:** `prototype/`, `src/`, package/lock files, configuration, installed skills, workspace/vault data, production APIs, persistence, real AI/imports, publishing, and changing editorial status semantics. No external UI libraries or new fonts. No light theme. No broad rebranding, new dashboard feature, or new animated loading state. Production Next.js changes require a separate plan and reading its installed `node_modules/next/dist/docs/` guides first.

## Git workflow

If a branch is requested for implementation, use `codex/016-polish-html-mockup`. Preserve the current untracked artifacts and any later user edits. Match the repository's descriptive commit style, e.g. `Polish standalone editorial workspace interactions`, only when committing is authorized. Do not push, merge, or open a PR on the basis of this plan. A previous execution authorization recorded in an old plan is not fresh authorization for this work.

## Implementation steps

### 1. Normalize the local styles and repair feedback legibility

Expand the compressed CSS into readable selector blocks without changing template-literal contents or the document's script behavior. Group tokens, controls, navigation, cards, editor, dialogs/toasts, and media rules. Do not use a repository-wide formatter. Keep all existing colors and breakpoint intent except where explicitly changed below.

Add `--shadow-surface: 0 0 0 1px oklch(1 0 0 / 0.08)` and `--shadow-surface-hover: 0 0 0 1px oklch(1 0 0 / 0.13)`. Use these exact dark-mode rings on `.card`, `.piece`, `.panel`, and neutral `.btn`. Preserve the 1px border's space with a transparent border if removing it would shift measurements. Keep primary/selected borders where they express state; keep sidebar/topbar/rule/output separators and form-input boundaries. A dialog may retain its existing ambient shadow plus the surface ring.

Retain current outer radius tokens (cards 13px, panels 12px, buttons/pieces 9px, dialog 17px). For any newly introduced tightly nested surface with an even inset, use outer radius = inner radius + inset. Do not globally enlarge radii, force pill shapes, or change the board gutters to satisfy unrelated concentric math.

Change `.toast` text to `var(--bg)` and retain `var(--ink)` as background. Set `max-width:calc(100vw - 32px)`, sensible wrapping (`overflow-wrap:anywhere`), and safe bottom spacing using `env(safe-area-inset-bottom)`. Keep the live-region host, escaping, timeout replacement behavior, and 3500ms dismissal. Do not introduce toast motion: immediate validation feedback is useful in this mockup.

**Verify:** Run Gate A and `git diff --check` → exit 0. Trigger the blank-title New piece validation toast. In Gate B, confirm the following and inspect its wrapping at 375px:

```js
getComputedStyle(document.querySelector('.toast')).color === 'rgb(11, 16, 32)'
getComputedStyle(document.querySelector('.toast')).backgroundColor === 'rgb(231, 237, 255)'
document.querySelector('.toast').getBoundingClientRect().width <= innerWidth - 32
```

### 2. Make dialog and view focus predictable

Refactor `modal()`, `closeModal()`, and the final keydown handler as one change. Use a single native `<dialog>` opened with `showModal()`; native modality supplies background isolation and tab containment. Style `dialog::backdrop` with the existing dim/blur treatment, and center the dialog with viewport-safe margins. Remove the competing custom Tab trap and the non-modal `open` attribute. Use the visible heading via `aria-labelledby` (a unique heading ID supplied by `titleRow()`). Keep dialog opening, closing, and step changes **instant**, including keyboard activation; adding modal motion is not a requirement of this plan.

When starting a new modal flow, capture the invoking control and a stable focus key. Keep the same dialog element while `wizard()`, `interview()`, review preferences, or author/import views replace its contents. Do not reopen it or overwrite the original invoker for each step. Explicitly focus the next meaningful input on step advance, the heading on a review-only step, and the replacement selected choice when choosing Guided/Fast within the same step. Remove the arbitrary 20ms timer.

Route Escape/native `cancel` and the Close/Cancel controls through one idempotent close path. Restore the invoker if still connected; otherwise resolve its stable key in the updated view. If navigation deliberately replaced that view (e.g. creating a piece), focus the new view's heading with `tabindex="-1"`. Schedule restoration after synchronous rendering and cancel stale pending focus callbacks when a new dialog opens. In the existing 400ms post-approval lesson prompt, the lesson dialog owns focus when it opens; an old close callback must not steal it.

For `render()` calls that refresh the same view (filters, tabs, output selector, Guided/Fast), attach stable `data-focus-key` values to the relevant controls and restore the equivalent control after rendering. For `go()` navigation, focus the page heading. Preserve caret and selection while typing: `saveDraft()` must continue updating data/save text without re-rendering the editor.

Add a visible `.editor:focus-visible` outline using the existing focus color and offset; extend focus rules consistently to inputs/selects/textareas. Expose selected state through `aria-current="page"` for navigation and `aria-pressed` for existing filter/mode/tab-like buttons. Retain ordinary button keyboard behavior; do not add incomplete ARIA tab roles without their keyboard model.

**Verify:** Gate A → exit 0. Gate B after opening New piece, after Escape, after changing a same-view filter, and after focusing the draft editor, respectively:

```js
document.querySelector('dialog').matches(':modal') && document.querySelector('dialog').contains(document.activeElement)
!document.querySelector('dialog[open]') && document.activeElement.textContent.trim().includes('New piece')
document.activeElement.matches('[data-focus-key]') && document.activeElement.isConnected
getComputedStyle(document.querySelector('.editor')).outlineStyle !== 'none'
```

Also tab and Shift-Tab through each dialog boundary, navigate wizard steps and interview review, and verify the focus cases in the matrix below. Expected: background controls cannot receive focus while modal; all visible focus targets remain usable.

### 3. Apply restrained pointer feedback and consistent icons

Remove `.piece:hover` translation entirely. Gate hover rules with `@media (hover:hover) and (pointer:fine)`. Replace `.btn:hover` brightness filtering with intentional background/color feedback; use the exact shadow tokens for raised surface hover. Keep active navigation, tab underline, selected choice border, and status labels visible without motion. List cards and navigation remain stationary.

Use explicit transition properties only. Surface/hover transitions may use `background-color`, `color`, or `box-shadow`, 150ms or less; choose 150ms for consistency. Press feedback uses `scale` at exactly 150ms with `cubic-bezier(0.23,1,0.32,1)`. Apply exactly `scale:0.96` only to enabled action buttons during a real pointer press. Add a `data-static` opt-out for large clickable cards, navigation, tabs, and repeated mode selection. Do not use a global `button:active` rule, because it also affects keyboard activation.

Implement a small delegated pointer-press helper that adds a class to eligible action buttons on `pointerdown` and clears it on `pointerup`, `pointercancel`, focus loss/window blur, and before render replacement. It must not block clicks or turn drag gestures into actions. A keyboard event clears pointer press state; `prefers-reduced-motion:reduce` disables scale and transition motion. Native disabled buttons never acquire press/hover feedback. Use native HTML `data-static` as the equivalent of better-ui's component `static` prop.

Keep inline SVGs as the one action-icon family. Extend `icons` with a close path and a left-arrow path as needed. Replace action-label glyphs `+`, `→`, `←`, `×`, and decorative checkmarks with `icon()` equivalents; leave editorial prose and textual progress/count content alone. SVGs remain `aria-hidden`, `fill="none"`, and `stroke="currentColor"`; icon-only buttons retain accessible names. Set the default stroke to 1.5px and a shared CSS/helper variant of 2px for semibold action and active-navigation contexts. The orbital brand mark is artwork, not an action icon, and stays unchanged.

Keep 18px action icon slots. Give the Close control a 40px target with an 18px icon while preserving surrounding spacing. Use a leading/trailing-icon modifier on `.btn` to reduce padding on the icon side by 2px relative to the text side, then inspect optically before accepting. Do not add icons to every surface or change label meanings.

No contextual icon swap currently exists, so do not create one merely to animate it. If a later separately authorized change adds one, better-ui's exact `scale 0.25→1`, `opacity 0→1`, `blur 4px→0`, and `cubic-bezier(0.2,0,0,1)` CSS recipe takes precedence over approximate examples. No Motion import belongs in this standalone file. No page-load entrance, stagger, keyframe interaction, or speculative `will-change` is needed.

**Verify:** Gate A → exit 0. Gate B while pointer is held on New piece: computed `scale` is `0.96`; on release it returns to `1`. With keyboard activation or reduced motion it stays `1`. Hovering a piece must yield `getComputedStyle(piece).transform === 'none'`. Inspect transitions to confirm exactly named properties, duration ≤150ms, and the stated press curve. Check enabled, disabled, hover, focus, and pressed states independently. If the browser supports an Animations panel, replay the press/hover transitions at 10% speed; record `Not verified` if that facility is unavailable.

### 4. Verify full workflows and record the limits of the review

Complete the matrix below in a fresh disposable session. Test desktop 1440×1000, compact desktop 1024×768, mobile 375×812, and a wide 1920px viewport. Check all three publication tabs, the two-step wizard, the editor's header/footer, output rows, and every modal for clipping. Permit local tab-strip scrolling if needed; do not hide publication labels or change product navigation. Narrow headers/footer controls may wrap and flex children may use `min-width:0`. Limit responsive edits to demonstrated overflow in the existing layout.

Update `artifacts/README.md` with the checks actually completed, date, browsers/viewport sizes, and remaining `Not verified` items. Preserve its walkthrough and product boundaries. Append an execution record to this plan with pass/fail results and any screenshots available from supported tools. Keep source screenshots or temporary browser fixtures out of the repository unless requested; do not install test tooling.

**Verify:** Gate A, `git diff --check`, and `git status --short` → script valid, no whitespace errors, changes confined to the scope above. Run each Gate B assertion after its matching UI action, and confirm `document.documentElement.scrollWidth <= innerWidth` on every tested page/viewport. Mark TODO/IN PROGRESS or BLOCKED if required checks cannot be completed; do not claim approval of uninspected behavior.

## Test plan / browser acceptance matrix

No permanent test suite is required for the CSS/icon changes. The interaction changes do require the following behavioral checks; syntax/typecheck alone are insufficient. Use the existing walkthrough in `artifacts/README.md` as the behavioral baseline rather than adding implementation-mirroring CSS tests.

| Scenario / action | Required result |
| --- | --- |
| New piece → Continue with a blank title | Readable validation toast; title gets focus; dialog remains open; no piece added |
| New piece → title/notes → Continue → Guided/Fast → Back → Continue | Inputs survive; chosen mode remains selected visually and semantically; keyboard focus follows the intended control |
| Complete New piece | Exactly one piece created with chosen publication/format; writing desk heading receives focus |
| Open and close each modal using Close, Cancel, and Escape where offered | Background inert while open; logical focus restored on every path; no stale focus timer |
| Approve output with fewer than three checked review items | Approval remains disabled; no press scaling; no output marked Ready |
| Check all three review items and approve | Only selected output becomes Ready; lesson dialog opens normally; focus stays in the newest dialog |
| Just this piece / Save lesson | Dismissal does not change the voice; saving explicitly changes only selected publication version; existing output versions/rules remain pinned |
| Edit a long draft, switch output/author, navigate away/back | Text and per-output author remain; typing never loses caret; changing tabs/selects keeps a useful focused control |
| Start a blank additional output → sample draft → try sample again | Initial sample appears; second attempt preserves edited content and gives legible feedback |
| Starter voice interview → three answers → review → approve | Answers preserved; no inferred rules or maturity upgrade; approval creates a new version only at confirmation |
| Voice studio → Authors/Evidence; switch publications; import preview | Correct empty/illustrative states; static selected-state cues; no fetching or false progress indication |
| Export output and profile | Download content retains the same title, selected voice/version, status, author, and prototype disclaimer as before |
| Rapid open/close/reopen, repeated toast messages, touch pointer cancellation | No orphaned dialog/backdrop, stuck press class, old timer erasing the newest toast, or focus stolen by an old flow |
| Pointer vs keyboard vs reduced motion | Pointer action press exactly 0.96; frequent navigation stationary; keyboard/reduced-motion actions instant; feedback remains visible |
| Narrow/desktop/wide viewports | No document-level horizontal overflow; text labels and dialog actions reachable; toast fits viewport |

Loading states: **not applicable** to this synchronous mockup; do not add fake network spinners. Empty states, disabled states, focus, hover, active feedback, and selected states are applicable. Physical touch-device validation must be labeled separately from viewport emulation.

## Done criteria

- [ ] Gate A exits 0 with one parsed inline script.
- [ ] Gate B assertions pass in the recorded browser, including native modality, focus, readable toast colors, and viewport bounds.
- [ ] Pointer press yields `scale:0.96`; release, disabled, static, keyboard, and reduced-motion cases yield `scale:1`.
- [ ] Piece hover has no translation; all transitions name exact properties and meet the specified durations/curves.
- [ ] Browser matrix passes, with no application JavaScript errors and no lost draft/voice/approval data.
- [ ] No first-load animation, new dependency, theme toggle, colored card edge, or diagonal arrow introduced.
- [ ] README records actual verification and explicitly labels any optional checks not completed.
- [ ] `git diff --check` exits 0; direct inspection of untracked artifacts plus `git status --short` confirms only authorized files changed.
- [ ] Plan/index status updated with evidence. Required unverified behavior prevents DONE; optional physical-device/slow-motion checks may remain explicitly unverified.

## STOP conditions

- Target artifact is missing from an executor worktree, or its baseline hashes/excerpts materially differ. Obtain/reconcile the actual untracked mockup; do not substitute the older prototype.
- Implementation would require changes to the production app, data model, dependencies, or real publication content.
- A focus or modal change causes loss of notes, draft text, selected output/author, profile snapshots, or explicit approval semantics.
- A verification fails twice after a reasonable targeted correction.
- Browser policy prevents inspection: record the restriction and outstanding checks; do not try another protocol, server, or browser surface to evade it. Required browser acceptance remains incomplete until an allowed review is available.

## Maintenance notes

The current full-view `innerHTML` rendering makes focus keys important: new tab/filter controls must get stable keys, and navigation must choose a destination focus target. Keep modal ownership in one helper so nested step replacements cannot discard the invoker. Keep user-authored strings escaped after icon substitutions. Future framework migration should reuse these interaction decisions, not import the standalone document wholesale.

Rules reconciled for this plan: better-ui's exact 0.96 press scale overrides Emil's illustrative 0.97 example; keyboard and reduced-motion behavior stays static; frequent interactions do not gain staged entrances; the inline SVG system remains in place. Theme-swap suppression, image outlines, animated icon swaps, and stagger timing are not applicable to the current target.

## Planning verification and coverage

- Read the complete current HTML and artifact README; inspected root configs, product direction, and existing plan index. This was the `plan <description>` variant, not a general codebase audit.
- Gate A passed on the original artifact. Toast contrast calculation yielded 1.17:1.
- Browser opening of the local artifact was rejected by the browser URL policy. Rendered desktop/mobile visuals, hover/press/focus execution, modal behavior, physical touch devices, reduced-motion emulation, screenshots, console errors, and 10% animation playback: **Not verified** in this planning session.
- App tests, lint, typecheck, build, security/dependency audits, backend, skill quality, and production accessibility: **not run / not audited** for this focused plan. Historical README claims are not new verification.
- Considered and rejected: changing the older prototype; migrating to React/Motion; globally rounding containers; adding entrance animations; adding a theme switch; treating nested independent logos as concentric-radius defects. These do not advance the requested focused polish.

**Block** — the current mockup retains the HIGH feedback/focus findings above; implementation and browser acceptance are pending. This verdict concerns the reviewed mockup, not the readiness of this handoff plan.

## Execution dispatch — 2026-09-15

User invoked `improve execute plans/016`. Reviewer rechecked HEAD `63177e4`, both artifact hashes, and the scoped git diff: no drift. A separate executor is implementing in an isolated worktree; the reviewer retains ownership of this checkout's index. The existing browser-policy restriction remains in force. Independent implementation and source checks proceed; browser-dependent acceptance stays unverified and cannot be inferred from source checks. No merge or source update to the original checkout is authorized by this execution workflow.

## Reviewer execution result — 2026-09-15

- **Worktree:** `/private/tmp/kessel-run-016`
- **Branch:** `codex/016-polish-html-mockup`
- **Commits:** `cc4734e` captures the verified untracked baseline; `8ba2bb7` implements polish; `eca1ba9` corrects the first review's findings.
- **Scope:** Only `artifacts/kessel-run-app.html`, `artifacts/README.md`, and this plan changed in the executor branch. Worktree is clean. Original checkout artifact hashes still match the planning baseline. No merge or push occurred.

### Changes reviewed

| Principle | Before | After | Why / verification |
| --- | --- | --- | --- |
| Legible feedback | White text on pale toast, no width constraint | Navy text, viewport width limit, safe-area spacing; toast host belongs to the open native modal | Declared colors/structure inspected; rendered contrast, clipping, and live-region behavior **Not verified** |
| Keyboard continuity | Replaced non-modal dialog, no return-focus lifecycle | Native `showModal()`, persistent modal shell, meaningful input/heading focus, focus lookup and restoration | Actual extracted helpers pass focused Node tests with DOM boundary mocks; native modality and keyboard traversal **Not verified** |
| Motion restraint | Moving card hover, no deliberate press response | Stationary pointer-gated hover, exact 0.96 press scale, static mode/navigation controls, reduced-motion rules | Source/CSS inspected; rendered press/hover/reduced-motion states **Not verified** |
| Surfaces and icons | Inconsistent elevation borders and action glyphs | Shared white shadow rings, preserved structural borders, consistent SVG icons and semibold weight | CSS and original SVG path preservation checked; visual alignment **Not verified** |
| Interaction lifecycle | Unowned delayed lesson callback | Pending lesson prompt canceled on navigation, re-render, and new modal | Actual approval/navigation timer functions tested; selected output becomes Ready while another output retains its status |

### Review corrections and independent evidence

The first candidate passed a regex-based script check but omitted `</style>`. An independent Python `HTMLParser` read found no body or script element; that candidate was rejected. The revision restores the closing tag and adds real document-structure and CSS parsing. Review also corrected focus fallback, unsafe focus-selector construction, modal toast placement, disabled-to-enabled press handling, mode selection semantics, SVG path drift, and delayed lesson cancellation.

Reviewer reran on final commit `eca1ba9`:

1. `node /private/tmp/kessel-run-016-source-check.mjs` — PASS: exactly one closed style/body/script in order, PostCSS parsing, and inline JavaScript syntax. This temporary harness is outside the repository.
2. `node /private/tmp/kessel-run-016-review-check.cjs` — PASS: extracted **actual artifact functions** for quoted focus keys, missing-key heading fallback, canceled focus restoration, independent output approval, navigation cancellation of the actual 400ms lesson timer, and modal replacement targets (title, format, same-step choice, interview answer, review heading, general input). These use lightweight boundary mocks, not a browser or a duplicate implementation.
3. `git diff --check cc4734e..HEAD` — PASS; scoped changed-file list inspected; clean executor worktree.
4. AST comparison against original artifact — publication data, initial state, escaping, badge helper, and existing SVG paths unchanged. Existing functions changed are limited to `toast`, `go`, `modal`, `closeModal`, `titleRow`, `approveDraft`, and `render`; the remaining workflow/rendering functions retain their original source.
5. Original-checkout hashes — unchanged for both artifacts.

App tests, lint/typecheck/build, production services, and broad repository audits were not run; they would not validate the standalone UI. Browser acceptance, viewport layouts, console errors, native focus containment/return, actual pointer and reduced-motion states, exports through the UI, physical touch, and slow-motion replay remain **Not verified**. The prior local-file URL security rejection was respected; no alternative server/protocol/browser surface was used to evade it.

**Block** — implementation is available for review in the isolated branch, but the plan cannot be marked DONE until its required browser checks pass in an allowed environment. This is a verification block; the original checkout's mockup remains unchanged.

## Reconciliation — 2026-09-19

The reconciliation below records the pre-merge state. The subsequent authorized
merge supersedes its branch-isolation and no-merge instructions; see the final
section. Its browser-verification limits still apply.

**BLOCKED, validation only.** Main remains `63177e4`. The existing clean worktree
`/private/tmp/kessel-run-016` is still on `codex/016-polish-html-mockup` at
`eca1ba9d588a72ffb09bd142617a547be49fbef1`. Both temporary source/review harnesses
listed above and `git diff --check cc4734e..HEAD` passed again. These checks
validate source structure and selected functions with mocks, not browser behavior.
The original checkout's two artifact hashes still match the planning baseline.

### Resume from the implementation

1. Verify the worktree HEAD and clean status. The implemented HTML's SHA-256 is
   `d7dfdea0e6919376dbdd02a1e0a1060022536692c9b0ffbd586e25ef3ef354f3`.
   Reconcile any new changes before reviewing. Do not copy the original artifact
   over this version or rerun the implementation steps against the baseline.
2. Complete Gate B and the existing browser/workflow/viewport matrix in an
   allowed review environment, recording actual results and remaining limits.
   The previous browser-policy restriction remains in force in this session;
   no browser retry or alternate protocol/server/surface was attempted during
   reconciliation. Source checks cannot substitute for this acceptance.
3. The harnesses under `/private/tmp` are temporary review aids, not durable
   repository tests. If unavailable later, reconstruct checks from the current
   artifact and documented criteria; do not claim a historical run as fresh evidence.
4. Update the plan and index only after reviewing the results. Keep BLOCKED
   while any required check is unverified. No merge or push is authorized by
   this reconciliation; the polished implementation remains isolated.

## Authorized merge — 2026-09-19

The user authorized merging plan 016. `main` fast-forwarded from `63177e4` to
`eca1ba9` with no conflicts. The polished HTML and its verification README are
now in the main checkout. The original untracked artifact files and the fuller
reviewer plan were backed up to
`/private/tmp/kessel-run-016-premerge-3av966s1`; the reviewer plan was restored
after merging so its execution and reconciliation evidence is preserved.

This authorization permits merging with the documented verification gap; it
does not establish that browser acceptance passed. The remaining work is the
recorded browser matrix against the merged artifact in an allowed environment.
No remote push occurred. Other pending planning changes were preserved.
