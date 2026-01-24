-- CreateTable
CREATE TABLE "bgg_games" (
    "bgg_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "year_published" INTEGER,
    "rank" INTEGER,
    "bayes_average" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "users_rated" INTEGER,
    "is_expansion" BOOLEAN NOT NULL DEFAULT false,
    "abstracts_rank" INTEGER,
    "cgs_rank" INTEGER,
    "childrensgames_rank" INTEGER,
    "familygames_rank" INTEGER,
    "partygames_rank" INTEGER,
    "strategygames_rank" INTEGER,
    "thematic_rank" INTEGER,
    "wargames_rank" INTEGER,
    "scraping_done" BOOLEAN NOT NULL DEFAULT false,
    "enriched_at" TIMESTAMP(3),
    "enrichment_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bgg_games_pkey" PRIMARY KEY ("bgg_id")
);
