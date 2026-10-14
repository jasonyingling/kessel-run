import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import type { MastraModelConfig } from '@mastra/core/llm';
import { createTool } from '@mastra/core/tools';
import { noopLogger } from '@mastra/core/logger';
import { SKILL_PATHS } from '@/mastra/skills/catalog';
import { Credentials, credentialSelection } from './credentials';

// Deliberately small server-owned compatibility list; catalog discovery is not
// evidence that a model supports this writing/tool protocol.
export const supportedModels = ['gpt-5'] as const;
export const modelSelection = z.enum(supportedModels);
export const turnSchema = z.object({
  message: z.string().min(1).max(24000),
  scope: z.string().uuid(),
  model: modelSelection,
  mode: z.enum(['guided', 'fast']),
  operationId: z.string().uuid(),
}).strict();
export const providerSelection = z.object({ source: credentialSelection, model: modelSelection }).strict();
export type WritingOperations = {
  readContext: () => Promise<{ text: string; revision: string }>;
  saveCandidate: (input: { prose: string; expectedRevision: string; operationId: string }) => Promise<{ candidateId: string; revision: string }>;
};
export async function createWritingAgent(selection: z.infer<typeof providerSelection>, operations: WritingOperations, credentials?: Credentials, injectedModel?: MastraModelConfig) {
  providerSelection.parse(selection);
  const model = injectedModel ?? { id: `openai/${selection.model}` as const, apiKey: await (credentials ?? new Credentials()).resolve(selection.source) };
  const agent = new Agent({
    id: 'kessel-run-local-writing', name: 'Kessel Run', model,
    instructions: `Use the Kessel Run Start/Resume skill before writing. Follow the canonical skills. Use supplied material only: a URL is a reference, never evidence of retrieval. Do not invent facts, statistics or personal experience. The user makes editorial approvals. Read the exact saved context and revision before proposing prose. Save generated prose with kr_propose_draft; never claim it is saved until the tool succeeds. Keep scores and research separate from prose. Credentials are private and are never part of your context.`,
    skills: [...SKILL_PATHS],
    tools: {
      kr_get_context: createTool({ id: 'kr_get_context', description: 'Read the exact selected supplied context and editor revision.', inputSchema: z.object({}).strict(), execute: async () => operations.readContext() }),
      kr_propose_draft: createTool({ id: 'kr_propose_draft', description: 'Save an immutable candidate, without approval. A stale expectedRevision returns CONFLICT; read context again and ask the user to reconcile. Repeat an identical operation ID to recover an ambiguous save; never change its arguments.', inputSchema: z.object({ prose: z.string().min(1).max(80000), expectedRevision: z.string().min(1).max(128), operationId: z.string().uuid() }).strict(), execute: async input => operations.saveCandidate(input) }),
    },
  });
  // Raw provider exceptions may contain credential-bearing request objects.
  // Persist typed safe errors at the run boundary instead of framework logs.
  agent.__setLogger(noopLogger);
  return agent;
}
