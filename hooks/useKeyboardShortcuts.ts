"use client"

import { useEffect } from "react"

interface FlowInstance {
  zoomIn: (options?: { duration?: number }) => void
  zoomOut: (options?: { duration?: number }) => void
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA") return true
  if (el.isContentEditable) return true
  return false
}

const ZOOM_DURATION = 200

export function useKeyboardShortcuts(
  flow: FlowInstance | null,
  undo: () => void,
  redo: () => void,
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return

      const ctrl = e.ctrlKey || e.metaKey

      if (!ctrl) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault()
          flow?.zoomIn({ duration: ZOOM_DURATION })
        } else if (e.key === "-") {
          e.preventDefault()
          flow?.zoomOut({ duration: ZOOM_DURATION })
        }
        return
      }

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [flow, undo, redo])
}
