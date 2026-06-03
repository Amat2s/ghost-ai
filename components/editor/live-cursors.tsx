"use client"

import { useOthers } from "@liveblocks/react"
import { useViewport } from "@xyflow/react"

interface CursorMarkerProps {
  screenX: number
  screenY: number
  name: string
  color: string
}

function CursorMarker({ screenX, screenY, name, color }: CursorMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
    >
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 0L0 14L4 10L7 18L9 17L6 9L11 9Z"
          fill={color}
          stroke="white"
          strokeWidth="0.75"
        />
      </svg>
      <div
        className="absolute left-4 top-3.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-none text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}

export function LiveCursors() {
  const others = useOthers()
  const { x: vpX, y: vpY, zoom } = useViewport()

  return (
    <div
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 10000 }}
    >
      {others.map((other) => {
        if (!other.presence.cursor) return null
        const { x, y } = other.presence.cursor
        return (
          <CursorMarker
            key={other.connectionId}
            screenX={x * zoom + vpX}
            screenY={y * zoom + vpY}
            name={other.info?.name ?? "Unknown"}
            color={other.info?.color ?? "#888888"}
          />
        )
      })}
    </div>
  )
}
