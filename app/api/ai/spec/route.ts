import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { tasks } from '@trigger.dev/sdk'
import type { generateSpec } from '@/trigger/generate-spec'
import { prisma } from '@/lib/prisma'
import { getProjectWithAccess } from '@/lib/project-access'
import { z } from 'zod'

const RequestSchema = z.object({
  roomId: z.string(),
  chatHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data

  const access = await getProjectWithAccess(roomId)
  if (!access) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof generateSpec>('generate-spec', {
    projectId: access.project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: access.project.id,
      userId,
    },
  })

  return NextResponse.json({ runId: handle.id })
}
