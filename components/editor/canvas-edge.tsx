"use client"

import { useState, useRef, useEffect } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"
import type { CanvasEdge } from "@/types/canvas"

const EDGE_COLOR_REST = "rgba(180,180,195,0.35)"
const EDGE_COLOR_ACTIVE = "rgba(180,180,195,0.85)"

export function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData } = useReactFlow()
  const [hovered, setHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const isActive = hovered || !!selected
  const label = data?.label ?? ""

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function startEditing() {
    setEditValue(label)
    setIsEditing(true)
  }

  function commitEdit() {
    updateEdgeData(id, { label: editValue })
    setIsEditing(false)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  const edgeColor = isActive ? EDGE_COLOR_ACTIVE : EDGE_COLOR_REST

  return (
    <>
      {/* Wide transparent hit area for easier hover/click without changing visible thickness */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={startEditing}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          transition: "stroke 0.15s ease",
          pointerEvents: "none",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Enter") commitEdit()
                if (e.key === "Escape") cancelEdit()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="min-w-[40px] rounded border border-[#2a2a30] bg-[#111114] px-2 py-0.5 text-center text-xs text-[#ededed] outline-none"
              style={{ width: `${Math.max(40, editValue.length * 8 + 16)}px` }}
            />
          ) : label ? (
            <span
              className="cursor-pointer select-none rounded-full border border-[#2a2a30] bg-[#111114] px-2 py-0.5 text-xs text-[#a0a0b0] transition-colors hover:text-[#ededed]"
              onDoubleClick={startEditing}
            >
              {label}
            </span>
          ) : isActive ? (
            <span
              className="cursor-pointer select-none rounded-full border border-[#2a2a30] bg-[#111114] px-2 py-0.5 text-xs text-[#a0a0b0] opacity-40"
              onDoubleClick={startEditing}
            >
              label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
