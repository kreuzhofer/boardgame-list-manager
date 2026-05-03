-- Phase 2 identity migration, sub-step: link the per-event `users` table
-- to the platform-wide `accounts` table.
--
-- Two distinct purposes:
--   1. Account-authed event-join: when a logged-in user verifies an
--      event password, we auto-create a User row with account_id set
--      so Player / Bringer / HiddenGame keep working unchanged.
--   2. Lieberhausen-2026 legacy claim flow (later): UPDATE users SET
--      account_id = ? WHERE id = ? AND account_id IS NULL — links a
--      legacy anonymous User to the Account that just claimed it.
--
-- The (event_id, account_id) unique constraint enforces one User per
-- (event, account); multiple anonymous Users per event remain allowed
-- via Postgres NULL semantics on the unique index.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_account_id_idx" ON "users" ("account_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "users_event_id_account_id_key"
  ON "users" ("event_id", "account_id");
