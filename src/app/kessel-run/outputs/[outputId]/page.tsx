import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function OutputPage({ params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  return <WritingWorkspace outputId={outputId} />;
}
