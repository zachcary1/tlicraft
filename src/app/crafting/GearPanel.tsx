"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { Card } from "react-bootstrap";
import { FEIcon } from "./ItemCard";

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

type PoolSummary = {
  id: string;
  name: string;
  attributeType: "STR" | "DEX" | "INT" | null;
  baseItemCategory: { id: string; name: string };
  weaponType: { id: string; name: string } | null;
};

// ─── Slot definitions ─────────────────────────────────────────────────────────

const SLOT_LABELS: Record<GearSlotId, string> = {
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

const LAYOUT: [GearSlotId, GearSlotId][] = [
  ["helmet",    "chest"],
  ["necklace",  "gloves"],
  ["belt",      "boots"],
  ["ring_l",    "ring_r"],
  ["main_hand", "off_hand"],
];

// ─── Icon path helper ─────────────────────────────────────────────────────────

function getPoolIconPath(pool: PoolSummary): string {
  const catId = pool.baseItemCategory.id;
  if (pool.weaponType)
    return `/icons/equipment/${pool.weaponType.name}.webp`;
  if (["ring", "spirit_ring", "necklace", "belt"].includes(catId))
    return `/icons/equipment/${pool.baseItemCategory.name}.webp`;
  const attr = pool.attributeType ?? "STR";
  return `/icons/equipment/${attr} ${pool.baseItemCategory.name}.webp`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMainHandTwoHanded(loadout: GearLoadout, pools: PoolSummary[]): boolean {
  if (!loadout.main_hand) return false;
  const pool = pools.find((p) => p.id === loadout.main_hand);
  return pool?.baseItemCategory.id === "two_hand_weapon";
}

function getAvailablePools(slotId: GearSlotId, pools: PoolSummary[], loadout: GearLoadout): PoolSummary[] {
  if (slotId === "off_hand" && isMainHandTwoHanded(loadout, pools)) return [];
  return pools.filter((p) => SLOT_CATEGORIES[slotId].includes(p.baseItemCategory.id));
}

function isPoolDisabled(slotId: GearSlotId, pool: PoolSummary, loadout: GearLoadout): boolean {
  if (slotId === "main_hand" && loadout.off_hand && pool.baseItemCategory.id === "two_hand_weapon") return true;
  return false;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

type SlotDropdownProps = {
  slotId: GearSlotId;
  pools: PoolSummary[];
  loadout: GearLoadout;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function SlotDropdown({ slotId, pools, loadout, triggerRef, onSelect, onClose }: SlotDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dropDir, setDropDir] = useState<"down" | "up" | "center">("down");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const available = getAvailablePools(slotId, pools, loadout);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

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
  }, [triggerRef]);

  const grouped = available.reduce<Record<string, PoolSummary[]>>((acc, p) => {
    const cat = p.baseItemCategory.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const positionStyle: React.CSSProperties =
    dropDir === "down" ? { top: "100%", marginTop: 8 } :
    dropDir === "up"   ? { bottom: "100%", marginBottom: 8 } :
    { top: "50%", transform: "translate(-50%, -50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };

  return (
    <div
      ref={ref}
      className="position-absolute z-3 start-50 translate-middle-x dropdown-menu show py-1"
      style={{
        minWidth: "12rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--zinc-700)",
        backgroundColor: "var(--zinc-900)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        ...positionStyle,
      }}
    >
      {locked ? (
        <p className="px-3 py-2 text-secondary small fst-italic mb-0">Off-hand locked (two-handed weapon equipped)</p>
      ) : available.length === 0 ? (
        <p className="px-3 py-2 text-secondary small fst-italic mb-0">No items available</p>
      ) : (
        <>
          <button
            className="dropdown-item small"
            style={{ color: "var(--zinc-400)" }}
            onClick={() => onSelect("")}
          >
            — empty —
          </button>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p
                className="px-3 pt-2 pb-1 mb-0 small fw-semibold text-uppercase"
                style={{ color: "var(--zinc-500)", letterSpacing: "0.1em" }}
              >
                {cat}
              </p>
              {items.map((p) => {
                const disabled = isPoolDisabled(slotId, p, loadout);
                return (
                  <button
                    key={p.id}
                    disabled={disabled}
                    className="dropdown-item small"
                    style={{
                      color: disabled
                        ? "var(--zinc-600)"
                        : loadout[slotId] === p.id
                        ? "#f59e0b"
                        : "var(--zinc-100)",
                      cursor: disabled ? "not-allowed" : undefined,
                    }}
                    onClick={disabled ? undefined : () => onSelect(p.id)}
                  >
                    {p.name}
                    {p.attributeType && (
                      <span className="ms-1" style={{ color: "var(--zinc-600)" }}>
                        ({p.attributeType})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Slot tile ────────────────────────────────────────────────────────────────

type SlotTileProps = {
  slotId: GearSlotId;
  pools: PoolSummary[];
  loadout: GearLoadout;
  psCount: number;
  isOpen: boolean;
  isFocused: boolean;
  craftTotal: number | null;
  corrosionTotal: number | null;
  costSide: "left" | "right";
  onOpen: () => void;
  onFocus: () => void;
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function getPSRarityColors(count: number): { border: string; borderHover: string; gradientEnd: string } {
  if (count === 0) return { border: "#71717a", borderHover: "#a1a1aa", gradientEnd: "#3f3f46" };
  if (count <= 4)  return { border: "#38bdf8", borderHover: "#7dd3fc", gradientEnd: "#0c4a6e" };
  if (count === 5) return { border: "#c084fc", borderHover: "#d8b4fe", gradientEnd: "#6b21a8" };
  return                  { border: "#f472b6", borderHover: "#f9a8d4", gradientEnd: "#9d174d" };
}

function SlotTile({ slotId, pools, loadout, psCount, isOpen, isFocused, craftTotal, corrosionTotal, costSide, onOpen, onFocus, onSelect, onClose }: SlotTileProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const selectedPool = pools.find((p) => p.id === loadout[slotId]);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

  function handleClick() {
    if (locked) return;
    if (selectedPool) onFocus();
    else onOpen();
  }

  const { border: rarityBorder, borderHover: rarityBorderHover, gradientEnd } = getPSRarityColors(psCount);

  const isActive = !locked && (isOpen || (isFocused && selectedPool));
  const border = locked
    ? "2px solid #27272a"
    : isActive
    ? "2px solid #f59e0b"
    : selectedPool
    ? `2px solid ${isHovered ? rarityBorderHover : rarityBorder}`
    : `2px solid ${isHovered ? "#52525b" : "#3f3f46"}`;

  const glow = isActive ? "0 0 12px #f59e0b55" : "none";

  const bg = selectedPool
    ? `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)`
    : "#0a0a0a";

  return (
    <div
      className="d-flex flex-column align-items-center"
      style={{ gap: "2px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className="small text-uppercase fw-medium"
        style={{
          color: isHovered && !locked ? "var(--zinc-300)" : "var(--zinc-600)",
          letterSpacing: "0.05em",
          transition: "color 0.15s",
        }}
      >
        {SLOT_LABELS[slotId]}
      </span>

      <div className="position-relative">
        <button
          ref={triggerRef}
          onClick={handleClick}
          disabled={locked}
          className="d-flex align-items-center justify-content-center position-relative overflow-hidden p-0 border-0"
          style={{
            width: 144, height: 144,
            borderRadius: "0.5rem",
            border, background: bg, boxShadow: glow,
            opacity: locked ? 0.35 : 1,
            transition: "border 0.15s, box-shadow 0.15s",
          }}
        >
          {selectedPool ? (
            <img
              src={getPoolIconPath(selectedPool)}
              alt={selectedPool.name}
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 4, background: "#0a0a0a", border: "1px solid #3f3f46" }} />
          )}
        </button>

        {selectedPool && !locked && (
          <button
            title="Change item"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="position-absolute p-1 border-0 rounded"
            style={{
              top: 8, right: 8,
              background: "transparent",
              color: "var(--zinc-400)",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--zinc-100)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--zinc-400)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}

        {isOpen && (
          <SlotDropdown
            slotId={slotId}
            pools={pools}
            loadout={loadout}
            triggerRef={triggerRef}
            onSelect={(id) => { onSelect(id); onClose(); }}
            onClose={onClose}
          />
        )}

        {selectedPool && (
          <span
            className="position-absolute fw-bold text-center"
            style={{
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 2,
              fontSize: "1rem",
              color: "var(--zinc-100)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              maxWidth: 180,
              pointerEvents: "none",
            }}
          >
            {selectedPool.name.replace(/\s*armor\b/gi, "").trim()}
          </span>
        )}

        {(craftTotal !== null || corrosionTotal !== null) && (
          <div
            className="position-absolute top-0 d-flex flex-column"
            style={{
              gap: 6,
              pointerEvents: "none",
              ...(costSide === "right"
                ? { left: "100%", marginLeft: 12, alignItems: "flex-start" }
                : { right: "100%", marginRight: 12, alignItems: "flex-end" }),
            }}
          >
            {craftTotal !== null && (
              <div className="d-flex flex-column" style={{ alignItems: costSide === "right" ? "flex-start" : "flex-end" }}>
                <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em", marginBottom: 2 }}>Craft</span>
                <span className="fw-bold d-flex align-items-center" style={{ fontSize: "1.5rem", gap: 6, color: Number.isNaN(craftTotal) ? "#f87171" : "#fff" }}>
                  {Number.isNaN(craftTotal) ? "NaN" : Math.round(craftTotal).toLocaleString("en-US")}
                  {!Number.isNaN(craftTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
            {corrosionTotal !== null && (
              <div className="d-flex flex-column" style={{ alignItems: costSide === "right" ? "flex-start" : "flex-end" }}>
                <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em", marginBottom: 2 }}>+Corrosion</span>
                <span className="fw-bold d-flex align-items-center" style={{ fontSize: "1.5rem", gap: 6, color: Number.isNaN(corrosionTotal) ? "#f87171" : "var(--zinc-300)" }}>
                  {Number.isNaN(corrosionTotal) ? "NaN" : Math.round(corrosionTotal).toLocaleString("en-US")}
                  {!Number.isNaN(corrosionTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GearPanel ────────────────────────────────────────────────────────────────

type GearPanelProps = {
  pools: PoolSummary[];
  loadout: GearLoadout;
  activeSlotId: GearSlotId | null;
  focusedSlotId: GearSlotId | null;
  psCounts: Partial<Record<GearSlotId, number>>;
  costTotals: Partial<Record<GearSlotId, { craft: number | null; corrosion: number | null }>>;
  dreamCount: number;
  onSlotOpen: (id: GearSlotId) => void;
  onSlotFocus: (id: GearSlotId) => void;
  onSlotClose: () => void;
  onSelect: (slotId: GearSlotId, poolId: string) => void;
};

export default function GearPanel({ pools, loadout, activeSlotId, focusedSlotId, psCounts, costTotals, dreamCount, onSlotOpen, onSlotFocus, onSlotClose, onSelect }: GearPanelProps) {
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
    if (c.craft === null && c.corrosion === null) return null;
    const craft = c.craft ?? 0;
    const corr = c.corrosion ?? 0;
    return craft + corr;
  }).filter((v) => v !== null) as number[];
  const totalWithCorrosion: number | null = (!anyCorrosion || withCorrValues.length === 0) ? null
    : withCorrValues.some(Number.isNaN) ? NaN
    : withCorrValues.reduce((a, b) => a + b, 0);

  return (
    <Card
      className="w-100"
      style={{
        maxWidth: "48rem",
        backgroundColor: "var(--zinc-900)",
        borderColor: "var(--zinc-700)",
      }}
    >
      <Card.Body className="px-4 pt-4 pb-5">
        <div className="d-flex justify-content-between align-items-start px-3">
          {/* Left column — costs on right */}
          <div className="d-flex flex-column" style={{ gap: 32 }}>
            {LAYOUT.map(([left]) => (
              <SlotTile key={left} slotId={left} pools={pools} loadout={loadout} psCount={psCounts[left] ?? 0} isOpen={activeSlotId === left} isFocused={focusedSlotId === left} craftTotal={costTotals[left]?.craft ?? null} corrosionTotal={costTotals[left]?.corrosion ?? null} costSide="right" onOpen={() => onSlotOpen(left)} onFocus={() => onSlotFocus(left)} onSelect={(id) => onSelect(left, id)} onClose={onSlotClose} />
            ))}
          </div>
          {/* Right column — costs on left */}
          <div className="d-flex flex-column" style={{ gap: 32 }}>
            {LAYOUT.map(([, right]) => (
              <SlotTile key={right} slotId={right} pools={pools} loadout={loadout} psCount={psCounts[right] ?? 0} isOpen={activeSlotId === right} isFocused={focusedSlotId === right} craftTotal={costTotals[right]?.craft ?? null} corrosionTotal={costTotals[right]?.corrosion ?? null} costSide="left" onOpen={() => onSlotOpen(right)} onFocus={() => onSlotFocus(right)} onSelect={(id) => onSelect(right, id)} onClose={onSlotClose} />
            ))}
          </div>
        </div>

        {/* Dream affix counter */}
        <div className="d-flex justify-content-center mt-5">
          <div className="d-flex flex-column align-items-center" style={{ gap: 2 }}>
            <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em" }}>Dream Affixes</span>
            <span className="fw-bold" style={{ fontSize: "1.5rem", color: dreamCount >= 3 ? "#48b8ff" : "var(--zinc-400)" }}>
              {dreamCount}<span style={{ color: "var(--zinc-600)" }}>/3</span>
            </span>
          </div>
        </div>

        {/* Total costs footer */}
        {(totalCraft !== null || totalWithCorrosion !== null) && (
          <div
            className="mt-4 pt-4 d-flex justify-content-around align-items-start"
            style={{ borderTop: "1px solid var(--zinc-700)" }}
          >
            {totalCraft !== null && (
              <div className="d-flex flex-column align-items-center" style={{ gap: 2 }}>
                <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em" }}>Total Craft</span>
                <span className="fw-bold d-flex align-items-center" style={{ fontSize: "1.5rem", gap: 6, color: Number.isNaN(totalCraft) ? "#f87171" : "#fff" }}>
                  {Number.isNaN(totalCraft) ? "NaN" : Math.round(totalCraft).toLocaleString("en-US")}
                  {!Number.isNaN(totalCraft) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
            {totalWithCorrosion !== null && (
              <div className="d-flex flex-column align-items-center" style={{ gap: 2 }}>
                <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em" }}>Total with Corrosion</span>
                <span className="fw-bold d-flex align-items-center" style={{ fontSize: "1.5rem", gap: 6, color: Number.isNaN(totalWithCorrosion) ? "#f87171" : "var(--zinc-300)" }}>
                  {Number.isNaN(totalWithCorrosion) ? "NaN" : Math.round(totalWithCorrosion).toLocaleString("en-US")}
                  {!Number.isNaN(totalWithCorrosion) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
