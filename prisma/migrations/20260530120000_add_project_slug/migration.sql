-- Add slug as nullable first so existing rows are not blocked
ALTER TABLE "projects" ADD COLUMN "slug" TEXT;

-- Backfill existing rows: lowercase name, replace non-alphanumeric with hyphens, append first 4 chars of id
UPDATE "projects"
SET "slug" = REGEXP_REPLACE(
               LOWER(TRIM(name)),
               '[^a-z0-9]+', '-', 'g'
             ) || '-' || LOWER(SUBSTRING(id, 1, 4));

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;

-- Add the unique index
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
