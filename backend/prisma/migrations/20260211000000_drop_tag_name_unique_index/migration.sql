-- Drop the old unique index on Tag.name that was never properly removed.
-- The init migration created it as a UNIQUE INDEX, but the restructure migration
-- tried to drop it as a CONSTRAINT (which is a no-op in PostgreSQL for indexes).
-- This leaves the composite unique (collectionId, name) as the only constraint.
DROP INDEX IF EXISTS "Tag_name_key";
