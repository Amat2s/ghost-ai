export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 6)
}

export function generateSlug(name: string): string {
  return `${toSlug(name) || "project"}-${shortId()}`
}
