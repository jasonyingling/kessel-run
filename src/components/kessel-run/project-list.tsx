import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProjectSummary } from "@/lib/kessel-run/api-types"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        A project is one piece of content moving through the pipeline. Start
        one with the button above.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} href={`/kessel-run/projects/${project.id}`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="gap-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{project.title}</CardTitle>
                <Badge variant="secondary">{project.format}</Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {project.publication}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Updated {dateFormatter.format(new Date(project.updatedAt))}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
