-- AlterTable
ALTER TABLE "events" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
