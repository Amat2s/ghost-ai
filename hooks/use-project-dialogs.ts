"use client"

import { useState } from "react"
import type { MockProject } from "@/lib/mock-projects"

type DialogType = "create" | "rename" | "delete" | null

export function useProjectDialogs() {
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [selectedProject, setSelectedProject] = useState<MockProject | null>(null)
  const [createName, setCreateName] = useState("")
  const [renameName, setRenameName] = useState("")
  const [isLoading] = useState(false)

  function openCreate() {
    setCreateName("")
    setOpenDialog("create")
  }

  function openRename(project: MockProject) {
    setSelectedProject(project)
    setRenameName(project.name)
    setOpenDialog("rename")
  }

  function openDelete(project: MockProject) {
    setSelectedProject(project)
    setOpenDialog("delete")
  }

  function closeDialog() {
    setOpenDialog(null)
    setSelectedProject(null)
  }

  function handleCreate() {
    if (!createName.trim() || isLoading) return
    closeDialog()
  }

  function handleRename() {
    if (!renameName.trim() || isLoading) return
    closeDialog()
  }

  function handleDelete() {
    if (isLoading) return
    closeDialog()
  }

  return {
    openDialog,
    selectedProject,
    createName,
    renameName,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    setCreateName,
    setRenameName,
    handleCreate,
    handleRename,
    handleDelete,
  }
}
