"use client"

import { Component, type ReactNode } from "react"
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./canvas"
import type { CanvasTemplate } from "./starter-templates"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

interface CanvasWrapperProps {
  roomId: string
  saveRequestId?: number
  pendingTemplate?: CanvasTemplate | null
  onTemplateDone?: () => void
  onSaveStatusChange?: (status: SaveStatus) => void
  onAiEvent?: (event: { type: string; message?: string; error?: string }) => void
}

export function CanvasWrapper({ roomId, saveRequestId, pendingTemplate, onTemplateDone, onSaveStatusChange, onAiEvent }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <ErrorBoundary fallback={<CanvasError />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <ReactFlowProvider>
              <Canvas
                projectId={roomId}
                saveRequestId={saveRequestId}
                pendingTemplate={pendingTemplate}
                onTemplateDone={onTemplateDone}
                onSaveStatusChange={onSaveStatusChange}
                onAiEvent={onAiEvent}
              />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-sm text-copy-muted">Connecting…</p>
    </div>
  )
}

function CanvasError() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-sm text-copy-muted">Failed to connect to the canvas.</p>
    </div>
  )
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
