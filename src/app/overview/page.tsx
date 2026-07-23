"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SLOT_ICONS, SLOT_LABELS, LAYOUT, getPoolIconPath, GearTooltipCard, getPSRarityColors, METALLIC_GRADIENTS,
  isLegendaryId, findLegendary, getLegendaryIconPath, parseLegendaryName, LegendaryTooltipCard, LEGENDARY_COLORS,
  type GearSlotId, type PoolSummary, type LegendarySummary,
} from "@/app/crafting/GearPanel";
import { EMPTY_SLOTS, type ItemSlots } from "@/app/crafting/ItemCard";
import type { CraftedPool } from "@/services/crafting/types";
import { getTooltipIconPath, SkillTooltipCard, type Skill } from "@/app/skills/page";
import { getIconPath as getSpiritIconPath, PactSpiritTooltipCard, RARITY_COLOR, type PactSpirit } from "@/app/pactspirits/page";
import {
  MEMORY_LABELS, MEMORY_QUALITY_CONFIG, getTraitIconPath, getVariantName, effectiveTraitLevel,
  TraitTooltipCard, MemoryTooltipCard, type HeroTrait, type MemoryQuality,
} from "@/app/hero-trait/page";
import { HERO_TRAIT_ORDER } from "@/app/hero-trait/heroTraitOrder";
import {
  GODS, GOD_COLORS, isGodSel, selGodKey, selHeroName, selToTreeName, selToDataName, selToIconFolder,
} from "@/app/talents/page";
import { TalentTooltipCard } from "@/components/TalentTree";
import { TalentTrees } from "../../../data/crafted/torchcodex/talent-tree/talent-trees";
import type { CoreTalentData } from "../../../data/crafted/torchcodex/talent-tree/types";
import {
  SLATE_DEFS, GRID_ROWS, GRID_COLS, GRID_REMOVED, cellKey, getShapeCells,
  getInstanceIconPath, getIconTransform, getSlateQuality, getSlateDisplayName,
  type Talent,
} from "@/app/divinity-slates/slateData";
import { SlateTooltipCard } from "@/app/divinity-slates/page";
import {
  useGearBuild, useSkillsBuild, usePactspiritsBuild, useHeroTraitBuild, useTalentsBuild, useDivinitySlatesBuild,
} from "@/app/state/BuildContext";
import { getJSON } from "@/lib/apiCache";

// ─── Shared chrome ────────────────────────────────────────────────────────────

function CardTitleLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        margin: "-20px -20px -12px -20px",
        padding: "12px 20px",
        color: "#52525b",
        textDecoration: "none",
        borderRadius: "0 24px 0 0",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; e.currentTarget.style.color = "#ffffff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#52525b"; }}
    >
      {icon}
      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      <SearchButton />
    </Link>
  );
}

function SearchButton() {
  return (
    <button
      style={{
        marginLeft: "auto",
        border: "2px solid currentColor",
        borderRadius: "0 6px 0 6px",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </div>
  );
}

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// SVG fill can't take a CSS `linear-gradient(...)` string directly, so the top/bottom
// stops of hero-trait/page.tsx's MEMORY_QUALITY_CONFIG[quality].bg gradient are mirrored
// here for the memory icon badges below.
const MEM_BG_STOPS: Record<MemoryQuality, [string, string]> = {
  epic:     ["#0e0300", "#cc6624"],
  ultimate: ["#080002", "#ae1727"],
};

// ─── Gear ─────────────────────────────────────────────────────────────────────

function GearCard() {
  const [gearBuild] = useGearBuild();
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [legendary, setLegendary] = useState<LegendarySummary[]>([]);
  const [poolDataCache, setPoolDataCache] = useState<Record<string, CraftedPool>>({});
  const [hovered, setHovered] = useState<GearSlotId | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const slotSize = 88;
  const gap = 10;

  useEffect(() => {
    getJSON<PoolSummary[]>("/api/pools").then(setPools).catch(console.error);
  }, []);

  useEffect(() => {
    getJSON<LegendarySummary[]>("/api/legendary").then(setLegendary).catch(console.error);
  }, []);

  // The tooltip needs each equipped item's full affix definitions (not just the summary
  // list above) to render rolled values like "+(155-220) Max Life" instead of a bare
  // affix name — fetch and cache them per equipped pool id, matching what the crafting
  // page fetches per-slot when a pool is selected there.
  useEffect(() => {
    const poolIds = new Set(Object.values(gearBuild.loadout).filter((id) => id && !isLegendaryId(id)));
    poolIds.forEach((poolId) => {
      if (poolDataCache[poolId]) return;
      getJSON<CraftedPool>(`/api/pools/${poolId}`)
        .then((data) => setPoolDataCache((prev) => ({ ...prev, [poolId]: data })))
        .catch(console.error);
    });
    // poolDataCache is intentionally excluded — this only needs to fire once per pool id
    // that appears in the loadout, not every time a fetch above populates the cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gearBuild.loadout]);

  function psCountFor(itemSlots: ItemSlots): number {
    return (["prefix1", "prefix2", "prefix3", "suffix1", "suffix2", "suffix3"] as const)
      .filter((k) => itemSlots[k] !== null).length;
  }

  const hoveredId = hovered ? gearBuild.loadout[hovered] : "";
  const hoveredPool = hoveredId && !isLegendaryId(hoveredId) ? pools.find((p) => p.id === hoveredId) ?? null : null;
  const hoveredLegendary = hoveredId && isLegendaryId(hoveredId) ? findLegendary(hoveredId, legendary) ?? null : null;
  const hoveredItemSlots = hovered ? gearBuild.slots[hovered]?.itemSlots ?? EMPTY_SLOTS : EMPTY_SLOTS;
  const hoveredPoolData = hoveredPool ? poolDataCache[hoveredPool.id] ?? null : null;

  return (
    <CardShell>
      <CardTitleLink href="/crafting" icon={ICONS.gear} title="Gear" />
      <div style={{ height: "2px", background: "#333333" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
        {LAYOUT.map(([left, right]) =>
          [left, right].map((slotId) => {
            const id = gearBuild.loadout[slotId];
            const pool = id && !isLegendaryId(id) ? pools.find((p) => p.id === id) ?? null : null;
            const legendaryItem = id && isLegendaryId(id) ? findLegendary(id, legendary) ?? null : null;
            const hasSelection = Boolean(pool || legendaryItem);
            const psCount = pool ? psCountFor(gearBuild.slots[slotId]?.itemSlots ?? EMPTY_SLOTS) : 0;
            const { gradientEnd, metallicKey } = legendaryItem ? LEGENDARY_COLORS : getPSRarityColors(psCount);
            const innerBg = hasSelection ? `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)` : "#0a0a0a";
            const border = hasSelection ? "3px solid transparent" : "3px solid #3f3f46";
            const background = hasSelection ? `${innerBg} padding-box, ${METALLIC_GRADIENTS[metallicKey]} border-box` : innerBg;
            return (
              <div key={slotId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {SLOT_LABELS[slotId]}
                </span>
                <div
                  onMouseEnter={(e) => { if (hasSelection) { setHovered(slotId); setTipPos({ x: e.clientX, y: e.clientY }); } }}
                  onMouseMove={(e) => { if (hasSelection) setTipPos({ x: e.clientX, y: e.clientY }); }}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: slotSize,
                    height: slotSize,
                    background,
                    border,
                    borderRadius: "0 18px 0 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: hasSelection ? 1 : 0.35,
                    cursor: hasSelection ? "pointer" : "default",
                  }}
                >
                  {pool ? (
                    <img src={getPoolIconPath(pool)} alt={pool.name} style={{ width: "78%", height: "78%", objectFit: "contain" }} />
                  ) : legendaryItem ? (
                    <img src={getLegendaryIconPath(legendaryItem)} alt={parseLegendaryName(legendaryItem.name).displayName} style={{ width: "78%", height: "78%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ transform: "scale(0.62)", transformOrigin: "center" }}>{SLOT_ICONS[slotId]}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {hoveredPool && tipPos && (
        <GearTooltipCard pool={hoveredPool} itemSlots={hoveredItemSlots} poolData={hoveredPoolData} psCount={psCountFor(hoveredItemSlots)} cx={tipPos.x} cy={tipPos.y} />
      )}
      {hoveredLegendary && tipPos && (
        <LegendaryTooltipCard
          item={hoveredLegendary}
          selections={hovered ? gearBuild.legendarySlots[hovered]?.selections : undefined}
          cx={tipPos.x}
          cy={tipPos.y}
        />
      )}
    </CardShell>
  );
}

// ─── Skills ───────────────────────────────────────────────────────────────────

const HEX_R = 24;
const HEX_HW = HEX_R * 0.866; // half-width of a pointy-top hex
const HEX_STEP_X = HEX_HW * 2 + 6;
const HEX_STEP_Y = HEX_R * 2 + 16;

function hexPoints(cx: number, cy: number, r: number = HEX_R): string {
  const hw = r * 0.866;
  return [
    [cx,      cy - r    ],
    [cx + hw, cy - r/2  ],
    [cx + hw, cy + r/2  ],
    [cx,      cy + r    ],
    [cx - hw, cy + r/2  ],
    [cx - hw, cy - r/2  ],
  ].map(([x, y]) => `${x},${y}`).join(" ");
}

// Defined at module scope (not inside SkillsCard) so its identity stays stable across
// re-renders — otherwise every hover-triggered state update would redefine this function,
// forcing React to unmount/remount the <g> under the cursor mid-hover and drop the
// mouseleave that was supposed to clear the tooltip, leaving it stuck on screen.
function HexSlot({ cx, cy, skill, onEnter, onMove, onLeave }: {
  cx: number; cy: number; skill: Skill | null;
  onEnter: (e: React.MouseEvent, skill: Skill) => void;
  onMove: (e: React.MouseEvent, skill: Skill) => void;
  onLeave: () => void;
}) {
  const iconHref = skill ? getTooltipIconPath(skill) : undefined;
  const points = hexPoints(cx, cy);
  const clipId = `ov-skill-hex-${Math.round(cx)}-${Math.round(cy)}`;
  return (
    <g
      onMouseEnter={(e) => { if (skill) onEnter(e, skill); }}
      onMouseMove={(e) => { if (skill) onMove(e, skill); }}
      onMouseLeave={onLeave}
      style={{ cursor: skill ? "pointer" : "default" }}
    >
      <polygon points={points} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
      {iconHref && (
        <>
          <defs>
            <clipPath id={clipId}>
              <polygon points={points} />
            </clipPath>
          </defs>
          <image
            href={iconHref}
            x={cx - HEX_HW} y={cy - HEX_R} width={HEX_HW * 2} height={HEX_R * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </>
      )}
    </g>
  );
}

function SkillsCard() {
  const [skillsBuild] = useSkillsBuild();
  const [activeCatalog, setActiveCatalog] = useState<Skill[]>([]);
  const [passiveCatalog, setPassiveCatalog] = useState<Skill[]>([]);
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    getJSON<Skill[]>("/api/skills?type=Active").then(setActiveCatalog).catch(console.error);
    getJSON<Skill[]>("/api/skills?type=Passive").then(setPassiveCatalog).catch(console.error);
  }, []);

  const pad = 4;
  const row1Y = HEX_R + pad;
  const row2Y = row1Y + HEX_STEP_Y;
  const svgW = pad + HEX_HW * 2 * 5 + 4 * 5 + pad;
  const svgH = row2Y + HEX_R + pad;
  const startX = pad + HEX_HW - 1;
  const row1Xs = Array.from({ length: 5 }, (_, i) => startX + i * HEX_STEP_X);
  const row2Xs = Array.from({ length: 4 }, (_, i) => startX + i * HEX_STEP_X);

  function skillFor(name: string | null, catalog: Skill[]): Skill | null {
    return name ? catalog.find((s) => s.name === name) ?? null : null;
  }

  function handleEnter(e: React.MouseEvent, skill: Skill) { setHovered(skill); setTipPos({ x: e.clientX, y: e.clientY }); }
  function handleMove(e: React.MouseEvent, skill: Skill) { setTipPos({ x: e.clientX, y: e.clientY }); }
  function handleLeave() { setHovered(null); }

  return (
    <CardShell>
      <CardTitleLink href="/skills" icon={ICONS.skills} title="Skills" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {row1Xs.map((cx, i) => (
          <HexSlot key={i} cx={cx} cy={row1Y} skill={skillFor(skillsBuild.activeSkillSelections[i] ?? null, activeCatalog)} onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave} />
        ))}
        <line x1={0} y1={(row1Y + row2Y) / 2} x2={svgW} y2={(row1Y + row2Y) / 2} stroke="#1c1c1c" strokeWidth="1" />
        {row2Xs.map((cx, i) => (
          <HexSlot key={i} cx={cx} cy={row2Y} skill={skillFor(skillsBuild.passiveSkillSelections[i] ?? null, passiveCatalog)} onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave} />
        ))}
      </svg>
      {hovered && tipPos && <SkillTooltipCard skill={hovered} cx={tipPos.x} cy={tipPos.y} />}
    </CardShell>
  );
}

// ─── Pactspirits ──────────────────────────────────────────────────────────────

const PS_R = 26;

// Module-scope (see HexSlot above for why): keeps the <g> node stable across hover
// re-renders so the icon's own mouseleave always fires and clears the tooltip.
function SpiritSlot({ cx, cy, spirit, onEnter, onMove, onLeave }: {
  cx: number; cy: number; spirit: PactSpirit | null;
  onEnter: (e: React.MouseEvent, spirit: PactSpirit) => void;
  onMove: (e: React.MouseEvent, spirit: PactSpirit) => void;
  onLeave: () => void;
}) {
  const clipId = `ov-spirit-circle-${Math.round(cx)}-${Math.round(cy)}`;
  const rarityColor = spirit ? RARITY_COLOR[spirit.rarity] ?? "#ffffff" : null;
  return (
    <g
      onMouseEnter={(e) => { if (spirit) onEnter(e, spirit); }}
      onMouseMove={(e) => { if (spirit) onMove(e, spirit); }}
      onMouseLeave={onLeave}
      style={{ cursor: spirit ? "pointer" : "default" }}
    >
      <circle cx={cx} cy={cy} r={PS_R} fill="#111" stroke="#3a3a3a" strokeWidth="3" />
      {spirit && (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx={cx} cy={cy} r={PS_R - 3} />
            </clipPath>
          </defs>
          <image
            href={getSpiritIconPath(spirit)}
            x={cx - PS_R} y={cy - PS_R} width={PS_R * 2} height={PS_R * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </>
      )}
      <circle cx={cx} cy={cy} r={PS_R} fill="none" stroke={rarityColor ?? "none"} strokeWidth={rarityColor ? "3" : "0"} />
    </g>
  );
}

function PactspiritsCard() {
  const [pactspiritsBuild] = usePactspiritsBuild();
  const [battleSpirits, setBattleSpirits] = useState<PactSpirit[]>([]);
  const [dropSpirits, setDropSpirits] = useState<PactSpirit[]>([]);
  const [hovered, setHovered] = useState<PactSpirit | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    getJSON<PactSpirit[]>("/api/pactspirits?category=battle").then(setBattleSpirits).catch(console.error);
    getJSON<PactSpirit[]>("/api/pactspirits?category=drop").then(setDropSpirits).catch(console.error);
  }, []);

  const gap = 14;
  const pad = 2;
  const step = PS_R * 2 + gap;
  const rowY = PS_R + pad;
  const svgW = pad + PS_R * 2 * 3 + gap * 2 + pad;
  const svgH = rowY + PS_R + pad;
  const xs = Array.from({ length: 3 }, (_, i) => pad + PS_R + i * step);

  function spiritFor(idx: number, category: "battle" | "drop"): PactSpirit | null {
    const name = pactspiritsBuild.slotSelections[`${category}-${idx}`];
    if (!name) return null;
    const catalog = category === "battle" ? battleSpirits : dropSpirits;
    return catalog.find((s) => s.name === name) ?? null;
  }

  function handleEnter(e: React.MouseEvent, spirit: PactSpirit) { setHovered(spirit); setTipPos({ x: e.clientX, y: e.clientY }); }
  function handleMove(e: React.MouseEvent, spirit: PactSpirit) { setTipPos({ x: e.clientX, y: e.clientY }); }
  function handleLeave() { setHovered(null); }

  function spiritRow(category: "battle" | "drop") {
    return (
      <svg width={svgW} height={svgH} style={{ display: "block", margin: "0 auto" }}>
        {xs.map((cx, i) => (
          <SpiritSlot key={i} cx={cx} cy={rowY} spirit={spiritFor(i, category)} onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave} />
        ))}
      </svg>
    );
  }

  return (
    <CardShell>
      <CardTitleLink href="/pactspirits" icon={ICONS.pactspirits} title="Pactspirits" />
      <div style={{ height: "2px", background: "#333333" }} />
      {spiritRow("battle")}
      <div style={{ height: "1px", background: "#1c1c1c" }} />
      {spiritRow("drop")}
      {hovered && tipPos && <PactSpiritTooltipCard spirit={hovered} cx={tipPos.x} cy={tipPos.y} />}
    </CardShell>
  );
}

// ─── Hero Trait ───────────────────────────────────────────────────────────────

function HeroTraitCard() {
  const [heroTraitBuild] = useHeroTraitBuild();
  const [heroTraits, setHeroTraits] = useState<HeroTrait[]>([]);
  const [hoveredTrait, setHoveredTrait] = useState<{ trait: HeroTrait; iconPath: string | null; selected: boolean; traitLevel?: number } | null>(null);
  const [hoveredMemory, setHoveredMemory] = useState<{ col: number } | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  const selectedHero = heroTraitBuild.selectedHero;

  useEffect(() => {
    setHeroTraits([]);
    if (!selectedHero) return;
    getJSON<HeroTrait[]>(`/api/hero-traits?hero=${encodeURIComponent(selectedHero.hero)}`)
      .then(setHeroTraits)
      .catch(console.error);
  }, [selectedHero?.hero]);

  // Slightly larger than before (was 20) to compensate visually for the trait circles
  // losing their border stroke.
  const cr = 23;
  const sq = cr * 2;
  const cornerR = 7;
  const colBPad = 6;
  const colBorderR = 10;
  const colGap = 20;
  const rowGap = 12;
  const pad = colBPad;
  const cols = 4;
  const stepX = sq + colGap;
  const circleY = pad + colBPad + cr;
  const sqTop = circleY + cr + rowGap;
  const svgW = pad + stepX * (cols - 1) + sq + pad + colBPad;
  const svgH = sqTop + sq + colBPad + pad;

  function trBlPath(x: number, y: number, w: number, h: number, r: number): string {
    return [
      `M ${x} ${y}`,
      `L ${x + w - r} ${y}`,
      `Q ${x + w} ${y} ${x + w} ${y + r}`,
      `L ${x + w} ${y + h}`,
      `L ${x + r} ${y + h}`,
      `Q ${x} ${y + h} ${x} ${y + h - r}`,
      `L ${x} ${y}`,
      `Z`,
    ].join(" ");
  }

  const variantName = selectedHero ? getVariantName(selectedHero.hero) : "";
  const level1Trait = heroTraits.find((t) => t.level === 1) ?? null;
  const centerIconPath = selectedHero && level1Trait
    ? getTraitIconPath(selectedHero.heroGroup, variantName, 1, 1, level1Trait.name)
    : null;

  // Column 0 (i===0 below) is the center hero-trait circle; columns 1-3 are the memory columns.
  function memoryColumnTrait(memCol: number): { trait: HeroTrait; iconPath: string } | null {
    if (!selectedHero) return null;
    const selectedName = heroTraitBuild.traitSelections[memCol];
    if (!selectedName) return null;
    const trait = heroTraits.find((t) => t.name === selectedName);
    if (!trait) return null;
    const level = [45, 60, 75][memCol];
    const names = HERO_TRAIT_ORDER[selectedHero.heroGroup]?.[variantName]?.[level] ?? [];
    // Icon filenames are 1-indexed (row 0 → slot 1, row 2 → slot 2), unlike HERO_TRAIT_ORDER's array.
    const slot = names[1] === selectedName ? 2 : 1;
    return { trait, iconPath: getTraitIconPath(selectedHero.heroGroup, variantName, level, slot, trait.name) };
  }

  return (
    <CardShell>
      <CardTitleLink href="/hero-trait" icon={ICONS.heroTrait} title="Hero Trait" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block", overflow: "visible" }}>
        {Array.from({ length: cols }, (_, i) => {
          const x = pad + i * stepX;
          const cx = x + cr;
          const bx = x - colBPad;
          const by = circleY - cr - colBPad;
          const bw = sq + colBPad * 2;
          const bh = sqTop + sq + colBPad - by;

          const memCol = i - 1;
          const memFilled = memCol >= 0 && heroTraitBuild.memoryFilled[memCol];
          const memQuality = memCol >= 0 ? heroTraitBuild.memoryQuality[memCol] : null;
          const memColTrait = memCol >= 0 ? memoryColumnTrait(memCol) : null;
          const memQc = memQuality ? MEMORY_QUALITY_CONFIG[memQuality] : null;
          const circleClipId = `ov-trait-circle-${i}`;

          return (
            <g key={i}>
              <path d={trBlPath(bx, by, bw, bh, colBorderR)} fill="none" stroke="#2a2a2a" strokeWidth="1" />
              <g
                onMouseEnter={(e) => {
                  if (i === 0 && level1Trait) {
                    setHoveredTrait({ trait: level1Trait, iconPath: centerIconPath, selected: true });
                    setTipPos({ x: e.clientX, y: e.clientY });
                  } else if (memColTrait) {
                    setHoveredTrait({ trait: memColTrait.trait, iconPath: memColTrait.iconPath, selected: true });
                    setTipPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseMove={(e) => { if (i === 0 ? level1Trait : memColTrait) setTipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseLeave={() => setHoveredTrait(null)}
                style={{ cursor: (i === 0 ? level1Trait : memColTrait) ? "pointer" : "default" }}
              >
                <circle cx={cx} cy={circleY} r={cr} fill="#111" stroke={(i === 0 ? centerIconPath : memColTrait) ? "none" : "#3f3f46"} strokeWidth="1.5" />
                {((i === 0 && centerIconPath) || (i !== 0 && memColTrait)) && (
                  <defs>
                    <clipPath id={circleClipId}>
                      <circle cx={cx} cy={circleY} r={cr} />
                    </clipPath>
                  </defs>
                )}
                {i === 0 && centerIconPath && (
                  <image href={centerIconPath} x={cx - cr} y={circleY - cr} width={cr * 2} height={cr * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${circleClipId})`} />
                )}
                {i !== 0 && memColTrait && (
                  <image href={memColTrait.iconPath} x={cx - cr} y={circleY - cr} width={cr * 2} height={cr * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${circleClipId})`} />
                )}
              </g>
              {i !== 0 && (
                <g
                  onMouseEnter={(e) => { if (memFilled) { setHoveredMemory({ col: memCol }); setTipPos({ x: e.clientX, y: e.clientY }); } }}
                  onMouseMove={(e) => { if (memFilled) setTipPos({ x: e.clientX, y: e.clientY }); }}
                  onMouseLeave={() => setHoveredMemory(null)}
                  style={{ cursor: memFilled ? "pointer" : "default" }}
                >
                  {memQc && memQuality && (
                    <>
                      <defs>
                        <linearGradient id={`ov-mem-grad-${memCol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MEM_BG_STOPS[memQuality][0]} />
                          <stop offset="100%" stopColor={MEM_BG_STOPS[memQuality][1]} />
                        </linearGradient>
                      </defs>
                      {/* Underline plate peeking out below/behind the icon, matching the hover card's icon treatment.
                          Offset less than the tooltip's version (which uses a much larger icon) so the corner
                          rounding doesn't spill out past the sides at this smaller size, but kept full-width. */}
                      <path d={trBlPath(x, sqTop + 2, sq, sq, cornerR)} fill={memQc.border} />
                    </>
                  )}
                  <path d={trBlPath(x, sqTop, sq, sq, cornerR)} fill={memQc ? `url(#ov-mem-grad-${memCol})` : "#111"} stroke={memQc ? "none" : "#3f3f46"} strokeWidth="1.5" />
                  {memFilled && (
                    <image href={`/icons/equipment/${MEMORY_LABELS[memCol]}.webp`} x={x + sq * 0.1} y={sqTop + sq * 0.1} width={sq * 0.8} height={sq * 0.8} preserveAspectRatio="xMidYMid slice" />
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {hoveredTrait && tipPos && (
        <TraitTooltipCard trait={hoveredTrait.trait} iconPath={hoveredTrait.iconPath} selected={hoveredTrait.selected} cx={tipPos.x} cy={tipPos.y} />
      )}
      {hoveredMemory && tipPos && heroTraitBuild.memoryQuality[hoveredMemory.col] && (
        <MemoryTooltipCard
          label={MEMORY_LABELS[hoveredMemory.col]}
          quality={heroTraitBuild.memoryQuality[hoveredMemory.col]!}
          selectedIds={heroTraitBuild.memorySelections[hoveredMemory.col]}
          cx={tipPos.x}
          cy={tipPos.y}
        />
      )}
    </CardShell>
  );
}

// ─── Talents ──────────────────────────────────────────────────────────────────

function treeOwnIconPath(iconFolder: string): string {
  return `/icons/talents/${iconFolder}/${iconFolder.split("/").pop()}.webp`;
}

function TalentsCard() {
  const [talentsBuild] = useTalentsBuild();
  const [hovered, setHovered] = useState<{ iconSrc: string; name: string; details?: string; accentColor: string } | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  function showTooltip(e: React.MouseEvent, data: { iconSrc: string; name: string; details?: string; accentColor: string }) {
    setHovered(data);
    setTipPos({ x: e.clientX, y: e.clientY });
  }

  return (
    <CardShell>
      <CardTitleLink href="/talents" icon={ICONS.talents} title="Talents" />
      <div style={{ height: "2px", background: "#333333" }} />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, i) => {
          const sel = talentsBuild.slots[i];
          const godKey = sel ? selGodKey(sel) : null;
          const god = godKey ? GODS.find((g) => g.key === godKey) ?? null : null;
          const treeName = sel ? selToDataName(sel) : null;
          const treeDisplayName = sel ? selToTreeName(sel) : null;
          const iconFolder = sel ? selToIconFolder(sel) : null;
          const treeIconPath = iconFolder ? treeOwnIconPath(iconFolder) : null;
          const treeProgress = treeName ? talentsBuild.progress[treeName] : undefined;
          const treeData = treeName ? TalentTrees.find((t) => t.name === treeName) : undefined;
          const accentColor = godKey ? GOD_COLORS[godKey] ?? "#888" : "#888";

          function coreIcon(tier: 1 | 2): { path: string; core: CoreTalentData } | null {
            const iconName = treeProgress?.core?.[tier];
            if (!iconName || !iconFolder || !treeData) return null;
            const core = treeData.core?.find((c) => c.iconName === iconName);
            if (!core) return null;
            return { path: `/icons/talents/${iconFolder}/${iconName}.webp`, core };
          }

          // Column 1 (diagonal shape) is the equipped tree. Only slot 0 is a god/base tree,
          // which is the only one with both a tier-1 and tier-2 core choice (columns 2 & 3);
          // slots 1-3 are hero trees with a single core tier, so they only need column 2.
          const core1 = coreIcon(1);
          const core2 = coreIcon(2);
          // Slot 0's first circle is always tier-1; other slots show whichever tier is set.
          const firstCircleCore = i === 0 ? core1 : core1 ?? core2;

          return (
            <div
              key={i}
              style={{
                height: "56px",
                border: "1.5px solid #2a2a2a",
                borderRadius: "0 10px 0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                marginLeft: "8px",
                marginRight: "8px",
              }}
            >
              <div style={{ position: "absolute", left: "calc(50% - 74px)", width: "36px", height: "36px", border: `2px solid ${treeIconPath ? "#ffffff" : "#3f3f46"}`, background: "#111", borderRadius: "6px", transform: "skewY(-15deg)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {treeIconPath && (
                  <img
                    src={treeIconPath}
                    alt=""
                    style={{ width: "78%", height: "78%", objectFit: "cover", transform: "skewY(15deg) scale(1.3)", cursor: "pointer" }}
                    onMouseEnter={(e) => treeDisplayName && showTooltip(e, { iconSrc: treeIconPath, name: treeDisplayName, accentColor })}
                    onMouseMove={(e) => treeDisplayName && showTooltip(e, { iconSrc: treeIconPath, name: treeDisplayName, accentColor })}
                    onMouseLeave={() => setHovered(null)}
                  />
                )}
              </div>
              <div style={{ position: "absolute", left: "calc(50% - 38px)", width: "18px", height: "1px", background: (treeIconPath && firstCircleCore) ? "#ffffff" : "#3f3f46", top: "50%", transform: "translateY(-50%)" }} />
              <svg width="40" height="40" style={{ flexShrink: 0, overflow: "visible" }}>
                <circle cx="20" cy="20" r="19.25" fill="#111" stroke={firstCircleCore ? "#ffffff" : "#3f3f46"} strokeWidth="1.5" />
                {firstCircleCore && (
                  <image
                    href={firstCircleCore.path} x="2" y="2" width="36" height="36" preserveAspectRatio="xMidYMid slice"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => showTooltip(e, { iconSrc: firstCircleCore.path, name: firstCircleCore.core.name, details: firstCircleCore.core.rawAffix, accentColor })}
                    onMouseMove={(e) => showTooltip(e, { iconSrc: firstCircleCore.path, name: firstCircleCore.core.name, details: firstCircleCore.core.rawAffix, accentColor })}
                    onMouseLeave={() => setHovered(null)}
                  />
                )}
              </svg>
              {i === 0 && <>
                <div style={{ position: "absolute", left: "calc(50% + 20px)", width: "18px", height: "1px", background: (core1 && core2) ? "#ffffff" : "#3f3f46", top: "50%", transform: "translateY(-50%)" }} />
                <svg style={{ position: "absolute", left: "calc(50% + 38px)", overflow: "visible" }} width="40" height="40">
                  <circle cx="20" cy="20" r="19.25" fill="#111" stroke={core2 ? "#ffffff" : "#3f3f46"} strokeWidth="1.5" />
                  {core2 && (
                    <image
                      href={core2.path} x="2" y="2" width="36" height="36" preserveAspectRatio="xMidYMid slice"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => showTooltip(e, { iconSrc: core2.path, name: core2.core.name, details: core2.core.rawAffix, accentColor })}
                      onMouseMove={(e) => showTooltip(e, { iconSrc: core2.path, name: core2.core.name, details: core2.core.rawAffix, accentColor })}
                      onMouseLeave={() => setHovered(null)}
                    />
                  )}
                </svg>
              </>}
            </div>
          );
        })}
      </div>
      {hovered && tipPos && (
        <TalentTooltipCard iconSrc={hovered.iconSrc} name={hovered.name} details={hovered.details} accentColor={hovered.accentColor} cx={tipPos.x} cy={tipPos.y} />
      )}
    </CardShell>
  );
}

// ─── Divinity Slates ──────────────────────────────────────────────────────────

// Builds the closed SVG path string for the perimeter outline of a slate's cell group —
// adapted from divinity-slates/page.tsx's buildSlateOutlinePath, parameterized on this
// card's own (smaller) grid metrics instead of that page's module-scope constants.
type OutlineSeg = { x1: number; y1: number; x2: number; y2: number };

function buildSlateOutlinePath(
  cells: { r: number; c: number }[],
  anchor: { row: number; col: number },
  pad: number, step: number, slot: number, gap: number,
): string {
  const inSet = new Set(cells.map(({ r, c }) => `${r},${c}`));
  const has = (r: number, c: number) => inSet.has(`${r},${c}`);
  const d = gap / 2;
  const segs: OutlineSeg[] = [];

  for (const { r, c } of cells) {
    const x = pad + (anchor.col + c) * step;
    const y = pad + (anchor.row + r) * step;
    if (!has(r - 1, c)) segs.push({ x1: x - d, y1: y - d, x2: x + slot + d, y2: y - d });
    if (!has(r, c + 1)) segs.push({ x1: x + slot + d, y1: y - d, x2: x + slot + d, y2: y + slot + d });
    if (!has(r + 1, c)) segs.push({ x1: x - d, y1: y + slot + d, x2: x + slot + d, y2: y + slot + d });
    if (!has(r, c - 1)) segs.push({ x1: x - d, y1: y - d, x2: x - d, y2: y + slot + d });
  }

  const ptk = (x: number, y: number) => `${x},${y}`;
  const adj = new Map<string, number[]>();
  segs.forEach((s, i) => {
    const ka = ptk(s.x1, s.y1), kb = ptk(s.x2, s.y2);
    adj.set(ka, [...(adj.get(ka) ?? []), i]);
    adj.set(kb, [...(adj.get(kb) ?? []), i]);
  });
  const used = new Set<number>();
  const subpaths: string[] = [];
  for (let si = 0; si < segs.length; si++) {
    if (used.has(si)) continue;
    used.add(si);
    const pts: string[] = [`${segs[si].x1} ${segs[si].y1}`, `${segs[si].x2} ${segs[si].y2}`];
    let cur = ptk(segs[si].x2, segs[si].y2);
    for (;;) {
      const next = (adj.get(cur) ?? []).find((i) => !used.has(i));
      if (next === undefined) break;
      used.add(next);
      const s = segs[next];
      const [nx, ny] = ptk(s.x1, s.y1) === cur ? [s.x2, s.y2] : [s.x1, s.y1];
      pts.push(`${nx} ${ny}`);
      cur = ptk(nx, ny);
    }
    subpaths.push(`M ${pts.join(" L ")} Z`);
  }
  return subpaths.join(" ");
}

function DivinitySlatesCard() {
  const [divinitySlatesBuild] = useDivinitySlatesBuild();
  const [talents, setTalents] = useState<Talent[]>([]);
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    getJSON<Talent[]>("/api/talents").then(setTalents).catch(console.error);
  }, []);

  const slot = 26;
  const gap = 0;
  const step = slot + gap;
  const pad = 6;
  const rows = GRID_ROWS;
  const cols = GRID_COLS;
  const svgW = pad + cols * slot + (cols - 1) * gap + pad;
  const svgH = pad + rows * slot + (rows - 1) * gap + pad;

  const hoveredInstance = hoveredInstanceId ? divinitySlatesBuild.placedInstances.find((i) => i.id === hoveredInstanceId) ?? null : null;
  const hoveredDef = hoveredInstance ? SLATE_DEFS[hoveredInstance.slateName] : null;

  // Tint cells occupied by a placed slate with that slate's quality color, matching the
  // real divinity-slates board instead of leaving the neutral empty-cell fill underneath.
  const occupantColor = new Map<string, string>();
  for (const inst of divinitySlatesBuild.placedInstances) {
    const def = SLATE_DEFS[inst.slateName];
    if (!def) continue;
    const color = getSlateQuality(def).indicatorActiveInner;
    for (const { r, c } of getShapeCells(def, inst.config)) {
      occupantColor.set(cellKey(inst.anchor.row + r, inst.anchor.col + c), color);
    }
  }

  return (
    <CardShell>
      <CardTitleLink href="/divinity-slates" icon={ICONS.divinitySlates} title="Divinity Slates" />
      <div style={{ height: "2px", background: "#333333" }} />
      <div style={{ position: "relative", width: svgW, height: svgH }}>
        <svg width={svgW} height={svgH} style={{ position: "absolute", top: 0, left: 0 }}>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              if (GRID_REMOVED.has(cellKey(r, c))) return null;
              const x = pad + c * step;
              const y = pad + r * step;
              const color = occupantColor.get(cellKey(r, c));
              return <rect key={`${r},${c}`} x={x} y={y} width={slot} height={slot} rx="0" fill={color ?? "#111"} stroke={color ?? "#3f3f46"} strokeWidth="2" />;
            })
          )}
        </svg>
        <div style={{ position: "absolute", top: 0, left: 0, width: svgW, height: svgH, pointerEvents: "none" }}>
          {divinitySlatesBuild.placedInstances.map((inst) => {
            const def = SLATE_DEFS[inst.slateName];
            if (!def) return null;
            const iconPath = getInstanceIconPath(def, inst.config);
            const transform = getIconTransform(def, inst.config);
            return getShapeCells(def, inst.config).map(({ r, c }) => {
              const row = inst.anchor.row + r;
              const col = inst.anchor.col + c;
              if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
              return (
                <div
                  key={`${inst.id}-${r}-${c}`}
                  onMouseEnter={(e) => { setHoveredInstanceId(inst.id); setTipPos({ x: e.clientX, y: e.clientY }); }}
                  onMouseMove={(e) => setTipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredInstanceId(null)}
                  style={{
                    position: "absolute",
                    left: pad + col * step,
                    top: pad + row * step,
                    width: slot, height: slot,
                    overflow: "hidden",
                    pointerEvents: "auto",
                    cursor: "pointer",
                  }}
                >
                  <img src={iconPath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform }} />
                </div>
              );
            });
          })}
        </div>
        {/* Slate perimeter outlines — a top SVG layer above the artwork so each slate's full
            shape reads clearly, and thickens/glows on hover, matching the real board. */}
        <svg width={svgW} height={svgH} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <defs>
            {divinitySlatesBuild.placedInstances.map((inst) => {
              const def = SLATE_DEFS[inst.slateName];
              if (!def) return null;
              const cells = getShapeCells(def, inst.config);
              return (
                <clipPath key={inst.id} id={`ov-slate-clip-${inst.id}`}>
                  {cells.map(({ r, c }) => (
                    <rect
                      key={`${r},${c}`}
                      x={pad + (inst.anchor.col + c) * step}
                      y={pad + (inst.anchor.row + r) * step}
                      width={slot} height={slot}
                    />
                  ))}
                </clipPath>
              );
            })}
          </defs>
          {divinitySlatesBuild.placedInstances.map((inst) => {
            const def = SLATE_DEFS[inst.slateName];
            if (!def) return null;
            const cells = getShapeCells(def, inst.config);
            const quality = getSlateQuality(def);
            const isHovered = hoveredInstanceId === inst.id;
            const pathD = buildSlateOutlinePath(cells, inst.anchor, pad, step, slot, gap);
            if (!pathD) return null;
            const sw = isHovered ? 4.5 : 3;
            return (
              <path
                key={`outline-${inst.id}`}
                d={pathD}
                stroke={quality.border}
                strokeWidth={sw}
                fill="none"
                clipPath={`url(#ov-slate-clip-${inst.id})`}
                style={{
                  filter: isHovered ? `drop-shadow(0 0 4px ${quality.border})` : "none",
                  transition: "stroke-width 0.12s",
                }}
              />
            );
          })}
        </svg>
      </div>
      {hoveredInstance && hoveredDef && tipPos && (
        <SlateTooltipCard
          def={hoveredDef}
          config={hoveredInstance.config}
          displayName={getSlateDisplayName(hoveredDef)}
          quality={getSlateQuality(hoveredDef)}
          iconPath={getInstanceIconPath(hoveredDef, hoveredInstance.config)}
          talents={talents}
          hasConflict={false}
          cx={tipPos.x}
          cy={tipPos.y}
        />
      )}
    </CardShell>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS = {
  gear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  skills: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  pactspirits: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v10l3-3 3 3 3-3 3 3 3-3V10a8 8 0 0 0-8-8z" />
    </svg>
  ),
  talents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  heroTrait: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  divinitySlates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
};

export default function OverviewPage() {
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div className="min-h-screen flex flex-col items-center justify-center px-[15%]">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "24px", width: "100%", maxWidth: "1100px", zoom: 1.265 }}>

          {/* Column 1 — Gear */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <GearCard />
          </div>

          {/* Column 2 — Skills, Pactspirits */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <SkillsCard />
            <PactspiritsCard />
          </div>

          {/* Column 3 — Hero Trait, Talents */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <HeroTraitCard />
            <TalentsCard />
          </div>

          {/* Column 4 — Divinity Slates */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <DivinitySlatesCard />
          </div>

        </div>
      </div>
    </div>
  );
}
