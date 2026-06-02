import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getProjectWithAccess } from '@/lib/project-access'
import { AccessDenied } from '@/components/editor/access-denied'
import { WorkspaceClient } from '@/components/editor/workspace-client'
import { getOwnedProjects, getSharedProjects } from '@/lib/projects'

export default async function WorkspacePage(props: PageProps<'/editor/[roomId]'>) {
  const { roomId } = await props.params

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [access, ownedProjects, sharedProjects] = await Promise.all([
    getProjectWithAccess(roomId),
    getOwnedProjects(),
    getSharedProjects(),
  ])

  if (!access) return <AccessDenied />

  return (
    <WorkspaceClient
      project={access.project}
      isOwner={access.isOwner}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
