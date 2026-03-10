import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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
  probability: number;
  stats: PoolFileStat[];
};

type PoolFileAffix = {
  id: string;
  name: string;
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
      await prisma.craftedAffix.upsert({
        where: { id: affix.id },
        update: {
          name: affix.name,
          groupId,
        },
        create: {
          id: affix.id,
          name: affix.name,
          groupId,
        },
      });

      for (const tier of affix.tiers) {
        const tierId = `${affix.id}__${tier.tier.toLowerCase()}`;

        await prisma.craftedAffixTier.upsert({
          where: {
            affixId_tier: {
              affixId: affix.id,
              tier: tier.tier as
                | "T0"
                | "T1"
                | "T2"
                | "T3"
                | "T4"
                | "T5"
                | "T6"
                | "T7",
            },
          },
          update: {
            probability: tier.probability,
          },
          create: {
            id: tierId,
            affixId: affix.id,
            tier: tier.tier as
              | "T0"
              | "T1"
              | "T2"
              | "T3"
              | "T4"
              | "T5"
              | "T6"
              | "T7",
            probability: tier.probability,
          },
        });

        for (const stat of tier.stats) {
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
    console.log("No crafted pool JSON files found.");
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