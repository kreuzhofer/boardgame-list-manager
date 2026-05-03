-- Adds an optional `new_email` column to login_tokens so the email-change
-- flow can store the target address alongside the token. Existing token
-- purposes (login, invite-claim, legacy-claim, reset-password) leave it null.
ALTER TABLE "login_tokens" ADD COLUMN IF NOT EXISTS "new_email" TEXT;
