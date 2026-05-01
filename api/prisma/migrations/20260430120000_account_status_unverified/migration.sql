-- Add 'unverified' value to AccountStatus enum.
-- Used for accounts auto-created by the magic-link signup flow:
-- the account is created in 'unverified' state when an unknown email
-- requests a magic link, and flipped to 'active' on first successful
-- consume of that link.
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'unverified';
