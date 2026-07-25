-- CreateEnum
CREATE TYPE "PricedItemType" AS ENUM ('LEGENDARY_GEAR', 'PRECISE_SKILL', 'ACTIVATION_MEDIUM', 'MAGNIFICENT_SUPPORT', 'NOBLE_SUPPORT', 'DESTINY', 'HERO_MEMORY', 'DIVINITY_SLATE');

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "itemType" "PricedItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FE',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Price_itemType_itemId_idx" ON "Price"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "Price_itemType_recordedAt_idx" ON "Price"("itemType", "recordedAt");
