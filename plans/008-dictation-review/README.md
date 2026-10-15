# Plan 008 — dictation redesign review

## Current decision

Updated 2026-10-14 from the user's browser comment on the mockup. **Use one
editable composer.** Dictate transcribes directly into **Your message**, and the
same button becomes **Stop dictation**. The writer can keep editing or send when
ready. A third **Clean up** action optionally removes filler words and performs
light proofreading. This supersedes the earlier separate capture/review/insert
recommendation; no extra insertion step is required.

Reviewed against main `9782fb8` and plan 017's unmerged candidate `00a7623` in
`/private/tmp/kessel-run-017`, branch `codex/017-app-api-keys-and-mcp`. Plan 007 is
superseded. The HTML remains an illustrative design concept. The user approved
it, and GPT-6.1 Sol implemented the [rewritten plan 008](../008-voice-input.md)
at `33facb0` on `codex/008-inline-dictation`, based on the 017 candidate.
Historical steps are archived and must not be executed.

## Interaction contract

- **Ready:** an editable message and three actions: Dictate, Clean up, Send.
- **Listening:** Dictate becomes Stop dictation with a static status cue inside
  the composer. Append finalized recognition into the current message without
  replacing earlier text or edits. Keep typing and Send available. Do not
  announce every recognized word to assistive technology.
- **Stop:** retain visible text and return the button to Dictate. In production,
  finish recognition with a bounded wait for final results; suppress duplicate
  result indices. If typing overlaps a provisional span, freeze that span rather
  than rewriting the user's correction. A simpler first implementation can keep
  provisional recognition outside the editable value and append only final text.
- **Send while listening:** stop/abort recognition and submit an exact snapshot
  of the text visible at the click. Ignore later recognition callbacks. Do not
  silently append more words to a sent message. On send failure retain the
  unsent snapshot and newer typing under 017's recovery rules.
- **Editing:** recognition appends to the latest buffer, not a saved copy from
  recording start. Use session/result identity to prevent duplicate fragments.
  Keep the caret/selection stable while new speech arrives; never steal focus.
- **Destination change / hidden page / unmount:** stop recognition, invalidate
  late callbacks and retain the original target's draft. Bind sessions to the
  workspace, publication/output and composer destination; never redirect speech
  into a newly selected interview answer or message.
- **Errors / unavailable:** explain permission/service failures or unavailable
  recognition without deleting text. Typing, cleanup where available and sending
  remain usable. Detect capabilities rather than promising support by brand.
- **Requesting / finishing:** expose waiting state and cancellation. Late start
  after cancellation must abort. Finalization has a timeout and cannot strand
  visible text. Stop must remain accessible if the model's busy state changes.

Dictation is optional alongside typed answers, notes and attributed research.
It does not imply higher writing quality or factual verification.

## Optional Clean up

Clean up is explicit and never runs automatically after recognition. It stops
capture, snapshots the visible text and removes obvious filler such as “um” and
“uh,” with light punctuation, capitalization and spelling fixes. It must preserve
meaning, voice, names, numbers, negation, uncertainty and substantive repetition.
Do not summarize, strengthen claims, invent detail or treat words such as “like”
and “well” as filler without context.

Apply the result only if the same target and source text are still current.
If the writer types or navigates during cleanup, retain their draft and present
any returned suggestion separately. Cancellation/failure preserves the original.
Provide **Undo cleanup**; it must not overwrite edits made after cleanup. A real
implementation can keep ordinary editor undo history or offer an explicit
comparison if a later edit makes whole-buffer restoration unsafe.

The mockup uses a small deterministic demonstration, not general proofreading or
a model. It removes um/uh and adjusts spacing/case only. For production model-based
proofreading, use 017's explicitly selected API connection and communicate that
this action makes a billed request. With no key, keep manual editing available
and explain why model cleanup is unavailable. Do not route app generation through
MCP or silently choose another credential/provider.

For retained interview sources, preserve original recognized text separately
from author edits/cleanup and identify the submitted answer as author-corrected.
Cleanup output must not be mislabeled a verbatim transcript. Use existing source
attribution and save operations; sending/cleanup does not approve editorial rules.

## Integration and review findings

| Concern | Required change | Why |
| --- | --- | --- |
| Vendored component readiness can be overridden by caller props | App-owned capability/lifecycle controller; leave vendored code unchanged | Disabled state must reflect availability |
| No public controlled stop, cancellation, interim or error API | App-owned headless recognition adapter | Prevent stuck recording and unhandled late events |
| Async fragments share an editable field | Session/index deduplication and append against latest buffer | Preserve live typing and corrections |
| Send or navigation during capture | Freeze submitted text; invalidate old callbacks | Speech cannot alter sent text or a different destination |
| Cleanup changes authored text | Explicit operation, exact input guard, retained original and undo | Preserve meaning and newer edits |
| Persistent pulse rings / transition-all | Static status, pointer-only 0.96 press; keyboard/reduced motion stationary | Keep recording readable and restrained |

The vendored SpeechInput public API cannot provide the required lifecycle through
styling or a thin wrapper. Extract testable app-owned control logic and use the
existing UI primitives. Do not inspect vendor DOM internals or fork it just for
appearance.

| Surface in 017 | Integration |
| --- | --- |
| `src/components/kessel-run/app/writing-panel.tsx` | Output/voice conversation message; use existing send/recovery behavior |
| `src/components/kessel-run/app/workspace.tsx` source form | Interview/source answer; use existing attributed source save |

Recheck drift before dispatch. No new source store or direct Markdown writes from
the dictation UI. Browser recognition may use a remote service: explain that
briefly before first use. No audio storage, MediaRecorder, offline guarantee or
paid transcription fallback is selected here.

## Verification and concept

[Open the interactive mockup](mockup.html). Dictate appends sample fragments into
the message over time. Stop, typing, cleanup/undo, Send, destination switching and
error previews are interactive. Navigation is illustrative. Nothing records
audio, calls a model, or saves to the workspace.

`node plans/008-dictation-review/verify.cjs` passes source-level HTML/CSS/JavaScript
and interaction checks: direct transcription, toggle stop, typing preservation,
cleanup/undo, protection of later edits, send snapshot stability, cancelled/late
callbacks, destination separation, permission/unavailable states and Escape.
These use DOM stand-ins and a fake timer queue, not a browser or visual renderer.

Future production checks must cover recognition result indices, final/end event
ordering, provisional edits, cancelled starts, no speech, permissions/network,
cleanup response races, send failures and recovery. Browser checks at
390/768/1440 pixels, native keyboard/focus, screen readers and reduced motion
remain required, plus a real microphone/browser/language walkthrough.

The user supplied a screenshot of the prior version and a browser comment; those
informed this revision. Automatic approval review previously blocked assistant
browser inspection under the existing restriction. This revision was not opened
through an alternate tool or renderer. Updated visual/layout/assistive-technology
and physical microphone behavior remain **unverified**.

## Sources and verdict

- [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition): availability and recognition service behavior.
- [MDN stop](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/stop): attempts to return recognition from captured audio.
- [MDN abort](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/abort): stops without attempting a final recognition result.
- [MDN resultIndex](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionEvent/resultIndex): lowest changed result index.

Sources checked October 14 during the initial review. **APPROVED DESIGN /
IMPLEMENTATION REVIEWED / RELEASE ACCEPTANCE BLOCKED:** the advisor independently
verified 151 tests, typecheck, lint (nine baseline warnings), skill checks,
production build and all three HTTP modes at `33facb0`. The committed change
implements the single composer, bounded recognition, optional cleanup with undo,
and raw source provenance. Browser tests are authored but unexecuted; browser,
microphone and live-provider acceptance remain pending. See the rewritten plan's
execution review for evidence and limits. No merge or push was performed.
