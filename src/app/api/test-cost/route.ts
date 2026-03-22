import { NextResponse } from "next/server";
import { getCraftedPool } from "@/services/crafting/pool-loader";
import { transformCraftedPool } from "@/services/crafting/pool-transformer";
import { estimateMultipleAffixCosts } from "@/services/crafting/cost-estimator";

export async function GET() {
  const rawPool = await getCraftedPool("crafted_str_helmet");

  if (!rawPool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const pool = transformCraftedPool(rawPool);

  const result = estimateMultipleAffixCosts(
    pool,
    [
      {
        group: "BASIC_PREFIXES",
        affixId: "crafted_str_helmet__basic_prefix__max_life",
        tier: "T1",
      },
      {
        group: "BASIC_SUFFIXES",
        affixId: "crafted_str_helmet__basic_suffix__fire_resistance",
        tier: "T2",
      },
    ],
    5,
  );

  return NextResponse.json(result);
}