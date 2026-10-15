import { notFound } from "next/navigation"
import { getResourceId } from "@/lib/kessel-run/session"
import { ProjectWorkspace } from "@/components/kessel-run/project-workspace"

export const dynamic = "force-dynamic"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  if (process.env.KESSEL_RUN_ENABLE_LEGACY !== '1') return <main className="mx-auto max-w-xl p-8"><h1>Legacy project preserved</h1><p>Legacy demo access is disabled. Explicitly enable KESSEL_RUN_ENABLE_LEGACY=1 and pair the browser to open existing projects. The new workspace does not migrate or rewrite them.</p></main>
  const { projectId } = await params
  const resourceId = await getResourceId()
  const { getProject, getProjectState } = await import('@/mastra/projects/store')

  const project = await getProject(resourceId, projectId)
  if (!project) notFound()

  const state = await getProjectState(resourceId, projectId)

  return <ProjectWorkspace project={{ ...project, state }} />
}
