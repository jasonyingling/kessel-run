# Plan 006: UI — project workspace (chat, stage rail, artifacts)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check**: The usual `git diff <SHA>..HEAD` check does not work in this
> repo — see "A warning about drift detection" in `plans/README.md`. Instead,
> confirm the "Current state" excerpts below match the live files before
> proceeding. A mismatch is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/005-ui-shell.md
- **Category**: direction
- **Planned at**: commit `d554b36`, 2026-07-29

## Why this matters

This is the screen where the work actually happens. Plan 005 gets a user to a
project; this plan gives that project a workspace: pick a stage, talk to the
agent with that skill pinned, and watch the pipeline artifacts fill in as each
stage completes.

Three things have to come together here. Pinning has to reach the server on
every message (not just the first). Artifacts have to refresh when the agent
finishes writing working memory. And the stage rail has to show real completion
state, read from the project rather than guessed from the conversation.

## Current state

### What exists after plan 005

- `/kessel-run` renders the skill gallery and project list; the new-project
  dialog navigates to `/kessel-run/projects/<id>`, which currently 404s.
- `src/components/kessel-run/skill-card.tsx`, `pipeline-rail.tsx`,
  `project-list.tsx`, `new-project-dialog.tsx`.
- `src/app/layout.tsx` wraps children in `TooltipProvider` and mounts `Toaster`.
- shadcn components available: everything listed in plan 005 plus `label`,
  `skeleton`, `sonner`.
- API from plan 004: `GET /api/kessel-run/projects/[projectId]` →
  `ProjectDetail` (`ProjectSummary` + `state: ProjectState`), and
  `GET|POST /api/kessel-run/projects/[projectId]/chat`.
- `src/mastra/projects/schema.ts` exports `STAGE_ARTIFACT_FIELD`,
  `stageIsComplete`, `ProjectState`.

### The chat implementation to model after

`src/app/chat/page.tsx` is the working AI Elements + `useChat` integration from
the Mastra guide. **Do not modify it** — copy its patterns. The parts that
matter:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { DefaultChatTransport, ToolUIPart } from 'ai'
import { useChat } from '@ai-sdk/react'

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'

import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'

import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'

function Chat() {
  const [input, setInput] = useState<string>('')

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch('/api/chat')
      const data = await res.json()
      setMessages([...data])
    }
    fetchMessages()
  }, [setMessages])

  const handleSubmit = async () => {
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput('')
  }
  // ... renders text parts via <Message>, and parts whose type starts with
  // 'tool-' via <Tool>/<ToolHeader>/<ToolContent>/<ToolInput>/<ToolOutput>
}
```

Reuse the message-rendering structure verbatim — including the
`part.type?.startsWith('tool-')` branch. Rendering tool calls is not decoration
here: it is how the user sees which skill the agent loaded.

### Verified AI SDK facts (checked against installed `ai@7.0.41`)

- `DefaultChatTransport`'s `body` option is typed `Resolvable<object>` — it
  accepts **a function**, resolved at send time. This is essential: a plain
  object captured when the transport is constructed would freeze `pinnedSkill`
  at its initial value and every later message would send a stale pin.
- `useChat` accepts `onFinish` (from `ChatInit`). Use it to refetch project state.
- `status` is `'ready' | 'submitted' | 'streaming' | 'error'`.

### Repo conventions

- `src/app/**` and `src/components/**`: no semicolons, double-quoted imports.
- Tailwind v4 semantic tokens only (`bg-background`, `text-muted-foreground`).
- `cn()` from `@/lib/utils`.
- Server Components by default; `"use client"` only where needed.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | exit 0              |
| Lint      | `npm run lint`      | exit 0, 0 errors    |
| Build     | `npm run build`     | exit 0              |
| Dev       | `npm run dev`       | serves on :3000     |

## Scope

**In scope**:
- `src/lib/kessel-run/artifacts.ts` (create)
- `src/lib/kessel-run/artifacts.test.ts` (create)
- `src/components/kessel-run/stage-rail.tsx` (create)
- `src/components/kessel-run/artifacts-panel.tsx` (create)
- `src/components/kessel-run/project-chat.tsx` (create)
- `src/components/kessel-run/project-workspace.tsx` (create)
- `src/app/kessel-run/projects/[projectId]/page.tsx` (create)
- `src/app/kessel-run/projects/[projectId]/loading.tsx` (create)
- `src/app/kessel-run/projects/[projectId]/not-found.tsx` (create)

**Out of scope** (do NOT touch):
- `src/components/ai-elements/**` — vendored; use as-is.
- `src/components/ui/**` — no new shadcn components are needed; everything this
  plan uses is already installed.
- `src/app/chat/page.tsx` and `src/app/api/chat/route.ts` — the weather demo.
- `src/app/api/kessel-run/**` — plan 004's routes are complete for this plan.
- `src/mastra/**`.

## Git workflow

- Branch: `advisor/006-ui-project-workspace`
- Commit per component; plain imperative subject lines.
- Do NOT push or open a PR.

## Steps

### Step 1: Extract artifact presentation logic

Create `src/lib/kessel-run/artifacts.ts`. This is the one piece of real logic in
the plan, so it lives outside the components and gets tested.

```ts
import {
  STAGE_ARTIFACT_FIELD,
  stageIsComplete,
  type ProjectState,
} from "@/mastra/projects/schema"
import { PIPELINE_SKILLS } from "@/mastra/skills/catalog"

export type ArtifactView = {
  stage: number
  label: string
  field: keyof ProjectState
  complete: boolean
  /** Rendered form of the artifact, or null when the stage has not run. */
  content: string | null
}

/**
 * Turn raw project state into something renderable, in pipeline order.
 *
 * Artifacts are a mix of markdown strings and structured objects (the anchor,
 * the hook). Structured ones are formatted here so the panel only ever deals
 * with strings.
 */
export function toArtifactViews(state: ProjectState): ArtifactView[] {
  return PIPELINE_SKILLS.map(skill => {
    const field = STAGE_ARTIFACT_FIELD[
      skill.stage as keyof typeof STAGE_ARTIFACT_FIELD
    ]
    return {
      stage: skill.stage,
      label: skill.label,
      field,
      complete: stageIsComplete(state, skill.stage),
      content: formatArtifact(state[field]),
    }
  })
}

function formatArtifact(value: ProjectState[keyof ProjectState]): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)

  // Structured artifacts (anchor, hook) render as labelled markdown lines so
  // the panel can treat everything uniformly.
  return Object.entries(value)
    .map(([key, val]) => `**${humanize(key)}**: ${val}`)
    .join("\n\n")
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, c => c.toUpperCase())
}

/** How far through the pipeline this project is, 0..1. */
export function pipelineProgress(state: ProjectState): number {
  const views = toArtifactViews(state)
  if (views.length === 0) return 0
  return views.filter(v => v.complete).length / views.length
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Test the artifact logic

Create `src/lib/kessel-run/artifacts.test.ts`. Model after
`src/mastra/projects/schema.test.ts`.

Cover:
- `toArtifactViews(EMPTY_PROJECT_STATE)` returns 8 entries, all `complete: false`
  and `content: null`.
- Views come back in stage order 0–7.
- A markdown artifact (`ideationMap: "# Map"`) round-trips as its own string.
- A structured artifact (a full `anchor`) formats to a string containing
  `**Idea**:` and `**Key Source Material**:` — proving `humanize` splits camel
  case.
- `pipelineProgress` is `0` for the empty state and `0.25` when two of eight
  stages are complete.

**Verify**: `npm test` → exit 0, 5 new tests pass.

### Step 3: Build the stage rail

Create `src/components/kessel-run/stage-rail.tsx`. `"use client"` — it owns
selection.

Props: `{ views: ArtifactView[]; pinnedSkill: string | null; onPin: (skill: string) => void }`.

Requirements:

- One row per pipeline stage, in order, each a `button` calling `onPin` with
  that stage's skill name (from `PIPELINE_SKILLS`, matched by stage).
- Completed stages get a `Check` icon from `lucide-react`; incomplete ones get
  the stage number in a muted circle.
- The pinned row is visually distinct (`bg-accent`/`border-primary` via `cn()`),
  and carries `aria-current="step"`.
- A `Progress` bar from `@/components/ui/progress` above the list, fed by
  `pipelineProgress`.
- Below a `Separator`, the three `STANDALONE_SKILLS` as pinnable rows with no
  completion state.
- The whole rail wrapped in `ScrollArea` so a short viewport does not clip it.

Accessibility: rows are real `<button>` elements, not divs with onClick.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Build the artifacts panel

Create `src/components/kessel-run/artifacts-panel.tsx`. Can be a Server
Component if it takes `views` as a prop — prefer that.

Requirements:

- `Tabs` from `@/components/ui/tabs` with one tab per **completed** stage.
- If nothing is complete, render an empty state explaining that artifacts appear
  as stages finish. Do not render an empty tab strip.
- Tab content shows the artifact `content` in a `ScrollArea` with
  `whitespace-pre-wrap` so markdown line breaks survive.
- Do **not** add a markdown renderer. `streamdown` is present as an ai-elements
  transitive dependency but is not a direct dependency of this project; pulling
  it in here would couple app code to vendored internals. Plain preformatted
  text is correct for this plan.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: Build the chat pane

Create `src/components/kessel-run/project-chat.tsx`. `"use client"`.

Props: `{ projectId: string; pinnedSkill: string | null; onStateChanged: () => void }`.

This is the load-bearing component. Three things must be right:

**(a) The pinned skill must be sent live, not captured.** Keep it in a ref that
tracks the prop, and pass a *function* as the transport `body`:

```tsx
const pinnedRef = useRef(pinnedSkill)
useEffect(() => {
  pinnedRef.current = pinnedSkill
}, [pinnedSkill])

const [transport] = useState(
  () =>
    new DefaultChatTransport({
      api: `/api/kessel-run/projects/${projectId}/chat`,
      body: () => ({ pinnedSkill: pinnedRef.current }),
    }),
)
```

`body` is `Resolvable<object>`, so the function is called per request. Building
the transport inside `useState(() => ...)` keeps one instance across renders; a
new transport on every render would drop the in-flight stream.

**(b) Refresh artifacts when the agent finishes.** The agent writes working
memory through its own tool during the turn, so the state is only current after
the stream ends:

```tsx
const { messages, setMessages, sendMessage, status } = useChat({
  transport,
  onFinish: () => onStateChanged(),
})
```

**(c) Hydrate history from the project's own thread**, mirroring
`src/app/chat/page.tsx` but against the project endpoint:

```tsx
useEffect(() => {
  const load = async () => {
    const res = await fetch(`/api/kessel-run/projects/${projectId}/chat`)
    if (!res.ok) return
    setMessages([...(await res.json())])
  }
  load()
}, [projectId, setMessages])
```

Render messages exactly as `src/app/chat/page.tsx` does — text parts through
`<Message>/<MessageContent>/<MessageResponse>`, and `tool-*` parts through
`<Tool>/<ToolHeader>/<ToolContent>/<ToolInput>/<ToolOutput>`. Keep the
`PromptInputTextarea` `disabled={status !== 'ready'}` behavior.

Add one thing the weather page lacks: when `status === 'error'`, render an
`Alert` from `@/components/ui/alert` telling the user the turn failed. The
weather page silently swallows errors, which is a poor pattern to copy.

**Verify**: `npm run typecheck` → exit 0.

### Step 6: Compose the workspace

Create `src/components/kessel-run/project-workspace.tsx`. `"use client"` — it
owns the pinned-skill state and the artifact refresh.

Props: `{ project: ProjectDetail }`.

Requirements:

- `const [pinnedSkill, setPinnedSkill] = useState(project.pinnedSkill)` —
  seeded from the server-loaded project.
- `const [state, setState] = useState(project.state)` and a `refreshState`
  callback that re-fetches `GET /api/kessel-run/projects/${project.id}` and
  calls `setState(detail.state)`. Pass it to `ProjectChat` as `onStateChanged`.
- Derive `views` with `toArtifactViews(state)`.
- Layout: three columns on `lg` and up — rail (fixed ~16rem), chat (flex-1),
  artifacts (~24rem). Below `lg`, stack them and let the page scroll.
- Header shows project title, publication, format `Badge`, and a back link to
  `/kessel-run`.
- The wide artifact content must scroll inside its own container, never widen
  the page — `overflow-x-auto` on the artifact body.

**Verify**: `npm run typecheck` → exit 0.

### Step 7: Build the route

Create `src/app/kessel-run/projects/[projectId]/page.tsx`. Server Component.

Remember Next 16: `params` is a Promise.

```tsx
export const dynamic = "force-dynamic"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) notFound()

  const state = await getProjectState(resourceId, projectId)

  return <ProjectWorkspace project={{ ...project, state }} />
}
```

Import `getProject` and `getProjectState` from `@/mastra/projects/store`,
`getResourceId` from `@/lib/kessel-run/session`, and `notFound` from
`next/navigation`. Calling the store directly avoids an HTTP round trip to the
app's own route, same as plan 005's page.

Also create:
- `loading.tsx` — `Skeleton` blocks in roughly the three-column shape.
- `not-found.tsx` — a short message and a link back to `/kessel-run`.

**Verify**: `npm run build` → exit 0.

### Step 8: Verify the whole flow in a browser

Needs a real `OPENAI_API_KEY` in `.env` and `npm run dev` running.

1. Open `http://localhost:3000/kessel-run`, create a project (title "Agents at
   agencies", publication "The Newsletter", format "article"). You land on the
   workspace.
2. The stage rail shows 8 stages, all incomplete, progress bar at 0. Artifacts
   panel shows its empty state.
3. Pin **Anchor** (stage 1). Send: "I want to write about how I built a meal
   planning app with Claude in a weekend."
4. Confirm a tool call renders in the transcript naming a skill tool
   (`skill`/`skill_read`/`skill_search`). **This is the check that the pin
   reached the server.** No tool call means pinning is broken.
5. Confirm the reply behaves like the Anchor stage — asking about publication,
   audience, format, or goal — rather than generic chat.
6. Work through the anchor until the agent presents the completed Content Anchor
   block and you confirm it.
7. Confirm the **Anchor stage now shows complete** in the rail and an "Anchor"
   tab appears in the artifacts panel with the anchor fields. This verifies both
   that the agent wrote working memory and that `onFinish` refreshed the view.
8. Reload the page. Confirm messages **and** artifacts both persist.
9. Pin **Ideation** and send a message; confirm the agent picks up the anchor
   from working memory rather than asking for it again.

**Verify**: every numbered step above behaves as described.

### Step 9: Full regression pass

**Verify** all of:

- `npm run typecheck` → exit 0
- `npm test` → exit 0
- `npm run lint` → exit 0, 0 errors
- `npm run build` → exit 0
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/chat` → `200`
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/kessel-run` → `200`
- No hydration warnings and no horizontal page scroll at 1280px or 375px width

## Test plan

- `src/lib/kessel-run/artifacts.test.ts` — 5 cases: empty state produces 8
  incomplete views; views are in stage order; markdown artifacts pass through;
  structured artifacts format with humanized labels; `pipelineProgress` returns
  0 and 0.25 for empty and two-of-eight.
- Model after `src/mastra/projects/schema.test.ts`.
- Components are verified by the browser walkthrough in step 8, not by automated
  tests — component testing needs jsdom and Testing Library, deferred in plan
  001. The step-8 sequence is written to be repeatable by hand.
- Verification: `npm test` → all pass, including 5 new ones.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0 with 5 new tests passing
- [ ] `npm run lint` exits 0 with 0 errors
- [ ] `npm run build` exits 0
- [ ] `GET /kessel-run/projects/<valid-id>` returns 200
- [ ] `GET /kessel-run/projects/nonexistent` renders the not-found page
- [ ] Sending a message with a skill pinned produces a visible skill tool call
      in the transcript
- [ ] Completing the Anchor stage flips that stage to complete in the rail and
      adds an Anchor tab to the artifacts panel **without a manual reload**
- [ ] Reloading the workspace preserves both messages and artifacts
- [ ] `git status --short src/components/ai-elements/ src/components/ui/` is empty
- [ ] `GET /chat` and `GET /kessel-run` still return 200
- [ ] No horizontal page scroll at 375px width
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report back (do not improvise) if:

- No skill tool call appears in the transcript. Do not compensate by injecting
  skill text into the message — that would defeat the progressive-disclosure
  design the whole build rests on. The bug is in how `pinnedSkill` reaches
  `requestContext` (plan 004) or the agent's resolver (plan 002).
- The artifacts panel stays empty after a stage completes. Determine which half
  failed before changing anything: `curl` the project endpoint directly. If
  `state` is populated there, the bug is `onFinish`/refresh in the UI. If it is
  null, the agent is not writing working memory and that is a plan 003 issue.
- The pinned skill is stale on the second message (the agent behaves like the
  first pin). That means `body` was passed as a plain object instead of a
  function — re-read step 5(a).
- You need to modify `src/components/ai-elements/**` to make the chat render.
  The weather page proves those components work as-is.
- The build fails on `params`. The fix is `Promise<{ projectId: string }>` with
  `await params`, not loosening the type to `any`.

## Maintenance notes

- **`body` must stay a function.** If someone "simplifies" it to
  `body: { pinnedSkill }`, pinning silently freezes at the first value and every
  subsequent message uses a stale skill. There is no type error and no runtime
  error — only wrong behavior. Reviewers should look for this specifically.
- **Artifacts refresh on `onFinish` only.** If a stage is ever changed to write
  working memory mid-stream, the panel will lag by one turn and will need a
  different trigger (streaming data parts).
- The agent decides when a stage is "complete" by writing its artifact field.
  There is no server-side enforcement of stage order — by design, since the
  QUICK-REFERENCE documents five different valid orders by format. Do not add
  ordering constraints without revisiting that.
- Deferred and worth doing next: markdown rendering in the artifacts panel,
  copy-to-clipboard per artifact, export of the finished draft, and project
  rename/delete. None of these block the pipeline working end to end.
