import { NextResponse } from "next/server";
import { getCraftedPoolAffixes } from "@/services/crafting/pool-loader";

type RouteContext = {
  params: Promise<{
    poolId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { poolId } = await context.params;

  const pool = await getCraftedPoolAffixes(poolId);

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const groups = Object.fromEntries(
    pool.affixGroups.map((group) => [
      group.groupType,
      group.affixes.map((affix) => ({
        id: affix.id,
        name: affix.name,
        tiers: affix.tiers.map((t) => t.tier),
      })),
    ]),
  );

  return NextResponse.json({
    poolId: pool.id,
    name: pool.name,
    attributeType: pool.attributeType,
    isPriceless: pool.isPriceless,
    groups,
  });
}
