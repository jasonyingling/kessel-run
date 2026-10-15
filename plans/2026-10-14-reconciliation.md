# Scoped reconciliation — plans 017, 007 and 008

Date: 2026-10-14. Main baseline: `9782fb8`. This is the user-requested execution
review and follow-up reconciliation, not a fresh audit of every backlog item.

## 017 — implementation delivered; release acceptance blocked

GPT-6.1 Sol implemented the seven phases in `/private/tmp/kessel-run-017`, branch
`codex/017-app-api-keys-and-mcp`. The advisor reviewed source changes at each
checkpoint and independently verified the final candidate. No merge or push was
performed. The planning records in the main checkout remain local changes.
Final commit: `00a7623e4a10695f0bfca2086d8bb2821f53690f`. The implementation
worktree was clean at review completion.

The candidate provides paired local sessions; explicit server-side API keys;
canonical Markdown storage and revision checks; twelve scoped MCP tools;
publication/voice/source/output UI; resumable writing conversations; human-only
profile/final/lesson decisions; and complete editorial export/restoration.
External agents supply their own inference. Manual writing, export and MCP work
without an app model key. No ChatGPT subscription sign-in is implemented.

### Independent evidence

| Check | Result |
| --- | --- |
| Full unit and SDK suite | 30 files / 116 tests passed |
| Nonincremental TypeScript | Passed |
| Lint | 0 errors; 9 existing vendored-component warnings |
| Skill reference checks | 15 workspace and 15 runtime references passed |
| Production build | Passed; one Turbopack file-tracing warning remains |
| HTTP production launch | Pairing, no-key edit/export, real SDK MCP proposal, CSRF denial, genuine shutdown/restart and stale-workspace denial passed |
| HTTP development fixture | Compiled fake-provider tool/stream round-trip and restart passed |
| HTTP production fixture guard | Production refusal passed |
| Diff whitespace check | Passed |

All HTTP runs used disposable synthetic roots and stopped their owned process
groups before restart/cleanup. They did not inspect a browser or call a paid
model. The build's 26 server traces contained 2,971 unique file paths and no
matches for environment, credential, session, pairing or legacy database files.
That scoped check does not turn the remaining tracing warning into a general
security audit or guarantee deployment packaging.

Production verification found Next 16's internal loopback URL normalization.
The fix accepts only the configured internal origin or its exact `localhost`
normalization with the same protocol/port; wire Host and browser Origin remain
exact. Regression tests cover hostile hosts/origins/protocols/ports. The complete
app requires Node 22.13.0 or newer, matching its installed dependencies.

### Review verdict and remaining gates

**BLOCKED for full plan acceptance; implementation and permitted technical checks
are complete.** The improve workflow requires all acceptance criteria before
APPROVE/DONE. No unresolved source finding remains from this review, but these
criteria have no evidence yet:

- Browser/E2E, keyboard, mobile and reduced-motion acceptance. Authored tests
  remain unexecuted under the existing browser restriction.
- Real billed API streaming, tools and cancellation for the selectable models.
- A real external Codex client using its own account; SDK transport tests are
  narrower evidence.
- The user's Greatest Ever Reviews profile import, draft/edit/final/lesson,
  restart and second-output walkthrough, including factual/voice/UX assessment.

No personal source content was invented or imported. Saved user API keys use an
unencrypted owner-only server file; OS keychain integration is not supplied.
Real credentials and explicit live-test authorization are needed for billed
checks. Resume those gates through an allowed environment before final approval.

## 007 — SUPERSEDED

Retire the historical mandatory Interview stage/transcript-schema plan. Plan 015,
merged as `4882762`, already supplies standalone Interview/Start skills, unchanged
numbered stages 0–7, one-question-at-a-time interviewing and flexible sourcing.
The current Interview skill explicitly accepts typed or spoken answers and
retains questions/answers verbatim with attribution.

017's unmerged candidate supplies the app persistence: `sourceType: interview`,
attribution and exact source body in the shared service, exposed through the app
and scoped MCP tools. `workspace/service.test.ts` verifies exact interview text
and attribution. Its pending acceptance gates stay attached to 017. No separate
legacy transcript field, renumbering or mandatory speech work should be revived.

## 008 — implementation reviewed; release acceptance blocked

**Latest result:** The user approved the revised single-composer design.
GPT-6.1 Sol implemented it at `33facb09c743eaa7fc255e133dec756a241e0d2a` on
`codex/008-inline-dictation` in `/private/tmp/kessel-run-008`, stacked on 017's
`00a7623` candidate. The advisor independently verified 151 tests in 35 files,
nonincremental types, lint (zero errors/nine baseline warnings), 15+15 skill
references, build (one baseline NFT warning), and all three HTTP modes:
production without a key, production test-provider refusal, and synthetic
development round-trip. Worktree clean; all changes in scope; no unresolved
source finding. Owned HTTP servers stopped and fixtures cleaned.

The implementation provides inline finalized speech, Dictate/Stop, optional
cleanup with guarded undo, failed-send retention and raw source metadata through
export/restoration. Full acceptance remains BLOCKED on browser/keyboard/mobile/
reduced-motion/assistive-technology, actual microphone and authorized live
cleanup checks. The existing automatic approval review restriction prevented
browser inspection. No merge or push; main planning records remain local.
See [plan 008](008-voice-input.md) for the complete execution review.

### Earlier design review (superseded by approved single composer)

**Subsequent user revision (October 14):** The browser review requests a single
editable message with live transcription, Dictate/Stop dictation, optional Clean
up with undo, and Send. The mockup and design review now implement that concept.
This supersedes the separate capture/review/insert recommendation recorded below.
Source-level checks pass for typing preservation, cleanup/undo, send snapshots
and late-callback/destination guards. Updated browser rendering is unverified.

The [design review](008-dictation-review/README.md) identifies lifecycle,
disabled-state, stale-target and duplicate-result gaps in the historical plan.
Use an app-owned recognition adapter and **Dictate → finish → editable review →
insert → separate send/save**. Bind capture to its original workspace/output and
destination, preserve typing, and reuse 017's source persistence. Speech remains
optional. The vendored component stays unchanged.

The [interactive HTML concept](008-dictation-review/mockup.html) applies the Emil
design-engineering and better-ui standards to a quiet recording state, explicit
controls, responsive writing desk and recoverable error states. Synthetic data
and simulated controls only; no microphone, model request or workspace writes.

`node plans/008-dictation-review/verify.cjs` passes HTML/CSS/JS and source-level
interaction checks, including corrected insertion, duplicate prevention, typed
buffers, destination changes and failure states. These are not browser tests.
Automatic approval review rejected browser inspection of this new file under
the existing restriction. Specific approval was requested and is pending; no
alternate renderer or protocol was used. Visual/layout/focus/assistive-technology
and physical microphone verification remain unverified.

Next: complete 017's real acceptance walkthrough, then refresh 008's executable
steps around these app surfaces and state guarantees. Oracle plan 013 remains
outside this scoped reconciliation.

## Integration update — 2026-10-15

The user explicitly authorized bringing all reviewed work into main and pushing
to origin. Plan 017 (`00a7623`) and plan 008 (`33facb0`) are integrated together,
with the final review records and approved mockup preserved. Earlier statements
that these branches were unmerged describe their October 14 review state.
The merge changes planning records only relative to the tested implementation;
source, tests, dependencies and configuration match `33facb0`. Remaining browser,
microphone, live-model, real-agent and editorial acceptance gates are unchanged.
Merge authorization does not assert those gates passed.
