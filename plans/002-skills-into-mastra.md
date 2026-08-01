# Plan 002: Install the 11 Kessel Run skills into Mastra

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check**: This plan was written against commit `6e39653`. Before you
> start, run `git diff --name-only 6e39653..HEAD -- <the files listed in scope>`.
> If any file this plan quotes under "Current state" comes back changed, confirm
> the excerpt still matches what is on disk. A mismatch you cannot reconcile is
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-test-baseline.md
- **Category**: direction
- **Planned at**: commit `6e39653`, 2026-07-29 (SHA re-stamped 2026-07-30 by
  `reconcile` when the working tree was committed; plan content unchanged and
  excerpts re-verified against the live files)

## Why this matters

`kessel-run-skills/` holds 11 markdown files that are already written in the
Agent Skills format (YAML frontmatter with `name` and `description`, then a
markdown body of instructions). Right now they are inert documentation sitting
next to the app — nothing loads them.

Mastra 1.54 has a first-class skills primitive built on exactly this format.
Once the files are laid out as `<skill-name>/SKILL.md` directories and handed to
an Agent's `skills` option, Mastra discovers them, injects their name and
description into the system prompt, and gives the model `skill`, `skill_search`,
and `skill_read` tools so it pulls the full instructions in on demand. That is
progressive disclosure for free — 11 skills totalling ~2,000 lines never all sit
in context at once.

This plan gets the skills loaded and proves it, and creates the typed catalog
that every later plan and the whole UI reads from. Nothing downstream works
until this is right.

## Current state

### The source files

`kessel-run-skills/` contains 13 files: 11 skills plus `README.md` and
`QUICK-REFERENCE.md`. Each skill file begins with frontmatter. Verified
first 4 lines of `kessel-run-skills/01-anchor.md`:

```markdown
---
name: kessel-run-anchor
description: "Stage 1 of the Kessel Run content pipeline: helps users define a content anchor — the foundation for any piece of content. Use this skill when the user wants to start creating a new piece of content, plan an article, kick off a blog post, newsletter edition, LinkedIn post, thread, or video script. Also trigger when the user says things like 'I have an idea for a post,' 'I want to write about,' 'help me plan content about,' 'what angle should I take on,' 'I need to write something about,' or references the Kessel Run pipeline. This skill guides the user through defining their topic, audience, framing, and goals before any writing begins."
---
```

The complete file → skill-name mapping, extracted from the frontmatter (do not
re-derive it, and do not rename anything):

| Source file | Skill name |
|---|---|
| `01-anchor.md` | `kessel-run-anchor` |
| `02-ideation.md` | `kessel-run-ideation` |
| `03-hook.md` | `kessel-run-hook` |
| `04-architecture.md` | `kessel-run-architecture` |
| `05-draft.md` | `kessel-run-draft` |
| `06-research.md` | `kessel-run-research` |
| `07-review.md` | `kessel-run-review` |
| `08-repurpose.md` | `kessel-run-repurpose` |
| `09-personalize.md` | `kessel-run-personalize` |
| `10-polish.md` | `kessel-run-polish` |
| `11-analyze.md` | `kessel-run-analyze` |

### How Mastra resolves skills (verified by running it, not guessed)

- A skill is a **directory** whose name matches the frontmatter `name`,
  containing `SKILL.md`. Optional `references/`, `scripts/`, `assets/`
  subdirectories are also supported.
- `Agent`'s `skills` option accepts path strings, inline skills from
  `createSkill()`, or a function `({ requestContext }) => SkillInput[]`.
- **Path strings resolve relative to `process.cwd()`**, not to the importing
  module. Under `next dev` and `next start` cwd is the project root, so
  `./src/mastra/skills/<name>` is correct.
- `await agent.listSkills()` returns `SkillMetadata[]` — `{ name, path,
  description, ... }`. This is what the catalog test asserts against.

### Existing Mastra wiring

`src/mastra/index.ts` in full:

```ts

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';


export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      // Uses a hosted database when deployed (mastra env db create --kind turso),
      // and a local file during development.
      url: process.env.TURSO_DATABASE_URL ?? "file:./mastra.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
```

`src/mastra/agents/weather-agent.ts` — **the exemplar to match** for agent file
structure (imports, `export const`, `id`/`name`/`instructions`/`model`/`tools`/`memory`):

```ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { weatherTool } from '../tools/weather-tool';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `You are a helpful weather assistant ...`,
  model: 'openai/gpt-5-mini',
  tools: { weatherTool },
  memory: new Memory(),
});
```

`next.config.ts` in full:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB (used by Mastra's observability storage) ships native .node bindings
  // that the bundler can't resolve; load them from node_modules at runtime.
  serverExternalPackages: ["@mastra/duckdb", "@duckdb/node-api", "@duckdb/node-bindings"],
};

export default nextConfig;
```

### Pipeline structure (from `kessel-run-skills/README.md` and `QUICK-REFERENCE.md`)

Ordered pipeline stages, with the time targets the skills themselves state:

| Stage | Skill | Time target | Notes |
|---|---|---|---|
| 0 | `kessel-run-research` | 20–30 min | optional |
| 1 | `kessel-run-anchor` | ~3 min | |
| 2 | `kessel-run-ideation` | ~5 min | |
| 3 | `kessel-run-hook` | ~3 min | |
| 4 | `kessel-run-architecture` | ~5 min | |
| 5 | `kessel-run-draft` | ~8 min | |
| 6 | `kessel-run-personalize` | ~3 min | |
| 7 | `kessel-run-polish` | ~4 min | |

Standalone skills (not part of the ordered pipeline):

| Skill | Time target |
|---|---|
| `kessel-run-review` | 10–15 min |
| `kessel-run-repurpose` | 5–10 min |
| `kessel-run-analyze` | 10–15 min |

## Commands you will need

| Purpose   | Command             | Expected on success          |
|-----------|---------------------|------------------------------|
| Typecheck | `npm run typecheck` | exit 0                       |
| Tests     | `npm test`          | exit 0                       |
| Lint      | `npm run lint`      | exit 0, 0 errors             |
| Build     | `npm run build`     | exit 0                       |
| Dev       | `npm run dev`       | serves on http://localhost:3000 |

## Scope

**In scope**:
- `src/mastra/skills/<name>/SKILL.md` × 11 (create, by moving existing files)
- `src/mastra/skills/catalog.ts` (create)
- `src/mastra/skills/catalog.test.ts` (create)
- `src/mastra/agents/kessel-run-agent.ts` (create)
- `src/mastra/index.ts` (edit — register the new agent only)
- `next.config.ts` (edit — add `outputFileTracingIncludes` only)
- `docs/kessel-run/README.md`, `docs/kessel-run/QUICK-REFERENCE.md` (create, by moving)
- `kessel-run-skills/` (delete the directory once emptied)

**Not in scope any more**: `.gitignore`. An earlier commit added a `*.zip` rule
that already covers the skills zip, so step 2 is now a verification only.

**Out of scope** (do NOT touch, even though they look related):
- `src/mastra/agents/weather-agent.ts`, `src/mastra/tools/weather-tool.ts`,
  `src/mastra/workflows/weather-workflow.ts` — the working reference from the
  Mastra guide. Leave registered.
- `src/app/api/chat/route.ts` and `src/app/chat/page.tsx` — plan 004 adds new
  routes; these stay pointed at the weather agent.
- **The body text of any skill markdown file.** You are relocating these files,
  not editing them. The frontmatter and body must survive byte-for-byte apart
  from the rename. Do not "improve" the prose, fix typos, or reformat.
- `serverExternalPackages` in `next.config.ts` — leave the existing entry alone.

## Git workflow

- Branch: `advisor/002-skills-into-mastra`
- Commit per step or per logical unit; plain imperative subject lines, matching
  the existing history (e.g. `Add Vitest baseline and typecheck script`).
- Do NOT push or open a PR.

## Steps

### Step 1: Relocate the skill files into Mastra's expected layout

The source files **are tracked** (committed in `6e39653`), so use `git mv` — it
preserves rename history, and `git log --follow` will keep working on the
relocated files.

For each of the 11 rows in the mapping table above, create
`src/mastra/skills/<skill-name>/` and move the file in as `SKILL.md`.

```bash
mkdir -p src/mastra/skills
while IFS=' ' read -r src name; do
  mkdir -p "src/mastra/skills/$name"
  git mv "kessel-run-skills/$src" "src/mastra/skills/$name/SKILL.md"
done <<'EOF'
01-anchor.md kessel-run-anchor
02-ideation.md kessel-run-ideation
03-hook.md kessel-run-hook
04-architecture.md kessel-run-architecture
05-draft.md kessel-run-draft
06-research.md kessel-run-research
07-review.md kessel-run-review
08-repurpose.md kessel-run-repurpose
09-personalize.md kessel-run-personalize
10-polish.md kessel-run-polish
11-analyze.md kessel-run-analyze
EOF
```

Then move the two docs out of the way and remove the now-empty source dir:

```bash
mkdir -p docs/kessel-run
git mv kessel-run-skills/README.md docs/kessel-run/README.md
git mv kessel-run-skills/QUICK-REFERENCE.md docs/kessel-run/QUICK-REFERENCE.md
rmdir kessel-run-skills
```

**Verify**: `ls src/mastra/skills | wc -l` → `11`, and
`find src/mastra/skills -name SKILL.md | wc -l` → `11`, and
`test ! -d kessel-run-skills && echo removed` → `removed`.

**Verify the directory name matches the frontmatter name in every case** — this
is the single most common way to get skills silently not loading:

```bash
for d in src/mastra/skills/*/; do
  n=$(awk -F': ' '/^name:/{print $2; exit}' "$d/SKILL.md")
  [ "$(basename "$d")" = "$n" ] || echo "MISMATCH: $d has name $n"
done
```

→ prints nothing.

### Step 2: Confirm the skills zip stays ignored — no edit needed

`kessel-run-skills.zip` sits in the repo root and is a duplicate of what you
just installed. It is **already ignored** by the `*.zip` rule in `.gitignore`
(added before this plan's base commit). Do not add a redundant
`kessel-run-skills.zip` line, and do not delete the zip — plan 002's maintenance
notes still reference it as a comparison copy.

**Verify**: `git status --short | grep -c kessel-run-skills.zip` → `0`, and
`git check-ignore -v kessel-run-skills.zip` → names the `*.zip` rule.

This step is a check, not a change. `.gitignore` should be untouched by this plan.

### Step 3: Create the typed skill catalog

Create `src/mastra/skills/catalog.ts`. This is the single source of truth for
stage ordering, which the markdown frontmatter does not encode. Every later
plan imports from here.

```ts
/**
 * Static catalog of the Kessel Run skills.
 *
 * Skill *instructions* live in `src/mastra/skills/<name>/SKILL.md` and are
 * loaded by Mastra at runtime. This module carries only the pipeline metadata
 * the markdown frontmatter has no place for — stage ordering and time targets —
 * plus the display labels the UI needs.
 *
 * `SKILL_DIR` paths are relative to `process.cwd()` because that is how
 * Mastra's LocalSkillSource resolves them.
 */

export const SKILLS_DIR = './src/mastra/skills';

export type KesselRunSkillName =
  | 'kessel-run-research'
  | 'kessel-run-anchor'
  | 'kessel-run-ideation'
  | 'kessel-run-hook'
  | 'kessel-run-architecture'
  | 'kessel-run-draft'
  | 'kessel-run-personalize'
  | 'kessel-run-polish'
  | 'kessel-run-review'
  | 'kessel-run-repurpose'
  | 'kessel-run-analyze';

export type KesselRunSkill = {
  name: KesselRunSkillName;
  /** Short display label for the UI. */
  label: string;
  /** Position in the ordered pipeline, or null for standalone skills. */
  stage: number | null;
  /** Whether the pipeline can proceed without this stage. */
  optional: boolean;
  /** Human-readable time target, taken from the skill's own guidance. */
  timeTarget: string;
  /** One-line summary for cards. The full description lives in SKILL.md. */
  summary: string;
};

export const KESSEL_RUN_SKILLS: readonly KesselRunSkill[] = [
  {
    name: 'kessel-run-research',
    label: 'Research',
    stage: 0,
    optional: true,
    timeTarget: '20–30 min',
    summary: 'Map the landscape and find content gaps before anything is written.',
  },
  {
    name: 'kessel-run-anchor',
    label: 'Anchor',
    stage: 1,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Lock in topic, audience, format, goal, and framing.',
  },
  {
    name: 'kessel-run-ideation',
    label: 'Ideation',
    stage: 2,
    optional: false,
    timeTarget: '~5 min',
    summary: 'Expand the anchor into a thesis, supporting angles, and evidence.',
  },
  {
    name: 'kessel-run-hook',
    label: 'Hook',
    stage: 3,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Generate and score opening hooks, then pick and refine one.',
  },
  {
    name: 'kessel-run-architecture',
    label: 'Architecture',
    stage: 4,
    optional: false,
    timeTarget: '~5 min',
    summary: 'Build the beat-by-beat structural blueprint.',
  },
  {
    name: 'kessel-run-draft',
    label: 'Draft',
    stage: 5,
    optional: false,
    timeTarget: '~8 min',
    summary: 'Write the piece section by section against the beat map.',
  },
  {
    name: 'kessel-run-personalize',
    label: 'Personalize',
    stage: 6,
    optional: false,
    timeTarget: '~3 min',
    summary: 'Audit for authenticity and inject the writer’s own specifics.',
  },
  {
    name: 'kessel-run-polish',
    label: 'Polish',
    stage: 7,
    optional: false,
    timeTarget: '~4 min',
    summary: 'Score across seven dimensions and fix what is weak.',
  },
  {
    name: 'kessel-run-review',
    label: 'Review',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Audit already-published content for accuracy and relevance.',
  },
  {
    name: 'kessel-run-repurpose',
    label: 'Repurpose',
    stage: null,
    optional: false,
    timeTarget: '5–10 min',
    summary: 'Adapt an existing piece into other formats.',
  },
  {
    name: 'kessel-run-analyze',
    label: 'Analyze',
    stage: null,
    optional: false,
    timeTarget: '10–15 min',
    summary: 'Review post-publish performance and extract lessons.',
  },
] as const;

/** Skills that form the ordered pipeline, sorted by stage. */
export const PIPELINE_SKILLS = KESSEL_RUN_SKILLS
  .filter((s): s is KesselRunSkill & { stage: number } => s.stage !== null)
  .sort((a, b) => a.stage - b.stage);

/** Skills usable on their own, outside the pipeline. */
export const STANDALONE_SKILLS = KESSEL_RUN_SKILLS.filter(s => s.stage === null);

/** Filesystem paths handed to Mastra's `skills` option. */
export const SKILL_PATHS = KESSEL_RUN_SKILLS.map(s => `${SKILLS_DIR}/${s.name}`);

export function getSkill(name: string): KesselRunSkill | undefined {
  return KESSEL_RUN_SKILLS.find(s => s.name === name);
}

export function isKesselRunSkillName(name: string): name is KesselRunSkillName {
  return KESSEL_RUN_SKILLS.some(s => s.name === name);
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Test that the catalog and the filesystem agree

Create `src/mastra/skills/catalog.test.ts`. Model the structure after
`src/lib/utils.test.ts` from plan 001.

This test is the reason this plan is safe: it fails loudly if a directory is
renamed, a skill is added to disk but not the catalog, or frontmatter drifts.

```ts
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KESSEL_RUN_SKILLS,
  PIPELINE_SKILLS,
  SKILLS_DIR,
  STANDALONE_SKILLS,
} from "./catalog";

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

function frontmatterName(dir: string): string {
  const body = readFileSync(`${SKILLS_DIR}/${dir}/SKILL.md`, "utf-8");
  const match = body.match(/^name:\s*(.+)$/m);
  if (!match) throw new Error(`no name in frontmatter for ${dir}`);
  return match[1].trim();
}

describe("skill catalog", () => {
  it("lists exactly the skills present on disk", () => {
    expect(skillDirs).toEqual([...KESSEL_RUN_SKILLS].map(s => s.name).sort());
  });

  it("has 11 skills", () => {
    expect(KESSEL_RUN_SKILLS).toHaveLength(11);
  });

  it("names every directory after its frontmatter name", () => {
    for (const dir of skillDirs) {
      expect(frontmatterName(dir)).toBe(dir);
    }
  });

  it("gives every skill a non-empty description in frontmatter", () => {
    for (const dir of skillDirs) {
      const body = readFileSync(`${SKILLS_DIR}/${dir}/SKILL.md`, "utf-8");
      expect(body).toMatch(/^description:\s*\S/m);
    }
  });

  it("splits into 8 pipeline stages and 3 standalone skills", () => {
    expect(PIPELINE_SKILLS).toHaveLength(8);
    expect(STANDALONE_SKILLS).toHaveLength(3);
  });

  it("numbers pipeline stages 0..7 with no gaps or duplicates", () => {
    expect(PIPELINE_SKILLS.map(s => s.stage)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
```

Note this test relies on `process.cwd()` being the repo root. Vitest runs from
the repo root, so `SKILLS_DIR` resolves the same way it will at runtime — which
is exactly the property worth testing.

**Verify**: `npm test` → exit 0, `catalog.test.ts` reports 6 passed.

### Step 5: Create the Kessel Run agent

Create `src/mastra/agents/kessel-run-agent.ts`.

The `skills` option is a **function**, not an array. That is what implements the
"pinned picker + auto-load" decision: when the UI pins a skill, that skill is
listed first so the model reaches for it, but the rest stay available so a stage
can hand off to the next one.

```ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { SKILL_PATHS, SKILLS_DIR, isKesselRunSkillName } from '../skills/catalog';

export const kesselRunAgent = new Agent({
  id: 'kessel-run-agent',
  name: 'Kessel Run',
  instructions: `You run the Kessel Run content pipeline — a staged system for taking a piece of content from raw idea to published and analyzed.

Each stage of the pipeline is a skill available to you. Load the relevant skill with your skill tools before working on a stage, and follow that skill's instructions exactly — they define what you gather, how you push back, and what output format you produce.

When the user has pinned a skill for this session, it is listed first in your available skills. Start there. You may load another skill when the conversation genuinely moves to a different stage — for example when an anchor is confirmed and the user is ready for ideation — but say which stage you are moving to before you do.

Principles that hold across every stage:

- The user drives. You suggest, generate options, and pressure-test. They decide. Never pick a framing for them and never rewrite their idea without permission.
- Specificity is the work. Push relentlessly from generic claims toward concrete detail — the specific project, the actual number, the real moment.
- Never invent. Do not fabricate statistics, sources, or personal experiences the user has not given you. An honest placeholder beats a fake detail.
- Speed with substance. Each stage has a time target. A good-enough decision that moves forward beats a perfect one that stalls.
- Name the next step. When a stage is complete, say what it produced and which stage comes next.`,
  model: 'openai/gpt-5',
  skills: ({ requestContext }) => {
    const pinned = requestContext.get('pinnedSkill');

    if (typeof pinned === 'string' && isKesselRunSkillName(pinned)) {
      const pinnedPath = `${SKILLS_DIR}/${pinned}`;
      return [pinnedPath, ...SKILL_PATHS.filter(p => p !== pinnedPath)];
    }

    return [...SKILL_PATHS];
  },
  memory: new Memory(),
});
```

On the model string: `openai/gpt-5` is Mastra's model-router format, the same
shape as the scaffold's `openai/gpt-5-mini`. If it turns out not to resolve, see
STOP conditions — do not silently substitute a different provider.

**Verify**: `npm run typecheck` → exit 0.

### Step 6: Register the agent

In `src/mastra/index.ts`, add the import next to the existing agent import and
add the agent to the `agents` map. Change only these two things:

```ts
import { weatherAgent } from './agents/weather-agent';
import { kesselRunAgent } from './agents/kessel-run-agent';
```

```ts
  agents: { weatherAgent, kesselRunAgent },
```

**Verify**: `npm run typecheck` → exit 0 and
`grep -c kesselRunAgent src/mastra/index.ts` → `2`.

### Step 7: Keep the skill files in the deployment bundle

Skill markdown is read from disk at runtime, so Next's build must trace it as a
runtime asset or a deployed build will start with zero skills. Add
`outputFileTracingIncludes` to `next.config.ts`, leaving `serverExternalPackages`
untouched:

```ts
const nextConfig: NextConfig = {
  // DuckDB (used by Mastra's observability storage) ships native .node bindings
  // that the bundler can't resolve; load them from node_modules at runtime.
  serverExternalPackages: ["@mastra/duckdb", "@duckdb/node-api", "@duckdb/node-bindings"],
  // Kessel Run skills are markdown read from disk at request time, so the
  // bundler never sees an import for them. Trace them explicitly or a deployed
  // build starts with no skills loaded.
  outputFileTracingIncludes: {
    "/api/**": ["./src/mastra/skills/**/*.md"],
  },
};
```

**Verify**: `npm run build` → exit 0.

### Step 8: Prove the agent actually loads all 11 skills at runtime

This is the acceptance check for the whole plan. Create a throwaway script at
`/tmp/verify-skills.mjs` (do **not** add it to the repo):

```js
import { kesselRunAgent } from './src/mastra/agents/kessel-run-agent.ts';

const skills = await kesselRunAgent.listSkills();
console.log('COUNT:', skills.length);
for (const s of skills) console.log('-', s.name);
```

Run it from the repo root so `process.cwd()` matches runtime:

```bash
npx tsx /tmp/verify-skills.mjs
```

If `tsx` is unavailable, instead assert the same thing through a temporary
Vitest file and delete it afterward.

**Verify**: output contains `COUNT: 11` and lists all 11 `kessel-run-*` names.

If the count is 0, the paths are not resolving from cwd — that is a STOP
condition, not something to patch around by hardcoding an absolute path.

### Step 9: Full regression pass

**Verify** all four:

- `npm run typecheck` → exit 0
- `npm test` → exit 0, all tests pass
- `npm run lint` → exit 0, 0 errors
- `npm run build` → exit 0

Then start the dev server and confirm the untouched weather demo still works:

- `npm run dev`, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/chat` → `200`

## Test plan

- New file `src/mastra/skills/catalog.test.ts`, 6 cases: catalog matches disk,
  count is 11, directory names match frontmatter names, descriptions are
  non-empty, the pipeline/standalone split is 8/3, and stages are 0–7 with no
  gaps.
- Model after `src/lib/utils.test.ts` (created in plan 001).
- The step-8 runtime check is deliberately **not** a committed test: it
  constructs a real `Agent`, which pulls in the model router and is slow and
  network-adjacent. Keep the committed tests filesystem-only and fast.
- Verification: `npm test` → all pass, including 6 new ones.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `find src/mastra/skills -name SKILL.md | wc -l` → `11`
- [ ] `test ! -d kessel-run-skills && echo gone` → `gone`
- [ ] Every skill directory name equals its frontmatter `name` (step 1's loop prints nothing)
- [ ] `npm test` exits 0 with 6 new catalog tests passing
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with 0 errors
- [ ] `npm run build` exits 0
- [ ] The step-8 script prints `COUNT: 11`
- [ ] `http://localhost:3000/chat` still returns 200 under `npm run dev`
- [ ] `git status --short` shows no modifications to `weather-agent.ts`,
      `weather-tool.ts`, `weather-workflow.ts`, `src/app/api/chat/route.ts`,
      or `src/app/chat/page.tsx`
- [ ] `plans/README.md` status row for 002 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The frontmatter `name` of any skill file does not match the mapping table
  above. Do not rename to make it fit — report the discrepancy.
- `agent.listSkills()` returns fewer than 11 skills in step 8. Specifically do
  **not** work around this by converting to inline `createSkill()` calls or by
  hardcoding absolute paths; both hide a real cwd-resolution problem that will
  resurface in production.
- The model string `openai/gpt-5` is rejected as unknown by the model router.
  Report it; do not substitute another provider or silently downgrade.
- `npm run build` fails after the `outputFileTracingIncludes` change. It passes
  before the change, so a failure isolates cleanly to that edit.
- You find yourself needing to edit the body of any `SKILL.md`. The skills are
  the product here; changing their content is out of scope for a relocation.

## Maintenance notes

- **Adding a 12th skill** means three coordinated edits: the directory with
  `SKILL.md`, an entry in `KESSEL_RUN_SKILLS`, and — if it belongs to the
  ordered pipeline — renumbering stages. The catalog test will fail until all
  three are consistent, which is the intended safety net.
- **Skill paths are cwd-relative.** Anything that changes the process working
  directory (a monorepo move, a custom server entry, some deploy adapters) will
  break skill loading with no error other than an empty skill list. If skills
  ever vanish in a new environment, check cwd first.
- Reviewers should confirm the `SKILL.md` bodies are unchanged from
  `kessel-run-skills/`. Because the originals are tracked as of `6e39653` and
  the move uses `git mv`, `git diff -M 6e39653..HEAD -- '*SKILL.md'` should show
  pure renames with no content hunks. `kessel-run-skills.zip` is a second copy
  to compare against if in doubt.
- Deferred: skill `references/` subdirectories. `01-anchor.md` mentions a
  `references/publications.md` for voice profiles that does not exist yet.
  Adding voice profiles as skill references is a natural follow-on and is why
  the directory-per-skill layout was chosen over flat files.
