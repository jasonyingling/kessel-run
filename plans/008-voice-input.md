# Plan 008: Add push-to-talk dictation to the project chat input

> **Reconciled 2026-09-19 at `63177e4`: DEFERRED — app work follows real content validation.**
> Dictation remains unimplemented: the chat has no `SpeechInput` and
> `src/lib/kessel-run/dictation.ts` does not exist. Before dispatch, rewrite the
> disabled-state design: the vendored speech component spreads `...props` after
> `disabled={isDisabled}`, so a caller can override its internal readiness guard.
> Define app-owned capability handling without editing the vendored component;
> use detected capabilities rather than browser-brand assumptions. The two
> component files are unchanged from the historical baseline, but this design
> gap remains. Do not execute the historical steps below. The old Planned-at
> stamp is retained; see [current reconciliation](2026-09-19-reconciliation.md).

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> ```
> git diff --stat 490545a..HEAD -- src/components/kessel-run/project-chat.tsx src/components/ai-elements/speech-input.tsx src/lib/kessel-run
> ```
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none — this is independent of plan 007 and the two can land in
  either order. It is numbered second because the Interview stage is what makes
  dictation worth having.
- **Category**: dx
- **Planned at**: commit `490545a`, 2026-08-21

## Why this matters

The Interview stage (plan 007) only pays off if the answers are spoken. Typed
answers to good interview questions come out short, tidy, and pre-edited — which
is the same thing as pre-generified. Spoken answers are longer, messier, and full
of the specific asides and half-formed opinions that make writing sound like a
person. The transcript is the source of record for the whole piece, so the
quality of that raw material sets the ceiling on everything downstream.

Right now the only way into the chat is a textarea. This plan adds a microphone
button that dictates into it: press, talk, watch the words land, edit if you
want, send. The heavy lifting is already vendored — `speech-input.tsx` is a
complete, unused Web Speech API component sitting in `src/components/ai-elements/`.
This plan wires it up, extracts the one piece of real logic into a testable
module, and handles the browsers where it does not work.

## Current state

### `src/components/ai-elements/speech-input.tsx` — already present, currently unused

A vendored ai-elements component. It is a `<Button>` with pulse rings that
toggles listening. Relevant contract:

```tsx
export type SpeechInputProps = ComponentProps<typeof Button> & {
  onTranscriptionChange?: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  lang?: string;
};
```

- It detects one of three modes at mount: `"speech-recognition"` (Web Speech API
  present — Chrome, Edge), `"media-recorder"` (no Web Speech API but
  `MediaRecorder` exists — Firefox, Safari), or `"none"`.
- In `speech-recognition` mode it runs `continuous = true`,
  `interimResults = true`, and calls `onTranscriptionChange` with **final**
  transcript fragments only, one fragment per pause. Fragments arrive with no
  leading space and no trailing punctuation.
- In `media-recorder` mode the button is **disabled** unless `onAudioRecorded`
  is supplied. This plan does not supply one, so on Firefox and Safari the mic
  renders disabled. That is the intended outcome for now — see "Maintenance
  notes".
- Its `disabled` calculation is:
  ```tsx
  const isDisabled =
    mode === "none" ||
    (mode === "speech-recognition" && !isRecognitionReady) ||
    (mode === "media-recorder" && !onAudioRecorded) ||
    isProcessing;
  ```

Nothing in the repo imports it. `grep -rn "speech-input" src/` returns only the
file itself.

### `src/components/kessel-run/project-chat.tsx:83-89` — the input state

```tsx
  const handleSubmit = async () => {
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput("")
  }
```

### `src/components/kessel-run/project-chat.tsx:139-150` — the input, as it renders today

```tsx
      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            className="md:leading-10"
            value={input}
            placeholder="Type your message..."
            disabled={status !== "ready"}
          />
        </PromptInputBody>
      </PromptInput>
```

There is no footer and no visible submit button. Enter submits, via
`PromptInputTextarea`'s internal `form?.requestSubmit()`.

### The hazard that will bite you if you skip it

`src/components/ui/button.tsx` does **not** set a default `type`. An HTML
`<button>` inside a `<form>` defaults to `type="submit"`. `SpeechInput` renders
a `<Button>` and spreads its props onto it, so unless you pass `type="button"`
explicitly:

1. Clicking the mic submits the chat form instead of starting dictation.
2. `PromptInputTextarea`'s Enter handler looks up `form?.querySelector('button[type="submit"]')`
   and would find the mic button, so Enter would read the mic's disabled state
   instead of the real submit button's.

Pass `type="button"` on the `SpeechInput`. This is the single most likely way
for this plan to ship broken.

### Repo conventions to match

- `src/components/` and `src/lib/` use **double quotes and no semicolons**.
  `src/mastra/` uses single quotes with semicolons. Match the file you are in.
- App UI lives in `src/components/kessel-run/`. `src/components/ai-elements/`
  and `src/components/ui/` are vendored and must not be edited — pass
  `className` instead, the way `project-chat.tsx` already does for
  `ToolInput`/`ToolOutput`.
- Tests are Vitest, colocated, `*.test.ts` only. `vitest.config.ts` sets
  `environment: "node"` and its comment says component tests would need jsdom
  and are deliberately not configured. So: no component test. Testable logic
  gets extracted into a plain `.ts` module in `src/lib/kessel-run/`.
- Every flex container in this workspace carries `min-w-0` — see the comment
  block in `project-workspace.tsx`. Do not introduce a flex child without it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Tests | `npm test` | exit 0, all pass |
| Typecheck | `npm run typecheck` | exit 0, no output |
| Lint | `npm run lint` | exit 0, `9 problems (0 errors, 9 warnings)` |
| Build | `npm run build` | exit 0 |
| Dev server | `npm run dev` | listening on `http://localhost:3000` |

**Run `npm install` first.** A `node_modules` predating commit `87fa9fd` has no
`vitest`, and both `npm test` and `npm run typecheck` fail with
`Cannot find module 'vitest'` until you install.

`npm run build` logs `IO Error: Could not set lock on file .../mastra.duckdb`.
Known, pre-existing, non-fatal. Ignore it.

## Scope

**In scope** (the only files you may modify or create):

- `src/lib/kessel-run/dictation.ts` (create)
- `src/lib/kessel-run/dictation.test.ts` (create)
- `src/components/kessel-run/project-chat.tsx`
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/components/ai-elements/speech-input.tsx` and every other file under
  `src/components/ai-elements/` or `src/components/ui/` — vendored library code
  carrying hand-applied compatibility fixes. Re-running the ai-elements CLI
  would overwrite any edit you make here. If the component needs different
  behavior, pass props; if props cannot express it, STOP and report.
- `vitest.config.ts` — do not add jsdom. Component testing is a deliberate
  non-goal; the browser walkthrough in step 5 covers what a jsdom test would.
- Any server route, the Mastra agent, or the skills. Dictation is entirely
  client-side.
- A server-side transcription endpoint. Explicitly deferred; see "Maintenance
  notes".

## Git workflow

- Branch: `advisor/008-voice-input`
- Commit per step or per logical unit. Message style from `git log`: short
  imperative sentence, no prefix, e.g. `Add project workspace route, loading, and not-found pages`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the transcript-append rule into a testable module

`SpeechInput` delivers final transcript fragments one at a time, with no leading
space and no trailing punctuation. Naively concatenating them produces
`we tried thatit broke`. Joining them unconditionally with a space produces a
leading space on an empty input and a double space after a user-typed trailing
space.

Create `src/lib/kessel-run/dictation.ts`:

```ts
/**
 * Fold a speech-to-text fragment into whatever is already in the composer.
 *
 * `SpeechInput` fires one call per pause in speech, with fragments that carry
 * no leading space and no trailing punctuation. The user is also free to type
 * around dictated text at any point, so this has to be safe against an empty
 * box, a box ending in whitespace, and a box ending mid-word.
 *
 * Deliberately does not punctuate or capitalize. Interview transcripts are the
 * source of record for the piece and are kept verbatim — tidying here would
 * quietly edit the author's own words before anyone reads them.
 */
export function appendDictation(current: string, fragment: string): string {
  const chunk = fragment.trim()
  if (!chunk) return current
  if (!current) return chunk
  if (/\s$/.test(current)) return current + chunk
  return `${current} ${chunk}`
}
```

**Verify**: `npm run typecheck` → exit 0, no output

### Step 2: Test it

Create `src/lib/kessel-run/dictation.test.ts`, modelled on
`src/lib/kessel-run/artifacts.test.ts` (same import style, double quotes, no
semicolons):

```ts
import { describe, expect, it } from "vitest"
import { appendDictation } from "./dictation"

describe("appendDictation", () => {
  it("returns the fragment alone when the composer is empty", () => {
    expect(appendDictation("", "so the thing that broke")).toBe(
      "so the thing that broke",
    )
  })

  it("separates consecutive fragments with a single space", () => {
    expect(appendDictation("so the thing that broke", "was the migration")).toBe(
      "so the thing that broke was the migration",
    )
  })

  it("does not double up when the composer already ends in whitespace", () => {
    expect(appendDictation("I typed this ", "then said this")).toBe(
      "I typed this then said this",
    )
  })

  it("ignores a whitespace-only fragment", () => {
    expect(appendDictation("unchanged", "   ")).toBe("unchanged")
  })

  it("preserves the fragment verbatim, including filler and false starts", () => {
    const messy = "I mean, the — the thing is, we, uh, we never measured it"
    expect(appendDictation("", messy)).toBe(messy)
  })
})
```

**Verify**: `npm test` → exit 0, all pass, including 5 new tests in
`dictation.test.ts`

### Step 3: Wire the microphone into the chat input

In `src/components/kessel-run/project-chat.tsx`:

**a.** Add imports. Extend the existing `prompt-input` import to include
`PromptInputFooter`, `PromptInputTools`, and `PromptInputSubmit`, and add two
new import lines:

```tsx
import { SpeechInput } from "@/components/ai-elements/speech-input"
import { appendDictation } from "@/lib/kessel-run/dictation"
```

**b.** Add a dictation handler next to `handleSubmit`:

```tsx
  const handleDictation = useCallback((fragment: string) => {
    setInput((current) => appendDictation(current, fragment))
  }, [])
```

Import `useCallback` from `react` alongside the existing hooks. The functional
`setInput` form matters: `SpeechInput` holds `onTranscriptionChange` in a ref
and fires it from an async recognition callback, so reading `input` directly
would capture a stale value between fragments.

**c.** Replace the `PromptInput` block with:

```tsx
      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            className="md:leading-10"
            value={input}
            placeholder="Type, or press the mic and talk..."
            disabled={status !== "ready"}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools className="min-w-0">
            {/*
              `type="button"` is load-bearing. ui/button sets no default type,
              so a <button> inside this <form> would be type="submit": clicking
              the mic would send the message, and PromptInputTextarea's Enter
              handler — which finds the submit control with
              querySelector('button[type="submit"]') — would read the mic's
              disabled state instead of the real one.
            */}
            <SpeechInput
              type="button"
              size="icon-sm"
              aria-label="Dictate your answer"
              title="Dictate (Chrome and Edge)"
              onTranscriptionChange={handleDictation}
              disabled={status !== "ready"}
            />
            <span className="truncate text-xs text-muted-foreground">
              Talk it out — rambling makes better material than typing.
            </span>
          </PromptInputTools>
          <PromptInputSubmit status={status} disabled={!input.trim()} />
        </PromptInputFooter>
      </PromptInput>
```

Note on `disabled`: `SpeechInput` computes its own disabled state internally and
ORs it with nothing — the prop you pass is spread onto the `<Button>` **after**
its internal `disabled={isDisabled}`, so your value wins. Passing
`status !== "ready"` is correct: the mic should be off while a response streams.
It also means the button will be enabled on Firefox/Safari where the internal
logic wanted it disabled. Accept that for now — clicking it there is a no-op,
because `toggleListening` takes neither branch without an `onAudioRecorded`
handler. Note it in your report.

**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `grep -c 'type="button"' src/components/kessel-run/project-chat.tsx` → `1`

### Step 4: Full static verification

**Verify**: `npm test` → exit 0, all pass
**Verify**: `npm run typecheck` → exit 0, no output
**Verify**: `npm run lint` → exit 0, `9 problems (0 errors, 9 warnings)`
**Verify**: `npm run build` → exit 0
**Verify**: `git status --porcelain` → only the three in-scope source files
**Verify**: `git diff --name-only | grep -c "ai-elements\|components/ui"` → `0`

### Step 5: Browser walkthrough — reviewer only

**If you are an executor without a browser, SKIP this step and say so in your
report. Do not fabricate any part of it.**

With `npm run dev` running and a project open at
`/kessel-run/projects/<id>`, in Chrome:

1. The mic button renders in the input footer, left of the caption, with a
   submit button on the right. No layout shift, no horizontal page scroll —
   confirm `document.documentElement.scrollWidth === clientWidth`.
2. Click the mic. The browser prompts for microphone permission; grant it. The
   button turns destructive-colored, shows a square stop icon, and the pulse
   rings animate.
3. Speak two sentences with a clear pause between them. Both land in the
   textarea, separated by exactly one space, with no leading space and no
   duplicated fragments.
4. Type a word at the end, then speak again. The spoken fragment appends after
   the typed word with one space.
5. Click stop. Rings stop, icon returns to the microphone, text stays in the
   box.
6. Press Enter. The message sends — confirming the mic button did not steal
   `type="submit"`.
7. Send a message and click the mic while the response is streaming. The mic is
   disabled.

**Verify**: all seven observed. Record any that were not.

## Test plan

- New file `src/lib/kessel-run/dictation.test.ts` with the five cases in step 2:
  empty composer, consecutive fragments, composer already ending in whitespace,
  whitespace-only fragment, and verbatim preservation of messy speech.
- Model after `src/lib/kessel-run/artifacts.test.ts` — same import style, same
  `describe`/`it` shape.
- No component test. `vitest.config.ts` is `environment: "node"` with
  `include: ["src/**/*.test.ts"]`, and its own comment records that component
  tests are deliberately not configured. The browser walkthrough in step 5 is
  what covers the wiring.
- Verification: `npm test` → all pass, including 5 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0; `src/lib/kessel-run/dictation.test.ts` exists and its
      5 tests pass
- [ ] `npm run typecheck` exits 0 with no output
- [ ] `npm run lint` exits 0 with `9 problems (0 errors, 9 warnings)`
- [ ] `npm run build` exits 0
- [ ] `grep -c 'type="button"' src/components/kessel-run/project-chat.tsx` → `1`
- [ ] `grep -rn "SpeechInput" src/components/kessel-run/project-chat.tsx` → 2 matches
      (the import and the element)
- [ ] `git diff --name-only` lists no file under `src/components/ai-elements/`
      or `src/components/ui/`
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] `plans/README.md` status row for 008 updated
- [ ] Step 5 either performed and reported item by item, or explicitly reported
      as skipped for lack of a browser

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `project-chat.tsx` or `speech-input.tsx` changed since
  `490545a` and no longer matches the excerpts above.
- `SpeechInput`'s props do not match the `SpeechInputProps` type in "Current
  state" — the vendored component has been updated and the wiring may differ.
- You need to edit anything under `src/components/ai-elements/` or
  `src/components/ui/` to make this work. Passing props should be sufficient;
  if it is not, that is a finding, not something to work around.
- `npm run lint` reports anything other than exactly 9 warnings and 0 errors.
  The 9 pre-existing warnings are all in vendored `ai-elements` files; a tenth
  is yours.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **Firefox and Safari get no dictation.** They have no Web Speech API, so
  `SpeechInput` falls into `media-recorder` mode, which needs an
  `onAudioRecorded` callback that this plan does not supply. The upgrade is a
  small one and the component is already built for it: add a POST
  `/api/kessel-run/transcribe` route that takes the audio blob and returns text,
  and pass `onAudioRecorded={...}` returning that text. That needs a
  transcription model — note that `@ai-sdk/openai` is **not** currently a
  dependency (the agent uses the gateway model string `openai/gpt-5`), so it
  would add one, plus per-minute API cost. The `ai` package already exports
  `transcribe`.
- **Where the audio goes.** Chrome's Web Speech API sends audio to Google's
  speech service for recognition. That is worth knowing before dictating
  anything client-confidential into an interview. A server-side transcription
  route would move that to whichever provider is chosen instead — it does not
  make the concern disappear.
- **Do not add punctuation or capitalization to `appendDictation`.** The
  Interview stage's transcript is the source of record for the finished piece
  and its verbatim rule is deliberate. Cleaning up here would edit the author's
  words before anyone reads them, which is the exact failure the transcript rule
  exists to prevent.
- **A reviewer should scrutinize**: `type="button"` on the `SpeechInput`, the
  functional `setInput` update in `handleDictation` (a direct read of `input`
  would drop fragments), and that no vendored file was edited.
- **Deferred out of this plan**: a live interim-transcript preview (the
  component requests `interimResults` but only forwards finals), microphone
  device selection via the vendored `mic-selector.tsx`, and any keyboard
  shortcut for push-to-talk.
