import prisma from "@/db/prisma";

export async function getCraftedPoolAffixes(poolId: string) {
  return prisma.craftedItemPool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      name: true,
      attributeType: true,
      isPriceless: true,
      affixGroups: {
        select: {
          groupType: true,
          affixes: {
            select: {
              id: true,
              name: true,
              tiers: {
                select: { tier: true },
                orderBy: { tier: "asc" },
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { groupType: "asc" },
      },
    },
  });
}

export async function getCraftedPool(poolId: string) {
  const pool = await prisma.craftedItemPool.findUnique({
    where: { id: poolId },
    include: {
      affixGroups: {
        include: {
          affixes: {
            include: {
              tiers: {
                include: {
                  stats: true,
                },
                orderBy: {
                  tier: "asc",
                },
              },
            },
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: {
          groupType: "asc",
        },
      },
      baseItemCategory: true,
      weaponType: true,
    },
  });

  return pool;
}