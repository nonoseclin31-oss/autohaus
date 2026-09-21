-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "financeRate" DOUBLE PRECISION,
ADD COLUMN     "loaAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "residualRate" DOUBLE PRECISION,
ADD COLUMN     "servicesMonthly" INTEGER;
