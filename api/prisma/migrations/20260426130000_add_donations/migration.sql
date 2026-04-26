-- Donation log for Buy Me a Coffee webhook payloads.
CREATE TABLE "donations" (
    "id"                    TEXT PRIMARY KEY,
    "bmc_payment_id"        INTEGER NOT NULL UNIQUE,
    "type"                  TEXT NOT NULL,
    "live_mode"             BOOLEAN NOT NULL DEFAULT false,
    "amount"                DECIMAL(10, 2) NOT NULL,
    "currency"              VARCHAR(8) NOT NULL,
    "coffee_count"          INTEGER,
    "coffee_price"          DECIMAL(10, 2),
    "total_amount_charged"  DECIMAL(10, 2),
    "application_fee"       DECIMAL(10, 2),
    "supporter_id"          INTEGER,
    "supporter_name"        TEXT,
    "supporter_email"       TEXT,
    "support_note"          TEXT,
    "message"               TEXT,
    "status"                TEXT,
    "refunded"              BOOLEAN NOT NULL DEFAULT false,
    "refunded_at"           TIMESTAMP(3),
    "transaction_id"        TEXT,
    "bmc_created_at"        TIMESTAMP(3) NOT NULL,
    "received_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload"           JSONB NOT NULL
);

CREATE INDEX "donations_bmc_created_at_idx" ON "donations" ("bmc_created_at");
CREATE INDEX "donations_live_mode_refunded_idx" ON "donations" ("live_mode", "refunded");
