import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function KesselRunPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const { create } = await searchParams;
  return <WritingWorkspace key={create ?? 'overview'} createPublication={create === 'publication'} />;
}
