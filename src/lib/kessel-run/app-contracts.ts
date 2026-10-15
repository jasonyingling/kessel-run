import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
export type WorkspaceOverview = Awaited<ReturnType<WorkspaceService['overview']>>;
export type OutputContext = Awaited<ReturnType<WorkspaceService['getContext']>>;
export type Entity = WorkspaceOverview['publications'][number];
