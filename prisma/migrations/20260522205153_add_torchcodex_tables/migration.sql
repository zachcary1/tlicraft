-- CreateTable
CREATE TABLE "Blend" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "Blend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destiny" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "Destiny_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtherealPrism" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "EtherealPrism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GearAffix" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "itemGroup" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pool" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "GearAffix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroMemory" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "HeroMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroTrait" (
    "id" TEXT NOT NULL,
    "heroGroup" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "HeroTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legendary" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "affixes" TEXT NOT NULL,

    CONSTRAINT "Legendary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PactSpirit" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "PactSpirit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "god" TEXT NOT NULL,
    "tree" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blend_type_idx" ON "Blend"("type");

-- CreateIndex
CREATE INDEX "Destiny_type_idx" ON "Destiny"("type");

-- CreateIndex
CREATE INDEX "EtherealPrism_type_idx" ON "EtherealPrism"("type");

-- CreateIndex
CREATE INDEX "GearAffix_category_idx" ON "GearAffix"("category");

-- CreateIndex
CREATE INDEX "GearAffix_item_idx" ON "GearAffix"("item");

-- CreateIndex
CREATE INDEX "GearAffix_type_idx" ON "GearAffix"("type");

-- CreateIndex
CREATE INDEX "HeroMemory_type_idx" ON "HeroMemory"("type");

-- CreateIndex
CREATE INDEX "HeroMemory_item_idx" ON "HeroMemory"("item");

-- CreateIndex
CREATE INDEX "HeroTrait_heroGroup_idx" ON "HeroTrait"("heroGroup");

-- CreateIndex
CREATE INDEX "HeroTrait_hero_idx" ON "HeroTrait"("hero");

-- CreateIndex
CREATE INDEX "Legendary_category_idx" ON "Legendary"("category");

-- CreateIndex
CREATE INDEX "Legendary_item_idx" ON "Legendary"("item");

-- CreateIndex
CREATE INDEX "PactSpirit_type_idx" ON "PactSpirit"("type");

-- CreateIndex
CREATE INDEX "PactSpirit_rarity_idx" ON "PactSpirit"("rarity");

-- CreateIndex
CREATE INDEX "Talent_god_idx" ON "Talent"("god");

-- CreateIndex
CREATE INDEX "Talent_tree_idx" ON "Talent"("tree");

-- CreateIndex
CREATE INDEX "Talent_type_idx" ON "Talent"("type");
