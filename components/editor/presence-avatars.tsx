"use client"

import { useOthers } from "@liveblocks/react"
import { useAuth, UserButton } from "@clerk/nextjs"

interface CollaboratorAvatarProps {
  name: string
  avatar?: string
  color: string
}

function CollaboratorAvatar({ name, avatar, color }: CollaboratorAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-base"
      style={{ backgroundColor: color }}
      title={name}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
          {initials}
        </span>
      )}
    </div>
  )
}

export function PresenceAvatars() {
  const { userId } = useAuth()
  const others = useOthers()

  const collaborators = others.filter((other) => other.id !== userId)
  const visible = collaborators.slice(0, 5)
  const overflow = collaborators.length - 5

  return (
    <div className="flex items-center gap-2">
      {collaborators.length > 0 && (
        <>
          <div className="flex items-center">
            {visible.map((other, i) => (
              <div key={other.connectionId} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}>
                <CollaboratorAvatar
                  name={other.info?.name ?? "Unknown"}
                  avatar={other.info?.avatar}
                  color={other.info?.color ?? "#888888"}
                />
              </div>
            ))}
            {overflow > 0 && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-[10px] font-semibold text-copy-primary ring-2 ring-base"
                style={{ marginLeft: -8 }}
              >
                +{overflow}
              </div>
            )}
          </div>
          <div className="h-5 w-px bg-surface-border" />
        </>
      )}
      <UserButton />
    </div>
  )
}
