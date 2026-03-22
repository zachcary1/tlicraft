import { AffixGroupType } from "@prisma/client";
import type { CraftedPool, PoolAffix } from "./types";

type RawTierStat = {
  statId: string;
  label: string;
  minValue: number;
  maxValue: number;
  unit: "PERCENT" | "FLAT" | "NONE";
};

type RawTier = {
  tier: string;
  stats: RawTierStat[];
};

type RawAffix = {
  id: string;
  name: string;
  tiers: RawTier[];
};

type RawAffixGroup = {
  groupType: AffixGroupType;
  affixes: RawAffix[];
};

type RawPool = {
  id: string;
  name: string;
  attributeType: "STR" | "DEX" | "INT" | null;
  isPriceless: boolean;
  baseItemCategory: {
    id: string;
    name: string;
  };
  weaponType: {
    id: string;
    name: string;
  } | null;
  affixGroups: RawAffixGroup[];
};

function transformAffix(affix: RawAffix): PoolAffix {
  return {
    id: affix.id,
    name: affix.name,
    tiers: affix.tiers.map((tier) => ({
      tier: tier.tier,
      stats: tier.stats.map((stat) => ({
        statId: stat.statId,
        label: stat.label,
        minValue: stat.minValue,
        maxValue: stat.maxValue,
        unit: stat.unit,
      })),
    })),
  };
}

export function transformCraftedPool(pool: RawPool): CraftedPool {
  const emptyGroups = Object.fromEntries(
    Object.values(AffixGroupType).map((key) => [key, []]),
  ) as unknown as Record<AffixGroupType, PoolAffix[]>;

  const groups = pool.affixGroups.reduce((acc, group) => {
    acc[group.groupType] = group.affixes.map(transformAffix);
    return acc;
  }, emptyGroups);

  return {
    id: pool.id,
    name: pool.name,
    attributeType: pool.attributeType,
    isPriceless: pool.isPriceless,
    baseItemCategory: pool.baseItemCategory,
    weaponType: pool.weaponType,
    groups,
  };
}
