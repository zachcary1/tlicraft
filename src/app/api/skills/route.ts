import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const tag = searchParams.get("tag");

  const skills = await prisma.skill.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(skills);
}
