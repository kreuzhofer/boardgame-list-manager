-- Phase 2 of the identity migration: introduce account-based event
-- attendance alongside the existing per-event `users` table.
--
-- Three additive changes (none touch existing data):
--   1. Add 'player' to the AccountRole enum so account-based attendees
--      can be distinguished from organizers.
--   2. Add `accounts.display_name` as the default per-event display
--      name (overridden by EventParticipation.displayName).
--   3. Create the `event_participations` table itself, replacing
--      `users` for the new flow. The old table stays in place for
--      anonymous joins and the upcoming Lieberhausen claim flow.

ALTER TYPE "AccountRole" ADD VALUE IF NOT EXISTS 'player';

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(60);

CREATE TABLE "event_participations" (
  "id"            TEXT NOT NULL,
  "event_id"      TEXT NOT NULL,
  "account_id"    TEXT,
  "display_name"  VARCHAR(60),
  "role"          TEXT NOT NULL DEFAULT 'attendee',
  "status"        TEXT NOT NULL DEFAULT 'going',
  "invited_by_id" TEXT,
  "joined_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "event_participations_pkey" PRIMARY KEY ("id")
);

-- One participation per (event, account). Multiple anonymous (account_id=NULL)
-- rows are allowed by Postgres' NULL-not-equal-to-NULL semantics.
CREATE UNIQUE INDEX "event_participations_event_id_account_id_key"
  ON "event_participations" ("event_id", "account_id");
CREATE INDEX "event_participations_event_id_idx"   ON "event_participations" ("event_id");
CREATE INDEX "event_participations_account_id_idx" ON "event_participations" ("account_id");

ALTER TABLE "event_participations"
  ADD CONSTRAINT "event_participations_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_participations"
  ADD CONSTRAINT "event_participations_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_participations"
  ADD CONSTRAINT "event_participations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
