-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bringers" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bringers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE INDEX "players_game_id_idx" ON "players"("game_id");

-- CreateIndex
CREATE INDEX "players_user_name_idx" ON "players"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "players_game_id_user_name_key" ON "players"("game_id", "user_name");

-- CreateIndex
CREATE INDEX "bringers_game_id_idx" ON "bringers"("game_id");

-- CreateIndex
CREATE INDEX "bringers_user_name_idx" ON "bringers"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "bringers_game_id_user_name_key" ON "bringers"("game_id", "user_name");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bringers" ADD CONSTRAINT "bringers_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
