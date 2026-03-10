-- AlterEnum
ALTER TYPE "TierName" ADD VALUE 'T0_PLUS';

-- AlterTable
ALTER TABLE "CraftedAffixTier" ALTER COLUMN "probability" DROP NOT NULL;
