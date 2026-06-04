"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useUndo, useRedo, useCanUndo, useCanRedo, useUpdateMyPresence, useEventListener } from "@liveblocks/react";
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
import { PresenceAvatars } from "./presence-avatars";
import { LiveCursors } from "./live-cursors";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCanvasSave } from "@/hooks/use-canvas-autosave";
import type { CanvasTemplate } from "./starter-templates";
import type { SaveStatus } from "@/hooks/use-canvas-autosave";

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

interface AiStatus {
  message: string;
  isError: boolean;
}

interface CanvasProps {
  projectId: string;
  saveRequestId?: number;
  pendingTemplate?: CanvasTemplate | null;
  onTemplateDone?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  onAiEvent?: (event: { type: string; message?: string; error?: string }) => void;
}

export function Canvas({ projectId, saveRequestId, pendingTemplate, onTemplateDone, onSaveStatusChange, onAiEvent }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true });

  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const updatePresence = useUpdateMyPresence();

  useKeyboardShortcuts(flow, undo, redo);

  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);

  useEventListener(({ event }) => {
    if (event.type === "AI_STARTED") {
      setAiStatus({ message: event.message, isError: false });
      onAiEvent?.({ type: event.type, message: event.message });
    } else if (event.type === "AI_STATUS") {
      setAiStatus({ message: event.message, isError: false });
      onAiEvent?.({ type: event.type, message: event.message });
    } else if (event.type === "AI_COMPLETED") {
      setAiStatus(null);
      onAiEvent?.({ type: event.type, message: event.message });
    } else if (event.type === "AI_ERROR") {
      setAiStatus({ message: event.error, isError: true });
      onAiEvent?.({ type: event.type, error: event.error });
      setTimeout(() => setAiStatus(null), 5000);
    }
  });

  const { save, saveStatus, resetIfSaved } = useCanvasSave(projectId);
  useEffect(() => { onSaveStatusChange?.(saveStatus); }, [saveStatus, onSaveStatusChange]);

  const contentFingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    const fp = [
      nodes.map(({ id, position, width, height, data }) =>
        `${id}:${position.x},${position.y},${width},${height},${JSON.stringify(data)}`
      ).sort().join("|"),
      edges.map(({ id, source, target, sourceHandle, targetHandle, data }) =>
        `${id}:${source}->${target}(${sourceHandle ?? ""},${targetHandle ?? ""}),${JSON.stringify(data)}`
      ).sort().join("|"),
    ].join("||");

    if (contentFingerprintRef.current !== null && fp !== contentFingerprintRef.current) {
      resetIfSaved();
    }
    contentFingerprintRef.current = fp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const stateRef = useRef({ nodes, edges, onNodesChange, onEdgesChange });
  useEffect(() => {
    stateRef.current = { nodes, edges, onNodesChange, onEdgesChange };
  });

  useEffect(() => {
    if (!saveRequestId) return;
    save(stateRef.current.nodes, stateRef.current.edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRequestId]);

  // Load saved canvas state into an empty room on first mount
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasLoaded.current) return;
    if (nodes.length > 0 || edges.length > 0) {
      hasLoaded.current = true;
      return;
    }
    hasLoaded.current = true;
    fetch(`/api/projects/${projectId}/canvas`)
      .then(async (res) => {
        if (res.status === 204 || !res.ok) return;
        const data = await res.json() as { nodes?: CanvasNode[]; edges?: CanvasEdge[] };
        const savedNodes = data.nodes ?? [];
        const savedEdges = data.edges ?? [];
        if (savedNodes.length === 0 && savedEdges.length === 0) return;
        const { onNodesChange: onNC, onEdgesChange: onEC } = stateRef.current;
        onNC(savedNodes.map((n) => ({ type: "add" as const, item: n })));
        onEC(savedEdges.map((e) => ({ type: "add" as const, item: e })));
        setTimeout(() => flow.fitView({ duration: 300 }), 80);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      updatePresence({ cursor: flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }) });
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [flow, updatePresence]);

  const onMouseLeave = useCallback(() => {
    updatePresence({ cursor: null });
  }, [updatePresence]);

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
      onMouseLeave={onMouseLeave}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      {aiStatus && (
        <Panel position="top-center">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg ${
              aiStatus.isError
                ? "border-red-500/30 bg-surface text-red-400"
                : "border-ai/30 bg-surface text-ai-text"
            }`}
          >
            {!aiStatus.isError && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ai" />
            )}
            {aiStatus.message}
          </div>
        </Panel>
      )}
      <LiveCursors />
      <Panel position="top-right" style={{ margin: 8 }}>
        <PresenceAvatars />
      </Panel>
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
