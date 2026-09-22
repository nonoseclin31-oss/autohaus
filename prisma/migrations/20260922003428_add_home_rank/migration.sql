-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "homeRank" INTEGER;

-- CreateIndex
CREATE INDEX "Vehicle_homeRank_idx" ON "Vehicle"("homeRank");
