-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('game_created', 'player_added', 'player_removed', 'bringer_added', 'bringer_removed', 'game_deleted', 'game_hidden', 'game_unhidden', 'prototype_toggled', 'user_created');

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "event_type" "ActivityEventType" NOT NULL,
    "game_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_actor_user_id_idx" ON "activity_events"("actor_user_id");

-- CreateIndex
CREATE INDEX "activity_events_game_id_idx" ON "activity_events"("game_id");

-- CreateIndex
CREATE INDEX "activity_events_created_at_idx" ON "activity_events"("created_at");

-- CreateIndex
CREATE INDEX "activity_events_event_type_idx" ON "activity_events"("event_type");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
