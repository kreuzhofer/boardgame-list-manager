-- AlterTable
ALTER TABLE "games" ADD COLUMN     "owner_id" TEXT;

-- CreateIndex
CREATE INDEX "games_owner_id_idx" ON "games"("owner_id");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
