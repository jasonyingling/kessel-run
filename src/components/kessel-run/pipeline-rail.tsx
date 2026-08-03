import { ChevronRight } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SkillCard } from "@/components/kessel-run/skill-card"
import type { SkillSummary } from "@/lib/kessel-run/api-types"

export function PipelineRail({
  pipeline,
  standalone,
}: {
  pipeline: SkillSummary[]
  standalone: SkillSummary[]
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Stages, in order
        </h3>
        <div className="overflow-x-auto">
          <div className="flex w-max items-stretch gap-2 pb-2">
            {pipeline.map((skill, index) => (
              <div key={skill.name} className="flex items-stretch gap-2">
                <SkillCard skill={skill} className="w-64" />
                {index < pipeline.length - 1 ? (
                  <div className="flex items-center text-muted-foreground">
                    <ChevronRight className="size-5" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Standalone tools
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {standalone.map((skill) => (
            <SkillCard key={skill.name} skill={skill} />
          ))}
        </div>
      </div>
    </div>
  )
}
