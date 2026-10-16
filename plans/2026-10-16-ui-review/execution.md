# Execution and review — October 16, 2026

The user approved plans 018–022 and authorized subagent implementation, review and merge. No paid inference or real-user-content testing is included. Executors work in isolated Git worktrees; the primary agent owns review and integration.

## Preserved baseline

Commit `95bf0c6` preserves the existing Luna/Sol fixes and the approved plans. Before committing, the primary agent reviewed the changes and an independent agent reported no blocking findings. Verification: 166 tests passed, nonincremental typecheck passed, lint had zero errors/nine pre-existing warnings, and 15 workspace + 15 runtime skill references passed. Initial sandbox test run could not bind loopback; rerunning with authorized local-network permission passed. No source changes were made by the advisor.

## Execution queue

| Plan | Branch / worktree | State |
|---|---|---|
| 018 | `codex/018-publication-first` · `/Users/miniying/.codex/worktrees/018-publication-first/kessel-run` | APPROVED `0f155f0`; combined candidate `b5124cc`, merged `a8d5bb8` |
| 019 | `codex/019-editorial-shell` · isolated worktree | APPROVED `dde48c6`, merged after independent verification |
| 020 | `codex/020-voice-studio` · isolated prepared worktree | Implementing from reviewed019 |
| 021 | Read-only preflight complete | Waiting for 020 |
| 022 early unit | `codex/022-ui-foundations` · `/Users/miniying/.codex/worktrees/022-ui-foundations/kessel-run` | APPROVED at `77cda84`; handoff-selection safety and reusable mark assets only |
| 022 completion | Same executor after stacking onto 021 | Waiting for final surfaces |

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
