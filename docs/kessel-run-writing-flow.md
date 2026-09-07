# Writing flow implementation and validation

Start / Resume selects an existing piece/output, pinned publication and author profiles, needed sources and next action. Writing methods now support guided collaboration and complete fast drafts; supplied notes can replace an Interview, and approved sparse profiles can be used without an archive. Output and profile persistence follows the [Markdown workspace contract](../src/mastra/skill-references/workspace.md).

## Scope

The catalog now contains 14 skills: stages 0–7 unchanged and six standalone skills. No app state, APIs, schema, dependencies or live vault content changed. App memory still accepts only existing matching fields; extra profile/output state remains in a Markdown handoff until runtime integration exists. Skills cannot acquire filesystem or browsing tools simply by requesting them.

The method edits preserve source support in hooks, transitions and endings; separate editorial voice from factual material; retain original drafts and human edits; and record independent target profiles when repurposing. Polish scores do not create an accepted final or authorize publication. Research depth follows the requested questions instead of fixed source quotas.

## Deterministic checks

On the implementation checkout (2026-09-07), baseline 40 tests passed before adding Start. After implementation, 40 tests across 8 files passed, including catalog equality against actual skill folders, unchanged pipeline numbering and workspace-copy equality/routing. `skills:check` verified 14 bundled references. Typechecking and diff checks passed; lint reported 0 errors and 9 pre-existing warnings. The skill-creator validator accepted all 14 skill folders, including Start. All 27 local routing/documentation links resolved outside illustrative fenced templates. These checks establish packaging and repository consistency, not real writing-session behavior or content quality.

## Behavioral evidence

The bounded independent local synthetic walkthrough below was inspected after execution. It does not execute the ChatGPT or Mastra runtime, fetch site archives or validate any actual publication's content quality.

An independent evaluator read the actual Start, workspace, Draft, Hook and Repurpose instructions and created a synthetic product-review workspace under `/private/tmp/kr-writing-flow-walkthrough/`. It produced real local Markdown artifacts: `REPORT.md`, `workspace/Handoff.md`, review and short-output drafts, and `workspace/Guided/Transcript.md`. The evaluator constructed and executed its own fixture; this is independent of the implementation author but is not a separate hosted skill runtime.

Observed results after artifact inspection:

- Saved review resumed with publication v1 and Jason v1/parent v1, despite current publication v2. The sparse approved profile required no archive or repeated publication/profile questions.
- A complete fast review used manufacturer specifications and attributed Maya's actual notes. It stated that Jason had not used the product; measured runtime remained a named gap. No Interview was required.
- The original human draft remained byte-identical. Existing Brief and Output state changed by dated append; profiles and source notes were preserved. The new review retained the user's deliberate opening and placed the battery hook after it.
- Two additional outputs independently selected Greatest v2/no author and Pine v1/no author. Original output pins and prose were preserved. Their local links resolved.
- The handoff embedded actual profile rules, author differences/parent, source text, selections, prose, decisions, gaps and next actions.
- A guided transcript saved the first section and pause, then inserted an explicitly synthetic user approval, then saved the second section and pause. The first approval was not requested again. This tests a local representation of successive turns, not real human approval or asynchronous UI behavior.

The initial evaluator read exposed older Hook wording that required an ideation map and five or six archetypes. Those source paragraphs now allow supplied material and a proportionate fast opening; no extra runtime reliability is claimed from that textual correction. Personalize/Polish were not invoked in the exercise. Missing snapshots, conflicting IDs, profile-rule conflicts and actual app memory/tool behavior were not tested. Stylistic separation was modest and remains an editorial judgment; real publication samples and user review are still needed to validate quality.

A bounded follow-up requested a hook led by measured battery endurance rather than the manufacturer's advertised figure. The evaluator wrote `workspace/Hook followup transcript.md` and a new `Draft.machine.runtime-hook.2026-09-07.md`. Inspection confirmed a specific measured-runtime/test-conditions placeholder with a supported bridge explaining the incomplete test, while prior drafts remained unchanged. The complete handoff was updated to include that revision. This exercises a missing-evidence hook without inventing a measurement.
