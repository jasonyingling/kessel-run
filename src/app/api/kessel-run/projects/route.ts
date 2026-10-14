import { NextResponse } from 'next/server'
import { legacyDenied } from '@/server/kessel-run/legacy'
import { CONTENT_FORMATS, type ContentFormat } from '@/mastra/projects/schema'
import { getResourceId } from '@/lib/kessel-run/session'
import type { CreateProjectBody } from '@/lib/kessel-run/api-types'

export async function GET(req: Request) {
  const denied = await legacyDenied(req)
  if (denied) return denied
  const { listProjects } = await import('@/mastra/projects/store')
  const resourceId = await getResourceId()
  const projects = await listProjects(resourceId)
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const denied = await legacyDenied(req, true)
  if (denied) return denied
  const { createProject } = await import('@/mastra/projects/store')
  const body = (await req.json()) as Partial<CreateProjectBody>

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const publication =
    typeof body.publication === 'string' ? body.publication.trim() : ''
  const format = body.format as ContentFormat

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!publication) {
    return NextResponse.json(
      { error: 'publication is required' },
      { status: 400 },
    )
  }
  if (!CONTENT_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `format must be one of: ${CONTENT_FORMATS.join(', ')}` },
      { status: 400 },
    )
  }

  const resourceId = await getResourceId()
  const project = await createProject({ resourceId, title, publication, format })

  return NextResponse.json(project, { status: 201 })
}
