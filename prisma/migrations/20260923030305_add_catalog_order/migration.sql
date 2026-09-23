-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "catalogRank" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Vehicle_catalogRank_idx" ON "Vehicle"("catalogRank");

-- CreateIndex
CREATE INDEX "Vehicle_published_publishedAt_idx" ON "Vehicle"("published", "publishedAt");

-- Backfill: listings that are already public went public at some point, and
-- the only record of when is the day they were created. Without this they
-- would all sort as "never published" and the catalogue's newest-first order
-- would fall back to the creation date for every existing car anyway.
UPDATE "Vehicle" SET "publishedAt" = "createdAt" WHERE "published" = true AND "publishedAt" IS NULL;
