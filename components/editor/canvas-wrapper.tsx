"use client"

import { Component, type ReactNode } from "react"
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./canvas"
import type { CanvasTemplate } from "./starter-templates"

interface CanvasWrapperProps {
  roomId: string
  pendingTemplate?: CanvasTemplate | null
  onTemplateDone?: () => void
}

export function CanvasWrapper({ roomId, pendingTemplate, onTemplateDone }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <ErrorBoundary fallback={<CanvasError />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <ReactFlowProvider>
              <Canvas pendingTemplate={pendingTemplate} onTemplateDone={onTemplateDone} />
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
