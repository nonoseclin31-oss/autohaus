-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "phone" TEXT,
    "jobTitle" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "bodyType" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'USED',
    "segment" TEXT,
    "fuel" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "gears" INTEGER,
    "drivetrain" TEXT,
    "engineSize" DOUBLE PRECISION,
    "cylinders" INTEGER,
    "powerHp" INTEGER NOT NULL,
    "powerKw" INTEGER,
    "torqueNm" INTEGER,
    "acceleration" DOUBLE PRECISION,
    "topSpeed" INTEGER,
    "consumptionCombined" DOUBLE PRECISION,
    "consumptionUrban" DOUBLE PRECISION,
    "consumptionHighway" DOUBLE PRECISION,
    "co2" INTEGER,
    "emissionClass" TEXT,
    "energyLabel" TEXT,
    "batteryCapacity" DOUBLE PRECISION,
    "electricRange" INTEGER,
    "chargingTime" TEXT,
    "doors" INTEGER,
    "seats" INTEGER,
    "colorExterior" TEXT,
    "colorInterior" TEXT,
    "paintType" TEXT,
    "upholstery" TEXT,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "firstRegistration" TIMESTAMP(3),
    "previousOwners" INTEGER,
    "serviceHistory" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER,
    "nextInspection" TIMESTAMP(3),
    "accidentFree" BOOLEAN NOT NULL DEFAULT true,
    "nonSmoker" BOOLEAN NOT NULL DEFAULT true,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL,
    "priceNet" INTEGER,
    "vatDeductible" BOOLEAN NOT NULL DEFAULT false,
    "oldPrice" INTEGER,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "financingMonthly" INTEGER,
    "rentalAvailable" BOOLEAN NOT NULL DEFAULT false,
    "rentalMonthly" INTEGER,
    "rentalDeposit" INTEGER,
    "rentalFirstPayment" INTEGER,
    "rentalDurations" TEXT NOT NULL DEFAULT '[]',
    "rentalMileages" TEXT NOT NULL DEFAULT '[]',
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleImage" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VehicleImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTranslation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT,

    CONSTRAINT "VehicleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SALE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "rentalDuration" INTEGER,
    "rentalMileage" INTEGER,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_reference_key" ON "Vehicle"("reference");

-- CreateIndex
CREATE INDEX "Vehicle_status_published_idx" ON "Vehicle"("status", "published");

-- CreateIndex
CREATE INDEX "Vehicle_brand_model_idx" ON "Vehicle"("brand", "model");

-- CreateIndex
CREATE INDEX "Vehicle_rentalAvailable_idx" ON "Vehicle"("rentalAvailable");

-- CreateIndex
CREATE INDEX "VehicleImage_vehicleId_position_idx" ON "VehicleImage"("vehicleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleTranslation_vehicleId_locale_key" ON "VehicleTranslation"("vehicleId", "locale");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTranslation" ADD CONSTRAINT "VehicleTranslation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

