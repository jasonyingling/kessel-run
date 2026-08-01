# Plan 001: Establish a test and typecheck baseline

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
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `6e39653`, 2026-07-29 (SHA re-stamped 2026-07-30 by
  `reconcile` when the working tree was committed; plan content unchanged and
  excerpts re-verified against the live files)

## Why this matters

This repo has no test runner at all. `package.json` defines only `dev`,
`build`, `start`, and `lint`. Plans 002–006 build a skills catalog, a project
state model, and four API routes — all of which need machine-checkable
verification, and none of which a `next build` alone will catch. Without a test
command, every later plan's "done criteria" degrades into "the executor thinks
it works."

This plan adds Vitest configured for the Node-side code (`src/mastra/`,
`src/lib/`) plus a `typecheck` script, and proves both work with one real test.
It deliberately does **not** set up React component testing — that needs jsdom
and Testing Library, and none of the later plans' correctness depends on it.

## Current state

Relevant files:

- `package.json` — scripts block has no test or typecheck entry.
- `src/lib/utils.ts` — the `cn()` helper shadcn generated; a real, dependency-free
  function that makes a good first test subject.

`package.json:6-11` as it exists today:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
```

`src/lib/utils.ts` in full:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Repo conventions to match:

- TypeScript throughout, `strict: true` (`tsconfig.json`).
- Path alias `@/*` → `./src/*` (`tsconfig.json:21-23`). Use it in test imports.
- No semicolon-style enforcement — `src/mastra/` files use semicolons,
  `src/app/chat/page.tsx` does not. ESLint does not enforce either. Match
  whatever file you are editing; for new files under `src/mastra/`, use
  semicolons.

## Commands you will need

| Purpose   | Command             | Expected on success              |
|-----------|---------------------|----------------------------------|
| Install   | `npm install`       | exit 0                           |
| Typecheck | `npx tsc --noEmit`  | exit 0, no output                |
| Lint      | `npm run lint`      | exit 0; 9 warnings, 0 errors     |
| Build     | `npm run build`     | exit 0                           |
| Tests     | `npm test`          | exit 0 (after this plan)         |

Note on lint: 9 pre-existing warnings in `src/components/ai-elements/` and
`src/components/ui/` are expected and are **not** your problem. Errors are 0
today; if you introduce an error, fix it.

## Scope

**In scope**:
- `package.json` (scripts + devDependencies)
- `vitest.config.ts` (create)
- `src/lib/utils.test.ts` (create)

**Out of scope** (do NOT touch):
- `eslint.config.mjs` — do not add test-file overrides; not needed yet.
- `tsconfig.json` — Vitest reads the existing paths config via the tsconfig
  paths plugin below; no change required.
- Anything under `src/components/` other than creating no files there.
- `next.config.ts`.

## Git workflow

- Branch: `advisor/001-test-baseline`
- One commit is fine. The repo has a single commit (`Initial commit`) with no
  established message convention; use a plain imperative subject line such as
  `Add Vitest baseline and typecheck script`.
- Do NOT push or open a PR.

## Steps

### Step 1: Install Vitest and the tsconfig paths resolver

```bash
npm install -D vitest vite-tsconfig-paths
```

`vite-tsconfig-paths` is what makes `@/...` imports resolve inside tests without
duplicating the alias map.

**Verify**: `node -p "require('./package.json').devDependencies.vitest"` →
prints a version string (not `undefined`).

### Step 2: Create `vitest.config.ts`

Create the file at the repo root:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Component tests would need jsdom; deliberately not configured yet.
    exclude: ["node_modules", ".next"],
  },
});
```

Note the `include` glob is `*.test.ts` only — not `.tsx`. That is intentional
and keeps React component files from being picked up by a Node-environment
runner.

**Verify**: `test -f vitest.config.ts && echo present` → prints `present`.

### Step 3: Add the `test` and `typecheck` scripts

Edit the `scripts` block in `package.json` so it reads:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

**Verify**: `npm run typecheck` → exit 0, no output.

### Step 4: Write the first test

Create `src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets a later tailwind class win over an earlier conflicting one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
```

The third case is the one that matters — it proves `tailwind-merge` is actually
wired up, not just `clsx`.

**Verify**: `npm test` → exit 0, output contains `3 passed`.

### Step 5: Confirm nothing else regressed

**Verify** all four:

- `npm run typecheck` → exit 0
- `npm test` → exit 0, `3 passed`
- `npm run lint` → exit 0, `0 errors`
- `npm run build` → exit 0

## Test plan

- New file `src/lib/utils.test.ts` with 3 cases: class joining, falsy filtering,
  and Tailwind conflict resolution.
- There is no existing test to model after — this is the first one. Later plans
  should model their tests after this file's structure (`describe` per exported
  symbol, `it` per behavior, `@/` imports).
- Verification: `npm test` → 3 passed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0 and reports `3 passed`
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with 0 errors
- [ ] `npm run build` exits 0
- [ ] `vitest.config.ts` and `src/lib/utils.test.ts` exist
- [ ] `git status --short` shows changes only to `package.json`,
      `package-lock.json`, `vitest.config.ts`, `src/lib/utils.test.ts`
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `src/lib/utils.ts` does not match the excerpt above.
- `npm install -D vitest vite-tsconfig-paths` produces a peer-dependency error
  that blocks installation. Do not force with `--legacy-peer-deps` without
  reporting first — this project is on Next 16 / React 19 and forcing
  resolutions here can cascade.
- `npm test` fails on the `tailwind-merge` case. That would mean `cn()` is not
  behaving as its source suggests, which is a real finding worth reporting
  rather than working around by weakening the assertion.
- `npm run build` fails. It passes today; a failure means something outside
  this plan's scope broke.

## Maintenance notes

- Anyone adding React component tests later will need to add `jsdom`,
  `@testing-library/react`, a `.tsx` entry in the `include` glob, and probably a
  separate Vitest project/workspace so the Node and jsdom environments don't
  collide. That was deliberately deferred here.
- `npm run test:watch` is provided for local development but should never be
  used in CI or by an automated executor — it does not exit.
- Reviewers should check that `include` stays scoped to `src/**/*.test.ts`;
  widening it to `.tsx` without adding jsdom will produce confusing failures.
