import { NextResponse } from 'next/server'
import { getProject, getProjectState } from '@/mastra/projects/store'
import { getResourceId } from '@/lib/kessel-run/session'
import type { ProjectDetail } from '@/lib/kessel-run/api-types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
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
