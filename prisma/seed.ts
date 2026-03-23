import prisma from "../src/db/prisma";

async function main() {
  const baseItemCategories = [
    { id: "helmet", name: "Helmet" },
    { id: "chest", name: "Chest" },
    { id: "necklace", name: "Necklace" },
    { id: "gloves", name: "Gloves" },
    { id: "belt", name: "Belt" },
    { id: "boots", name: "Boots" },
    { id: "ring", name: "Ring" },
    { id: "spirit_ring", name: "Spirit Ring" },
    { id: "one_hand_weapon", name: "One-Handed Weapon" },
    { id: "two_hand_weapon", name: "Two-Handed Weapon" },
    { id: "shield", name: "Shield" },
  ] as const;

  for (const category of baseItemCategories) {
    await prisma.baseItemCategory.upsert({
      where: { id: category.id },
      update: { name: category.name },
      create: {
        id: category.id,
        name: category.name,
      },
    });
  }

const weaponTypes = [
  { id: "claw", name: "Claw", baseItemCategoryId: "one_hand_weapon" },
  { id: "dagger", name: "Dagger", baseItemCategoryId: "one_hand_weapon" },
  { id: "one_hand_sword", name: "One-Handed Sword", baseItemCategoryId: "one_hand_weapon" },
  { id: "one_hand_hammer", name: "One-Handed Hammer", baseItemCategoryId: "one_hand_weapon" },
  { id: "one_hand_axe", name: "One-Handed Axe", baseItemCategoryId: "one_hand_weapon" },
  { id: "two_hand_sword", name: "Two-Handed Sword", baseItemCategoryId: "two_hand_weapon" },
  { id: "two_hand_hammer", name: "Two-Handed Hammer", baseItemCategoryId: "two_hand_weapon" },
  { id: "two_hand_axe", name: "Two-Handed Axe", baseItemCategoryId: "two_hand_weapon" },
  { id: "wand", name: "Wand", baseItemCategoryId: "one_hand_weapon" },
  { id: "rod", name: "Rod", baseItemCategoryId: "one_hand_weapon" },
  { id: "scepter", name: "Scepter", baseItemCategoryId: "one_hand_weapon" },
  { id: "cane", name: "Cane", baseItemCategoryId: "one_hand_weapon" },
  { id: "tin_staff", name: "Tin Staff", baseItemCategoryId: "two_hand_weapon" },
  { id: "cudgel", name: "Cudgel", baseItemCategoryId: "two_hand_weapon" },
  { id: "pistol", name: "Pistol", baseItemCategoryId: "one_hand_weapon" },
  { id: "bow", name: "Bow", baseItemCategoryId: "two_hand_weapon" },
  { id: "crossbow", name: "Crossbow", baseItemCategoryId: "two_hand_weapon" },
  { id: "musket", name: "Musket", baseItemCategoryId: "two_hand_weapon" },
  { id: "fire_cannon", name: "Fire Cannon", baseItemCategoryId: "two_hand_weapon" },
] as const;

  for (const weaponType of weaponTypes) {
    await prisma.weaponType.upsert({
      where: { id: weaponType.id },
      update: {
        name: weaponType.name,
        baseItemCategoryId: weaponType.baseItemCategoryId,
      },
      create: {
        id: weaponType.id,
        name: weaponType.name,
        baseItemCategoryId: weaponType.baseItemCategoryId,
      },
    });
  }

  await prisma.craftedItemPool.upsert({
  where: { id: "crafted_str_helmet" },
  update: {},
  create: {
    id: "crafted_str_helmet",
    name: "Crafted STR Helmet",
    baseItemCategoryId: "helmet",
    weaponTypeId: null,
    attributeType: "STR",
    isPriceless: false
  }
});

const craftedStrHelmetGroups = [
  "BASE_AFFIXES",
  "CORROSION_BASE_AFFIXES",
  "SWEET_DREAM_AFFIXES",
  "NIGHTMARE_AFFIXES",
  "INTERMEDIATE_SEQUENCES",
  "ADVANCED_SEQUENCES",
  "BASIC_PREFIXES",
  "ADVANCED_PREFIXES",
  "ULTIMATE_PREFIXES",
  "BASIC_SUFFIXES",
  "ADVANCED_SUFFIXES",
  "ULTIMATE_SUFFIXES",
] as const;

for (const groupType of craftedStrHelmetGroups) {
  await prisma.craftedAffixGroup.upsert({
    where: {
      poolId_groupType: {
        poolId: "crafted_str_helmet",
        groupType,
      },
    },
    update: {},
    create: {
      id: `crafted_str_helmet__${groupType.toLowerCase()}`,
      poolId: "crafted_str_helmet",
      groupType,
    },
  });
}

  const basicPrefixGroup = await prisma.craftedAffixGroup.findUniqueOrThrow({
    where: {
      poolId_groupType: {
        poolId: "crafted_str_helmet",
        groupType: "BASIC_PREFIXES",
      },
    },
  });

  const basicSuffixGroup = await prisma.craftedAffixGroup.findUniqueOrThrow({
    where: {
      poolId_groupType: {
        poolId: "crafted_str_helmet",
        groupType: "BASIC_SUFFIXES",
      },
    },
  });

  const affixes = [
    {
      id: "crafted_str_helmet__basic_prefix__max_life",
      groupId: basicPrefixGroup.id,
      name: "Max Life",
      tiers: [
        {
          id: "crafted_str_helmet__basic_prefix__max_life__t3",
          tier: "T3" as const,
          probability: 0.2,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__max_life__t3__max_life",
              statId: "max_life",
              label: "Max Life",
              minValue: 40,
              maxValue: 55,
              unit: "FLAT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_prefix__max_life__t2",
          tier: "T2" as const,
          probability: 0.08,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__max_life__t2__max_life",
              statId: "max_life",
              label: "Max Life",
              minValue: 56,
              maxValue: 72,
              unit: "FLAT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_prefix__max_life__t1",
          tier: "T1" as const,
          probability: 0.02,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__max_life__t1__max_life",
              statId: "max_life",
              label: "Max Life",
              minValue: 73,
              maxValue: 90,
              unit: "FLAT" as const,
            },
          ],
        },
      ],
    },
    {
      id: "crafted_str_helmet__basic_prefix__armor",
      groupId: basicPrefixGroup.id,
      name: "Armor",
      tiers: [
        {
          id: "crafted_str_helmet__basic_prefix__armor__t3",
          tier: "T3" as const,
          probability: 0.18,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__armor__t3__armor",
              statId: "armor",
              label: "Armor",
              minValue: 45,
              maxValue: 60,
              unit: "FLAT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_prefix__armor__t2",
          tier: "T2" as const,
          probability: 0.07,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__armor__t2__armor",
              statId: "armor",
              label: "Armor",
              minValue: 61,
              maxValue: 80,
              unit: "FLAT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_prefix__armor__t1",
          tier: "T1" as const,
          probability: 0.015,
          stats: [
            {
              id: "crafted_str_helmet__basic_prefix__armor__t1__armor",
              statId: "armor",
              label: "Armor",
              minValue: 81,
              maxValue: 100,
              unit: "FLAT" as const,
            },
          ],
        },
      ],
    },
    {
      id: "crafted_str_helmet__basic_suffix__fire_resistance",
      groupId: basicSuffixGroup.id,
      name: "Fire Resistance",
      tiers: [
        {
          id: "crafted_str_helmet__basic_suffix__fire_resistance__t3",
          tier: "T3" as const,
          probability: 0.16,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__fire_resistance__t3__fire_resistance",
              statId: "fire_resistance",
              label: "Fire Resistance",
              minValue: 12,
              maxValue: 16,
              unit: "PERCENT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_suffix__fire_resistance__t2",
          tier: "T2" as const,
          probability: 0.06,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__fire_resistance__t2__fire_resistance",
              statId: "fire_resistance",
              label: "Fire Resistance",
              minValue: 17,
              maxValue: 21,
              unit: "PERCENT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_suffix__fire_resistance__t1",
          tier: "T1" as const,
          probability: 0.02,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__fire_resistance__t1__fire_resistance",
              statId: "fire_resistance",
              label: "Fire Resistance",
              minValue: 22,
              maxValue: 26,
              unit: "PERCENT" as const,
            },
          ],
        },
      ],
    },
    {
      id: "crafted_str_helmet__basic_suffix__cold_resistance",
      groupId: basicSuffixGroup.id,
      name: "Cold Resistance",
      tiers: [
        {
          id: "crafted_str_helmet__basic_suffix__cold_resistance__t3",
          tier: "T3" as const,
          probability: 0.16,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__cold_resistance__t3__cold_resistance",
              statId: "cold_resistance",
              label: "Cold Resistance",
              minValue: 12,
              maxValue: 16,
              unit: "PERCENT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_suffix__cold_resistance__t2",
          tier: "T2" as const,
          probability: 0.06,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__cold_resistance__t2__cold_resistance",
              statId: "cold_resistance",
              label: "Cold Resistance",
              minValue: 17,
              maxValue: 21,
              unit: "PERCENT" as const,
            },
          ],
        },
        {
          id: "crafted_str_helmet__basic_suffix__cold_resistance__t1",
          tier: "T1" as const,
          probability: 0.02,
          stats: [
            {
              id: "crafted_str_helmet__basic_suffix__cold_resistance__t1__cold_resistance",
              statId: "cold_resistance",
              label: "Cold Resistance",
              minValue: 22,
              maxValue: 26,
              unit: "PERCENT" as const,
            },
          ],
        },
      ],
    },
  ] as const;

  for (const affix of affixes) {
    await prisma.craftedAffix.upsert({
      where: { id: affix.id },
      update: {
        name: affix.name,
        groupId: affix.groupId,
      },
      create: {
        id: affix.id,
        name: affix.name,
        groupId: affix.groupId,
      },
    });

    for (const tier of affix.tiers) {
      await prisma.craftedAffixTier.upsert({
        where: {
          affixId_tier: {
            affixId: affix.id,
            tier: tier.tier,
          },
        },
        update: {
        },
        create: {
          id: tier.id,
          affixId: affix.id,
          tier: tier.tier,
        },
      });

      for (const stat of tier.stats) {
        await prisma.craftedAffixTierStat.upsert({
          where: { id: stat.id },
          update: {
            statId: stat.statId,
            label: stat.label,
            minValue: stat.minValue,
            maxValue: stat.maxValue,
            unit: stat.unit,
          },
          create: {
            id: stat.id,
            tierId: tier.id,
            statId: stat.statId,
            label: stat.label,
            minValue: stat.minValue,
            maxValue: stat.maxValue,
            unit: stat.unit,
          },
        });
      }
    }
  }



  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });