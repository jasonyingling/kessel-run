import type { Entity, WorkspaceOverview } from './app-contracts';
export const progressStages = ['ideas', 'drafting', 'review', 'accepted'] as const;
export type ProgressStage = typeof progressStages[number];
export type WorkItem = { id: string; kind: 'idea' | 'output'; stage: ProgressStage; title: string; publication: Entity; piece: Entity; output?: Entity; href: string };
export function selectProgress(overview: WorkspaceOverview, publicationId = 'all', status = 'all'): WorkItem[] {
  const publications = new Map(overview.publications.map(value => [value.id, value]));
  const pieces = overview.pieces.filter(value => publications.has(value.publicationId) && (publicationId === 'all' || value.publicationId === publicationId));
  const items: WorkItem[] = [];
  for (const piece of pieces) {
    const publication = publications.get(piece.publicationId)!;
    const outputs = overview.outputs.filter(value => value.pieceId === piece.id && value.publicationId === publication.id);
    if (!outputs.length) items.push({ id: String(piece.id), kind: 'idea', stage: 'ideas', title: String(piece.title), publication, piece, href: `/kessel-run/pieces/${piece.id}` });
    for (const output of outputs) {
      // Unknown persisted states must not silently become Ready.
      if (output.status !== 'drafting' && output.status !== 'review' && output.status !== 'accepted') continue;
      items.push({ id: String(output.id), kind: 'output', stage: output.status, title: String(output.title), publication, piece, output, href: `/kessel-run/outputs/${output.id}` });
    }
  }
  return items.filter(item => status === 'all' || item.stage === status);
}
export function routeUnavailable(overview: WorkspaceOverview, ids: { publicationId?: string; pieceId?: string; outputId?: string }): boolean {
  if (ids.publicationId && !overview.publications.some(value => value.id === ids.publicationId)) return true;
  const output = ids.outputId ? overview.outputs.find(value => value.id === ids.outputId) : undefined;
  if (ids.outputId && !output) return true;
  const pieceId = ids.pieceId ?? output?.pieceId;
  const piece = pieceId ? overview.pieces.find(value => value.id === pieceId) : undefined;
  if (pieceId && !piece) return true;
  return Boolean(piece && !overview.publications.some(value => value.id === piece.publicationId));
}
