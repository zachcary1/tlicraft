import prisma from "@/db/prisma";

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