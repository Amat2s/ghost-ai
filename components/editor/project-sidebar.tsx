"use client"

import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={`fixed top-12 left-0 z-30 flex h-[calc(100vh-3rem)] w-72 flex-col bg-elevated border-r border-surface-border transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-surface-border">
        <span className="text-sm font-semibold text-copy-primary">Projects</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-3 pt-3">
        <Tabs defaultValue="my-projects" className="flex flex-1 flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="flex-1">
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-copy-muted">No projects yet</p>
            </div>
          </TabsContent>
          <TabsContent value="shared" className="flex-1">
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-copy-muted">No shared projects</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="shrink-0 p-3 border-t border-surface-border">
        <Button className="w-full" size="default">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
