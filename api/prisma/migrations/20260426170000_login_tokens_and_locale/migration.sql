-- Account.locale + LoginToken table for magic-link auth and friends.

ALTER TABLE "accounts" ADD COLUMN "locale" VARCHAR(8);

CREATE TABLE "login_tokens" (
    "id"          TEXT PRIMARY KEY,
    "token"       TEXT NOT NULL UNIQUE,
    "account_id"  TEXT NOT NULL,
    "purpose"     TEXT NOT NULL,
    "target_path" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "consumed_ip" TEXT,
    CONSTRAINT "login_tokens_account_id_fkey"
        FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
        ON DELETE CASCADE
);

CREATE INDEX "login_tokens_account_id_idx" ON "login_tokens" ("account_id");
CREATE INDEX "login_tokens_expires_at_idx" ON "login_tokens" ("expires_at");
