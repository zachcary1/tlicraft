import type { CraftedPool, PoolAffix } from "./types";

export type CraftingGroupKey =
  | "basicPrefixes"
  | "advancedPrefixes"
  | "ultimatePrefixes"
  | "basicSuffixes"
  | "advancedSuffixes"
  | "ultimateSuffixes";

export type AffixTarget = {
  group: CraftingGroupKey;
  affixId: string;
  tier: string;
};

export type FoundTargetProbability = {
  group: CraftingGroupKey;
  affixId: string;
  affixName: string;
  tier: string;
  probability: number;
};

function findAffixById(affixes: PoolAffix[], affixId: string) {
  return affixes.find((affix) => affix.id === affixId) ?? null;
}

export function findTierProbability(
  pool: CraftedPool,
  target: AffixTarget,
): FoundTargetProbability {
  const groupAffixes = pool.groups[target.group];

  const affix = findAffixById(groupAffixes, target.affixId);

  if (!affix) {
    throw new Error(
      `Affix "${target.affixId}" was not found in group "${target.group}" for pool "${pool.id}".`,
    );
  }

  const tier = affix.tiers.find((tierEntry) => tierEntry.tier === target.tier);

  if (!tier) {
    throw new Error(
      `Tier "${target.tier}" was not found for affix "${target.affixId}" in pool "${pool.id}".`,
    );
  }

  return {
    group: target.group,
    affixId: affix.id,
    affixName: affix.name,
    tier: tier.tier,
    probability: tier.probability,
  };
}