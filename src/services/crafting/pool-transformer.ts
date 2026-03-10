import type { CraftedPool } from "./types";

type RawTierStat = {
  statId: string;
  label: string;
  minValue: number;
  maxValue: number;
  unit: "PERCENT" | "FLAT" | "NONE";
};

type RawTier = {
  tier: string;
  probability: number;
  stats: RawTierStat[];
};

type RawAffix = {
  id: string;
  name: string;
  tiers: RawTier[];
};

type RawAffixGroup = {
  groupType:
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
    | "ULTIMATE_SUFFIXES";
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

type UiStat = {
  statId: string;
  label: string;
  minValue: number;
  maxValue: number;
  unit: "PERCENT" | "FLAT" | "NONE";
};

type UiTier = {
  tier: string;
  probability: number;
  stats: UiStat[];
};

type UiAffix = {
  id: string;
  name: string;
  tiers: UiTier[];
};

type TransformedPool = {
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
  groups: {
    baseAffixes: UiAffix[];
    corrosionBaseAffixes: UiAffix[];
    sweetDreamAffixes: UiAffix[];
    nightmareAffixes: UiAffix[];
    intermediateSequences: UiAffix[];
    advancedSequences: UiAffix[];
    basicPrefixes: UiAffix[];
    advancedPrefixes: UiAffix[];
    ultimatePrefixes: UiAffix[];
    basicSuffixes: UiAffix[];
    advancedSuffixes: UiAffix[];
    ultimateSuffixes: UiAffix[];
  };
};

function transformAffix(affix: RawAffix): UiAffix {
  return {
    id: affix.id,
    name: affix.name,
    tiers: affix.tiers.map((tier) => ({
      tier: tier.tier,
      probability: tier.probability,
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
  const groups: TransformedPool["groups"] = {
    baseAffixes: [],
    corrosionBaseAffixes: [],
    sweetDreamAffixes: [],
    nightmareAffixes: [],
    intermediateSequences: [],
    advancedSequences: [],
    basicPrefixes: [],
    advancedPrefixes: [],
    ultimatePrefixes: [],
    basicSuffixes: [],
    advancedSuffixes: [],
    ultimateSuffixes: [],
  };

  for (const group of pool.affixGroups) {
    const transformedAffixes = group.affixes.map(transformAffix);

    switch (group.groupType) {
      case "BASE_AFFIXES":
        groups.baseAffixes = transformedAffixes;
        break;
      case "CORROSION_BASE_AFFIXES":
        groups.corrosionBaseAffixes = transformedAffixes;
        break;
      case "SWEET_DREAM_AFFIXES":
        groups.sweetDreamAffixes = transformedAffixes;
        break;
      case "NIGHTMARE_AFFIXES":
        groups.nightmareAffixes = transformedAffixes;
        break;
      case "INTERMEDIATE_SEQUENCES":
        groups.intermediateSequences = transformedAffixes;
        break;
      case "ADVANCED_SEQUENCES":
        groups.advancedSequences = transformedAffixes;
        break;
      case "BASIC_PREFIXES":
        groups.basicPrefixes = transformedAffixes;
        break;
      case "ADVANCED_PREFIXES":
        groups.advancedPrefixes = transformedAffixes;
        break;
      case "ULTIMATE_PREFIXES":
        groups.ultimatePrefixes = transformedAffixes;
        break;
      case "BASIC_SUFFIXES":
        groups.basicSuffixes = transformedAffixes;
        break;
      case "ADVANCED_SUFFIXES":
        groups.advancedSuffixes = transformedAffixes;
        break;
      case "ULTIMATE_SUFFIXES":
        groups.ultimateSuffixes = transformedAffixes;
        break;
    }
  }

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