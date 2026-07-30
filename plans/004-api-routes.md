# Plan 004: API routes for skills, projects, and skill-pinned chat

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

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-project-state.md
- **Category**: direction
- **Planned at**: commit `d554b36`, 2026-07-29

## Why this matters

Plans 002 and 003 built the Mastra side: eleven skills loaded into one agent,
and a project model that carries pipeline artifacts. None of it is reachable
from a browser yet.

This plan adds the HTTP surface the UI needs — a skills catalog endpoint, project
CRUD, and a chat endpoint that pins a skill for the session by putting it in
Mastra's `requestContext`, which is what the agent's dynamic `skills` resolver
reads. Getting the pinning right here is what makes the "pinned picker +
auto-load" decision actually work end to end.

## Current state

### What exists after plans 002 and 003

- `src/mastra/skills/catalog.ts` — `KESSEL_RUN_SKILLS`, `PIPELINE_SKILLS`,
  `STANDALONE_SKILLS`, `SKILL_PATHS`, `getSkill`, `isKesselRunSkillName`,
  type `KesselRunSkillName`.
- `src/mastra/projects/schema.ts` — `projectStateSchema`, `ProjectState`,
  `CONTENT_FORMATS`, `ContentFormat`, `PROJECT_THREAD_KIND`,
  `EMPTY_PROJECT_STATE`, `STAGE_ARTIFACT_FIELD`, `stageIsComplete`.
- `src/mastra/projects/store.ts` — `createProject`, `listProjects`,
  `getProject`, `getProjectState`, type `Project`.
- `src/mastra/agents/kessel-run-agent.ts` — `kesselRunAgent`, id
  `kessel-run-agent`, with a `skills` resolver that reads
  `requestContext.get('pinnedSkill')` and schema-typed working memory.

### The existing chat route — the pattern to follow

`src/app/api/chat/route.ts` in full. This is the working reference from the
Mastra Next.js guide. **Do not modify it.** The new chat route is modeled on it.

```ts
import { handleChatStream } from '@mastra/ai-sdk'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import { mastra } from '@/mastra'
import { NextResponse } from 'next/server'

const THREAD_ID = 'example-user-id'
const RESOURCE_ID = 'weather-chat'

export async function POST(req: Request) {
  const params = await req.json()
  const stream = await handleChatStream({
    mastra,
    agentId: 'weather-agent',
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: THREAD_ID,
        resource: RESOURCE_ID,
      },
    },
  })
  // @mastra/ai-sdk emits AI SDK v5 chunk types, which don't line up with the
  // v7 `ai` package's stricter unions (e.g. finishReason: 'unknown'). Wire
  // compatible at runtime, so cast across the version gap.
  return createUIMessageStreamResponse({
    stream: stream as unknown as ReadableStream<UIMessageChunk>,
  })
}

export async function GET() {
  const memory = await mastra.getAgentById('weather-agent').getMemory()
  let response = null

  try {
    response = await memory?.recall({
      threadId: THREAD_ID,
      resourceId: RESOURCE_ID,
    })
  } catch {
    console.log('No previous messages found.')
  }

  const uiMessages = toAISdkV5Messages(response?.messages || [])

  return NextResponse.json(uiMessages)
}
```

Three things to carry across to the new route:

1. `handleChatStream` params spread the incoming body and override
   `memory.thread` / `memory.resource` server-side. Never trust a client-sent
   thread id.
2. The `stream as unknown as ReadableStream<UIMessageChunk>` cast is **required**
   — without it `npm run build` fails type checking. It is a genuine version
   skew between `@mastra/ai-sdk` and `ai@7`, not a shortcut.
3. `memory.recall({ threadId, resourceId })` + `toAISdkV5Messages` is how
   history is hydrated.

### Verified Mastra API facts

Checked against the installed packages, not guessed:

- `RequestContext` is exported from `@mastra/core/request-context` and its
  constructor takes an iterable of `[key, value]` tuples:
  `new RequestContext([['pinnedSkill', 'kessel-run-anchor']])`.
  `.get('pinnedSkill')` returns the value.
- `ChatStreamHandlerParams` extends `AgentExecutionOptions`, which includes
  `requestContext?: RequestContext<any>`. So `requestContext` goes inside
  `params`, alongside `messages` and `memory`.

### Repo conventions

- App code (`src/app/**`) uses the `@/` alias and **no semicolons** — match
  `src/app/api/chat/route.ts` exactly.
- `src/mastra/**` uses semicolons. Different trees, different style; follow
  whichever tree you are writing in.
- Next 16 App Router: dynamic route params are a **Promise**. The signature is
  `{ params }: { params: Promise<{ projectId: string }> }` and you must `await
  params`. Getting this wrong is the most likely build failure in this plan.

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
- `src/lib/kessel-run/session.ts` (create)
- `src/lib/kessel-run/api-types.ts` (create)
- `src/app/api/kessel-run/skills/route.ts` (create)
- `src/app/api/kessel-run/projects/route.ts` (create)
- `src/app/api/kessel-run/projects/[projectId]/route.ts` (create)
- `src/app/api/kessel-run/projects/[projectId]/chat/route.ts` (create)
- `src/lib/kessel-run/api-types.test.ts` (create)

**Out of scope** (do NOT touch):
- `src/app/api/chat/route.ts` and `src/app/chat/page.tsx` — the weather demo
  stays exactly as it is. New routes live under `/api/kessel-run/`.
- `src/mastra/**` — this plan consumes plans 002 and 003, it does not change
  them. If you need a new store helper, that is a STOP condition.
- Any React component. Plans 005 and 006 build the UI.
- Authentication. See the session note in step 1.

## Git workflow

- Branch: `advisor/004-api-routes`
- Commit per route or per logical unit; plain imperative subject lines.
- Do NOT push or open a PR.

## Steps

### Step 1: Add the session placeholder

This app has no authentication. Every project would otherwise be global. Rather
than scattering a magic string across four routes, put it in one module so
adding real auth later is a single-file change.

Create `src/lib/kessel-run/session.ts`:

```ts
/**
 * Resource identity for Mastra memory.
 *
 * This app has no authentication yet, so every request resolves to the same
 * single-user resource. Mastra scopes threads and working memory by
 * `resourceId`, so when auth is added, this is the only place that needs to
 * change — every route and store call already goes through it.
 */
const SINGLE_USER_RESOURCE_ID = 'kessel-run-local-user'

export async function getResourceId(): Promise<string> {
  return SINGLE_USER_RESOURCE_ID
}
```

It is `async` deliberately: real auth will need to read cookies or headers, and
making callers `await` now avoids changing every call site later.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Define the wire types

Create `src/lib/kessel-run/api-types.ts`. The UI imports these; keeping them
separate from the Mastra modules means client components never accidentally pull
Mastra (and therefore DuckDB) into the browser bundle.

```ts
import type { ContentFormat, ProjectState } from '@/mastra/projects/schema'

/** One skill as the UI sees it: catalog metadata plus the SKILL.md description. */
export type SkillSummary = {
  name: string
  label: string
  stage: number | null
  optional: boolean
  timeTarget: string
  summary: string
  /** Full description from the skill's frontmatter. May be long. */
  description: string
}

export type SkillsResponse = {
  pipeline: SkillSummary[]
  standalone: SkillSummary[]
}

export type ProjectSummary = {
  id: string
  title: string
  publication: string
  format: ContentFormat
  pinnedSkill: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectDetail = ProjectSummary & {
  state: ProjectState
}

export type CreateProjectBody = {
  title: string
  publication: string
  format: ContentFormat
}

export type ApiError = { error: string }
```

**Verify**: `npm run typecheck` → exit 0.

### Step 3: The skills catalog route

Create `src/app/api/kessel-run/skills/route.ts`.

This route merges two sources: the static catalog (stage order, time targets)
and the live `agent.listSkills()` output (descriptions from the SKILL.md
frontmatter). Merging here rather than duplicating descriptions into the catalog
is what keeps the markdown canonical.

```ts
import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import { PIPELINE_SKILLS, STANDALONE_SKILLS } from '@/mastra/skills/catalog'
import type { SkillSummary, SkillsResponse } from '@/lib/kessel-run/api-types'

export async function GET() {
  const loaded = await mastra.getAgentById('kessel-run-agent').listSkills()
  const descriptions = new Map(loaded.map(s => [s.name, s.description]))

  const decorate = (skill: (typeof PIPELINE_SKILLS)[number] | (typeof STANDALONE_SKILLS)[number]): SkillSummary => ({
    name: skill.name,
    label: skill.label,
    stage: skill.stage,
    optional: skill.optional,
    timeTarget: skill.timeTarget,
    summary: skill.summary,
    description: descriptions.get(skill.name) ?? '',
  })

  const body: SkillsResponse = {
    pipeline: PIPELINE_SKILLS.map(decorate),
    standalone: STANDALONE_SKILLS.map(decorate),
  }

  return NextResponse.json(body)
}
```

**Verify** (with `npm run dev` running):

```bash
curl -s http://localhost:3000/api/kessel-run/skills | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const b=JSON.parse(s);
  console.log('pipeline:',b.pipeline.length,'standalone:',b.standalone.length);
  console.log('all have descriptions:', [...b.pipeline,...b.standalone].every(x=>x.description.length>0));
})"
```

→ `pipeline: 8 standalone: 3` and `all have descriptions: true`.

If descriptions are empty strings, the skills are not loading from disk — that
is a plan 002 regression, not something to fix here. See STOP conditions.

### Step 4: The projects collection route

Create `src/app/api/kessel-run/projects/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createProject, listProjects } from '@/mastra/projects/store'
import { CONTENT_FORMATS, type ContentFormat } from '@/mastra/projects/schema'
import { getResourceId } from '@/lib/kessel-run/session'
import type { CreateProjectBody } from '@/lib/kessel-run/api-types'

export async function GET() {
  const resourceId = await getResourceId()
  const projects = await listProjects(resourceId)
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CreateProjectBody>

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const publication =
    typeof body.publication === 'string' ? body.publication.trim() : ''
  const format = body.format as ContentFormat

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!publication) {
    return NextResponse.json(
      { error: 'publication is required' },
      { status: 400 },
    )
  }
  if (!CONTENT_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `format must be one of: ${CONTENT_FORMATS.join(', ')}` },
      { status: 400 },
    )
  }

  const resourceId = await getResourceId()
  const project = await createProject({ resourceId, title, publication, format })

  return NextResponse.json(project, { status: 201 })
}
```

**Verify** (dev server running):

```bash
curl -s -X POST http://localhost:3000/api/kessel-run/projects \
  -H 'Content-Type: application/json' \
  -d '{"title":"Agents at agencies","publication":"The Newsletter","format":"article"}' \
  -w '\nHTTP %{http_code}\n'
```
→ HTTP 201 with a JSON body containing an `id`.

```bash
curl -s -X POST http://localhost:3000/api/kessel-run/projects \
  -H 'Content-Type: application/json' -d '{"title":"x","publication":"y","format":"podcast"}' \
  -w '\nHTTP %{http_code}\n'
```
→ HTTP 400.

```bash
curl -s http://localhost:3000/api/kessel-run/projects | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('count:',JSON.parse(s).length))"
```
→ `count: 1` (or more if you created several).

### Step 5: The single-project route

Create `src/app/api/kessel-run/projects/[projectId]/route.ts`.

Note the `Promise` around `params` — this is Next 16.

```ts
import { NextResponse } from 'next/server'
import { getProject, getProjectState } from '@/mastra/projects/store'
import { getResourceId } from '@/lib/kessel-run/session'
import type { ProjectDetail } from '@/lib/kessel-run/api-types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const state = await getProjectState(resourceId, projectId)
  const body: ProjectDetail = { ...project, state }

  return NextResponse.json(body)
}
```

**Verify** (substitute a real id from step 4):

```bash
curl -s http://localhost:3000/api/kessel-run/projects/<id> -w '\nHTTP %{http_code}\n'
```
→ HTTP 200, body has `state.currentStage: null` and `state.anchor: null`.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/kessel-run/projects/does-not-exist
```
→ `404`.

### Step 6: The skill-pinned chat route

Create `src/app/api/kessel-run/projects/[projectId]/chat/route.ts`. This is the
heart of the plan.

```ts
import { handleChatStream } from '@mastra/ai-sdk'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import { NextResponse } from 'next/server'
import { RequestContext } from '@mastra/core/request-context'
import { mastra } from '@/mastra'
import { isKesselRunSkillName } from '@/mastra/skills/catalog'
import { getProject } from '@/mastra/projects/store'
import { getResourceId } from '@/lib/kessel-run/session'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const body = await req.json()

  // The pinned skill comes from the client, so it must be validated against the
  // catalog before it reaches the agent's skills resolver. An unknown value is
  // ignored rather than rejected: the agent still works with all skills loaded.
  const requested = body?.pinnedSkill
  const pinnedSkill =
    typeof requested === 'string' && isKesselRunSkillName(requested)
      ? requested
      : null

  const requestContext = new RequestContext(
    pinnedSkill ? [['pinnedSkill', pinnedSkill]] : [],
  )

  const stream = await handleChatStream({
    mastra,
    agentId: 'kessel-run-agent',
    params: {
      ...body,
      requestContext,
      memory: {
        ...body.memory,
        // Server-controlled: one project is one thread. Never take these from
        // the request body.
        thread: projectId,
        resource: resourceId,
      },
    },
  })

  // @mastra/ai-sdk emits AI SDK v5 chunk types, which don't line up with the
  // v7 `ai` package's stricter unions (e.g. finishReason: 'unknown'). Wire
  // compatible at runtime, so cast across the version gap.
  return createUIMessageStreamResponse({
    stream: stream as unknown as ReadableStream<UIMessageChunk>,
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const memory = await mastra.getAgentById('kessel-run-agent').getMemory()
  let response = null

  try {
    response = await memory?.recall({ threadId: projectId, resourceId })
  } catch {
    console.log('No previous messages found.')
  }

  return NextResponse.json(toAISdkV5Messages(response?.messages || []))
}
```

Note that `...body` is spread **before** `requestContext` and `memory`, so a
client cannot override either by putting them in the request body.

**Verify** — this is the acceptance test for the whole plan. It needs a real
`OPENAI_API_KEY` in `.env`. With the dev server running and `<id>` from step 4:

```bash
curl -s -X POST http://localhost:3000/api/kessel-run/projects/<id>/chat \
  -H 'Content-Type: application/json' \
  -d '{"pinnedSkill":"kessel-run-anchor","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"I want to write about how I built a meal planning app with Claude in a weekend."}]}]}' \
  --max-time 120 | head -c 3000
```

Expect an SSE stream. Confirm **both**:
- a `"type":"tool-..."` chunk naming a skill tool (`skill`, `skill_read`, or
  `skill_search`) — this proves the pinned skill was actually loaded, and
- assistant text that behaves like the Anchor stage (asking about publication,
  audience, format, or goal) rather than generic chat.

Then confirm history hydrates:

```bash
curl -s http://localhost:3000/api/kessel-run/projects/<id>/chat | head -c 500
```
→ a JSON array containing the message you sent.

### Step 7: Test what can be tested without a network

Create `src/lib/kessel-run/api-types.test.ts`. Route handlers here are thin
wrappers over already-tested Mastra code and a live model; the genuinely
testable logic is the validation contract.

```ts
import { describe, expect, it } from "vitest";
import { CONTENT_FORMATS } from "@/mastra/projects/schema";
import { isKesselRunSkillName } from "@/mastra/skills/catalog";

describe("request validation contracts", () => {
  it("accepts every catalog format", () => {
    for (const format of CONTENT_FORMATS) {
      expect(CONTENT_FORMATS.includes(format)).toBe(true);
    }
  });

  it("rejects a format outside the catalog", () => {
    expect(CONTENT_FORMATS.includes("podcast" as never)).toBe(false);
  });

  it("accepts a real skill name for pinning", () => {
    expect(isKesselRunSkillName("kessel-run-anchor")).toBe(true);
  });

  it("rejects an unknown skill name for pinning", () => {
    expect(isKesselRunSkillName("../../etc/passwd")).toBe(false);
    expect(isKesselRunSkillName("kessel-run-nonexistent")).toBe(false);
  });
});
```

The path-traversal case matters: `pinnedSkill` is concatenated into a filesystem
path inside the agent's skills resolver, so the catalog check is a security
boundary, not just a typo guard.

**Verify**: `npm test` → exit 0, 4 new tests pass.

### Step 8: Full regression pass

**Verify** all four:

- `npm run typecheck` → exit 0
- `npm test` → exit 0, all tests pass
- `npm run lint` → exit 0, 0 errors
- `npm run build` → exit 0

And confirm the untouched weather demo still works:
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/chat` → `200`

## Test plan

- `src/lib/kessel-run/api-types.test.ts` — 4 cases covering format validation
  (accept/reject) and skill-name validation (accept, reject unknown, reject path
  traversal).
- Model after `src/mastra/projects/schema.test.ts` from plan 003.
- Route behavior is verified by the curl checks in steps 3–6 rather than by
  automated tests: the chat route requires a live model, and HTTP-level tests
  would need a running server plus API credits. That tradeoff is deliberate; the
  validation logic that *can* be unit-tested is.
- Verification: `npm test` → all pass, including 4 new ones.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0 with 4 new tests passing
- [ ] `npm run lint` exits 0 with 0 errors
- [ ] `npm run build` exits 0
- [ ] `GET /api/kessel-run/skills` returns 8 pipeline + 3 standalone, all with
      non-empty descriptions
- [ ] `POST /api/kessel-run/projects` returns 201 for a valid body and 400 for
      an invalid `format`
- [ ] `GET /api/kessel-run/projects/<id>` returns 200 with a `state` object, and
      404 for an unknown id
- [ ] `POST /api/kessel-run/projects/<id>/chat` streams, and the stream contains
      a skill tool call
- [ ] `GET /api/kessel-run/projects/<id>/chat` returns the prior messages
- [ ] `http://localhost:3000/chat` still returns 200
- [ ] `git status --short` shows no modification to `src/app/api/chat/route.ts`,
      `src/app/chat/page.tsx`, or anything under `src/mastra/`
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `GET /api/kessel-run/skills` returns empty descriptions. That means
  `listSkills()` found nothing, which is a cwd/path-resolution problem from plan
  002. Do not work around it by copying descriptions into `catalog.ts` — that
  would hide the failure and duplicate the source of truth.
- The chat stream contains no skill tool call. It means `requestContext` is not
  reaching the agent's `skills` resolver. Do not compensate by pasting skill
  instructions into the agent's `instructions` — that defeats the entire
  progressive-disclosure design.
- `npm run build` fails on the dynamic route signature. The fix is `params:
  Promise<{ projectId: string }>` with `await params`, not removing the type.
- You need to add or change an export in `src/mastra/projects/store.ts`. That is
  a plan 003 scope change; report it rather than editing across plan boundaries.
- The stream type cast is missing and the build fails. Re-read step 6 — the cast
  is required, and `src/app/api/chat/route.ts` documents why.

## Maintenance notes

- **`getResourceId()` is the single auth seam.** When real authentication
  arrives, that function reads the session and everything else keeps working.
  Reviewers should reject any route that hardcodes a resource id directly.
- **`pinnedSkill` is validated because it becomes a filesystem path.** The
  agent's skills resolver builds `${SKILLS_DIR}/${pinned}`. If validation is
  ever loosened, that becomes a path-traversal vector. The test asserting
  `isKesselRunSkillName('../../etc/passwd') === false` exists to make removing
  the check fail loudly.
- Thread and resource ids are server-controlled in the chat route by spreading
  `...body` *before* the `memory` override. Reordering those lines would let a
  client read another project's history.
- Deferred: project deletion and rename. `Memory` exposes `deleteThread`, so
  adding a `DELETE` handler later is small, but nothing in the UI plans needs it.
