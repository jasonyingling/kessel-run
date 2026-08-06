import { notFound } from "next/navigation"
import { getProject, getProjectState } from "@/mastra/projects/store"
import { getResourceId } from "@/lib/kessel-run/session"
import { ProjectWorkspace } from "@/components/kessel-run/project-workspace"

export const dynamic = "force-dynamic"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) notFound()

  const state = await getProjectState(resourceId, projectId)

  return <ProjectWorkspace project={{ ...project, state }} />
}
