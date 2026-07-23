"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FEIcon, GroupDot, buildAffixLabel, TierBadge, type ItemSlots, type SlotValue } from "./ItemCard";
import type { CraftedPool } from "@/services/crafting/types";

// Mirrors hero-trait/page.tsx's MEMORY_QUALITY_CONFIG.epic (gradient/border/accent) — kept as a
// local literal (rather than imported) because hero-trait/page.tsx imports BuildContext.tsx,
// which imports GearSlotId from this module; importing back from hero-trait would create a
// runtime import cycle and break module init order (the same hazard BuildContext.tsx's own
// EMPTY_MEMORY_SELECTIONS comment calls out).
export const EPIC_QUALITY = {
  bg:       "linear-gradient(to bottom, #0e0300 0%, #cc6624 100%)",
  border:   "#feba67",
  accentBg: "linear-gradient(to right, #7a3a12, #1a0800)",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type GearSlotId =
  | "helmet"
  | "chest"
  | "gloves"
  | "boots"
  | "necklace"
  | "belt"
  | "ring_l"
  | "ring_r"
  | "main_hand"
  | "off_hand";

export type GearLoadout = Record<GearSlotId, string>;

const EMPTY_LOADOUT: GearLoadout = {
  helmet: "", chest: "", gloves: "", boots: "",
  necklace: "", belt: "", ring_l: "", ring_r: "",
  main_hand: "", off_hand: "",
};
export { EMPTY_LOADOUT };

export type PoolSummary = {
  id: string;
  name: string;
  attributeType: "STR" | "DEX" | "INT" | null;
  baseItemCategory: { id: string; name: string };
  weaponType: { id: string; name: string } | null;
};

export type LegendarySummary = {
  id: string;
  category: string;
  item: string;
  name: string;
  affixes: string;
};

// ─── Legendary helpers ────────────────────────────────────────────────────────
// A legendary selection is stored in the loadout as `legendary:<dbId>`, distinguishing
// it from a crafted pool id everywhere the loadout is read.

const LEGENDARY_ID_PREFIX = "legendary:";

export function legendaryId(dbId: string): string {
  return `${LEGENDARY_ID_PREFIX}${dbId}`;
}
export function isLegendaryId(id: string): boolean {
  return id.startsWith(LEGENDARY_ID_PREFIX);
}
function legendaryDbId(id: string): string {
  return id.slice(LEGENDARY_ID_PREFIX.length);
}
export function findLegendary(id: string, legendary: LegendarySummary[]): LegendarySummary | undefined {
  return legendary.find((l) => l.id === legendaryDbId(id));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseLegendaryName(nameHtml: string): { displayName: string; level: number | null; graftable: boolean } {
  const nameMatch = /<span class="name">([^<]*)<\/span>/.exec(nameHtml);
  const levelMatch = /Level (\d+)/.exec(nameHtml);
  return {
    displayName: nameMatch ? decodeEntities(nameMatch[1]) : "Unknown Legendary",
    level: levelMatch ? Number(levelMatch[1]) : null,
    graftable: nameHtml.includes('class="graftable"'),
  };
}

export function getLegendaryIconPath(item: LegendarySummary): string {
  const { displayName } = parseLegendaryName(item.name);
  return `/icons/legendary/${item.category}/${displayName}.webp`;
}

// The one/two-handed weapon type names legendary.json uses under its "One-Handed" /
// "Two-Handed" categories — matched against the item's base name (attribute suffix
// stripped) to resolve the same base-category ids SLOT_CATEGORIES filters crafted pools by.
const LEGENDARY_ONE_HAND_WEAPONS = new Set([
  "Cane", "Claw", "Dagger", "One-Handed Axe", "One-Handed Hammer", "One-Handed Sword", "Pistol", "Scepter", "Wand",
]);
const LEGENDARY_TWO_HAND_WEAPONS = new Set([
  "Bow", "Crossbow", "Musket", "Tin Staff", "Two-Handed Axe", "Two-Handed Hammer", "Two-Handed Sword",
]);
const LEGENDARY_ITEM_TO_BASE_CATEGORY: Record<string, string> = {
  Boots: "boots", "Chest Armor": "chest", Gloves: "gloves", Helmet: "helmet",
  Belt: "belt", Necklace: "necklace", Ring: "ring", "Spirit Ring": "spirit_ring", Shield: "shield",
};

function legendaryBaseCategory(item: string): string | null {
  const stripped = item.replace(/\s*\((DEX|INT|STR)\)\s*$/, "");
  if (LEGENDARY_ONE_HAND_WEAPONS.has(stripped)) return "one_hand_weapon";
  if (LEGENDARY_TWO_HAND_WEAPONS.has(stripped)) return "two_hand_weapon";
  return LEGENDARY_ITEM_TO_BASE_CATEGORY[stripped] ?? null;
}

// ─── Legendary affix parsing ──────────────────────────────────────────────────
// The wiki lists a legendary item's affixes as one flat top-level <ul>: all the
// default (T1) affixes first, then the same affixes again in the same order at their
// corroded (T0+) values. Each top-level <li> pairs 1:1 with its counterpart in the second
// half. A "Randomly Chosen: <ul>...</ul>" group is itself one such <li> — its nested <li
// class="mod"> entries are the selectable options for that one conceptual affix line, each
// with its own base/corroded pair (in the same order in both halves).

// Base and corroded are independent choice lists (not necessarily the same length) — most
// lines have exactly one of each, a "Randomly Chosen" line has several base options, and some
// lines (e.g. a set of elemental variants that can corrode into any of Fire/Lightning/Cold,
// not just their own element) have one base option but several corroded ones.
export interface LegendaryAffixSlot {
  baseOptions: string[];
  corrodedOptions: string[];
}

function stripAffixFragment(fragment: string): string {
  return fragment
    .replace(/^<li(?:\s[^>]*)?>/, "")
    .replace(/<\/li>$/, "")
    .replace(/\s*<span class="corroded">\(Corroded\)<\/span>\s*/, " ")
    .trim();
}

function extractTopLevelLis(html: string): string[] {
  const tagRe = /<(\/?)(li|ul)(?:\s[^>]*)?>/g;
  const items: string[] = [];
  let ulDepth = 0;
  let curStart: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const closing = m[1] === "/";
    if (m[2] === "ul") {
      ulDepth += closing ? -1 : 1;
    } else if (!closing) {
      if (ulDepth === 0) curStart = m.index;
    } else if (ulDepth === 0 && curStart !== null) {
      items.push(html.slice(curStart, tagRe.lastIndex));
      curStart = null;
    }
  }
  return items;
}

function isRandomChoiceFragment(fragment: string): boolean {
  return /^<li>\s*Randomly Chosen/.test(fragment);
}

// A "Randomly Chosen" fragment is itself a whole top-level <li>...</li> (with a nested <ul>
// of option <li class="mod"> entries) — extractTopLevelLis on the fragment itself would just
// return that single outer <li> unchanged, so dig into its nested <ul> first.
function extractRandomChoiceOptions(fragment: string): string[] {
  const ulMatch = /<ul>([\s\S]*)<\/ul>/.exec(fragment);
  if (!ulMatch) return [];
  return extractTopLevelLis(ulMatch[1]);
}

function hasCorrodedMarker(fragment: string): boolean {
  return fragment.includes('class="corroded"');
}

// A line's base or corroded side is either one fixed fragment, or (if it's a "Randomly
// Chosen" group) a list of alternative fragments — either side can be either shape,
// independently, so this is used uniformly for both.
function extractOptionTexts(fragment: string): string[] {
  if (isRandomChoiceFragment(fragment)) {
    return extractRandomChoiceOptions(fragment).map(stripAffixFragment);
  }
  return [stripAffixFragment(fragment)];
}

export function parseLegendaryAffixSlots(affixesHtml: string): LegendaryAffixSlot[] | null {
  const inner = affixesHtml.replace(/^<ul>/, "").replace(/<\/ul>$/, "");
  const items = extractTopLevelLis(inner);
  if (items.length === 0) return null;

  // Fast path — the common case: an even count, first half base (none marked corroded),
  // second half corroded (every one of them actually marked). The two sides of a pair don't
  // need to match in shape — a fixed base line can pair with a "Randomly Chosen" corroded
  // group offering several element-swap choices, not just a bigger number of the same stat.
  if (items.length % 2 === 0) {
    const half = items.length / 2;
    let clean = true;
    for (let i = 0; i < half && clean; i++) {
      if (hasCorrodedMarker(items[i]) || !hasCorrodedMarker(items[i + half])) clean = false;
    }
    if (clean) {
      return Array.from({ length: half }, (_, i) => ({
        baseOptions: extractOptionTexts(items[i]),
        corrodedOptions: extractOptionTexts(items[i + half]),
      }));
    }
  }

  // Fallback — some items' scraped affixes don't follow the clean 1:1 doubling (e.g. a line
  // repeated as filler with no corroded counterpart at all recorded for it). Match each
  // corroded-marked item to the base-marked item at the same position among their own kind
  // instead of assuming a strict even split, and leave any base item with no match fixed at
  // its base tier (some items' scraped data is simply incomplete).
  const baseItems = items.filter((it) => !hasCorrodedMarker(it));
  const corrItems = items.filter(hasCorrodedMarker);
  if (baseItems.length === 0) return null;

  return baseItems.map((baseItem, i) => {
    const baseOptions = extractOptionTexts(baseItem);
    const corrItem = corrItems[i];
    return { baseOptions, corrodedOptions: corrItem ? extractOptionTexts(corrItem) : baseOptions };
  });
}

export type LegendaryLineSelection = { optionIndex: number; corroded: boolean };

export function resolveLegendaryLineText(slot: LegendaryAffixSlot, selection: LegendaryLineSelection | undefined): string {
  const list = selection?.corroded ? slot.corrodedOptions : slot.baseOptions;
  return list[selection?.optionIndex ?? 0] ?? list[0];
}

// ─── Gear tooltip card ────────────────────────────────────────────────────────

const G_CARD_W    = 272;
const G_ICON_H    = 79;
const G_ICON_W    = 86;

function GearTierSquare({ tier }: { tier: string }) {
  const color = tier === "T0_PLUS" || tier === "T0" ? "#fe3333"
    : tier === "T1" ? "#ff7c1c"
    : tier === "T2" ? "#a457ff"
    : "#52525b";
  return <div style={{ width: 8, height: 8, flexShrink: 0, marginTop: 3, background: color, borderRadius: "2px 0 2px 0" }} />;
}

export function GearTooltipCard({ pool, itemSlots, poolData, psCount, cx, cy }: {
  pool: PoolSummary;
  itemSlots: ItemSlots;
  poolData?: CraftedPool | null;
  psCount: number;
  cx: number;
  cy: number;
}) {
  const [imgErr, setImgErr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(420);
  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const iconPath = getPoolIconPath(pool);
  const isWeapon = pool.weaponType !== null || ["one_hand_weapon", "two_hand_weapon"].includes(pool.baseItemCategory.id);
  const { border: rarityBorder, metallicKey, gradientEnd } = getPSRarityColors(psCount);
  const gradientColor = `${rarityBorder}44`;
  const displayName = pool.name.replace(/\s*armor\b/gi, "").trim();

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const GAP = 18;
  const cardLeft = cx + GAP + G_CARD_W <= vpW ? cx + GAP : cx - GAP - G_CARD_W;
  const cardTop  = Math.max(G_ICON_H / 2 + 8, Math.min(vpH - cardH - 8, cy - 24));

  const dreamTier = itemSlots.dream?.tier ?? "";
  const prefixes  = [itemSlots.prefix1, itemSlots.prefix2, itemSlots.prefix3];
  const suffixes  = [itemSlots.suffix1, itemSlots.suffix2, itemSlots.suffix3];
  const divider   = <div style={{ height: 1, background: "#3a3838", margin: "8px 0" }} />;

  function lookupAffix(affixId: string) {
    if (!poolData) return null;
    for (const affixes of Object.values(poolData.groups)) {
      const found = affixes.find((a) => a.id === affixId);
      if (found) return found;
    }
    return null;
  }

  function slotLabel(slot: SlotValue): string {
    if (!slot) return "empty";
    const affix = lookupAffix(slot.affixId);
    return affix ? buildAffixLabel(affix, slot.tier) : slot.affixName;
  }

  function slotColor(slot: SlotValue): string {
    if (!slot) return "#52525b";
    return slot.tier === "T0_PLUS" ? "#5e56e1" : "#ffffff";
  }

  function AffixRow({ slot, emptyLabel }: { slot: SlotValue | null | undefined; emptyLabel: string }) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: slot ? "flex-start" : "center" }}>
        {slot && <GearTierSquare tier={slot.tier} />}
        <span style={{ color: slotColor(slot ?? null), fontSize: 13, lineHeight: 1.4 }}>
          {slot ? slotLabel(slot) : emptyLabel}
        </span>
      </div>
    );
  }

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left: cardLeft, top: cardTop,
      width: G_CARD_W, pointerEvents: "none", zIndex: 9999,
      overflow: "visible",
      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.85))",
      fontFamily: "'TLFont', Arial, Helvetica, sans-serif",
    }}>
      {/* Icon */}
      <div style={{
        position: "absolute", top: -(G_ICON_H / 2), left: "50%",
        transform: "translateX(-50%)", width: G_ICON_W, height: G_ICON_H, zIndex: 10,
        border: "5px solid transparent",
        background: `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%) padding-box, ${METALLIC_GRADIENTS[metallicKey]} border-box`,
        borderRadius: "0 12px 0 12px",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!imgErr ? (
          <img src={iconPath} alt={displayName} onError={() => setImgErr(true)}
            style={{ width: "auto", height: "92%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#666", fontSize: 18, fontWeight: 700 }}>?</span>
        )}
      </div>

      {/* Card body */}
      <div style={{ overflow: "hidden", borderRadius: "0 12px 0 12px" }}>

        {/* Top section */}
        <div style={{
          background: "#1f1f21", position: "relative",
          padding: `${G_ICON_H / 2 + 10}px 10px 12px`, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 10, left: 10, right: 10, bottom: 0,
            background: `linear-gradient(to bottom, ${gradientColor}, transparent)`,
            borderRadius: "4px 4px 0 0", pointerEvents: "none",
          }} />
          <div style={{
            position: "relative", zIndex: 1, textAlign: "center",
            color: "#ffffff", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em",
          }}>
            {displayName}
          </div>
        </div>

        {/* Bottom section */}
        <div style={{ background: "#242325", padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Base */}
          <AffixRow slot={itemSlots.base} emptyLabel="empty base" />

          {/* Dream */}
          {itemSlots.dream ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5 }}>
              <GearTierSquare tier={itemSlots.dream.tier} />
              <span style={{ color: "#48b8ff", fontSize: 13, lineHeight: 1.4 }}>{slotLabel(itemSlots.dream)}</span>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#52525b", fontSize: 13, marginTop: 5 }}>empty dream</div>
          )}

          {/* Nightmare */}
          {itemSlots.nightmare.length === 0 ? (
            <div style={{ textAlign: "center", color: "#52525b", fontSize: 13, marginTop: 5 }}>empty nightmare</div>
          ) : itemSlots.nightmare.length === 1 ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5 }}>
              <GearTierSquare tier={dreamTier} />
              <span style={{ color: "#c74a28", fontSize: 13, lineHeight: 1.4 }}>{itemSlots.nightmare[0].affixName}</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5 }}>
              <GearTierSquare tier={dreamTier} />
              <span style={{ color: "#c74a28", fontSize: 13, lineHeight: 1.4 }}>
                ({itemSlots.nightmare.length} nightmare affixes selected)
              </span>
            </div>
          )}

          {/* Sequence — weapons only */}
          {isWeapon && (
            itemSlots.sequence ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5 }}>
                <span style={{ width: 10, height: 10, flexShrink: 0, marginTop: 2, borderRadius: 4, backgroundColor: itemSlots.sequence.sourceGroup === "ADVANCED_SEQUENCES" ? "#fd0000" : "#fd7c1c", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#3a3a3a" }} />
                </span>
                <span style={{ color: "#ffffff", fontSize: 13, lineHeight: 1.4 }}>{slotLabel(itemSlots.sequence)}</span>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#52525b", fontSize: 13, marginTop: 5 }}>empty sequence</div>
            )
          )}

          {/* Prefixes + Suffixes */}
          {divider}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {prefixes.map((slot, i) => (
              <div key={`p${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: slot ? "flex-start" : "center" }}>
                {slot && <GearTierSquare tier={slot.tier} />}
                <span style={{ color: slotColor(slot), fontSize: 13, lineHeight: 1.4 }}>
                  {slot ? slotLabel(slot) : "empty prefix"}
                </span>
              </div>
            ))}
            {suffixes.map((slot, i) => (
              <div key={`s${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: slot ? "flex-start" : "center" }}>
                {slot && <GearTierSquare tier={slot.tier} />}
                <span style={{ color: slotColor(slot), fontSize: 13, lineHeight: 1.4 }}>
                  {slot ? slotLabel(slot) : "empty suffix"}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Legendary tooltip card ───────────────────────────────────────────────────

export function LegendaryTooltipCard({ item, selections = {}, cx, cy }: { item: LegendarySummary; selections?: Record<number, LegendaryLineSelection>; cx: number; cy: number }) {
  const [imgErr, setImgErr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(420);
  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const { displayName, level, graftable } = parseLegendaryName(item.name);
  const iconPath = getLegendaryIconPath(item);

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const GAP = 18;
  const cardLeft = cx + GAP + G_CARD_W <= vpW ? cx + GAP : cx - GAP - G_CARD_W;
  const cardTop  = Math.max(G_ICON_H / 2 + 8, Math.min(vpH - cardH - 8, cy - 24));

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left: cardLeft, top: cardTop,
      width: G_CARD_W, pointerEvents: "none", zIndex: 9999,
      overflow: "visible",
      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.85))",
      fontFamily: "'TLFont', Arial, Helvetica, sans-serif",
    }}>
      {/* Quality underline plate — peeks out beneath the icon, same trick as the item card */}
      <div style={{
        position: "absolute", top: -(G_ICON_H / 2) + 5, left: "50%",
        transform: "translateX(-50%)", width: G_ICON_W, height: G_ICON_H, zIndex: 9,
        background: EPIC_QUALITY.border,
        borderRadius: "0 12px 0 12px",
      }} />

      {/* Icon */}
      <div style={{
        position: "absolute", top: -(G_ICON_H / 2), left: "50%",
        transform: "translateX(-50%)", width: G_ICON_W, height: G_ICON_H, zIndex: 10,
        background: EPIC_QUALITY.bg,
        borderRadius: "0 12px 0 12px",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!imgErr ? (
          <img src={iconPath} alt={displayName} onError={() => setImgErr(true)}
            style={{ width: "auto", height: "92%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#666", fontSize: 18, fontWeight: 700 }}>?</span>
        )}
      </div>

      {/* Card body */}
      <div style={{ overflow: "hidden", borderRadius: "0 12px 0 12px" }}>

        {/* Top section */}
        <div style={{
          background: "#1f1f21", position: "relative",
          padding: `${G_ICON_H / 2 + 10}px 10px 12px`, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 10, left: 10, right: 10, bottom: 0,
            background: `linear-gradient(to bottom, ${EPIC_QUALITY.border}44, transparent)`,
            borderRadius: "4px 4px 0 0", pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ color: "#ffd76a", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em" }}>
              {displayName}
            </div>
            <div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 4, display: "flex", justifyContent: "center", gap: 8 }}>
              {level !== null && <span>Level {level}</span>}
              {graftable && <span>· Graftable</span>}
            </div>
          </div>
        </div>

        {/* Bottom section — one row per affix line, reflecting whichever option/tier is
            currently selected rather than dumping the wiki's raw doubled/grouped list. Plain
            white text throughout (no .skill-effect — that gives values their own amber color
            and tooltipped words a dotted underline, which we don't want here); corroded lines
            get the #6256e1 accent instead of white. */}
        <div style={{ background: "#242325", padding: "10px 14px 14px" }}>
          {(() => {
            const slots = parseLegendaryAffixSlots(item.affixes);
            if (!slots) return <div style={{ color: "#ffffff" }} dangerouslySetInnerHTML={{ __html: item.affixes }} />;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {slots.map((slot, i) => {
                  const selection = selections[i];
                  const isCorroded = selection?.corroded ?? false;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <span style={{ width: 8, height: 8, flexShrink: 0, marginTop: 4, borderRadius: "2px 0 2px 0", background: isCorroded ? "#fe3333" : "#ff7c1c" }} />
                      <span style={{ fontSize: 13, lineHeight: 1.4, color: isCorroded ? "#6256e1" : "#ffffff" }} dangerouslySetInnerHTML={{ __html: resolveLegendaryLineText(slot, selection) }} />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Legendary item card (crafting-page focus view) ──────────────────────────
// Mirrors ItemCard's frame — accent panel, overlapping icon, light card body — but with
// the epic hero-trait gradient/border instead of the crafted psCount-rarity metallic look,
// and a single flat affix section instead of ItemCard's base/dream/sequence/prefix/suffix
// groups, since legendary affixes are fixed except for up to 2 corrosion upgrades.

export function LegendaryItemCard({ item, slotSelections, activeLineIndex, onActivateLine, onClear }: {
  item: LegendarySummary;
  slotSelections: Record<number, LegendaryLineSelection>;
  activeLineIndex: number | null;
  onActivateLine: (index: number) => void;
  onClear?: () => void;
}) {
  const { displayName, level, graftable } = parseLegendaryName(item.name);
  const iconPath = getLegendaryIconPath(item);
  const slots = parseLegendaryAffixSlots(item.affixes);
  const epic = EPIC_QUALITY;
  const corrodedCount = slots ? slots.filter((_, i) => slotSelections[i]?.corroded).length : 0;

  return (
    <div className="relative max-w-3xl">
      {/* Accent back panel — peeks above main card, epic gradient */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "-70px",
          background: epic.accentBg,
          borderRadius: "0 36px 0 36px",
          zIndex: 0,
          boxShadow: "0 0 40px 8px rgba(0,0,0,0.45)",
        }}
      />

      {/* Item name */}
      <h2 className="absolute z-10 text-[28px] font-semibold text-white leading-tight truncate pointer-events-none"
        style={{ top: "-60px", left: "160px", right: "48px" }}>
        {displayName}
      </h2>

      {/* Unequip button */}
      {onClear && (
        <button
          onClick={onClear}
          title="Remove item"
          className="absolute z-10 rounded p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
          style={{ top: "-63px", right: "8px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      )}

      {/* Quality underline plate — same offset trick as hero-trait's epic memory icons: a solid
          plate sitting 6px below the icon, behind it, so only a thin sliver peeks out beneath
          rather than a full ring around the icon. */}
      <div
        className="absolute z-[19]"
        style={{ top: "-55px", left: "20px", width: "128px", height: "128px", background: epic.border, borderRadius: "0 28px 0 28px" }}
      />

      {/* Icon */}
      <div
        className="absolute z-20 flex items-center justify-center overflow-hidden"
        style={{
          top: "-61px",
          left: "20px",
          width: "128px",
          height: "128px",
          background: epic.bg,
          borderRadius: "0 28px 0 28px",
        }}
      >
        <img src={iconPath} alt={displayName} className="w-full h-full object-contain p-0.5" />
      </div>

      {/* Main card */}
      <div className="relative z-10 border border-[#bec4c9] bg-[#eaeaea] text-[#1a1a1a] px-5 pb-5 pt-1" style={{ borderRadius: "0 36px 0 36px" }}>

        {/* Header: slot info + corrosion counter */}
        <div className="flex items-start gap-4 mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            {level !== null && <p className="text-sm text-[#1a1a1a]">Item Level: {level}</p>}
            <p className="text-sm text-[#1a1a1a]">Slot: {item.item}</p>
            {graftable && <p className="text-sm text-[#1a1a1a]">Graftable</p>}
          </div>
          {slots && (
            <div className="flex flex-col items-end gap-0.5 pt-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Corroded</span>
              <span className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: epic.border }}>
                {corrodedCount} / 2
              </span>
            </div>
          )}
        </div>

        {/* Affixes — one flat section, no base/dream/sequence/prefix/suffix subgroups. Click a
            line to choose its variant (which random option, and/or T1 vs T0+ corroded) in the
            affix panel — this card only ever shows the currently-resolved text: black for a
            base-tier line, #6256e1 for a corroded one. */}
        <div className="relative border border-[#bec4c9] mt-4 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#555]">Affixes</span>
            </div>
          </div>
          {!slots ? (
            <div className="text-[#1a1a1a] text-sm mt-2" dangerouslySetInnerHTML={{ __html: item.affixes }} />
          ) : (
            <div className="flex flex-col">
              {slots.map((slot, i) => {
                const selection = slotSelections[i];
                const isCorroded = selection?.corroded ?? false;
                const isActive = activeLineIndex === i;
                return (
                  // Same row shell as a crafted item's SimpleSlotRow: py-1 wrapper around a
                  // flex-1 button (bg #dedfdf, pl-3/pr-[48px]/py-3, rounded-sm, hover:brightness-95)
                  // with the same green/gray "active slot" checkmark strip on the right.
                  <div key={i} className="flex items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => onActivateLine(i)}
                      title={slot.baseOptions.length > 1 || slot.corrodedOptions.length > 1 ? "Choose this line's option and tier" : "Choose this line's tier"}
                      className="flex-1 min-w-0 relative flex items-center gap-2 pl-3 pr-[48px] py-3 rounded-sm border-0 overflow-hidden focus:outline-none text-sm transition-all cursor-pointer hover:brightness-95"
                      style={{ backgroundColor: "#dedfdf" }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <TierBadge tier={isCorroded ? "T0_PLUS" : "T1"} />
                        <span
                          className="truncate transition-colors duration-150"
                          style={{ color: isCorroded ? "#6256e1" : "#1a1a1a" }}
                          dangerouslySetInnerHTML={{ __html: resolveLegendaryLineText(slot, selection) }}
                        />
                      </span>
                      <span
                        className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center"
                        style={{ backgroundColor: isActive ? "#5ddc4d" : "#979798" }}
                      >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isActive ? "#2d9927" : "#6c6b6c" }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={isActive ? "#2fff21" : "white"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Legendary affix panel (crafting-page right panel, when a legendary line is active) ──────

const AFFIX_PANEL_BG = "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)";

export function LegendaryAffixPanel({ slot, selection, otherCorrodedCount, onSelect }: {
  slot: LegendaryAffixSlot | null;
  selection: LegendaryLineSelection | null;
  otherCorrodedCount: number;
  onSelect: (choice: LegendaryLineSelection) => void;
}) {
  // Which tier tab is being browsed — mirrors AffixPanel's activeGroupIdx (2 tabs here: T1 and
  // Corroded, each listing every option as a row), and jumps to match the current selection
  // when the active line changes.
  const [activeTab, setActiveTab] = useState<"base" | "corroded">(selection?.corroded ? "corroded" : "base");
  useEffect(() => { setActiveTab(selection?.corroded ? "corroded" : "base"); }, [slot, selection?.corroded]);

  if (!slot) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: "100vh", background: AFFIX_PANEL_BG }}>
        <p className="text-center text-[20px] font-semibold whitespace-nowrap px-6" style={{ color: "#d92020" }}>
          Select an affix line to choose its variant
        </p>
      </div>
    );
  }

  const tabs = [
    { key: "base" as const, label: "T1" },
    { key: "corroded" as const, label: "Corroded (T0+)" },
  ];
  const isCorroded = activeTab === "corroded";

  return (
    <div className="w-full flex flex-col" style={{ height: "100vh", background: AFFIX_PANEL_BG }}>
      {/* Slot label */}
      <div className="px-4 pt-5 pb-3 border-b border-[#3a3838]">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-0.5">Selecting</p>
        <p className="text-[15px] font-semibold text-[#e0ddd8]">{slot.baseOptions.length > 1 || slot.corrodedOptions.length > 1 ? "Randomly Chosen Affix" : "Affix Tier"}</p>
      </div>

      {/* Two tabs — T1 and Corroded — each listing every option as a row below */}
      <div className="flex flex-row flex-wrap justify-center gap-3 px-6 pt-16">
        {tabs.map(({ key, label }) => (
          <div key={key} className="relative flex flex-col items-center">
            <button
              onClick={() => setActiveTab(key)}
              className={`px-6 py-4 text-[16px] font-semibold transition-colors ${
                key === activeTab ? "text-[#000000]" : "text-[#ffffff] hover:opacity-80"
              }`}
              style={{
                backgroundColor: key === activeTab ? "#ffde1f" : "#0c0c0c",
                borderRadius: "12px 0 12px 0",
                boxShadow: key === activeTab
                  ? "0 6px 10px rgba(255,222,31,0.4), 5px 3px 8px rgba(255,222,31,0.2), -5px 3px 8px rgba(255,222,31,0.2)"
                  : "0 3px 6px rgba(0,0,0,0.4)",
              }}
            >
              {label}
            </button>
            {key === activeTab && (
              <span
                className="absolute top-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0, height: 0,
                  borderLeft: "12px solid transparent",
                  borderRight: "12px solid transparent",
                  borderTop: "12px solid #ffde1f",
                  filter: "drop-shadow(0 4px 6px rgba(255,222,31,0.5))",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* One row per option in whichever list (base/corroded) the active tab shows */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {(isCorroded ? slot.corrodedOptions : slot.baseOptions).map((text, optIdx) => {
          const isSelected = selection?.optionIndex === optIdx && (selection?.corroded ?? false) === isCorroded;
          const disabled = isCorroded && !isSelected && otherCorrodedCount >= 2;
          return (
            <button
              key={optIdx}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect({ optionIndex: optIdx, corroded: isCorroded })}
              title={disabled ? "T0+ limit reached (max 2 per item)" : undefined}
              className={`w-full text-left px-3 py-4 text-[14px] transition-all leading-snug ${!disabled && !isSelected ? "hover:brightness-110" : ""}`}
              style={{
                border: `2px solid ${disabled ? "#383737" : "#535357"}`,
                backgroundColor: isSelected ? "#e0ddd8" : disabled ? "#252424" : "#3d3c3c",
                borderRadius: "0 10px 0 10px",
                cursor: disabled ? "not-allowed" : "pointer",
                color: isSelected ? "#1a2028" : disabled ? "#555555" : "#ffffff",
                boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
              }}
            >
              <span className="flex items-center gap-2">
                <TierBadge tier={isCorroded ? "T0_PLUS" : "T1"} />
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slot definitions ─────────────────────────────────────────────────────────

export const SLOT_LABELS: Record<GearSlotId, string> = {
  helmet: "Helmet", chest: "Chest", gloves: "Gloves", boots: "Boots",
  necklace: "Necklace", belt: "Belt", ring_l: "Ring", ring_r: "Ring",
  main_hand: "Main Hand", off_hand: "Off Hand",
};

const SLOT_CATEGORIES: Record<GearSlotId, string[]> = {
  helmet:    ["helmet"],
  chest:     ["chest"],
  gloves:    ["gloves"],
  boots:     ["boots"],
  necklace:  ["necklace"],
  belt:      ["belt"],
  ring_l:    ["ring", "spirit_ring"],
  ring_r:    ["ring", "spirit_ring"],
  main_hand: ["one_hand_weapon", "two_hand_weapon"],
  off_hand:  ["one_hand_weapon", "shield"],
};

export const LAYOUT: [GearSlotId, GearSlotId][] = [
  ["helmet",    "chest"],
  ["necklace",  "gloves"],
  ["belt",      "boots"],
  ["ring_l",    "ring_r"],
  ["main_hand", "off_hand"],
];

// ─── Empty slot icons ─────────────────────────────────────────────────────────

const C = "#52525b"; // single gray color for all placeholder icons

export const SLOT_ICONS: Record<GearSlotId, React.ReactNode> = {
  helmet: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* dome */}
      <path d="M4 15C4 9.477 7.582 5 12 5C16.418 5 20 9.477 20 15L20 17L4 17Z" />
      {/* brim */}
      <rect x="2" y="17" width="20" height="3" rx="1" />
      {/* visor slit */}
      <rect x="6" y="13.5" width="12" height="1.5" rx="0.75" fill="#0a0a0a" />
    </svg>
  ),
  chest: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* body plate */}
      <path d="M8 5L4 7L4 20L20 20L20 7L16 5L12 8Z" />
      {/* left pauldron */}
      <rect x="2" y="6" width="5" height="5" rx="1" />
      {/* right pauldron */}
      <rect x="17" y="6" width="5" height="5" rx="1" />
    </svg>
  ),
  gloves: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* index */}
      <rect x="7" y="7" width="2.2" height="8" rx="1.1" />
      {/* middle */}
      <rect x="10" y="5" width="2.2" height="10" rx="1.1" />
      {/* ring */}
      <rect x="13" y="6" width="2.2" height="9" rx="1.1" />
      {/* pinky */}
      <rect x="16" y="8" width="2.2" height="7" rx="1.1" />
      {/* palm */}
      <rect x="7" y="13" width="11" height="7" rx="2" />
      {/* thumb */}
      <rect x="4" y="12" width="5" height="2.2" rx="1.1" />
    </svg>
  ),
  boots: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* shaft */}
      <rect x="6" y="4" width="7" height="10" rx="1" />
      {/* foot */}
      <path d="M6 12L20 12Q24 12 24 16L24 21L6 21Z" />
    </svg>
  ),
  necklace: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      {/* chain arc */}
      <path d="M5 5Q12 15 19 5" stroke={C} strokeWidth="2.5" strokeLinecap="round" />
      {/* left chain to pendant */}
      <line x1="8.5" y1="11" x2="12" y2="17" stroke={C} strokeWidth="2" strokeLinecap="round" />
      {/* right chain to pendant */}
      <line x1="15.5" y1="11" x2="12" y2="17" stroke={C} strokeWidth="2" strokeLinecap="round" />
      {/* pendant */}
      <circle cx="12" cy="19.5" r="2.5" fill={C} />
    </svg>
  ),
  belt: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* left strap */}
      <rect x="2" y="10" width="7" height="4" />
      {/* right strap */}
      <rect x="15" y="10" width="7" height="4" />
      {/* buckle frame */}
      <rect x="8" y="8" width="8" height="8" rx="1" />
      {/* buckle pin */}
      <rect x="11.5" y="8" width="1" height="8" rx="0.5" fill="#0a0a0a" />
    </svg>
  ),
  ring_l: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      {/* band */}
      <circle cx="12" cy="13" r="7.5" stroke={C} strokeWidth="3.5" />
      {/* gem */}
      <path d="M12 2L15 5.5L12 8L9 5.5Z" fill={C} />
    </svg>
  ),
  ring_r: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="7.5" stroke={C} strokeWidth="3.5" />
      <path d="M12 2L15 5.5L12 8L9 5.5Z" fill={C} />
    </svg>
  ),
  main_hand: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* blade tip */}
      <path d="M12 1L14 5L10 5Z" />
      {/* blade body */}
      <rect x="10" y="5" width="4" height="13" />
      {/* crossguard */}
      <rect x="6.5" y="18" width="11" height="2" rx="1" />
      {/* grip */}
      <rect x="11" y="20" width="2" height="3.5" rx="1" />
      {/* pommel */}
      <circle cx="12" cy="24" r="1.5" />
    </svg>
  ),
  off_hand: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* shield */}
      <path d="M12 2L21 7L21 14L12 22L3 14L3 7Z" />
    </svg>
  ),
};

// ─── Icon path helper ─────────────────────────────────────────────────────────

export function getPoolIconPath(pool: PoolSummary): string {
  const catId = pool.baseItemCategory.id;
  if (pool.weaponType)
    return `/icons/equipment/${pool.weaponType.name}.webp`;
  if (["ring", "spirit_ring", "necklace", "belt"].includes(catId))
    return `/icons/equipment/${pool.baseItemCategory.name}.webp`;
  const attr = pool.attributeType ?? "STR";
  return `/icons/equipment/${attr} ${pool.baseItemCategory.name}.webp`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMainHandTwoHanded(loadout: GearLoadout, pools: PoolSummary[], legendary: LegendarySummary[]): boolean {
  const id = loadout.main_hand;
  if (!id) return false;
  if (isLegendaryId(id)) {
    const item = findLegendary(id, legendary);
    return item ? legendaryBaseCategory(item.item) === "two_hand_weapon" : false;
  }
  const pool = pools.find((p) => p.id === id);
  return pool?.baseItemCategory.id === "two_hand_weapon";
}

function getAvailablePools(slotId: GearSlotId, pools: PoolSummary[], loadout: GearLoadout, legendary: LegendarySummary[]): PoolSummary[] {
  if (slotId === "off_hand" && isMainHandTwoHanded(loadout, pools, legendary)) return [];
  return pools.filter((p) => SLOT_CATEGORIES[slotId].includes(p.baseItemCategory.id));
}

function getAvailableLegendary(slotId: GearSlotId, legendary: LegendarySummary[], loadout: GearLoadout, pools: PoolSummary[]): LegendarySummary[] {
  if (slotId === "off_hand" && isMainHandTwoHanded(loadout, pools, legendary)) return [];
  return legendary
    .filter((l) => SLOT_CATEGORIES[slotId].includes(legendaryBaseCategory(l.item) ?? ""))
    .sort((a, b) => parseLegendaryName(a.name).displayName.localeCompare(parseLegendaryName(b.name).displayName));
}

function isPoolDisabled(slotId: GearSlotId, pool: PoolSummary, loadout: GearLoadout): boolean {
  if (slotId === "main_hand" && loadout.off_hand && pool.baseItemCategory.id === "two_hand_weapon") return true;
  return false;
}

function isLegendaryDisabled(slotId: GearSlotId, item: LegendarySummary, loadout: GearLoadout): boolean {
  if (slotId === "main_hand" && loadout.off_hand && legendaryBaseCategory(item.item) === "two_hand_weapon") return true;
  return false;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

type SlotDropdownProps = {
  slotId: GearSlotId;
  pools: PoolSummary[];
  legendary: LegendarySummary[];
  loadout: GearLoadout;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function SlotDropdown({ slotId, pools, legendary, loadout, triggerRef, onSelect, onClose }: SlotDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dropDir, setDropDir] = useState<"down" | "up" | "center">("down");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const [legendaryExpanded, setLegendaryExpanded] = useState(false);
  const [legendarySearch, setLegendarySearch] = useState("");
  const [hoveredLegendary, setHoveredLegendary] = useState<LegendarySummary | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const available = getAvailablePools(slotId, pools, loadout, legendary);
  const availableLegendary = getAvailableLegendary(slotId, legendary, loadout, pools);
  const visibleLegendary = legendarySearch.trim()
    ? availableLegendary.filter((item) => parseLegendaryName(item.name).displayName.toLowerCase().includes(legendarySearch.trim().toLowerCase()))
    : availableLegendary;
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools, legendary);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!ref.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = ref.current.getBoundingClientRect().height;
    const margin = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    if (menuHeight <= spaceBelow) {
      setDropDir("down"); setMaxHeight(undefined);
    } else if (menuHeight <= spaceAbove) {
      setDropDir("up"); setMaxHeight(undefined);
    } else {
      const centerY = triggerRect.top + triggerRect.height / 2;
      const maxHalf = Math.min(centerY - margin, window.innerHeight - centerY - margin);
      setDropDir("center"); setMaxHeight(Math.max(maxHalf * 2, 80));
    }
  }, [triggerRef, legendaryExpanded, legendarySearch]);

  const grouped = available.reduce<Record<string, PoolSummary[]>>((acc, p) => {
    const cat = p.baseItemCategory.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const positionClass =
    dropDir === "down" ? "top-full mt-2" :
    dropDir === "up"   ? "bottom-full mb-2" :
    "overflow-y-auto";
  const positionStyle: React.CSSProperties | undefined =
    dropDir === "center"
      ? { top: "50%", transform: "translate(-50%, -50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined }
      : undefined;

  return (
    <div
      ref={ref}
      className={`absolute z-50 left-1/2 -translate-x-1/2 w-64 overflow-hidden rounded-lg border border-[#1c1c1c] bg-[#0f0f0f] shadow-xl py-1 ${positionClass}`}
      style={positionStyle}
    >
      {locked ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">Off-hand locked (two-handed weapon equipped)</p>
      ) : available.length === 0 && availableLegendary.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">{pools.length === 0 ? "Pools loading…" : "No items available"}</p>
      ) : (
        <>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#2a2929] cursor-pointer" onClick={() => onSelect("")}>
            — empty —
          </button>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 pt-2 pb-0.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{cat}</p>
              {items.map((p) => {
                const disabled = isPoolDisabled(slotId, p, loadout);
                return (
                  <div key={p.id} className="relative group/disabled">
                    <button
                      disabled={disabled}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        disabled ? "text-zinc-600 cursor-not-allowed"
                        : loadout[slotId] === p.id ? "text-amber-400 hover:bg-[#2a2929] cursor-pointer"
                        : "text-[#e0ddd8] hover:bg-[#2a2929] cursor-pointer"
                      }`}
                      onClick={disabled ? undefined : () => onSelect(p.id)}
                    >
                      {p.name}
                      {p.attributeType && <span className="ml-1 text-zinc-600">({p.attributeType})</span>}
                    </button>
                    {disabled && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-sm text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/disabled:opacity-100 transition-opacity z-[10000]">
                        Locked — unequip the off-hand slot first
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {availableLegendary.length > 0 && (
            <div className="mt-1 pt-1 border-t border-[#242424]">
              <button
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider hover:bg-[#2a2929] cursor-pointer"
                style={{ color: EPIC_QUALITY.border }}
                onClick={() => setLegendaryExpanded((v) => !v)}
              >
                <span>Legendary ({availableLegendary.length})</span>
                <span style={{ display: "inline-block", transition: "transform 0.15s", transform: legendaryExpanded ? "rotate(90deg)" : "none" }}>▸</span>
              </button>
              {legendaryExpanded && (
                <div>
                  <div className="px-3 pt-1.5 pb-1">
                    <input
                      type="text"
                      value={legendarySearch}
                      onChange={(e) => setLegendarySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Search legendary items…"
                      className="w-full rounded-sm border border-[#3f3f46] bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-[#e0ddd8] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                  {visibleLegendary.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-zinc-500 italic">No matches</p>
                  ) : visibleLegendary.map((item) => {
                    const disabled = isLegendaryDisabled(slotId, item, loadout);
                    const { displayName } = parseLegendaryName(item.name);
                    const idStr = legendaryId(item.id);
                    const isSelected = loadout[slotId] === idStr;
                    return (
                      <div
                        key={item.id}
                        className="relative group/disabled"
                        onMouseEnter={(e) => { setHoveredLegendary(item); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredLegendary(null)}
                      >
                        <button
                          disabled={disabled}
                          className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs transition-colors ${
                            disabled ? "text-zinc-600 cursor-not-allowed"
                            : isSelected ? "hover:bg-[#2a2929] cursor-pointer"
                            : "text-[#e0ddd8] hover:bg-[#2a2929] cursor-pointer"
                          }`}
                          style={isSelected && !disabled ? { color: EPIC_QUALITY.border } : undefined}
                          onClick={disabled ? undefined : () => onSelect(idStr)}
                        >
                          <img src={getLegendaryIconPath(item)} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                          <span className="truncate flex-1">{displayName}</span>
                        </button>
                        {disabled && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-sm text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/disabled:opacity-100 transition-opacity z-[10000]">
                            Locked — unequip the off-hand slot first
                          </span>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {hoveredLegendary && hoverPos && (
        <LegendaryTooltipCard item={hoveredLegendary} cx={hoverPos.x} cy={hoverPos.y} />
      )}
    </div>
  );
}

// ─── Slot tile ────────────────────────────────────────────────────────────────

type SlotTileProps = {
  slotId: GearSlotId;
  pools: PoolSummary[];
  legendary: LegendarySummary[];
  legendarySelections?: Record<number, LegendaryLineSelection>;
  loadout: GearLoadout;
  psCount: number;
  isOpen: boolean;
  isFocused: boolean;
  craftTotal: number | null;
  corrosionTotal: number | null;
  costSide: "left" | "right";
  hasDream: boolean;
  itemSlots?: ItemSlots | null;
  poolData?: CraftedPool | null;
  onOpen: () => void;
  onFocus: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function getPSRarityColors(count: number): { border: string; borderHover: string; gradientEnd: string; metallicKey: "zinc" | "blue" | "purple" | "pink" } {
  if (count === 0) return { border: "#71717a", borderHover: "#a1a1aa", gradientEnd: "#3f3f46", metallicKey: "zinc" };
  if (count <= 4)  return { border: "#38bdf8", borderHover: "#7dd3fc", gradientEnd: "#0c4a6e", metallicKey: "blue" };
  if (count === 5) return { border: "#c084fc", borderHover: "#d8b4fe", gradientEnd: "#6b21a8", metallicKey: "purple" };
  return                  { border: "#f472b6", borderHover: "#f9a8d4", gradientEnd: "#9d174d", metallicKey: "pink" };
}

export const METALLIC_GRADIENTS = {
  zinc:   "linear-gradient(145deg, #b8b8bc 0%, #4a4a4e 15%, #d8d8dc 35%, #6a6a70 55%, #2c2c30 75%, #9a9a9e 100%)",
  blue:   "linear-gradient(145deg, #bae6fd 0%, #0369a1 15%, #e0f2fe 35%, #38bdf8 55%, #075985 75%, #7dd3fc 100%)",
  purple: "linear-gradient(145deg, #e9d5ff 0%, #7e22ce 15%, #f3e8ff 35%, #c084fc 55%, #6b21a8 75%, #d8b4fe 100%)",
  pink:   "linear-gradient(145deg, #fce7f3 0%, #be185d 15%, #fdf2f8 35%, #f472b6 55%, #9d174d 75%, #f9a8d4 100%)",
  orange: "linear-gradient(145deg, #ffe0c2 0%, #a35400 15%, #fff3e6 35%, #ff8c1a 55%, #7a3d00 75%, #ffc98a 100%)",
};

// Legendary items get a fixed orange metallic ring instead of the crafted psCount-based
// rarity scale — they're always their own top tier, not a function of how many pact-spirit
// affixes were rolled onto them.
export const LEGENDARY_COLORS = { border: "#ff8c1a", gradientEnd: "#7a3d00", metallicKey: "orange" as const };

function SlotTile({ slotId, pools, legendary, legendarySelections, loadout, psCount, isOpen, isFocused, craftTotal, corrosionTotal, costSide, hasDream, itemSlots, poolData, onOpen, onFocus, onSelect, onClose }: SlotTileProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const selectedId = loadout[slotId];
  const selectedPool = selectedId && !isLegendaryId(selectedId) ? pools.find((p) => p.id === selectedId) : undefined;
  const selectedLegendary = selectedId && isLegendaryId(selectedId) ? findLegendary(selectedId, legendary) : undefined;
  const hasSelection = Boolean(selectedPool || selectedLegendary);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools, legendary);

  function handleClick() {
    if (locked) return;
    if (hasSelection) onFocus();
    else onOpen();
  }

  const { gradientEnd, metallicKey, border: rarityBorder } = selectedLegendary ? LEGENDARY_COLORS : getPSRarityColors(psCount);

  const isActive = !locked && (isOpen || (isFocused && hasSelection));

  const glow = isActive
    ? `0 0 12px ${rarityBorder}cc, 0 0 28px ${rarityBorder}88, 0 0 52px ${rarityBorder}44`
    : "none";

  const innerBg = hasSelection
    ? `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)`
    : "#0a0a0a";

  const border = hasSelection
    ? "6px solid transparent"
    : locked
    ? "6px solid #1c1c1c"
    : `6px solid ${isHovered ? "#52525b" : "#3f3f46"}`;

  const bg = hasSelection
    ? `${innerBg} padding-box, ${METALLIC_GRADIENTS[metallicKey]} border-box`
    : innerBg;

  const tileName = selectedPool
    ? selectedPool.name.replace(/\s*armor\b/gi, "").trim()
    : selectedLegendary
    ? parseLegendaryName(selectedLegendary.name).displayName
    : null;

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      onMouseEnter={(e) => { setIsHovered(true); if (hasSelection && !isOpen) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseMove={(e) => { if (hasSelection && !isOpen) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => { setIsHovered(false); setTooltipPos(null); }}
    >
      <span className={`relative z-10 text-xs uppercase tracking-wider font-medium transition-colors ${isActive ? "text-white" : isHovered && !locked ? "text-[#e0ddd8]" : "text-zinc-600"}`}>
        {SLOT_LABELS[slotId]}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={handleClick}
          disabled={locked}
          className={`w-36 h-36 flex items-center justify-center relative overflow-hidden transition-all ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
          style={{ border, background: bg, boxShadow: glow, opacity: locked ? 0.35 : 1, borderRadius: "0 28px 0 28px" }}
        >
          {selectedPool ? (
            <img
              src={getPoolIconPath(selectedPool)}
              alt={selectedPool.name}
              className="w-full h-full object-contain p-1.5"
            />
          ) : selectedLegendary ? (
            <img
              src={getLegendaryIconPath(selectedLegendary)}
              alt={tileName ?? ""}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <div className="opacity-30">
              {SLOT_ICONS[slotId]}
            </div>
          )}
        </button>

        {locked && isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="px-3 py-1.5 text-xs text-white whitespace-nowrap border border-[#535357] bg-[#1a1a1a] rounded-sm shadow-lg">
              Off-hand locked — two-handed weapon equipped
            </div>
          </div>
        )}

        {hasSelection && hasDream && (
          <img
            src="/icons/slots/dream.png"
            alt="Dream affix"
            className="absolute bottom-2 right-2 w-7 h-7 pointer-events-none p-[3px] rounded-tr-[5px] rounded-bl-[5px]"
            style={{ background: "rgba(30,30,30,0.65)" }}
          />
        )}

        {hasSelection && !locked && (
          <div className="absolute top-2 right-2 group/change">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="relative rounded p-1 text-zinc-400 hover:text-[#e0ddd8] hover:bg-black/40 transition-colors cursor-pointer"
          >
            <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1.5 rounded-sm text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/change:opacity-100 transition-opacity z-50">
              Change item
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          </div>
        )}

        {isOpen && (
          <SlotDropdown
            slotId={slotId}
            pools={pools}
            legendary={legendary}
            loadout={loadout}
            triggerRef={triggerRef}
            onSelect={(id) => { onSelect(id); onClose(); }}
            onClose={onClose}
          />
        )}

        {tileName && (
          <span className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-0.5 text-[14px] font-semibold text-[#e0ddd8] leading-tight text-center w-max max-w-[180px] pointer-events-none">
            {tileName}
          </span>
        )}

        {(craftTotal !== null || corrosionTotal !== null) && (
          <div className={`absolute top-0 flex flex-col gap-1.5 pointer-events-none ${costSide === "right" ? "left-full ml-3 items-start" : "right-full mr-3 items-end"}`}>
            {craftTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Craft</span>
                <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(craftTotal) ? "text-red-400" : "text-[#e0ddd8]"}`}>
                  {Number.isNaN(craftTotal) ? "NaN" : Math.round(craftTotal).toLocaleString("en-US")}
                  {!Number.isNaN(craftTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
            {corrosionTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">+Corrosion</span>
                <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(corrosionTotal) ? "text-red-400" : "text-[#e0ddd8]"}`}>
                  {Number.isNaN(corrosionTotal) ? "NaN" : Math.round(corrosionTotal).toLocaleString("en-US")}
                  {!Number.isNaN(corrosionTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {selectedPool && itemSlots && tooltipPos && !isOpen && (
        <GearTooltipCard
          pool={selectedPool}
          itemSlots={itemSlots}
          poolData={poolData}
          psCount={psCount}
          cx={tooltipPos.x}
          cy={tooltipPos.y}
        />
      )}
      {selectedLegendary && tooltipPos && !isOpen && (
        <LegendaryTooltipCard
          item={selectedLegendary}
          selections={legendarySelections}
          cx={tooltipPos.x}
          cy={tooltipPos.y}
        />
      )}
    </div>
  );
}

// ─── GearPanel ────────────────────────────────────────────────────────────────

type GearPanelProps = {
  pools: PoolSummary[];
  legendary: LegendarySummary[];
  legendarySlots?: Partial<Record<GearSlotId, { selections: Record<number, LegendaryLineSelection> }>>;
  loadout: GearLoadout;
  activeSlotId: GearSlotId | null;
  focusedSlotId: GearSlotId | null;
  psCounts: Partial<Record<GearSlotId, number>>;
  costTotals: Partial<Record<GearSlotId, { craft: number | null; corrosion: number | null }>>;
  dreamCount: number;
  dreamFlags: Partial<Record<GearSlotId, boolean>>;
  slotItemSlots?: Partial<Record<GearSlotId, ItemSlots | null>>;
  slotPoolData?: Partial<Record<GearSlotId, CraftedPool | null>>;
  onSlotOpen: (id: GearSlotId) => void;
  onSlotFocus: (id: GearSlotId) => void;
  onSlotClose: () => void;
  onSelect: (slotId: GearSlotId, id: string) => void;
};

export default function GearPanel({ pools, legendary, legendarySlots, loadout, activeSlotId, focusedSlotId, psCounts, costTotals, dreamCount, dreamFlags, slotItemSlots, slotPoolData, onSlotOpen, onSlotFocus, onSlotClose, onSelect }: GearPanelProps) {
  const allSlots = LAYOUT.flat();

  // Sum craft totals; NaN if any contributing slot is NaN
  const craftValues = allSlots.map((id) => costTotals[id]?.craft ?? null).filter((v) => v !== null) as number[];
  const totalCraft: number | null = craftValues.length === 0 ? null
    : craftValues.some(Number.isNaN) ? NaN
    : craftValues.reduce((a, b) => a + b, 0);

  // Sum craft + corrosion totals; only shown if at least one slot has corrosion
  const anyCorrosion = allSlots.some((id) => costTotals[id]?.corrosion !== null && costTotals[id]?.corrosion !== undefined);
  const withCorrValues = allSlots.map((id) => {
    const c = costTotals[id];
    if (!c) return null;
    const value = c.corrosion ?? c.craft;
    return value;
  }).filter((v) => v !== null) as number[];
  const totalWithCorrosion: number | null = (!anyCorrosion || withCorrValues.length === 0) ? null
    : withCorrValues.some(Number.isNaN) ? NaN
    : withCorrValues.reduce((a, b) => a + b, 0);

  return (
    <div className="border border-[#1c1c1c] px-4 pt-4 pb-6 flex flex-col w-fit" style={{ borderRadius: "0 36px 0 36px", borderWidth: "1px", background: "linear-gradient(to bottom, #1d1e1e, #020202)", boxShadow: "0 8px 40px 8px rgba(0,0,0,0.6)" }}>
      <div className="flex gap-48 items-start px-2">
        {/* Left column — costs on right */}
        <div className="flex flex-col gap-12">
          {LAYOUT.map(([left]) => (
            <SlotTile key={left} slotId={left} pools={pools} legendary={legendary} legendarySelections={legendarySlots?.[left]?.selections} loadout={loadout} psCount={psCounts[left] ?? 0} isOpen={activeSlotId === left} isFocused={focusedSlotId === left} craftTotal={costTotals[left]?.craft ?? null} corrosionTotal={costTotals[left]?.corrosion ?? null} costSide="right" hasDream={dreamFlags[left] ?? false} itemSlots={slotItemSlots?.[left]} poolData={slotPoolData?.[left]} onOpen={() => onSlotOpen(left)} onFocus={() => onSlotFocus(left)} onSelect={(id) => onSelect(left, id)} onClose={onSlotClose} />
          ))}
        </div>
        {/* Right column — costs on left */}
        <div className="flex flex-col gap-12">
          {LAYOUT.map(([, right]) => (
            <SlotTile key={right} slotId={right} pools={pools} legendary={legendary} legendarySelections={legendarySlots?.[right]?.selections} loadout={loadout} psCount={psCounts[right] ?? 0} isOpen={activeSlotId === right} isFocused={focusedSlotId === right} craftTotal={costTotals[right]?.craft ?? null} corrosionTotal={costTotals[right]?.corrosion ?? null} costSide="left" hasDream={dreamFlags[right] ?? false} itemSlots={slotItemSlots?.[right]} poolData={slotPoolData?.[right]} onOpen={() => onSlotOpen(right)} onFocus={() => onSlotFocus(right)} onSelect={(id) => onSelect(right, id)} onClose={onSlotClose} />
          ))}
        </div>
      </div>

      {/* Dream affix counter */}
      <div className="flex justify-center mt-10">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Dream Affixes · {dreamCount} / 3
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "18px",
                  height: "3px",
                  borderRadius: "2px",
                  backgroundColor: i < dreamCount ? "#48b8ff" : "#3f3f46",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Total costs footer — always rendered to keep panel height fixed */}
      <div className="mt-6 pt-5 border-t border-[#1c1c1c] flex justify-between items-start px-2">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Gear Cost</span>
          <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${totalCraft !== null && Number.isNaN(totalCraft) ? "text-red-400" : "text-[#e0ddd8]"}`}>
            {totalCraft === null ? "—" : Number.isNaN(totalCraft) ? "NaN" : Math.round(totalCraft).toLocaleString("en-US")}
            {totalCraft !== null && !Number.isNaN(totalCraft) && <FEIcon className="w-5 h-5" />}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Gear Cost with Corrosion</span>
          <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${totalWithCorrosion !== null && Number.isNaN(totalWithCorrosion) ? "text-red-400" : "text-[#e0ddd8]"}`}>
            {totalWithCorrosion === null ? "—" : Number.isNaN(totalWithCorrosion) ? "NaN" : Math.round(totalWithCorrosion).toLocaleString("en-US")}
            {totalWithCorrosion !== null && !Number.isNaN(totalWithCorrosion) && <FEIcon className="w-5 h-5" />}
          </span>
        </div>
      </div>
    </div>
  );
}
