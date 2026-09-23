-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aboutCopy" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "aboutRank" INTEGER,
ADD COLUMN     "birthDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_aboutRank_idx" ON "User"("aboutRank");

