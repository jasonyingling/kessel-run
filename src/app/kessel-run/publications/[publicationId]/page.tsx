import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function PublicationPage({ params }: { params: Promise<{ publicationId: string }> }) {
  const { publicationId } = await params;
  return <WritingWorkspace publicationId={publicationId} />;
}
