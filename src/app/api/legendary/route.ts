import { NextResponse } from "next/server";
import prisma from "@/db/prisma";

export async function GET() {
  try {
    const items = await prisma.legendary.findMany({
      orderBy: [{ category: "asc" }, { item: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch legendary items." }, { status: 500 });
  }
}
