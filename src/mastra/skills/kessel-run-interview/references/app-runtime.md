# Kessel Run local app and external-agent runtime

This reference describes runtime capabilities; it does not replace the canonical
writing methods, stage numbering, guided/fast choice or human editorial decisions.
Check the actual available tools before claiming a capability.

## Start / Resume and evidence

Begin with `kr_get_workflow` for `kessel-run-start`. Read its complete paginated
instructions/references and retain the content hash. Read `kr_get_context` summary,
then the needed voice, author, preset, brief, source, artifacts and pending sections.
Sections are JSON text in bounded pages. Source pages use `sourceOffset`; text pages
use `offset`. Keep the same `contextHash` throughout; if it changes, reload the
selected context. Retained revision IDs can be read through the `revision` section
with `revisionId`; use exact machine/final snapshots for lesson comparisons.
Profile proposals have their own section and remain unapproved.

Use supplied text/Markdown/interview material as evidence. A reference URL is not
retrieval. No URL crawler, metric provider, Oracle or dictation capability is
implied. With missing research tools, work in supplied-material mode and name
missing evidence. Preserve supplied interview questions and answers verbatim,
including attribution. Never invent facts, numbers, source access or experience.

## Shared content operations

`kr_list_publications` and `kr_list_pieces` return scoped summaries. Create pieces
and independent outputs with complete exact voice/author selections. Publication
presets specify format; profile rules specify voice; sources support claims.
Author overlays pin their exact publication parent. Missing versions require
resolution rather than substituting current defaults.

Every content mutation has an operation ID and expected target hash. Draft
proposals additionally require the selected context hash. Repeat identical
arguments/operation IDs to recover an ambiguous save; changed arguments fail.
A conflict retains supplied text for human reconciliation. Do not retry an
ambiguous generation or silently replace intervening human prose.

`kr_save_source` appends supplied material with attribution. `kr_save_artifact`
keeps research, anchors, hooks, outlines and reviews separate from prose.
`kr_propose_draft` retains candidate prose and declared provenance as a pending
proposal; a successful tool result confirms persistence, not editorial approval.
Streamed text is provisional until saving succeeds. A scorecard is not final prose.
`kr_record_progress` records the next action while preserving existing decisions.

`kr_propose_profile` and `kr_propose_lessons` produce evidenced proposals. Profiles,
final prose and lessons require separate human decisions through the app. Tools
cannot manufacture those approvals. Lessons require the exact retained machine
and accepted-final lineage pair. Author lessons stay with that author. Publishing
an approved new voice version does not retarget older outputs.

## Two AI entry paths

In-app AI runs through the selected server-side API credential. Credential setup
is separate from chat. Credentials never belong in conversation, tools, content,
exports or logs. An invalid/exhausted selected source does not fall back.

External agents run inference through their own provider/account. MCP only reads
or mutates saved content; it never invokes the app model, exposes provider keys or
provides a generic generation tool. Client tokens are separate, scoped, revocable
credentials. Declared external model names are unverified metadata, not billing
proof. External private conversation history is unavailable; show committed
activity/provenance instead.

The local endpoint uses stateless Streamable HTTP and requires a bearer access
token. A client must reach the machine's loopback server. This does not authorize
hosting, tunneling, deployment, publishing or remote OAuth. Host compatibility
requires actual client testing; never infer it from generic MCP support.

## Limited tools or portable handoff

When persistence or required inputs are unavailable, continue with supplied
material and return the established resumable Markdown handoff: actual selected
rules/versions, author differences, relevant source text/provenance, decisions,
open questions, progress, complete output selections and prose, pending work and
suggested filenames. Name missing versions/inputs and do not claim a save.
Legacy demo projects retain their old working-memory fields; this runtime does
not migrate those records or rewrite a personal vault.
