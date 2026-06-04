"use client"

import { useState } from "react"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { ProjectData } from "@/lib/projects"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

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
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveRequestId, setSaveRequestId] = useState(0)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col bg-base">
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        backgroundKeepAliveTimeout={10 * 60 * 1000}
        lostConnectionTimeout={30_000}
      >
        <RoomProvider id={project.id} initialPresence={{ cursor: null, thinking: false }}>
          <EditorNavbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            projectName={project.name}
            isAiSidebarOpen={isAiSidebarOpen}
            onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
            onShare={() => setIsShareOpen(true)}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onSave={() => setSaveRequestId((n) => n + 1)}
            saveStatus={saveStatus}
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
              <CanvasWrapper
                roomId={project.id}
                saveRequestId={saveRequestId}
                pendingTemplate={pendingTemplate}
                onTemplateDone={() => setPendingTemplate(null)}
                onSaveStatusChange={setSaveStatus}
              />
            </main>
          </div>
          <AiSidebar
            isOpen={isAiSidebarOpen}
            onClose={() => setIsAiSidebarOpen(false)}
            projectId={project.id}
          />

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
          <StarterTemplatesModal
            open={isTemplatesOpen}
            onOpenChange={setIsTemplatesOpen}
            onImport={(template) => setPendingTemplate(template)}
          />
        </RoomProvider>
      </LiveblocksProvider>
    </div>
  )
}
