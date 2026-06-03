"use client";

import { useState, useEffect } from "react";
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

// ─── Trait slot ───────────────────────────────────────────────────────────────

function TraitSlot({
  withHex,
  iconPath,
  traitName,
  inactive,
}: {
  withHex: boolean;
  iconPath?: string | null;
  traitName?: string;
  inactive?: boolean;
}) {
  const [hovered,  setHovered]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const cx = SLOT_SIZE / 2;
  const cy = SLOT_SIZE / 2;

  useEffect(() => { setImgError(false); }, [iconPath]);

  const hasIcon = !!iconPath && !inactive;

  return (
    <div
      onMouseEnter={() => !inactive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: SLOT_SIZE, height: SLOT_SIZE,
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: inactive ? "default" : "pointer",
        opacity: inactive ? 0.2 : 1,
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
            stroke="#555555"
            strokeWidth="2"
          />
        </svg>
      )}
      <div style={{
        width: CIRCLE2_D, height: CIRCLE2_D,
        borderRadius: "50%",
        background: "#000000",
        border: `2px solid ${!inactive && hovered ? "#3b82f6" : "#555555"}`,
        boxShadow: !inactive && hovered ? "0 0 14px rgba(59,130,246,0.3)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        position: "relative", zIndex: 1,
      }}>
        {hasIcon && !imgError ? (
          <img
            src={iconPath!}
            alt={traitName}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : !inactive ? (
          <div style={{
            color: hovered ? "#60a5fa" : "#3b82f6",
            fontSize: 24, fontWeight: 300, lineHeight: 1,
            userSelect: "none", transition: "color 0.2s",
          }}>
            +
          </div>
        ) : null}
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

// Level-to-column mapping for the 3×3 grid
const LEVEL_COLS: Record<number, number> = { 45: 0, 60: 1, 75: 2 };

export default function HeroTraitPage() {
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [selectedHero,   setSelectedHero]   = useState<HeroEntry | null>(null);
  const [heroes,         setHeroes]         = useState<HeroEntry[]>([]);
  const [heroTraits,     setHeroTraits]     = useState<HeroTrait[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [circleHovered,  setCircleHovered]  = useState(false);
  const [circleImgError, setCircleImgError] = useState(false);

  useEffect(() => {
    fetch("/api/hero-traits")
      .then((r) => r.json())
      .then(setHeroes)
      .catch(console.error);
  }, []);

  // Fetch traits whenever the selected hero changes
  useEffect(() => {
    setHeroTraits([]);
    setCircleImgError(false);
    if (!selectedHero) return;
    fetch(`/api/hero-traits?hero=${encodeURIComponent(selectedHero.hero)}`)
      .then((r) => r.json())
      .then(setHeroTraits)
      .catch(console.error);
  }, [selectedHero?.hero]);

  const level1Trait = heroTraits.find((t) => t.level === 1) ?? null;
  const variantName = selectedHero ? getVariantName(selectedHero.hero) : "";

  // Returns the trait for a given grid slot using the canonical ordering config.
  // Row 1 (middle, no-hex) slots are unused. Col 0=L45, Col 1=L60, Col 2=L75.
  function getSlotTrait(row: number, col: number): HeroTrait | null {
    if (row === 1 || !selectedHero) return null;
    const slotIdx = row === 0 ? 0 : 1;
    const level   = [45, 60, 75][col];
    const names   = HERO_TRAIT_ORDER[selectedHero.heroGroup]?.[variantName]?.[level] ?? [];
    const name    = names[slotIdx];
    if (!name) return null;
    return heroTraits.find((t) => t.name === name) ?? null;
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

      {/* Center circle — shows level 1 trait icon when hero is selected */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <div
          onClick={handleCircleClick}
          onMouseEnter={() => setCircleHovered(true)}
          onMouseLeave={() => setCircleHovered(false)}
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
          const { x, y }   = slotPos(row, col);
          const trait       = getSlotTrait(row, col);
          const level       = [45, 60, 75][col];
          const slot        = row === 0 ? 1 : 2;
          const couldHaveTrait = row !== 1 && !!selectedHero;
          const inactive    = couldHaveTrait && trait === null;
          const iconPath    = trait && selectedHero
            ? getTraitIconPath(selectedHero.heroGroup, variantName, level, slot, trait.name)
            : null;

          return (
            <div key={id} style={{ position: "absolute", left: x, top: y }}>
              <TraitSlot
                withHex={withHex}
                iconPath={iconPath}
                traitName={trait?.name}
                inactive={inactive}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
