import type { RollCandidate } from "./types";

export function rollCandidateByProbability(
  candidates: RollCandidate[],
): RollCandidate {
  if (candidates.length === 0) {
    throw new Error("No roll candidates were provided.");
  }

  const totalProbability = candidates.reduce(
    (sum, candidate) => sum + (candidate.probability ?? 0),
    0,
  );

  if (totalProbability <= 0) {
    throw new Error("Total probability must be greater than 0.");
  }

  const roll = Math.random() * totalProbability;
  let runningTotal = 0;

  for (const candidate of candidates) {
    runningTotal += candidate.probability ?? 0;

    if (roll <= runningTotal) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}