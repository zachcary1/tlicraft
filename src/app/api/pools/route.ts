import { NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET() {
  try {
    const pools = await prisma.craftedItemPool.findMany({
      select: {
        id: true,
        name: true,
        attributeType: true,
        baseItemCategory: {
          select: { id: true, name: true },
        },
        weaponType: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ baseItemCategory: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json(pools);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch pools." }, { status: 500 });
  }
}
