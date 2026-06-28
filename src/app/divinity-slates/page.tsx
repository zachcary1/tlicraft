"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import SlatesPanel from "./SlatesPanel";
import AffixPanel from "./AffixPanel";
import ItemCard from "./ItemCard";
import {
  SLATE_DEFS,
  EMPTY_SLATE_CONFIG,
  GRID_ROWS,
  GRID_COLS,
  GRID_REMOVED,
  getAllSlots,
  getSlateDisplayName,
  getShapeCells,
  getSlateQuality,
  getInstanceIconPath,
  getIconTransform,
  isValidPlacement,
  isInstanceValid,
  cellKey,
  parseTalentEffectLines,
  TALENT_TYPE_TIER_COLOR,
  COPY_AFFIX_TIER_COLOR,
  type SlateDef,
  type QualityConfig,
  type SlateConfig,
  type Talent,
  type TalentType,
  type PlacedInstance,
} from "./slateData";

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const slot = 100;
const gap  = 0;
const step = slot + gap;
const pad  = 12;
// Visible diamond dimensions — unchanged, and what the side panels position themselves
// relative to, so the extra border below doesn't shift anything on screen.
const svgW = pad + GRID_COLS * slot + (GRID_COLS - 1) * gap + pad;
const svgH = pad + GRID_ROWS * slot + (GRID_ROWS - 1) * gap + pad;

// The board is rendered 1 extra (invisible) tile wider on every side than the playable
// diamond, so a shape can be anchored with part of it hanging just off the edge — letting
// pieces be tucked snugly into a corner that would otherwise need an anchor cell that doesn't
// exist. Anything occupying the border (or the original corner cutouts) is still flagged
// incompatible by isValidPlacement/isInstanceValid; this purely widens what's clickable.
const EXT = 1;
const boardSvgW = svgW + 2 * EXT * step;
const boardSvgH = svgH + 2 * EXT * step;

// Builds the closed SVG path string for the perimeter outline of a slate's cell group.
// d = gap/2 ensures every segment endpoint coincides exactly with its neighbor at every
// corner type (convex, concave, collinear) — no bridges or diagonal closes needed.
// The stroke is made wide enough that its inner edge sits close to the cell boundary.
const OUTLINE_D = gap / 2; // must equal gap/2 for endpoint coincidence at all corner types
type Seg = { x1: number; y1: number; x2: number; y2: number };

function buildSlateOutlinePath(cells: { r: number; c: number }[], anchor: { row: number; col: number }): string {
  const inSet = new Set(cells.map(({ r, c }) => `${r},${c}`));
  const has = (r: number, c: number) => inSet.has(`${r},${c}`);
  const d = OUTLINE_D;
  const segs: Seg[] = [];

  for (const { r, c } of cells) {
    const x = pad + (anchor.col + c + EXT) * step;
    const y = pad + (anchor.row + r + EXT) * step;
    if (!has(r - 1, c)) segs.push({ x1: x - d, y1: y - d, x2: x + slot + d, y2: y - d });
    if (!has(r, c + 1)) segs.push({ x1: x + slot + d, y1: y - d, x2: x + slot + d, y2: y + slot + d });
    if (!has(r + 1, c)) segs.push({ x1: x - d, y1: y + slot + d, x2: x + slot + d, y2: y + slot + d });
    if (!has(r, c - 1)) segs.push({ x1: x - d, y1: y - d, x2: x - d, y2: y + slot + d });
  }

  // Chain segments into a closed path by walking the endpoint adjacency graph.
  // With d=gap/2 every endpoint coincides with its neighbor, so this always produces
  // a single continuous closed polygon with no gaps or diagonal shortcuts.
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
      const next = (adj.get(cur) ?? []).find(i => !used.has(i));
      if (next === undefined) break;
      used.add(next);
      const s = segs[next];
      const [nx, ny] = ptk(s.x1, s.y1) === cur ? [s.x2, s.y2] : [s.x1, s.y1];
      pts.push(`${nx} ${ny}`);
      cur = ptk(nx, ny);
    }
    subpaths.push(`M ${pts.join(' L ')} Z`);
  }
  return subpaths.join(' ');
}

// ─── Slate tooltip card ───────────────────────────────────────────────────────

const TT_CARD_W  = 280;
const TT_ICON_W  = 80;
const TT_ICON_H  = 80;

function SlateTooltipCard({
  def, config, displayName, quality, iconPath, talents, hasConflict, cx: cursorX, cy: cursorY,
}: {
  def: SlateDef;
  config: SlateConfig;
  displayName: string;
  quality: QualityConfig;
  iconPath: string;
  talents: Talent[];
  hasConflict: boolean;
  cx: number;
  cy: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(300);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  const vpW    = window.innerWidth;
  const vpH    = window.innerHeight;
  const GAP    = 16;
  const left   = cursorX + GAP + TT_CARD_W <= vpW ? cursorX + GAP : cursorX - GAP - TT_CARD_W;
  const top    = Math.max(TT_ICON_H / 2 + 8, Math.min(vpH - cardH - 8, cursorY - 24));

  const slots  = getAllSlots(def);

  return createPortal(
    <div ref={cardRef} style={{
      position: "fixed", left, top,
      width: TT_CARD_W, pointerEvents: "none", zIndex: 9999,
      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.85))",
      overflow: "visible",
    }}>
      {/* Icon protrudes above the card */}
      <div style={{
        position: "absolute", top: -(TT_ICON_H / 2), left: "50%",
        transform: "translateX(-50%)", width: TT_ICON_W, height: TT_ICON_H, zIndex: 10,
      }}>
        <div style={{
          position: "absolute", top: 4, left: 0,
          width: TT_ICON_W, height: TT_ICON_H,
          background: quality.border, borderRadius: "0 12px 0 12px", zIndex: 0,
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: TT_ICON_W, height: TT_ICON_H,
          background: quality.bg, borderRadius: "0 12px 0 12px",
          overflow: "hidden", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {!imgErr ? (
            <img src={iconPath} alt={displayName} onError={() => setImgErr(true)}
              style={{ width: "90%", height: "90%", objectFit: "contain",
                       transform: getIconTransform(def, config) }} />
          ) : (
            <span style={{ color: "#666", fontSize: 22, fontWeight: 700 }}>?</span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ overflow: "hidden", borderRadius: "0 12px 0 12px" }}>

        {/* Header */}
        <div style={{
          background: "#1c1c1e", position: "relative",
          padding: `${TT_ICON_H / 2 + 12}px 12px 12px`, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(to bottom, ${quality.border}22, transparent)`,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "relative", zIndex: 1, textAlign: "center",
            color: "#ffffff", fontSize: 14, fontWeight: 700, lineHeight: 1.3,
          }}>
            {displayName}
          </div>
          {hasConflict && (
            <div style={{ textAlign: "center", color: "#f87171", fontSize: 11, marginTop: 5 }}>
              ⚠ Doesn&apos;t fit
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#2a2a2a" }} />

        {/* Talent slots */}
        <div style={{ background: "#242325", padding: "10px 14px 12px" }}>
          {slots.map((slot) => {
            const talentId  = config.slots[slot.key];
            const talent    = talentId ? talents.find((t) => t.id === talentId) : null;
            const label     = talent
              ? (talent.name || parseTalentEffectLines(talent.effect)[0] || "—")
              : null;
            const dotColor  = talent
              ? slot.kind === "choice"
                ? COPY_AFFIX_TIER_COLOR
                : TALENT_TYPE_TIER_COLOR[talent.type as TalentType]
              : "#3a3a3a";
            return (
              <div key={slot.key} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: 1, flexShrink: 0, marginTop: 4,
                  background: dotColor,
                }} />
                <span style={{ color: talent ? "#e4e4e7" : "#52525b", fontSize: 12, lineHeight: 1.45 }}>
                  {label ?? "Empty affix"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ height: 1, background: "#2a2a2a" }} />
        <div style={{ background: "#1c1c1e", padding: "7px 14px 9px", textAlign: "center" }}>
          <span style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Click to edit
          </span>
        </div>

      </div>
    </div>,
    document.body
  );
}

const PANEL_W = 560;
const PANEL_GAP = 50;

export default function DivinitySlatesPage() {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [talents, setTalents] = useState<Talent[]>([]);

  const [placedInstances, setPlacedInstances] = useState<PlacedInstance[]>([]);
  const [draft, setDraft] = useState<{ slateName: string; config: SlateConfig } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  // Press-and-drag state for repositioning a placed instance directly on the board. Set on
  // mousedown over an occupied cell; promoted into the existing `placing` flow once the
  // cursor actually moves to a different cell (so a plain click still just opens the card).
  const [dragCandidate, setDragCandidate] = useState<{
    instanceId: string;
    grabOffset: { dr: number; dc: number };
    startCell: { row: number; col: number };
  } | null>(null);
  const hoverCellRef = useRef(hoverCell);
  useEffect(() => { hoverCellRef.current = hoverCell; }, [hoverCell]);
  const placingRef = useRef(placing);
  useEffect(() => { placingRef.current = placing; }, [placing]);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    fetch("/api/talents").then((r) => r.json()).then(setTalents).catch(console.error);
  }, []);

  const editingInstance = editingId ? placedInstances.find((i) => i.id === editingId) ?? null : null;
  const activeSlateName = draft?.slateName ?? editingInstance?.slateName ?? null;
  const activeDef = activeSlateName ? SLATE_DEFS[activeSlateName] : null;
  const activeConfig = draft?.config ?? editingInstance?.config ?? null;
  const overlayOpen = (!!draft || !!editingInstance) && !placing;
  const mode: "draft" | "placed" = editingInstance ? "placed" : "draft";

  // Clear hover state when the overlay opens or placing starts — the hover groups unmount at
  // that point so onMouseLeave never fires, leaving the tooltip/glow stuck on screen.
  useEffect(() => {
    if (overlayOpen || placing) {
      setHoveredInstanceId(null);
      setTooltipPos(null);
    }
  }, [overlayOpen, placing]);

  const activeSlot = activeDef && activeSlotKey
    ? getAllSlots(activeDef).find((s) => s.key === activeSlotKey) ?? null
    : null;

  const takenIds = new Set(
    activeConfig
      ? Object.entries(activeConfig.slots)
          .filter(([key, value]) => key !== activeSlotKey && !!value)
          .map(([, value]) => value as string)
      : [],
  );

  // Cell key -> instance ids occupying it. Placement is never blocked, so a cell can end up
  // with more than one occupant (an overlap) — that's flagged as a conflict, not prevented.
  const cellOccupants = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const inst of placedInstances) {
      const def = SLATE_DEFS[inst.slateName];
      for (const { r, c } of getShapeCells(def, inst.config)) {
        const row = inst.anchor.row + r;
        const col = inst.anchor.col + c;
        // Still render (as a conflict) anywhere within the invisible border; only truly
        // beyond that has nowhere to draw.
        if (row < -EXT || row >= GRID_ROWS + EXT || col < -EXT || col >= GRID_COLS + EXT) continue;
        const key = cellKey(row, col);
        const existing = map.get(key);
        if (existing) existing.push(inst.id); else map.set(key, [inst.id]);
      }
    }
    return map;
  }, [placedInstances]);

  // Instances that don't fully fit — hanging off the board and/or overlapping another instance.
  const invalidInstanceIds = useMemo(() => {
    const set = new Set<string>();
    for (const inst of placedInstances) if (!isInstanceValid(inst, placedInstances)) set.add(inst.id);
    return set;
  }, [placedInstances]);

  const placedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of placedInstances) counts[inst.slateName] = (counts[inst.slateName] ?? 0) + 1;
    return counts;
  }, [placedInstances]);

  // While placing — either a new draft or moving an already-placed instance — the footprint
  // anchored at the hovered cell. When dragging, `grabOffset` keeps whichever cell was
  // originally grabbed under the cursor, instead of always snapping the shape's (0,0) cell
  // there. A move excludes the instance's own current cells from the green/red check so it
  // can hover back over (or near) its own position. Red is just a warning, not a block.
  const hoverFootprint = useMemo(() => {
    if ((!placing && !draft) || !hoverCell) return null;
    const slateName = draft?.slateName ?? editingInstance?.slateName;
    const config = draft?.config ?? editingInstance?.config;
    if (!slateName || !config) return null;
    const def = SLATE_DEFS[slateName];
    const cells = getShapeCells(def, config);
    const grabOffset = dragCandidate?.grabOffset ?? { dr: 0, dc: 0 };
    const anchor = { row: hoverCell.row - grabOffset.dr, col: hoverCell.col - grabOffset.dc };
    const valid = isValidPlacement(anchor, cells, cellOccupants, editingInstance?.id);
    const keys = new Set(cells.map(({ r, c }) => cellKey(anchor.row + r, anchor.col + c)));
    return { keys, valid };
  }, [placing, draft, editingInstance, hoverCell, cellOccupants, dragCandidate]);

  function updateActiveConfig(patch: Partial<SlateConfig>) {
    if (editingId) {
      setPlacedInstances((prev) => prev.map((inst) => (inst.id === editingId ? { ...inst, config: { ...inst.config, ...patch } } : inst)));
    } else if (draft) {
      setDraft((prev) => (prev ? { ...prev, config: { ...prev.config, ...patch } } : prev));
    }
  }

  function handleAffixSelect(value: string) {
    if (!activeSlotKey || !activeConfig) return;
    updateActiveConfig({ slots: { ...activeConfig.slots, [activeSlotKey]: value } });
  }

  function handleAffixClear() {
    if (!activeSlotKey || !activeConfig) return;
    updateActiveConfig({ slots: { ...activeConfig.slots, [activeSlotKey]: null } });
  }

  function handleSelectSlate(name: string) {
    setDraft((prev) => (prev?.slateName === name && !placing ? null : { slateName: name, config: EMPTY_SLATE_CONFIG }));
    setEditingId(null);
    setPlacing(false);
    setActiveSlotKey(null);
  }

  function closeOverlay() {
    setDraft(null);
    setEditingId(null);
    setPlacing(false);
    setActiveSlotKey(null);
  }

  // Deselect the active affix slot when clicking outside any interactive element. For a
  // placed-instance card (mode "placed") there's no dimming backdrop to catch the click (the
  // board stays fully usable while it's open), so this also closes the card itself — same
  // effect, just driven from here instead of a backdrop's onClick.
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("button, input, label, select, textarea, a, [data-affix-panel]")) {
        setActiveSlotKey(null);
        if (overlayOpen && mode === "placed") closeOverlay();
        // Draft mode: close when clicking outside the card and outside the grid SVG.
        // Grid clicks are handled by handleGridCellClick (direct placement), so skip them.
        if (overlayOpen && mode === "draft" && !(target instanceof SVGElement)) closeOverlay();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [overlayOpen, mode]);

  function handleStartPlacing() {
    if (!draft) return;
    setPlacing(true);
    setActiveSlotKey(null);
    setHoverCell(null);
  }

  function handleCancelPlacing() {
    setPlacing(false);
    setHoverCell(null);
  }

  function handleRemoveInstance() {
    if (!editingId) return;
    setPlacedInstances((prev) => prev.filter((i) => i.id !== editingId));
    closeOverlay();
  }

  // Press-and-drag: grab whichever instance occupies the cell the mouse went down on, but
  // don't act yet — a plain click (no movement) should still just open the card.
  function handleCellMouseDown(row: number, col: number) {
    if (placing || draft) return;
    const occupants = cellOccupants.get(cellKey(row, col));
    if (!occupants || occupants.length === 0) return;
    const instance = placedInstances.find((i) => i.id === occupants[occupants.length - 1]);
    if (!instance) return;
    setDragCandidate({
      instanceId: instance.id,
      grabOffset: { dr: row - instance.anchor.row, dc: col - instance.anchor.col },
      startCell: { row, col },
    });
  }

  // While a drag candidate exists, watch for the cursor actually leaving its starting cell
  // (promoting to the existing `placing` flow so the green/red footprint preview kicks in)
  // and for mouseup anywhere (committing the move, or — if it never left the starting cell —
  // treating it as a plain click).
  useEffect(() => {
    if (!dragCandidate) return;
    const candidate = dragCandidate;

    function handleMouseMove() {
      const hc = hoverCellRef.current;
      if (!placingRef.current && hc && (hc.row !== candidate.startCell.row || hc.col !== candidate.startCell.col)) {
        setEditingId(candidate.instanceId);
        setDraft(null);
        setPlacing(true);
        setActiveSlotKey(null);
      }
    }

    function handleMouseUp() {
      if (placingRef.current) {
        const hc = hoverCellRef.current;
        if (hc) {
          const anchor = { row: hc.row - candidate.grabOffset.dr, col: hc.col - candidate.grabOffset.dc };
          setPlacedInstances((prev) => prev.map((inst) => (inst.id === candidate.instanceId ? { ...inst, anchor } : inst)));
        }
        setPlacing(false);
        setHoverCell(null);
        setEditingId(null); // a direct drag drops the slate and is done — don't reopen the card
        suppressClickRef.current = true; // the upcoming native click landed mid-drag, ignore it
        setTimeout(() => { suppressClickRef.current = false; }, 0); // auto-clear if click landed off-grid
      } else {
        setEditingId(candidate.instanceId);
        setDraft(null);
        setActiveSlotKey(null);
      }
      setDragCandidate(null);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragCandidate]);

  function handleGridCellClick(row: number, col: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (placing || draft) {
      const slateName = draft?.slateName ?? editingInstance?.slateName;
      const config = draft?.config ?? editingInstance?.config;
      if (!slateName || !config) return;
      const grabOffset = dragCandidate?.grabOffset ?? { dr: 0, dc: 0 };
      const anchor = { row: row - grabOffset.dr, col: col - grabOffset.dc };

      // Placement is never blocked — an overlapping or off-board spot is still allowed, just
      // flagged afterward (see invalidInstanceIds / the ItemCard's conflict warning).
      if (editingInstance) {
        // Moving an already-placed instance — keep editing it at its new spot.
        setPlacedInstances((prev) => prev.map((inst) => (inst.id === editingInstance.id ? { ...inst, anchor } : inst)));
      } else if (draft) {
        const newInstance: PlacedInstance = { id: crypto.randomUUID(), slateName: draft.slateName, anchor, config: draft.config };
        setPlacedInstances((prev) => [...prev, newInstance]);
        setDraft(null);
      }
      setPlacing(false);
      setHoverCell(null);
      return;
    }
    const occupants = cellOccupants.get(cellKey(row, col));
    if (occupants && occupants.length > 0) {
      setEditingId(occupants[occupants.length - 1]);
      setDraft(null);
      setPlacing(false);
      setActiveSlotKey(null);
    }
  }

  return (
    <div className="min-h-screen relative" style={BG_STYLE}>

      {/* Grid — exactly centered. Only dimmed for a draft (centered) card — a placed-instance
          card sits over the left panel instead, and the board stays fully visible/usable. */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-200"
        style={{ filter: overlayOpen && mode === "draft" ? "brightness(0.35)" : "none" }}
      >
        <div style={{ position: "relative", width: boardSvgW, height: boardSvgH }}>
          <svg width={boardSvgW} height={boardSvgH} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "auto", filter: "drop-shadow(0 6px 32px rgba(0,0,0,0.8))" }}>
            {Array.from({ length: GRID_ROWS + 2 * EXT }, (_, ri) => ri - EXT).map((r) =>
              Array.from({ length: GRID_COLS + 2 * EXT }, (_, ci) => ci - EXT).map((c) => {
                const key = cellKey(r, c);
                const isBorder = r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS;
                const isHidden = isBorder || GRID_REMOVED.has(key); // invisible by default; still fully interactive
                const x = pad + (c + EXT) * step;
                const y = pad + (r + EXT) * step;

                const occupants = cellOccupants.get(key) ?? [];
                const hasConflict = occupants.length > 1 || occupants.some((id) => invalidInstanceIds.has(id));
                const topOccupant = occupants.length > 0 ? placedInstances.find((i) => i.id === occupants[occupants.length - 1]) : null;
                const occupantQuality = topOccupant ? getSlateQuality(SLATE_DEFS[topOccupant.slateName]) : null;
                const inFootprint = hoverFootprint?.keys.has(key) ?? false;
                const isHovered = !placing && hoverCell?.row === r && hoverCell?.col === c;

                let fill = isHidden ? "transparent" : "#2b2929";
                let stroke = isHidden ? "transparent" : "#3a3a3a";
                if (occupantQuality) {
                  fill = occupantQuality.indicatorActiveInner;
                  stroke = occupantQuality.indicatorActiveInner;
                }
                if (hasConflict) {
                  fill = "#7f1d1d";
                  stroke = "#ef4444";
                }
                if (inFootprint) {
                  fill = hoverFootprint!.valid ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)";
                  stroke = hoverFootprint!.valid ? "#22c55e" : "#ef4444";
                } else if (isHovered && occupants.length === 0 && !isHidden) {
                  fill = "#3d3c3c";
                  stroke = "#535357";
                }

                const cursor = (placing || draft) ? "pointer" : occupants.length > 0 ? "grab" : "default";

                return (
                  <rect
                    key={key}
                    x={x} y={y}
                    width={slot} height={slot}
                    rx="0"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    style={{ transition: "fill 0.1s, stroke 0.1s", cursor }}
                    onMouseEnter={() => setHoverCell({ row: r, col: c })}
                    onMouseLeave={() => setHoverCell(null)}
                    onMouseDown={(e) => { e.preventDefault(); handleCellMouseDown(r, c); }}
                    onClick={() => handleGridCellClick(r, c)}
                  />
                );
              })
            )}

            {/* Per-instance hover groups — transparent rects on top of the cell rects so
                mouseenter/mouseleave fire at the slate level without flickering between cells. */}
            {!overlayOpen && !placing && placedInstances.map((inst) => {
              const def = SLATE_DEFS[inst.slateName];
              const cells = getShapeCells(def, inst.config);
              return (
                <g
                  key={`hg-${inst.id}`}
                  onMouseEnter={(e) => { setHoveredInstanceId(inst.id); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => { setHoveredInstanceId(null); setTooltipPos(null); }}
                  style={{ cursor: "pointer" }}
                >
                  {cells.map(({ r, c }) => {
                    const cr = inst.anchor.row + r;
                    const cc = inst.anchor.col + c;
                    const x = pad + (cc + EXT) * step;
                    const y = pad + (cr + EXT) * step;
                    return (
                      <rect
                        key={`${r},${c}`}
                        x={x} y={y}
                        width={slot} height={slot}
                        fill="transparent"
                        style={{ pointerEvents: "all" }}
                        onMouseEnter={() => setHoverCell({ row: cr, col: cc })}
                        onMouseLeave={() => setHoverCell(null)}
                        onMouseDown={(e) => { e.preventDefault(); handleCellMouseDown(cr, cc); }}
                        onClick={() => handleGridCellClick(cr, cc)}
                      />
                    );
                  })}
                </g>
              );
            })}

          </svg>

          {/* Slate artwork — every shape icon is actually a square 1:1 image (the silhouette
              look comes from transparent padding inside it, not its canvas shape), so rather
              than stretch one image across a non-square multi-cell box (which doesn't line up
              with the art's own proportions), each occupied cell gets its own square tile of
              the same icon — guaranteed to fit, since a square always fits a square slot. */}
          <div style={{ position: "absolute", top: 0, left: 0, width: boardSvgW, height: boardSvgH, pointerEvents: "none" }}>
            {placedInstances.map((inst) => {
              const def = SLATE_DEFS[inst.slateName];
              const iconPath = getInstanceIconPath(def, inst.config);
              const opacity = invalidInstanceIds.has(inst.id) ? 0.55 : 1;
              const isHovered = hoveredInstanceId === inst.id;
              const isSelected = editingId === inst.id;
              return getShapeCells(def, inst.config).map(({ r, c }) => {
                const row = inst.anchor.row + r;
                const col = inst.anchor.col + c;
                if (row < -EXT || row >= GRID_ROWS + EXT || col < -EXT || col >= GRID_COLS + EXT) return null;
                return (
                  <div
                    key={`${inst.id}-${r}-${c}`}
                    style={{
                      position: "absolute",
                      left: pad + (col + EXT) * step,
                      top: pad + (row + EXT) * step,
                      width: slot, height: slot,
                      overflow: "hidden",
                      borderRadius: 0,
                      filter: "none",
                    }}
                  >
                    <img
                      src={iconPath}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", transform: getIconTransform(def, inst.config), opacity }}
                    />
                  </div>
                );
              });
            })}
          </div>

          {/* Slate perimeter outlines — separate top-layer SVG so lines sit above the artwork */}
          <svg width={boardSvgW} height={boardSvgH} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
            {placedInstances.map((inst) => {
              const def = SLATE_DEFS[inst.slateName];
              const cells = getShapeCells(def, inst.config);
              const quality = getSlateQuality(def);
              const isHovered = hoveredInstanceId === inst.id;
              const isSelected = editingId === inst.id;
              const color = invalidInstanceIds.has(inst.id) ? "#ef4444" : quality.border;
              const pathD = buildSlateOutlinePath(cells, inst.anchor);
              if (!pathD) return null;
              return (
                <path
                  key={`outline-${inst.id}`}
                  d={pathD}
                  stroke={isSelected ? "#ffffff" : color}
                  strokeWidth={isSelected ? 5 : isHovered ? 4 : 3}
                  fill="none"
                  style={{
                    filter: isSelected
                      ? `drop-shadow(0 0 6px ${color})`
                      : isHovered ? `drop-shadow(0 0 6px ${color})` : "none",
                    transition: "stroke-width 0.12s",
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Placement mode banner */}
      {placing && (draft || editingInstance) && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-md"
          style={{ background: "#141414", border: "1px solid #3a3a3a", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
        >
          <span className="text-sm text-[#e4e4e7]">
            {editingInstance ? "Moving" : "Placing"} <span className="font-semibold">{getSlateDisplayName(SLATE_DEFS[(draft ?? editingInstance)!.slateName])}</span> — click a highlighted cell
          </span>
          <button
            onClick={handleCancelPlacing}
            className="text-xs px-2.5 py-1 rounded text-[#e4e4e7] cursor-pointer transition-colors"
            style={{ background: "#3a3a3a" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Slates catalog panel — left of the grid. Sits above the overlay backdrop (z-40) so it
          stays clickable (e.g. switching slates) while the ItemCard overlay is open. */}
      <div
        className="absolute z-50"
        style={{ left: `calc(50% - ${svgW / 2}px - ${PANEL_GAP}px - ${PANEL_W}px)`, top: 0, width: PANEL_W, height: "100vh" }}
      >
        <SlatesPanel selected={activeSlateName} counts={placedCounts} onSelect={handleSelectSlate} />
      </div>

      {/* Affix panel — right of the grid, same position the catalog used to occupy. Only
          rendered once an affix slot is actually active; sits above the overlay backdrop so
          its options stay clickable while the ItemCard is open. */}
      {activeSlot && (
        <div
          className="absolute z-50"
          style={{ left: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh" }}
        >
          <AffixPanel
            talents={talents}
            activeSlot={activeSlot}
            selectedValue={activeSlotKey && activeConfig ? activeConfig.slots[activeSlotKey] ?? null : null}
            takenIds={takenIds}
            onSelect={handleAffixSelect}
            onClear={handleAffixClear}
          />
        </div>
      )}

      {/* ItemCard overlay — centered over the dimmed, click-blocked board for a new (draft)
          slate (backdrop click closes it), but over the left catalog panel — with no dimming
          and no blocking backdrop — when editing one that's already placed, so the board stays
          fully visible and usable; the click-outside-closes effect above handles closing it
          instead. The card wrapper sits above the z-50 side panels either way (so it's usable
          even though it now overlaps the catalog panel in "placed" mode), while the draft-mode
          backdrop stays below them (so the panels — e.g. the affix panel — remain clickable
          while the card is open, same as before). */}
      {overlayOpen && activeDef && activeConfig && (
        <>
          {mode === "draft" && (
            <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
          )}
          <div
            className="fixed z-[60] flex items-center justify-center"
            style={{
              left: mode === "placed" ? `calc(50% - ${svgW / 2}px - ${PANEL_GAP}px - ${PANEL_W / 2}px)` : "50%",
              top: 0,
              height: "100vh",
              transform: "translateX(-50%)",
              // In "placed" mode there's no backdrop, so this wrapper's own empty flex space
              // (e.g. above/below a card shorter than 100vh) would otherwise still swallow
              // clicks meant for the board/panels underneath. Let those pass through, and
              // re-enable pointer events just on the card itself below.
              pointerEvents: mode === "placed" ? "none" : undefined,
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <ItemCard
                slateName={getSlateDisplayName(activeDef)}
                def={activeDef}
                config={activeConfig}
                talents={talents}
                activeSlotKey={activeSlotKey}
                onActiveSlotKeyChange={setActiveSlotKey}
                onConfigChange={(config) => updateActiveConfig(config)}
                onClose={closeOverlay}
                mode={mode}
                onPlace={handleStartPlacing}
                onRemove={handleRemoveInstance}
                hasConflict={editingInstance ? invalidInstanceIds.has(editingInstance.id) : false}
              />
            </div>
          </div>
        </>
      )}

      {/* Slate tooltip — follows cursor, rendered via portal above everything */}
      {!overlayOpen && !placing && hoveredInstanceId && tooltipPos && (() => {
        const inst = placedInstances.find((i) => i.id === hoveredInstanceId);
        if (!inst) return null;
        const def     = SLATE_DEFS[inst.slateName];
        const quality = getSlateQuality(def);
        return (
          <SlateTooltipCard
            def={def}
            config={inst.config}
            displayName={getSlateDisplayName(def)}
            quality={quality}
            iconPath={getInstanceIconPath(def, inst.config)}
            talents={talents}
            hasConflict={invalidInstanceIds.has(inst.id)}
            cx={tooltipPos.x}
            cy={tooltipPos.y}
          />
        );
      })()}

    </div>
  );
}
