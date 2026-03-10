import { NextResponse } from "next/server";
import { getCraftedPool } from "@/services/crafting/pool-loader";
import { transformCraftedPool } from "@/services/crafting/pool-transformer";

type RouteContext = {
  params: Promise<{
    poolId: string;
  }>;
};

type SelectableAffix = {
  id: string;
  name: string;
  tiers: string[];
};

export async function GET(_: Request, context: RouteContext) {
  const { poolId } = await context.params;

  const rawPool = await getCraftedPool(poolId);

  if (!rawPool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const pool = transformCraftedPool(rawPool);

  const mapAffixes = (affixes: { id: string; name: string; tiers: { tier: string }[] }[]): SelectableAffix[] =>
    affixes.map((affix) => ({
      id: affix.id,
      name: affix.name,
      tiers: affix.tiers.map((tier) => tier.tier),
    }));

  return NextResponse.json({
    poolId: pool.id,
    name: pool.name,
    attributeType: pool.attributeType,
    isPriceless: pool.isPriceless,
    groups: {
      baseAffixes: mapAffixes(pool.groups.baseAffixes),
      corrosionBaseAffixes: mapAffixes(pool.groups.corrosionBaseAffixes),
      sweetDreamAffixes: mapAffixes(pool.groups.sweetDreamAffixes),
      nightmareAffixes: mapAffixes(pool.groups.nightmareAffixes),
      intermediateSequences: mapAffixes(pool.groups.intermediateSequences),
      advancedSequences: mapAffixes(pool.groups.advancedSequences),
      basicPrefixes: mapAffixes(pool.groups.basicPrefixes),
      advancedPrefixes: mapAffixes(pool.groups.advancedPrefixes),
      ultimatePrefixes: mapAffixes(pool.groups.ultimatePrefixes),
      basicSuffixes: mapAffixes(pool.groups.basicSuffixes),
      advancedSuffixes: mapAffixes(pool.groups.advancedSuffixes),
      ultimateSuffixes: mapAffixes(pool.groups.ultimateSuffixes),
    },
  });
}