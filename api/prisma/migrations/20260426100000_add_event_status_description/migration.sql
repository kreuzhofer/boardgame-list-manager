-- Add status (default 'planning'), description, welcomeMessage to events
-- Existing events with isDefault=true and a past or current startsAt are
-- promoted to 'active' so the live event keeps working without manual change.

ALTER TABLE "events"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'planning',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "welcome_message" TEXT;

-- Backfill: any event with a past or current startsAt is treated as active
-- (so the existing default event "Lieberhausen 2026" stays in active state
-- if it's already running, otherwise stays as planning by default).
UPDATE "events"
SET "status" = 'active'
WHERE "is_default" = true
   OR ("starts_at" IS NOT NULL AND "starts_at" <= NOW() AND ("ends_at" IS NULL OR "ends_at" >= NOW()));

-- Past events become archived
UPDATE "events"
SET "status" = 'archived'
WHERE "ends_at" IS NOT NULL AND "ends_at" < NOW();
