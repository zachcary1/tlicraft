"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Layout constants ─────────────────────────────────────────────────────────

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const PANEL_BG  = "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)";
const PANEL_W   = 560;
const PANEL_GAP = 50;

const svgW = 664;
const svgH = 664;

// ─── Tag filters ──────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  Attack:     "#ff6467",
  Spell:      "#50a2ff",
  Persistent: "#fdc700",
  Summon:     "#f97316",
  Survival:   "#00bc7d",
  Lightning:  "#e8c75a",
  Cold:       "#7ec8ee",
  Fire:       "#e24c4b",
  Erosion:    "#54c981",
  Elixir:     "#dab2ff",
};

const TAG_ORDER = ["Attack", "Spell", "Persistent", "Summon", "Survival", "Lightning", "Cold", "Fire", "Erosion", "Elixir"];

const DROP_TAG_COLORS: Record<string, string> = {
  Lunaria:          "#b8a0e8",
  Vorax:            "#dc5050",
  Overrealm:        "#4870e0",
  Outlaw:           "#c87c2a",
  Sandlord:         "#d4aa40",
  Arcana:           "#9040c8",
  Compass:          "#18b0a8",
  "Dark Surge":     "#5448a0",
  Blacksail:        "#1e8080",
  Cube:             "#3ea858",
  Aeterna:          "#c8a040",
  Nightmare:        "#7a3f78",
  Mistville:        "#7898b0",
  Doll:             "#e06898",
  "Frozen Canvas":  "#58b8d8",
  Fuel:             "#e07028",
  Fluorescent:      "#18c898",
  Ember:            "#d84818",
  Others:           "#787878",
};

const DROP_TAG_ORDER = ["Lunaria", "Vorax", "Overrealm", "Outlaw", "Sandlord", "Arcana", "Compass", "Dark Surge", "Blacksail", "Cube", "Aeterna", "Nightmare", "Mistville", "Doll", "Frozen Canvas", "Fuel", "Fluorescent", "Ember", "Others"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "battle" | "drop";

interface PactSpirit {
  id:     string;
  type:   string;
  rarity: string;
  name:   string;
  tags:   string[];
  effect: string;
}

interface SelectedSlot { category: Category; index: number }

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  Legendary: "#fdc84d",
  Rare:      "#ff68ff",
  Magic:     "#59c7ff",
};

const RARITY_BG: Record<string, string> = {
  Legendary: "#4d2e1a",
  Rare:      "#431a4d",
  Magic:     "#19344b",
};

const RARITY_BAR_EDGE: Record<string, string> = {
  Legendary: "#f78a35",
  Rare:      "#bf28d0",
  Magic:     "#4294ef",
};

function getIconPath(spirit: PactSpirit): string {
  return `/icons/pactspirits/${spirit.type === "Drop" ? "drop" : "battle"}/${spirit.name}.webp`;
}

// ─── Pactspirit tooltip card ──────────────────────────────────────────────────

const PS_TT_CARD_W  = 296;
const PS_TT_ICON_W  = 88;
const PS_TT_ICON_H  = 112;

function PactSpiritTooltipCard({ spirit, cx: cursorX, cy: cursorY }: { spirit: PactSpirit; cx: number; cy: number }) {
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(640);
  useEffect(() => { setImgError(false); }, [spirit.name]);
  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const rarityColor   = RARITY_COLOR[spirit.rarity]    ?? "#686867";
  const rarityBg      = RARITY_BG[spirit.rarity]       ?? "#161616";
  const rarityBarEdge = RARITY_BAR_EDGE[spirit.rarity] ?? "#686867";

  const vpW      = window.innerWidth;
  const vpH      = window.innerHeight;
  const taskbar  = Math.max(0, window.screen.height - window.screen.availHeight);
  const safeH    = vpH - (taskbar || 48);
  const GAP      = 18;
  const cardLeft = cursorX + GAP + PS_TT_CARD_W <= vpW ? cursorX + GAP : cursorX - GAP - PS_TT_CARD_W;
  const cardTop  = Math.max(PS_TT_ICON_H / 2 + 8, Math.min(safeH - cardH, cursorY - 24));

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left: cardLeft, top: cardTop,
      width: PS_TT_CARD_W,
      background: "#1d1b1c",
      border: "1px solid #2a2a2a",
      borderRadius: "0 12px 0 12px",
      pointerEvents: "none",
      zIndex: 9999,
      overflow: "visible",
      boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
    }}>
      {/* Rectangular icon hanging above the card */}
      <div style={{
        position: "absolute",
        top: -(PS_TT_ICON_H / 2),
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1,
        width: PS_TT_ICON_W,
        height: PS_TT_ICON_H,
        borderRadius: "0 14px 0 14px",
        overflow: "hidden",
        border: `3px solid ${rarityColor}`,
        background: rarityBg,
        boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
      }}>
        {!imgError ? (
          <img src={getIconPath(spirit)} alt={spirit.name} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#444", fontSize: 22 }}>?</span>
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
          background: `linear-gradient(to right, ${rarityBarEdge}, ${rarityColor} 40%, ${rarityColor} 60%, ${rarityBarEdge})`,
        }} />
      </div>

      {/* Header */}
      <div style={{
        background: `linear-gradient(to bottom, ${rarityBg}ee ${PS_TT_ICON_H / 2}px, #1d1b1c 90%)`,
        borderRadius: "0 12px 0 0",
        paddingTop: PS_TT_ICON_H / 2 + 12,
        padding: `${PS_TT_ICON_H / 2 + 12}px 12px 12px`,
      }}>
        <div style={{ color: rarityColor, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", marginBottom: 2 }}>
          {spirit.rarity} · {spirit.type}
        </div>
        <div style={{ color: "#ffffff", fontSize: 15, fontWeight: 700, textAlign: "center", lineHeight: 1.3, marginBottom: spirit.type === "Drop" && spirit.tags?.length ? 8 : 0 }}>
          {spirit.name}
        </div>
        {spirit.type === "Drop" && spirit.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {spirit.tags.map((tag) => (
              <span key={tag} style={{
                background: "#595757",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "0 4px 0 4px",
                padding: "1px 7px",
                fontSize: 10,
                color: "#bfbfbf",
                letterSpacing: "0.05em",
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Effect body */}
      <div style={{ padding: "10px 14px 14px" }}>
        {spirit.effect && (
          <div className="skill-effect" dangerouslySetInnerHTML={{ __html: spirit.effect }} />
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Left-panel slot card ─────────────────────────────────────────────────────

function PactSpiritSlot({
  spirit, isPicking, minimized, onClick, onHover, onLeave,
}: {
  spirit:    PactSpirit | null;
  isPicking: boolean;
  minimized: boolean;
  onClick:   () => void;
  onHover?:  (spirit: PactSpirit, x: number, y: number) => void;
  onLeave?:  () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  useEffect(() => { setImgError(false); }, [spirit?.name]);

  const rarityColor = spirit ? (RARITY_COLOR[spirit.rarity] ?? "#6b6b6b") : null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={(e) => { setHovered(true); if (spirit) onHover?.(spirit, e.clientX, e.clientY); }}
      onMouseMove={(e)  => { if (spirit) onHover?.(spirit, e.clientX, e.clientY); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
    >
      {/* Card image */}
      <div style={{
        width: "100%", height: minimized ? 126 : 240,
        position: "relative", overflow: "hidden",
        borderRadius: minimized ? "0 13px 0 13px" : "0 24px 0 24px",
        border: minimized ? "2px solid #686867" : "4px solid #686867",
        outline: isPicking ? "4px solid #fbdb58" : "none",
        outlineOffset: "1px",
        background: spirit
          ? `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 70%), ${RARITY_BG[spirit.rarity] ?? "#161616"}`
          : "#464646",
        filter: !minimized && hovered ? "brightness(0.75)" : "none",
        transition: "filter 0.15s",
      }}>
        {spirit ? (
          <>
            {!imgError ? (
              <img
                src={getIconPath(spirit)}
                alt={spirit.name}
                onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", pointerEvents: "none", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#444", fontSize: 22 }}>?</span>
              </div>
            )}
            {/* Rarity glow */}
            <div style={{
              position: "absolute", bottom: minimized ? 5 : 10, left: 0, right: 0, height: minimized ? 32 : 60, zIndex: 1,
              background: `linear-gradient(to top, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}aa 0%, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}77 30%, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}33 65%, transparent 100%)`,
              pointerEvents: "none",
            }} />
            {/* Rarity bar */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: minimized ? 5 : 10,
              background: `linear-gradient(to right, ${RARITY_BAR_EDGE[spirit.rarity] ?? "#686867"}, ${RARITY_COLOR[spirit.rarity] ?? "#686867"} 40%, ${RARITY_COLOR[spirit.rarity] ?? "#686867"} 60%, ${RARITY_BAR_EDGE[spirit.rarity] ?? "#686867"})`,
              pointerEvents: "none",
            }} />
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              color: "#dcdcdc", fontSize: 52, fontWeight: 300, lineHeight: 1,
              textShadow: "0 0 8px #dcdcdc88, 0 0 18px #dcdcdc66, 0 0 34px #dcdcdc33",
            }}>+</span>
          </div>
        )}
      </div>

      {/* Name below card — hidden when minimized */}
      {!minimized && (
        <div style={{ height: 22, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 2 }}>
          {spirit && (
            <div style={{
              color: "#e4e4e7", fontSize: 14, fontWeight: 600, textAlign: "center", lineHeight: 1.3,
              overflow: "hidden",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {spirit.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Right-panel picker card ──────────────────────────────────────────────────

function PactSpiritCard({
  spirit, selected, disabled, onClick, onHover, onLeave,
}: {
  spirit:   PactSpirit;
  selected: boolean;
  disabled: boolean;
  onClick:  () => void;
  onHover?: (spirit: PactSpirit, x: number, y: number) => void;
  onLeave?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  const [tipPos,   setTipPos]   = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setImgError(false); }, [spirit.name]);

  const rarityColor = RARITY_COLOR[spirit.rarity] ?? "#6b6b6b";

  return (
    <div
      ref={wrapperRef}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        setHovered(true);
        if (disabled && wrapperRef.current) {
          const r = wrapperRef.current.getBoundingClientRect();
          setTipPos({ x: r.left + r.width / 2, y: r.top });
        }
        onHover?.(spirit, e.clientX, e.clientY);
      }}
      onMouseMove={(e) => onHover?.(spirit, e.clientX, e.clientY)}
      onMouseLeave={() => { setHovered(false); setTipPos(null); onLeave?.(); }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", position: "relative" }}
    >
      {/* Card image */}
      <div style={{
        width: "100%", height: 172,
        position: "relative", overflow: "hidden",
        borderRadius: "0 24px 0 24px",
        border: "4px solid #686867",
        outline: selected ? "4px solid #fbdb58" : "none",
        outlineOffset: "1px",
        background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 70%), ${RARITY_BG[spirit.rarity] ?? "#161616"}`,
        filter: disabled
          ? "grayscale(0.7) brightness(0.45)"
          : hovered ? "brightness(0.75)" : "none",
        transition: "filter 0.15s",
      }}>
        {!imgError ? (
          <img
            src={getIconPath(spirit)}
            alt={spirit.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", pointerEvents: "none", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#444", fontSize: 18 }}>?</span>
          </div>
        )}
        {/* Rarity glow */}
        <div style={{
          position: "absolute", bottom: 10, left: 0, right: 0, height: 60, zIndex: 1,
          background: `linear-gradient(to top, ${rarityColor}aa 0%, ${rarityColor}77 30%, ${rarityColor}33 65%, transparent 100%)`,
          pointerEvents: "none",
        }} />
        {/* Rarity bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 10,
          background: `linear-gradient(to right, ${RARITY_BAR_EDGE[spirit.rarity] ?? "#686867"}, ${rarityColor} 40%, ${rarityColor} 60%, ${RARITY_BAR_EDGE[spirit.rarity] ?? "#686867"})`,
          pointerEvents: "none",
        }} />
      </div>

      {/* Disabled tooltip — portaled to body to escape overflow clipping */}
      {disabled && tipPos && createPortal(
        <div style={{
          position: "fixed",
          left: tipPos.x, top: tipPos.y - 8,
          transform: "translate(-50%, -100%)",
          background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: "0 6px 0 6px",
          padding: "5px 9px", color: "#a1a1aa", fontSize: 10, whiteSpace: "nowrap",
          zIndex: 9999, pointerEvents: "none",
        }}>
          Already selected in another slot
        </div>,
        document.body
      )}

      {/* Name below card */}
      <div style={{ height: 28, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 2 }}>
        <div style={{
          color: "#e4e4e7", fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {spirit.name}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<Category, string> = {
  battle: "Battle Pactspirits",
  drop:   "Drop Pactspirits",
};

export default function PactspiritsPage() {
  const [selectedSlot,   setSelectedSlot]   = useState<SelectedSlot | null>(null);
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>({});
  const [battleSpirits,  setBattleSpirits]  = useState<PactSpirit[]>([]);
  const [dropSpirits,    setDropSpirits]    = useState<PactSpirit[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set());
  const [hoveredTag,       setHoveredTag]       = useState<string | null>(null);
  const [hoveredTooltip,   setHoveredTooltip]   = useState<{ spirit: PactSpirit; x: number; y: number } | null>(null);
  const [panelMinimized,   setPanelMinimized]   = useState(false);

  function handleSpiritHover(spirit: PactSpirit, x: number, y: number) { setHoveredTooltip({ spirit, x, y }); }
  function handleSpiritLeave() { setHoveredTooltip(null); }

  useEffect(() => {
    fetch("/api/pactspirits?category=battle").then((r) => r.json()).then(setBattleSpirits).catch(console.error);
    fetch("/api/pactspirits?category=drop").then((r) => r.json()).then(setDropSpirits).catch(console.error);
  }, []);

  function slotKey(cat: Category, idx: number) { return `${cat}-${idx}`; }

  function getAssignedSpirit(cat: Category, idx: number): PactSpirit | null {
    const name = slotSelections[slotKey(cat, idx)];
    if (!name) return null;
    const pool = cat === "battle" ? battleSpirits : dropSpirits;
    return pool.find((s) => s.name === name) ?? null;
  }

  function handleSlotClick(cat: Category, idx: number) {
    const isSameSlot = selectedSlot?.category === cat && selectedSlot?.index === idx;
    setSelectedSlot(isSameSlot ? null : { category: cat, index: idx });
    setSearchQuery("");
    if (!isSameSlot && cat !== selectedSlot?.category) setActiveTagFilters(new Set());
  }

  function toggleTagFilter(tag: string) {
    setActiveTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  function handleCardClick(name: string) {
    if (!selectedSlot) return;
    const key = slotKey(selectedSlot.category, selectedSlot.index);
    setSlotSelections((prev) => ({ ...prev, [key]: prev[key] === name ? "" : name }));
  }

  function clearSelection() {
    if (!selectedSlot) return;
    setSlotSelections((prev) => ({ ...prev, [slotKey(selectedSlot.category, selectedSlot.index)]: "" }));
  }

  const pool = selectedSlot?.category === "battle" ? battleSpirits : selectedSlot?.category === "drop" ? dropSpirits : [];
  const needle = searchQuery.replace(/\s/g, "").toLowerCase();
  const filtered = (() => {
    let result = needle ? pool.filter((s) => s.name.toLowerCase().includes(needle)) : pool;
    if (activeTagFilters.size > 0)
      result = result.filter((s) => (s.tags ?? []).some((t) => activeTagFilters.has(t)));
    return result;
  })();

  const takenNames: Set<string> = selectedSlot
    ? new Set(
        Object.entries(slotSelections)
          .filter(([key, name]) => name && key.startsWith(selectedSlot.category) && key !== slotKey(selectedSlot.category, selectedSlot.index))
          .map(([, name]) => name)
      )
    : new Set();

  const currentSelection = selectedSlot ? (slotSelections[slotKey(selectedSlot.category, selectedSlot.index)] ?? "") : "";
  const hasSelection     = !!currentSelection;

  const selectionLabel = selectedSlot ? CATEGORY_LABEL[selectedSlot.category] : "—";

  return (
    <div className="min-h-screen relative" style={BG_STYLE} onClick={() => setSelectedSlot(null)}>

      {/* Center diagram */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width={500} height={310}>
          {/* Original: A(250,15) B(60,240) C(440,240), G(250,144) — overall height 225px, bottom ~90px */}
          {/* Each sub-triangle is shrunk 6% toward its own centroid to create cut gaps */}
          {/* Top-left: A, B, G */}
          <polygon points="246,22 68,234 246,143" fill="#000000" />
          {/* Bottom: B, C, G */}
          <polygon points="71,238 429,238 250,148" fill="#000000" />
          {/* Top-right: A, C, G */}
          <polygon points="254,22 432,234 254,143" fill="#000000" />
        </svg>
      </div>

      {/* Left panel — top-left, height auto */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => { e.stopPropagation(); if (panelMinimized) setPanelMinimized(false); }}
        style={{ top: 20, left: 200, width: panelMinimized ? 320 : PANEL_W, background: PANEL_BG, borderRadius: "0 16px 0 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", transition: "width 0.2s ease", cursor: panelMinimized ? "pointer" : "default" }}
      >
        {/* Title + minimize button — entire header is the toggle hitbox */}
        <div
          className="flex items-center px-6"
          onClick={(e) => { e.stopPropagation(); setPanelMinimized((v) => !v); }}
          style={{ height: 46, borderBottom: "2px solid #333333", flexShrink: 0, position: "relative", cursor: "pointer" }}
        >
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>Pactspirits</span>
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#71717a" }}>
            {panelMinimized ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Slot rows */}
        <div style={{ display: "flex", flexDirection: "column", padding: "8px 20px 6px", gap: 6 }}>

          {/* Battle row */}
          <div>
            {!panelMinimized && (
              <p style={{ color: "#a1a1aa", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                Battle Pactspirit
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <PactSpiritSlot
                  key={i}
                  spirit={getAssignedSpirit("battle", i)}
                  isPicking={selectedSlot?.category === "battle" && selectedSlot?.index === i}
                  minimized={panelMinimized}
                  onClick={() => handleSlotClick("battle", i)}
                  onHover={handleSpiritHover}
                  onLeave={handleSpiritLeave}
                />
              ))}
            </div>
          </div>

          {/* Drop row — hidden when minimized */}
          {!panelMinimized && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: "#a1a1aa", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                Drop Pactspirit
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <PactSpiritSlot
                    key={i}
                    spirit={getAssignedSpirit("drop", i)}
                    isPicking={selectedSlot?.category === "drop" && selectedSlot?.index === i}
                    minimized={false}
                    onClick={() => handleSlotClick("drop", i)}
                    onHover={handleSpiritHover}
                    onLeave={handleSpiritLeave}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right panel — only visible when a slot is selected */}
      {selectedSlot && (
        <div
          className="absolute flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ left: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh", background: PANEL_BG, overflow: "visible" }}
        >
          {/* Tag filter tabs — attached to right edge of panel, sticking outward */}
          {(() => {
            const isBattle = selectedSlot.category === "battle";
            const tagOrder = isBattle ? TAG_ORDER : DROP_TAG_ORDER;
            const tagColors = isBattle ? TAG_COLORS : DROP_TAG_COLORS;
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", left: "100%", top: 140, display: "flex", flexDirection: "column", gap: 5, zIndex: 10, padding: "24px 28px 24px 6px" }}
              >
                {tagOrder.map((tag) => {
                  const color = tagColors[tag];
                  const active = activeTagFilters.has(tag);
                  const hovered = hoveredTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={(e) => { e.stopPropagation(); toggleTagFilter(tag); }}
                      onMouseEnter={() => setHoveredTag(tag)}
                      onMouseLeave={() => setHoveredTag(null)}
                      style={{
                        width: 160,
                        height: 42,
                        padding: "0 10px 0 6px",
                        background: (active || hovered) ? color : "#464646",
                        border: "3px solid #686867",
                        borderRadius: "0 14px 0 14px",
                        color: "#ffffff",
                        textShadow: "-1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7)",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.12s",
                        whiteSpace: "nowrap",
                        outline: active ? "3px solid #fbdb58" : "none",
                        outlineOffset: "0px",
                        boxShadow: "3px 3px 10px rgba(0,0,0,0.55)",
                        display: "flex",
                        alignItems: "center",
                        gap: !isBattle && tag !== "Others" ? 6 : 0,
                      }}
                    >
                      {!isBattle && tag !== "Others" && (
                        <img
                          src={`/icons/pactspirits/tags/${tag}.webp`}
                          alt=""
                          style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
                        />
                      )}
                      {tag}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Header */}
          <div className="px-4 pt-5 pb-3" style={{ borderBottom: "2px solid #333333", flexShrink: 0 }}>
            <p style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
              Selecting
            </p>
            <p style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 600 }}>
              {selectionLabel}
            </p>
          </div>

          {/* Search + clear */}
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexShrink: 0 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z '.0-9-]/g, ""))}
              placeholder="Search…"
              style={{
                flex: 1, background: "#111111", border: "1px solid #2a2a2a",
                borderRadius: "0 8px 0 8px", color: "#e4e4e7", fontSize: 12,
                padding: "6px 10px", outline: "none",
              }}
            />
            <button
              onClick={hasSelection ? clearSelection : undefined}
              disabled={!hasSelection}
              style={{
                padding: "5px 12px", borderRadius: "0 8px 0 8px",
                background: hasSelection ? "#c0392b" : "#1e1e1e",
                border: "none",
                color: hasSelection ? "#ffffff" : "#555555",
                fontSize: 11, fontWeight: 600,
                cursor: hasSelection ? "pointer" : "not-allowed",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >
              ✕ Clear Selection
            </button>
          </div>

          {/* Scrollable card grid, grouped by rarity */}
          <div className="overflow-y-auto" style={{ flex: 1, padding: "0 16px 16px" }}>
            {["Legendary", "Rare", "Magic"].map((rarity) => {
              const group = filtered.filter((s) => s.rarity === rarity);
              if (!group.length) return null;
              return (
                <div key={rarity} style={{ marginBottom: 12 }}>
                  <div style={{
                    color: RARITY_COLOR[rarity],
                    fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                    marginBottom: 6, paddingTop: 6, borderTop: "1px solid #2a2a2a",
                  }}>
                    {rarity}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {group.map((spirit) => (
                      <PactSpiritCard
                        key={spirit.id}
                        spirit={spirit}
                        selected={currentSelection === spirit.name}
                        disabled={takenNames.has(spirit.name)}
                        onClick={() => handleCardClick(spirit.name)}
                        onHover={handleSpiritHover}
                        onLeave={handleSpiritLeave}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hoveredTooltip && (
        <PactSpiritTooltipCard spirit={hoveredTooltip.spirit} cx={hoveredTooltip.x} cy={hoveredTooltip.y} />
      )}

    </div>
  );
}
