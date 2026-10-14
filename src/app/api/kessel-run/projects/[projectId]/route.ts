import { NextResponse } from 'next/server'
import { legacyDenied } from '@/server/kessel-run/legacy'
import { getResourceId } from '@/lib/kessel-run/session'
import type { ProjectDetail } from '@/lib/kessel-run/api-types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await legacyDenied(req)
  if (denied) return denied
  const { getProject, getProjectState } = await import('@/mastra/projects/store')
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const state = await getProjectState(resourceId, projectId)
  const body: ProjectDetail = { ...project, state }

  return NextResponse.json(body)
}
