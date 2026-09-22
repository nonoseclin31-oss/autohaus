-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "toyId" TEXT;

-- CreateTable
CREATE TABLE "Toy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER NOT NULL,
    "hullId" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'USED',
    "category" TEXT,
    "engineType" TEXT NOT NULL DEFAULT 'PETROL',
    "displacement" INTEGER,
    "cylinders" INTEGER,
    "strokes" INTEGER,
    "powerHp" INTEGER NOT NULL,
    "powerKw" INTEGER,
    "torqueNm" INTEGER,
    "topSpeed" INTEGER,
    "transmission" TEXT,
    "engineCount" INTEGER DEFAULT 1,
    "mileage" INTEGER,
    "engineHours" INTEGER,
    "dryWeight" INTEGER,
    "seats" INTEGER,
    "lengthM" DOUBLE PRECISION,
    "beamM" DOUBLE PRECISION,
    "fuelCapacity" DOUBLE PRECISION,
    "rangeKm" INTEGER,
    "trailerIncluded" BOOLEAN NOT NULL DEFAULT false,
    "registered" BOOLEAN NOT NULL DEFAULT true,
    "licence" TEXT,
    "warrantyMonths" INTEGER,
    "serviceHistory" BOOLEAN NOT NULL DEFAULT false,
    "accidentFree" BOOLEAN NOT NULL DEFAULT true,
    "previousOwners" INTEGER,
    "firstRegistration" TIMESTAMP(3),
    "colorExterior" TEXT,
    "price" INTEGER NOT NULL,
    "priceNet" INTEGER,
    "vatDeductible" BOOLEAN NOT NULL DEFAULT false,
    "oldPrice" INTEGER,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "financingMonthly" INTEGER,
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "homeRank" INTEGER,
    "ownerId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyImage" (
    "id" TEXT NOT NULL,
    "toyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ToyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyTranslation" (
    "id" TEXT NOT NULL,
    "toyId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT,

    CONSTRAINT "ToyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Toy_slug_key" ON "Toy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Toy_reference_key" ON "Toy"("reference");

-- CreateIndex
CREATE INDEX "Toy_status_published_idx" ON "Toy"("status", "published");

-- CreateIndex
CREATE INDEX "Toy_kind_published_idx" ON "Toy"("kind", "published");

-- CreateIndex
CREATE INDEX "Toy_homeRank_idx" ON "Toy"("homeRank");

-- CreateIndex
CREATE INDEX "Toy_brand_model_idx" ON "Toy"("brand", "model");

-- CreateIndex
CREATE INDEX "ToyImage_toyId_position_idx" ON "ToyImage"("toyId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ToyTranslation_toyId_locale_key" ON "ToyTranslation"("toyId", "locale");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toy" ADD CONSTRAINT "Toy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToyImage" ADD CONSTRAINT "ToyImage_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToyTranslation" ADD CONSTRAINT "ToyTranslation_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

