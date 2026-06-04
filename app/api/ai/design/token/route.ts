import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth as triggerAuth } from '@trigger.dev/sdk'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !('runId' in body) ||
    typeof (body as Record<string, unknown>).runId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required field: runId' }, { status: 400 })
  }

  const { runId } = body as { runId: string }

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: { userId: true },
  })
  if (!taskRun) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if (taskRun.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: '1h',
  })

  return NextResponse.json({ token })
}
