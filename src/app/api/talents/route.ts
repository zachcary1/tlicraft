import { NextResponse } from "next/server";
import prisma from "@/db/prisma";

// Talent ids are "talent_<i>", where i is the row's index in the original scraped
// talent.json. Sorting by that index (rather than alphabetically) preserves the source
// ordering, which groups each god's talents by tree (e.g. for Might: "God of Might",
// "Onslaughter", "The Brave", "Warlord", "Warrior") — needed for the divinity-slates
// affix panel's tree sub-headers.
function talentIndex(id: string): number {
  return parseInt(id.slice(id.lastIndexOf("_") + 1), 10) || 0;
}

export async function GET() {
  const talents = await prisma.talent.findMany();
  talents.sort((a, b) => talentIndex(a.id) - talentIndex(b.id));
  return NextResponse.json(talents);
}
