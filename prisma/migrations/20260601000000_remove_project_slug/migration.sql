-- Drop the unique index and slug column — project id is now the canonical identifier
DROP INDEX IF EXISTS "projects_slug_key";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "slug";
