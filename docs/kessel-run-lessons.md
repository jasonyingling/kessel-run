# Learn voice preferences from accepted edits

`kessel-run-lessons` compares an exact retained machine draft with the author-accepted final for the same output. It proposes a few useful publication or author voice rules, asks for decisions on inferred rules, and records confirmed changes with evidence. An accepted final can be unpublished; an approved sparse profile can learn without an archive. This edits readable guidance, not model training.

## Invoke it

> Use kessel-run-lessons for this Output.md. Compare its exact saved machine draft and accepted Final.md. Show me possible publication voice lessons; keep product facts and one-piece edits local.

> Compare these two prose versions using this author profile and its pinned parent. I already approve using “you” instead of “one” as a reusable author preference. Record that rule; show other suggestions separately.

> I have no file access. Here are the profile, machine draft, accepted final and output identity. Return an unsaved Markdown patch and review record with the supporting excerpts.

Polish can offer Lessons after the author actually accepts the final prose. It passes the original machine snapshot and accepted final, never the scorecard. Lessons also runs independently. Missing or ambiguous source versions must be resolved; it does not reconstruct the original from memory.

## Review and preservation

Each candidate identifies its rule, scope, target, exact comparison pair, supporting excerpts/links, reason, confidence and conflicts. Accept some/all, edit, or reject. Acceptance of the prose does not approve inferred global preferences. An explicit approval of an identified rule need not be requested again.

This version applies publication/author voice lessons only. Product corrections, ratings, isolated structure and format observations remain in output Review notes; presets are not edited. Author lessons stay with that author, and conflicts with publication requirements need a decision before activation.

Confirmed lessons appear in the selected profile with provenance. Pending and rejected candidates remain separately identified in Review notes, never active guidance. Exact prior profile snapshots, machine prose, acceptance history and existing lessons stay recoverable. Applying a lesson does not silently retarget old output pins or change publication defaults. Profile approval and evidence maturity are independent.

Stable pair IDs and comparison with existing decisions prevent duplicate lessons or version bumps on an unchanged rerun. Without files, the returned patch is explicitly unsaved and includes real rules and comparison excerpts so another session can continue.

## Implementation verification — 2026-09-07

- `npm run skills:sync` and `npm run skills:check`: PASS, fifteen bundled workspace references.
- Catalog tests: PASS, six tests; fifteen skills, eight pipeline stages and seven standalone skills.
- Full regression: PASS, forty tests across eight files.
- Typecheck and skill metadata validation: PASS.
- Lint: PASS, zero errors and the existing nine vendored warnings.

Behavioral checks below are separate from static metadata tests. They are synthetic model-authored scenario walkthroughs with explicitly scripted approvals, not real user decisions, model-provider benchmarks or running-app tests. No personal vault or publication profiles are changed by those checks.

## Observed behavioral walkthrough

Independent executor artifacts are in `/private/tmp/kessel-lessons-behavior`: `before/` preserves originals, `workspace/` holds the applied notes, `workspace/Transcript.md` records actual authored assistant turns and scripted user decisions, and `workspace/Piece/Review.md` records candidates and provenance. The executor serialized its authored outputs with `build.py`; it did not call a separate model-provider API or the app runtime.

The integrated fixture uses Harbor Notes, author Mara and sibling Ellis, approved sparse profiles, an exact lamp-review machine draft and accepted unpublished final. The draft contains generic scene-setting, impersonal wording, a transition and an incorrect battery capacity. Scripted decisions explicitly approve two identified reusable rules, reject a third and keep the product correction local.

| Check | Actual observation | Result |
|---|---|---|
| Accepted publication lesson | Generic opener removal became L-P1 in publication v2, with exact pair and explicit D1 approval | PASS |
| Author scope | L-A1 went to Mara v2 only; parent received only its separately approved L-P1, sibling Ellis stayed unchanged; author parent pin stayed v1 | PASS |
| One-off product fact | Battery capacity correction stayed in Review as a local observation, outside active voice guidance | PASS |
| Rejection | Transition candidate L-P2 remained rejected with reason, never active | PASS |
| Unchanged rerun | Identical exact pair recognized; no duplicate rules, evidence records or version bump | PASS |
| Missing original | Requested exact draft/output identity; did not invent a diff, pair or profile revision | PASS |
| No filesystem | `No-files-handoff.md` contains an explicitly unsaved proposed v3 patch, exact supplied prose, actual prior rules and complete prior profile; no v3 target was persisted | PASS |
| Sparse unpublished learning | Approved profiles stayed sparse and approved after precise confirmed additions; no published archive history invented | PASS |

`verification.json` and `readback-verification.json` record artifact checks. The executor verified 64 working workspace links, byte-exact predecessor snapshots, unchanged sibling/default/output pins and original prose, one occurrence of each active lesson and no saved v3. The reviewer read the transcript, review, resulting profiles and no-file handoff rather than treating text assertions as behavioral proof.

Limitations: the updated publication retained an open question about openings even though the new lesson partly answers it. Contradictory parent-rule resolution was not exercised; the fixture's author lesson agrees with existing requirements. Simultaneous publication/author approvals demonstrate rule separation but not every possible cross-profile mutation sequence. These bounded walkthroughs support the implementation gate, not user editorial acceptance, varied-model reliability, real ChatGPT delivery or app integration.
