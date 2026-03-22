import { flattenAffixesToCandidates } from "./affix-selector";
import { rollCandidateByProbability } from "./random";
import type { CraftedPool, RollCandidate } from "./types";

export function rollBasicPrefix(pool: CraftedPool): RollCandidate {
  const candidates = flattenAffixesToCandidates(pool.groups.BASIC_PREFIXES);

  return rollCandidateByProbability(candidates);
}