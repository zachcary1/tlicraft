"use client";

import { useState, useEffect } from "react";

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

const slot = 100;
const gap  = 8;
const step = slot + gap;
const pad  = 12;
const rows = 6;
const cols = 6;
const svgW = pad + cols * slot + (cols - 1) * gap + pad;
const svgH = pad + rows * slot + (rows - 1) * gap + pad;

const REMOVED = new Set([
  "0,0","0,1","0,4","0,5",
  "1,0",            "1,5",
  "4,0",            "4,5",
  "5,0","5,1","5,4","5,5",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "battle" | "drop";

interface PactSpirit {
  id:     string;
  type:   string;
  rarity: string;
  name:   string;
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

// ─── Left-panel slot card ─────────────────────────────────────────────────────

function PactSpiritSlot({
  spirit, isPicking, onClick,
}: {
  spirit:    PactSpirit | null;
  isPicking: boolean;
  onClick:   () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  useEffect(() => { setImgError(false); }, [spirit?.name]);

  const rarityColor = spirit ? (RARITY_COLOR[spirit.rarity] ?? "#6b6b6b") : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
    >
      {/* Card image */}
      <div style={{
        width: "100%", height: 240,
        position: "relative", overflow: "hidden",
        borderRadius: "0 24px 0 24px",
        border: "4px solid #686867",
        outline: isPicking ? "4px solid #fbdb58" : "none",
        outlineOffset: "1px",
        background: spirit
          ? `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 70%), ${RARITY_BG[spirit.rarity] ?? "#161616"}`
          : "#464646",
        filter: hovered ? "brightness(0.75)" : "none",
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
              position: "absolute", bottom: 10, left: 0, right: 0, height: 60, zIndex: 1,
              background: `linear-gradient(to top, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}aa 0%, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}77 30%, ${RARITY_COLOR[spirit.rarity] ?? "#686867"}33 65%, transparent 100%)`,
              pointerEvents: "none",
            }} />
            {/* Rarity bar */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 10,
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

      {/* Name below card — always reserves space to prevent layout shift */}
      <div style={{ height: 34, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 2 }}>
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
    </div>
  );
}

// ─── Right-panel picker card ──────────────────────────────────────────────────

function PactSpiritCard({
  spirit, selected, onClick,
}: {
  spirit:   PactSpirit;
  selected: boolean;
  onClick:  () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  useEffect(() => { setImgError(false); }, [spirit.name]);

  const rarityColor = RARITY_COLOR[spirit.rarity] ?? "#6b6b6b";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
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
        filter: hovered ? "brightness(0.75)" : "none",
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
  const [gridHovered,    setGridHovered]    = useState<string | null>(null);
  const [selectedSlot,   setSelectedSlot]   = useState<SelectedSlot | null>(null);
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>({});
  const [battleSpirits,  setBattleSpirits]  = useState<PactSpirit[]>([]);
  const [dropSpirits,    setDropSpirits]    = useState<PactSpirit[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");

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
    setSelectedSlot((prev) =>
      prev?.category === cat && prev?.index === idx ? null : { category: cat, index: idx }
    );
    setSearchQuery("");
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
  const needle   = searchQuery.replace(/\s/g, "").toLowerCase();
  const filtered = needle ? pool.filter((s) => s.name.toLowerCase().includes(needle)) : pool;

  const currentSelection = selectedSlot ? (slotSelections[slotKey(selectedSlot.category, selectedSlot.index)] ?? "") : "";
  const hasSelection     = !!currentSelection;

  const selectionLabel = selectedSlot ? CATEGORY_LABEL[selectedSlot.category] : "—";

  return (
    <div className="min-h-screen relative" style={BG_STYLE} onClick={() => setSelectedSlot(null)}>

      {/* Center diagram — decorative, no selection */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width={svgW} height={svgH}>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const key = `${r},${c}`;
              if (REMOVED.has(key)) return null;
              const x = pad + c * step;
              const y = pad + r * step;
              return (
                <rect
                  key={key}
                  x={x} y={y} width={slot} height={slot} rx="6"
                  fill={gridHovered === key ? "#3d3c3c" : "#2b2929"}
                  stroke={gridHovered === key ? "#535357" : "#3a3a3a"}
                  strokeWidth="2"
                  style={{ transition: "fill 0.1s, stroke 0.1s" }}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Left panel */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ right: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh", background: PANEL_BG }}
      >
        {/* Title */}
        <div className="flex items-center px-6" style={{ height: "6vh", borderBottom: "2px solid #333333", flexShrink: 0 }}>
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>Pactspirits</span>
        </div>

        {/* Centered slot rows */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", padding: "0 20px", gap: 28 }}>

          {/* Battle row */}
          <div>
            <p style={{ color: "#a1a1aa", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>
              Battle Pactspirit
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <PactSpiritSlot
                  key={i}
                  spirit={getAssignedSpirit("battle", i)}
                  isPicking={selectedSlot?.category === "battle" && selectedSlot?.index === i}
                  onClick={() => handleSlotClick("battle", i)}
                />
              ))}
            </div>
          </div>

          {/* Drop row */}
          <div>
            <p style={{ color: "#a1a1aa", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>
              Drop Pactspirit
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <PactSpiritSlot
                  key={i}
                  spirit={getAssignedSpirit("drop", i)}
                  isPicking={selectedSlot?.category === "drop" && selectedSlot?.index === i}
                  onClick={() => handleSlotClick("drop", i)}
                />
              ))}
            </div>
          </div>

        </div>

        <div style={{ borderTop: "2px solid #333333", flexShrink: 0, padding: "12px 24px", minHeight: 80 }} />
      </div>

      {/* Right panel */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ left: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh", background: PANEL_BG }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3" style={{ borderBottom: "2px solid #333333", flexShrink: 0 }}>
          <p style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            Selecting
          </p>
          <p style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 600 }}>
            {selectionLabel}
          </p>
        </div>

        {selectedSlot && (
          <>
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
                ✕ Clear
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
                          onClick={() => handleCardClick(spirit.name)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ borderTop: "2px solid #333333", flexShrink: 0, padding: "12px 24px", minHeight: 80, marginTop: "auto" }} />
      </div>

    </div>
  );
}
