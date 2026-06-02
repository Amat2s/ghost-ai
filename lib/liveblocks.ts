import { Liveblocks } from '@liveblocks/node'

const CURSOR_COLORS = [
  '#E57373',
  '#F06292',
  '#CE93D8',
  '#64B5F6',
  '#4DB6AC',
  '#81C784',
  '#FFD54F',
  '#FF8A65',
]

export function getUserCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash * 31) + userId.charCodeAt(i)) >>> 0
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

declare global {
  // eslint-disable-next-line no-var
  var __liveblocks: Liveblocks | undefined
}

export function getLiveblocks(): Liveblocks {
  if (!globalThis.__liveblocks) {
    globalThis.__liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    })
  }
  return globalThis.__liveblocks
}
