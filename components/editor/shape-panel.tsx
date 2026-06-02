"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Square, Diamond, Circle, Pill, Database, Hexagon } from "lucide-react"
import type { NodeShape } from "@/types/canvas"
import { NODE_COLORS } from "@/types/canvas"

interface ShapeEntry {
  shape: NodeShape
  icon: React.ComponentType<{ className?: string }>
  label: string
  width: number
  height: number
}

const SHAPES: ShapeEntry[] = [
  { shape: "rectangle", icon: Square, label: "Rectangle", width: 160, height: 80 },
  { shape: "diamond", icon: Diamond, label: "Diamond", width: 160, height: 120 },
  { shape: "circle", icon: Circle, label: "Circle", width: 100, height: 100 },
  { shape: "pill", icon: Pill, label: "Pill", width: 140, height: 60 },
  { shape: "cylinder", icon: Database, label: "Cylinder", width: 120, height: 100 },
  { shape: "hexagon", icon: Hexagon, label: "Hexagon", width: 120, height: 120 },
]

interface DragPreview {
  shape: NodeShape
  width: number
  height: number
  x: number
  y: number
}

const GHOST_FILL = NODE_COLORS[0].fill
const GHOST_STROKE = "#00c8d4"

function ShapeGhost({ shape }: { shape: NodeShape }) {
  if (shape === "rectangle") {
    return (
      <div
        className="h-full w-full rounded-xl border"
        style={{ backgroundColor: GHOST_FILL, borderColor: GHOST_STROKE }}
      />
    )
  }
  if (shape === "pill") {
    return (
      <div
        className="h-full w-full rounded-full border"
        style={{ backgroundColor: GHOST_FILL, borderColor: GHOST_STROKE }}
      />
    )
  }
  if (shape === "circle") {
    return (
      <div
        className="h-full w-full rounded-full border"
        style={{ backgroundColor: GHOST_FILL, borderColor: GHOST_STROKE }}
      />
    )
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      {shape === "diamond" && (
        <polygon
          points="50,2 98,50 50,98 2,50"
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {shape === "hexagon" && (
        <polygon
          points="25,2 75,2 98,50 75,98 25,98 2,50"
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {shape === "cylinder" && (
        <>
          <path
            d="M 1,15 L 1,85 A 49,14 0 0 0 99,85 L 99,15"
            fill={GHOST_FILL}
            stroke={GHOST_STROKE}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <ellipse
            cx="50"
            cy="15"
            rx="49"
            ry="14"
            fill={GHOST_FILL}
            stroke={GHOST_STROKE}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  )
}

interface DragButtonProps extends ShapeEntry {
  onDragStateChange: (state: DragPreview | null) => void
}

function DragButton({ shape, icon: Icon, label, width, height, onDragStateChange }: DragButtonProps) {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData("application/ghost-shape", JSON.stringify({ shape, width, height }))
    e.dataTransfer.effectAllowed = "copy"

    const ghost = document.createElement("div")
    ghost.style.cssText = "position:absolute;top:-9999px;opacity:0;width:1px;height:1px;"
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))

    onDragStateChange({ shape, width, height, x: e.clientX, y: e.clientY })
  }

  const handleDrag = (e: React.DragEvent<HTMLButtonElement>) => {
    if (e.clientX === 0 && e.clientY === 0) return
    onDragStateChange({ shape, width, height, x: e.clientX, y: e.clientY })
  }

  const handleDragEnd = () => onDragStateChange(null)

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      title={label}
      className="flex cursor-grab items-center justify-center rounded-xl p-2 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

export function ShapePanel() {
  const [preview, setPreview] = useState<DragPreview | null>(null)

  return (
    <>
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-3 py-1.5 shadow-lg">
        {SHAPES.map((s) => (
          <DragButton key={s.shape} {...s} onDragStateChange={setPreview} />
        ))}
      </div>
      {preview &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] opacity-60"
            style={{
              left: preview.x - preview.width / 2,
              top: preview.y - preview.height / 2,
              width: preview.width,
              height: preview.height,
            }}
          >
            <ShapeGhost shape={preview.shape} />
          </div>,
          document.body
        )}
    </>
  )
}
