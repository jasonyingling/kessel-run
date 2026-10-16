# Application UI review — October 16, 2026

## Decision

Make **Create your first publication** the front door. Pair the local browser in the entry flow, create a safe app-managed content folder behind that explicit action, and open the publication immediately. Keep workspace location, API credentials and MCP connections in Settings. Creating publications, authoring a starter voice, capturing ideas, writing, reviewing and exporting must work without an API key.

The prototype is the interaction reference, not a source of production data. Preserve the real app's stronger Markdown persistence, exact revisions, profile version pins, human approvals and external-agent conflict protection.

## Baseline and coverage

- Reviewed main at `939adc5c2dbb36034fd2def4f4a395ba708d7be0`, including the intentional, uncommitted Luna/Sol model and connection-test fixes. `baseline.json` records source hashes and pre-existing working-tree changes. Executors must preserve those changes.
- Applied `better-ui` and `improve plan`. Three read-only reviewers covered onboarding/storage, prototype parity and UI polish; the primary reviewer opened and vetted the cited source.
- Browser: inspected `http://127.0.0.1:3000/kessel-run`, opened/cancelled the workspace form, and inspected settings at desktop size. Inspected first-run layout at 390×844 and restored viewport afterward. No data saved, credentials changed, AI generation requested or microphone started. Settings automatically checks model availability; that is separate from generation.
- Observed: first-run shows `404: Workspace unavailable or not selected`, requires a title and empty-folder path, and offers no publication action. Settings has a separate white surface. Both page headings compute to `Times`. Mobile has no horizontal overflow in this state, but the sidebar occupies roughly the first 300px, including a large blank area. A keyboard Tab from Choose folder reaches the pairing link.
- **Not verified:** populated publication/studio/desk states in the browser, actual save/retry/recovery, full keyboard/screen-reader operation, hover/press visual states, slow-motion replay at 10%, reduced-motion rendering, microphone, real AI/MCP, runtime performance, favicon identity and production build. Those states were reviewed in source. This planning turn did not rerun tests.
- Prototype browser inspection was rejected by the browser URL policy for `file://`. Its HTML/CSS/interaction code was reviewed directly; no alternate serving or rendering route was used. Visual parity with the rendered prototype remains **Not verified**.
- Out of scope: broad dependency/security audit, legacy `/kessel-run/projects` pipeline UI, legacy `prototype/index.html`, portable-skill changes, publishing/WordPress acquisition and hosted distribution. Security review here was limited to preserving boundaries affected by onboarding and UI mutations.

## Prioritized findings

All locations refer to the captured baseline. Confidence is HIGH unless qualified.

| # | Finding | Category | Impact | Effort | Fix risk | Evidence | Plan |
|---|---|---|---|---|---|---|---|
| 1 | First run leads through API settings and filesystem setup before publication creation | Direction / UX | Blocks intended first-use journey | L | MED | `scripts/kessel-run-local.mjs:44`; `workspace.tsx:208–212` | 018 |
| 2 | Missing, loading, expired and damaged workspace states collapse into setup | Correctness | Misleading recovery actions; existing content appears absent | M | MED | `local/workspace/route.ts:10`; `workspace.tsx:105,210`; `journal.ts:70–86` | 018 |
| 3 | New mutation ID on retry; global configuration/session writes lack one recoverable selection transaction | Correctness | Lost-response duplicates or stranded/mismatched selection | M | MED | `workspace.tsx:160–175`; `config.ts:16–20`; `journal.ts:111–126` | 018 |
| 4 | Missing publication navigation and output-aware progress views; settings and loading bypass shell | Direction / architecture | Hard to find and resume editorial work | L | MED | `workspace.tsx:207,223–226`; `settings.tsx:75`; `loading.tsx:5` | 019 |
| 5 | New voice is framed as import or AI; output creation can open with no approved voice | Direction / UX | Keyless writer encounters an impossible voice selector | M | MED | `workspace.tsx:216,222–223`; `voice-studio.tsx:30`; `service.ts:244–245` | 020 |
| 6 | Only Article/Short post are created; changing a preset title does not change its format | Correctness / parity | Newsletter/Review names can produce wrong stored format | M | MED | `workspace.tsx:162–173`; `service.ts:403–409` | 020 |
| 7 | Piece/output creation is disconnected; brief and approach cannot be edited; desk stacks setup/review before prose | Direction / parity | Too many steps and scrolling before writing | L | MED | `workspace.tsx:172–175,214,224–225`; content route action enum | 021 |
| 8 | Export is enabled while editor is dirty but downloads saved prose | Correctness | Download differs from visible draft | S | LOW | `workspace.tsx:197–202,225` | 021 |
| 9 | Invalid or out-of-order handoff file selection can retain previous file contents | Correctness | User previews/restores a different file than selected | S | LOW | `handoff-import.tsx:28` | 022 |
| 10 | Font token is self-referential; cross-surface colors and interaction states are inconsistent | UI polish | Visible fallback typography and weak paper links | M | LOW | `globals.css:11,153,168,173,195`; `layout.tsx:8` | 019, 022 |
| 11 | Repeated unchanged pending arrays refetch revision prose on every poll | Performance | D + 2L extra requests per poll for D drafts / L lessons | M | MED | `workspace.tsx:115–134`; `review-decisions.tsx:24–39` | 021 |

Full paths: UI components are in `src/components/kessel-run/app/`; workspace services in `src/server/kessel-run/workspace/`; local routes in `src/app/api/kessel-run/`; CSS/layout in `src/app/`. Performance cost is structurally evident but not measured at realistic scale.

## Prototype parity

| Prototype feature (`artifacts/kessel-run-app.html`) | Current application | Planned result |
|---|---|---|
| Overview / All content / Voice studio / publication sidebar, line 775 | Overview and settings only | Shared route shell, publication access and active location (019) |
| Ideas / Drafting / Review / Ready, line 777 | Separate flat piece/output grids | Ideas are pieces without outputs; remaining columns contain independent outputs (019) |
| Publication desk, line 780 | Full voice setup before piece list | Content first, compact voice summary (019) |
| Profile / Authors / Evidence, line 781 | Conversation, edit form, flat version list | Dedicated studio with real provenance and exact exports (020) |
| New-piece flow, lines 796–799 | Separate forms; no navigation after save | Short resumable flow into first output, or save idea without a voice (021) |
| Brief / Write & review / Outputs, line 785 | Long vertical stack; brief read-only | Focused desk sections and editable brief/approach (021) |
| Newsletter / Review / Social / custom formats, lines 797,810 | Two hardcoded formats | Real editable format presets (020) |
| Independent drafts/voice pins, line 782 | Durable, implemented | Preserve existing contracts (all plans) |
| Manual review and optional lessons, lines 806–809 | Exact candidate/final/lesson decisions implemented | Make them clear and contextual; retain explicit approvals (021) |
| Voice and draft export, lines 814–815 | Saved output handoff; no standalone voice export | Exact voice export and honest save/export behavior (020,021) |
| Inline dictation design approved in plan 008 | Implemented | Preserve same-field Dictate / Stop, editable text, Clean text + Undo, explicit Send (021,022) |

## Better-UI findings by principle

### Clear interaction states and hierarchy

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| HIGH | `workspace.tsx:105,210`; `local/workspace/route.ts:10` | Errors appear as new-workspace setup | Typed loading/pairing/empty/recovery states | Error recovery is a distinct interaction, not a creation prompt |
| HIGH | `workspace.tsx:197,225` | Export can disagree with visible dirty prose | Explicit saved/dirty export contract | State feedback must represent the data acted on |
| HIGH | `handoff-import.tsx:28` | Selected file can disagree with previewed data | Clear/version asynchronous file reads | Confirmation must apply to the file the user selected |
| MEDIUM | `workspace.tsx:207,223–226` | Setup/review precedes normal writing; little location context | Publication navigation and focused desk | Hierarchy should follow the writer's next action |

### Surfaces and optical consistency

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| MEDIUM | `globals.css:11`; `layout.tsx:8` | Self-referential font token; Times observed | Wire Geist sans token correctly | Intended typography must load consistently |
| MEDIUM | `settings.tsx:75`; `loading.tsx:5`; `globals.css:176` | White settings, unrelated loading, mobile blank sidebar height | Shared dark shell with compact mobile header | Surface continuity and useful space |
| MEDIUM | `globals.css:153,168,195` | Pale links on light paper; composer uses root muted token | Scoped paper-link and app-muted colors | Declared link/paper colors yield ~1.45:1; runtime paper state unverified |
| LOW | `globals.css:173`; `workspace.tsx:223` | Static cards/disabled buttons receive hover affordance | Enabled interactive targets only | Feedback should promise a real action |

### Motion and icons

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| MEDIUM | `src/components/ui/skeleton.tsx:7`; `loading.tsx:9` | Unguarded pulse and fixed-width loading content | Motion-safe, fluid shell skeleton | Motion restraint; narrow overflow risk is source-derived |
| LOW | `workspace.tsx:207`; `globals.css:137` | Generic Feather brand | Original simple SVG K mark | Distinct identity with small-size clarity; separate from Lucide control icons |

Keep existing good details: exact 0.96 press, static opt-out, named transition properties, 150ms feedback, reduced-motion action overrides, visible focus and subtle white surface rings. Do not add decorative motion. Check concentric radii only where surfaces have a visible even inset of at most 24px; do not mechanically apply it to unrelated layers.

## Direction and tradeoffs

1. **Publication-first entry** is selected by the user. An automatic app-managed folder removes a technical prerequisite but needs recoverable creation and visible storage location in settings.
2. **Dedicated voice studio and focused writing desk** recover the prototype's structure while keeping stronger production approvals. Route extraction must retain dirty buffers and stale-context checks.
3. **Original Run mark:** a split K with a forward-cut arm, supplied as editable SVG concept assets. It favors a clear small silhouette over orbital decoration. Integration and browser-tab verification belong to 022.

## Considered and rejected / deferred

- Removing local pairing, origin checks, approval requirements or immutable snapshots to simplify onboarding: rejected; move complexity behind appropriate UI.
- Automatically approving a generic voice, inventing samples/bylines or seeding prototype publications: rejected; first publication is real user content.
- Copying piece-level Ready semantics: rejected; production outputs are independently approved. Ready means approved for export, not published.
- Treating the prototype's website-import preview as a working fetch requirement: rejected; prototype explicitly fetches nothing. Archive acquisition needs its own plan.
- Replacing Mastra, model selection, Markdown storage or the skill pipeline: rejected as unnecessary for this review. Preserve Luna/Sol fixes.
- A new animation library, blanket icon animation, all-card shadows/radius changes or theme toggle: rejected without a demonstrated need.
- Reopening retired 007 or duplicating 017/008: rejected. These plans improve their shipped surfaces; existing live-AI/MCP/microphone acceptance gates remain open.

## Handoff verification

Five plans and the index were checked for broken local Markdown links: none found.
Both SVG assets pass XML validation. `git diff --check -- plans` passes.
All 286 recorded source/config hashes still match, and the 31 pre-existing
non-plan working-tree changes are unchanged. No production code was edited.
A cold review of the handoffs corrected launcher recovery startup, no-fake
onboarding fixture isolation, production-mode commands and atomic export checks.
These checks validate the planning artifacts, not the unimplemented features.

**Verdict: Block.** The first-use and data-action mismatches need implementation, and the populated flows still need browser acceptance. This is a planning review, not approval of uninspected states.
