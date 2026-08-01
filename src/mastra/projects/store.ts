import type { Memory } from '@mastra/memory';
import { mastra } from '../index';
import {
  EMPTY_PROJECT_STATE,
  PROJECT_THREAD_KIND,
  type ContentFormat,
  type ProjectState,
  projectStateSchema,
} from './schema';

export type Project = {
  id: string;
  title: string;
  publication: string;
  format: ContentFormat;
  pinnedSkill: string | null;
  createdAt: string;
  updatedAt: string;
};

async function getMemory(): Promise<Memory> {
  const memory = await mastra.getAgentById('kessel-run-agent').getMemory();
  if (!memory) {
    throw new Error('Kessel Run agent has no memory configured');
  }
  return memory as Memory;
}

export async function createProject(input: {
  resourceId: string;
  title: string;
  publication: string;
  format: ContentFormat;
}): Promise<Project> {
  const memory = await getMemory();
  const thread = await memory.createThread({
    resourceId: input.resourceId,
    title: input.title,
    metadata: {
      kind: PROJECT_THREAD_KIND,
      publication: input.publication,
      format: input.format,
      pinnedSkill: null,
    },
  });
  return toProject(thread);
}

export async function listProjects(resourceId: string): Promise<Project[]> {
  const memory = await getMemory();
  const { threads } = await memory.listThreads({
    filter: { resourceId, metadata: { kind: PROJECT_THREAD_KIND } },
    perPage: false,
  });
  return threads.map(toProject);
}

export async function getProject(
  resourceId: string,
  projectId: string,
): Promise<Project | null> {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId: projectId });
  // getThreadById does not filter by resource, so check ownership here.
  if (!thread || thread.resourceId !== resourceId) return null;
  if (thread.metadata?.kind !== PROJECT_THREAD_KIND) return null;
  return toProject(thread);
}

/**
 * Read a project's pipeline artifacts.
 *
 * Working memory is stored as a JSON string and is not parsed for us. A project
 * the agent has never written to returns null, which we surface as the empty
 * state rather than an error.
 */
export async function getProjectState(
  resourceId: string,
  projectId: string,
): Promise<ProjectState> {
  const memory = await getMemory();
  const raw = await memory.getWorkingMemory({ threadId: projectId, resourceId });
  if (!raw) return EMPTY_PROJECT_STATE;

  try {
    return projectStateSchema.parse(JSON.parse(raw));
  } catch {
    // A malformed or older-shaped blob must not take down the project view.
    return EMPTY_PROJECT_STATE;
  }
}

function toProject(thread: {
  id: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): Project {
  const metadata = thread.metadata ?? {};
  return {
    id: thread.id,
    title: thread.title ?? 'Untitled project',
    publication: String(metadata.publication ?? ''),
    format: metadata.format as ContentFormat,
    pinnedSkill:
      typeof metadata.pinnedSkill === 'string' ? metadata.pinnedSkill : null,
    createdAt: new Date(thread.createdAt).toISOString(),
    updatedAt: new Date(thread.updatedAt).toISOString(),
  };
}
