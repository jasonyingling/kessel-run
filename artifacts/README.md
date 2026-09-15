# Kessel Run application concept

Open `kessel-run-app.html` in a browser. This is a standalone, interactive HTML mockup; no application server or build step is required. Fonts load from Google Fonts when available, with local fallbacks.

## Suggested walkthrough

1. **Overview:** choose among the three publications and see pieces grouped by editorial status.
2. **Shape your voice:** start The Greatest Ever Reviews with a three-question interview. Review and explicitly approve the preferences. A starter profile remains usable without an archive.
3. **Voice studio:** explore publication rules, author subprofiles, evidence, and the proposed archive-import entry point.
4. **New piece:** pick the publication, capture an idea, choose a first format, and select guided or fast drafting.
5. **Writing desk:** add notes, edit a draft, choose an author, and complete an editorial checklist.
6. **Outputs:** maintain separate article, newsletter, social, or other drafts and approvals.
7. **Learn from an edit:** save an explicit preference to a new publication profile version. Existing outputs retain their selected version and rule snapshot.
8. **Export:** download the current output or voice profile as Markdown.

## Prototype boundaries

All initial publication rules, maturity labels, and content are illustrative. The prototype does not evaluate the actual publications or infer traits for real authors. Interviews save literal answers rather than performing AI analysis. The review checklist is manual, and sample drafting uses fixed copy.

Changes live in memory until refresh or **Reset demo**. Outputs, author selections, and their pinned voice versions persist when navigating within this session. Download Markdown to keep content outside the demo. There is no AI connection, crawler, account system, vault sync, scheduling, or publishing integration.

The visual direction uses a cosmic blue palette, deep navy surfaces, cool blue and violet publication identities, compact navigation, and a separate writing surface. Cards have no colored edge accents. Diagonal arrows are excluded from the design. The skills remain the intended behavior underneath; the interface exposes useful next actions rather than requiring users to work through all fifteen skills.

## Verification

2026-09-15 source verification completed in the isolated implementation worktree:

- Passed: HTML structure parsing (one closed style, body, and script in the required order), CSS parsing with PostCSS, one inline-script parse, extracted helper checks for dialog focus/timer branches using DOM boundary mocks, and `git diff --check`. These source checks are not rendered-browser verification.
- Not verified: all rendered browser acceptance, including dialog focus containment/restoration, toast computed colors and wrapping, pointer press/reduced-motion behavior, responsive viewport overflow, JavaScript console errors, physical touch, and animation-panel playback.

The local-file browser URL policy blocked the required inspection. No alternate protocol, server, or browser surface was used. Responsive styles remain included, but browser validation is required before treating them as accepted.
