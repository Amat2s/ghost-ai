# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 07: Complete

## Current Goal

- Feature 07: Wire editor home sidebar and dialogs to real project API

## Completed

- **01-design-system**: shadcn/ui installed and configured (Tailwind v4 detected), 7 UI components added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), lucide-react installed, `lib/utils.ts` with `cn()` helper created, dark theme CSS variables and `@theme inline` token mappings wired into `globals.css`. TypeScript check passes with zero errors.
- **02-editor**: `components/editor/editor-navbar.tsx` (fixed top navbar, sidebar toggle with `PanelLeftOpen`/`PanelLeftClose`, dark bg + bottom border) and `components/editor/project-sidebar.tsx` (floating overlay, slides from left, `Projects` header + close button, My Projects / Shared tabs with empty states, full-width New Project button). Dialog pattern from Feature 01 already supports title/description/footer actions. TypeScript check passes with zero errors.
- **03-auth**: `@clerk/nextjs` v7 + `@clerk/ui` v1.14.0 installed. `proxy.ts` at root uses `clerkMiddleware` + `createRouteMatcher` to protect all routes except `/sign-in(.*)` and `/sign-up(.*)`. `ClerkProvider` wraps root layout with `ui={ui}` from `@clerk/ui` and `appearance={{ theme: dark, variables: { ... } }}` — CSS variable overrides for all colors, no hardcoded hex. `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` pages use two-panel layout (left: logo + tagline + feature list; right: Clerk form; small screens: form only). `/` redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `app/editor/page.tsx` created as the protected editor workspace. `UserButton` added to editor navbar right section. `npm run build` passes.
- **04-project-dialogs**: Editor home screen with heading, description, and New Project button. `lib/mock-projects.ts` — `MockProject` interface + 3 mock entries (2 owned, 1 shared). `hooks/use-project-dialogs.ts` — dedicated hook managing dialog type, selected project, create/rename form state, and loading state. `components/editor/project-dialogs.tsx` — `CreateProjectDialog` (name input + live slug preview), `RenameProjectDialog` (prefilled input, Enter submits, autofocus), `DeleteProjectDialog` (destructive confirm, no input). `ProjectSidebar` updated with project items, hover-reveal rename/delete actions for owned projects only, shared tab shows items without actions, mobile backdrop scrim. TypeScript check passes with zero errors.
- **05-prisma**: `prisma/models/project.prisma` — `ProjectStatus` enum (`DRAFT`/`ARCHIVED`), `Project` model (id, ownerId, name, optional description, status, optional canvasJsonPath, timestamps; indexes on ownerId and createdAt), `ProjectCollaborator` model (id, projectId, email, createdAt; cascade delete relation; unique on projectId/email; indexes on email and projectId/createdAt). `lib/prisma.ts` — cached `PrismaClient` singleton on `globalThis` in development; branches on `DATABASE_URL`: `prisma+postgres://` → `{ accelerateUrl }`, otherwise → `PrismaPg` adapter. Migration `20260530020346_add_projects` applied. Client generated to `app/generated/prisma/`. `npm run build` passes with zero errors.
- **06-project-apis**: `app/api/projects/route.ts` — `GET` lists all projects owned by the authenticated user (ordered by `createdAt` desc); `POST` creates a project with the Clerk user ID as `ownerId`, defaulting name to `Untitled Project`. `app/api/projects/[projectId]/route.ts` — `PATCH` renames a project (owner-only, 403 otherwise); `DELETE` deletes a project (owner-only, 403 otherwise). Both files return 401 for unauthenticated requests and 404 when the project doesn't exist. UI not wired. `npm run build` passes with zero errors.
- **07-wire-editor-home**: `lib/projects.ts` — `ProjectData` interface (`id`, `name`) + `getOwnedProjects` / `getSharedProjects` server helpers (Prisma select, Clerk `auth()` / `currentUser()` for email). `hooks/use-project-actions.ts` — replaces `use-project-dialogs.ts`; manages dialog state + real API mutations (`POST`, `PATCH`, `DELETE`); slug + short suffix generate `roomIdPreview` for the create dialog; `handleCreate` navigates to `/editor/[id]`; `handleRename` calls `router.refresh()`; `handleDelete` redirects to `/editor` if deleting the active workspace (derived from `usePathname()`), otherwise refreshes. `components/editor/editor-home-client.tsx` — client shell holding sidebar toggle + dialog state; receives `ownedProjects`/`sharedProjects` as props from the server component. `app/editor/page.tsx` — converted to async server component; fetches owned and shared projects in parallel and passes them to `EditorHomeClient`. `components/editor/project-sidebar.tsx` and `project-dialogs.tsx` updated to use `ProjectData` instead of `MockProject`; create dialog accepts `roomIdPreview` prop. `npm run build` passes with zero errors.

## In Progress

- None.

## Next Up

- Feature 08: (TBD)

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Tailwind v4 CSS-based configuration: all theme tokens defined in `globals.css` via `@theme inline` — no `tailwind.config.js/ts` needed.
- Dark-only app: shadcn CSS variables (`--background`, `--foreground`, etc.) are set directly in `:root` to the dark theme values from `ui-context.md`. No `.dark` class toggling required.
- Project token naming: CSS vars (`--bg-base`, `--text-primary`, etc.) are mapped to Tailwind color tokens via `@theme inline` (e.g. `--color-base: var(--bg-base)`) to produce utilities `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, etc.

## Session Notes

- Next.js 16 with Tailwind v4. Shadcn components in `components/ui/` must not be modified after generation.
- shadcn CLI version 4.8.2 was used.
- Next.js 16 renames middleware to **Proxy** — use `proxy.ts` (not `middleware.ts`) at the project root. Export the function as `default` or named `proxy`.
- `@clerk/ui` v1.14.0 provides `dark` theme from `@clerk/ui/themes`. Pass `ui={ui}` to `ClerkProvider` and use `appearance={{ theme: dark, variables: { ... } }}` (NOT `baseTheme` — that's the old @clerk/themes API).
- Prisma 7 uses `provider = "prisma-client"` generator (not `prisma-client-js`). Generated output at `app/generated/prisma/`; main import is `app/generated/prisma/client.ts` (no `index.ts`). Constructor requires an argument: `{ adapter }` for direct connections, `{ accelerateUrl }` for Accelerate.
- `prisma.config.ts` at project root uses `schema: "prisma/"` for multi-file schema discovery — no `--schema` flag needed on CLI commands.
- `prisma migrate dev` does NOT auto-run `prisma generate` in v7 — run both separately.
