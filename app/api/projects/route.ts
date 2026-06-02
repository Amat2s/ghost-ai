import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateProjectId } from '@/lib/slug'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => ({}))
  const rawBody = body !== null && typeof body === 'object' ? body as Record<string, unknown> : {}
  const rawName = rawBody.name
  const rawId = rawBody.id
  const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Untitled Project'

  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
  const id =
    typeof rawId === 'string' && rawId.length >= 3 && rawId.length <= 100 && slugPattern.test(rawId)
      ? rawId
      : generateProjectId(name)

  const project = await prisma.project.create({
    data: { id, ownerId: userId, name },
    select: { id: true, name: true },
  })

  return NextResponse.json(project, { status: 201 })
}
