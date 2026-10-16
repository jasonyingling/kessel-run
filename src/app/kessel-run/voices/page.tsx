import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function VoicesPage({ searchParams }: { searchParams: Promise<{ publication?: string; returnPiece?: string }> }) {
  const { publication, returnPiece } = await searchParams;
  return <WritingWorkspace key={`voices:${publication}`} view="voices" publicationId={publication} returnPieceId={returnPiece} />;
}
