import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");

  const spirits = await prisma.pactSpirit.findMany({
    where:
      category === "battle" ? { NOT: { type: "Drop" } } :
      category === "drop"   ? { type: "Drop" }           :
      {},
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(spirits);
}
