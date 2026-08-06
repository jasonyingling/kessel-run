import Link from "next/link"

export default function ProjectNotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-xl font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">
        This project doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/kessel-run" className="text-sm underline underline-offset-2">
        Back to Kessel Run
      </Link>
    </div>
  )
}
