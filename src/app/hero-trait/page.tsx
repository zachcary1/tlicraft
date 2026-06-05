"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HERO_TRAIT_ORDER } from "./heroTraitOrder";

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
const CIRCLE_D  = 128;
const PANEL_GAP = 50;

// ─── Right grid layout ────────────────────────────────────────────────────────

const SLOT_SIZE  = 112;
const COL_GAP    = 32;
const ROW_GAP    = 24;
const CIRCLE2_D  = 80;
const HEX_R      = 52;
const GRID_GAP   = 90;
const ARC_OFFSET = 28;

const GRID_W = 3 * SLOT_SIZE + 2 * COL_GAP + ARC_OFFSET;
const GRID_H = 3 * SLOT_SIZE + 2 * ROW_GAP;

const MEMORY_LABELS = ["Memory of Origin", "Memory of Discipline", "Memory of Progress"] as const;

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

// e.g. ("Rehan", "Anger", 45, 1, "Righteous Fury") → "/heroes/Rehan/traits/Anger/45-1 Righteous Fury.webp"
function getTraitIconPath(heroGroup: string, variantName: string, level: number, slot: number, traitName: string): string {
  return `/heroes/${heroGroup}/traits/${variantName}/${level}-${slot} ${traitName}.webp`;
}

// ─── Trait tooltip card ───────────────────────────────────────────────────────

const TT_ICON_R  = 40;
const TT_CARD_W  = 276;

function TraitTooltipCard({ trait, iconPath, selected, cx: cursorX, cy: cursorY }: {
  trait: HeroTrait;
  iconPath: string | null;
  selected: boolean;
  cx: number;
  cy: number;
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

      {/* Name */}
      <div style={{ paddingTop: TT_ICON_R + 14, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: "center" }}>
        <div style={{ color: "#ffffff", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          {trait.name}
        </div>
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

  const hexStroke   = selected ? "#ffffff" : locked ? "#333333" : "#555555";
  const circleBorder = selected
    ? "2px solid #ffffff"
    : !locked && isInteractive && hovered
    ? "2px solid #3b82f6"
    : locked ? "2px solid #2a2a2a" : "2px solid #555555";
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
        opacity: inactive ? 0.25 : 1,
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
      {locked && lockReason && tipPos && createPortal(
        <LockedTooltip reason={lockReason} x={tipPos.x} y={tipPos.y} />,
        document.body
      )}
      {showTooltip && trait && tooltipPos && createPortal(
        <TraitTooltipCard trait={trait} iconPath={iconPath ?? null} selected={!!selected} cx={tooltipPos.x} cy={tooltipPos.y} />,
        document.body
      )}
    </div>
  );
}

// ─── Memory slot (row 1) ──────────────────────────────────────────────────────

function MemorySlot({
  label,
  filled,
  locked,
  lockReason,
  onClick,
}: {
  label: string;
  filled: boolean;
  locked: boolean;
  lockReason?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [tipPos,  setTipPos]  = useState<{ x: number; y: number } | null>(null);

  const borderColor = !locked && hovered
    ? "#3b82f6"
    : filled
    ? "#2a4a7a"
    : "#555555";
  const glow = !locked && hovered ? "0 0 14px rgba(59,130,246,0.3)" : "none";

  return (
    <div
      onMouseEnter={(e) => {
        if (!locked) setHovered(true);
        if (locked) setTipPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => { if (locked) setTipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => { setHovered(false); setTipPos(null); }}
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
        background: filled ? "#091829" : "#000000",
        border: `2px solid ${borderColor}`,
        boxShadow: glow,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        flexShrink: 0,
      }}>
        {filled ? (
          <div style={{ color: "#4a7ab5", fontSize: 22, lineHeight: 1, userSelect: "none" }}>M</div>
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
        color: filled ? "#7a9ab5" : "#52525b",
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
  const [centerTooltipPos, setCenterTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [memoryFilled,     setMemoryFilled]     = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [traitSelections,  setTraitSelections]  = useState<[string | null, string | null, string | null]>([null, null, null]);

  useEffect(() => {
    fetch("/api/hero-traits")
      .then((r) => r.json())
      .then(setHeroes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setHeroTraits([]);
    setCircleImgError(false);
    setMemoryFilled([false, false, false]);
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
      onClick={() => setPanelOpen(false)}
    >

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
                  locked={memLocked}
                  lockReason={memLocked ? "Select a hero first" : undefined}
                  onClick={() => toggleMemory(col)}
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
                onClick={trait ? () => selectTrait(col, trait.name) : undefined}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
