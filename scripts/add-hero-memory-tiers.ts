import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "crafted", "torchcodex", "heroMemory.json");

function parseEffect(html: string): string {
  return html
    .replace(/ data-title="[^"]*"/g, "")
    .replace(/<span[^>]*class="val"[^>]*>/g, "")
    .replace(/<\/span>/g, "")
    .replace(/<[^>]+>/g, " ")   // space instead of empty string to preserve word boundaries
    .replace(/\s+/g, " ")
    .trim();
}

const TIER_MAP: Record<string, string> = {
  // damage
  "+(20–28)% damage": "T3", "+(30–42)% damage": "T2", "+(44–52)% damage": "T1",
  "+(20–28)% Minion Damage": "T3", "+(30–42)% Minion Damage": "T2", "+(44–52)% Minion Damage": "T1",
  "+(58–68)% Attack Damage": "T1", "+(58–68)% Cold Damage": "T1",
  "+(58–68)% Damage Over Time": "T1", "+(58–68)% Erosion Damage": "T1",
  "+(58–68)% Fire Damage": "T1", "+(58–68)% Lightning Damage": "T1",
  "+(58–68)% Minion Damage": "T1", "+(58–68)% Physical Damage": "T1",
  "+(58–68)% Spell Damage": "T1",
  // speed
  "+6% Attack Speed": "T3", "+10% Attack Speed": "T2", "+16% Attack Speed": "T1",
  "+6% Cast Speed": "T3", "+10% Cast Speed": "T2", "+16% Cast Speed": "T1",
  "+6% Minion Attack Speed": "T3", "+10% Minion Attack Speed": "T2", "+16% Minion Attack Speed": "T1",
  "+6% Minion Cast Speed": "T3", "+10% Minion Cast Speed": "T2", "+16% Minion Cast Speed": "T1",
  "+(18–22)% Movement Speed": "T1",
  "+10% Cooldown Recovery Speed": "T1",
  "+18% Attack and Cast Speed +18% Minion Attack and Cast Speed": "T1",
  "+(25–32)% Focus Speed": "T1",
  // area / projectile
  "+15% Skill Area": "T3", "+23% Skill Area": "T2", "+32% Skill Area": "T1", "+(39–45)% Skill Area": "T0",
  "+16% Projectile Speed": "T3", "+24% Projectile Speed": "T2", "+30% Projectile Speed": "T1", "+52% Projectile Speed": "T0",
  // crit rating
  "+40% Critical Strike Rating": "T3", "+60% Critical Strike Rating": "T2", "+80% Critical Strike Rating": "T1",
  "+40% Minion Critical Strike Rating": "T3", "+60% Minion Critical Strike Rating": "T2",
  "+80% Minion Critical Strike Rating": "T1", "+104% Minion Critical Strike Rating": "T0",
  "+104% Attack Critical Strike Rating": "T1", "+104% Spell Critical Strike Rating": "T1",
  // crit damage
  "+(12–18)% Critical Strike Damage": "T3", "+(20–26)% Critical Strike Damage": "T2", "+(38–42)% Critical Strike Damage": "T1",
  "+(46–58)% attack Critical Strike Damage": "T1", "+(46–58)% Spell Critical Strike Damage": "T1",
  "+(12–18)% Minion Critical Strike Damage": "T3", "+(20–26)% Minion Critical Strike Damage": "T2",
  "+(28–31)% Minion Critical Strike Damage": "T1", "+(55–65)% Minion Critical Strike Damage": "T0",
  "+(55–65)% Cold Skill Critical Strike Damage": "T1", "+(55–65)% Erosion Skill Critical Strike Damage": "T1",
  "+(55–65)% Fire Skill Critical Strike Damage": "T1", "+(55–65)% Lightning Skill Critical Strike Damage": "T1",
  "+(55–65)% Physical Skill Critical Strike Damage": "T1",
  // combo
  "+(10–12)% additional Attack and Cast Speed for Combo Starters +(31–40)% Critical Strike Damage for Combo Finishers": "T1",
  // defenses
  "+(4–6)% Max Life": "T3", "+(6–8)% Max Life": "T2", "+(10–14)% Max Life": "T1", "+(14–20)% Max Life": "T0",
  "+(4–6)% Max Energy Shield": "T3", "+(6–8)% Max Energy Shield": "T2", "+(10–14)% Max Energy Shield": "T1", "+(14–20)% Max Energy Shield": "T0",
  "+(12–18)% Armor": "T3", "+(20–25)% Armor": "T2", "+(26–30)% Armor": "T1", "+(40–46)% Armor": "T0",
  "+(12–18)% Evasion": "T3", "+(20–25)% Evasion": "T2", "+(26–30)% Evasion": "T1", "+(40–46)% Evasion": "T0",
  "+(22–27)% Max Mana": "T1",
  "+(6–9)% Attack Block Chance": "T3", "+(10–14)% Attack Block Chance": "T2", "+(15–21)% Attack Block Chance": "T1", "+(25–31)% Attack Block Chance": "T0",
  "+(6–9)% Spell Block Chance": "T3", "+(10–14)% Spell Block Chance": "T2", "+(15–21)% Spell Block Chance": "T1", "+(25–31)% Spell Block Chance": "T0",
  // resistances
  "+(2–4)% Max Cold Resistance": "T1", "+(2–4)% Max Fire Resistance": "T1",
  "+(2–4)% Max Lightning Resistance": "T1", "+(2–4)% Max Erosion Resistance": "T1",
  // affliction / reaping
  "+(10–12)% Affliction Effect": "T3", "+(14–18)% Affliction Effect": "T2",
  "+(20–30)% Affliction Effect": "T1", "+(26–40)% Affliction Effect": "T0",
  "+(10–12)% Reaping Recovery Speed": "T3", "+(14–22)% Reaping Recovery Speed": "T2",
  "+(24–32)% Reaping Recovery Speed": "T1", "+(26–40)% Reaping Recovery Speed": "T0",
  // misc
  "(-60–-40)% Curse effect against you": "T1",
  "+(26–30)% chance to avoid Elemental Ailments": "T1",
  "+2 to Hero Trait Level": "T1",
  "+(18–23)% Origin of Spirit Magus effect": "T1",
  // immunities
  "Immune to Blinding": "T1",
  "Immune to Ignite Damage -100% Ignite Effect received": "T1",
  "Immune to Paralysis": "T1",
  "Immune to Slow": "T1",
  "Immune to Trauma Damage": "T1",
  "Immune to Weaken": "T1",
  "Immune to Wilt Damage": "T1",
};

async function main() {
  const raw = await readFile(FILE, "utf8");
  const rows: Array<{ type: string; item: string; effect: string; tier?: string }> = JSON.parse(raw);

  let assigned = 0;
  const unmatched = new Set<string>();

  const updated = rows.map((row) => {
    const text = parseEffect(row.effect);
    const tier = TIER_MAP[text] ?? null;
    if (tier) assigned++;
    else if (row.type !== "Base Stats") unmatched.add(text);
    return tier ? { ...row, tier } : { ...row, tier: "" };
  });

  await writeFile(FILE, JSON.stringify(updated, null, 2), "utf8");

  console.log(`Done. Assigned tiers: ${assigned} / ${rows.length}`);
  if (unmatched.size) {
    console.log(`\nUnmatched non-base-stats effects (${unmatched.size}):`);
    for (const t of [...unmatched].sort()) console.log("  " + t);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
