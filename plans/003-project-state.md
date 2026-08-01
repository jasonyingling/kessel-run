# Plan 003: Model pipeline state as a content project

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check**: This plan was written against commit `6e39653`. Before you
> start, run `git diff --name-only 6e39653..HEAD -- <the files listed in scope>`.
> Files this plan expects plan 002 to have created will legitimately show as new
> — that is the dependency landing, not drift. What must still match is any
> excerpt quoted from a file that already existed at `6e39653`. A mismatch you
> cannot reconcile is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/002-skills-into-mastra.md
- **Category**: direction
- **Planned at**: commit `6e39653`, 2026-07-29 (SHA re-stamped 2026-07-30 by
  `reconcile` when the working tree was committed; plan content unchanged)

## Why this matters

The Kessel Run skills are written as a chain: the Anchor skill ends with "this
anchor document gets carried forward to Stage 2 (Ideation) as the foundation for
everything that follows." Ideation feeds Hook, Hook feeds Architecture,
Architecture feeds Draft. Without somewhere to keep those artifacts, the app is
eleven disconnected chat windows and the user re-pastes their anchor into every
stage.

This plan introduces a **content project**: one Mastra memory thread that holds
the whole pipeline run, with the stage artifacts kept in schema-typed working
memory. The agent reads and updates that state through Mastra's built-in
working-memory tool — no custom write endpoint, nothing for the UI to
accidentally corrupt — and the UI reads it to render what has been produced so
far.

Plan 004's routes and plan 006's artifacts panel both serialize the types
defined here, so getting the shape right now avoids reworking both.

## Current state

### What exists after plan 002

- `src/mastra/skills/catalog.ts` — exports `KESSEL_RUN_SKILLS`,
  `PIPELINE_SKILLS`, `STANDALONE_SKILLS`, `SKILL_PATHS`, `SKILLS_DIR`,
  `getSkill`, `isKesselRunSkillName`, and the `KesselRunSkillName` type.
- `src/mastra/agents/kessel-run-agent.ts` — exports `kesselRunAgent`, currently
  constructed with a bare `memory: new Memory()`.
- `src/mastra/index.ts` — registers `weatherAgent` and `kesselRunAgent`, and
  builds a `MastraCompositeStore` wrapping a `LibSQLStore`.

`zod@^4.4.3` is already a dependency (`package.json`) — do not install it again.

### Verified Mastra behavior (confirmed by running it, not from docs)

These were checked against the installed `@mastra/memory` and `@mastra/core@1.54.0`:

- `new Memory({ storage, options: { workingMemory: { enabled: true, scope: 'thread', schema } } })`
  accepts a **Zod v4** schema and converts it to JSON Schema internally.
- `memory.getWorkingMemoryTemplate({})` returns `{ format: 'json', content: <json-schema string> }`.
  **It requires an argument** — calling `getWorkingMemoryTemplate()` with no
  argument throws `TypeError: Cannot destructure property 'memoryConfig' of 'undefined'`.
  This is a real API sharp edge; pass `{}`.
- `memory.createThread({ resourceId, title, metadata })` persists `metadata` verbatim.
- `memory.updateWorkingMemory({ threadId, resourceId, workingMemory })` takes a
  **JSON string**, and `memory.getWorkingMemory({ threadId, resourceId })`
  returns that string back (or `null` when unset). Neither one parses for you.
- `memory.listThreads({ filter: { resourceId, metadata } })` filters on metadata
  key/value pairs with AND logic, and returns `{ threads: StorageThreadType[], ...paginationInfo }`.

### Repo conventions

- `src/mastra/**` uses semicolons and single-quoted imports. Match it.
- Path alias `@/*` → `./src/*`. Inside `src/mastra/`, existing files use
  relative imports (`'../tools/weather-tool'`); keep doing that within the
  Mastra tree and reserve `@/` for app code importing into it.
- Tests are Vitest, Node environment, `src/**/*.test.ts` — see
  `src/lib/utils.test.ts` and `src/mastra/skills/catalog.test.ts` for structure.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | exit 0              |
| Lint      | `npm run lint`      | exit 0, 0 errors    |
| Build     | `npm run build`     | exit 0              |

## Scope

**In scope**:
- `src/mastra/projects/schema.ts` (create)
- `src/mastra/projects/store.ts` (create)
- `src/mastra/projects/schema.test.ts` (create)
- `src/mastra/projects/store.test.ts` (create)
- `src/mastra/agents/kessel-run-agent.ts` (edit — the `memory` option only)

**Out of scope** (do NOT touch):
- `src/mastra/index.ts` — the composite store is already correct; this plan
  reuses it, it does not reconfigure storage.
- `src/mastra/skills/catalog.ts` — import from it, do not modify it.
- Any API route or React component. Plan 004 consumes this module; this plan
  ships no HTTP surface.
- The weather agent's `memory: new Memory()` — leave it alone. Only the Kessel
  Run agent gets working memory.

## Git workflow

- Branch: `advisor/003-project-state`
- Commit per step or per logical unit; plain imperative subject lines.
- Do NOT push or open a PR.

## Steps

### Step 1: Define the project schema

Create `src/mastra/projects/schema.ts`.

Design note you need in order to make good judgment calls: most artifacts are
**markdown strings**, not deeply structured objects. That is deliberate — the
skills emit prose and formatted blocks, and forcing them into rigid nested
objects would make the agent fight the schema. Only the anchor is structured,
because the Anchor skill specifies an exact field list and later stages reference
those fields individually.

```ts
import { z } from 'zod';

/** Content formats the pipeline supports, from the Anchor skill's format list. */
export const CONTENT_FORMATS = [
  'article',
  'newsletter',
  'linkedin-post',
  'thread',
  'video-script',
  'short-social',
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

/** Framing options offered by the Anchor skill. */
export const FRAMINGS = [
  'builder',
  'guide',
  'analysis',
  'story',
  'contrarian',
] as const;

export const anchorSchema = z.object({
  idea: z.string(),
  publication: z.string(),
  format: z.enum(CONTENT_FORMATS),
  audience: z.string(),
  goal: z.string(),
  framing: z.string(),
  missionAlignment: z.string(),
  keySourceMaterial: z.string(),
  scopeNotes: z.string(),
});

/**
 * Working-memory shape for one content project.
 *
 * Every artifact is nullable and starts null. The agent fills them in via
 * Mastra's working-memory tool as it completes each stage; nothing else writes
 * here. Markdown strings are used for the artifacts the skills emit as prose.
 */
export const projectStateSchema = z.object({
  /** Highest pipeline stage completed, or null before Anchor. 0..7. */
  currentStage: z.number().min(0).max(7).nullable(),
  /** Stage 0 — research brief, markdown. */
  researchBrief: z.string().nullable(),
  /** Stage 1 — the structured anchor. */
  anchor: anchorSchema.nullable(),
  /** Stage 2 — ideation map, markdown. */
  ideationMap: z.string().nullable(),
  /** Stage 3 — chosen hook and its bridge sentence. */
  hook: z
    .object({
      opening: z.string(),
      bridge: z.string(),
    })
    .nullable(),
  /** Stage 4 — beat-by-beat blueprint, markdown. */
  beatMap: z.string().nullable(),
  /** Stage 5 — the draft, markdown. */
  draft: z.string().nullable(),
  /** Stage 6 — authenticity audit notes, markdown. */
  personalizationNotes: z.string().nullable(),
  /** Stage 7 — seven-dimension scorecard, markdown. */
  polishScorecard: z.string().nullable(),
});

export type ProjectState = z.infer<typeof projectStateSchema>;
export type Anchor = z.infer<typeof anchorSchema>;

/** A project with nothing produced yet. */
export const EMPTY_PROJECT_STATE: ProjectState = {
  currentStage: null,
  researchBrief: null,
  anchor: null,
  ideationMap: null,
  hook: null,
  beatMap: null,
  draft: null,
  personalizationNotes: null,
  polishScorecard: null,
};

/** Thread metadata marking a thread as a Kessel Run project. */
export const PROJECT_THREAD_KIND = 'kessel-run-project';

export const projectMetadataSchema = z.object({
  kind: z.literal(PROJECT_THREAD_KIND),
  /** Publication this piece is for. */
  publication: z.string(),
  /** Target format. */
  format: z.enum(CONTENT_FORMATS),
  /** Skill the UI last pinned for this project, if any. */
  pinnedSkill: z.string().nullable(),
});

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

/**
 * Which pipeline stage maps to which artifact field. Used by the UI to show
 * what a stage produced, and by `stageIsComplete` below.
 */
export const STAGE_ARTIFACT_FIELD = {
  0: 'researchBrief',
  1: 'anchor',
  2: 'ideationMap',
  3: 'hook',
  4: 'beatMap',
  5: 'draft',
  6: 'personalizationNotes',
  7: 'polishScorecard',
} as const satisfies Record<number, keyof ProjectState>;

export function stageIsComplete(state: ProjectState, stage: number): boolean {
  const field = STAGE_ARTIFACT_FIELD[stage as keyof typeof STAGE_ARTIFACT_FIELD];
  return field !== undefined && state[field] !== null;
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Test the schema

Create `src/mastra/projects/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EMPTY_PROJECT_STATE,
  STAGE_ARTIFACT_FIELD,
  projectMetadataSchema,
  projectStateSchema,
  stageIsComplete,
} from "./schema";
import { PIPELINE_SKILLS } from "../skills/catalog";

describe("projectStateSchema", () => {
  it("accepts the empty state", () => {
    expect(projectStateSchema.parse(EMPTY_PROJECT_STATE)).toEqual(EMPTY_PROJECT_STATE);
  });

  it("rejects a stage outside 0..7", () => {
    expect(() =>
      projectStateSchema.parse({ ...EMPTY_PROJECT_STATE, currentStage: 9 }),
    ).toThrow();
  });

  it("requires every anchor field when an anchor is present", () => {
    expect(() =>
      projectStateSchema.parse({ ...EMPTY_PROJECT_STATE, anchor: { idea: "x" } }),
    ).toThrow();
  });
});

describe("STAGE_ARTIFACT_FIELD", () => {
  it("covers every pipeline stage in the catalog", () => {
    const stages = PIPELINE_SKILLS.map(s => s.stage).sort((a, b) => a - b);
    expect(Object.keys(STAGE_ARTIFACT_FIELD).map(Number).sort((a, b) => a - b)).toEqual(stages);
  });
});

describe("stageIsComplete", () => {
  it("is false for every stage of an empty project", () => {
    for (const skill of PIPELINE_SKILLS) {
      expect(stageIsComplete(EMPTY_PROJECT_STATE, skill.stage)).toBe(false);
    }
  });

  it("is true once the stage's artifact is set", () => {
    const withIdeation = { ...EMPTY_PROJECT_STATE, ideationMap: "# Map" };
    expect(stageIsComplete(withIdeation, 2)).toBe(true);
    expect(stageIsComplete(withIdeation, 3)).toBe(false);
  });
});

describe("projectMetadataSchema", () => {
  it("accepts well-formed project metadata", () => {
    const meta = {
      kind: "kessel-run-project" as const,
      publication: "The Newsletter",
      format: "article" as const,
      pinnedSkill: null,
    };
    expect(projectMetadataSchema.parse(meta)).toEqual(meta);
  });

  it("rejects an unknown format", () => {
    expect(() =>
      projectMetadataSchema.parse({
        kind: "kessel-run-project",
        publication: "x",
        format: "podcast",
        pinnedSkill: null,
      }),
    ).toThrow();
  });
});
```

The `STAGE_ARTIFACT_FIELD` test is the important one — it fails if a stage is
ever added to the catalog without a corresponding artifact field.

**Verify**: `npm test` → exit 0, 8 new tests pass.

### Step 3: Give the agent schema-typed working memory

Edit `src/mastra/agents/kessel-run-agent.ts`. Change **only** the `memory`
option and add the import; leave `id`, `name`, `instructions`, `model`, and
`skills` exactly as plan 002 wrote them.

Add to the imports:

```ts
import { projectStateSchema } from '../projects/schema';
```

Replace `memory: new Memory(),` with:

```ts
  memory: new Memory({
    options: {
      workingMemory: {
        enabled: true,
        // Scoped to the thread: one thread is one content project, and two
        // projects for the same user must not share an anchor or draft.
        scope: 'thread',
        schema: projectStateSchema,
      },
    },
  }),
```

Note there is no `storage` key here. Memory inherits the `MastraCompositeStore`
configured on the `Mastra` instance in `src/mastra/index.ts`. Do not construct a
second store.

Then append to the agent's `instructions` string, before the closing backtick:

```
Every project keeps its pipeline state in working memory: the research brief, anchor, ideation map, hook, beat map, draft, personalization notes, and polish scorecard. Read it at the start of a stage so you build on what already exists rather than asking the user to repeat themselves. When a stage produces its output and the user confirms it, write that output to the matching working-memory field and set currentStage to that stage's number.
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Write the project store helpers

Create `src/mastra/projects/store.ts`. This is the only module plan 004's routes
will call — keep the HTTP layer free of Mastra specifics.

```ts
import type { Memory } from '@mastra/memory';
import { mastra } from '../index';
import {
  EMPTY_PROJECT_STATE,
  PROJECT_THREAD_KIND,
  type ContentFormat,
  type ProjectState,
  projectStateSchema,
} from './schema';

export type Project = {
  id: string;
  title: string;
  publication: string;
  format: ContentFormat;
  pinnedSkill: string | null;
  createdAt: string;
  updatedAt: string;
};

async function getMemory(): Promise<Memory> {
  const memory = await mastra.getAgentById('kessel-run-agent').getMemory();
  if (!memory) {
    throw new Error('Kessel Run agent has no memory configured');
  }
  return memory as Memory;
}

export async function createProject(input: {
  resourceId: string;
  title: string;
  publication: string;
  format: ContentFormat;
}): Promise<Project> {
  const memory = await getMemory();
  const thread = await memory.createThread({
    resourceId: input.resourceId,
    title: input.title,
    metadata: {
      kind: PROJECT_THREAD_KIND,
      publication: input.publication,
      format: input.format,
      pinnedSkill: null,
    },
  });
  return toProject(thread);
}

export async function listProjects(resourceId: string): Promise<Project[]> {
  const memory = await getMemory();
  const { threads } = await memory.listThreads({
    filter: { resourceId, metadata: { kind: PROJECT_THREAD_KIND } },
    perPage: false,
  });
  return threads.map(toProject);
}

export async function getProject(
  resourceId: string,
  projectId: string,
): Promise<Project | null> {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId: projectId });
  // getThreadById does not filter by resource, so check ownership here.
  if (!thread || thread.resourceId !== resourceId) return null;
  if (thread.metadata?.kind !== PROJECT_THREAD_KIND) return null;
  return toProject(thread);
}

/**
 * Read a project's pipeline artifacts.
 *
 * Working memory is stored as a JSON string and is not parsed for us. A project
 * the agent has never written to returns null, which we surface as the empty
 * state rather than an error.
 */
export async function getProjectState(
  resourceId: string,
  projectId: string,
): Promise<ProjectState> {
  const memory = await getMemory();
  const raw = await memory.getWorkingMemory({ threadId: projectId, resourceId });
  if (!raw) return EMPTY_PROJECT_STATE;

  try {
    return projectStateSchema.parse(JSON.parse(raw));
  } catch {
    // A malformed or older-shaped blob must not take down the project view.
    return EMPTY_PROJECT_STATE;
  }
}

function toProject(thread: {
  id: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): Project {
  const metadata = thread.metadata ?? {};
  return {
    id: thread.id,
    title: thread.title ?? 'Untitled project',
    publication: String(metadata.publication ?? ''),
    format: metadata.format as ContentFormat,
    pinnedSkill:
      typeof metadata.pinnedSkill === 'string' ? metadata.pinnedSkill : null,
    createdAt: new Date(thread.createdAt).toISOString(),
    updatedAt: new Date(thread.updatedAt).toISOString(),
  };
}
```

Two things worth understanding rather than copying blindly:

1. `getProject` checks `thread.resourceId` itself. `getThreadById` takes only a
   thread id, so without that check any user could read any project by guessing
   a UUID. Do not remove it.
2. `getProjectState` swallows parse failures and returns the empty state. That
   is a deliberate availability choice — a corrupt blob should blank the
   artifacts panel, not 500 the project page.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: Test the store against a real database

Create `src/mastra/projects/store.test.ts`. These tests hit a real LibSQL file,
which is fast and catches the metadata-filter behavior that a mock would not.

```ts
import { afterAll, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MastraCompositeStore } from "@mastra/core/storage";
import { PROJECT_THREAD_KIND, projectStateSchema } from "./schema";

const DB = "file:/tmp/kessel-run-store-test.db";

const memory = new Memory({
  storage: new MastraCompositeStore({
    id: "test-store",
    default: new LibSQLStore({ id: "store-test", url: DB }),
  }),
  options: {
    workingMemory: { enabled: true, scope: "thread", schema: projectStateSchema },
  },
});

afterAll(() => {
  rmSync("/tmp/kessel-run-store-test.db", { force: true });
});

describe("project threads", () => {
  it("round-trips a project thread and its metadata", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "Agents at agencies",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "The Newsletter",
        format: "article",
        pinnedSkill: null,
      },
    });

    expect(thread.metadata?.kind).toBe(PROJECT_THREAD_KIND);

    const { threads } = await memory.listThreads({
      filter: { resourceId: "user-1", metadata: { kind: PROJECT_THREAD_KIND } },
      perPage: false,
    });
    expect(threads.map(t => t.id)).toContain(thread.id);
  });

  it("does not return another resource's projects", async () => {
    await memory.createThread({
      resourceId: "user-2",
      title: "Someone else's piece",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "Other",
        format: "thread",
        pinnedSkill: null,
      },
    });

    const { threads } = await memory.listThreads({
      filter: { resourceId: "user-1", metadata: { kind: PROJECT_THREAD_KIND } },
      perPage: false,
    });
    expect(threads.every(t => t.resourceId === "user-1")).toBe(true);
  });

  it("round-trips working memory as a JSON string", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "WM test",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "P",
        format: "article",
        pinnedSkill: null,
      },
    });

    await memory.updateWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
      workingMemory: JSON.stringify({
        currentStage: 1,
        researchBrief: null,
        anchor: {
          idea: "Agents make agency devs more essential",
          publication: "The Newsletter",
          format: "article",
          audience: "Agency developers",
          goal: "Understand why",
          framing: "contrarian",
          missionAlignment: "Real outcomes",
          keySourceMaterial: "Marriott project",
          scopeNotes: "One piece",
        },
        ideationMap: null,
        hook: null,
        beatMap: null,
        draft: null,
        personalizationNotes: null,
        polishScorecard: null,
      }),
    });

    const raw = await memory.getWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
    });
    expect(raw).toBeTruthy();
    const parsed = projectStateSchema.parse(JSON.parse(raw as string));
    expect(parsed.currentStage).toBe(1);
    expect(parsed.anchor?.framing).toBe("contrarian");
  });

  it("returns null working memory for a project never written to", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "Fresh",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "P",
        format: "article",
        pinnedSkill: null,
      },
    });

    const raw = await memory.getWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
    });
    expect(raw).toBeNull();
  });
});
```

These tests construct their own `Memory` rather than importing `store.ts`,
because `store.ts` imports `mastra` from `src/mastra/index.ts`, which builds the
DuckDB observability store and is too heavy for a unit test. That is a
deliberate tradeoff: the tests verify the Mastra behavior the store depends on,
not the thin mapping layer over it.

**Verify**: `npm test` → exit 0, 4 new tests pass.

### Step 6: Full regression pass

**Verify** all four:

- `npm run typecheck` → exit 0
- `npm test` → exit 0, all tests pass
- `npm run lint` → exit 0, 0 errors
- `npm run build` → exit 0

## Test plan

- `src/mastra/projects/schema.test.ts` — 8 cases covering empty-state parsing,
  stage-range rejection, anchor completeness, stage/artifact-field coverage
  against the catalog, `stageIsComplete` on empty and partial state, and
  metadata validation including an unknown format.
- `src/mastra/projects/store.test.ts` — 4 cases against a real LibSQL file:
  thread round-trip with metadata, resource isolation, working-memory JSON
  round-trip, and null working memory for an untouched project.
- Model both after `src/mastra/skills/catalog.test.ts` from plan 002.
- Verification: `npm test` → all pass, including 12 new ones.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0 with 12 new tests passing
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with 0 errors
- [ ] `npm run build` exits 0
- [ ] `grep -c "workingMemory" src/mastra/agents/kessel-run-agent.ts` → at least `1`
- [ ] `grep -c "new Memory()" src/mastra/agents/kessel-run-agent.ts` → `0`
- [ ] `git status --short` shows no modification to `src/mastra/index.ts` or
      `src/mastra/skills/catalog.ts`
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Mastra rejects `projectStateSchema` as a working-memory schema. It was
  verified working with Zod v4 and nullable fields, so a rejection means
  something changed. Do **not** flatten the schema to all-strings to get past
  it — report what it rejected.
- `memory.listThreads` ignores the `metadata` filter and returns threads of
  other kinds. The resource-isolation test will catch this. Do not paper over it
  by filtering in JavaScript — that would silently break pagination later.
- `store.test.ts` cannot construct `LibSQLStore` against `/tmp`. Report rather
  than switching to an in-memory mock; the point of these tests is real storage.
- You find you need to add a write path for artifacts (an `updateProjectState`
  export). You should not: the agent writes working memory through its own tool.
  If a genuine need appears, report it — it is a design change, not a detail.

## Maintenance notes

- **Changing `projectStateSchema` is a migration.** Existing working-memory
  blobs are stored against the old shape. `getProjectState` degrades to the
  empty state on a parse failure, so a change silently blanks existing
  projects rather than erroring. If the schema changes after real data exists,
  write a migration or add a version field.
- `getWorkingMemoryTemplate` requires an argument (`{}`). Anyone calling it
  without one gets a confusing destructuring `TypeError`.
- `resourceId` is currently going to be supplied by plan 004 as a fixed
  placeholder — there is no auth in this app. The ownership check in
  `getProject` is written the way it is so that adding real auth later means
  changing where `resourceId` comes from, and nothing else.
- Reviewers should check that nothing outside the agent writes working memory.
  A direct `updateWorkingMemory` call from a route would bypass the agent's
  understanding of its own state and cause the two to diverge.
