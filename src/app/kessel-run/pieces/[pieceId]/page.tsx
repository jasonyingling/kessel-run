import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function PiecePage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  return <WritingWorkspace pieceId={pieceId} />;
}
