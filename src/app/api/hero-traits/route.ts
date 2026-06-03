import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hero = searchParams.get("hero");

  if (hero) {
    const traits = await prisma.heroTrait.findMany({
      where: { hero },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(traits);
  }

  // Default: return deduplicated hero list
  const all = await prisma.heroTrait.findMany({
    select: { heroGroup: true, hero: true },
    orderBy: [{ heroGroup: "asc" }, { hero: "asc" }],
  });
  const seen = new Set<string>();
  const heroes = all.filter((t) => {
    if (seen.has(t.hero)) return false;
    seen.add(t.hero);
    return true;
  });
  return NextResponse.json(heroes);
}
