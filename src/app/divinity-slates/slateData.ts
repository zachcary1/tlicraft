// ─── Talent data ────────────────────────────────────────────────────────────────

export type Talent = {
  id: string;
  god: string;
  tree: string;
  type: string; // "Core" | "Legendary Medium" | "Medium" | "Micro"
  name: string;
  effect: string;
};

export type TalentType = "Core" | "Legendary Medium" | "Medium" | "Micro";

export const TALENT_TYPE_LABEL: Record<TalentType, string> = {
  Core: "Core",
  "Legendary Medium": "Legendary Medium",
  Medium: "Medium",
  Micro: "Micro",
};

// Tier-tag diamond color per talent type — Micro borrows the "T3" blue, Medium the "T2"
// purple, and Legendary Medium / Core the "T1" orange already used for tier badges elsewhere
// (crafting/ItemCard.tsx tierTextColor, hero-trait/page.tsx MemoryTierBadge).
export const TALENT_TYPE_TIER_COLOR: Record<TalentType, string> = {
  Micro: "#38bdf8",
  Medium: "#c192ff",
  "Legendary Medium": "#ff7c1c",
  Core: "#ff7c1c",
};

// The "copy" affixes (Prairie, Sparks of Moth Fire, Space Rift) aren't talents, but they're
// all T1-tier — same orange as Legendary Medium / Core.
export const COPY_AFFIX_TIER_COLOR = TALENT_TYPE_TIER_COLOR["Legendary Medium"];

// Returns each distinct `tree` value among `rows`, in the order it first appears — used to
// break a god's (or a pooled list's) affixes down into sub-tree headers (e.g. for Might:
// "God of Might", "Onslaughter", "The Brave", "Warlord", "Warrior").
export function uniqueTreesInOrder(rows: Talent[]): string[] {
  const seen: string[] = [];
  for (const r of rows) if (!seen.includes(r.tree)) seen.push(r.tree);
  return seen;
}

// Flattens a talent's HTML `effect` field (e.g. "<ul><li class=\"mod\">...</li></ul>") into
// plain readable lines, stripping nested tooltip markup — same approach as the pactspirits
// page's parseFateEffectLines.
export function parseTalentEffectLines(html: string): string[] {
  const clean = html.replace(/ data-title="[^"]*"/g, "");
  const liItems = [...clean.matchAll(/<li[^>]*>(.*?)<\/li>/gs)];
  if (liItems.length === 0)
    return [clean.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()];
  return liItems
    .map(([, inner]) => inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ─── Gods / shapes / rotations ───────────────────────────────────────────────────

export const GOD_NAMES = ["Might", "Hunting", "Knowledge", "War", "Deception", "Machines"] as const;
export type GodName = (typeof GOD_NAMES)[number];

export const SHAPES = ["Square", "L", "L Flip", "T", "Z", "Z Flip"] as const;
export type Shape = (typeof SHAPES)[number];

export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rotation = (typeof ROTATIONS)[number];

// ─── Slot definitions ─────────────────────────────────────────────────────────────

export type TalentSlot = {
  key: string;
  label: string;
  kind: "talent";
  allowedTypes: TalentType[];
  god: GodName | "all"; // "all" = pooled across all 6 gods
};

export type ChoiceSlot = {
  key: string;
  label: string;
  kind: "choice";
  options: string[]; // literal selectable text, used directly as the stored value
};

export type Slot = TalentSlot | ChoiceSlot;

function talentSlot(key: string, label: string, allowedTypes: TalentType[], god: GodName | "all"): TalentSlot {
  return { key, label, kind: "talent", allowedTypes, god };
}

// ─── Slate definitions ────────────────────────────────────────────────────────────

export type GodSlateDef = {
  kind: "god";
  name: GodName;
  fixedSlots: TalentSlot[];
  randomSlots: TalentSlot[];
};

// Which rotation values a non-god slate's orientation control offers. A single-element
// list means no rotation control is shown at all.
export type OrientationConfig = {
  rotations: Rotation[];
};

export const NO_ORIENTATION: OrientationConfig = { rotations: [0] };
export const FULL_ROTATION: OrientationConfig = { rotations: [0, 90, 180, 270] };

export type OtherSlateDef = {
  kind: "other";
  name: string;
  displayName?: string; // full in-game name shown on the ItemCard, if different from `name`
  slots: Slot[];
  orientation?: OrientationConfig; // defaults to NO_ORIENTATION when omitted
};

export type SlateDef = GodSlateDef | OtherSlateDef;

export function getOrientationConfig(def: SlateDef): OrientationConfig {
  if (def.kind === "god") return FULL_ROTATION;
  return def.orientation ?? NO_ORIENTATION;
}

export function getSlateDisplayName(def: SlateDef): string {
  return def.kind === "other" ? def.displayName ?? def.name : def.name;
}

function godSlateDef(name: GodName): GodSlateDef {
  return {
    kind: "god",
    name,
    fixedSlots: [
      talentSlot("fixed1", "Fixed Affix 1", ["Micro", "Medium", "Legendary Medium"], name),
      talentSlot("fixed2", "Fixed Affix 2", ["Micro", "Medium", "Legendary Medium"], name),
    ],
    randomSlots: [
      talentSlot("random1", "Random Affix 1", ["Micro", "Medium", "Legendary Medium"], name),
      talentSlot("random2", "Random Affix 2", ["Micro", "Medium", "Legendary Medium"], name),
      talentSlot("random3", "Random Affix 3", ["Micro", "Medium", "Legendary Medium"], name),
    ],
  };
}

const SPARKS_DIRECTIONS = ["above", "on the left", "below", "on the right"] as const;
const SPACE_RIFT_SIDES = ["left", "right"] as const;

export const SLATE_DEFS: Record<string, SlateDef> = {
  ...Object.fromEntries(GOD_NAMES.map((g) => [g, godSlateDef(g)])),

  "Pedigree of Gods": {
    kind: "other",
    name: "Pedigree of Gods",
    slots: [
      talentSlot("slot1", "Affix 1", ["Micro", "Medium", "Legendary Medium"], "all"),
      talentSlot("slot2", "Affix 2", ["Micro", "Medium", "Legendary Medium"], "all"),
      talentSlot("slot3", "Affix 3", ["Medium", "Legendary Medium", "Core"], "all"),
      talentSlot("slot4", "Affix 4", ["Core"], "all"),
    ],
    // Can be rotated 0° or 180°.
    orientation: { rotations: [0, 180] },
  },

  "Corner of Divinity": {
    kind: "other",
    name: "Corner of Divinity",
    slots: [
      talentSlot("slot1", "Affix 1", ["Legendary Medium"], "all"),
      talentSlot("slot2", "Affix 2", ["Legendary Medium"], "all"),
    ],
    // Can be rotated freely (0/90/180/270).
    orientation: FULL_ROTATION,
  },

  "Fallen Starlight": {
    kind: "other",
    name: "Fallen Starlight",
    slots: [
      talentSlot("slot1", "Affix 1", ["Micro"], "all"),
      talentSlot("slot2", "Affix 2", ["Micro"], "all"),
      talentSlot("slot3", "Affix 3", ["Micro", "Medium", "Legendary Medium"], "all"),
      talentSlot("slot4", "Affix 4", ["Medium", "Legendary Medium"], "all"),
    ],
    // Only 0° or 90° rotation.
    orientation: { rotations: [0, 90] },
  },

  Prairie: {
    kind: "other",
    name: "Prairie",
    displayName: "When Sparks Set the Prairie Ablaze",
    slots: [
      {
        key: "slot1",
        label: "Affix",
        kind: "choice",
        options: ["Copies the last Talent on all adjacent slates. Unable to copy Core Talents."],
      },
    ],
  },

  "Sparks of Moth Fire": {
    kind: "other",
    name: "Sparks of Moth Fire",
    slots: [
      {
        key: "slot1",
        label: "Affix",
        kind: "choice",
        options: SPARKS_DIRECTIONS.map(
          (d) => `Copies the last Talent on the adjacent slate ${d} this slate. Unable to copy the Core Talent.`,
        ),
      },
    ],
  },

  "Space Rift": {
    kind: "other",
    name: "Space Rift",
    slots: [
      {
        key: "slot1",
        label: "Affix",
        kind: "choice",
        options: SPACE_RIFT_SIDES.map(
          (side) => `Copies the Medium Talents on the adjacent slate on the ${side} of this slate`,
        ),
      },
    ],
  },
};

export function getAllSlots(def: SlateDef): Slot[] {
  return def.kind === "god" ? [...def.fixedSlots, ...def.randomSlots] : def.slots;
}

// ─── Quality color configs (ItemCard chrome) ──────────────────────────────────────
//
// Non-legendary (god) slates use the purple rarity coloring from the gear page's
// 5-affix tier (crafting/ItemCard.tsx getPSRarityColors: border #c084fc, accent #7e22ce,
// accentDark #0d0118, gradientEnd #6b21a8). Legendary slates reuse the hero-trait page's
// "Epic" memory quality coloring verbatim (hero-trait/page.tsx MEMORY_QUALITY_CONFIG.epic).

export type QualityConfig = {
  bg: string;             // icon background gradient
  border: string;         // bright accent — underline plate, active borders/glow
  glow: string;           // box-shadow for active controls
  bgGlow: string;         // box-shadow for the accent back panel
  accentBg: string;       // back panel gradient
  indicatorActive: string;      // active slot-row indicator outer color
  indicatorActiveInner: string; // active slot-row indicator inner color
};

export const GOD_SLATE_QUALITY: QualityConfig = {
  bg: "linear-gradient(to bottom, #0d0118 0%, #7e22ce 100%)",
  border: "#c084fc",
  glow: "0 0 12px rgba(192,132,252,0.6), 0 0 28px rgba(192,132,252,0.28)",
  bgGlow: "0 0 24px rgba(126,34,206,0.75), 0 0 60px rgba(126,34,206,0.4)",
  accentBg: "linear-gradient(to right, #6b21a8, #0d0118)",
  indicatorActive: "#9333ea",
  indicatorActiveInner: "#6b21a8",
};

export const LEGENDARY_SLATE_QUALITY: QualityConfig = {
  bg: "linear-gradient(to bottom, #0e0300 0%, #cc6624 100%)",
  border: "#feba67",
  glow: "0 0 12px rgba(254,186,103,0.6), 0 0 28px rgba(254,186,103,0.28)",
  bgGlow: "0 0 24px rgba(204,102,36,0.75), 0 0 60px rgba(204,102,36,0.4)",
  accentBg: "linear-gradient(to right, #7a3a12, #1a0800)",
  indicatorActive: "#cc6624",
  indicatorActiveInner: "#7a3a12",
};

export function getSlateQuality(def: SlateDef): QualityConfig {
  return def.kind === "god" ? GOD_SLATE_QUALITY : LEGENDARY_SLATE_QUALITY;
}

// ─── Icon paths ───────────────────────────────────────────────────────────────────

export function getGodSlateIconPath(god: GodName, shape: Shape): string {
  return `/icons/slates/${god} ${shape}.webp`;
}

export function getOtherSlateIconPath(name: string): string {
  return `/icons/slates/${name}.webp`;
}

// The catalog panel always shows the Square variant for god slates — actual shape is chosen
// in the ItemCard once a slate is selected.
export function getCatalogIconPath(slateName: string): string {
  if ((GOD_NAMES as readonly string[]).includes(slateName)) {
    return getGodSlateIconPath(slateName as GodName, "Square");
  }
  return getOtherSlateIconPath(slateName);
}

// ─── Per-instance configuration state ─────────────────────────────────────────────

export type SlotSelections = Record<string, string | null>; // slot.key -> talentId (talent slots) or literal option text (choice slots)

export type SlateConfig = {
  shape: Shape;
  rotation: Rotation;
  slots: SlotSelections;
};

export const EMPTY_SLATE_CONFIG: SlateConfig = { shape: "Square", rotation: 0, slots: {} };

// ─── Constraints (panel footer) ───────────────────────────────────────────────────

export const CONSTRAINTS = [
  { label: "Pedigree of Gods", max: 1, graphic: "segments" },
  { label: "Corner of Divinity", max: 3, graphic: "segments" },
  { label: "Fallen Starlight", max: 3, graphic: "segments" },
  { label: "Prairie", max: 1, graphic: "segments" },
  { label: "Sparks of Moth Fire", max: 3, graphic: "segments" },
] as const;

export type Constraint = (typeof CONSTRAINTS)[number];
