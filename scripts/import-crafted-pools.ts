import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { TierName } from "@prisma/client";
import prisma from "../src/db/prisma";

type StatUnit = "PERCENT" | "FLAT" | "NONE";

type PoolFileStat = {
  statId: string;
  label: string;
  minValue: number;
  maxValue: number;
  unit: StatUnit;
};

type PoolFileTier = {
  tier: string;
  stats: PoolFileStat[];
  rawModifier?: string;
};

type PoolFileAffix = {
  affixId?: string;
  id?: string;
  name: string;
  side?: "PREFIX" | "SUFFIX";
  library?: string;
  tiers: PoolFileTier[];
};

type PoolFileGroups = Partial<
  Record<
    | "BASE_AFFIXES"
    | "CORROSION_BASE_AFFIXES"
    | "SWEET_DREAM_AFFIXES"
    | "NIGHTMARE_AFFIXES"
    | "INTERMEDIATE_SEQUENCES"
    | "ADVANCED_SEQUENCES"
    | "BASIC_PREFIXES"
    | "ADVANCED_PREFIXES"
    | "ULTIMATE_PREFIXES"
    | "BASIC_SUFFIXES"
    | "ADVANCED_SUFFIXES"
    | "ULTIMATE_SUFFIXES",
    PoolFileAffix[]
  >
>;

type PoolFile = {
  id: string;
  name: string;
  baseItemCategoryId: string;
  weaponTypeId: string | null;
  attributeType: "STR" | "DEX" | "INT" | null;
  isPriceless: boolean;
  groups: PoolFileGroups;
};

const ALL_GROUP_TYPES = [
  "BASE_AFFIXES",
  "CORROSION_BASE_AFFIXES",
  "SWEET_DREAM_AFFIXES",
  "NIGHTMARE_AFFIXES",
  "INTERMEDIATE_SEQUENCES",
  "ADVANCED_SEQUENCES",
  "BASIC_PREFIXES",
  "ADVANCED_PREFIXES",
  "ULTIMATE_PREFIXES",
  "BASIC_SUFFIXES",
  "ADVANCED_SUFFIXES",
  "ULTIMATE_SUFFIXES",
] as const;

function isJsonFile(fileName: string) {
  return fileName.endsWith(".json");
}

function normalizeTierForDb(tier: string): TierName {
  switch (tier) {
    case "0+":
    case "T0_PLUS":
      return TierName.T0_PLUS;
    case "0":
    case "T0":
      return TierName.T0;
    case "1":
    case "T1":
      return TierName.T1;
    case "2":
    case "T2":
      return TierName.T2;
    case "3":
    case "T3":
      return TierName.T3;
    case "4":
    case "T4":
      return TierName.T4;
    case "5":
    case "T5":
      return TierName.T5;
    case "6":
    case "T6":
      return TierName.T6;
    case "7":
    case "T7":
      return TierName.T7;
    default:
      throw new Error(`Unknown tier: ${tier}`);
  }
}

function normalizeAffixId(affix: PoolFileAffix) {
  if (affix.affixId) return affix.affixId;
  if (affix.id) return affix.id;
  throw new Error(`Affix is missing both "affixId" and "id": ${affix.name}`);
}

async function readPoolFile(filePath: string): Promise<PoolFile> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as PoolFile;
}

async function importPool(pool: PoolFile) {
  await prisma.craftedItemPool.upsert({
    where: { id: pool.id },
    update: {
      name: pool.name,
      baseItemCategoryId: pool.baseItemCategoryId,
      weaponTypeId: pool.weaponTypeId,
      attributeType: pool.attributeType,
      isPriceless: pool.isPriceless,
    },
    create: {
      id: pool.id,
      name: pool.name,
      baseItemCategoryId: pool.baseItemCategoryId,
      weaponTypeId: pool.weaponTypeId,
      attributeType: pool.attributeType,
      isPriceless: pool.isPriceless,
    },
  });

  for (const groupType of ALL_GROUP_TYPES) {
    const groupId = `${pool.id}__${groupType.toLowerCase()}`;

    await prisma.craftedAffixGroup.upsert({
      where: {
        poolId_groupType: {
          poolId: pool.id,
          groupType,
        },
      },
      update: {},
      create: {
        id: groupId,
        poolId: pool.id,
        groupType,
      },
    });

    const affixes = pool.groups[groupType] ?? [];

    for (const affix of affixes) {
      const affixId = normalizeAffixId(affix);

      await prisma.craftedAffix.upsert({
        where: { id: affixId },
        update: {
          name: affix.name,
          groupId,
        },
        create: {
          id: affixId,
          name: affix.name,
          groupId,
        },
      });

      for (const tier of affix.tiers) {
        const normalizedTier = normalizeTierForDb(tier.tier);
        const tierId = `${affixId}__${String(normalizedTier).toLowerCase()}`;

        await prisma.craftedAffixTier.upsert({
          where: {
            affixId_tier: {
              affixId,
              tier: normalizedTier,
            },
          },
          update: {},
          create: {
            id: tierId,
            affixId,
            tier: normalizedTier,
          },
        });

        for (const stat of tier.stats ?? []) {
          const statRowId = `${tierId}__${stat.statId}`;

          await prisma.craftedAffixTierStat.upsert({
            where: { id: statRowId },
            update: {
              statId: stat.statId,
              label: stat.label,
              minValue: stat.minValue,
              maxValue: stat.maxValue,
              unit: stat.unit,
            },
            create: {
              id: statRowId,
              tierId,
              statId: stat.statId,
              label: stat.label,
              minValue: stat.minValue,
              maxValue: stat.maxValue,
              unit: stat.unit,
            },
          });
        }
      }
    }
  }
}

async function main() {
  const poolsDir = path.join(process.cwd(), "data", "crafted", "pools");
  const files = await readdir(poolsDir);
  const jsonFiles = files.filter(isJsonFile);

  if (jsonFiles.length === 0) {
    console.log("No crafted pool JSON files found in:", poolsDir);
    return;
  }

  for (const fileName of jsonFiles) {
    const filePath = path.join(poolsDir, fileName);
    const pool = await readPoolFile(filePath);

    await importPool(pool);
    console.log(`Imported pool: ${pool.id}`);
  }

  console.log("Crafted pool import complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Crafted pool import failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });