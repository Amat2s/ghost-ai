"use client"

import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { CanvasNode } from "@/types/canvas"
import { NODE_COLORS } from "@/types/canvas"

export function CanvasNodeComponent({ data }: NodeProps<CanvasNode>) {
  const pair = NODE_COLORS.find((c) => c.fill === data.color) ?? NODE_COLORS[0]

  return (
    <>
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
      <div
        className="flex h-full w-full items-center justify-center rounded-xl border border-surface-border text-sm"
        style={{ backgroundColor: pair.fill, color: pair.text }}
      >
        <span className="truncate px-2">{data.label}</span>
      </div>
    </>
  )
}
