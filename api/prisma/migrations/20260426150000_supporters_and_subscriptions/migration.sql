-- Supporter / subscription consolidation.
-- 1. Create supporters table.
-- 2. Backfill supporters from existing donation rows (one row per
--    distinct BMC supporter_id seen in donations).
-- 3. Move donations from denormalised supporter columns to a FK.
-- 4. Create subscriptions table (covers recurring_donation + membership).

-- ── 1. Supporters ──────────────────────────────────────────────────
CREATE TABLE "supporters" (
    "id"                TEXT PRIMARY KEY,
    "bmc_supporter_id"  INTEGER NOT NULL UNIQUE,
    "name"              TEXT,
    "email"             TEXT,
    "first_seen_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "supporters_email_idx" ON "supporters" ("email");

-- ── 2. Backfill supporters from existing donations ────────────────
INSERT INTO "supporters" ("id", "bmc_supporter_id", "name", "email", "first_seen_at", "last_seen_at")
SELECT
    gen_random_uuid()::text,
    "supporter_id",
    MAX("supporter_name"),
    MAX("supporter_email"),
    MIN("received_at"),
    MAX("received_at")
FROM "donations"
WHERE "supporter_id" IS NOT NULL
GROUP BY "supporter_id"
ON CONFLICT ("bmc_supporter_id") DO NOTHING;

-- ── 3. Swap denormalised columns for a FK ──────────────────────────
ALTER TABLE "donations" ADD COLUMN "supporter_uuid" TEXT;

UPDATE "donations" d
SET "supporter_uuid" = s."id"
FROM "supporters" s
WHERE s."bmc_supporter_id" = d."supporter_id";

ALTER TABLE "donations" DROP COLUMN "supporter_id";
ALTER TABLE "donations" DROP COLUMN "supporter_name";
ALTER TABLE "donations" DROP COLUMN "supporter_email";
ALTER TABLE "donations" RENAME COLUMN "supporter_uuid" TO "supporter_id";

ALTER TABLE "donations"
    ADD CONSTRAINT "donations_supporter_id_fkey"
    FOREIGN KEY ("supporter_id") REFERENCES "supporters"("id")
    ON DELETE SET NULL;

CREATE INDEX "donations_supporter_id_idx" ON "donations" ("supporter_id");

-- ── 4. Subscriptions ───────────────────────────────────────────────
CREATE TABLE "subscriptions" (
    "id"                     TEXT PRIMARY KEY,
    "bmc_subscription_id"    INTEGER NOT NULL,
    "kind"                   TEXT NOT NULL,
    "live_mode"              BOOLEAN NOT NULL DEFAULT false,
    "amount"                 DECIMAL(10, 2) NOT NULL,
    "currency"               VARCHAR(8) NOT NULL,
    "duration_type"          TEXT,
    "psp_id"                 TEXT,
    "status"                 TEXT NOT NULL,
    "paused"                 BOOLEAN NOT NULL DEFAULT false,
    "canceled"               BOOLEAN NOT NULL DEFAULT false,
    "cancel_at_period_end"   BOOLEAN NOT NULL DEFAULT false,
    "membership_level_id"    INTEGER,
    "membership_level_name"  TEXT,
    "supporter_id"           TEXT,
    "support_note"           TEXT,
    "supporter_feedback"     TEXT,
    "started_at"             TIMESTAMP(3) NOT NULL,
    "canceled_at"            TIMESTAMP(3),
    "current_period_start"   TIMESTAMP(3),
    "current_period_end"     TIMESTAMP(3),
    "bmc_created_at"         TIMESTAMP(3) NOT NULL,
    "received_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload"            JSONB NOT NULL,
    CONSTRAINT "subscriptions_supporter_id_fkey"
        FOREIGN KEY ("supporter_id") REFERENCES "supporters"("id")
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX "subscriptions_kind_bmc_subscription_id_key"
    ON "subscriptions" ("kind", "bmc_subscription_id");
CREATE INDEX "subscriptions_supporter_id_idx" ON "subscriptions" ("supporter_id");
CREATE INDEX "subscriptions_live_mode_status_idx" ON "subscriptions" ("live_mode", "status");
CREATE INDEX "subscriptions_psp_id_idx" ON "subscriptions" ("psp_id");
