import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ArtifactView } from "@/lib/kessel-run/artifacts"

export function ArtifactsPanel({ views }: { views: ArtifactView[] }) {
  const completed = views.filter((v) => v.complete)

  if (completed.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Artifacts appear here as pipeline stages finish.
        </p>
      </div>
    )
  }

  return (
    <Tabs defaultValue={completed[0].field} className="h-full">
      <TabsList>
        {completed.map((view) => (
          <TabsTrigger key={view.field} value={view.field}>
            {view.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {completed.map((view) => (
        <TabsContent key={view.field} value={view.field} className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="overflow-x-auto p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {view.content}
              </pre>
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}
