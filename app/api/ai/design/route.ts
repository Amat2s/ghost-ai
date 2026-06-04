import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { tasks, auth as triggerAuth } from '@trigger.dev/sdk'
import type { designAgent } from '@/trigger/design-agent'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !('prompt' in body) ||
    !('roomId' in body) ||
    !('projectId' in body) ||
    typeof (body as Record<string, unknown>).prompt !== 'string' ||
    typeof (body as Record<string, unknown>).roomId !== 'string' ||
    typeof (body as Record<string, unknown>).projectId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields: prompt, roomId, projectId' }, { status: 400 })
  }

  const { prompt, roomId, projectId } = body as { prompt: string; roomId: string; projectId: string }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const handle = await tasks.trigger<typeof designAgent>('design-agent', { prompt, roomId })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId,
    },
  })

  const publicToken = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
    expirationTime: '1h',
  })

  return NextResponse.json({ runId: handle.id, publicToken })
}
