-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "downPayment" INTEGER,
ADD COLUMN     "financeFormula" TEXT,
ADD COLUMN     "forBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseOption" INTEGER,
ADD COLUMN     "quotedMonthly" INTEGER;
