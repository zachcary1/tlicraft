-- CreateTable
CREATE TABLE "PactSpiritTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mainSkillName" TEXT NOT NULL,
    "mainSkillEffect" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "upgradeRanks" JSONB NOT NULL,
    "glossary" JSONB NOT NULL,

    CONSTRAINT "PactSpiritTree_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PactSpiritTree_name_key" ON "PactSpiritTree"("name");

-- CreateIndex
CREATE INDEX "PactSpiritTree_name_idx" ON "PactSpiritTree"("name");
