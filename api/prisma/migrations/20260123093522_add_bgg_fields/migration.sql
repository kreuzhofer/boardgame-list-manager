-- AlterTable
ALTER TABLE "games" ADD COLUMN     "bgg_id" INTEGER,
ADD COLUMN     "year_published" INTEGER;

-- CreateIndex
CREATE INDEX "games_bgg_id_idx" ON "games"("bgg_id");
