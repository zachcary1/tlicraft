"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
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

  const positionClass =
    dropDir === "down" ? "top-full mt-2" :
    dropDir === "up"   ? "bottom-full mb-2" :
    "overflow-y-auto";
  const positionStyle: React.CSSProperties | undefined =
    dropDir === "center"
      ? { top: "50%", transform: "translate(-50%, -50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined }
      : undefined;

  return (
    <div
      ref={ref}
      className={`absolute z-50 left-1/2 -translate-x-1/2 min-w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1 ${positionClass}`}
      style={positionStyle}
    >
      {locked ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">Off-hand locked (two-handed weapon equipped)</p>
      ) : available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">No items available</p>
      ) : (
        <>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800" onClick={() => onSelect("")}>
            — empty —
          </button>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 pt-2 pb-0.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">{cat}</p>
              {items.map((p) => {
                const disabled = isPoolDisabled(slotId, p, loadout);
                return (
                  <button
                    key={p.id}
                    disabled={disabled}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      disabled ? "text-zinc-600 cursor-not-allowed"
                      : loadout[slotId] === p.id ? "text-amber-400 hover:bg-zinc-800"
                      : "text-zinc-100 hover:bg-zinc-800"
                    }`}
                    onClick={disabled ? undefined : () => onSelect(p.id)}
                  >
                    {p.name}
                    {p.attributeType && <span className="ml-1 text-zinc-600">({p.attributeType})</span>}
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
      className="flex flex-col items-center gap-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={`text-xs uppercase tracking-wider font-medium transition-colors ${isHovered && !locked ? "text-zinc-300" : "text-zinc-600"}`}>
        {SLOT_LABELS[slotId]}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={handleClick}
          disabled={locked}
          className="w-36 h-36 rounded-lg flex items-center justify-center relative overflow-hidden transition-all"
          style={{ border, background: bg, boxShadow: glow, opacity: locked ? 0.35 : 1 }}
        >
          {selectedPool ? (
            <img
              src={getPoolIconPath(selectedPool)}
              alt={selectedPool.name}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            /* Empty slot placeholder */
            <div
              className="w-16 h-16 rounded"
              style={{
                background: "#0a0a0a",
                border: "1px solid #3f3f46",
              }}
            />
          )}
        </button>

        {selectedPool && !locked && (
          <button
            title="Change item"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="absolute top-2 right-2 rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-black/40 transition-colors"
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
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-base font-bold text-zinc-100 leading-tight text-center w-max max-w-[180px] pointer-events-none">
            {selectedPool.name.replace(/\s*armor\b/gi, "").trim()}
          </span>
        )}

        {(craftTotal !== null || corrosionTotal !== null) && (
          <div className={`absolute top-0 flex flex-col gap-1.5 pointer-events-none ${costSide === "right" ? "left-full ml-3 items-start" : "right-full mr-3 items-end"}`}>
            {craftTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Craft</span>
                <span className={`text-2xl font-bold flex items-center gap-1.5 ${Number.isNaN(craftTotal) ? "text-red-400" : "text-white"}`}>
                  {Number.isNaN(craftTotal) ? "NaN" : Math.round(craftTotal).toLocaleString("en-US")}
                  {!Number.isNaN(craftTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
            {corrosionTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">+Corrosion</span>
                <span className={`text-2xl font-bold flex items-center gap-1.5 ${Number.isNaN(corrosionTotal) ? "text-red-400" : "text-zinc-300"}`}>
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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 pt-6 pb-8 flex flex-col w-full max-w-3xl">
      <div className="flex justify-between w-full items-start px-8">
        {/* Left column — costs on right */}
        <div className="flex flex-col gap-8">
          {LAYOUT.map(([left]) => (
            <SlotTile key={left} slotId={left} pools={pools} loadout={loadout} psCount={psCounts[left] ?? 0} isOpen={activeSlotId === left} isFocused={focusedSlotId === left} craftTotal={costTotals[left]?.craft ?? null} corrosionTotal={costTotals[left]?.corrosion ?? null} costSide="right" onOpen={() => onSlotOpen(left)} onFocus={() => onSlotFocus(left)} onSelect={(id) => onSelect(left, id)} onClose={onSlotClose} />
          ))}
        </div>
        {/* Right column — costs on left */}
        <div className="flex flex-col gap-8">
          {LAYOUT.map(([, right]) => (
            <SlotTile key={right} slotId={right} pools={pools} loadout={loadout} psCount={psCounts[right] ?? 0} isOpen={activeSlotId === right} isFocused={focusedSlotId === right} craftTotal={costTotals[right]?.craft ?? null} corrosionTotal={costTotals[right]?.corrosion ?? null} costSide="left" onOpen={() => onSlotOpen(right)} onFocus={() => onSlotFocus(right)} onSelect={(id) => onSelect(right, id)} onClose={onSlotClose} />
          ))}
        </div>
      </div>

      {/* Dream affix counter */}
      <div className="flex justify-center mt-10">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Dream Affixes</span>
          <span className={`text-2xl font-bold ${dreamCount >= 3 ? "text-[#48b8ff]" : "text-zinc-400"}`}>
            {dreamCount}<span className="text-zinc-600">/3</span>
          </span>
        </div>
      </div>

      {/* Total costs footer */}
      {(totalCraft !== null || totalWithCorrosion !== null) && (
        <div className="mt-6 pt-5 border-t border-zinc-700 flex justify-around items-start">
          {totalCraft !== null && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Craft</span>
              <span className={`text-2xl font-bold flex items-center gap-1.5 ${Number.isNaN(totalCraft) ? "text-red-400" : "text-white"}`}>
                {Number.isNaN(totalCraft) ? "NaN" : Math.round(totalCraft).toLocaleString("en-US")}
                {!Number.isNaN(totalCraft) && <FEIcon className="w-5 h-5" />}
              </span>
            </div>
          )}
          {totalWithCorrosion !== null && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total with Corrosion</span>
              <span className={`text-2xl font-bold flex items-center gap-1.5 ${Number.isNaN(totalWithCorrosion) ? "text-red-400" : "text-zinc-300"}`}>
                {Number.isNaN(totalWithCorrosion) ? "NaN" : Math.round(totalWithCorrosion).toLocaleString("en-US")}
                {!Number.isNaN(totalWithCorrosion) && <FEIcon className="w-5 h-5" />}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
