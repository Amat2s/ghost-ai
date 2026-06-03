import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { put, get } from '@vercel/blob'
import { prisma } from '@/lib/prisma'

type AccessResult =
  | { ok: true; project: { id: string; ownerId: string; canvasBlobUrl: string | null }; isOwner: boolean }
  | { ok: false; status: 401 | 403 | 404 }

async function resolveAccess(projectId: string): Promise<AccessResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, status: 401 }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      canvasBlobUrl: true,
      collaborators: email
        ? { where: { email }, select: { id: true } }
        : { select: { id: true }, take: 0 },
    },
  })

  if (!project) return { ok: false, status: 404 }

  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.length > 0
  if (!isOwner && !isCollaborator) return { ok: false, status: 403 }

  return { ok: true, project, isOwner }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/canvas'>
) {
  const { projectId } = await ctx.params
  const access = await resolveAccess(projectId)
  if (!access.ok) return NextResponse.json({ error: 'Access denied' }, { status: access.status })

  const body: unknown = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const blob = await put(`canvas/${projectId}.json`, JSON.stringify(body), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasBlobUrl: blob.url },
  })

  return NextResponse.json({ url: blob.url })
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/canvas'>
) {
  const { projectId } = await ctx.params
  const access = await resolveAccess(projectId)
  if (!access.ok) return NextResponse.json({ error: 'Access denied' }, { status: access.status })

  const { canvasBlobUrl } = access.project
  if (!canvasBlobUrl) return new NextResponse(null, { status: 204 })

  const blobResult = await get(canvasBlobUrl, { access: 'private' })
  if (!blobResult) return NextResponse.json({ error: 'Canvas not found in storage' }, { status: 404 })
  const canvas = await new Response(blobResult.stream).json()
  return NextResponse.json(canvas)
}
