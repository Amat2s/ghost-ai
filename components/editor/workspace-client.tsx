"use client"

import { useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { ProjectData } from "@/lib/projects"

interface WorkspaceClientProps {
  project: ProjectData
  isOwner: boolean
  ownedProjects: ProjectData[]
  sharedProjects: ProjectData[]
}

export function WorkspaceClient({
  project,
  isOwner,
  ownedProjects,
  sharedProjects,
}: WorkspaceClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        projectName={project.name}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
        onShare={() => setIsShareOpen(true)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        activeProjectId={project.id}
        onNewProject={actions.openCreate}
        onRename={actions.openRename}
        onDelete={actions.openDelete}
      />
      <div className="flex flex-1 overflow-hidden pt-12">
        <main className="flex flex-1 overflow-hidden bg-base">
          <CanvasWrapper roomId={project.id} />
        </main>
        {isAiSidebarOpen && (
          <aside className="flex w-80 shrink-0 items-center justify-center border-l border-surface-border bg-elevated">
            <p className="text-sm text-copy-muted">AI chat coming soon</p>
          </aside>
        )}
      </div>

      <CreateProjectDialog
        open={actions.openDialog === "create"}
        onOpenChange={(open) => { if (!open) actions.closeDialog() }}
        name={actions.createName}
        onNameChange={actions.setCreateName}
        onSubmit={actions.handleCreate}
        isLoading={actions.isLoading}
        projectId={actions.createProjectId}
      />
      <RenameProjectDialog
        open={actions.openDialog === "rename"}
        onOpenChange={(open) => { if (!open) actions.closeDialog() }}
        project={actions.selectedProject}
        name={actions.renameName}
        onNameChange={actions.setRenameName}
        onSubmit={actions.handleRename}
        isLoading={actions.isLoading}
      />
      <DeleteProjectDialog
        open={actions.openDialog === "delete"}
        onOpenChange={(open) => { if (!open) actions.closeDialog() }}
        project={actions.selectedProject}
        onConfirm={actions.handleDelete}
        isLoading={actions.isLoading}
      />
      <ShareDialog
        projectId={project.id}
        isOwner={isOwner}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
      />
    </div>
  )
}
