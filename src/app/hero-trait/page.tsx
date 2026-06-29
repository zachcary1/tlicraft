"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { HERO_TRAIT_ORDER } from "./heroTraitOrder";
import type { ActiveSlotId } from "../crafting/ItemCard";

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/hero%20trait.png')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const PANEL_BG  = "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)";
const PANEL_W   = 560;
const CIRCLE_D  = 150;
const PANEL_GAP = 50;

// ─── Right grid layout ────────────────────────────────────────────────────────

const SLOT_SIZE  = 132;
const COL_GAP    = 48;
const ROW_GAP    = 36;
const CIRCLE2_D  = 96;
const HEX_R      = 62;
const GRID_GAP   = 120;
const ARC_OFFSET = 28;

const GRID_W = 3 * SLOT_SIZE + 2 * COL_GAP + ARC_OFFSET;
const GRID_H = 3 * SLOT_SIZE + 2 * ROW_GAP;

const MEMORY_LABELS = ["Memory of Origin", "Memory of Discipline", "Memory of Progress"] as const;

type MemoryQuality = "epic" | "ultimate";

const MEMORY_QUALITY_CONFIG: Record<MemoryQuality, { bg: string; border: string; glow: string; bgGlow: string; accentBg: string; label: string; traitLevel: number; maxLevel: number }> = {
  epic: {
    bg:       "linear-gradient(to bottom, #0e0300 0%, #cc6624 100%)",
    border:   "#feba67",
    glow:     "0 0 12px rgba(254,186,103,0.6), 0 0 28px rgba(254,186,103,0.28)",
    bgGlow:   "0 0 24px rgba(204,102,36,0.75), 0 0 60px rgba(204,102,36,0.4)",
    accentBg: "linear-gradient(to right, #7a3a12, #1a0800)",
    label:    "Epic",
    traitLevel: 2,
    maxLevel: 40,
  },
  ultimate: {
    bg:       "linear-gradient(to bottom, #080002 0%, #ae1727 100%)",
    border:   "#ff8e98",
    glow:     "0 0 12px rgba(255,142,152,0.6), 0 0 28px rgba(255,142,152,0.28)",
    bgGlow:   "0 0 24px rgba(174,23,39,0.75), 0 0 60px rgba(174,23,39,0.4)",
    accentBg: "linear-gradient(to right, #6b0f18, #100003)",
    label:    "Ultimate",
    traitLevel: 3,
    maxLevel: 50,
  },
};

function slotPos(row: number, col: number) {
  return {
    x: col * (SLOT_SIZE + COL_GAP) + (row === 1 ? ARC_OFFSET : 0),
    y: row * (SLOT_SIZE + ROW_GAP),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexPoints(cx: number, cy: number, R: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

interface HeroEntry {
  heroGroup: string;
  hero: string;
}

interface HeroTrait {
  id: string;
  heroGroup: string;
  hero: string;
  name: string;
  level: number;
  effect: string;
}

function getVariantName(hero: string): string {
  const colonIdx = hero.indexOf(": ");
  if (colonIdx === -1) return hero;
  return hero.slice(colonIdx + 2).replace(/ \(#\d+\)$/, "").trim();
}

// Per-hero artwork positioning overrides. Key: "HeroGroup:VariantName" or "HeroGroup" for base.
// top: vertical anchor (% or px), height: image size, right: px from right edge of container.
interface ArtworkOverride { height?: string; width?: string; top?: string; left?: number; file?: string }
const ARTWORK_OVERRIDES: Record<string, ArtworkOverride> = {
  "Bing:Blast Nova": { height: "110vh", top: "38%", left: -360 },
  "Bing:Creative Genius": { height: "70vh", top: "50%", left: 80 },
  "Carino:Lethal Flash": { height: "100vh", top: "58%", left: -80 },
  "Carino:Ranger of Glory": { height: "90vh", top: "60%", left: -100 },
  "Carino:Zealot of War": { height: "110vh", top: "44%", left: -480 },
  "Erika:Lightning Shadow": { height: "100vh", top: "50%", left: -300 },
  "Erika:Vendetta's Sting": { height: "100vh", top: "50%", left: -260 },
  "Erika:Wind Stalker": { height: "100vh", top: "50%", left: -160 },
  "Gemma:Frostbitten Heart": { height: "110vh", top: "43%", left: -80 },
  "Gemma:Ice-Fire Fusion": { height: "100vh", top: "58%", left: -80 },
  "Iris:Growing Breeze": { height: "100vh", top: "50%", left: -220 },
  "Iris:Vigilant Breeze": { height: "100vh", top: "50%", left: -80 },
  "Moto:Charge Calling": { height: "100vh", top: "43%", left: -120 },
  "Moto:Order Calling": { height: "100vh", top: "43%", left: -120 },
  "Rehan:Anger": { height: "90vh", top: "50%", left: 60 },
  "Rehan:Seething Silhouette": { height: "100vh", top: "43%", left: -120 },
  "Rosa:High Court Chariot": { height: "115vh", top: "50%", left: -180 },
  "Rosa:Unsullied Blade": { height: "110vh", top: "38%", left: -120 },
  "Selena:Sing with the Tide": { height: "100vh", top: "50%", left: -120 },
  "Thea:Wisdom of The Gods": { height: "100vh", top: "38%", left: 0 },
  "Youga:Spacetime Elapse": { height: "100vh", top: "50%", left: -220 },
  "Youga:Spacetime Illusion": { height: "115vh", top: "43%", left: 0 },
};
function getArtworkOverride(heroGroup: string, variantName: string): ArtworkOverride {
  return ARTWORK_OVERRIDES[`${heroGroup}:${variantName}`]
    ?? ARTWORK_OVERRIDES[heroGroup]
    ?? {};
}

// e.g. ("Rehan", "Anger", 45, 1, "Righteous Fury") → "/heroes/Rehan/traits/Anger/45-1 Righteous Fury.webp"
function getTraitIconPath(heroGroup: string, variantName: string, level: number, slot: number, traitName: string): string {
  return `/heroes/${heroGroup}/traits/${variantName}/${level}-${slot} ${traitName}.webp`;
}

// ─── Trait tooltip card ───────────────────────────────────────────────────────

const TT_ICON_R  = 40;
const TT_CARD_W  = 276;

function TraitTooltipCard({ trait, iconPath, selected, cx: cursorX, cy: cursorY, traitLevel }: {
  trait: HeroTrait;
  iconPath: string | null;
  selected: boolean;
  cx: number;
  cy: number;
  traitLevel?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(400);

  useEffect(() => { setImgError(false); }, [trait.name]);
  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const vpW     = window.innerWidth;
  const vpH     = window.innerHeight;
  const taskbar = Math.max(0, window.screen.height - window.screen.availHeight);
  const safeH   = vpH - (taskbar || 48);
  const GAP     = 18;
  const cardLeft = cursorX + GAP + TT_CARD_W <= vpW ? cursorX + GAP : cursorX - GAP - TT_CARD_W;
  const cardTop  = Math.max(TT_ICON_R + 8, Math.min(safeH - cardH, cursorY - 24));
  const iconD    = TT_ICON_R * 2;

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left: cardLeft, top: cardTop,
      width: TT_CARD_W,
      background: "linear-gradient(to bottom, #252c8a 0%, #1e2260 25%, #161a28 100%)",
      border: "1px solid #2a2a2a",
      borderRadius: "0 12px 0 12px",
      pointerEvents: "none",
      zIndex: 9999,
      overflow: "visible",
      boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
    }}>
      {/* Circular icon centered above card top edge */}
      <div style={{
        position: "absolute",
        top: -TT_ICON_R,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1,
        width: iconD, height: iconD,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #3b82f6",
        background: "#000000",
        boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
        flexShrink: 0,
      }}>
        {iconPath && !imgError ? (
          <img src={iconPath} alt={trait.name} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#444", fontSize: 18 }}>?</span>
          </div>
        )}
      </div>

      {/* Name + optional level */}
      <div style={{ paddingTop: TT_ICON_R + 14, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: "center" }}>
        <div style={{ color: "#ffffff", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          {trait.name}
        </div>
        {traitLevel !== undefined && (
          <div style={{
            marginTop: 5,
            color: "#a0b4ff",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Level {traitLevel}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#2a2a2a", marginLeft: 14, marginRight: 14 }} />

      {/* Effect */}
      <div style={{ padding: "10px 14px 10px" }}>
        {trait.effect && (
          <div className="skill-effect" dangerouslySetInnerHTML={{ __html: trait.effect }} />
        )}
      </div>

      {/* Bottom divider + status */}
      <div style={{ height: 1, background: "#2a2a2a", marginLeft: 14, marginRight: 14 }} />
      <div style={{ padding: "8px 14px 10px", textAlign: "center" }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
          color: selected ? "#a0b4ff" : "#52525b",
          fontWeight: selected ? 600 : 400,
          transition: "color 0.2s",
        }}>
          {selected ? "Currently Active" : "Click to Activate"}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Locked tooltip ───────────────────────────────────────────────────────────

function LockedTooltip({ reason, x, y }: { reason: string; x: number; y: number }) {
  return (
    <div style={{
      position: "fixed",
      left: x,
      top: y - 38,
      transform: "translateX(-50%)",
      background: "#111111",
      border: "1px solid #555555",
      borderRadius: "0 6px 0 6px",
      padding: "5px 10px",
      color: "#e4e4e7",
      fontSize: 11,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 9999,
      letterSpacing: "0.03em",
    }}>
      {reason}
    </div>
  );
}

// ─── Trait slot ───────────────────────────────────────────────────────────────

function TraitSlot({
  withHex,
  iconPath,
  traitName,
  inactive,
  locked,
  lockReason,
  trait,
  selected,
  dimmed,
  traitLevel,
  onClick,
}: {
  withHex: boolean;
  iconPath?: string | null;
  traitName?: string;
  inactive?: boolean;
  locked?: boolean;
  lockReason?: string;
  trait?: HeroTrait | null;
  selected?: boolean;
  dimmed?: boolean;
  traitLevel?: number;
  onClick?: () => void;
}) {
  const [hovered,      setHovered]      = useState(false);
  const [imgError,     setImgError]     = useState(false);
  const [tipPos,       setTipPos]       = useState<{ x: number; y: number } | null>(null);
  const [tooltipPos,   setTooltipPos]   = useState<{ x: number; y: number } | null>(null);
  const cx = SLOT_SIZE / 2;
  const cy = SLOT_SIZE / 2;

  useEffect(() => { setImgError(false); }, [iconPath]);

  const isInteractive = !inactive && !locked;
  const showIcon = !!iconPath && !imgError;
  const showTooltip = !locked && !inactive && !!trait;

  const hexStroke   = selected ? "#ffffff" : locked ? "#333333" : dimmed ? "#3a3a3a" : "#555555";
  const circleBorder = selected
    ? "2px solid #ffffff"
    : !locked && isInteractive && hovered
    ? "2px solid #3b82f6"
    : locked ? "2px solid #2a2a2a" : dimmed ? "2px solid #333333" : "2px solid #555555";
  const circleGlow = selected
    ? "0 0 12px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.2)"
    : !locked && isInteractive && hovered
    ? "0 0 14px rgba(59,130,246,0.3)"
    : "none";

  return (
    <div
      onMouseEnter={(e) => {
        if (isInteractive) setHovered(true);
        if (locked) setTipPos({ x: e.clientX, y: e.clientY });
        if (showTooltip) setTooltipPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        if (locked) setTipPos({ x: e.clientX, y: e.clientY });
        if (showTooltip) setTooltipPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => { setHovered(false); setTipPos(null); setTooltipPos(null); }}
      onClick={isInteractive ? onClick : undefined}
      style={{
        width: SLOT_SIZE, height: SLOT_SIZE,
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: locked ? "not-allowed" : isInteractive ? "pointer" : "default",
        opacity: inactive ? 0.25 : dimmed ? (hovered ? 0.75 : 0.4) : 1,
        transition: "opacity 0.2s",
      }}
    >
      {withHex && (
        <svg
          width={SLOT_SIZE} height={SLOT_SIZE}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <polygon
            points={hexPoints(cx, cy, HEX_R)}
            fill="none"
            stroke={hexStroke}
            strokeWidth={selected ? 2.5 : 2}
          />
        </svg>
      )}
      <div style={{
        width: CIRCLE2_D, height: CIRCLE2_D,
        borderRadius: "50%",
        background: "#000000",
        border: circleBorder,
        boxShadow: circleGlow,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        position: "relative", zIndex: 1,
      }}>
        {showIcon ? (
          <img
            src={iconPath!}
            alt={traitName}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: locked ? 0.45 : 1, transition: "opacity 0.2s" }}
          />
        ) : !inactive && !locked ? (
          <div style={{
            color: hovered ? "#60a5fa" : "#3b82f6",
            fontSize: 24, fontWeight: 300, lineHeight: 1,
            userSelect: "none", transition: "color 0.2s",
          }}>
            +
          </div>
        ) : null}

        {/* Dark overlay + lock icon when slot is locked */}
        {locked && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.52)",
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
              <path d="M7.5 12V8.5a4.5 4.5 0 0 1 9 0V12" stroke="#999999" strokeWidth="3.5" strokeLinecap="butt" />
              <rect x="3.5" y="11" width="17" height="11.5" rx="2.5" fill="#999999" />
            </svg>
          </div>
        )}
      </div>
      {selected && traitLevel !== undefined && (
        <div style={{
          position: "absolute",
          top: -16,
          left: 0, right: 0,
          textAlign: "center",
          color: "#c8d4ff",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          pointerEvents: "none",
          zIndex: 2,
          textShadow: "0 1px 4px rgba(0,0,0,0.9)",
          userSelect: "none",
        }}>
          Level {traitLevel}
        </div>
      )}
      {locked && lockReason && tipPos && createPortal(
        <LockedTooltip reason={lockReason} x={tipPos.x} y={tipPos.y} />,
        document.body
      )}
      {showTooltip && trait && tooltipPos && createPortal(
        <TraitTooltipCard trait={trait} iconPath={iconPath ?? null} selected={!!selected} cx={tooltipPos.x} cy={tooltipPos.y} traitLevel={selected ? traitLevel : undefined} />,
        document.body
      )}
    </div>
  );
}

// ─── Memory slot (row 1) ──────────────────────────────────────────────────────

function MemorySlot({
  label,
  filled,
  quality,
  locked,
  lockReason,
  onClick,
  selectedIds,
}: {
  label: string;
  filled: boolean;
  quality: MemoryQuality | null;
  locked: boolean;
  lockReason?: string;
  onClick: () => void;
  selectedIds?: MemorySlotSelections;
}) {
  const [hovered,    setHovered]    = useState(false);
  const [tipPos,     setTipPos]     = useState<{ x: number; y: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [imgError,   setImgError]   = useState(false);
  const iconPath = `/icons/equipment/${label}.webp`;
  useEffect(() => { setImgError(false); }, [label]);

  const qc = filled && quality ? MEMORY_QUALITY_CONFIG[quality] : null;

  const borderColor = !locked && hovered
    ? "#3b82f6"
    : qc ? qc.border
    : filled ? "#686867"
    : "#555555";
  const glow = !locked && hovered
    ? "0 0 14px rgba(59,130,246,0.3)"
    : qc ? qc.glow
    : "none";

  return (
    <div
      onMouseEnter={(e) => {
        if (!locked) setHovered(true);
        if (locked) setTipPos({ x: e.clientX, y: e.clientY });
        if (!locked && filled) setTooltipPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        if (locked) setTipPos({ x: e.clientX, y: e.clientY });
        if (!locked && filled) setTooltipPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => { setHovered(false); setTipPos(null); setTooltipPos(null); }}
      onClick={locked ? undefined : onClick}
      style={{
        width: SLOT_SIZE, height: SLOT_SIZE,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 8,
        cursor: locked ? "not-allowed" : "pointer",
        opacity: locked ? 0.1 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{
        width: CIRCLE2_D, height: CIRCLE2_D,
        borderRadius: "50%",
        background: qc ? qc.bg : filled ? "#1a1a1a" : "#000000",
        border: `2px solid ${borderColor}`,
        boxShadow: glow,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        flexShrink: 0,
      }}>
        {filled ? (
          !imgError ? (
            <img
              src={iconPath}
              alt={label}
              onError={() => setImgError(true)}
              style={{ width: "80%", height: "80%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <div style={{ color: "#4a7ab5", fontSize: 22, lineHeight: 1, userSelect: "none" }}>M</div>
          )
        ) : (
          <div style={{
            color: !locked && hovered ? "#60a5fa" : "#3b82f6",
            fontSize: 24, fontWeight: 300, lineHeight: 1,
            userSelect: "none", transition: "color 0.2s",
          }}>
            +
          </div>
        )}
      </div>
      <div style={{
        color: qc ? qc.border : filled ? "#7a9ab5" : "#52525b",
        fontSize: 8, letterSpacing: "0.07em", textTransform: "uppercase",
        textAlign: "center", lineHeight: 1.4,
        maxWidth: SLOT_SIZE - 8,
        userSelect: "none",
        transition: "color 0.2s",
      }}>
        {label}
      </div>
      {locked && lockReason && tipPos && createPortal(
        <LockedTooltip reason={lockReason} x={tipPos.x} y={tipPos.y} />,
        document.body
      )}
      {filled && quality && tooltipPos && selectedIds && (
        <MemoryTooltipCard
          label={label}
          quality={quality}
          selectedIds={selectedIds}
          cx={tooltipPos.x}
          cy={tooltipPos.y}
        />
      )}
    </div>
  );
}

// ─── Memory affix panel ──────────────────────────────────────────────────────

type MemoryAffix = { id: string; type: string; item: string; effect: string; tier: string };

type MemorySlotKey = "base" | "prefix1" | "prefix2" | "suffix1" | "suffix2";
type MemorySlotValue = { id: string; text: string; tier: string } | null;
type MemorySlotSelections = Record<MemorySlotKey, MemorySlotValue>;

const EMPTY_MEMORY_SELECTIONS: MemorySlotSelections = {
  base: null, prefix1: null, prefix2: null, suffix1: null, suffix2: null,
};

const SLOT_TYPE_MAP: Record<MemorySlotKey, string> = {
  base:    "Base Stats",
  prefix1: "Fixed Affix",
  prefix2: "Fixed Affix",
  suffix1: "Random Affix",
  suffix2: "Random Affix",
};

const SIBLING_SLOT: Partial<Record<MemorySlotKey, MemorySlotKey>> = {
  prefix1: "prefix2",
  prefix2: "prefix1",
  suffix1: "suffix2",
  suffix2: "suffix1",
};

const TRAIT_LEVEL_AFFIX = "+2 to Hero Trait Level";

function effectiveTraitLevel(quality: MemoryQuality, selections: MemorySlotSelections): number {
  const base = MEMORY_QUALITY_CONFIG[quality].traitLevel;
  const hasBonus =
    selections.prefix1?.text === TRAIT_LEVEL_AFFIX ||
    selections.prefix2?.text === TRAIT_LEVEL_AFFIX;
  return base + (hasBonus ? 2 : 0);
}

// ─── Memory tooltip card ─────────────────────────────────────────────────────

const MEM_CARD_W    = 272;
const MEM_ICON_H    = 79;
const MEM_ICON_W    = 86;
const MEM_ICON_HALF = MEM_ICON_H / 2;

function TierSquare({ tier }: { tier: string }) {
  const color = tier === "T0" ? "#fe3333"
    : tier === "T1" ? "#ff7c1c"
    : (tier === "T2" || tier === "T3") ? "#a457ff"
    : "#52525b";
  return (
    <div style={{ width: 8, height: 8, flexShrink: 0, marginTop: 3, background: color, borderRadius: "2px 0 2px 0" }} />
  );
}

function MemoryTooltipCard({
  label, quality, selectedIds,
  cx: cursorX, cy: cursorY,
}: {
  label: string;
  quality: MemoryQuality;
  selectedIds: MemorySlotSelections;
  cx: number;
  cy: number;
}) {
  const [imgErr, setImgErr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(360);

  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const qc = MEMORY_QUALITY_CONFIG[quality];
  const traitLvl = effectiveTraitLevel(quality, selectedIds);
  const iconPath = `/icons/equipment/${label}.webp`;

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const GAP = 18;
  const cardLeft = cursorX + GAP + MEM_CARD_W <= vpW ? cursorX + GAP : cursorX - GAP - MEM_CARD_W;
  const cardTop  = Math.max(MEM_ICON_HALF + 8, Math.min(vpH - cardH - 8, cursorY - 24));

  const baseText = selectedIds.base
    ? (label === "Memory of Origin" && quality === "ultimate"
        ? selectedIds.base.text.replace(/\b90\b/g, "120")
        : selectedIds.base.text)
    : null;

  const fixedAffixes  = [selectedIds.prefix1, selectedIds.prefix2];
  const randomAffixes = [selectedIds.suffix1,  selectedIds.suffix2];

  const gradientColor = quality === "ultimate" ? "rgba(174,23,39,0.35)" : "rgba(204,102,36,0.35)";
  const divider       = <div style={{ height: 1, background: "#3a3838", margin: "8px 0" }} />;

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left: cardLeft, top: cardTop,
      width: MEM_CARD_W, pointerEvents: "none", zIndex: 9999,
      overflow: "visible",
      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.85))",
      fontFamily: "'TLFont', Arial, Helvetica, sans-serif",
    }}>
      {/* Icon — top half protrudes above card */}
      <div style={{
        position: "absolute", top: -MEM_ICON_HALF, left: "50%",
        transform: "translateX(-50%)",
        width: MEM_ICON_W, height: MEM_ICON_H, zIndex: 10,
      }}>
        <div style={{
          position: "absolute", top: 4, left: 0,
          width: MEM_ICON_W, height: MEM_ICON_H,
          background: qc.border, borderRadius: "0 12px 0 12px", zIndex: 0,
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: MEM_ICON_W, height: MEM_ICON_H,
          background: qc.bg, borderRadius: "0 12px 0 12px",
          overflow: "hidden", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {!imgErr ? (
            <img src={iconPath} alt={label} onError={() => setImgErr(true)}
              style={{ width: "auto", height: "92%", objectFit: "contain" }} />
          ) : (
            <span style={{ color: "#666", fontSize: 18, fontWeight: 700 }}>M</span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ overflow: "hidden", borderRadius: "0 12px 0 12px" }}>

        {/* Top section */}
        <div style={{
          background: "#1f1f21", position: "relative",
          padding: `${MEM_ICON_H / 2 + 10}px 10px 12px`, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 10, left: 10, right: 10, bottom: 0,
            background: `linear-gradient(to bottom, ${gradientColor}, transparent)`,
            borderRadius: "4px 4px 0 0",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "relative", zIndex: 1, textAlign: "center",
            color: "#ffffff", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em",
          }}>
            {label}
          </div>
        </div>

        {/* Bottom section */}
        <div style={{ background: "#242325", padding: "10px 14px 14px" }}>
          <div style={{ color: "#ffffff", fontSize: 13, letterSpacing: "0.04em", marginBottom: 3, textAlign: "center" }}>
            Enhancement Level {qc.maxLevel}/{qc.maxLevel}
          </div>
          <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textAlign: "center" }}>
            Trait Level +{traitLvl}
          </div>

          <>
            {divider}
            <div style={{ textAlign: "center", color: baseText ? "#ffffff" : "#52525b", fontSize: 13 }}>
              {baseText ?? "empty"}
            </div>
          </>

          <>
            {divider}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {fixedAffixes.map((affix, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: affix ? "flex-start" : "center" }}>
                  {affix && <TierSquare tier={affix.tier} />}
                  <span style={{ color: affix ? "#ffffff" : "#52525b", fontSize: 13, lineHeight: 1.4 }}>
                    {affix ? affix.text : "empty"}
                  </span>
                </div>
              ))}
            </div>
          </>

          <>
            {divider}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {randomAffixes.map((affix, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, justifyContent: affix ? "flex-start" : "center" }}>
                  {affix && <TierSquare tier={affix.tier} />}
                  <span style={{ color: affix ? "#ffffff" : "#52525b", fontSize: 13, lineHeight: 1.4 }}>
                    {affix ? affix.text : "empty"}
                  </span>
                </div>
              ))}
            </div>
          </>
        </div>

      </div>
    </div>,
    document.body
  );
}

function parseEffect(html: string): string {
  return html
    .replace(/ data-title="[^"]*"/g, "")   // strip tooltip data before tag removal
    .replace(/<span[^>]*class="val"[^>]*>/g, "")
    .replace(/<\/span>/g, "")
    .replace(/<[^>]+>/g, " ")  // space preserves word boundaries between adjacent tags
    .replace(/\s+/g, " ")
    .trim();
}

type StatGroup = { key: string; displayName: string; tiers: MemoryAffix[] };

function normalizeStatKey(text: string): string {
  return text
    .replace(/\([+-]?\d+[–\-][+-]?\d+\)/g, "NUM")
    .replace(/[+-]?\d+(\.\d+)?/g, "NUM")
    .replace(/\s+/g, " ")
    .trim();
}

function statDisplayName(text: string): string {
  const stripped = text
    .replace(/^\+\([^)]+\)\s*%?\s*/, "")
    .replace(/^\+\d+(\.\d+)?\s*%?\s*/, "")
    .replace(/^\([^)]+\)\s*%?\s*/, "")
    .trim();
  return stripped || text;
}

function extractValuePart(text: string): string {
  const m = text.match(/^[+\-]?\(?\s*[+\-]?\d+(?:[–\-][+\-]?\d+)?\s*\)?\s*%?/);
  return m ? m[0].trim() : "";
}

function MemoryTierBadge({ tier }: { tier: string }) {
  const textColor = tier === "T0" ? "#fe3333" : tier === "T1" ? "#ff7c1c" : (tier === "T2" || tier === "T3") ? "#c192ff" : "";
  const fillColor = tier === "T0" ? "#603020" : tier === "T1" ? "#6f3f22" : (tier === "T2" || tier === "T3") ? "#5f2b90" : "";
  if (!textColor || !fillColor) {
    return <span className="font-bold text-zinc-400 shrink-0 text-[11px]">{tier}</span>;
  }
  return (
    <span className="font-bold shrink-0" style={{
      color: textColor, border: `1px solid ${textColor}`, borderRadius: "2px 0 2px 0",
      background: `linear-gradient(to bottom, #111111, ${fillColor})`,
      padding: "1px 11px", fontSize: "13px", lineHeight: "1.4", height: "20px",
      display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
    }}>
      {tier}
    </span>
  );
}

function MemoryTierPicker({
  tiers,
  selectedAffixId,
  onSelect,
  epicRestricted,
}: {
  tiers: MemoryAffix[];
  selectedAffixId: string;
  onSelect: (affix: MemoryAffix) => void;
  epicRestricted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selectedAffix = tiers.find((a) => a.id === selectedAffixId) ?? tiers[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const btn = btnRef.current;
      const drop = dropRef.current;
      if (btn && !btn.contains(e.target as Node) && (!drop || !drop.contains(e.target as Node))) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="shrink-0 self-stretch">
      <button
        ref={btnRef}
        onClick={tiers.length > 1 ? handleToggle : undefined}
        className={`h-full flex items-center gap-1.5 px-2 bg-[#2a2929] border border-[#535357] focus:outline-none ${tiers.length > 1 ? "hover:bg-[#343333] transition-colors" : ""}`}
        style={{ borderRadius: "0 8px 0 8px", cursor: tiers.length > 1 ? "pointer" : "default" }}
      >
        <MemoryTierBadge tier={selectedAffix.tier} />
        {tiers.length > 1 && (
          <svg className="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        )}
      </button>
      {open && pos && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: 140, background: "#1a1919", border: "1px solid #535357", borderRadius: "0 8px 0 8px" }}
          className="py-0.5 shadow-xl"
        >
          {tiers.map((affix) => {
            const valuePart = extractValuePart(parseEffect(affix.effect));
            const isSelected = affix.id === selectedAffixId;
            const isLocked = !!(epicRestricted && affix.tier === "T0");
            return (
              <div key={affix.id} className="relative group">
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isLocked) { onSelect(affix); setOpen(false); } }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    isLocked ? "opacity-50" : isSelected ? "bg-[#3a3838]" : "hover:bg-[#2e2d2d]"
                  }`}
                  style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
                >
                  <MemoryTierBadge tier={affix.tier} />
                  {valuePart && <span className="text-zinc-400 text-[11px]">{valuePart}</span>}
                </button>
                {isLocked && (
                  <div
                    className="absolute left-full top-0 ml-2 px-2.5 py-1.5 text-[11px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                    style={{ background: "#1a1919", border: "1px solid #535357", borderRadius: "0 6px 0 6px" }}
                  >
                    Only available on Ultimate memories
                  </div>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function MemoryAffixPanel({
  memoryItem,
  activeSlot,
  selectedIds,
  onSelect,
  quality,
}: {
  memoryItem: string;
  activeSlot: ActiveSlotId | null;
  selectedIds: MemorySlotSelections;
  onSelect: (slotKey: MemorySlotKey, affixId: string, affixText: string, tier: string) => void;
  quality: MemoryQuality;
}) {
  const [affixes, setAffixes] = useState<MemoryAffix[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedTipPos, setBlockedTipPos] = useState<{ x: number; y: number } | null>(null);

  // Downgrade T0 → T1 for Random Affix slots when switching from Ultimate to Epic
  const prevQualityRef = useRef<MemoryQuality>(quality);
  const affixesRef = useRef(affixes);
  affixesRef.current = affixes;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    if (prevQualityRef.current === quality) return;
    const prev = prevQualityRef.current;
    prevQualityRef.current = quality;
    if (prev !== "ultimate" || quality !== "epic") return;
    const cur = affixesRef.current;
    const sel = selectedIdsRef.current;
    for (const sk of ["suffix1", "suffix2"] as MemorySlotKey[]) {
      const slot = sel[sk];
      if (!slot || slot.tier !== "T0") continue;
      const af = cur.find((a) => a.id === slot.id);
      if (!af) continue;
      const key = normalizeStatKey(parseEffect(af.effect));
      const t1 = cur.find((a) => a.type === "Random Affix" && a.tier === "T1" && normalizeStatKey(parseEffect(a.effect)) === key);
      onSelectRef.current(sk, t1 ? t1.id : "", t1 ? parseEffect(t1.effect) : "", t1 ? t1.tier : "");
    }
  }, [quality]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hero-memory?item=${encodeURIComponent(memoryItem)}`)
      .then((r) => r.json())
      .then((data: MemoryAffix[]) => { setAffixes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [memoryItem]);

  useEffect(() => { setSearchQuery(""); }, [activeSlot]);

  const slotKey = activeSlot as MemorySlotKey | null;
  const slotType = slotKey ? SLOT_TYPE_MAP[slotKey] : null;
  const isEpicRandomAffix = quality === "epic" && slotType === "Random Affix";
  const filtered = useMemo(
    () => (slotType ? affixes.filter((a) => a.type === slotType) : []),
    [affixes, slotType],
  );
  const selectedId = slotKey ? selectedIds[slotKey]?.id ?? null : null;

  const siblingKey = slotKey ? SIBLING_SLOT[slotKey] : undefined;
  const siblingValue = siblingKey ? selectedIds[siblingKey] : null;
  const siblingStatKey = useMemo(() => {
    if (!siblingValue?.id) return null;
    const sibAf = affixes.find((a) => a.id === siblingValue.id);
    return sibAf ? normalizeStatKey(parseEffect(sibAf.effect)) : null;
  }, [siblingValue?.id, affixes]);

  const isOriginBaseStats = slotType === "Base Stats" && memoryItem === "Memory of Origin";
  const applyBaseTransform = (text: string) =>
    isOriginBaseStats && quality === "ultimate" ? text.replace(/\b90\b/g, "120") : text;

  const groups = useMemo<StatGroup[]>(() => {
    const map = new Map<string, StatGroup>();
    for (const affix of filtered) {
      const text = parseEffect(affix.effect);
      const key = normalizeStatKey(text);
      if (!map.has(key)) map.set(key, { key, displayName: statDisplayName(text), tiers: [] });
      map.get(key)!.tiers.push(affix);
    }
    const tierOrder = ["T0", "T1", "T2", "T3", ""];
    for (const g of map.values()) {
      g.tiers.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
    }
    return [...map.values()];
  }, [filtered]);

  const hasSelection = selectedId !== null;

  const visibleGroups = useMemo(() => {
    const needle = searchQuery.replace(/\s/g, "").toLowerCase();
    return needle
      ? groups.filter((g) => g.displayName.toLowerCase().replace(/\s/g, "").includes(needle))
      : groups;
  }, [groups, searchQuery]);

  function selectAffix(affix: MemoryAffix) {
    if (!slotKey) return;
    const text = parseEffect(affix.effect);
    if (selectedId === affix.id) {
      onSelect(slotKey, "", "", "");  // toggle off
    } else {
      onSelect(slotKey, affix.id, text, affix.tier);
    }
  }

  return (
    <div
      className="w-full flex flex-col"
      style={{ height: "100vh", background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)" }}
    >
      {!activeSlot ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-center text-[20px] font-semibold whitespace-nowrap" style={{ color: "#d92020" }}>
            Select the affix location for crafting
          </p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-[14px]">Loading…</p>
        </div>
      ) : (
        <>
          <div className="px-4 pt-5 pb-3 border-b border-[#3a3838]">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-0.5">{slotType}</p>
            <p className="text-[15px] font-semibold text-[#e0ddd8]">{memoryItem}</p>
          </div>
          {/* Search + clear row */}
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexShrink: 0 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
              placeholder="Search affixes…"
              style={{
                flex: 1,
                background: "#111111",
                border: "1px solid #2a2a2a",
                borderRadius: "0 8px 0 8px",
                color: "#e4e4e7",
                fontSize: 12,
                padding: "6px 10px",
                outline: "none",
              }}
            />
            <button
              onClick={hasSelection ? () => slotKey && onSelect(slotKey, "", "", "") : undefined}
              disabled={!hasSelection}
              style={{
                padding: "5px 12px",
                borderRadius: "0 8px 0 8px",
                background: hasSelection ? "#c0392b" : "#1e1e1e",
                border: "none",
                color: hasSelection ? "#ffffff" : "#555555",
                fontSize: 11,
                fontWeight: 600,
                cursor: hasSelection ? "pointer" : "not-allowed",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              ✕ Clear
            </button>
          </div>
          {blockedTipPos && createPortal(
            <div style={{
              position: "fixed",
              left: blockedTipPos.x,
              top: blockedTipPos.y - 42,
              transform: "translateX(-50%)",
              background: "#1a1919",
              border: "1px solid #c0392b",
              borderRadius: "0 6px 0 6px",
              padding: "6px 12px",
              color: "#f87171",
              fontSize: 11,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#c0392b" strokeWidth="1.5"/>
                <path d="M5 5l6 6M11 5l-6 6" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Already selected in another slot
            </div>,
            document.body
          )}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {visibleGroups.map((group) => {
              const selectedAffix = group.tiers.find((a) => a.id === selectedId) ?? null;
              const isSelected = !!selectedAffix;
              const defaultAffix = group.tiers.find((a) => a.tier === "T1") ??
                (isEpicRandomAffix ? group.tiers.find((a) => a.tier !== "T0") : null) ??
                group.tiers[0];
              // show badge inside button only when unselected
              const unselectedTier = !isSelected ? (defaultAffix?.tier ?? "") : "";
              // show tier picker to the left whenever selected and multiple tiers exist
              const showTierPicker = isSelected && group.tiers.length > 1;
              const isBlockedByDuplicate = siblingStatKey !== null && group.key === siblingStatKey;

              return (
                <div
                  key={group.key}
                  className="flex gap-0"
                  style={isBlockedByDuplicate ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
                  onMouseEnter={isBlockedByDuplicate ? (e) => setBlockedTipPos({ x: e.clientX, y: e.clientY }) : undefined}
                  onMouseMove={isBlockedByDuplicate ? (e) => setBlockedTipPos({ x: e.clientX, y: e.clientY }) : undefined}
                  onMouseLeave={isBlockedByDuplicate ? () => setBlockedTipPos(null) : undefined}
                >
                  {showTierPicker && (
                    <MemoryTierPicker
                      tiers={group.tiers}
                      selectedAffixId={selectedAffix.id}
                      onSelect={(affix) => slotKey && onSelect(slotKey, affix.id, parseEffect(affix.effect), affix.tier)}
                      epicRestricted={isEpicRandomAffix}
                    />
                  )}
                  {isSelected && group.tiers.length === 1 && selectedAffix && selectedAffix.tier !== "" && (
                    <div className="shrink-0 self-stretch flex items-center px-2 bg-[#2a2929] border border-[#535357]" style={{ borderRadius: "0 8px 0 8px" }}>
                      <MemoryTierBadge tier={selectedAffix.tier} />
                    </div>
                  )}
                  <button
                    onClick={!isBlockedByDuplicate ? () => selectAffix(isSelected ? selectedAffix : defaultAffix) : undefined}
                    className={`flex-1 min-w-0 text-left px-3 py-4 text-[14px] leading-snug transition-all ${!isSelected ? "hover:brightness-110" : ""}`}
                    style={{
                      border: "2px solid #535357",
                      backgroundColor: isSelected ? "#e0ddd8" : "#3d3c3c",
                      borderRadius: "0 10px 0 10px",
                      cursor: isBlockedByDuplicate ? "not-allowed" : "pointer",
                      color: isSelected ? "#1a2028" : "#ffffff",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                      pointerEvents: isBlockedByDuplicate ? "none" : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {unselectedTier && <MemoryTierBadge tier={unselectedTier} />}
                      <span>{applyBaseTransform(parseEffect((isSelected && selectedAffix ? selectedAffix : defaultAffix).effect))}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Memory craft panel ──────────────────────────────────────────────────────

const ITEM_CARD_METALLIC_ZINC =
  "linear-gradient(145deg, #b8b8bc 0%, #4a4a4e 15%, #d8d8dc 35%, #6a6a70 55%, #2c2c30 75%, #9a9a9e 100%)";

function MemorySlotRow({ slotKey, active, value, onClick }: {
  slotKey: ActiveSlotId;
  active: boolean;
  value: MemorySlotValue;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 relative flex items-center pl-3 pr-[48px] py-3 rounded-sm border-0 overflow-hidden focus:outline-none text-sm cursor-pointer transition-colors"
        style={{
          backgroundColor: active ? "#c5cfe8" : "#dedfdf",
          outline: active ? "2px solid #3b82f6" : "none",
          outlineOffset: "-2px",
        }}
      >
        {value ? (
          <span className="flex items-center gap-2 min-w-0">
            {value.tier && <MemoryTierBadge tier={value.tier} />}
            <span className="truncate" style={{ color: "#1a1a1a" }}>{value.text}</span>
          </span>
        ) : (
          <span className="w-full text-center truncate" style={{ color: active ? "#1e3a6e" : "#939393" }}>Empty affix</span>
        )}
        <span
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center"
          style={{ backgroundColor: active ? "#4a70b8" : "#979798" }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: active ? "#2a509a" : "#6c6b6c" }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}

function MemorySectionBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3"
      style={{ borderRadius: "0 12px 0 12px" }}
    >
      <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
        <div
          className="flex items-center px-3 py-0.5"
          style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}
        >
          <span className="font-semibold uppercase tracking-wider text-[16px] text-[#555]">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function MemoryCraftPanel({
  memoryLabel,
  filled,
  quality,
  onQualityChange,
  activeSlot,
  onActiveSlotChange,
  selectedIds,
  onInsert,
  onRemove,
}: {
  memoryLabel: string;
  filled: boolean;
  quality: MemoryQuality;
  onQualityChange: (q: MemoryQuality) => void;
  activeSlot: ActiveSlotId | null;
  onActiveSlotChange: (id: ActiveSlotId | null) => void;
  selectedIds: MemorySlotSelections;
  onInsert: (quality: MemoryQuality) => void;
  onRemove: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const iconPath = `/icons/equipment/${memoryLabel}.webp`;
  const qc = MEMORY_QUALITY_CONFIG[quality];

  return (
    <div
      className="absolute flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
      style={{
        right: `calc(50% + ${CIRCLE_D / 2}px + ${PANEL_GAP}px)`,
        top: 0, width: PANEL_W, height: "100vh",
        zIndex: 10,
      }}
    >
      <div style={{ width: "100%", padding: "70px 20px 0", filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.85))" }}>
        <div className="relative">

          {/* Accent back panel */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              top: "-70px",
              background: qc.accentBg,
              borderRadius: "0 36px 0 36px",
              zIndex: 0,
              boxShadow: "0 0 40px 8px rgba(0,0,0,0.45)",
            }}
          />

          {/* Memory name */}
          <h2
            className="absolute z-10 text-[20px] font-semibold text-white leading-tight"
            style={{ top: "-58px", left: "150px", right: "44px" }}
          >
            {memoryLabel}
          </h2>

          {/* Trash button (only when editing a filled slot) */}
          {filled && (
            <button
              onClick={onRemove}
              title="Remove memory"
              className="absolute z-10 rounded p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
              style={{ top: "-63px", right: "8px" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          )}


          {/* Quality underline plate */}
          <div
            className="absolute z-[19]"
            style={{
              top: "-55px",
              left: "20px",
              width: "110px",
              height: "110px",
              background: qc.border,
              borderRadius: "0 28px 0 28px",
            }}
          />

          {/* Memory icon */}
          <div
            className="absolute z-20 flex items-center justify-center overflow-hidden"
            style={{
              top: "-61px",
              left: "20px",
              width: "110px",
              height: "110px",
              background: qc.bg,
              borderRadius: "0 28px 0 28px",
            }}
          >
            {!imgErr ? (
              <img
                src={iconPath}
                alt={memoryLabel}
                onError={() => setImgErr(true)}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <span style={{ color: "#666", fontSize: 28, fontWeight: 700 }}>M</span>
            )}
          </div>

          {/* Main card */}
          <div
            className="relative z-10 border border-[#bec4c9] bg-[#eaeaea] text-[#1a1a1a] px-5 pb-5 pt-1"
            style={{ borderRadius: "0 36px 0 36px" }}
          >
            {/* Header spacer for icon */}
            <div className="flex items-start gap-2 mb-1 min-h-[52px]">
              <div className="w-[110px] shrink-0" />
              <div className="flex-1 min-w-0 pt-0">
                {(() => {
                  const hasBonus =
                    selectedIds.prefix1?.text === TRAIT_LEVEL_AFFIX ||
                    selectedIds.prefix2?.text === TRAIT_LEVEL_AFFIX;
                  const level = qc.traitLevel + (hasBonus ? 2 : 0);
                  return (
                    <p className="text-sm text-[#1a1a1a]">
                      Trait Level: <span style={hasBonus ? { fontWeight: 700, color: "#1d4ed8" } : undefined}>{level}</span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Quality selector */}
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              {(["epic", "ultimate"] as MemoryQuality[]).map((q) => {
                const qc = MEMORY_QUALITY_CONFIG[q];
                const active = quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => onQualityChange(q)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      border: `2px solid ${active ? qc.border : "#bec4c9"}`,
                      borderRadius: "0 10px 0 10px",
                      background: active ? qc.bg : "#e0e0e0",
                      color: active ? qc.border : "#888888",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      boxShadow: active ? qc.glow : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {qc.label}
                    <span style={{ display: "block", fontWeight: 400, fontSize: 10, opacity: 0.75, marginTop: 2 }}>
                      Max Lv {qc.maxLevel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Base Stats — 1 slot */}
            <MemorySectionBox label="Base Stats">
              <MemorySlotRow
                slotKey="base"
                active={activeSlot === "base"}
                value={
                  memoryLabel === "Memory of Origin" && quality === "ultimate" && selectedIds.base
                    ? { ...selectedIds.base, text: selectedIds.base.text.replace(/\b90\b/g, "120") }
                    : selectedIds.base
                }
                onClick={() => onActiveSlotChange(activeSlot === "base" ? null : "base")}
              />
            </MemorySectionBox>

            {/* Fixed Affix — 2 slots */}
            <MemorySectionBox label="Fixed Affix">
              <MemorySlotRow slotKey="prefix1" active={activeSlot === "prefix1"} value={selectedIds.prefix1} onClick={() => onActiveSlotChange(activeSlot === "prefix1" ? null : "prefix1")} />
              <MemorySlotRow slotKey="prefix2" active={activeSlot === "prefix2"} value={selectedIds.prefix2} onClick={() => onActiveSlotChange(activeSlot === "prefix2" ? null : "prefix2")} />
            </MemorySectionBox>

            {/* Random Affix — 2 slots */}
            <MemorySectionBox label="Random Affix">
              <MemorySlotRow slotKey="suffix1" active={activeSlot === "suffix1"} value={selectedIds.suffix1} onClick={() => onActiveSlotChange(activeSlot === "suffix1" ? null : "suffix1")} />
              <MemorySlotRow slotKey="suffix2" active={activeSlot === "suffix2"} value={selectedIds.suffix2} onClick={() => onActiveSlotChange(activeSlot === "suffix2" ? null : "suffix2")} />
            </MemorySectionBox>

            {/* Insert button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => onInsert(quality)}
                className="px-6 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{
                  background: "linear-gradient(to right, #1d4ed8, #1e40af)",
                  borderRadius: "0 10px 0 10px",
                  border: "none",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                }}
              >
                {filled ? "Save Changes" : "Insert Memory"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({
  heroGroup, hero, selected, onClick,
}: {
  heroGroup: string; hero: string; selected: boolean; onClick: () => void;
}) {
  const [hovered,  setHovered]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const iconPath = `/heroes/${heroGroup}/portraits/${getVariantName(hero)}.webp`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    hovered ? "#1c1c1c" : "#161616",
        border:        "3px solid #686867",
        borderRadius:  "0 20px 0 20px",
        outline:       selected ? "3px solid #fbdb58" : "none",
        outlineOffset: "3px",
        cursor:        "pointer",
        transition:    "background 0.1s",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        overflow:      "hidden",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#0a0a0a", flexShrink: 0 }}>
        {!imgError ? (
          <img
            src={iconPath} alt={hero} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#444", fontSize: 22 }}>?</span>
          </div>
        )}
      </div>
      <div style={{ padding: "6px 8px 9px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ color: "#52525b", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>
          {heroGroup}
        </div>
        <div style={{
          color: "#e4e4e7", fontSize: 11, fontWeight: 600, lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>
          {getVariantName(hero)}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SLOTS = Array.from({ length: 9 }, (_, i) => ({
  id:      i,
  row:     Math.floor(i / 3),
  col:     i % 3,
  withHex: Math.floor(i / 3) !== 1,
}));

export default function HeroTraitPage() {
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [selectedHero,   setSelectedHero]   = useState<HeroEntry | null>(null);
  const [heroes,         setHeroes]         = useState<HeroEntry[]>([]);
  const [heroTraits,     setHeroTraits]     = useState<HeroTrait[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [circleHovered,    setCircleHovered]    = useState(false);
  const [circleImgError,   setCircleImgError]   = useState(false);
  const [artworkExt,       setArtworkExt]       = useState<"webp" | "png">("webp");
  const [artworkFailed,    setArtworkFailed]    = useState(false);
  const [centerTooltipPos, setCenterTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [memoryFilled,     setMemoryFilled]     = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [memoryQuality,    setMemoryQuality]    = useState<[MemoryQuality | null, MemoryQuality | null, MemoryQuality | null]>([null, null, null]);
  const [memorySelections, setMemorySelections] = useState<[MemorySlotSelections, MemorySlotSelections, MemorySlotSelections]>([{ ...EMPTY_MEMORY_SELECTIONS }, { ...EMPTY_MEMORY_SELECTIONS }, { ...EMPTY_MEMORY_SELECTIONS }]);
  const [traitSelections,  setTraitSelections]  = useState<[string | null, string | null, string | null]>([null, null, null]);
  const [craftPanelCol,    setCraftPanelCol]    = useState<number | null>(null);
  const [activeMemorySlot, setActiveMemorySlot] = useState<ActiveSlotId | null>(null);
  const [craftQuality,     setCraftQuality]     = useState<MemoryQuality>("epic");

  useEffect(() => {
    if (craftPanelCol === null) return;
    setCraftQuality(memoryQuality[craftPanelCol] ?? "epic");
  }, [craftPanelCol]);

  useEffect(() => {
    fetch("/api/hero-traits")
      .then((r) => r.json())
      .then(setHeroes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setHeroTraits([]);
    setCircleImgError(false);
    setArtworkExt("webp");
    setArtworkFailed(false);
    setMemoryFilled([false, false, false]);
    setMemoryQuality([null, null, null]);
    setTraitSelections([null, null, null]);
    if (!selectedHero) return;
    fetch(`/api/hero-traits?hero=${encodeURIComponent(selectedHero.hero)}`)
      .then((r) => r.json())
      .then(setHeroTraits)
      .catch(console.error);
  }, [selectedHero?.hero]);

  const level1Trait = heroTraits.find((t) => t.level === 1) ?? null;
  const variantName = selectedHero ? getVariantName(selectedHero.hero) : "";

  function getSlotTrait(row: number, col: number): HeroTrait | null {
    if (row === 1 || !selectedHero) return null;
    const slotIdx = row === 0 ? 0 : 1;
    const level   = [45, 60, 75][col];
    const names   = HERO_TRAIT_ORDER[selectedHero.heroGroup]?.[variantName]?.[level] ?? [];
    const name    = names[slotIdx];
    if (!name) return null;
    return heroTraits.find((t) => t.name === name) ?? null;
  }

  function toggleMemory(col: number) {
    setMemoryFilled((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[col] = !next[col];
      return next;
    });
    // Clear trait selection for this column when memory is removed
    if (memoryFilled[col]) {
      setTraitSelections((prev) => {
        const next = [...prev] as [string | null, string | null, string | null];
        next[col] = null;
        return next;
      });
    }
  }

  function insertMemory(col: number, quality: MemoryQuality) {
    setMemoryFilled((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[col] = true;
      return next;
    });
    setMemoryQuality((prev) => {
      const next = [...prev] as [MemoryQuality | null, MemoryQuality | null, MemoryQuality | null];
      next[col] = quality;
      return next;
    });
    setCraftPanelCol(null);
    setActiveMemorySlot(null);
  }

  function selectMemoryAffix(col: number, slotKey: MemorySlotKey, affixId: string, affixText: string, tier: string) {
    setMemorySelections((prev) => {
      const next = [...prev] as [MemorySlotSelections, MemorySlotSelections, MemorySlotSelections];
      next[col] = { ...next[col], [slotKey]: affixId ? { id: affixId, text: affixText, tier } : null };
      return next;
    });
  }

  function selectTrait(col: number, traitName: string) {
    setTraitSelections((prev) => {
      const next = [...prev] as [string | null, string | null, string | null];
      next[col] = prev[col] === traitName ? null : traitName;
      return next;
    });
  }

  const needle   = searchQuery.replace(/\s/g, "").toLowerCase();
  const filtered = needle
    ? heroes.filter((h) => h.hero.toLowerCase().includes(needle) || h.heroGroup.toLowerCase().includes(needle))
    : heroes;

  function handleCircleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setPanelOpen((prev) => !prev);
    setCraftPanelCol(null);
    setSearchQuery("");
  }

  function handleCardClick(entry: HeroEntry) {
    setSelectedHero((prev) => (prev?.hero === entry.hero ? null : entry));
    setPanelOpen(false);
  }

  function clearSelection() {
    setSelectedHero(null);
    setHeroTraits([]);
  }

  const centerIconPath = selectedHero && level1Trait
    ? getTraitIconPath(selectedHero.heroGroup, variantName, 1, 1, level1Trait.name)
    : null;

  const isActive = circleHovered || panelOpen;

  return (
    <div
      className="min-h-screen relative"
      style={BG_STYLE}
      onClick={() => { setPanelOpen(false); setCraftPanelCol(null); setActiveMemorySlot(null); }}
    >

      {/* Memory craft panel */}
      {craftPanelCol !== null && (
        <MemoryCraftPanel
          memoryLabel={MEMORY_LABELS[craftPanelCol]}
          filled={memoryFilled[craftPanelCol]}
          quality={craftQuality}
          onQualityChange={setCraftQuality}
          activeSlot={activeMemorySlot}
          onActiveSlotChange={setActiveMemorySlot}
          selectedIds={memorySelections[craftPanelCol]}
          onInsert={(quality) => insertMemory(craftPanelCol, quality)}
          onRemove={() => {
            toggleMemory(craftPanelCol);
            setMemoryQuality((prev) => {
              const next = [...prev] as [MemoryQuality | null, MemoryQuality | null, MemoryQuality | null];
              next[craftPanelCol] = null;
              return next;
            });
            setCraftPanelCol(null);
            setActiveMemorySlot(null);
          }}
        />
      )}

      {/* Memory affix panel (right of center, when memory craft panel is open) */}
      {craftPanelCol !== null && (
        <div
          className="absolute"
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `calc(50% + ${CIRCLE_D / 2}px + ${PANEL_GAP}px)`,
            top: 0, width: PANEL_W, height: "100vh",
            zIndex: 10,
          }}
        >
          <MemoryAffixPanel
            memoryItem={MEMORY_LABELS[craftPanelCol]}
            activeSlot={activeMemorySlot}
            selectedIds={memorySelections[craftPanelCol]}
            onSelect={(slotKey, affixId, affixText, tier) => selectMemoryAffix(craftPanelCol, slotKey, affixId, affixText, tier)}
            quality={craftQuality}
          />
        </div>
      )}

      {/* Left selection panel */}
      {panelOpen && (
        <div
          className="absolute flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            right: `calc(50% + ${CIRCLE_D / 2}px + ${PANEL_GAP}px)`,
            top: 0, width: PANEL_W, height: "100vh",
            background: PANEL_BG, zIndex: 10,
          }}
        >
          <div className="px-4 pt-5 pb-3" style={{ borderBottom: "2px solid #333333", flexShrink: 0 }}>
            <p style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Selecting</p>
            <p style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 600 }}>Hero</p>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexShrink: 0 }}>
            <input
              type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
              placeholder="Search heroes…"
              style={{
                flex: 1, background: "#111111", border: "1px solid #2a2a2a",
                borderRadius: "0 8px 0 8px", color: "#e4e4e7", fontSize: 12,
                padding: "6px 10px", outline: "none",
              }}
            />
            <button
              onClick={selectedHero ? clearSelection : undefined}
              disabled={!selectedHero}
              style={{
                padding: "5px 12px", borderRadius: "0 8px 0 8px",
                background: selectedHero ? "#c0392b" : "#1e1e1e",
                border: "none", color: selectedHero ? "#ffffff" : "#555555",
                fontSize: 11, fontWeight: 600,
                cursor: selectedHero ? "pointer" : "not-allowed",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >
              ✕ Clear Selection
            </button>
          </div>
          <div className="overflow-y-auto" style={{ flex: 1, padding: "0 16px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {filtered.map((h) => (
                <HeroCard
                  key={h.hero} heroGroup={h.heroGroup} hero={h.hero}
                  selected={selectedHero?.hero === h.hero}
                  onClick={() => handleCardClick(h)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero artwork — left side background */}
      {selectedHero && !artworkFailed && (
        <div style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: `calc(50% - ${CIRCLE_D / 2}px)`,
          zIndex: 0,
          pointerEvents: "none",
        }}>
          {(() => {
            const ov = getArtworkOverride(selectedHero.heroGroup, variantName);
            return (
              <img
                key={`${selectedHero.hero}-${artworkExt}`}
                src={`/heroes/${selectedHero.heroGroup}/artwork/${ov.file ?? variantName}.${artworkExt}`}
                alt={variantName}
                onError={() => {
                  if (artworkExt === "webp") setArtworkExt("png");
                  else setArtworkFailed(true);
                }}
                style={{
                  position: "absolute",
                  top: ov.top ?? "50%",
                  left: ov.left ?? 0,
                  transform: "translateY(-50%)",
                  height: ov.height ?? (ov.width ? "auto" : "100vh"),
                  width: ov.width ?? "auto",
                  maxWidth: "none",
                  maxHeight: "none",
                }}
              />
            );
          })()}
        </div>
      )}

      {/* Hero name — bottom left */}
      {selectedHero && (
        <div style={{
          position: "fixed",
          left: 280,
          bottom: 40,
          zIndex: 1,
          pointerEvents: "none",
          lineHeight: 1.1,
        }}>
          <div style={{ color: "#ffffff", fontSize: 58, fontWeight: 700, letterSpacing: "0.01em", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            {selectedHero.heroGroup}
          </div>
          {variantName !== selectedHero.heroGroup && (
            <div style={{ color: "#c8c6c0", fontSize: 38, fontWeight: 400, letterSpacing: "0.02em", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
              {variantName}
            </div>
          )}
        </div>
      )}

      {/* Center circle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <div
          onClick={handleCircleClick}
          onMouseEnter={(e) => { setCircleHovered(true); if (level1Trait) setCenterTooltipPos({ x: e.clientX, y: e.clientY }); }}
          onMouseMove={(e) => { if (level1Trait) setCenterTooltipPos({ x: e.clientX, y: e.clientY }); }}
          onMouseLeave={() => { setCircleHovered(false); setCenterTooltipPos(null); }}
          style={{
            width: CIRCLE_D, height: CIRCLE_D,
            borderRadius: "50%",
            background: "#000000",
            border: `2px solid ${isActive ? "#3b82f6" : "#555555"}`,
            boxShadow: isActive ? "0 0 18px rgba(59,130,246,0.35)" : "none",
            cursor: "pointer", pointerEvents: "auto",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        >
          {centerIconPath && !circleImgError ? (
            <img
              src={centerIconPath}
              alt={level1Trait?.name}
              onError={() => setCircleImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : selectedHero && level1Trait ? (
            <div style={{ color: "#e4e4e7", fontSize: 10, fontWeight: 600, textAlign: "center", padding: "0 8px", lineHeight: 1.3 }}>
              {level1Trait.name}
            </div>
          ) : (
            <div style={{ color: isActive ? "#60a5fa" : "#3b82f6", fontSize: 36, fontWeight: 300, lineHeight: 1, userSelect: "none", transition: "color 0.2s" }}>
              +
            </div>
          )}
        </div>
      </div>
      {level1Trait && centerTooltipPos && createPortal(
        <TraitTooltipCard trait={level1Trait} iconPath={centerIconPath} selected={true} cx={centerTooltipPos.x} cy={centerTooltipPos.y} />,
        document.body
      )}

      {/* Right trait grid — 3 cols × 3 rows */}
      <div
        className="absolute"
        onClick={(e) => e.stopPropagation()}
        style={{
          left:      `calc(50% + ${CIRCLE_D / 2}px + ${GRID_GAP}px)`,
          top:       "50%",
          transform: "translateY(-50%)",
          width:     GRID_W,
          height:    GRID_H,
          position:  "absolute",
          zIndex:    1,
        }}
      >
        {SLOTS.map(({ id, row, col, withHex }) => {
          const { x, y } = slotPos(row, col);

          // ── Row 1: memory slots ──────────────────────────────────────────
          if (row === 1) {
            const memLocked = !selectedHero;
            return (
              <div key={id} style={{ position: "absolute", left: x, top: y }}>
                <MemorySlot
                  label={MEMORY_LABELS[col]}
                  filled={memoryFilled[col]}
                  quality={memoryQuality[col]}
                  locked={memLocked}
                  lockReason={memLocked ? "Select a hero first" : undefined}
                  selectedIds={memorySelections[col]}
                  onClick={() => {
                    setPanelOpen(false);
                    setCraftPanelCol((prev) => prev === col ? null : col);
                  }}
                />
              </div>
            );
          }

          // ── Rows 0 & 2: trait slots ──────────────────────────────────────
          const colUnlocked  = !!selectedHero && memoryFilled[col];
          const trait        = getSlotTrait(row, col);
          const level        = [45, 60, 75][col];
          const slot         = row === 0 ? 1 : 2;
          // Hero selected but no trait for this slot: always blank grey, never locked
          const hasNoTrait   = !!selectedHero && trait === null;
          const inactive     = hasNoTrait;
          const locked       = !colUnlocked && !hasNoTrait;
          const lockReason   = !selectedHero
            ? "Select a hero first"
            : `Place a ${MEMORY_LABELS[col]} to unlock`;
          const iconPath     = trait && selectedHero
            ? getTraitIconPath(selectedHero.heroGroup, variantName, level, slot, trait.name)
            : null;
          const selected     = !!trait && traitSelections[col] === trait.name;
          const dimmed       = !!trait && !!traitSelections[col] && traitSelections[col] !== trait.name;
          const colTraitLevel = memoryFilled[col] && memoryQuality[col]
            ? effectiveTraitLevel(memoryQuality[col]!, memorySelections[col])
            : undefined;

          return (
            <div key={id} style={{ position: "absolute", left: x, top: y }}>
              <TraitSlot
                withHex={withHex}
                iconPath={iconPath}
                traitName={trait?.name}
                inactive={inactive}
                locked={locked}
                lockReason={locked ? lockReason : undefined}
                trait={trait}
                selected={selected}
                dimmed={dimmed}
                traitLevel={colTraitLevel}
                onClick={trait ? () => selectTrait(col, trait.name) : undefined}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
