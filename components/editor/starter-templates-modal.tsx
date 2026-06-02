"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NODE_COLORS } from "@/types/canvas"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "./starter-templates"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold">Starter Templates</DialogTitle>
          <DialogDescription>
            Choose a template to start your canvas. This will replace your current diagram.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid grid-cols-3 gap-6">
          {CANVAS_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onImport={handleImport}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: (template: CanvasTemplate) => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-elevated">
      <div className="h-48 w-full bg-base">
        <TemplateDiagramPreview nodes={template.nodes} edges={template.edges} />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="text-sm font-medium text-copy-primary">{template.name}</p>
        <p className="text-xs text-copy-muted leading-relaxed">{template.description}</p>
        <Button
          size="sm"
          className="mt-1 w-full"
          onClick={() => onImport(template)}
        >
          Import
        </Button>
      </div>
    </div>
  )
}

function calcViewBox(nodes: CanvasNode[]): string {
  if (!nodes.length) return "0 0 400 200"
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    const w = n.width ?? 160
    const h = n.height ?? 80
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  }
  const pad = 24
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
}

function getTextColor(fill: string): string {
  const pair = NODE_COLORS.find((c) => c.fill === fill)
  return pair?.text ?? NODE_COLORS[0].text
}

interface PreviewNodeProps {
  node: CanvasNode
}

function PreviewNode({ node }: PreviewNodeProps) {
  const x = node.position.x
  const y = node.position.y
  const w = node.width ?? 160
  const h = node.height ?? 80
  const fill = node.data.color ?? NODE_COLORS[0].fill
  const text = getTextColor(fill)
  const stroke = "#2a2a30"
  const shape = node.data.shape ?? "rectangle"
  const cx = x + w / 2
  const cy = y + h / 2
  const fontSize = Math.max(8, Math.min(11, w / 12))

  const label = (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={fontSize}
      fill={text}
      fontFamily="system-ui, sans-serif"
    >
      {node.data.label}
    </text>
  )

  if (shape === "rectangle") {
    return (
      <>
        <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  if (shape === "pill") {
    return (
      <>
        <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  if (shape === "circle") {
    const r = Math.min(w, h) / 2
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  if (shape === "diamond") {
    const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`
    return (
      <>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  if (shape === "hexagon") {
    const pts = [
      `${x + w * 0.25},${y}`,
      `${x + w * 0.75},${y}`,
      `${x + w},${cy}`,
      `${x + w * 0.75},${y + h}`,
      `${x + w * 0.25},${y + h}`,
      `${x},${cy}`,
    ].join(" ")
    return (
      <>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  if (shape === "cylinder") {
    const ry = h * 0.15
    return (
      <>
        <rect x={x} y={y + ry} width={w} height={h - ry} rx={4} fill={fill} stroke={stroke} strokeWidth={1.5} />
        <ellipse cx={cx} cy={y + ry} rx={w / 2} ry={ry} fill={fill} stroke={stroke} strokeWidth={1.5} />
        {label}
      </>
    )
  }

  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {label}
    </>
  )
}

interface PreviewEdgeProps {
  edge: CanvasEdge
  nodes: CanvasNode[]
}

function PreviewEdge({ edge, nodes }: PreviewEdgeProps) {
  const src = nodes.find((n) => n.id === edge.source)
  const tgt = nodes.find((n) => n.id === edge.target)
  if (!src || !tgt) return null

  const sx = src.position.x + (src.width ?? 160) / 2
  const sy = src.position.y + (src.height ?? 80) / 2
  const tx = tgt.position.x + (tgt.width ?? 160) / 2
  const ty = tgt.position.y + (tgt.height ?? 80) / 2

  return (
    <line
      x1={sx}
      y1={sy}
      x2={tx}
      y2={ty}
      stroke="rgba(180,180,195,0.45)"
      strokeWidth={1.5}
    />
  )
}

interface TemplateDiagramPreviewProps {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

function TemplateDiagramPreview({ nodes, edges }: TemplateDiagramPreviewProps) {
  const viewBox = calcViewBox(nodes)
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {edges.map((e) => (
        <PreviewEdge key={e.id} edge={e} nodes={nodes} />
      ))}
      {nodes.map((n) => (
        <PreviewNode key={n.id} node={n} />
      ))}
    </svg>
  )
}
