"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { MockProject } from "@/lib/mock-projects"

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
  isLoading,
}: CreateProjectDialogProps) {
  const slug = toSlug(name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-copy-primary">New Project</DialogTitle>
          <DialogDescription className="text-copy-muted">Give your project a name to get started.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Input
            className="text-copy-primary"
            placeholder="Project name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
          />
          {name.length > 0 && (
            <p className="font-mono text-xs text-copy-muted">{slug || "—"}</p>
          )}
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={onSubmit} disabled={!name.trim() || isLoading}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RenameProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: MockProject | null
  name: string
  onNameChange: (name: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  project,
  name,
  onNameChange,
  onSubmit,
  isLoading,
}: RenameProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-copy-primary">Rename project</DialogTitle>
          {project && (
            <DialogDescription className="text-copy-muted">
              Renaming &ldquo;{project.name}&rdquo;
            </DialogDescription>
          )}
        </DialogHeader>
        <Input
          placeholder="Project name"
          className="text-copy-primary"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit()
          }}
          autoFocus
        />
        <DialogFooter showCloseButton>
          <Button onClick={onSubmit} disabled={!name.trim() || isLoading}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: MockProject | null
  onConfirm: () => void
  isLoading: boolean
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
  isLoading,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-copy-primary">Delete project</DialogTitle>
          {project && (
            <DialogDescription className="text-copy-muted">
              &ldquo;{project.name}&rdquo; will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
