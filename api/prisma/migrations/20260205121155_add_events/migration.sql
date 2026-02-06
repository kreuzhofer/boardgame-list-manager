/*
  Warnings:

  - A unique constraint covering the columns `[event_id,name]` on the table `games` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[event_id,name]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "games_name_key";

-- DropIndex
DROP INDEX "users_name_key";

-- AlterTable
ALTER TABLE "activity_events" ADD COLUMN     "event_id" TEXT;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "event_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "location" VARCHAR(255),
    "capacity" INTEGER,
    "notes" TEXT,
    "fees" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "owner_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_owner_account_id_idx" ON "events"("owner_account_id");

-- CreateIndex
CREATE INDEX "activity_events_event_id_idx" ON "activity_events"("event_id");

-- CreateIndex
CREATE INDEX "games_event_id_idx" ON "games"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_event_id_name_key" ON "games"("event_id", "name");

-- CreateIndex
CREATE INDEX "users_event_id_idx" ON "users"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_event_id_name_key" ON "users"("event_id", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
