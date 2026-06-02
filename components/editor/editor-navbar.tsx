"use client"

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Share2, LayoutTemplate } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  projectName?: string
  isAiSidebarOpen?: boolean
  onToggleAiSidebar?: () => void
  onShare?: () => void
  onOpenTemplates?: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onShare,
  onOpenTemplates,
}: EditorNavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center bg-surface border-b border-surface-border px-3">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>
      {projectName && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-sm font-medium text-copy-primary">{projectName}</span>
        </div>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {onToggleAiSidebar && (
          <>
            {onOpenTemplates && (
              <Button variant="ghost" size="sm" onClick={onOpenTemplates} aria-label="Templates">
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onShare} aria-label="Share">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleAiSidebar}
              aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            >
              {isAiSidebarOpen ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </Button>
          </>
        )}
        <UserButton />
      </div>
    </header>
  )
}
