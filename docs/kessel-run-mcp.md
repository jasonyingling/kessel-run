# Connect your own agent

Launch Kessel Run with `npm run app:dev`, pair the browser using the printed link, and choose an app-managed workspace. In API settings, **Connect your agent** issues a separate token for each client. Choose workspace or publication scope and independently enable supplied sources and draft/artifact/profile proposals. The secret is shown once; only its hash is retained privately. Rotate a lost token or revoke a client. Connection changes require the authenticated browser session.

The endpoint is `http://127.0.0.1:3000/api/mcp` (use the actual launcher port). Transport is stateless Streamable HTTP. This local URL works only for clients that can reach this machine. No tunnel, public server, remote OAuth, or automatic client configuration is provided.

For Codex, manually add a configuration entry:

```toml
[mcp_servers.kessel_run]
url = "http://127.0.0.1:3000/api/mcp"
bearer_token_env_var = "KESSEL_RUN_MCP_TOKEN"
```

Supply the one-time Kessel Run token through that private environment variable when starting your client. Do not use a provider API key here. See the [official Codex MCP configuration guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). No global agent settings are modified by Kessel Run.

## Writing and resuming

Start with `kr_get_workflow` (default: Start/Resume), then scoped publication/piece summaries. Read `kr_get_context` sections in bounded pages, retaining the context hash across pages. An output uses its exact voice and author pins. Before a piece exists, select `publicationId` instead of `outputId`; the summary lists version identities. Request `voice`/`author` with explicit version pins to retrieve rules. Omitted pins return no selected rules, never today's latest version.

Read supplied sources, saved artifacts, pending proposals and revision listings as needed. The `revision` section with `revisionId` retrieves exact retained prose. Reference URLs are not retrieved evidence. External agents supply their own prose to proposal tools; their private chat history is not available to the app.

Every mutation requires a UUID operation ID and an expected entity hash. Draft proposals also require the exact context hash. Repeat identical arguments with the same ID after an ambiguous response; changing arguments requires a new ID. On `CONFLICT`, preserve candidate text and read current context before reconciling. Profile, final and lesson approval remains a human browser action. MCP cannot manufacture approval or invoke app inference.

## Transport evidence and limits

Pinned packages: `mcp-handler` 2.3.0 and matching `@modelcontextprotocol/server` / `client` 2.3.1, Node 20+, Zod 4. The handler follows [Vercel's stateless v2 guidance](https://vercel.com/changelog/latest-mcp-spec-now-supported-in-mcp-handler). No Redis or deprecated SSE adapter is used.

Real SDK loopback HTTP tests cover tool discovery, scoped context, supplied writing operations, missing exact versions, malformed arguments, revoked access, and request bounds with model keys unset and inference instrumented to fail. A real external Codex account walkthrough remains pending. Browser connection setup and visual/keyboard/mobile acceptance remain unverified under the current browser restriction; source implementation is not release acceptance.
