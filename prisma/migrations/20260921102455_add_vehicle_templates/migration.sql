-- CreateTable
CREATE TABLE "VehicleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "payload" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleTemplate_brand_model_idx" ON "VehicleTemplate"("brand", "model");

-- CreateIndex
CREATE INDEX "VehicleTemplate_lastUsedAt_idx" ON "VehicleTemplate"("lastUsedAt");

-- CreateIndex
CREATE INDEX "VehicleTemplate_name_idx" ON "VehicleTemplate"("name");

-- AddForeignKey
ALTER TABLE "VehicleTemplate" ADD CONSTRAINT "VehicleTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
