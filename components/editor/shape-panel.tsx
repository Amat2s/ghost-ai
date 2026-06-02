"use client"

import { Square, Diamond, Circle, Pill, Database, Hexagon } from "lucide-react"
import type { NodeShape } from "@/types/canvas"

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

function DragButton({ shape, icon: Icon, label, width, height }: ShapeEntry) {
  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(
      "application/ghost-shape",
      JSON.stringify({ shape, width, height })
    )
    event.dataTransfer.effectAllowed = "copy"
  }

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      title={label}
      className="flex cursor-grab items-center justify-center rounded-xl p-2 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

export function ShapePanel() {
  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-3 py-1.5 shadow-lg">
      {SHAPES.map((s) => (
        <DragButton key={s.shape} {...s} />
      ))}
    </div>
  )
}
