"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProjectData } from "@/lib/projects"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: ProjectData[]
  sharedProjects: ProjectData[]
  onNewProject: () => void
  onRename: (project: ProjectData) => void
  onDelete: (project: ProjectData) => void
}

function ProjectItem({
  project,
  onRename,
  onDelete,
}: {
  project: ProjectData
  onRename: (project: ProjectData) => void
  onDelete: (project: ProjectData) => void
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-subtle cursor-pointer">
      <span className="flex-1 truncate text-sm text-copy-primary">
        {project.name}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            onRename(project)
          }}
          aria-label="Rename project"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(project)
          }}
          aria-label="Delete project"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onNewProject,
  onRename,
  onDelete,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        inert={!isOpen}
        aria-hidden={!isOpen}
        className={`fixed top-12 left-0 z-30 flex h-[calc(100vh-3rem)] w-72 flex-col bg-elevated border-r border-surface-border transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-surface-border">
          <span className="text-sm font-semibold text-copy-primary">
            Projects
          </span>
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
            <TabsContent value="my-projects" className="flex-1 overflow-y-auto">
              {ownedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-copy-muted">No projects yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 py-1">
                  {ownedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      onRename={onRename}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="flex-1 overflow-y-auto">
              {sharedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-copy-muted">No shared projects</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 py-1">
                  {sharedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center rounded-lg px-2 py-1.5 hover:bg-subtle cursor-pointer"
                    >
                      <span className="flex-1 truncate text-sm text-copy-primary">
                        {project.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="shrink-0 p-3 border-t border-surface-border">
          <Button className="w-full" size="default" onClick={onNewProject}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
