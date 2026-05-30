import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]'>
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await ctx.params
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => ({}))
  const rawName = body !== null && typeof body === 'object' && 'name' in body ? (body as Record<string, unknown>).name : undefined
  const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : project.name

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]'>
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await ctx.params
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return new NextResponse(null, { status: 204 })
}
