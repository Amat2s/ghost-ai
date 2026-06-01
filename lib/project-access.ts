import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { ProjectData } from '@/lib/projects'

export interface ProjectAccessResult {
  project: ProjectData
  isOwner: boolean
}

export async function getProjectWithAccess(
  slug: string
): Promise<ProjectAccessResult | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      collaborators: {
        where: { email: email ?? '' },
        select: { id: true },
      },
    },
  })

  if (!project) return null

  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.length > 0

  if (!isOwner && !isCollaborator) return null

  return {
    project: { id: project.id, name: project.name, slug: project.slug },
    isOwner,
  }
}
