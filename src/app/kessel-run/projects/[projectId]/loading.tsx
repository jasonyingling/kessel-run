import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLoading() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="border-b p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </aside>

        <main className="min-h-0 flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </main>

        <aside className="min-h-0 border-t p-4 lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l">
          <Skeleton className="h-full w-full" />
        </aside>
      </div>
    </div>
  )
}
