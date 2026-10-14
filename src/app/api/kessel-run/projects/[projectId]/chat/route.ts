import { handleChatStream } from '@mastra/ai-sdk'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import { NextResponse } from 'next/server'
import { RequestContext } from '@mastra/core/request-context'
import { legacyDenied } from '@/server/kessel-run/legacy'
import { isKesselRunSkillName } from '@/mastra/skills/catalog'
import { getResourceId } from '@/lib/kessel-run/session'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await legacyDenied(req, true)
  if (denied) return denied
  const [{ mastra }, { getProject }] = await Promise.all([import('@/mastra'), import('@/mastra/projects/store')])
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const body = await req.json()

  // The pinned skill comes from the client, so it must be validated against the
  // catalog before it reaches the agent's skills resolver. An unknown value is
  // ignored rather than rejected: the agent still works with all skills loaded.
  const requested = body?.pinnedSkill
  const pinnedSkill =
    typeof requested === 'string' && isKesselRunSkillName(requested)
      ? requested
      : null

  const requestContext = new RequestContext(
    pinnedSkill ? [['pinnedSkill', pinnedSkill]] : [],
  )

  const stream = await handleChatStream({
    mastra,
    agentId: 'kessel-run-agent',
    params: {
      ...body,
      requestContext,
      memory: {
        ...body.memory,
        // Server-controlled: one project is one thread. Never take these from
        // the request body.
        thread: projectId,
        resource: resourceId,
      },
    },
  })

  // @mastra/ai-sdk emits AI SDK v5 chunk types, which don't line up with the
  // v7 `ai` package's stricter unions (e.g. finishReason: 'unknown'). Wire
  // compatible at runtime, so cast across the version gap.
  return createUIMessageStreamResponse({
    stream: stream as unknown as ReadableStream<UIMessageChunk>,
  })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await legacyDenied(req)
  if (denied) return denied
  const [{ mastra }, { getProject }] = await Promise.all([import('@/mastra'), import('@/mastra/projects/store')])
  const { projectId } = await params
  const resourceId = await getResourceId()

  const project = await getProject(resourceId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }

  const memory = await mastra.getAgentById('kessel-run-agent').getMemory()
  let response = null

  try {
    response = await memory?.recall({ threadId: projectId, resourceId })
  } catch {
    console.log('No previous messages found.')
  }

  return NextResponse.json(toAISdkV5Messages(response?.messages || []))
}
