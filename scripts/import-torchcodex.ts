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
  for (let i = 0; i < rows.length; i++) {
    const { type, name = "", effect } = rows[i];
    const id = `blend_${i}`;
    await prisma.blend.upsert({
      where: { id },
      update: { type, name, effect },
      create: { id, type, name, effect },
    });
  }
  console.log(`Imported ${rows.length} blend entries.`);
}

// ── Destiny ────────────────────────────────────────────────────────────────────

async function importDestiny() {
  const rows = await readJson<{ type: string; name?: string; effect: string }>("destiny");
  for (let i = 0; i < rows.length; i++) {
    const { type, name = "", effect } = rows[i];
    const id = `destiny_${i}`;
    await prisma.destiny.upsert({
      where: { id },
      update: { type, name, effect },
      create: { id, type, name, effect },
    });
  }
  console.log(`Imported ${rows.length} destiny entries.`);
}

// ── Ethereal Prism ─────────────────────────────────────────────────────────────

async function importEtherealPrism() {
  const rows = await readJson<{ type?: string; rarity?: string; effect: string }>("etherealPrism");
  for (let i = 0; i < rows.length; i++) {
    const type = rows[i].type ?? "";
    const rarity = rows[i].rarity ?? "";
    const { effect } = rows[i];
    const id = `ethereal_prism_${i}`;
    await prisma.etherealPrism.upsert({
      where: { id },
      update: { type, rarity, effect },
      create: { id, type, rarity, effect },
    });
  }
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
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = `gear_affix_${i}`;
    const data = {
      category: r.category ?? "",
      item: r.item ?? "",
      itemGroup: r["item-group"] ?? "",
      type: r.type ?? "",
      pool: r.pool ?? "",
      tier: r.tier ?? "",
      effect: r.effect ?? "",
    };
    await prisma.gearAffix.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log(`Imported ${rows.length} gear affix entries.`);
}

// ── Hero Memory ────────────────────────────────────────────────────────────────

async function importHeroMemory() {
  const rows = await readJson<{ type?: string; item?: string; effect: string }>("heroMemory");
  for (let i = 0; i < rows.length; i++) {
    const type = rows[i].type ?? "";
    const item = rows[i].item ?? "";
    const { effect } = rows[i];
    const id = `hero_memory_${i}`;
    await prisma.heroMemory.upsert({
      where: { id },
      update: { type, item, effect },
      create: { id, type, item, effect },
    });
  }
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
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = `hero_trait_${i}`;
    const data = {
      heroGroup: r["hero-group"] ?? "",
      hero: r.hero ?? "",
      name: r.name ?? "",
      level: r.level,
      effect: r.effect,
    };
    await prisma.heroTrait.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
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
  for (let i = 0; i < rows.length; i++) {
    const category = rows[i].category ?? "";
    const item = rows[i].item ?? "";
    const name = rows[i].name ?? "";
    const affixes = rows[i].affixes ?? "";
    const id = `legendary_${i}`;
    await prisma.legendary.upsert({
      where: { id },
      update: { category, item, name, affixes },
      create: { id, category, item, name, affixes },
    });
  }
  console.log(`Imported ${rows.length} legendary entries.`);
}

// ── Pact Spirit ────────────────────────────────────────────────────────────────

async function importPactSpirit() {
  const rows = await readJson<{ type: string; rarity: string; name: string; effect: string }>("pactspirit");
  for (const row of rows) {
    const id = `pactspirit_${slugify(row.name)}`;
    await prisma.pactSpirit.upsert({
      where: { id },
      update: { type: row.type, rarity: row.rarity, name: row.name, effect: row.effect },
      create: { id, type: row.type, rarity: row.rarity, name: row.name, effect: row.effect },
    });
  }
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
  for (let i = 0; i < rows.length; i++) {
    const god = rows[i].god ?? "";
    const tree = rows[i].tree ?? "";
    const type = rows[i].type ?? "";
    const name = rows[i].name ?? "";
    const effect = rows[i].effect ?? "";
    const id = `talent_${i}`;
    await prisma.talent.upsert({
      where: { id },
      update: { god, tree, type, name, effect },
      create: { id, god, tree, type, name, effect },
    });
  }
  console.log(`Imported ${rows.length} talent entries.`);
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
  await importPactSpirit();
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
