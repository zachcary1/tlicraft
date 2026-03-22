import type { AffixTarget } from "./probability-lookup";
import { findTierProbability } from "./probability-lookup";
import type { CraftedPool } from "./types";

export type CostEstimate = {
  group: AffixTarget["group"];
  affixId: string;
  affixName: string;
  tier: string;
  probability?: number;
  expectedAttempts: number;
  costPerAttempt: number;
  expectedCost: number;
};

export function estimateExpectedAttempts(probability: number): number {
  if (probability <= 0) {
    throw new Error("Probability must be greater than 0.");
  }

  return 1 / probability;
}

export function estimateAffixCost(
  pool: CraftedPool,
  target: AffixTarget,
  costPerAttempt: number,
): CostEstimate {
  const found = findTierProbability(pool, target);
  const expectedAttempts = estimateExpectedAttempts(found.probability ?? 0);

  return {
    group: found.group,
    affixId: found.affixId,
    affixName: found.affixName,
    tier: found.tier,
    probability: found.probability,
    expectedAttempts,
    costPerAttempt,
    expectedCost: expectedAttempts * costPerAttempt,
  };
}

export function estimateMultipleAffixCosts(
  pool: CraftedPool,
  targets: AffixTarget[],
  costPerAttempt: number,
) {
  const estimates = targets.map((target) =>
    estimateAffixCost(pool, target, costPerAttempt),
  );

  // Each target is treated as an independent roll. If the game rolls multiple
  // affixes in a single attempt, this overstates the total attempts needed.
  const totalExpectedCost = estimates.reduce(
    (sum, estimate) => sum + estimate.expectedCost,
    0,
  );

  const totalExpectedAttempts = estimates.reduce(
    (sum, estimate) => sum + estimate.expectedAttempts,
    0,
  );

  return {
    estimates,
    totalExpectedAttempts,
    totalExpectedCost,
  };
}