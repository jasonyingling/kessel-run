# Plan reconciliation — 2026-09-19

**Subsequent update:** After this reconciliation, the user authorized merging
016. Main fast-forwarded to `eca1ba9`; its browser acceptance remains unverified.
The report below preserves the pre-merge findings. See the final section of
[plan 016](016-polish-html-mockup.md) for the merge record.

Reviewed at main HEAD `63177e49569449bb5d6869b2739be7621f1f675c` (`63177e4`).
This reconciliation changes planning documents only. No source edits, executor
dispatch, merge, commit, push, installation, or publishing occurred.

## Verification

All twelve DONE plans' recorded merge commits remain ancestors of HEAD:

| Plan | Merge commit | Disposition |
| --- | --- | --- |
| 001 | `87fa9fd` | DONE, baseline checks still pass |
| 002 | `d0c621b` | DONE, catalog now contains 15 skills |
| 003 | `ce2b0b1` | DONE, project schema/store coverage passes |
| 004 | `aa1fb74` | DONE, API routes present; suite/typecheck pass |
| 005 | `0636153` | DONE, gallery/list source present; typecheck passes |
| 006 | `d4be903` | DONE, project workspace source present; typecheck passes |
| 009 | `3766b06` | DONE, delivery safety tests pass |
| 010 | `f90282d` | DONE, portable workspace reference checks pass |
| 011 | `b683fa6` | DONE, voice skill present; editorial validation pending |
| 012 | `510b90b` | DONE, lessons skill/reference integration present |
| 014 | `f4ba001` | DONE, Interview skill remains present |
| 015 | `4882762` | DONE, Start/Interview remain standalone; stages 0–7 |

Fresh commands in the main checkout:

| Command | Result |
| --- | --- |
| `npm test` | PASS — 9 files, 53 tests |
| `npm run skills:check` | PASS — 15 workspace references |
| `npm run typecheck -- --incremental false` | PASS |
| `npm run lint` | PASS — 0 errors, 9 existing warnings |

Lint warnings remain in existing AI Elements components (image elements,
treeitem ARIA state, and unused bindings). Test startup also reports existing
Vite configuration/plugin advisories. Neither is a new failure. Historical test
and skill counts in older plans record earlier executions; they are not current
acceptance targets. The current catalog has eight numbered and seven standalone
skills.

## Refreshed backlog

| Plan | Current disposition | Reconciliation |
| --- | --- | --- |
| 007 | DEFERRED | Aligned its banner with the index. Plan 015 supersedes historical skill renumbering and mandatory-transcript rules. App transcript persistence remains absent and requires a new specification after content validation. |
| 008 | DEFERRED | Aligned its banner with the index. Dictation remains absent; the caller/internal disabled-state conflict still requires a design refresh before execution. |
| 013 | NEEDS REVISION, deferred | Dependencies 009/010 have landed. Replaced the stale dependency blocker with concrete workspace, delivery, and capability specification drift. Oracle remains absent. |
| 016 | BLOCKED | Implementation is intact and source checks pass again. Refreshed the plan with validation-only resume instructions; required browser acceptance remains incomplete. |

For 008, the historical scoped diff includes a new delivery test, while the two
chat/speech component paths are unchanged. The underlying design issue remains:
`src/components/ai-elements/speech-input.tsx` spreads caller props after its
internal disabled state. A future plan must preserve that readiness guard in
app-owned integration and use capability detection.

For 013, current workspace authority is
`src/mastra/skill-references/workspace.md`; the proposed TypeScript
`WORKSPACE_BLOCK` and individual Oracle `.skill` archive are stale instructions.
Keep the historical body as a record, not an executable specification.

No plans were rejected or deleted. No stale IN PROGRESS entry exists. Old
009–012/015 worktree registrations point at removed directories; their merged
commits remain in history, so they do not indicate abandoned active execution.

## Plan 016 evidence and remaining acceptance

- Worktree: `/private/tmp/kessel-run-016`, clean.
- Branch: `codex/016-polish-html-mockup`, HEAD `eca1ba9`.
- Fresh checks: both recorded temporary Node review harnesses and
  `git diff --check cc4734e..HEAD` pass. The source harness checks document
  structure, CSS parsing, and script syntax. The function harness exercises
  actual extracted focus, modal, approval, and timer functions with boundary mocks.
- Scope remains the HTML artifact, artifact README, and plan. Main's original
  untracked artifacts retain their original hashes; no implementation was merged.
- Native modality, keyboard traversal, visual layout, viewport bounds, actual
  press/reduced-motion behavior, console errors, and workflow/export interaction
  still require browser acceptance. The prior browser security restriction was
  respected; no alternative surface or protocol was attempted.

The plan now names the implemented HTML hash and instructs future reviewers to
resume from the polished worktree. Repeating implementation or restoring the
baseline would discard useful work without resolving the verification block.

## What can proceed

1. Validate the existing writing skills against real publication content under
   the [skills-first direction](2026-09-07-product-direction.md). Static tests do
   not establish editorial quality or host installation/recognition.
2. Resume 016's browser acceptance when an allowed review environment is
   available, using its existing implementation and complete acceptance matrix.
3. Refresh 007, 008, or 013 only when the deferred product work is selected.
   None is ready for verbatim executor dispatch today; no implementation TODO
   remains ready to dispatch automatically.

## Coverage limits

This was backlog reconciliation: plan status/criteria review, merge ancestry,
targeted source spot checks, existing cheap verification, and isolated mockup
source verification. It was not a new full codebase/security/dependency audit.
No production build, browser rendering, live model request, host installation,
package rebuild, external account/vault mutation, or real editorial validation
was performed. DONE retains prior implementation acceptance and does not imply
that these unperformed checks were newly verified.
