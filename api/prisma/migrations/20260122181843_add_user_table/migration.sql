/*
  Warnings:

  - You are about to drop the column `user_name` on the `bringers` table. All the data in the column will be lost.
  - You are about to drop the column `user_name` on the `players` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[game_id,user_id]` on the table `bringers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[game_id,user_id]` on the table `players` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `bringers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `players` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bringers_game_id_user_name_key";

-- DropIndex
DROP INDEX "bringers_user_name_idx";

-- DropIndex
DROP INDEX "players_game_id_user_name_key";

-- DropIndex
DROP INDEX "players_user_name_idx";

-- AlterTable
ALTER TABLE "bringers" DROP COLUMN "user_name",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "players" DROP COLUMN "user_name",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE INDEX "bringers_user_id_idx" ON "bringers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bringers_game_id_user_id_key" ON "bringers"("game_id", "user_id");

-- CreateIndex
CREATE INDEX "players_user_id_idx" ON "players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_game_id_user_id_key" ON "players"("game_id", "user_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bringers" ADD CONSTRAINT "bringers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
