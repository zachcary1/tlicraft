-- Baseline migration: records the `Destiny.tier` column as already present in the live
-- database (it was added outside of tracked migrations at some point, mirroring the tracked
-- 20260606060101_add_hero_memory_tier addition for HeroMemory). This migration is marked
-- --applied rather than executed, since the column already exists.
-- AlterTable
ALTER TABLE "Destiny" ADD COLUMN     "tier" TEXT NOT NULL DEFAULT '';
