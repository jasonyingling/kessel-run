import { createMcpHandler } from 'mcp-handler';
import { ZodError } from 'zod';
import { AccessTokens } from './access-tokens';
import { configuredWorkspace } from '../workspace/config';
import { WorkspaceError } from '../workspace/schema';
import { requireLocalRequest, LocalAccessError, boundedJSON } from '../local-session';
import { toolSchemas, descriptions, executeDomainTool } from './tools';
import type { ToolName } from './tools';
import type { WorkspaceService } from '../workspace/service';
import type { CallToolResult } from '@modelcontextprotocol/server';

export async function handleMcp(
  request: Request,
  dependencies: { tokens?: AccessTokens; service?: WorkspaceService } = {},
) {
  try {
    requireLocalRequest(request);
    const token = /^Bearer (kr_mcp_[a-f0-9]{64})$/.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return Response.json({ error: 'Bearer access token required' }, { status: 401 });
    const tokens = dependencies.tokens ?? new AccessTokens();
    await tokens.authenticate(token);
    if (request.method === 'POST') {
      const payload = await boundedJSON(request, 200000);
      const headers = new Headers(request.headers);
      headers.delete('content-length');
      request = new Request(request.url, { method: 'POST', headers, body: JSON.stringify(payload), signal: request.signal });
    }
    const service = dependencies.service ?? (await configuredWorkspace()).service;
    const handler = createMcpHandler(server => {
      for (const name of Object.keys(toolSchemas) as ToolName[]) {
        server.registerTool(name, {
          description: `${descriptions[name]} For a conflict, retain your supplied text, reload context and ask the human to reconcile. Retrying an identical operation ID returns its original result; changing its arguments fails.`,
          inputSchema: toolSchemas[name],
        }, async (args: unknown): Promise<CallToolResult> => {
          try {
            const grant = await tokens.authenticate(token);
            const result = await executeDomainTool(name, args, service, grant);
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          } catch (error) {
            const code = error instanceof WorkspaceError ? error.code : 'INVALID_INPUT';
            const message = error instanceof WorkspaceError ? error.message : error instanceof ZodError ? 'Tool arguments are invalid' : 'Content operation could not complete';
            return { isError: true, content: [{ type: 'text', text: JSON.stringify({ code, message }) }] };
          }
        });
      }
    }, { serverInfo: { name: 'kessel-run', version: '0.1.0' }, maxSubscriptions: 0, verboseLogs: false });
    return await handler(request);
  } catch (error) {
    return Response.json({ error: 'Connection unavailable or revoked' }, { status: error instanceof LocalAccessError ? error.status : 401 });
  }
}
