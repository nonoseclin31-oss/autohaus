-- CreateTable
CREATE TABLE "ToyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "payload" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToyTemplate_kind_idx" ON "ToyTemplate"("kind");

-- CreateIndex
CREATE INDEX "ToyTemplate_brand_model_idx" ON "ToyTemplate"("brand", "model");

-- CreateIndex
CREATE INDEX "ToyTemplate_lastUsedAt_idx" ON "ToyTemplate"("lastUsedAt");

-- CreateIndex
CREATE INDEX "ToyTemplate_name_idx" ON "ToyTemplate"("name");

-- AddForeignKey
ALTER TABLE "ToyTemplate" ADD CONSTRAINT "ToyTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

