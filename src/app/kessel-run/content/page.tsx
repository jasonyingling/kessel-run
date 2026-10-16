import { WritingWorkspace } from '@/components/kessel-run/app/workspace';
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ publication?: string; status?: string }> }) {
  const { publication, status } = await searchParams;
  return <WritingWorkspace key={`content:${publication}:${status}`} view="content" publicationFilter={publication} statusFilter={status} />;
}
