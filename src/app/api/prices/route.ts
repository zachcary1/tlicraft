import { NextRequest, NextResponse } from "next/server";
import { PricedItemType } from "@prisma/client";
import prisma from "@/db/prisma";

const VALID_TYPES = new Set<string>(Object.values(PricedItemType));

export async function GET(req: NextRequest) {
  const itemTypes = req.nextUrl.searchParams
    .getAll("itemType")
    .filter((t): t is PricedItemType => VALID_TYPES.has(t));

  if (itemTypes.length === 0) return NextResponse.json([]);

  const rows = await prisma.price.findMany({
    where: { itemType: { in: itemTypes } },
    orderBy: { recordedAt: "desc" },
  });

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.itemType}:${row.itemId}`;
    if (!latest.has(key)) latest.set(key, row);
  }

  return NextResponse.json([...latest.values()]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { itemType, itemId, itemName, value, currency } = body ?? {};

  if (!VALID_TYPES.has(itemType))
    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  if (typeof itemId !== "string" || !itemId)
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  if (typeof itemName !== "string" || !itemName)
    return NextResponse.json({ error: "Invalid itemName" }, { status: 400 });
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  if (currency !== undefined && (typeof currency !== "string" || !currency))
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });

  const row = await prisma.price.create({
    data: {
      itemType,
      itemId,
      itemName,
      value,
      ...(currency ? { currency } : {}),
    },
  });

  return NextResponse.json(row);
}
