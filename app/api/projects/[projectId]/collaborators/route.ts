import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/collaborators'>
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await ctx.params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { orderBy: { createdAt: 'asc' } } },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.some((c) => c.email === email)
  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const emails = project.collaborators.map((c) => c.email)
  const client = await clerkClient()

  const [ownerClerkUser, collaboratorClerkUsers] = await Promise.all([
    client.users.getUser(project.ownerId),
    emails.length > 0
      ? client.users.getUserList({ emailAddress: emails })
      : Promise.resolve({ data: [] }),
  ])

  const ownerData = {
    email: ownerClerkUser.primaryEmailAddress?.emailAddress ?? null,
    name: [ownerClerkUser.firstName, ownerClerkUser.lastName].filter(Boolean).join(' ') || null,
    imageUrl: ownerClerkUser.imageUrl || null,
  }

  const userMap = new Map(
    collaboratorClerkUsers.data.map((u) => [
      u.primaryEmailAddress?.emailAddress ?? '',
      {
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
        imageUrl: u.imageUrl || null,
      },
    ])
  )

  const collaborators = project.collaborators.map((c) => ({
    email: c.email,
    ...(userMap.get(c.email) ?? { name: null, imageUrl: null }),
  }))

  return NextResponse.json({ owner: ownerData, collaborators, isOwner })
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/collaborators'>
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await ctx.params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => ({}))
  const rawEmail =
    body !== null && typeof body === 'object' && 'email' in body
      ? (body as Record<string, unknown>).email
      : undefined
  if (typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const email = rawEmail.trim().toLowerCase()

  const user = await currentUser()
  const ownerEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase()
  if (email === ownerEmail) {
    return NextResponse.json({ error: 'Cannot add owner as collaborator' }, { status: 400 })
  }

  const collaborator = await prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    update: {},
    create: { projectId, email },
    select: { id: true, email: true, createdAt: true },
  })

  return NextResponse.json(collaborator, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/collaborators'>
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await ctx.params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => ({}))
  const rawEmail =
    body !== null && typeof body === 'object' && 'email' in body
      ? (body as Record<string, unknown>).email
      : undefined
  if (typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const email = rawEmail.trim().toLowerCase()

  await prisma.projectCollaborator.deleteMany({ where: { projectId, email } })

  return new NextResponse(null, { status: 204 })
}
