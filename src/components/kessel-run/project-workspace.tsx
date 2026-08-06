"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { StageRail } from "@/components/kessel-run/stage-rail"
import { ArtifactsPanel } from "@/components/kessel-run/artifacts-panel"
import { ProjectChat } from "@/components/kessel-run/project-chat"
import { toArtifactViews } from "@/lib/kessel-run/artifacts"
import type { ProjectDetail } from "@/lib/kessel-run/api-types"

export function ProjectWorkspace({ project }: { project: ProjectDetail }) {
  const [pinnedSkill, setPinnedSkill] = useState(project.pinnedSkill)
  const [state, setState] = useState(project.state)

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/kessel-run/projects/${project.id}`)
    if (!res.ok) return
    const detail = await res.json()
    setState(detail.state)
  }, [project.id])

  const views = toArtifactViews(state)

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/kessel-run"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-base font-semibold">{project.title}</h1>
            <p className="text-xs text-muted-foreground">
              {project.publication}
            </p>
          </div>
        </div>
        <Badge variant="secondary">{project.format}</Badge>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <aside className="min-w-0 border-b p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <StageRail
            views={views}
            pinnedSkill={pinnedSkill}
            onPin={setPinnedSkill}
          />
        </aside>

        {/*
          A flex item's default `min-width: auto` refuses to shrink below its
          content's intrinsic width. The chat pane can contain very long
          unbroken lines (skill tool output), which without `min-w-0` inflates
          this column past its flex-basis share and pushes the artifacts
          column off-screen, causing page-level horizontal scroll.
        */}
        <main className="min-h-0 min-w-0 flex-1 p-4">
          <ProjectChat
            projectId={project.id}
            pinnedSkill={pinnedSkill}
            onStateChanged={refreshState}
          />
        </main>

        <aside className="min-h-0 min-w-0 border-t p-4 lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l">
          <ArtifactsPanel views={views} />
        </aside>
      </div>
    </div>
  )
}
