import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ownerWrite, privateFile, privateRoot } from '../local-session';
import { WorkspaceService } from './service';

const configuration = z.object({ id: z.string().uuid(), root: z.string(), privateDirectory: z.string() }).strict();
export async function configuredWorkspace() {
  const value = configuration.parse(JSON.parse(await readFile(privateFile('workspace.json'), 'utf8')));
  return { configuration: value, service: new WorkspaceService(value.root, value.privateDirectory) };
}
export async function createWorkspace(input: { operationId: string; root: string; title: string }) {
  const parsed = z.object({ operationId: z.string().uuid(), root: z.string().min(1).max(4096), title: z.string().min(1).max(160) }).strict().parse(input);
  const privateDirectory = resolve(privateRoot(), `workspace-${parsed.operationId}`);
  const service = new WorkspaceService(resolve(parsed.root), privateDirectory);
  const result = await service.initialize({ operationId: parsed.operationId, title: parsed.title });
  const value = configuration.parse({ id: result.id, root: await realpath(parsed.root), privateDirectory });
  await ownerWrite('workspace.json', value);
  const session = JSON.parse(await readFile(privateFile('session.json'), 'utf8'));
  await ownerWrite('session.json', { ...session, workspaceId: value.id });
  return { id: value.id, root: value.root };
}
