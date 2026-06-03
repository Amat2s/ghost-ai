"use client"

import { useState, useCallback } from "react"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

export function useCanvasSave(projectId: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  const resetIfSaved = useCallback(() => {
    setSaveStatus((s) => (s === "saved" ? "idle" : s))
  }, [])

  const save = useCallback(
    async (nodes: CanvasNode[], edges: CanvasEdge[]) => {
      setSaveStatus("saving")
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, edges }),
        })
        setSaveStatus(res.ok ? "saved" : "error")
      } catch {
        setSaveStatus("error")
      }
    },
    [projectId],
  )

  return { save, saveStatus, resetIfSaved }
}
