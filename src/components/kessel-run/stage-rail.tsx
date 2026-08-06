"use client"

import { Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { STANDALONE_SKILLS, PIPELINE_SKILLS } from "@/mastra/skills/catalog"
import { cn } from "@/lib/utils"
import type { ArtifactView } from "@/lib/kessel-run/artifacts"

export function StageRail({
  views,
  pinnedSkill,
  onPin,
}: {
  views: ArtifactView[]
  pinnedSkill: string | null
  onPin: (skill: string) => void
}) {
  // Same fraction `pipelineProgress` computes, derived from the views already
  // passed in rather than re-deriving from ProjectState (which this component
  // does not receive per the plan's prop contract).
  const progress =
    views.length === 0
      ? 0
      : views.filter((v) => v.complete).length / views.length

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        <Progress value={progress * 100} />

        <div className="space-y-1">
          {views.map((view) => {
            const skill = PIPELINE_SKILLS.find((s) => s.stage === view.stage)
            if (!skill) return null
            const pinned = pinnedSkill === skill.name

            return (
              <button
                key={skill.name}
                type="button"
                aria-current={pinned ? "step" : undefined}
                onClick={() => onPin(skill.name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  pinned && "border-primary bg-accent",
                )}
              >
                {view.complete ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    {view.stage}
                  </span>
                )}
                <span className="truncate">{view.label}</span>
              </button>
            )
          })}
        </div>

        <Separator />

        <div className="space-y-1">
          {STANDALONE_SKILLS.map((skill) => {
            const pinned = pinnedSkill === skill.name

            return (
              <button
                key={skill.name}
                type="button"
                aria-current={pinned ? "step" : undefined}
                onClick={() => onPin(skill.name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  pinned && "border-primary bg-accent",
                )}
              >
                <span className="truncate">{skill.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
