import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import prisma from "../src/db/prisma";

const DIR = path.join(process.cwd(), "data", "crafted", "torchcodex");

async function readJson<T>(name: string): Promise<T[]> {
  const raw = await readFile(path.join(DIR, `${name}.json`), "utf8");
  return JSON.parse(raw) as T[];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ── Blend ──────────────────────────────────────────────────────────────────────

async function importBlend() {
  const rows = await readJson<{ type: string; name?: string; effect: string }>("blend");
  await prisma.blend.deleteMany({ where: { id: { startsWith: "blend_" } } });
  await prisma.blend.createMany({
    data: rows.map((r, i) => ({
      id: `blend_${i}`,
      type: r.type,
      name: r.name ?? "",
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} blend entries.`);
}

// ── Destiny ────────────────────────────────────────────────────────────────────

async function importDestiny() {
  const rows = await readJson<{ type: string; name?: string; effect: string }>("destiny");
  await prisma.destiny.deleteMany({ where: { id: { startsWith: "destiny_" } } });
  await prisma.destiny.createMany({
    data: rows.map((r, i) => ({
      id: `destiny_${i}`,
      type: r.type,
      name: r.name ?? "",
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} destiny entries.`);
}

// ── Ethereal Prism ─────────────────────────────────────────────────────────────

async function importEtherealPrism() {
  const rows = await readJson<{ type?: string; rarity?: string; effect: string }>("etherealPrism");
  await prisma.etherealPrism.deleteMany({ where: { id: { startsWith: "ethereal_prism_" } } });
  await prisma.etherealPrism.createMany({
    data: rows.map((r, i) => ({
      id: `ethereal_prism_${i}`,
      type: r.type ?? "",
      rarity: r.rarity ?? "",
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} ethereal prism entries.`);
}

// ── Gear Affixes ───────────────────────────────────────────────────────────────

async function importGearAffixes() {
  const rows = await readJson<{
    category: string;
    item: string;
    "item-group": string;
    type: string;
    pool: string;
    tier: string | undefined;
    effect: string;
  }>("gear");
  await prisma.gearAffix.deleteMany({ where: { id: { startsWith: "gear_affix_" } } });
  await prisma.gearAffix.createMany({
    data: rows.map((r, i) => ({
      id: `gear_affix_${i}`,
      category: r.category ?? "",
      item: r.item ?? "",
      itemGroup: r["item-group"] ?? "",
      type: r.type ?? "",
      pool: r.pool ?? "",
      tier: r.tier ?? "",
      effect: r.effect ?? "",
    })),
  });
  console.log(`Imported ${rows.length} gear affix entries.`);
}

// ── Hero Memory ────────────────────────────────────────────────────────────────

async function importHeroMemory() {
  const rows = await readJson<{ type?: string; item?: string; effect: string }>("heroMemory");
  await prisma.heroMemory.deleteMany({ where: { id: { startsWith: "hero_memory_" } } });
  await prisma.heroMemory.createMany({
    data: rows.map((r, i) => ({
      id: `hero_memory_${i}`,
      type: r.type ?? "",
      item: r.item ?? "",
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} hero memory entries.`);
}

// ── Hero Trait ─────────────────────────────────────────────────────────────────

async function importHeroTrait() {
  const rows = await readJson<{
    "hero-group": string;
    hero: string;
    name?: string;
    level: number;
    effect: string;
  }>("heroTrait");
  await prisma.heroTrait.deleteMany({ where: { id: { startsWith: "hero_trait_" } } });
  await prisma.heroTrait.createMany({
    data: rows.map((r, i) => ({
      id: `hero_trait_${i}`,
      heroGroup: r["hero-group"] ?? "",
      hero: r.hero ?? "",
      name: r.name ?? "",
      level: r.level,
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} hero trait entries.`);
}

// ── Legendary ──────────────────────────────────────────────────────────────────

async function importLegendary() {
  const rows = await readJson<{
    category?: string;
    item?: string;
    name?: string;
    affixes?: string;
  }>("legendary");
  await prisma.legendary.deleteMany({ where: { id: { startsWith: "legendary_" } } });
  await prisma.legendary.createMany({
    data: rows.map((r, i) => ({
      id: `legendary_${i}`,
      category: r.category ?? "",
      item: r.item ?? "",
      name: r.name ?? "",
      affixes: r.affixes ?? "",
    })),
  });
  console.log(`Imported ${rows.length} legendary entries.`);
}

// ── Pact Spirit ────────────────────────────────────────────────────────────────

const BATTLE_PACTSPIRIT_TYPES = new Set(["Attack", "Spell", "Persistent", "Summon", "Survival", "Lightning", "Fire", "Cold", "Erosion", "Elixir"]);

async function importPactSpirit() {
  const rows = await readJson<{ type: string; rarity: string; name: string; tags?: string[]; effect: string }>("pactspirit");
  await prisma.pactSpirit.deleteMany({ where: { id: { startsWith: "pactspirit_" } } });
  await prisma.pactSpirit.createMany({
    data: rows.map((r) => ({
      id: `pactspirit_${slugify(r.name)}`,
      type: r.type,
      rarity: r.rarity,
      name: r.name,
      tags: r.tags ?? (BATTLE_PACTSPIRIT_TYPES.has(r.type) ? [r.type] : []),
      effect: r.effect,
    })),
  });
  console.log(`Imported ${rows.length} pact spirit entries.`);
}

// ── Talent ─────────────────────────────────────────────────────────────────────

async function importTalent() {
  const rows = await readJson<{
    god: string;
    tree: string;
    type: string;
    name: string;
    effect: string;
  }>("talent");
  await prisma.talent.deleteMany({ where: { id: { startsWith: "talent_" } } });
  await prisma.talent.createMany({
    data: rows.map((r, i) => ({
      id: `talent_${i}`,
      god: r.god ?? "",
      tree: r.tree ?? "",
      type: r.type ?? "",
      name: r.name ?? "",
      effect: r.effect ?? "",
    })),
  });
  console.log(`Imported ${rows.length} talent entries.`);
}

// ── Memory Revival ─────────────────────────────────────────────────────────────

async function importMemoryRevival() {
  const rows = await readJson<{ type: string; name: string; hero?: string; effect: string }>("memoryRevival");
  await prisma.memoryRevival.deleteMany({ where: { id: { startsWith: "memory_revival_" } } });
  await prisma.memoryRevival.createMany({
    data: rows.map((r, i) => ({
      id: `memory_revival_${i}`,
      type: r.type ?? "",
      name: r.name ?? "",
      hero: r.hero ?? "",
      effect: r.effect ?? "",
    })),
  });
  console.log(`Imported ${rows.length} memory revival entries.`);
}

// ── Renewed Memory ─────────────────────────────────────────────────────────────

async function importRenewedMemory() {
  const rows = await readJson<{ type: string; name: string; hero?: string; effect: string }>("renewedMemory");
  await prisma.renewedMemory.deleteMany({ where: { id: { startsWith: "renewed_memory_" } } });
  await prisma.renewedMemory.createMany({
    data: rows.map((r, i) => ({
      id: `renewed_memory_${i}`,
      type: r.type ?? "",
      name: r.name ?? "",
      hero: r.hero ?? "",
      effect: r.effect ?? "",
    })),
  });
  console.log(`Imported ${rows.length} renewed memory entries.`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await importBlend();
  await importDestiny();
  await importEtherealPrism();
  await importGearAffixes();
  await importHeroMemory();
  await importHeroTrait();
  await importLegendary();
  await importMemoryRevival();
  await importPactSpirit();
  await importRenewedMemory();
  await importTalent();
  console.log("Torchcodex import complete.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error("Torchcodex import failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
