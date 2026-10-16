# Execution and review — October 16, 2026

The user approved plans 018–022 and authorized subagent implementation, review and merge. No paid inference or real-user-content testing is included. Executors work in isolated Git worktrees; the primary agent owns review and integration.

## Preserved baseline

Commit `95bf0c6` preserves the existing Luna/Sol fixes and the approved plans. Before committing, the primary agent reviewed the changes and an independent agent reported no blocking findings. Verification: 166 tests passed, nonincremental typecheck passed, lint had zero errors/nine pre-existing warnings, and 15 workspace + 15 runtime skill references passed. Initial sandbox test run could not bind loopback; rerunning with authorized local-network permission passed. No source changes were made by the advisor.

## Execution queue

| Plan | Branch / worktree | State |
|---|---|---|
| 018 | `codex/018-publication-first` · `/Users/miniying/.codex/worktrees/018-publication-first/kessel-run` | APPROVED `0f155f0`; combined candidate `b5124cc`, merged `a8d5bb8` |
| 019 | `codex/019-editorial-shell` · isolated worktree | APPROVED `dde48c6`, merged after independent verification |
| 020 | `codex/020-voice-studio` · isolated worktree | APPROVED `4d14201`, merged after independent verification |
| 021 | `codex/021-writing-desk` · isolated worktree | APPROVED `f79e30b`, merged after independent verification |
| 022 early unit | `codex/022-ui-foundations` · `/Users/miniying/.codex/worktrees/022-ui-foundations/kessel-run` | APPROVED at `77cda84`; handoff-selection safety and reusable mark assets only |
| 022 completion | Same executor after stacking onto reviewed021 | Final integration authorized |

## Review gates

For each implementation: read the full diff and tests, verify scope, rerun relevant plan criteria in the isolated checkout, request corrections for concrete defects, then integrate only reviewed commits. Record technical gates and browser gaps separately. Browser automation must respect existing policy; never serve the blocked prototype through a workaround. Use disposable fixtures for any mutating test and never expose pairing tokens in artifacts.

Additional risks communicated to 018: preserve restart/re-pair bootstrap recovery while rejecting stale in-flight session updates; keep the existing fake-AI workflow's synthetic model catalog separate from true no-key onboarding.

## 022 early-unit review

The primary reviewer read all five changed files and the ten async selection tests. Scope matches the approved independent unit. Independent rerun: 176 tests/40 files pass; nonincremental typecheck, lint (zero errors/nine existing warnings), skill-reference check and production build pass. Existing NFT tracing warning remains. SVG XML validates and the public asset exactly matches the approved concept. No source corrections were needed. Approved for integration; final 022 browser/UI acceptance remains open until shell and desk integration.

019 preflight corrected a planning assumption: current editor has recovery storage, not an existing navigation guard. 019 must preserve buffers; 021 adds focused save/reconcile navigation. 020 preflight confirmed preset/format validation must apply only to new outputs, preserving historical output formats.

## 018 review round 1

Review identified unsafe client abandonment based on generic `INVALID_INPUT`/`CONFLICT` codes: existing content error mapping and journal recovery can emit those after partial writes. Requested authoritative rejection evidence, preservation of uncertain command IDs, and regression tests. Minimal content-route/journal/schema scope extension is approved for this contract. Also requested guarded browser-storage error paths and consistent advanced-workspace validation. No 018 merge until reviewed corrections and gates.

021 preflight confirmed piece hashes already participate in context fingerprints. Revision-cache keys now explicitly include workspace identity because restored workspaces can share entity IDs.

018 round1 follow-up found no remaining blockers. Primary independent unit rerun passed 187 tests/44 files; lint zero errors/nine baseline warnings and skills15+15 passed. Actual Chromium exposed same-document pairing-fragment navigation, now fixed with regression coverage. Final combined-tree gates remain pending. Narrow dictation fixture updates authorized because the new entry flow removed Choose folder; fake suites retain their existing Synthetic-workspace guard and explicit fixture setup.

## 018 final independent verification

Combined candidate `b5124cc` (includes reviewed022 early unit) passed200 tests/47 files, typecheck, lint0errors/9baselinewarnings, skills15+15 and production build. Normal, fake-production and fake-dev HTTP checks passed. Combined Chromium run passed15/15 across1440/768/390 with reduced motion on mobile. Primary inspected entry, loading, location error, retry, successful publication and corruption screenshots; no horizontal overflow. Expected preexisting font/mobile-header/status chrome issues move to019/022. Merged into main `a8d5bb8`; no paid inference, real credentials or user-content testing.

## 019 review and integration

One revision round fixed repeated New publication after Cancel, duplicate AI headings and empty status chrome. Independent follow-up review found no remaining blocker. Primary read all26changed files, inspected screenshots and independently reran206tests/48files, typecheck, lint0errors/9baselinewarnings, skills15+15, production build and18/18 browser cases. Candidate `dde48c6` was approved and merged. The final022 plan explicitly includes AgentConnections presentation, settled-state screenshots and count grammar; behavior stays unchanged.020 drift is reconciled to the reviewed shell/018operation contracts, with narrow dictation navigation test integration allowed.

## 020 review in progress

Backend checkpoint passed independent52focused tests with no blocker in two source reviews. UI review found late unmounted command responses could clear a newer command/draft, late previews could overwrite recovered draft storage, and preset edits used refreshed hashes with older local fields. Round1 adds owner/command identity checks, abort/lifetime preview protection and captured preset base hashes. Follow-up source review confirms the fixes; actual browser tests hold preview/import responses across navigation and inspect recovery storage, and exercise external preset edits. Strict recovered-draft validation, retained old/proposed rule comparison and workspace-scoped component keys were also verified. Primary full suite passed215tests/52files, typecheck, lint0errors/9baselinewarnings and skills15+15. Final browser/build/visual gates and merge remain pending. Narrow studio styling makes AI help secondary and provides visible keyboard tab selection.

Browser tests exposed locator assumptions and an incorrect expectation that approving proposedv2 makesv2approved. Primary inspected the unchanged service: it retainsv2draft and createsv3approved. The plan now explicitly documents that contract and authorizes the corrected assertion/rerun after executor's repair-limit stop. A separately vetted export fallback now must name stored output.format when current preset instructions are empty; historical output format remains authoritative.

## 020 final independent verification and integration

Candidate `4d14201` passed primary independent215unit tests/52files, nonincremental typecheck, lint0errors/9baselinewarnings, skills15+15, production build and24/24Chromium cases across1440/768/390(reducedmotion). The primary inspected empty, approved, long-profile and recovery/error screenshots at desktop/tablet/mobile, including the independent run's mobile preset rejection. Full source/test diff reviewed; the late-preview storage assertion closes the independent reviewer's final test gap. No source blocker remains. Merged after verification; main source matches the tested candidate. All fixture servers stopped.021 now inherits these contracts and may narrowly adapt existing journey navigation tests without dropping their assertions. Live provider, microphone and real external-agent acceptance remain unverified as previously recorded.

## 021 backend checkpoint and 022 independent assets

021 strict piece-update and locked export expectations passed two source reviews and primary55focused tests/11files. Add explicit null-revision regression for blank output export. Fresh review also identified component-local dictation provenance/undo as state that must survive same-piece tab changes; the plan now explicitly requires this and capture cancellation when hiding the view.

022 independent commit `4f2efdf` adds only icon.svg,16/32/48ICO and motion-safe generic skeleton. Primary read all three changes and independently validated SVG XML/exact approved paths and ICO32-bit DIB entries. No source blocker; held in the isolated branch pending final021 integration and whole-plan runtime/build verification.

## 021 UI review round 1

Primary and fresh reviewer vetted three blockers: shared brief/approach fields remained editable after piece acknowledgement although output retry would discard those edits; a held export response could download an older context after polling had already observed a newer brief; and failed brief recovery still allowed overwriting the unread record. Requested fixes and deterministic regressions, plus complete starter-return, delayed owner, revision-request-count and dictation-undo coverage. Supported routes explicitly key WritingWorkspace by entity ID, so a suspected cross-entity prop-reuse busy lock was investigated and rejected. No021 integration until reviewed corrections and independent final gates.

Round1 follow-up confirms all three source fixes. Strengthen delayed-response tests to wait for client processing and inspect same-output recovery storage, and explicitly assert rejected-output shared fields stay locked. Primary independent full unit suite passes226tests/55files; lint0errors/9baselinewarnings and skills15+15 pass. A later browser assertion assumed UUID-ordered first preset was Article; the plan now authorizes explicit fixture selection and a fresh verification run after the executor's repair-limit stop. Build/browser/visual acceptance remains pending.

Final read-only test review confirms those delayed-response and partial-creation assertions now exercise the intended behavior. Primary reread the updated browser tests and nonincremental typecheck passes after correction of a duplicate test option. The refined desktop desk journey passes; full matrix and independent rerun remain required. The original baseline checker still reports the expected reviewed018–020 and current021 files;022 must reconcile to the final reviewed021 commit rather than restore audit-baseline implementations.

## 021 final independent verification and integration

Candidate `f79e30b` passed independent226unit tests/55files, nonincremental typecheck, lint0errors/9baselinewarnings, skills15+15, production build and27/27Chromium cases across desktop/tablet/mobile-reduced-motion. The primary read the complete22-file change, reviewed delayed-response/ancestry/cache/provenance assertions and inspected desktop Outputs, tablet conflict and mobile blocked-recovery captures. Remaining known composer contrast and spacing belong to022. No source blocker remains. Candidate merged into main; no live model, microphone or user-content actions were used.022 may now merge this reviewed baseline into its isolated branch and finish presentation/assets.

## 022 final integration review

Primary and fresh reviewer found no source behavior/scope blocker in the presentation diff. Browser checks caught keyboard-focus transform residue and a transient disabled-background contrast failure; narrow CSS corrections pass. Review strengthened focus checks to require an actual visible outline and handoff tests to await stale preview JSON consumption before confirming selectedB. The strengthened focus test used programmatic focus after hover, which does not request keyboard modality. Executor correctly stopped after two repairs. Primary reviewed the gesture mismatch, refined022 to use Tab from the preceding summary and authorized a fresh final gate. Full gates and visual acceptance remain pending.
