import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json(null);
  const tree = await prisma.pactSpiritTree.findUnique({ where: { name } });
  return NextResponse.json(tree);
}
