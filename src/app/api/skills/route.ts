import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const tag = searchParams.get("tag");

  const types = searchParams.get("types")?.split(",").filter(Boolean);

  const skills = await prisma.skill.findMany({
    where: {
      ...(types?.length ? { type: { in: types } } : type ? { type } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(skills);
}
