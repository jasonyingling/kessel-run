import { LocalAccessError } from '../local-session';
import { configuredWorkspace, SelectionError } from './config';
import { readSelectionIntent } from './bootstrap';
import { assertSelectionSession, sessionScope, withSelectionLock, type SelectionSession } from './selection';
import type { WorkspaceAvailability } from '@/lib/kessel-run/app-contracts';

export async function workspaceAvailability(session: SelectionSession): Promise<WorkspaceAvailability> {
  return withSelectionLock(async () => {
    const current = await assertSelectionSession(session);
    const scope = sessionScope(current);
    try {
      const intent = await readSelectionIntent();
      if (intent && intent.progress !== 'complete') return { status: 'pending', scope, workspaceRef: current.workspaceId, pending: intent.input };
      const workspace = await configuredWorkspace();
      if (workspace.configuration.id !== current.workspaceId) return { status: 'selection-changed', scope, workspaceRef: current.workspaceId };
      const overview = await workspace.service.overview();
      // Validate exact pins too; unreadable existing content is never first use.
      for (const output of overview.outputs) await workspace.service.getContext(String(output.id));
      return { status: 'ready', scope, workspaceRef: current.workspaceId };
    } catch (error) {
      if (error instanceof LocalAccessError) throw error;
      const existingIntent = await readSelectionIntent().catch(() => true);
      return { status: error instanceof SelectionError && error.code === 'UNINITIALIZED' && !existingIntent ? 'uninitialized' : 'recovery', scope, workspaceRef: current.workspaceId };
    }
  });
}
export function selectionResponse(error: unknown) {
  const code = error instanceof LocalAccessError ? error.status === 401 ? 'PAIR_REQUIRED' : 'LOCAL_ACCESS' : error instanceof SelectionError ? error.code : 'RECOVERY_REQUIRED';
  const messages: Record<string, string> = {
    PAIR_REQUIRED: 'Open the fresh browser link from the local launcher.', LOCAL_ACCESS: 'Local access denied.',
    UNINITIALIZED: 'Create your first publication.', RECOVERY_REQUIRED: 'Your workspace needs attention. Your files have been preserved. Restore its configuration or content before continuing.',
    SELECTION_CHANGED: 'Workspace selection changed. Reload before continuing.', CREATION_PENDING: 'Resume the unfinished creation before starting another.',
    LOCATION_UNAVAILABLE: 'This location is unavailable. Choose a new empty folder outside the app and private store.', INVALID_INPUT: 'Check the publication name and optional storage location.',
  };
  return Response.json({ code, error: messages[code], outcome: error instanceof SelectionError ? error.outcome : 'unknown' }, { status: error instanceof LocalAccessError ? error.status : code === 'LOCATION_UNAVAILABLE' || code === 'INVALID_INPUT' ? 400 : 409, headers: { 'cache-control': 'no-store' } });
}
