-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sourceHash" TEXT;

-- CreateIndex
CREATE INDEX "Lead_sourceHash_createdAt_idx" ON "Lead"("sourceHash", "createdAt");

