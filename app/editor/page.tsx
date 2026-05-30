"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  DeleteProjectDialog,
  RenameProjectDialog,
} from "@/components/editor/project-dialogs"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { Button } from "@/components/ui/button"

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewProject={dialogs.openCreate}
        onRename={dialogs.openRename}
        onDelete={dialogs.openDelete}
      />
      <main className="flex flex-1 flex-col items-center justify-center pt-12">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="mt-2 text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
        <Button className="mt-6" onClick={dialogs.openCreate}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </main>

      <CreateProjectDialog
        open={dialogs.openDialog === "create"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        name={dialogs.createName}
        onNameChange={dialogs.setCreateName}
        onSubmit={dialogs.handleCreate}
        isLoading={dialogs.isLoading}
      />
      <RenameProjectDialog
        open={dialogs.openDialog === "rename"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        project={dialogs.selectedProject}
        name={dialogs.renameName}
        onNameChange={dialogs.setRenameName}
        onSubmit={dialogs.handleRename}
        isLoading={dialogs.isLoading}
      />
      <DeleteProjectDialog
        open={dialogs.openDialog === "delete"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        project={dialogs.selectedProject}
        onConfirm={dialogs.handleDelete}
        isLoading={dialogs.isLoading}
      />
    </div>
  )
}
