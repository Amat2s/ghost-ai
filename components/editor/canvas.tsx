"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Panel,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from "lucide-react";
import type { CanvasNode, CanvasEdge } from "@/types/canvas";
import { NODE_COLORS } from "@/types/canvas";
import { CanvasNodeComponent } from "./canvas-node";
import { CanvasEdgeComponent } from "./canvas-edge";
import { ShapePanel } from "./shape-panel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { CanvasTemplate } from "./starter-templates";

const nodeTypes: NodeTypes = {
  canvasNode: CanvasNodeComponent,
};

const edgeTypes: EdgeTypes = {
  canvasEdge: CanvasEdgeComponent,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "rgba(180,180,195,0.35)",
    width: 16,
    height: 16,
  },
};

let nodeCount = 0;

function generateNodeId(shape: string): string {
  return `${shape}-${Date.now()}-${++nodeCount}`;
}

const ZOOM_DURATION = 300;

interface ControlBarProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function ControlBar({ undo, redo, canUndo, canRedo }: ControlBarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
      <button
        onClick={() => zoomOut({ duration: ZOOM_DURATION })}
        title="Zoom out"
        className="flex items-center justify-center rounded-xl p-1.5 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={() => fitView({ duration: ZOOM_DURATION })}
        title="Fit view"
        className="flex items-center justify-center rounded-xl p-1.5 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomIn({ duration: ZOOM_DURATION })}
        title="Zoom in"
        className="flex items-center justify-center rounded-xl p-1.5 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      <div className="mx-1 h-4 w-px bg-surface-border" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo"
        className="flex items-center justify-center rounded-xl p-1.5 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-30"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo"
        className="flex items-center justify-center rounded-xl p-1.5 text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-30"
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface CanvasProps {
  pendingTemplate?: CanvasTemplate | null;
  onTemplateDone?: () => void;
}

export function Canvas({ pendingTemplate, onTemplateDone }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true });

  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useKeyboardShortcuts(flow, undo, redo);

  const stateRef = useRef({ nodes, edges, onNodesChange, onEdgesChange });
  useEffect(() => {
    stateRef.current = { nodes, edges, onNodesChange, onEdgesChange };
  });

  useEffect(() => {
    if (!pendingTemplate) return;
    const {
      nodes: curr,
      edges: currE,
      onNodesChange: onNC,
      onEdgesChange: onEC,
    } = stateRef.current;

    onNC(curr.map((n) => ({ type: "remove" as const, id: n.id })));
    onEC(currE.map((e) => ({ type: "remove" as const, id: e.id })));
    onNC(
      pendingTemplate.nodes.map((n) => ({
        type: "add" as const,
        item: structuredClone(n),
      })),
    );
    onEC(
      pendingTemplate.edges.map((e) => ({
        type: "add" as const,
        item: structuredClone(e),
      })),
    );

    setTimeout(() => flow.fitView({ duration: 300 }), 80);
    onTemplateDone?.();
  }, [pendingTemplate, flow, onTemplateDone]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/ghost-shape");
      if (!raw) return;

      const { shape, width, height } = JSON.parse(raw) as {
        shape: string;
        width: number;
        height: number;
      };

      const position = flow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

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
      };

      onNodesChange([{ type: "add", item: newNode }]);
    },
    [flow, onNodesChange],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionMode={ConnectionMode.Loose}
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      <Panel position="bottom-left">
        <ControlBar
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </Panel>
      <Panel position="bottom-center">
        <ShapePanel />
      </Panel>
    </ReactFlow>
  );
}
