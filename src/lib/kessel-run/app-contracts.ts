import type { WorkspaceService } from '@/server/kessel-run/workspace/service';
export type WorkspaceOverview = Awaited<ReturnType<WorkspaceService['overview']>>;
export type OutputContext = Awaited<ReturnType<WorkspaceService['getContext']>>;
export type Entity = WorkspaceOverview['publications'][number];
export type PendingSelection = { kind: 'publication' | 'workspace'; operationId: string; title: string; purpose: string; root: string };
export type WorkspaceAvailability = {
  status: 'uninitialized' | 'ready' | 'pending' | 'recovery' | 'selection-changed';
  scope: string; workspaceRef: string; pending?: PendingSelection;
};
