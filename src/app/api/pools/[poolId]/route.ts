import { NextResponse } from "next/server";
import { getCraftedPool } from "@/services/crafting/pool-loader";
import { transformCraftedPool } from "@/services/crafting/pool-transformer";

type RouteContext = {
  params: Promise<{
    poolId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { poolId } = await context.params;

  const pool = await getCraftedPool(poolId);

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  return NextResponse.json(transformCraftedPool(pool));
}