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

// ─── Pactspirit tree ──────────────────────────────────────────────────────────

interface SpiritTreeSlot {
  name:   string;
  effect: string[];
  ring:   "inner" | "mid" | "outer";
}

interface SpiritTreeData {
  id:              string;
  name:            string;
  description:     string;
  mainSkillName:   string;
  mainSkillEffect: string;
  slots:           SpiritTreeSlot[];
  upgradeRanks:    { rank: number; modifiers: string[] }[];
  glossary:        Record<string, { name: string; description: string }>;
}

// ARM_NODES[armIdx][posIdx] = diagram node label (arm 0 = battle slot 0, etc.)
const ARM_NODES: readonly [readonly string[], readonly string[], readonly string[]] = [
  ["3","4","5","7","8","10","12","13","15","17"],
  ["27","28","29","31","32","34","36","37","39","41"],
  ["51","52","53","55","56","58","60","61","63","65"],
] as const;

// slots array order: [inner0..5, mid0..2, outer0]
// maps arm position (0-9) → index in that flat slots array
const POS_TO_SLOT_IDX = [0, 1, 6, 2, 3, 7, 4, 5, 8, 9] as const;

// maps arm position (0-9) → ring type
const POS_TO_RING: Record<number, "inner" | "mid" | "outer"> = {
  0: "inner", 1: "inner", 2: "mid",
  3: "inner", 4: "inner", 5: "mid",
  6: "inner", 7: "inner", 8: "mid",
  9: "outer",
};

// reverse lookup: node label → [armIdx, posIdx]
const NODE_LABEL_TO_ARM_POS: Record<string, [number, number]> = {};
ARM_NODES.forEach((arm, armIdx) => {
  arm.forEach((label, posIdx) => { NODE_LABEL_TO_ARM_POS[label] = [armIdx, posIdx]; });
});

const NODE_RING_COLOR: Record<string, string> = {
  inner: "#3b82f6",
  mid:   "#a855f7",
  outer: "#f59e0b",
};

// ─── Undetermined fate ────────────────────────────────────────────────────────

type FateNodeType = "micro" | "medium";
type FateKey = "left" | "right" | "bottom";
type FateState = { nodes: FateNodeType[] };

type FateSeg =
  | { type: "path"; d: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number };

const FATE_DEFS: Record<FateKey, {
  nodeCx: number; nodeCy: number; nodeLabel: string;
  gateway: FateSeg[];
  positions: { cx: number; cy: number }[];
  segments: string[];
}> = {
  left: {
    nodeCx: -35, nodeCy: 20, nodeLabel: "18",
    gateway: [
      { type: "path", d: "M -35 20 Q -48 55 -54 93" },
      { type: "line", x1: -54, y1: 93, x2: -154, y2: 93 },
    ],
    positions: [
      { cx: -154, cy: 93 },
      { cx: -135, cy: 5 },
      { cx: -98,  cy: -72 },
      { cx: -45,  cy: -139 },
      { cx: 26,   cy: -195 },
    ],
    segments: [
      "M -154 93 Q -148.5 46.5 -134.5 5.25",
      "M -134.5 5.25 Q -120.5 -36 -98 -72",
      "M -98 -72 Q -75.5 -108 -44.5 -138.75",
      "M -44.5 -138.75 Q -13.5 -169.5 26 -195",
    ],
  },
  right: {
    nodeCx: 450, nodeCy: -97, nodeLabel: "42",
    gateway: [
      { type: "path", d: "M 450 -97 Q 426 -120.5 397 -139" },
      { type: "line", x1: 397, y1: -139, x2: 439, y2: -230 },
    ],
    positions: [
      { cx: 439, cy: -230 },
      { cx: 510, cy: -177 },
      { cx: 564, cy: -112 },
      { cx: 601, cy: -37 },
      { cx: 621, cy: 50 },
    ],
    segments: [
      "M 439 -230 Q 478.5 -206 509.625 -176.5",
      "M 509.625 -176.5 Q 540.75 -147 563.5 -112",
      "M 563.5 -112 Q 586.25 -77 600.625 -36.5",
      "M 600.625 -36.5 Q 615 4 621 50",
    ],
  },
  bottom: {
    nodeCx: 320, nodeCy: 432, nodeLabel: "66",
    gateway: [
      { type: "path", d: "M 320 432 Q 353.5 419.5 385 400" },
      { type: "line", x1: 385, y1: 400, x2: 449, y2: 477 },
    ],
    positions: [
      { cx: 449, cy: 477 },
      { cx: 349, cy: 518 },
      { cx: 249, cy: 532 },
      { cx: 149, cy: 518 },
      { cx: 49,  cy: 477 },
    ],
    segments: [
      "M 449 477 Q 399 504.5 349 518",
      "M 349 518 Q 299 531.75 249 532",
      "M 249 532 Q 199 532 149 518",
      "M 149 518 Q 99 504.25 49 477",
    ],
  },
};

function canAddFateNode(nodes: FateNodeType[], type: FateNodeType): boolean {
  const next = [...nodes, type];
  const med = next.filter(n => n === "medium").length;
  const mic = next.filter(n => n === "micro").length;
  if (med === 0) return mic <= 5;
  if (mic === 0) return med <= 3;
  return med + mic <= 3;
}

function fateOptionLayout(micro: number, medium: number) {
  const h = 36, cy = 18;
  const microR = 8, mediumR = 13, gap = 5, pad = 10;
  const circles: { cx: number; cy: number; r: number }[] = [];
  let pen = pad;
  for (let i = 0; i < micro; i++) {
    if (i > 0) pen += gap;
    const cx = pen + microR;
    circles.push({ cx, cy, r: microR });
    pen = cx + microR;
  }
  for (let j = 0; j < medium; j++) {
    if (circles.length > 0) pen += gap;
    const cx = pen + mediumR;
    circles.push({ cx, cy, r: mediumR });
    pen = cx + mediumR;
  }
  return { circles, w: pen + pad, h };
}

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

function wrapNodeName(name: string): [string, string | null] {
  if (name.length <= 15) return [name, null];
  const words = name.split(" ");
  if (words.length === 1) return [name, null];
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

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
  spirit, isPicking, minimized, isLinked, onClick, onHover, onLeave, onSlotEnter,
}: {
  spirit:       PactSpirit | null;
  isPicking:    boolean;
  minimized:    boolean;
  isLinked?:    boolean;
  onClick:      () => void;
  onHover?:     (spirit: PactSpirit, x: number, y: number) => void;
  onLeave?:     () => void;
  onSlotEnter?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  useEffect(() => { setImgError(false); }, [spirit?.name]);

  const rarityColor = spirit ? (RARITY_COLOR[spirit.rarity] ?? "#6b6b6b") : null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={(e) => { setHovered(true); onSlotEnter?.(); if (spirit) onHover?.(spirit, e.clientX, e.clientY); }}
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
        outline: isPicking ? "4px solid #fbdb58" : isLinked ? "3px solid rgba(120,120,200,0.55)" : "none",
        boxShadow: isLinked && !isPicking ? "0 0 18px rgba(100,100,200,0.25)" : "none",
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

// ─── Node tooltip card ────────────────────────────────────────────────────────

function NodeTooltipCard({ slot, ring, cx: cursorX, cy: cursorY }: { slot: SpiritTreeSlot | null; ring: "inner" | "mid" | "outer"; cx: number; cy: number }) {
  const W = 220;
  const GAP = 14;
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const left = cursorX + GAP + W <= vpW ? cursorX + GAP : cursorX - GAP - W;
  const color = NODE_RING_COLOR[ring] ?? "#e4e4e7";
  const ringLabel = ring === "outer" ? "Large Node" : ring === "mid" ? "Medium Node" : "Micro Node";

  return createPortal(
    <div style={{
      position: "fixed", left, top: cursorY - 16,
      width: W,
      background: "#1d1b1c",
      border: "1px solid #2a2a2a",
      borderRadius: "0 10px 0 10px",
      pointerEvents: "none",
      zIndex: 9999,
      padding: "10px 12px 12px",
      boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
    }}>
      <div style={{ color, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        {ringLabel}
      </div>
      {slot ? (
        <>
          <div style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {slot.name}
          </div>
          {slot.effect.map((eff, i) => (
            <div key={i} style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>{eff}</div>
          ))}
        </>
      ) : (
        <div style={{ color: "#52525b", fontSize: 13, fontStyle: "italic" }}>
          Select a pactspirit to view node data
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Fate option card ─────────────────────────────────────────────────────────

function FateOptionCard({
  micro, medium, selected, onClick,
}: {
  micro: number; medium: number; selected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { circles, w, h } = fateOptionLayout(micro, medium);
  const labelA = micro > 0 ? `${micro} Micro` : `${medium} Medium`;
  const labelB = micro > 0 && medium > 0 ? `${medium} Medium` : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 8px 8px",
        background: selected ? "#0f2818" : hovered ? "#222222" : "#1a1a1a",
        border: "1px solid #2a2a2a",
        outline: selected ? "2px solid #fbdb58" : "none",
        outlineOffset: "1px",
        borderRadius: "0 10px 0 10px",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
    >
      <svg width={w} height={h}>
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r}
            fill="#22c55e" stroke="#ffffff" strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{ color: selected ? "#a8e6b8" : "#71717a", fontSize: 9, fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
        <div>{labelA}</div>
        {labelB && <div>{labelB}</div>}
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
  const [panelMinimized,   setPanelMinimized]   = useState(true);
  const [headerHovered,    setHeaderHovered]    = useState(false);
  const [hoveredBattleLink, setHoveredBattleLink] = useState<number | null>(null);
  const [fates, setFates] = useState<Record<FateKey, FateState>>({
    left:   { nodes: [] },
    right:  { nodes: [] },
    bottom: { nodes: [] },
  });
  const [selectedFate, setSelectedFate] = useState<FateKey | null>(null);
  const [treeData,        setTreeData]        = useState<Record<number, SpiritTreeData | null>>({ 0: null, 1: null, 2: null });
  const [nodeTooltip,     setNodeTooltip]     = useState<{ slot: SpiritTreeSlot | null; ring: "inner" | "mid" | "outer"; x: number; y: number } | null>(null);
  const [fateNodeTooltip, setFateNodeTooltip] = useState<{ x: number; y: number } | null>(null);

  function addFateNode(key: FateKey, type: FateNodeType) {
    setFates(prev => ({ ...prev, [key]: { nodes: [...prev[key].nodes, type] } }));
  }
  function removeFateNodeLast(key: FateKey) {
    setFates(prev => ({ ...prev, [key]: { nodes: prev[key].nodes.slice(0, -1) } }));
  }
  function clearFate(key: FateKey) {
    setFates(prev => ({ ...prev, [key]: { nodes: [] } }));
  }

  const currentFateNodes = selectedFate ? fates[selectedFate].nodes : [];
  const currentFate = {
    micro:  currentFateNodes.filter(n => n === "micro").length,
    medium: currentFateNodes.filter(n => n === "medium").length,
  };
  const hasFate = currentFateNodes.length > 0;

  function handleFateSelect(micro: number, medium: number) {
    if (!selectedFate) return;
    const same = hasFate && currentFate.micro === micro && currentFate.medium === medium;
    const nodes: FateNodeType[] = [];
    if (!same) {
      for (let i = 0; i < micro; i++) nodes.push("micro");
      for (let j = 0; j < medium; j++) nodes.push("medium");
    }
    setFates(prev => ({ ...prev, [selectedFate]: { nodes } }));
  }

  function clearFateSelection() {
    if (!selectedFate) return;
    setFates(prev => ({ ...prev, [selectedFate]: { nodes: [] } }));
  }

  function handleSpiritHover(spirit: PactSpirit, x: number, y: number) { setHoveredTooltip({ spirit, x, y }); }
  function handleSpiritLeave() { setHoveredTooltip(null); }

  useEffect(() => {
    fetch("/api/pactspirits?category=battle").then((r) => r.json()).then(setBattleSpirits).catch(console.error);
    fetch("/api/pactspirits?category=drop").then((r) => r.json()).then(setDropSpirits).catch(console.error);
  }, []);

  useEffect(() => {
    [0, 1, 2].forEach((armIdx) => {
      const name = slotSelections[`battle-${armIdx}`];
      const spirit = name ? battleSpirits.find((s) => s.name === name) ?? null : null;
      if (!spirit) {
        setTreeData((prev) => ({ ...prev, [armIdx]: null }));
        return;
      }
      fetch(`/api/pactspirit-tree?name=${encodeURIComponent(spirit.name)}`)
        .then((r) => r.json())
        .then((data) => setTreeData((prev) => ({ ...prev, [armIdx]: data })))
        .catch(() => setTreeData((prev) => ({ ...prev, [armIdx]: null })));
    });
  }, [slotSelections, battleSpirits]);

  function getNodeSlot(label: string): SpiritTreeSlot | null {
    const armPos = NODE_LABEL_TO_ARM_POS[label];
    if (!armPos) return null;
    const [armIdx, posIdx] = armPos;
    const tree = treeData[armIdx];
    if (!tree) return null;
    const slotIdx = POS_TO_SLOT_IDX[posIdx];
    return (tree.slots[slotIdx] as SpiritTreeSlot) ?? null;
  }

  function getNodeRing(label: string): "inner" | "mid" | "outer" | null {
    const armPos = NODE_LABEL_TO_ARM_POS[label];
    if (!armPos) return null;
    return POS_TO_RING[armPos[1]] ?? null;
  }

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
    setSelectedFate(null);
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
    <div className="min-h-screen relative" style={BG_STYLE} onClick={() => { setSelectedSlot(null); setSelectedFate(null); }}>

      {/* Center diagram */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width={500} height={390} overflow="visible">
          <defs>
            <filter id="ring-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#000000" floodOpacity="0.9" />
            </filter>
            <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="node-clip-0"><circle cx={173} cy={97}  r={35} /></clipPath>
            <clipPath id="node-clip-1"><circle cx={327} cy={97}  r={35} /></clipPath>
            <clipPath id="node-clip-2"><circle cx={250} cy={234} r={35} /></clipPath>
          </defs>
          <g transform="translate(0, 50)">
          {/* Original: A(250,15) B(60,240) C(440,240), G(250,144) — overall height 225px, bottom ~90px */}
          {/* Each sub-triangle is shrunk 6% toward its own centroid to create cut gaps */}
          {/* Top-left: A, B, G */}
          <polygon points="246,22 68,234 246,143" fill="#000000" />
          {/* Bottom: B, C, G */}
          <polygon points="71,238 429,238 250,148" fill="#000000" />
          {/* Top-right: A, C, G */}
          <polygon points="254,22 432,234 254,143" fill="#000000" />
          {/* Outward lines from each node, perpendicular to their triangle edge */}
          {/* Node 0 → left edge normal (-0.764, -0.645), 140px */}
          <line x1={173} y1={97}  x2={66}  y2={7}   stroke="#444444" strokeWidth={8} />
          {/* Node 1 → right edge normal (0.764, -0.645), 140px */}
          <line x1={327} y1={97}  x2={434} y2={7}   stroke="#444444" strokeWidth={8} />
          {/* Node 2 → bottom edge normal (0, 1), 140px */}
          <line x1={250} y1={234} x2={250} y2={374} stroke="#444444" strokeWidth={8} />
          {/* DEV: visible labeled turning point nodes */}
          {([
          ] as { cx: number; cy: number; label: string }[]).map(({ cx, cy, label }) => (
            <g key={label}>
              <circle cx={cx} cy={cy} r={8} fill="#e85d04" stroke="#fff" strokeWidth={1.5} />
              <text x={cx + 12} y={cy + 5} fontSize={13} fontWeight="bold" fill="#e85d04" stroke="#000" strokeWidth={3} paintOrder="stroke">{label}</text>
            </g>
          ))}
          {/* TP0 extension: 260° direction (-0.174, 0.985), ~150px, slight outward curve */}
          <path d="M 66 7 Q 28 77 40 155" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* DEV: endpoint nodes */}
          {([
          ] as { cx: number; cy: number; label: string }[]).map(({ cx, cy, label }) => (
            <g key={label}>
              <circle cx={cx} cy={cy} r={8} fill="#e85d04" stroke="#fff" strokeWidth={1.5} />
              <text x={cx + 12} y={cy + 5} fontSize={13} fontWeight="bold" fill="#e85d04" stroke="#000" strokeWidth={3} paintOrder="stroke">{label}</text>
            </g>
          ))}
          {/* TP1 extension: 150° direction (-0.866, -0.5), ~150px, slight outward curve */}
          <path d="M 434 7 Q 382 -52 304 -68" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* TP2 extension: 30° direction (0.866, -0.5), ~150px, slight outward curve */}
          <path d="M 250 374 Q 328 358 380 299" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* F extension: 320° direction (0.766, 0.643), 300px straight line */}
          <line x1={380} y1={299} x2={610} y2={492} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 18 extension: 130° direction (-0.643, -0.766), 60px straight */}
          <line x1={525} y1={577} x2={486} y2={531} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 17 extension: 250° direction (-0.342, 0.940), 60px straight */}
          <line x1={472} y1={-333} x2={451} y2={-277} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 9 extension: 225° direction (-0.707, 0.707), 120px, very slight curve */}
          <path d="M 610 492 Q 575 542 525 577" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 15 extension: 345° direction (0.966, 0.259), 120px, very slight curve */}
          <path d="M 356 -364 Q 417 -358 472 -333" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 33 extension: 75° direction (0.259, -0.966), 60px straight */}
          <line x1={91} y1={640} x2={107} y2={582} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 27 extension: 180° direction (-1, 0), 220px, curved; nodes at t=0.5 and end */}
          <path d="M 409 640 Q 250 680 91 640" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 24 extension: 280° direction (0.174, 0.985), 60px straight */}
          <line x1={399} y1={581} x2={409} y2={640} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 21 extension: 210° direction (-0.866, 0.5), 100px, slight curve */}
          <path d="M 486 531 Q 447 563 399 581" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 26 extension: 315° direction (0.707, 0.707), 248px, curved; nodes at t=0.5 and end */}
          <path d="M 577 -273 Q 682 -204 752 -98" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 31 extension: 210° direction (-0.866, 0.5), 60px straight */}
          <line x1={752} y1={-98} x2={700} y2={-68} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 23 extension: 50° direction (0.643, -0.766), 60px straight */}
          <line x1={538} y1={-227} x2={577} y2={-273} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 20 extension: 330° direction (0.866, 0.5), 100px, slight curve */}
          <path d="M 451 -277 Q 499 -259 538 -227" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 25 extension: 65° direction (0.423, -0.906), 248px, curved; nodes at t=0.5 and end */}
          <path d="M -267 -21 Q -237 -144 -162 -246" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 34 extension: 45° direction (0.707, -0.707), 120px, slight curve */}
          <path d="M -116 -207 Q -84 -260 -31 -292" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 35 extension: 280° direction (0.174, 0.985), 120px, slight curve */}
          <path d="M 700 -68 Q 725 -12 721 50" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 36 extension: 170° direction (-0.985, -0.174), 120px, slight curve */}
          <path d="M 107 582 Q 45 586 -11 561" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 38 extension: 0° direction (1, 0), 60px straight */}
          <line x1={721} y1={50} x2={781} y2={50} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 37 extension: 120° direction (-0.5, -0.866), 60px straight */}
          <line x1={-31} y1={-292} x2={-61} y2={-344} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 39 extension: 240° direction (-0.5, 0.866), 60px straight */}
          <line x1={-11} y1={561} x2={-41} y2={613} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 41 extension: 15° direction (0.966, -0.259), 150px, slight curve */}
          <path d="M -61 -344 Q 8 -378 84 -383" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 40 extension: 260° direction (-0.174, 0.985), 150px, slight curve */}
          <path d="M 781 50 Q 783 127 755 198" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 42 extension: 150° direction (-0.866, -0.5), 150px, slight curve */}
          <path d="M -41 613 Q -113 588 -171 538" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 43 extension: 290° direction (0.342, 0.940), 250px straight */}
          <line x1={84} y1={-383} x2={170} y2={-148} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 44 extension: 170° direction (-0.985, -0.174), 250px straight */}
          <line x1={755} y1={198} x2={509} y2={155} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 45 extension: 45° direction (0.707, -0.707), 250px straight */}
          <line x1={-171} y1={538} x2={6} y2={361} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 46 extension: 210° direction (-0.866, 0.5), 200px, curved */}
          <path d="M 170 -148 Q 69 -124 -3 -48" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 47 extension: 95° direction (-0.087, -0.996), 200px, curved */}
          <path d="M 509 155 Q 530 53 492 -44" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 49 extension: 250° direction (-0.342, 0.940), 150px, curved; nodes at t=0.5 and end */}
          <path d="M -3 -48 Q -22.5 -15.5 -35 20" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 50 extension: 135° direction (-0.707, -0.707), 135px, curved; nodes at t=0.5 and end */}
          <path d="M 492 -44 Q 473.5 -73 450 -97" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 51 extension: 20° direction (0.940, -0.342), 145px, curved; nodes at t=0.5 and end */}
          <path d="M 249 450 Q 285.5 444.5 320 432" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Undetermined fate branches — gateway lines, segments, and nodes rendered conditionally */}
          {(["left", "right", "bottom"] as FateKey[]).map((key) => {
            const def = FATE_DEFS[key];
            const { nodes } = fates[key];
            if (nodes.length === 0) return null;
            return (
              <g key={key}>
                {def.gateway.map((seg, i) =>
                  seg.type === "path"
                    ? <path key={i} d={seg.d} fill="none" stroke="#22c55e" strokeWidth={8} strokeLinecap="square" />
                    : <line key={i} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#22c55e" strokeWidth={8} strokeLinecap="square" />
                )}
                {nodes.map((type, i) => {
                  const pos = def.positions[i];
                  const r = type === "medium" ? 30 : 18;
                  return (
                    <g key={i}>
                      {i > 0 && <path d={def.segments[i - 1]} fill="none" stroke="#22c55e" strokeWidth={8} strokeLinecap="square" />}
                      <circle cx={pos.cx} cy={pos.cy} r={r} fill="#22c55e" stroke="#fff" strokeWidth={1.5} />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* Node 48 extension: 340° direction (0.940, 0.342), 259px, curved */}
          <path d="M 6 361 Q 117 434 249 450" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 29 extension: 320° direction (0.766, 0.643), 60px straight */}
          <line x1={-162} y1={-246} x2={-116} y2={-207} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 22 extension: 170° direction (-0.985, -0.174), 50px straight */}
          <line x1={-208} y1={-11} x2={-267} y2={-21} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 19 extension: 85° direction (0.087, -0.996), 100px, slight curve */}
          <path d="M -217 89 Q -220 38 -208 -11" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 16 extension: 0° direction (1, 0), 50px straight */}
          <line x1={-277} y1={89} x2={-217} y2={89} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* Node 12 extension: 100° direction (-0.174, -0.985), 80px, very slight curve */}
          <path d="M -256 207 Q -276 150 -277 89" fill="none" stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* D extension: 190° direction (-0.985, 0.174), 300px straight line */}
          <line x1={40} y1={155} x2={-256} y2={207} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {/* E extension: 80° direction (0.174, -0.985), 300px straight line */}
          <line x1={304} y1={-68} x2={356} y2={-364} stroke="#444444" strokeWidth={8} strokeLinecap="square" />
          {([
            { cx: 457,  cy: 363,  label: "51", size: "small" },
            { cx: 533,  cy: 428,  label: "52", size: "small" },
            { cx: 610,  cy: 492,  label: "53", size: "medium" },
            { cx: -217, cy: 89,   label: "7",  size: "small" },
            { cx: -208, cy: -11,  label: "8",  size: "small" },
            { cx: -226, cy: -139, label: "10", size: "medium" },
            { cx: -116, cy: -207, label: "12", size: "small" },
            { cx: -31,  cy: -292, label: "13", size: "small" },
            { cx: 84,   cy: -383, label: "15", size: "medium" },
            { cx: -3,   cy: -48,  label: "17", size: "large" },
            { cx: 451,  cy: -277, label: "31", size: "small" },
            { cx: 538,  cy: -227, label: "32", size: "small" },
            { cx: 673,  cy: -195, label: "34", size: "medium" },
            { cx: 700,  cy: -68,  label: "36", size: "small" },
            { cx: 721,  cy: 50,   label: "37", size: "small" },
            { cx: 755,  cy: 198,  label: "39", size: "medium" },
            { cx: 492,  cy: -44,  label: "41", size: "large" },
            { cx: -11,  cy: 561,  label: "61", size: "small" },
            { cx: -171, cy: 538,  label: "63", size: "medium" },
            { cx: 249,  cy: 450,  label: "65", size: "large" },
            { cx: 486,  cy: 531,  label: "55", size: "small" },
            { cx: 399,  cy: 581,  label: "56", size: "small" },
            { cx: 250,  cy: 660,  label: "58", size: "medium" },
            { cx: 107,  cy: 582,  label: "60", size: "small" },
            { cx: -59,  cy: 172,  label: "3",  size: "small" },
            { cx: -157, cy: 190,  label: "4",  size: "small" },
            { cx: -256, cy: 207,  label: "5",  size: "medium" },
            { cx: 321,  cy: -167, label: "27", size: "small" },
            { cx: 339,  cy: -265, label: "28", size: "small" },
            { cx: 356,  cy: -364, label: "29", size: "medium" },
          ] as { cx: number; cy: number; label: string; size: string; color?: string }[]).map(({ cx, cy, label, size, color }) => {
            const r = size === "large" ? 40 : size === "medium" ? 30 : 18;
            const slot = getNodeSlot(label);
            const ring = getNodeRing(label);
            const fill = slot ? (NODE_RING_COLOR[slot.ring] ?? "#e85d04") : (color ?? "#e85d04");
            return (
            <g key={label}
              style={{ pointerEvents: ring ? "all" : "none", cursor: "default" }}
              onMouseEnter={(e) => { if (ring) setNodeTooltip({ slot, ring, x: e.clientX, y: e.clientY }); }}
              onMouseMove={(e)  => { if (ring) setNodeTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null); }}
              onMouseLeave={() => setNodeTooltip(null)}
            >
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#fff" strokeWidth={1.5} />
              <text x={cx + r + 4} y={cy + 5} fontSize={13} fontWeight="bold" fill={fill} stroke="#000" strokeWidth={3} paintOrder="stroke">{label}</text>
            </g>
            );
          })}
          {/* Fate nodes (18, 42, 66) — always visible, clickable to configure */}
          {(["left", "right", "bottom"] as FateKey[]).map((key) => {
            const def = FATE_DEFS[key];
            const isSelected = selectedFate === key;
            const hasNodes = fates[key].nodes.length > 0;
            return (
              <g key={key} style={{ pointerEvents: "all", cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setSelectedFate(isSelected ? null : key); setSelectedSlot(null); }}
                onMouseEnter={(e) => setFateNodeTooltip({ x: e.clientX, y: e.clientY })}
                onMouseMove={(e)  => setFateNodeTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setFateNodeTooltip(null)}>
                <circle cx={def.nodeCx} cy={def.nodeCy} r={18}
                  fill={hasNodes ? "#22c55e" : "#e85d04"}
                  stroke={isSelected ? "#fbdb58" : "#fff"} strokeWidth={isSelected ? 3 : 1.5} />
                <text x={def.nodeCx + 22} y={def.nodeCy + 5} fontSize={13} fontWeight="bold"
                  fill={hasNodes ? "#22c55e" : "#e85d04"} stroke="#000" strokeWidth={3} paintOrder="stroke">
                  {def.nodeLabel}
                </text>
              </g>
            );
          })}
          {/* Ring centered on G */}
          <circle cx={250} cy={144} r={90} fill="none" stroke="#262626" strokeWidth={8} filter="url(#ring-shadow)" />
          <circle cx={250} cy={144} r={90} fill="none" stroke="#32364d" strokeWidth={3} />
          {/* Battle Pactspirit nodes */}
          {([
            { cx: 173, cy: 97,  idx: 0 },
            { cx: 327, cy: 97,  idx: 1 },
            { cx: 250, cy: 234, idx: 2 },
          ] as { cx: number; cy: number; idx: number }[]).map(({ cx, cy, idx }) => {
            const spirit = getAssignedSpirit("battle", idx);
            const isPicking = selectedSlot?.category === "battle" && selectedSlot?.index === idx;
            return (
              <g
                key={idx}
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onMouseEnter={(e) => { setHoveredBattleLink(idx); if (spirit) handleSpiritHover(spirit, e.clientX, e.clientY); }}
                onMouseMove={(e)  => { if (spirit) handleSpiritHover(spirit, e.clientX, e.clientY); }}
                onMouseLeave={() => { setHoveredBattleLink(null); handleSpiritLeave(); }}
                onClick={(e) => { e.stopPropagation(); handleSlotClick("battle", idx); }}
              >
                {/* Fill */}
                <circle
                  cx={cx} cy={cy} r={35}
                  fill={spirit ? (RARITY_BG[spirit.rarity] ?? "#272626") : hoveredBattleLink === idx ? "#353333" : "#272626"}
                  stroke="none"
                  style={{ transition: "fill 0.15s" }}
                />
                {/* Image clipped to circle */}
                {spirit && (
                  <image
                    href={getIconPath(spirit)}
                    x={cx - 35} y={cy - 35}
                    width={70} height={70}
                    preserveAspectRatio="xMidYMin slice"
                    clipPath={`url(#node-clip-${idx})`}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {/* Stroke on top so it always overlays the image */}
                <circle
                  cx={cx} cy={cy} r={35}
                  fill="none"
                  stroke={isPicking ? "#fbdb58" : hoveredBattleLink === idx ? "#7878b8" : "#444444"}
                  strokeWidth={isPicking ? 3 : hoveredBattleLink === idx ? 2.5 : 2}
                  style={{ transition: "stroke 0.15s" }}
                />
                {/* Name below node */}
                {spirit && (() => {
                  const [line1, line2] = wrapNodeName(spirit.name);
                  const baseY = cy + 35 + 16;
                  const textProps = {
                    textAnchor: "middle" as const,
                    fill: "#ffffff",
                    fontSize: 12,
                    fontWeight: "bold",
                    stroke: "#000000",
                    strokeWidth: 2,
                    paintOrder: "stroke" as const,
                    style: { pointerEvents: "none" as const, userSelect: "none" as const },
                  };
                  return (
                    <>
                      <text x={cx} y={baseY} {...textProps}>{line1}</text>
                      {line2 && <text x={cx} y={baseY + 15} {...textProps}>{line2}</text>}
                    </>
                  );
                })()}
              </g>
            );
          })}
          </g>
        </svg>
      </div>

      {/* Left panel — top-left, height auto */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ top: 20, left: 200, width: panelMinimized ? 320 : PANEL_W, background: PANEL_BG, borderRadius: "0 16px 0 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", transition: "width 0.2s ease" }}
      >
        {/* Title + minimize button — entire header is the toggle hitbox */}
        <div
          className="flex items-center px-6"
          onClick={(e) => { e.stopPropagation(); setPanelMinimized((v) => !v); }}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
          style={{ height: 46, borderBottom: "2px solid #333333", flexShrink: 0, position: "relative", cursor: "pointer", background: headerHovered ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.15s", borderRadius: "0 16px 0 0" }}
        >
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>Pactspirits</span>
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: headerHovered ? "#e4e4e7" : "#71717a", transition: "color 0.15s" }}>
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
                  isLinked={hoveredBattleLink === i}
                  onClick={() => handleSlotClick("battle", i)}
                  onHover={handleSpiritHover}
                  onLeave={() => { setHoveredBattleLink(null); handleSpiritLeave(); }}
                  onSlotEnter={() => setHoveredBattleLink(i)}
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

      {/* Fate selector panel — right side, shown when an undetermined fate node is selected */}
      {selectedFate && (
        <div
          className="absolute flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ left: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh", background: PANEL_BG, overflow: "hidden" }}
        >
          {/* Header */}
          <div className="px-4 pt-5 pb-3" style={{ borderBottom: "2px solid #333333", flexShrink: 0 }}>
            <p style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
              Undetermined Fate · Node {FATE_DEFS[selectedFate].nodeLabel}
            </p>
            <p style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 600 }}>
              Choose Fate Configuration
            </p>
          </div>

          {/* Clear button */}
          <div style={{ padding: "10px 16px", flexShrink: 0 }}>
            <button
              onClick={clearFateSelection}
              disabled={!hasFate}
              style={{
                padding: "5px 12px", borderRadius: "0 8px 0 8px",
                background: hasFate ? "#c0392b" : "#1e1e1e",
                border: "none",
                color: hasFate ? "#ffffff" : "#555555",
                fontSize: 11, fontWeight: 600,
                cursor: hasFate ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}
            >
              ✕ Clear Fate
            </button>
          </div>

          {/* Scrollable sections */}
          <div className="overflow-y-auto" style={{ flex: 1, padding: "0 16px 16px" }}>

            {/* Micro Fates */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#71717a", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, paddingTop: 8, borderTop: "1px solid #2a2a2a" }}>
                Micro Fates
              </div>
              <p style={{ color: "#3f3f46", fontSize: 10, marginBottom: 8 }}>Up to 5 small fate slots</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <FateOptionCard
                    key={n}
                    micro={n} medium={0}
                    selected={hasFate && currentFate.micro === n && currentFate.medium === 0}
                    onClick={() => handleFateSelect(n, 0)}
                  />
                ))}
              </div>
            </div>

            {/* Medium Fates */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#71717a", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, paddingTop: 8, borderTop: "1px solid #2a2a2a" }}>
                Medium Fates
              </div>
              <p style={{ color: "#3f3f46", fontSize: 10, marginBottom: 8 }}>Up to 3 large fate slots</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3].map((n) => (
                  <FateOptionCard
                    key={n}
                    micro={0} medium={n}
                    selected={hasFate && currentFate.medium === n && currentFate.micro === 0}
                    onClick={() => handleFateSelect(0, n)}
                  />
                ))}
              </div>
            </div>

            {/* Mixed Fates */}
            <div>
              <div style={{ color: "#71717a", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, paddingTop: 8, borderTop: "1px solid #2a2a2a" }}>
                Mixed Fates
              </div>
              <p style={{ color: "#3f3f46", fontSize: 10, marginBottom: 8 }}>Up to 3 total fate slots (micro + medium)</p>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { micro: 1, medium: 1 },
                  { micro: 1, medium: 2 },
                  { micro: 2, medium: 1 },
                ] as { micro: number; medium: number }[]).map((opt) => (
                  <FateOptionCard
                    key={`${opt.micro}-${opt.medium}`}
                    micro={opt.micro} medium={opt.medium}
                    selected={hasFate && currentFate.micro === opt.micro && currentFate.medium === opt.medium}
                    onClick={() => handleFateSelect(opt.micro, opt.medium)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {hoveredTooltip && (
        <PactSpiritTooltipCard spirit={hoveredTooltip.spirit} cx={hoveredTooltip.x} cy={hoveredTooltip.y} />
      )}

      {nodeTooltip && (
        <NodeTooltipCard slot={nodeTooltip.slot} ring={nodeTooltip.ring} cx={nodeTooltip.x} cy={nodeTooltip.y} />
      )}

      {fateNodeTooltip && createPortal(
        <div style={{
          position: "fixed",
          left: fateNodeTooltip.x + 14,
          top:  fateNodeTooltip.y - 16,
          width: 180,
          background: "#1d1b1c",
          border: "1px solid #2a2a2a",
          borderRadius: "0 10px 0 10px",
          pointerEvents: "none",
          zIndex: 9999,
          padding: "10px 12px 12px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
        }}>
          <div style={{ color: "#22c55e", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Undetermined Fate
          </div>
          <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>+6% damage</div>
          <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>+6% minion damage</div>
        </div>,
        document.body
      )}

    </div>
  );
}
