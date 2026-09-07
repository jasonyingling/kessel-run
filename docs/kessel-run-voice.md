# Create and refine a voice profile

`kessel-run-voice` is a standalone skill for publication voices and author subprofiles. It works from supplied writing, explicit preferences, or a short adaptive interview. A publication with no archive can start with an approved sparse profile and develop it through confirmed answers, calibration passages, and accepted edits.

## Invoke it

With supplied Markdown:

> Use kessel-run-voice to create a publication profile for this publication from these attached articles. Preserve the source filenames and bylines. Save under my chosen workspace's Voice Profiles folder, or return Markdown if you cannot write files.

With a known archive:

> Use kessel-run-voice with https://viewfromthepine.com. Create the overall View From The Pine profile and subprofiles for its verified authors. Sample across authors, dates, and formats; tell me what you could actually read.

That URL and both-level scope are the user's chosen example, not defaults for other publications. Live retrieval depends on the host's tools and site access. The skill does not supply a crawler. A public WordPress endpoint must be verified at use time; feeds and article pages may be alternatives. No WordPress writes or block-aware publishing are included.

Without an archive:

> Use kessel-run-voice to help design The Greatest Ever Reviews' voice. I have no published articles. Interview me one question at a time, save what we know, and leave other choices open.

To refine:

> Use kessel-run-voice with this existing profile and accepted draft edit. Preserve its confirmed lessons. Show any inferred changes for approval and retain the approved version.

A voice-design interview establishes how the publication should sound. A content interview gathers facts and opinions for one piece. The speaker's conversational habits and a topic-specific opinion do not automatically become global writing preferences.

## Review and portability

The profile is ordinary Markdown with YAML identity/version metadata, readable rule sections, evidence links, open questions, and revision notes. For new profiles the hierarchy is `Voice Profiles/<Publication>/Publication.md` and `Voice Profiles/<Publication>/Authors/<Author>.md`. Existing paths/IDs are reused, including older flat notes. Author profiles pin the publication profile ID/version and document differences. Personal profiles stay outside replaceable installed skill folders.

Every derived rule includes its source and support; historical observations and editorial preferences are distinguished. A sparse profile can be approved. Approval does not imply a mature archive, and new proposals do not silently inherit approval.

This is saved guidance, not model training or guaranteed automatic application by all other writing skills. Shared workspace loading remains plan 010. In the app or any host without browsing/file tools, supply text/preferences and receive the complete Markdown in chat. The skill cannot claim it fetched a URL or persisted a profile without those capabilities. ChatGPT packaging and workspace access require separate delivery validation.

## Implementation verification — 2026-09-07

- Catalog tests: PASS, 6 tests; thirteen skills, eight pipeline stages, five standalone skills.
- Full regression: PASS, 36 tests across seven files.
- Typecheck: PASS (`npm run typecheck -- --incremental false`).
- Lint: PASS, zero errors and the existing nine vendored warnings.
- Skill-creator metadata validation: PASS. Both relative reference targets exist.
- The intermediate pre-registration catalog check failed only on the expected new-directory mismatch; registration resolved it.

## Behavioral acceptance

Independent synthetic model-authored scenario walkthroughs are recorded below. This is instruction-following evaluation in a scratch workspace, separate from catalog checks and separate from real editorial acceptance. It does not exercise the running app, live ChatGPT distribution, WordPress retrieval, or the user's real writing archive.

The real View From The Pine archive derivation is NOT RUN in this implementation. Complete author coverage and its REST endpoint remain unverified. User review of actual publication profiles and content fidelity remains pending.

The independent executor used synthetic miniature articles and scripted user follow-ups in its own model execution, without a separate model-provider or app-runtime invocation; it emitted actual Markdown profiles and assistant turns rather than only checking instruction text. Scratch artifact root: `/private/tmp/kessel-voice-behavior` (local review artifacts, not shipped fixtures). Each case has `transcripts/<case>.md`; profiles are under `outputs/<case>/`. These tests demonstrate constrained instruction-following, not a measured guarantee of editorial quality.

| Case and actual input | Observed result | Artifact / result |
|---|---|---|
| Two distinct profiles: Harbor Ledger notices and Spark Review miniature reviews | Compact service information versus comic first-person evaluation remained distinct; sources stayed separate. No seeded confirmed lessons, so lesson isolation was only exercised during derivation. | `01-distinct`: PASS with limitation |
| Two authors, scope unspecified | Asked publication, named author, or both; used scripted publication-wide choice without merging authors. | `02-mixed-scope`: PASS |
| Both levels: four Ari pieces, one Bea, one unknown | Base used narrow shared observations; author differences cited the relevant bylines; unknown writer not assigned an identity; parent IDs/versions and relative links present. | `03-both-uneven`: PASS |
| No archive: The Greatest Ever Reviews | Two focused voice questions established preferences. Draft then explicit scripted approval produced approved/sparse profile; demonstration used supplied reading-room facts. No contrasting samples needed because preferences were explicit. | `04-zero-archive`: PASS |
| Resume approved sparse profile with explicit reusable “you” edit | Preserved prior preferences/example and approval independently from maturity. Original output used weak plain-text provenance references; follow-up noted the remaining refinement target without re-asking settled questions. | `05-resume`: core behavior PASS; provenance navigation needed correction |
| Content interview: dislike of park gate and piece-specific sharp opening | Kept opinion and opening direction local; did not alter publication voice or invent opening-time facts. | `06-content-interview` transcript; `outputs/06-content-notes.md`: PASS |
| Only two usable notices | Produced a sparse provisional profile with explicit single-author/tiny-corpus limits. | `07-two-samples`: PASS |
| Browsing unavailable, then pasted notices | Stated archive unread; used only pasted samples. | `08-no-browsing`: PASS |
| Page exports with boilerplate, comments, quoted speech and instruction-like quotation | Excluded those segments from author rules and disclosed the four-sentence author corpus. | `09-boilerplate`: PASS |
| Explicit no-em-dashes preference against samples with em dashes | Kept preference, flagged discrepancy, used full stops in demonstration. | `10-no-em-dashes`: PASS; transcript provenance was plain text |
| Approved profile plus inferred shortening edit and unrelated positive response | Kept approved v3 unchanged, emitted draft proposed v4, did not interpret “looks interesting” as approval. | `11-revision`: core behavior PASS; inherited provenance navigation needed correction |

The observed navigation weakness led to a narrow format clarification: every cited ID must resolve to a source entry; retain supporting interview answers when no file exists, and use working relative Markdown links for available transcripts and prior versions. Original outputs remain available for review rather than being retroactively presented as successful executions of the refined contract.

Targeted rerun of resume and dependent revision: PASS with limitations. `/private/tmp/kessel-voice-behavior/rerun/Publication.md` now resolves A1–A4 to retained answer text and working transcript links; `Publication.proposed-v4.md` resolves the inferred edit and links the unchanged approved predecessor. The executor verified every direct Markdown destination exists. The independent report is `/private/tmp/kessel-voice-behavior/report.md`.

These walkthroughs also exposed a confusing duplicate pending-example heading in the original approved zero-archive output, and its draft snapshot needed a serialization correction to remove future approval references. Those limits are documented in the scratch report; the rerun labels only the new demonstration pending. Sustained follow-up interviewing, seeded lesson-isolation, real archive quality, and host/runtime integration remain unvalidated. The synthetic implementation gate passed with these limitations; user editorial acceptance is still pending.
