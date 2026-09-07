# Kessel Run: ChatGPT skills and SaaS reconciliation

Reviewed 2026-09-06 against `0c2e18e`. Standard, hotspot-weighted read-only audit; only `plans/` was edited. This is an advisory review and reconciled backlog, not a newly authorized implementation specification.

> **September 7 update:** The user accepts the skill recommendations, confirms
> the vault is fine for personal validation, and wants the SaaS to follow once
> content quality is validated. The product will center on publications and
> their outputs, with Buffer as a UI reference. See [the agreed direction](2026-09-07-product-direction.md).
> This supersedes the packaging-first and parallel-SaaS sequence below;
> the audit findings remain unchanged.

## Recommendation

Keep one canonical writing method and provide separate runtime adapters for ChatGPT, the SaaS, and the optional Obsidian workflow. The skills should describe how to interview, develop, draft, and revise; the host should supply saved context, capabilities, identity, and persistence. Do not fork the writing instructions into independent ChatGPT and app versions.

The user explicitly wants content format and audience to remain user-defined and customer targeting to be decided later. No niche, pricing, market-demand conclusion, or target customer is assumed here. The commercial direction is a hypothesis to validate through actual use.

## What exists

- TypeScript, Next.js 16.2.12, React 19, npm, Mastra, AI SDK, shadcn. One content agent loads Markdown skills progressively; no agent rewrite is justified by this review.
- Twelve skills: eight numbered pipeline stages, plus Review, Repurpose, Analyze, and standalone Interview (`src/mastra/skills/catalog.ts:40`; catalog tests confirm counts).
- A content project is a Mastra thread. Schema-typed thread working memory contains the latest pipeline artifacts. The UI supplies a gallery, project list, pinned-skill chat, stage rail, and artifact panel.
- LibSQL supports a hosted Turso URL but falls back to a local database. Observability initializes DuckDB at module load (`src/mastra/index.ts:18-26`). Hosted operation is not verified.
- A vault installer exists. ChatGPT distribution, voice derivation, lessons, and Oracle are not implemented. Interview exists, but the schema has no transcript artifact and Draft still follows the old pipeline.

## Verification and limits

| Check run in this review | Result |
|---|---|
| `npm test` | 7 files, 36 tests passed |
| `npm run typecheck -- --incremental false` | Passed; incremental writes disabled for the audit |
| `npm run lint` | Passed, 0 errors and 9 existing vendored-component warnings |
| `npm audit --json` | Unavailable: registry DNS `ENOTFOUND`; no vulnerability count inferred |
| Git/source inspection | HEAD `0c2e18e`; initially clean working tree |

No production build, browser walkthrough, live model generation, ChatGPT installation, vault installation, deployment, load test, or paid-service integration was performed. Existing browser/build evidence in the index is historical. The 375px check remains unverified. Source review covered the product paths, all existing plans, test shape, storage, dependencies/configuration, and key skill contracts; it was not a line-by-line audit of vendored UI code or dependencies. No external personal archive was inspected. No competitor or pricing study was conducted.

## Reconciled plans

| Plans | Current disposition | Evidence and next action |
|---|---|---|
| 001–006 | DONE, repository/static baseline rechecked | Their implementation remains, and the existing suite passes. Exact original skill-count criteria were intentionally superseded by 014. Authentication was outside prototype scope; commercial requirements do not invalidate that completed work. |
| 014 | DONE for repo deliverable | Interview skill, catalog registration, installer, and vault documentation exist. Does not establish that the user's vault has been installed or that an interview has been run. |
| 007 | NEEDS REVISION before dispatch | Still needed. Use the existing 014 composition branch; do not recreate or wholesale overwrite Interview. Preserve `.default(null)` for old state. Add guide updates to scope and reconcile transcript/research source rules across Interview, Ideation, Hook, Draft, and the index. This review removed the explicit hook/bridge/closing sourcing exemption from the plan, but did not claim the whole plan is refreshed. |
| 008 | NEEDS REVISION before dispatch | Source scope has no drift since `490545a`. However, the planned `disabled` prop overrides SpeechInput's internal capability/readiness guard (`speech-input.tsx:317-319`), and the plan contradicts its disabled-fallback promise. Resolve this in app-owned wiring while preserving vendored code. Browser support must be tested by capability, not inferred solely from brand. |
| 009 | NEEDS REVISION | Claude `.skill` packaging is the wrong primary delivery target. Preserve validation and personal-reference protection; replace delivery with a verified ChatGPT path. Keep Claude as an optional adapter if still useful. |
| 010 | NEEDS REVISION | Define portable run/profile/artifact contracts before selecting host storage. A local vault must not be required for ChatGPT or SaaS. Retain the documented vault layout and preservation rules for that adapter. |
| 011 | NEEDS REVISION | Depends on the new profile contract. Remove hardcoded archive/Notion assumptions and reconcile overwrite behavior with the chosen storage adapter. Accept user-supplied examples across publications/formats. |
| 012 | NEEDS REVISION | Resolve “write nothing” versus writing `final.md`; distinguish final prose from the Polish scorecard. Needs identifiable draft/final revisions and a place to save confirmed lessons. |
| 013 | NEEDS REVISION; defer | Idea discovery is useful, but avoid registering an unusable connector-dependent skill in every runtime. Capability gating and revised storage/delivery must come first. |

There are no stale IN PROGRESS entries or BLOCKED executions to recover. No entire plan was retired as independently completed: 014 partially fulfills 007 but does not replace it. Original plan stamps remain visible for unresolved drift. No pending plan is certified ready for verbatim execution in this review.

The old index mixed an optional 009 with mandatory 009 dependencies. Until rewritten, the old dependency lists are historical, not dispatch instructions. The proposed new dependency order is **portable skill validation/state contract → per-surface delivery → state-dependent voice/lessons**. ChatGPT delivery must not depend on Claude packaging. SaaS account/usage work can proceed independently of the personal vault.

## Vetted improvement findings

Ordered by practical value within the current two-goal scope. H = high confidence; effort is S/M/L; risk describes changing the implementation, not the impact of leaving it unchanged. SaaS gates are prerequisites to commercial hosting, not assertions that the local prototype was wrongly designed.

| # | Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | Replace stale delivery/state assumptions | Architecture/docs | Both goals currently inherit Claude/vault requirements; context gets manually carried between skills | M | Medium | H | `plans/009-package-skills-for-claude.md`; `plans/010-workspace-and-run-directory.md`; `src/mastra/skills/kessel-run-interview/SKILL.md:28-48` |
| 2 | Make voice and source context available to every stage | Correctness/product | Draft requires a profile it has no explicit retrieval path for; Interview's source promise is not integrated | M | Medium | H | `src/mastra/skills/kessel-run-anchor/SKILL.md:22`; `src/mastra/skills/kessel-run-draft/SKILL.md:14-23`; `src/mastra/projects/schema.ts:43-67` |
| 3 | Repair failed-turn and history-load behavior | Correctness | Error leaves the composer disabled; a late history fetch can replace an active conversation | S | Low | H | `src/components/kessel-run/project-chat.tsx:70-83,134-150` |
| 4 | Supply or gate Research capabilities | Correctness | Instructions request searches/full-page retrieval, but the app agent has no configured browsing tools | M | Medium | H | `src/mastra/skills/kessel-run-research/SKILL.md:38-49`; `src/mastra/agents/kessel-run-agent.ts:6-46` |
| 5 | Establish authenticated ownership on every route | Security/SaaS gate | Current fixed identity cannot separate paying customers; demo route bypasses the shared identity helper | L | Medium | H | `src/lib/kessel-run/session.ts:9-12`; `src/app/api/chat/route.ts:7-8`; ownership already checked at `src/mastra/projects/store.ts:65` |
| 6 | Validate chat requests and own execution limits server-side | Security/cost | Client options reach agent execution; no complete server budget/usage policy | M boundary; L metering | Medium | H | `src/app/api/kessel-run/projects/[projectId]/chat/route.ts:23,38-50`; installed adapter passes remaining options at `node_modules/@mastra/ai-sdk/dist/index.js:10413` onward |
| 7 | Add saved revisions, recovery, and usable export | Reliability/product | Invalid state looks like a new empty project; only current artifact text is shown | M recovery/export; L revisions | Medium | H | `src/mastra/projects/store.ts:77-90`; `src/mastra/projects/schema.ts:43`; `src/components/kessel-run/artifacts-panel.tsx:28-34` |
| 8 | Verify route/stream behavior and writing outcomes | Tests | Current suite covers schema/store/helpers, not HTTP contract, retry flows, or editorial quality | M | Low | H | `vitest.config.ts:7-12`; `src/mastra/projects/store-access.test.ts`; stream compatibility cast at chat route `:54-58` |
| 9 | Protect personal references during reinstall | DX/data preservation | Installer replaces directories despite documentation claiming copy-only preservation | S | Medium | H | `scripts/install-skills-to-vault.sh:7-9,37-43`; `docs/kessel-run-vault.md:31-32` |

Finding 7 does not mean data is deleted: the current parser hides invalid data behind an empty view. Preserve the original blob and expose a recoverable error. A versioned migration is needed before future schema changes; 007 already correctly specifies a default for its added transcript field.

Lower-priority observations: project listing disables pagination (`store.ts:53`), the root README is still a framework starter, and Vite reports configuration/dependency deprecation warnings. These are worth addressing with onboarding and scale work; they do not outrank source continuity or a recoverable writing session. Dependency vulnerabilities could not be assessed.

## Direction options

### 1. Keep the granular skills; add a short route through them

The quick reference already lists different paths for articles, posts, threads, and newsletters (`docs/kessel-run/QUICK-REFERENCE.md:49-67`), but Draft requires every upstream artifact and a review of every section (`kessel-run-draft/SKILL.md:10-23`). Introduce a small “start/resume this piece” entry skill that reads existing material, asks the desired format/outcome, and loads only missing stages. Offer a user-selected fast drafting mode and the existing guided mode; approval at every paragraph should be a preference, while consequential editorial decisions stay visible.

Tradeoff: fewer checkpoints may increase revisions. Measure time-to-accepted-draft, clarification turns, and author editing time instead of assuming fewer turns means better writing. This is a proposed revision to the existing section-by-section policy, not a silent override. Coarse effort: M.

### 2. Make voice and lessons the shared compounding value

Prioritize a small reusable publication/voice profile, accepted writing examples, and confirmed corrections. Give every stage explicit input/output references and load only the relevant profile plus required artifacts, rather than rereading an entire archive on every invocation. Plans 011 and 012 have the right intent; 010 should provide a host-neutral contract with schema/skill versions and a resumable handoff artifact for sessions without durable storage.

Tradeoff: automatically inferred preferences can overfit one piece. Keep lessons scoped, editable, attributable to an edit, and explicitly confirmed; separate personal stories, externally sourced facts, and voice guidance. Coarse effort: M for the contract and personal workflow, L for app-backed revision history.

### 3. Sell a reliable workspace around the method

The current gallery/chat/artifact split is a useful prototype. The SaaS can add lasting value through saved voice profiles, a source library, versioned drafts, resumable projects, review, export, and usage visibility across user-chosen formats. Start with one complete journey from supplied material to an editable/exportable final; billing follows usable accounts and measured usage rather than standing in for product value.

Keep Mastra working memory for conversational context initially. Revisit the earlier “no separate artifact table” decision only when accepted revisions, recovery, or ownership requirements justify a durable artifact layer. Before a commercial pilot: authenticated ownership including demo routes, validated server-owned model/run limits, account quotas, durable storage/backup recovery, and deletion/export behavior. Teams, publishing integrations, a marketplace, and Oracle discovery can wait. Coarse effort: L, staged rather than one build-everything plan.

### 4. Let ChatGPT use the same saved workspace later

The index already proposed exposing app data services through MCP. Once the app has stable authenticated profile/project/artifact services, an authenticated connector can let ChatGPT skills read and save that same state. This gives the two surfaces a common backend without making the personal skills wait for the entire SaaS.

Tradeoff: synchronization, identity, and tool permissions add scope. Begin with portable files/context for personal use; do not build the connector until the shared services and cross-user isolation are verified. Coarse effort: M after the service foundation.

## ChatGPT delivery evidence

Official documentation describes Markdown skills with `name` and `description`, progressive loading, and explicit `@` invocation in ChatGPT. It distinguishes standalone/local use from plugin distribution across ChatGPT surfaces. Therefore the existing Markdown is a reusable starting point, but the Claude `.skill` packaging plan is not evidence of a working ChatGPT install. Use a verified plugin delivery path for cross-surface distribution, with capability declarations and no assumed access to the Mac vault. Actual account/install availability was not tested. [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)

## Recommended next planning sequence

1. Rewrite 009/010 together around canonical skill validation, portable state, and verified ChatGPT delivery. Split the resulting work into bounded execution plans; keep personal content outside distributable packages.
2. Refresh 007 around the shipped Interview, consistent sourcing, old-state compatibility, and matching guides. Add the “start/resume” and optional fast path as a separate design change.
3. Refresh 011/012 and run representative supplied-material workflows across several formats. Record input fixtures, unsupported-claim checks, voice adherence, active author time, and revisions. Unit tests for Markdown presence alone cannot establish writing quality.
4. Specify SaaS ownership/request policy and the reliability/revision/export slice. Boundary characterization tests precede auth, request-policy, and persistent-state changes. Keep hosted database/observability deployment and backup verification explicit gates.
5. Defer 013 and broad connectors until completed writing sessions show that idea discovery is the actual bottleneck. Customer targeting remains open as requested.

Suggested first plan selection: **ChatGPT delivery + portable context, refreshed Interview integration, and SaaS ownership/reliability**. These are recommendations for the next planning pass; no new numbered implementation plans were generated.

## Considered and rejected

- Rewriting the app or splitting every skill into its own agent: no evidence it improves either goal; preserve the existing single-agent architecture.
- Treating lack of auth as a regression in completed prototype plans: auth was intentionally out of scope, although it is mandatory before multi-user commercial operation.
- Claiming 014 completes 007: it does not supply a transcript schema field or downstream source discipline.
- Claiming 007 forgot old-state compatibility: it explicitly includes `.default(null)` and a regression test.
- Requiring a vault or choosing a newsletter-only SaaS: inconsistent with the current requested surfaces and the user's explicit decision to leave targeting open.
- Automatically upgrading the model or framework: no measured quality/cost or verified dependency advisory evidence supports that as the first move.
