"use client"

import { useCallback } from "react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  Panel,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"
import { NODE_COLORS } from "@/types/canvas"
import { CanvasNodeComponent } from "./canvas-node"
import { ShapePanel } from "./shape-panel"

const nodeTypes: NodeTypes = {
  canvasNode: CanvasNodeComponent,
}

let nodeCount = 0

function generateNodeId(shape: string): string {
  return `${shape}-${Date.now()}-${++nodeCount}`
}

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true })

  const { screenToFlowPosition } = useReactFlow()

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData("application/ghost-shape")
      if (!raw) return

      const { shape, width, height } = JSON.parse(raw) as {
        shape: string
        width: number
        height: number
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: CanvasNode = {
        id: generateNodeId(shape),
        type: "canvasNode",
        position: {
          x: position.x - width / 2,
          y: position.y - height / 2,
        },
        data: {
          label: "",
          color: NODE_COLORS[0].fill,
          shape,
        },
        width,
        height,
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [screenToFlowPosition, onNodesChange]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      <MiniMap />
      <Panel position="bottom-center">
        <ShapePanel />
      </Panel>
    </ReactFlow>
  )
}
