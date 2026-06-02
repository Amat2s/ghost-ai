"use client"

import { useState } from "react"
import { Handle, NodeResizer, NodeToolbar, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { CanvasNode } from "@/types/canvas"
import { NODE_COLORS } from "@/types/canvas"

const STROKE_REST = "#2a2a30"
const STROKE_SELECTED = "#00c8d4"
const MIN_WIDTH = 80
const MIN_HEIGHT = 40

const RESIZER_LINE: React.CSSProperties = { stroke: STROKE_SELECTED, strokeWidth: 1 }
const RESIZER_HANDLE: React.CSSProperties = {
  fill: "#1a1a20",
  stroke: STROKE_SELECTED,
  strokeWidth: 1.5,
  width: 8,
  height: 8,
}

const HANDLE_CLASS =
  "!h-2.5 !w-2.5 !rounded-full !border !border-[#1a1a20] !bg-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"

function Handles() {
  return (
    <>
      <Handle type="source" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="left" className={HANDLE_CLASS} />
    </>
  )
}

interface ColorToolbarProps {
  activeFill: string
  onSelect: (fill: string) => void
}

function ColorToolbar({ activeFill, onSelect }: ColorToolbarProps) {
  return (
    <div
      className="nodrag nopan flex items-center gap-1.5 rounded-xl px-2 py-1.5"
      style={{ backgroundColor: "#111114", border: "1px solid #2a2a30" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {NODE_COLORS.map(({ fill, text }) => {
        const isActive = fill === activeFill
        return (
          <button
            key={fill}
            className="nodrag nopan h-5 w-5 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: fill,
              border: isActive ? `2px solid ${text}` : "2px solid #3a3a42",
              outline: isActive ? `1px solid ${text}55` : "none",
              outlineOffset: "1px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.boxShadow = `0 0 5px 1px ${text}55`
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.boxShadow = ""
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onSelect(fill)
            }}
          />
        )
      })}
    </div>
  )
}

interface NodeLabelProps {
  label: string
  textColor: string
  className?: string
  isEditing: boolean
  editValue: string
  onChange: (v: string) => void
  onStart: () => void
  onCommit: () => void
  onCancel: () => void
}

function NodeLabel({
  label,
  textColor,
  className = "px-2",
  isEditing,
  editValue,
  onChange,
  onStart,
  onCommit,
  onCancel,
}: NodeLabelProps) {
  if (isEditing) {
    return (
      <textarea
        rows={1}
        autoFocus
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Escape") onCancel()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`nodrag nopan w-full resize-none overflow-hidden bg-transparent text-center text-sm outline-none ${className}`}
        style={{ color: textColor }}
      />
    )
  }

  return (
    <span
      className={`truncate text-sm ${className}`}
      style={{ color: textColor }}
      onDoubleClick={onStart}
    >
      {label || <span className="opacity-40">Label</span>}
    </span>
  )
}

export function CanvasNodeComponent({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const pair = NODE_COLORS.find((c) => c.fill === data.color) ?? NODE_COLORS[0]
  const shape = data.shape ?? "rectangle"
  const stroke = selected ? STROKE_SELECTED : STROKE_REST

  function handleColorSelect(fill: string) {
    updateNodeData(id, { color: fill })
  }

  const toolbar = (
    <NodeToolbar isVisible={!!selected} position={Position.Top} offset={8}>
      <ColorToolbar activeFill={pair.fill} onSelect={handleColorSelect} />
    </NodeToolbar>
  )

  function startEditing() {
    setEditValue(data.label)
    setIsEditing(true)
  }

  function commitEdit() {
    updateNodeData(id, { label: editValue })
    setIsEditing(false)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  const labelProps = {
    label: data.label,
    textColor: pair.text,
    isEditing,
    editValue,
    onChange: setEditValue,
    onStart: startEditing,
    onCommit: commitEdit,
    onCancel: cancelEdit,
  }

  const resizer = (
    <NodeResizer
      isVisible={!!selected}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      lineStyle={RESIZER_LINE}
      handleStyle={RESIZER_HANDLE}
    />
  )

  function ShapeBody() {
    if (shape === "rectangle" || shape === "pill" || shape === "circle") {
      const radius = shape === "rectangle" ? "rounded-xl" : "rounded-full"
      const pad = shape === "pill" ? "px-4" : "px-2"
      return (
        <div
          className={`flex h-full w-full items-center justify-center border ${radius}`}
          style={{ backgroundColor: pair.fill, borderColor: stroke }}
        >
          <NodeLabel {...labelProps} className={pad} />
        </div>
      )
    }

    if (shape === "diamond") {
      return (
        <div className="relative h-full w-full">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={pair.fill}
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <NodeLabel {...labelProps} className="px-6" />
          </div>
        </div>
      )
    }

    if (shape === "hexagon") {
      return (
        <div className="relative h-full w-full">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              points="25,2 75,2 98,50 75,98 25,98 2,50"
              fill={pair.fill}
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <NodeLabel {...labelProps} className="px-8" />
          </div>
        </div>
      )
    }

    if (shape === "cylinder") {
      return (
        <div className="relative h-full w-full">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M 1,15 L 1,85 A 49,14 0 0 0 99,85 L 99,15"
              fill={pair.fill}
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <ellipse
              cx="50"
              cy="15"
              rx="49"
              ry="14"
              fill={pair.fill}
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <NodeLabel {...labelProps} className="px-2" />
          </div>
        </div>
      )
    }

    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-xl border"
        style={{ backgroundColor: pair.fill, borderColor: stroke }}
      >
        <NodeLabel {...labelProps} className="px-2" />
      </div>
    )
  }

  return (
    <div className="group relative h-full w-full">
      {toolbar}
      {resizer}
      <Handles />
      <ShapeBody />
    </div>
  )
}
