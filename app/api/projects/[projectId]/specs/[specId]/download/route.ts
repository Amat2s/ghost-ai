import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { get } from '@vercel/blob'
import { prisma } from '@/lib/prisma'

type RouteCtx = { params: Promise<{ projectId: string; specId: string }> }

async function resolveAccess(
  projectId: string
): Promise<{ ok: true } | { ok: false; status: 401 | 403 | 404 }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, status: 401 }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      collaborators: email
        ? { where: { email }, select: { id: true } }
        : { select: { id: true }, take: 0 },
    },
  })

  if (!project) return { ok: false, status: 404 }

  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.length > 0
  if (!isOwner && !isCollaborator) return { ok: false, status: 403 }

  return { ok: true }
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const { projectId, specId } = await ctx.params

  const access = await resolveAccess(projectId)
  if (!access.ok) {
    return NextResponse.json({ error: 'Access denied' }, { status: access.status })
  }

  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
    select: { projectId: true, filePath: true },
  })

  if (!spec) return NextResponse.json({ error: 'Spec not found' }, { status: 404 })
  if (spec.projectId !== projectId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const blobResult = await get(spec.filePath, { access: 'private' })
  if (!blobResult) {
    return NextResponse.json({ error: 'Spec file not found in storage' }, { status: 404 })
  }

  const text = await new Response(blobResult.stream).text()
  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="spec-${specId}.md"`,
    },
  })
}
