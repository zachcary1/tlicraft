import type { PoolAffix, RollCandidate } from "./types";

export function flattenAffixesToCandidates(
  affixes: PoolAffix[],
): RollCandidate[] {
  return affixes.flatMap((affix) =>
    affix.tiers.map((tier) => ({
      affixId: affix.id,
      affixName: affix.name,
      tier: tier.tier,
      probability: tier.probability,
      stats: tier.stats,
    })),
  );
}