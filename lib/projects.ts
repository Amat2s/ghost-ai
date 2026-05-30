import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export interface ProjectData {
  id: string
  name: string
}

export async function getOwnedProjects(): Promise<ProjectData[]> {
  const { userId } = await auth()
  if (!userId) return []
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })
}

export async function getSharedProjects(): Promise<ProjectData[]> {
  const user = await currentUser()
  if (!user) return []
  const email = user.emailAddresses[0]?.emailAddress
  if (!email) return []
  return prisma.project.findMany({
    where: { collaborators: { some: { email } } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })
}
