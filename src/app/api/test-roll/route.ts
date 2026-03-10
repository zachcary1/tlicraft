import { NextResponse } from "next/server";
import { getCraftedPool } from "@/services/crafting/pool-loader";
import { transformCraftedPool } from "@/services/crafting/pool-transformer";
import { rollBasicPrefix } from "@/services/crafting/roll-prefix";

export async function GET() {
  const rawPool = await getCraftedPool("crafted_str_helmet");

  if (!rawPool) {
    return NextResponse.json(
      { error: "Pool not found" },
      { status: 404 },
    );
  }

  const pool = transformCraftedPool(rawPool);
  const result = rollBasicPrefix(pool);

  return NextResponse.json(result);
}