import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SkillSummary } from "@/lib/kessel-run/api-types"

export function SkillCard({
  skill,
  className,
}: {
  skill: SkillSummary
  className?: string
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{skill.label}</CardTitle>
          {skill.stage !== null ? (
            <Badge variant="secondary">Stage {skill.stage}</Badge>
          ) : (
            <Badge variant="outline">Standalone</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {skill.timeTarget}
          {skill.optional ? " · optional" : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{skill.summary}</p>
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground text-xs underline underline-offset-2">
            When does this trigger?
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-xs">{skill.description}</p>
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  )
}
