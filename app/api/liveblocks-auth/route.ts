import { auth, currentUser } from '@clerk/nextjs/server'
import { getLiveblocks, getUserCursorColor } from '@/lib/liveblocks'
import { getProjectWithAccess } from '@/lib/project-access'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { room } = (await request.json()) as { room?: string }
  if (!room) {
    return new Response('Missing room', { status: 400 })
  }

  const access = await getProjectWithAccess(room)
  if (!access) {
    return Response.json(
      { error: 'forbidden', reason: 'No access to this project' },
      { status: 403 }
    )
  }

  const user = await currentUser()
  const name =
    user?.fullName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress ?? 'Anonymous'
  const avatar = user?.imageUrl ?? ''
  const color = getUserCursorColor(userId)

  const lb = getLiveblocks()

  await lb.getOrCreateRoom(room, { defaultAccesses: [] })

  const session = lb.prepareSession(userId, {
    userInfo: { name, avatar, color },
  })
  session.allow(room, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
