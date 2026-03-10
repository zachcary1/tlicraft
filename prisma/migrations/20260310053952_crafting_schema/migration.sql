-- CreateEnum
CREATE TYPE "GearType" AS ENUM ('CRAFTED', 'VORAX', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('STR', 'DEX', 'INT');

-- CreateEnum
CREATE TYPE "AffixGroupType" AS ENUM ('BASE_AFFIXES', 'CORROSION_BASE_AFFIXES', 'SWEET_DREAM_AFFIXES', 'NIGHTMARE_AFFIXES', 'INTERMEDIATE_SEQUENCES', 'ADVANCED_SEQUENCES', 'BASIC_PREFIXES', 'ADVANCED_PREFIXES', 'ULTIMATE_PREFIXES', 'BASIC_SUFFIXES', 'ADVANCED_SUFFIXES', 'ULTIMATE_SUFFIXES');

-- CreateEnum
CREATE TYPE "TierName" AS ENUM ('T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7');

-- CreateEnum
CREATE TYPE "StatUnit" AS ENUM ('PERCENT', 'FLAT', 'NONE');

-- CreateTable
CREATE TABLE "BaseItemCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BaseItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseItemCategoryId" TEXT NOT NULL,

    CONSTRAINT "WeaponType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedItemPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gearType" "GearType" NOT NULL DEFAULT 'CRAFTED',
    "baseItemCategoryId" TEXT NOT NULL,
    "weaponTypeId" TEXT,
    "attributeType" "AttributeType",
    "isPriceless" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CraftedItemPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedAffixGroup" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "groupType" "AffixGroupType" NOT NULL,

    CONSTRAINT "CraftedAffixGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedAffix" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CraftedAffix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedAffixTier" (
    "id" TEXT NOT NULL,
    "affixId" TEXT NOT NULL,
    "tier" "TierName" NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CraftedAffixTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedAffixTierStat" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "statId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION NOT NULL,
    "maxValue" DOUBLE PRECISION NOT NULL,
    "unit" "StatUnit" NOT NULL,

    CONSTRAINT "CraftedAffixTierStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CraftedItemPool_baseItemCategoryId_idx" ON "CraftedItemPool"("baseItemCategoryId");

-- CreateIndex
CREATE INDEX "CraftedItemPool_weaponTypeId_idx" ON "CraftedItemPool"("weaponTypeId");

-- CreateIndex
CREATE INDEX "CraftedItemPool_attributeType_idx" ON "CraftedItemPool"("attributeType");

-- CreateIndex
CREATE INDEX "CraftedItemPool_isPriceless_idx" ON "CraftedItemPool"("isPriceless");

-- CreateIndex
CREATE INDEX "CraftedAffixGroup_poolId_idx" ON "CraftedAffixGroup"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "CraftedAffixGroup_poolId_groupType_key" ON "CraftedAffixGroup"("poolId", "groupType");

-- CreateIndex
CREATE INDEX "CraftedAffix_groupId_idx" ON "CraftedAffix"("groupId");

-- CreateIndex
CREATE INDEX "CraftedAffixTier_affixId_idx" ON "CraftedAffixTier"("affixId");

-- CreateIndex
CREATE UNIQUE INDEX "CraftedAffixTier_affixId_tier_key" ON "CraftedAffixTier"("affixId", "tier");

-- CreateIndex
CREATE INDEX "CraftedAffixTierStat_tierId_idx" ON "CraftedAffixTierStat"("tierId");

-- CreateIndex
CREATE INDEX "CraftedAffixTierStat_statId_idx" ON "CraftedAffixTierStat"("statId");

-- AddForeignKey
ALTER TABLE "WeaponType" ADD CONSTRAINT "WeaponType_baseItemCategoryId_fkey" FOREIGN KEY ("baseItemCategoryId") REFERENCES "BaseItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedItemPool" ADD CONSTRAINT "CraftedItemPool_baseItemCategoryId_fkey" FOREIGN KEY ("baseItemCategoryId") REFERENCES "BaseItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedItemPool" ADD CONSTRAINT "CraftedItemPool_weaponTypeId_fkey" FOREIGN KEY ("weaponTypeId") REFERENCES "WeaponType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedAffixGroup" ADD CONSTRAINT "CraftedAffixGroup_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CraftedItemPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedAffix" ADD CONSTRAINT "CraftedAffix_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CraftedAffixGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedAffixTier" ADD CONSTRAINT "CraftedAffixTier_affixId_fkey" FOREIGN KEY ("affixId") REFERENCES "CraftedAffix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedAffixTierStat" ADD CONSTRAINT "CraftedAffixTierStat_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "CraftedAffixTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
