"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Loader2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Collaborator {
  email: string;
  name: string | null;
  imageUrl: string | null;
}

interface Owner {
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

interface ShareDialogProps {
  projectId: string;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  projectId,
  isOwner,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`);
      if (res.ok) {
        const data: { owner: Owner; collaborators: Collaborator[] } =
          await res.json();
        setOwner(data.owner);
        setCollaborators(data.collaborators);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) fetchCollaborators();
  }, [open, fetchCollaborators]);

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setIsInviting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setInviteEmail("");
        await fetchCollaborators();
      } else {
        const data: { error?: string } = await res.json();
        setError(data.error ?? "Failed to invite");
      }
    } finally {
      setIsInviting(false);
    }
  }
  async function handleRemove(email: string) {
    setRemovingEmail(email)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.email !== email))
      }
    } finally {
      setRemovingEmail(null)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/editor/${projectId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const totalCount = (owner ? 1 : 0) + collaborators.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">Share project</DialogTitle>
          <DialogDescription>
            Invite collaborators, copy the workspace link, and manage access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border border-surface-border bg-elevated p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-copy-primary">
              Workspace link
            </p>
            <p className="text-xs text-copy-muted">
              Share a direct link with teammates after you grant them access.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="ml-4 shrink-0"
            onClick={handleCopyLink}
          >
            <Link2 className="h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-copy-muted" />
              <Input
                placeholder="teammate@company.com"
                type="email"
                className="pl-9 text-copy-primary"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
                disabled={isInviting}
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-copy-primary">
              People with access
            </p>
            {!isLoading && totalCount > 0 && (
              <span className="text-xs text-copy-muted">
                {totalCount} total
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-copy-muted" />
            </div>
          ) : (
            <ul className="space-y-2">
              {owner && (
                <PersonRow
                  email={owner.email ?? ""}
                  name={owner.name}
                  imageUrl={owner.imageUrl}
                  role="OWNER"
                />
              )}
              {collaborators.map((c) => (
                <PersonRow
                  key={c.email}
                  email={c.email}
                  name={c.name}
                  imageUrl={c.imageUrl}
                  role="COLLABORATOR"
                  onRemove={isOwner ? () => handleRemove(c.email) : undefined}
                  isRemoving={removingEmail === c.email}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({
  email,
  name,
  imageUrl,
  role,
  onRemove,
  isRemoving,
}: {
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: "OWNER" | "COLLABORATOR";
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-surface-border bg-elevated px-3 py-2.5">
      <CollaboratorAvatar name={name} imageUrl={imageUrl} email={email} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-copy-primary">
            {name ?? email}
          </p>
          <span
            className={
              role === "OWNER"
                ? "shrink-0 rounded-full bg-accent-dim px-2 py-0.5 text-xs font-medium text-brand"
                : "shrink-0 rounded-full border border-surface-border bg-surface px-2 py-0.5 text-xs font-medium text-copy-muted"
            }
          >
            {role}
          </span>
        </div>
        <p className="truncate text-xs text-copy-muted">{email}</p>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${email}`}
        >
          {isRemoving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      )}
    </li>
  );
}

function CollaboratorAvatar({
  name,
  imageUrl,
  email,
}: {
  name: string | null;
  imageUrl: string | null;
  email: string;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email[0]?.toUpperCase() ?? "?");

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name ?? email}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border bg-surface">
      <span className="text-xs font-medium text-copy-primary">{initials}</span>
    </div>
  );
}
