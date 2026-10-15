import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { noopLogger } from '@mastra/core/logger';
import { SKILL_PATHS } from '@/mastra/skills/catalog';
import { Credentials } from './credentials';
import { providerSelection } from './provider';
import { toolSchemas, descriptions, executeDomainTool } from '../mcp/tools';
import type { ToolName } from '../mcp/tools';
import type { Grant } from '../mcp/access-tokens';
import type { WorkspaceService } from '../workspace/service';
import type { z } from 'zod';
import type { MastraModelConfig } from '@mastra/core/llm';

export async function createWorkspaceAgent(
  selection: z.infer<typeof providerSelection>, service: WorkspaceService, grant: Grant,
  options: { credentials?: Credentials; model?: MastraModelConfig; signal?: AbortSignal; onOperation?: (name: ToolName, result: unknown) => Promise<void> } = {},
) {
  providerSelection.parse(selection);
  const model = options.model ?? { id: `openai/${selection.model}` as const, apiKey: await (options.credentials ?? new Credentials()).resolve(selection.source) };
  const tools = Object.fromEntries((Object.keys(toolSchemas) as ToolName[]).map(name => [name, createTool({
    id: name, description: descriptions[name], inputSchema: toolSchemas[name],
    execute: async args => {
      options.signal?.throwIfAborted();
      const result = await executeDomainTool(name, args, service, grant, 'model');
      await options.onOperation?.(name, result);
      return result;
    },
  })]));
  const agent = new Agent({
    id: 'kessel-run-workspace', name: 'Kessel Run', model, tools, skills: [...SKILL_PATHS],
    instructions: `Start with kr_get_workflow for kessel-run-start. Follow the canonical editorial methods, guided/fast choice and stage numbering. Read all needed context pages with an unchanged contextHash, including exact selected voice/author rules, supplied sources, saved artifacts and pending decisions. Never invent retrieval, facts, metrics or personal experience. URLs are references only. Use shared tools to save proposals and progress; prose is provisional until the tool confirms a committed save. Tools cannot approve profiles, lessons or finals. Preserve human edits and ask the human to reconcile conflicts. External-agent activity is saved provenance, not a private conversation you can read. Credentials are never context or tool arguments.`,
  });
  agent.__setLogger(noopLogger);
  return agent;
}
