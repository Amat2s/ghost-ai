"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toSlug, shortId } from "@/lib/slug"
import type { ProjectData } from "@/lib/projects"

type DialogType = "create" | "rename" | "delete" | null

export function useProjectActions() {
  const router = useRouter()
  const pathname = usePathname()
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null)
  const [createName, setCreateName] = useState("")
  const [createSuffix, setCreateSuffix] = useState("")
  const [renameName, setRenameName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const createProjectId = `${toSlug(createName) || "project"}-${createSuffix}`

  function openCreate() {
    setCreateName("")
    setCreateSuffix(shortId())
    setOpenDialog("create")
  }

  function openRename(project: ProjectData) {
    setSelectedProject(project)
    setRenameName(project.name)
    setOpenDialog("rename")
  }

  function openDelete(project: ProjectData) {
    setSelectedProject(project)
    setOpenDialog("delete")
  }

  function closeDialog() {
    setOpenDialog(null)
    setSelectedProject(null)
  }

  async function handleCreate() {
    if (!createName.trim() || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), id: createProjectId }),
      })
      if (!res.ok) return
      const project: ProjectData = await res.json()
      closeDialog()
      router.push(`/editor/${project.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRename() {
    if (!renameName.trim() || isLoading || !selectedProject) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      })
      if (!res.ok) return
      closeDialog()
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (isLoading || !selectedProject) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "DELETE",
      })
      if (!res.ok) return
      const segments = pathname.split("/")
      const activeId = segments[1] === "editor" ? segments[2] : undefined
      closeDialog()
      if (activeId && activeId === selectedProject.id) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    openDialog,
    selectedProject,
    createName,
    createProjectId,
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
