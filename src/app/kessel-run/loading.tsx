import { Skeleton } from "@/components/ui/skeleton"

export default function KesselRunLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-40 w-64" />
          <Skeleton className="h-40 w-64" />
          <Skeleton className="h-40 w-64" />
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    </div>
  )
}
