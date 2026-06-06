import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const item = searchParams.get("item");
  const type = searchParams.get("type");

  const affixes = await prisma.heroMemory.findMany({
    where: {
      ...(item ? { item } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { effect: "asc" },
  });
  return NextResponse.json(affixes);
}
