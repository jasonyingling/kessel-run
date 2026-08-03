import { listProjects } from "@/mastra/projects/store"
import { getResourceId } from "@/lib/kessel-run/session"
import { getSkillsView } from "@/lib/kessel-run/skills-view"
import { PipelineRail } from "@/components/kessel-run/pipeline-rail"
import { ProjectList } from "@/components/kessel-run/project-list"
import { NewProjectDialog } from "@/components/kessel-run/new-project-dialog"

export const dynamic = "force-dynamic"

export default async function KesselRunPage() {
  const resourceId = await getResourceId()
  const [{ pipeline, standalone }, projects] = await Promise.all([
    getSkillsView(),
    listProjects(resourceId),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Kessel Run</h1>
          <p className="text-sm text-muted-foreground">
            A staged content pipeline, from raw idea to published piece.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">The pipeline</h2>
        <PipelineRail pipeline={pipeline} standalone={standalone} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Your projects</h2>
        <ProjectList projects={projects} />
      </section>
    </div>
  )
}
