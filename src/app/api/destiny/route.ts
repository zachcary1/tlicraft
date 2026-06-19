import { NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET() {
  const entries = await prisma.destiny.findMany({
    where: { type: { not: "Undetermined Fate" } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(entries);
}
