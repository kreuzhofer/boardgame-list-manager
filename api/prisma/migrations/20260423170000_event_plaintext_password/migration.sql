-- Replace hashed event password with plaintext.
-- Event passwords are shared access codes, not personal secrets.

-- Add plaintext password column (nullable during transition)
ALTER TABLE "events" ADD COLUMN "password" TEXT;

-- Drop the hash column
ALTER TABLE "events" DROP COLUMN "password_hash";
