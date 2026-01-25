-- AlterTable
ALTER TABLE "games" ADD COLUMN "added_as_alternate_name" VARCHAR(255),
ADD COLUMN "alternate_names" JSONB NOT NULL DEFAULT '[]';
