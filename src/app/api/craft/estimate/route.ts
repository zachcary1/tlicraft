import { NextResponse } from "next/server";
import { getCraftedPool } from "@/services/crafting/pool-loader";
import { transformCraftedPool } from "@/services/crafting/pool-transformer";
import { estimateMultipleAffixCosts } from "@/services/crafting/cost-estimator";
import type { AffixTarget } from "@/services/crafting/probability-lookup";

type EstimateRequest = {
  poolId: string;
  costPerAttempt: number;
  targets: AffixTarget[];
};

export async function POST(req: Request) {
  try {
    const body: EstimateRequest = await req.json();

    const { poolId, costPerAttempt, targets } = body;

    if (
      typeof poolId !== "string" ||
      !poolId ||
      !Array.isArray(targets) ||
      targets.length === 0 ||
      typeof costPerAttempt !== "number" ||
      costPerAttempt <= 0 ||
      !isFinite(costPerAttempt)
    ) {
      return NextResponse.json(
        { error: "Invalid request fields." },
        { status: 400 },
      );
    }

    const rawPool = await getCraftedPool(poolId);

    if (!rawPool) {
      return NextResponse.json(
        { error: "Pool not found." },
        { status: 404 },
      );
    }

    const pool = transformCraftedPool(rawPool);

    const result = estimateMultipleAffixCosts(
      pool,
      targets,
      costPerAttempt,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to estimate crafting cost." },
      { status: 500 },
    );
  }
}