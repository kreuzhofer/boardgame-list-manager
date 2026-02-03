CREATE TABLE "hidden_games" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_games_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hidden_games_game_id_user_id_key" ON "hidden_games"("game_id", "user_id");
CREATE INDEX "hidden_games_game_id_idx" ON "hidden_games"("game_id");
CREATE INDEX "hidden_games_user_id_idx" ON "hidden_games"("user_id");

ALTER TABLE "hidden_games" ADD CONSTRAINT "hidden_games_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hidden_games" ADD CONSTRAINT "hidden_games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
