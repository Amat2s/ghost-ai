import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/slug'

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
  const rawName = body !== null && typeof body === 'object' && 'name' in body ? (body as Record<string, unknown>).name : undefined
  const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Untitled Project'

  const slug = generateSlug(name)

  const project = await prisma.project.create({
    data: { ownerId: userId, name, slug },
    select: { id: true, name: true, slug: true },
  })

  return NextResponse.json(project, { status: 201 })
}
