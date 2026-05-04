-- Soft-delete support for events. `deleted_at` is null for live
-- events; non-null marks the event as deleted with a 30-day purge
-- countdown handled by `purgeExpiredDeletedEvents()`. Index speeds up
-- the periodic purge sweep + the lazy filter on owner lists.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "events_deleted_at_idx" ON "events"("deleted_at");
