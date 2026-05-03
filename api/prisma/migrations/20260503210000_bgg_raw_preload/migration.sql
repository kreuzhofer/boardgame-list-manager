-- Store the full GEEK.geekitemPreload.item JSON alongside the
-- structured enrichmentData projection. Future schema bumps can be
-- handled by a re-extraction pass against this raw blob — no
-- ScraperAPI calls needed unless BGG itself changes the source data.
--
-- Postgres will TOAST these out-of-line (compressed, off the main
-- row), so the bgg_games row size stays small in the common queries.
ALTER TABLE "bgg_games" ADD COLUMN IF NOT EXISTS "raw_preload" JSONB;
