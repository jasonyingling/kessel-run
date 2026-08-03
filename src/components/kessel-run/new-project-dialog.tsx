"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CONTENT_FORMATS, type ContentFormat } from "@/mastra/projects/schema"
import type { ApiError, ProjectSummary } from "@/lib/kessel-run/api-types"

const FORMAT_LABELS: Record<ContentFormat, string> = {
  article: "Article",
  newsletter: "Newsletter",
  "linkedin-post": "LinkedIn post",
  thread: "Thread",
  "video-script": "Video script",
  "short-social": "Short social",
}

export function NewProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [publication, setPublication] = useState("")
  const [format, setFormat] = useState<ContentFormat>(CONTENT_FORMATS[0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/kessel-run/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, publication, format }),
      })

      if (!res.ok) {
        const body = (await res.json()) as ApiError
        toast.error(body.error ?? "Failed to create project")
        return
      }

      const project = (await res.json()) as ProjectSummary
      setOpen(false)
      router.push(`/kessel-run/projects/${project.id}`)
    } catch {
      toast.error("Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New project</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            A project is one piece of content moving through the pipeline.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-publication">Publication</Label>
            <Input
              id="project-publication"
              value={publication}
              onChange={(e) => setPublication(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ContentFormat)}
            >
              <SelectTrigger id="project-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
