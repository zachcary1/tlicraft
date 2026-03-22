import { AffixGroupType } from "@prisma/client";

export { AffixGroupType };

export type StatUnit = "PERCENT" | "FLAT" | "NONE";

export type PoolStat = {
  statId: string;
  label: string;
  minValue: number;
  maxValue: number;
  unit: StatUnit;
};

export type PoolTier = {
  tier: string;
  probability?: number;
  stats: PoolStat[];
};

export type PoolAffix = {
  id: string;
  name: string;
  tiers: PoolTier[];
};

export type CraftedPoolGroups = Record<AffixGroupType, PoolAffix[]>;

export type CraftedPool = {
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
  groups: CraftedPoolGroups;
};

export type RollCandidate = {
  affixId: string;
  affixName: string;
  tier: string;
  probability?: number;
  stats: PoolStat[];
};