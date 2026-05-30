"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { useProjectActions } from "@/hooks/use-project-actions"
import { Button } from "@/components/ui/button"
import type { ProjectData } from "@/lib/projects"

interface EditorHomeClientProps {
  ownedProjects: ProjectData[]
  sharedProjects: ProjectData[]
}

export function EditorHomeClient({ ownedProjects, sharedProjects }: EditorHomeClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onNewProject={actions.openCreate}
        onRename={actions.openRename}
        onDelete={actions.openDelete}
      />
      <main className="flex flex-1 flex-col items-center justify-center pt-12">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="mt-2 text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
        <Button className="mt-6" onClick={actions.openCreate}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </main>

      <CreateProjectDialog
        open={actions.openDialog === "create"}
        onOpenChange={(open) => { if (!open) actions.closeDialog() }}
        name={actions.createName}
        onNameChange={actions.setCreateName}
        roomIdPreview={actions.roomIdPreview}
        onSubmit={actions.handleCreate}
        isLoading={actions.isLoading}
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
    </div>
  )
}
