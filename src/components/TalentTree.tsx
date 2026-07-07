"use client";
import { useState } from "react";
import type { TalentTreeData, TalentNodeData, CoreTalentData } from "../../data/crafted/torchcodex/talent-tree/types";

// ── Grid constants ─────────────────────────────────────────────────────────────

const COLS     = 7;
const ROWS     = 5;
const CELL_W   = 190;
const CELL_H   = 110;
const HEADER_H = 34;

const COL_PTS = [0, 3, 6, 9, 12, 15, 18];

// Core tiers unlock once this many points have been allocated anywhere in the tree.
const CORE_REQ: Record<1 | 2, number> = { 1: 12, 2: 24 };

// ── Node sizes & palette ────────────────────────────────────────────────────────
// Every node (micro/medium/legendary/core) renders as the same-size circle with a
// shared neutral palette: dark-gray fill, a darker-gray inner border, and a white
// outer ring. Fulfilled nodes flip to a white fill with a blacked-out icon; nodes
// that can't currently be selected get their icon grayed out instead.

const NODE_R  = 32;
const CORE_R  = 32;

const NODE_BG          = "#414142";
const NODE_BORDER      = "#232324";
const NODE_RING        = "#ffffff";
const NODE_RING_LOCKED = "#555555";

// ── Grid position helper ───────────────────────────────────────────────────────

function gridPx(col: number, row: number) {
  return {
    x: col * CELL_W + CELL_W / 2,
    y: HEADER_H + row * CELL_H + CELL_H / 2,
  };
}

function posId(pos: { x: number; y: number }): string {
  return `${pos.x},${pos.y}`;
}

// ── Allocation logic ───────────────────────────────────────────────────────────

function colRequirement(col: number): number {
  return COL_PTS[col] ?? 0;
}

// Points spent in columns strictly before `col` — a column's own points (or any
// later column's) never count toward unlocking it, so removing earlier investment
// can't be propped up by points that were only reachable because of it.
function pointsBeforeColumn(tree: TalentTreeData, allocated: Record<string, number>, col: number): number {
  return tree.nodes.reduce((sum, n) => (n.position.x >= col ? sum : sum + (allocated[posId(n.position)] ?? 0)), 0);
}

function findNode(tree: TalentTreeData, pos: { x: number; y: number }): TalentNodeData | undefined {
  return tree.nodes.find((n) => n.position.x === pos.x && n.position.y === pos.y);
}

function prerequisiteSatisfied(
  tree: TalentTreeData,
  node: TalentNodeData,
  allocated: Record<string, number>,
): boolean {
  if (!node.prerequisite) return true;
  const pre = findNode(tree, node.prerequisite);
  if (!pre) return true;
  return (allocated[posId(pre.position)] ?? 0) >= pre.maxPoints;
}

function canAllocate(
  tree: TalentTreeData,
  node: TalentNodeData,
  allocated: Record<string, number>,
): boolean {
  const current = allocated[posId(node.position)] ?? 0;
  if (current >= node.maxPoints) return false;
  if (pointsBeforeColumn(tree, allocated, node.position.x) < colRequirement(node.position.x)) return false;
  if (!prerequisiteSatisfied(tree, node, allocated)) return false;
  return true;
}

function canDeallocate(
  tree: TalentTreeData,
  node: TalentNodeData,
  allocated: Record<string, number>,
  coreSelected: Partial<Record<1 | 2, string>>,
): boolean {
  const id = posId(node.position);
  const current = allocated[id] ?? 0;
  if (current <= 0) return false;

  const nextAllocated = { ...allocated, [id]: current - 1 };

  for (const n of tree.nodes) {
    const pts = nextAllocated[posId(n.position)] ?? 0;
    if (pts <= 0) continue;
    if (pointsBeforeColumn(tree, nextAllocated, n.position.x) < colRequirement(n.position.x)) return false;
    if (!prerequisiteSatisfied(tree, n, nextAllocated)) return false;
  }

  const nextTotal = Object.values(nextAllocated).reduce((a, b) => a + b, 0);
  for (const tier of [1, 2] as const) {
    if (coreSelected[tier] && nextTotal < CORE_REQ[tier]) return false;
  }

  return true;
}

// ── Tooltips ───────────────────────────────────────────────────────────────────

interface TooltipInfo {
  nodeType:  string;
  rawAffix:  string;
  current:   number;
  maxPoints: number;
  locked:    boolean;
  lockMsg?:  string;
  px:        number;
  py:        number;
}

function NodeTooltip({ info, W }: { info: TooltipInfo; W: number }) {
  const TOOLTIP_W = 220;
  const lines     = info.rawAffix.split("\n").filter(Boolean);
  const isRight   = info.px < W - TOOLTIP_W - 24;
  const r         = NODE_R;

  return (
    <div style={{
      position:     "absolute",
      left:         isRight ? info.px + r + 12 : info.px - r - TOOLTIP_W - 12,
      top:          info.py - 18,
      width:        TOOLTIP_W,
      background:   "rgba(10,8,5,0.97)",
      border:       `1px solid ${info.nodeType === "legendary" ? "#d4a820" : "rgba(130,105,55,0.5)"}`,
      borderRadius: 8,
      padding:      "10px 12px",
      pointerEvents:"none",
      zIndex:       50,
      boxShadow:    "0 4px 20px rgba(0,0,0,0.75)",
    }}>
      <div style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color:
          info.nodeType === "legendary" ? "#d4a820" :
          info.nodeType === "medium"    ? "rgba(210,180,95,0.9)" :
          "rgba(155,135,75,0.7)",
        marginBottom:  6,
        display:       "flex",
        alignItems:    "baseline",
        gap:           6,
      }}>
        {info.nodeType}
        <span style={{ color: "rgba(130,110,65,0.6)", fontSize: 8 }}>
          ({info.current}/{info.maxPoints} pts)
        </span>
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{
          fontSize:     12,
          color:        "rgba(220,205,165,0.92)",
          lineHeight:   1.45,
          marginBottom: i < lines.length - 1 ? 3 : 0,
        }}>
          {line}
        </div>
      ))}
      {info.locked && info.lockMsg && (
        <div style={{
          fontSize:  10,
          color:     "rgba(200,90,80,0.85)",
          marginTop: 8,
          paddingTop:8,
          borderTop: "1px solid rgba(130,105,55,0.3)",
        }}>
          {info.lockMsg}
        </div>
      )}
    </div>
  );
}

interface CoreTooltipInfo {
  name:     string;
  rawAffix: string;
  locked:   boolean;
  reqPts:   number;
  px:       number;
  py:       number;
}

function CoreTooltip({ info }: { info: CoreTooltipInfo }) {
  const TOOLTIP_W = 220;
  const lines     = info.rawAffix.split("\n").filter(Boolean);

  return (
    <div style={{
      position:     "absolute",
      left:         info.px - TOOLTIP_W / 2,
      top:          info.py,
      width:        TOOLTIP_W,
      background:   "rgba(10,8,5,0.97)",
      border:       "1px solid #d4a820",
      borderRadius: 8,
      padding:      "10px 12px",
      pointerEvents:"none",
      zIndex:       50,
      boxShadow:    "0 4px 20px rgba(0,0,0,0.75)",
    }}>
      <div style={{
        fontSize:      11,
        fontWeight:    700,
        color:         "#d4a820",
        marginBottom:  6,
      }}>
        {info.name}
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{
          fontSize:     12,
          color:        "rgba(220,205,165,0.92)",
          lineHeight:   1.45,
          marginBottom: i < lines.length - 1 ? 3 : 0,
        }}>
          {line}
        </div>
      ))}
      {info.locked && (
        <div style={{
          fontSize:  10,
          color:     "rgba(200,90,80,0.85)",
          marginTop: 8,
          paddingTop:8,
          borderTop: "1px solid rgba(130,105,55,0.3)",
        }}>
          Requires {info.reqPts} points allocated in this tree
        </div>
      )}
    </div>
  );
}

// ── Tree action buttons ────────────────────────────────────────────────────────

function TreeActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#5a5a5c" : "#414142",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`,
        borderRadius: 8,
        padding: "12px 28px",
        minWidth: 118,
        textAlign: "center",
        fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#ffffff",
        cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {label}
    </button>
  );
}

// ── Core row ───────────────────────────────────────────────────────────────────

interface CoreRowProps {
  tier:         1 | 2;
  entries:      CoreTalentData[];
  iconFolder:   string;
  totalPoints:  number;
  selected?:    string;
  onSelect:     (iconName: string | null) => void;
}

function CoreRow({ tier, entries, iconFolder, totalPoints, selected, onSelect }: CoreRowProps) {
  const [hovered, setHovered]         = useState<string | null>(null);
  const [tooltip, setTooltip]         = useState<CoreTooltipInfo | null>(null);
  const unlocked = totalPoints >= CORE_REQ[tier];

  function onEnter(e: React.MouseEvent, entry: CoreTalentData) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = (e.currentTarget as HTMLElement).closest("[data-core-container]")?.getBoundingClientRect();
    const px = parentRect ? rect.left - parentRect.left + rect.width / 2 : 0;
    const py = parentRect ? rect.bottom - parentRect.top + 8 : 0;
    setHovered(entry.iconName);
    setTooltip({ name: entry.name, rawAffix: entry.rawAffix, locked: !unlocked, reqPts: CORE_REQ[tier], px, py });
  }

  function onLeave() {
    setHovered(null);
    setTooltip(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div data-core-container style={{
        position: "relative", display: "flex", gap: 22,
        padding: "14px 18px",
        border: `1.5px solid ${unlocked ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
      }}>
        {!unlocked && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 14, zIndex: 2,
            background: "rgba(40,40,42,0.82)",
            pointerEvents: "none",
          }}>
            <span style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              fontSize: 44, lineHeight: 1, filter: "grayscale(1) brightness(0.3)",
            }}>🔒</span>
            <span style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, 20px)",
              fontSize: 17, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap",
            }}>
              {totalPoints}/{CORE_REQ[tier]}
            </span>
          </div>
        )}
        <div style={{
          position: "absolute", left: -16, bottom: -16, zIndex: 3,
          width: 32, height: 32, borderRadius: "50%",
          background: NODE_BG, border: `2px solid ${NODE_BORDER}`,
          boxShadow: `0 0 0 2px ${unlocked ? NODE_RING : NODE_RING_LOCKED}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#ffffff",
        }}>
          {CORE_REQ[tier]}
        </div>
        {entries.map((entry) => {
          const isSelected = selected === entry.iconName;
          const isHovered  = hovered === entry.iconName;
          const iconSrc    = `/icons/talents/${iconFolder}/${entry.iconName}.webp`;
          // Once a choice has been made for this tier, the unchosen options dim (unless hovered,
          // which previews them at full strength since clicking still swaps the selection).
          const isDimmed   = unlocked && !!selected && !isSelected && !isHovered;

          return (
            <div
              key={entry.iconName}
              onMouseEnter={(e) => onEnter(e, entry)}
              onMouseLeave={onLeave}
              onClick={() => unlocked && onSelect(isSelected ? null : entry.iconName)}
              onContextMenu={(e) => { e.preventDefault(); if (unlocked && isSelected) onSelect(null); }}
              style={{
                width: CORE_R * 2, height: CORE_R * 2, borderRadius: "50%", overflow: "hidden",
                border: `2px solid ${NODE_BORDER}`,
                cursor: unlocked ? "pointer" : "default",
                background: NODE_BG,
                boxShadow: isSelected
                  ? `0 0 0 2px #fbdb58, 0 0 12px rgba(251,219,88,0.6)`
                  : isHovered && unlocked
                  ? `0 0 0 2px ${NODE_RING}, 0 0 12px rgba(255,255,255,0.5)`
                  : `0 0 0 2px ${unlocked && !isDimmed ? NODE_RING : NODE_RING_LOCKED}`,
                transform: isHovered && unlocked ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.12s, background 0.1s, box-shadow 0.1s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <img
                src={iconSrc}
                alt={entry.name}
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                style={{
                  width: "94%", height: "94%", objectFit: "contain",
                  filter: !unlocked || isDimmed ? "grayscale(1) brightness(0.4)" : "none",
                  opacity: !unlocked ? 0.6 : isDimmed ? 0.45 : 1,
                  transition: "filter 0.12s, opacity 0.12s",
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
        {tooltip && <CoreTooltip info={tooltip} />}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  tree:         TalentTreeData;
  iconFolder:   string;
  godColor:     string;
  allocated:    Record<string, number>;
  coreSelected: Partial<Record<1 | 2, string>>;
  onAllocate:   (nodeId: string, delta: 1 | -1) => void;
  onSelectCore: (tier: 1 | 2, iconName: string | null) => void;
  onReselect:   () => void;
  onReset:      () => void;
}

export function TalentTree({ tree, iconFolder, godColor, allocated, coreSelected, onAllocate, onSelectCore, onReselect, onReset }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const W = COLS * CELL_W;
  const H = ROWS * CELL_H + HEADER_H;

  const totalPoints = Object.values(allocated).reduce((a, b) => a + b, 0);

  const core1 = tree.core?.filter((c) => c.tier === 1) ?? [];
  const core2 = tree.core?.filter((c) => c.tier === 2) ?? [];

  // Derived from `hovered` + current props each render (rather than snapshotted at hover time)
  // so the tooltip's point count / lock state stays live while clicking without re-hovering.
  const hoveredNode = hovered ? tree.nodes.find((n) => posId(n.position) === hovered) : undefined;
  let tooltipInfo: TooltipInfo | null = null;
  if (hoveredNode) {
    const id      = posId(hoveredNode.position);
    const pos     = gridPx(hoveredNode.position.x, hoveredNode.position.y);
    const current = allocated[id] ?? 0;
    const colLocked = pointsBeforeColumn(tree, allocated, hoveredNode.position.x) < colRequirement(hoveredNode.position.x);
    const preOk     = prerequisiteSatisfied(tree, hoveredNode, allocated);
    const locked    = current === 0 && (colLocked || !preOk);
    const lockMsg   = colLocked
      ? `Requires ${colRequirement(hoveredNode.position.x)} points allocated in this tree`
      : !preOk ? "Requires prerequisite node fully unlocked" : undefined;

    tooltipInfo = {
      nodeType: hoveredNode.nodeType, rawAffix: hoveredNode.rawAffix,
      current, maxPoints: hoveredNode.maxPoints,
      locked, lockMsg,
      px: pos.x, py: pos.y,
    };
  }

  function onEnter(node: TalentNodeData) {
    setHovered(posId(node.position));
  }

  function onLeave() {
    setHovered(null);
  }

  function handleLeftClick(node: TalentNodeData) {
    if (canAllocate(tree, node, allocated)) {
      onAllocate(posId(node.position), 1);
    }
  }

  function handleRightClick(e: React.MouseEvent, node: TalentNodeData) {
    e.preventDefault();
    if (canDeallocate(tree, node, allocated, coreSelected)) {
      onAllocate(posId(node.position), -1);
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      userSelect: "none", WebkitUserSelect: "none",
    }}>

      {/* ── Top bar: core tiers (leftmost icon on the 0/3 column boundary), points + actions top-right ─── */}
      <div style={{ position: "relative", width: W, minHeight: 110 }}>
        <div style={{
          position: "absolute", left: CELL_W - CORE_R, top: -10,
          display: "flex", flexDirection: "row", gap: 110,
        }}>
          {core1.length > 0 && (
            <CoreRow
              tier={1} entries={core1} iconFolder={iconFolder}
              totalPoints={totalPoints} selected={coreSelected[1]}
              onSelect={(iconName) => onSelectCore(1, iconName)}
            />
          )}
          {core2.length > 0 && (
            <CoreRow
              tier={2} entries={core2} iconFolder={iconFolder}
              totalPoints={totalPoints} selected={coreSelected[2]}
              onSelect={(iconName) => onSelectCore(2, iconName)}
            />
          )}
        </div>

        <div style={{
          position: "absolute", right: 0, top: 0, width: 480,
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
        }}>
          <div style={{
            fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(180,180,182,0.9)", whiteSpace: "nowrap",
          }}>
            {totalPoints} Talent Point{totalPoints === 1 ? "" : "s"} spent in current panel
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <TreeActionButton label="Reselect" onClick={onReselect} />
            <TreeActionButton label="Reset" onClick={onReset} />
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>

        {/* ── Column header boxes + connector track ────────────────────── */}
        {(() => {
          const BOX = 32;
          let furthestCol = 0;
          COL_PTS.forEach((pts, i) => { if (pointsBeforeColumn(tree, allocated, i) >= pts) furthestCol = i; });

          return (
            <>
              {COL_PTS.slice(0, -1).map((_, i) => {
                const nextUnlocked = pointsBeforeColumn(tree, allocated, i + 1) >= COL_PTS[i + 1];
                const x1 = i * CELL_W + CELL_W / 2 + BOX / 2;
                const x2 = (i + 1) * CELL_W + CELL_W / 2 - BOX / 2;
                return (
                  <div key={i} style={{
                    position:      "absolute",
                    left:          x1,
                    top:           HEADER_H / 2 - 1,
                    width:         Math.max(0, x2 - x1),
                    height:        2,
                    background:    nextUnlocked ? "#ffffff" : "#000000",
                    transition:    "background 0.2s",
                    pointerEvents: "none",
                  }} />
                );
              })}
              {COL_PTS.map((pts, col) => {
                const unlocked  = pointsBeforeColumn(tree, allocated, col) >= pts;
                const isFurthest = col === furthestCol;
                const cx = col * CELL_W + CELL_W / 2;
                return (
                  <div key={col} style={{
                    position:       "absolute",
                    left:           cx - BOX / 2,
                    top:            (HEADER_H - BOX) / 2,
                    width:          BOX,
                    height:         BOX,
                    borderRadius:   7,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     unlocked ? "#ffffff" : NODE_BG,
                    boxShadow:      isFurthest ? "0 0 16px 4px rgba(255,255,255,0.75)" : "none",
                    transition:     "background 0.2s, box-shadow 0.2s",
                    pointerEvents:  "none",
                  }}>
                    <span style={{
                      fontSize:   13,
                      fontWeight: 700,
                      color:      unlocked ? NODE_BG : "#ffffff",
                    }}>
                      {pts}
                    </span>
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* ── SVG edges ──────────────────────────────────────────────── */}
        <svg width={W} height={H}
          style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
          {tree.nodes.map((node) => {
            if (!node.prerequisite) return null;
            const from   = gridPx(node.prerequisite.x, node.prerequisite.y);
            const to     = gridPx(node.position.x,     node.position.y);
            const nodeId = posId(node.position);
            const preId  = posId(node.prerequisite);
            const lit      = hovered === nodeId || hovered === preId;
            const fulfilled = prerequisiteSatisfied(tree, node, allocated);
            return (
              <line key={nodeId}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={fulfilled ? "#ffffff" : "#000000"}
                strokeWidth={lit ? 2.5 : 1.5}
              />
            );
          })}
        </svg>

        {/* ── Nodes ──────────────────────────────────────────────────── */}
        {tree.nodes.map((node) => {
          const id      = posId(node.position);
          const pos     = gridPx(node.position.x, node.position.y);
          const r       = NODE_R;
          const isH     = hovered === id;
          const current = allocated[id] ?? 0;
          const isMaxed = current >= node.maxPoints;
          const colLocked = pointsBeforeColumn(tree, allocated, node.position.x) < colRequirement(node.position.x);
          const preOk     = prerequisiteSatisfied(tree, node, allocated);
          const locked    = current === 0 && (colLocked || !preOk);

          const canAdd    = canAllocate(tree, node, allocated);
          const canRemove = canDeallocate(tree, node, allocated, coreSelected);

          const iconSrc = node.iconName
            ? `/icons/talents/${iconFolder}/${node.iconName}.webp`
            : null;

          return (
            <div
              key={id}
              onMouseEnter={() => onEnter(node)}
              onMouseLeave={onLeave}
              onClick={() => handleLeftClick(node)}
              onContextMenu={(e) => handleRightClick(e, node)}
              style={{
                position:       "absolute",
                left:           pos.x - r,
                top:            pos.y - r,
                width:          r * 2,
                height:         r * 2,
                cursor:         canAdd || (canRemove && !isMaxed) ? "pointer" : "default",
                transform:      isH ? "scale(1.18)" : "scale(1)",
                transformOrigin:"50% 50%",
                transition:     "transform 0.12s",
                zIndex:         isH ? 5 : 1,
              }}
            >
              {/* clipped circle: icon lives here so the badge below isn't cut off by it */}
              <div style={{
                width:          "100%",
                height:         "100%",
                borderRadius:   "50%",
                overflow:       "hidden",
                background:     isMaxed ? "#ffffff" : NODE_BG,
                border:         `2px solid ${NODE_BORDER}`,
                boxShadow:      isH && (canAdd || canRemove)
                  ? `0 0 0 2px ${NODE_RING}, 0 0 12px rgba(255,255,255,0.5)`
                  : `0 0 0 2px ${locked ? NODE_RING_LOCKED : NODE_RING}`,
                transition:     "background 0.1s, box-shadow 0.1s",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}>
                {iconSrc && (
                  <img
                    key={iconSrc}
                    src={iconSrc}
                    alt=""
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    style={{
                      width:        "150%",
                      height:       "150%",
                      objectFit:    "contain",
                      filter:       isMaxed ? "brightness(0)" : locked ? "grayscale(1) brightness(0.4)" : "none",
                      opacity:      locked ? 0.6 : 1,
                      transition:   "filter 0.1s, opacity 0.1s",
                      pointerEvents:"none",
                      display:      "block",
                    }}
                  />
                )}
              </div>
              {/* badge sits outside the clipped circle above, on its own layer */}
              {current > 0 && (
                <span style={{
                  position: "absolute", bottom: -4, right: -6,
                  fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.95)",
                  background: isMaxed ? godColor : "rgba(20,16,10,0.95)",
                  border: `1px solid ${godColor}`,
                  borderRadius: 8, padding: "0 4px", lineHeight: "13px",
                  pointerEvents: "none",
                  zIndex: 4,
                }}>
                  {current}/{node.maxPoints}
                </span>
              )}
            </div>
          );
        })}

        {/* ── Tooltip ────────────────────────────────────────────────── */}
        {tooltipInfo && <NodeTooltip info={tooltipInfo} W={W} />}
      </div>
    </div>
  );
}
