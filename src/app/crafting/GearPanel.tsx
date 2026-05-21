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

export const SLOT_LABELS: Record<GearSlotId, string> = {
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

export const LAYOUT: [GearSlotId, GearSlotId][] = [
  ["helmet",    "chest"],
  ["necklace",  "gloves"],
  ["belt",      "boots"],
  ["ring_l",    "ring_r"],
  ["main_hand", "off_hand"],
];

// ─── Empty slot icons ─────────────────────────────────────────────────────────

const C = "#52525b"; // single gray color for all placeholder icons

export const SLOT_ICONS: Record<GearSlotId, React.ReactNode> = {
  helmet: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* dome */}
      <path d="M4 15C4 9.477 7.582 5 12 5C16.418 5 20 9.477 20 15L20 17L4 17Z" />
      {/* brim */}
      <rect x="2" y="17" width="20" height="3" rx="1" />
      {/* visor slit */}
      <rect x="6" y="13.5" width="12" height="1.5" rx="0.75" fill="#0a0a0a" />
    </svg>
  ),
  chest: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* body plate */}
      <path d="M8 5L4 7L4 20L20 20L20 7L16 5L12 8Z" />
      {/* left pauldron */}
      <rect x="2" y="6" width="5" height="5" rx="1" />
      {/* right pauldron */}
      <rect x="17" y="6" width="5" height="5" rx="1" />
    </svg>
  ),
  gloves: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* index */}
      <rect x="7" y="7" width="2.2" height="8" rx="1.1" />
      {/* middle */}
      <rect x="10" y="5" width="2.2" height="10" rx="1.1" />
      {/* ring */}
      <rect x="13" y="6" width="2.2" height="9" rx="1.1" />
      {/* pinky */}
      <rect x="16" y="8" width="2.2" height="7" rx="1.1" />
      {/* palm */}
      <rect x="7" y="13" width="11" height="7" rx="2" />
      {/* thumb */}
      <rect x="4" y="12" width="5" height="2.2" rx="1.1" />
    </svg>
  ),
  boots: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* shaft */}
      <rect x="6" y="4" width="7" height="10" rx="1" />
      {/* foot */}
      <path d="M6 12L20 12Q24 12 24 16L24 21L6 21Z" />
    </svg>
  ),
  necklace: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      {/* chain arc */}
      <path d="M5 5Q12 15 19 5" stroke={C} strokeWidth="2.5" strokeLinecap="round" />
      {/* left chain to pendant */}
      <line x1="8.5" y1="11" x2="12" y2="17" stroke={C} strokeWidth="2" strokeLinecap="round" />
      {/* right chain to pendant */}
      <line x1="15.5" y1="11" x2="12" y2="17" stroke={C} strokeWidth="2" strokeLinecap="round" />
      {/* pendant */}
      <circle cx="12" cy="19.5" r="2.5" fill={C} />
    </svg>
  ),
  belt: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* left strap */}
      <rect x="2" y="10" width="7" height="4" />
      {/* right strap */}
      <rect x="15" y="10" width="7" height="4" />
      {/* buckle frame */}
      <rect x="8" y="8" width="8" height="8" rx="1" />
      {/* buckle pin */}
      <rect x="11.5" y="8" width="1" height="8" rx="0.5" fill="#0a0a0a" />
    </svg>
  ),
  ring_l: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      {/* band */}
      <circle cx="12" cy="13" r="7.5" stroke={C} strokeWidth="3.5" />
      {/* gem */}
      <path d="M12 2L15 5.5L12 8L9 5.5Z" fill={C} />
    </svg>
  ),
  ring_r: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="7.5" stroke={C} strokeWidth="3.5" />
      <path d="M12 2L15 5.5L12 8L9 5.5Z" fill={C} />
    </svg>
  ),
  main_hand: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* blade tip */}
      <path d="M12 1L14 5L10 5Z" />
      {/* blade body */}
      <rect x="10" y="5" width="4" height="13" />
      {/* crossguard */}
      <rect x="6.5" y="18" width="11" height="2" rx="1" />
      {/* grip */}
      <rect x="11" y="20" width="2" height="3.5" rx="1" />
      {/* pommel */}
      <circle cx="12" cy="24" r="1.5" />
    </svg>
  ),
  off_hand: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill={C}>
      {/* shield */}
      <path d="M12 2L21 7L21 14L12 22L3 14L3 7Z" />
    </svg>
  ),
};

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
      className={`absolute z-50 left-1/2 -translate-x-1/2 min-w-48 rounded-lg border border-[#1c1c1c] bg-[#0f0f0f] shadow-xl py-1 ${positionClass}`}
      style={positionStyle}
    >
      {locked ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">Off-hand locked (two-handed weapon equipped)</p>
      ) : available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">{pools.length === 0 ? "Pools loading…" : "No items available"}</p>
      ) : (
        <>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#2a2929] cursor-pointer" onClick={() => onSelect("")}>
            — empty —
          </button>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 pt-2 pb-0.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{cat}</p>
              {items.map((p) => {
                const disabled = isPoolDisabled(slotId, p, loadout);
                return (
                  <div key={p.id} className="relative group/disabled">
                    <button
                      disabled={disabled}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        disabled ? "text-zinc-600 cursor-not-allowed"
                        : loadout[slotId] === p.id ? "text-amber-400 hover:bg-[#2a2929] cursor-pointer"
                        : "text-[#e0ddd8] hover:bg-[#2a2929] cursor-pointer"
                      }`}
                      onClick={disabled ? undefined : () => onSelect(p.id)}
                    >
                      {p.name}
                      {p.attributeType && <span className="ml-1 text-zinc-600">({p.attributeType})</span>}
                    </button>
                    {disabled && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-sm text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/disabled:opacity-100 transition-opacity z-[10000]">
                        Locked — unequip the off-hand slot first
                      </span>
                    )}
                  </div>
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
  hasDream: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function getPSRarityColors(count: number): { border: string; borderHover: string; gradientEnd: string; metallicKey: "zinc" | "blue" | "purple" | "pink" } {
  if (count === 0) return { border: "#71717a", borderHover: "#a1a1aa", gradientEnd: "#3f3f46", metallicKey: "zinc" };
  if (count <= 4)  return { border: "#38bdf8", borderHover: "#7dd3fc", gradientEnd: "#0c4a6e", metallicKey: "blue" };
  if (count === 5) return { border: "#c084fc", borderHover: "#d8b4fe", gradientEnd: "#6b21a8", metallicKey: "purple" };
  return                  { border: "#f472b6", borderHover: "#f9a8d4", gradientEnd: "#9d174d", metallicKey: "pink" };
}

const METALLIC_GRADIENTS = {
  zinc:   "linear-gradient(145deg, #b8b8bc 0%, #4a4a4e 15%, #d8d8dc 35%, #6a6a70 55%, #2c2c30 75%, #9a9a9e 100%)",
  blue:   "linear-gradient(145deg, #bae6fd 0%, #0369a1 15%, #e0f2fe 35%, #38bdf8 55%, #075985 75%, #7dd3fc 100%)",
  purple: "linear-gradient(145deg, #e9d5ff 0%, #7e22ce 15%, #f3e8ff 35%, #c084fc 55%, #6b21a8 75%, #d8b4fe 100%)",
  pink:   "linear-gradient(145deg, #fce7f3 0%, #be185d 15%, #fdf2f8 35%, #f472b6 55%, #9d174d 75%, #f9a8d4 100%)",
};

function SlotTile({ slotId, pools, loadout, psCount, isOpen, isFocused, craftTotal, corrosionTotal, costSide, hasDream, onOpen, onFocus, onSelect, onClose }: SlotTileProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const selectedPool = pools.find((p) => p.id === loadout[slotId]);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

  function handleClick() {
    if (locked) return;
    if (selectedPool) onFocus();
    else onOpen();
  }

  const { gradientEnd, metallicKey, border: rarityBorder } = getPSRarityColors(psCount);

  const isActive = !locked && (isOpen || (isFocused && selectedPool));

  const glow = isActive
    ? `0 0 12px ${rarityBorder}cc, 0 0 28px ${rarityBorder}88, 0 0 52px ${rarityBorder}44`
    : "none";

  const innerBg = selectedPool
    ? `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)`
    : "#0a0a0a";

  const metallicBorder = METALLIC_GRADIENTS[metallicKey];

  const border = selectedPool
    ? "6px solid transparent"
    : locked
    ? "6px solid #1c1c1c"
    : `6px solid ${isHovered ? "#52525b" : "#3f3f46"}`;

  const bg = selectedPool
    ? `${innerBg} padding-box, ${metallicBorder} border-box`
    : innerBg;

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={`relative z-10 text-xs uppercase tracking-wider font-medium transition-colors ${isActive ? "text-white" : isHovered && !locked ? "text-[#e0ddd8]" : "text-zinc-600"}`}>
        {SLOT_LABELS[slotId]}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={handleClick}
          disabled={locked}
          className={`w-36 h-36 flex items-center justify-center relative overflow-hidden transition-all ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
          style={{ border, background: bg, boxShadow: glow, opacity: locked ? 0.35 : 1, borderRadius: "0 28px 0 28px" }}
        >
          {selectedPool ? (
            <img
              src={getPoolIconPath(selectedPool)}
              alt={selectedPool.name}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <div className="opacity-30">
              {SLOT_ICONS[slotId]}
            </div>
          )}
        </button>

        {locked && isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="px-3 py-1.5 text-xs text-white whitespace-nowrap border border-[#535357] bg-[#1a1a1a] rounded-sm shadow-lg">
              Off-hand locked — two-handed weapon equipped
            </div>
          </div>
        )}

        {selectedPool && hasDream && (
          <img
            src="/icons/slots/dream.png"
            alt="Dream affix"
            className="absolute bottom-2 right-2 w-7 h-7 pointer-events-none p-[3px] rounded-tr-[5px] rounded-bl-[5px]"
            style={{ background: "rgba(30,30,30,0.65)" }}
          />
        )}

        {selectedPool && !locked && (
          <div className="absolute top-2 right-2 group/change">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="relative rounded p-1 text-zinc-400 hover:text-[#e0ddd8] hover:bg-black/40 transition-colors cursor-pointer"
          >
            <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1.5 rounded-sm text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/change:opacity-100 transition-opacity z-50">
              Change item
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          </div>
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
          <span className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-0.5 text-[14px] font-semibold text-[#e0ddd8] leading-tight text-center w-max max-w-[180px] pointer-events-none">
            {selectedPool.name.replace(/\s*armor\b/gi, "").trim()}
          </span>
        )}

        {(craftTotal !== null || corrosionTotal !== null) && (
          <div className={`absolute top-0 flex flex-col gap-1.5 pointer-events-none ${costSide === "right" ? "left-full ml-3 items-start" : "right-full mr-3 items-end"}`}>
            {craftTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Craft</span>
                <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(craftTotal) ? "text-red-400" : "text-[#e0ddd8]"}`}>
                  {Number.isNaN(craftTotal) ? "NaN" : Math.round(craftTotal).toLocaleString("en-US")}
                  {!Number.isNaN(craftTotal) && <FEIcon className="w-5 h-5" />}
                </span>
              </div>
            )}
            {corrosionTotal !== null && (
              <div className={`flex flex-col ${costSide === "right" ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">+Corrosion</span>
                <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(corrosionTotal) ? "text-red-400" : "text-[#e0ddd8]"}`}>
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
  dreamFlags: Partial<Record<GearSlotId, boolean>>;
  onSlotOpen: (id: GearSlotId) => void;
  onSlotFocus: (id: GearSlotId) => void;
  onSlotClose: () => void;
  onSelect: (slotId: GearSlotId, poolId: string) => void;
};

export default function GearPanel({ pools, loadout, activeSlotId, focusedSlotId, psCounts, costTotals, dreamCount, dreamFlags, onSlotOpen, onSlotFocus, onSlotClose, onSelect }: GearPanelProps) {
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
    const value = c.corrosion ?? c.craft;
    return value;
  }).filter((v) => v !== null) as number[];
  const totalWithCorrosion: number | null = (!anyCorrosion || withCorrValues.length === 0) ? null
    : withCorrValues.some(Number.isNaN) ? NaN
    : withCorrValues.reduce((a, b) => a + b, 0);

  return (
    <div className="border border-[#1c1c1c] px-4 pt-4 pb-6 flex flex-col w-fit" style={{ borderRadius: "0 36px 0 36px", borderWidth: "1px", background: "linear-gradient(to bottom, #1d1e1e, #020202)", boxShadow: "0 8px 40px 8px rgba(0,0,0,0.6)" }}>
      <div className="flex gap-48 items-start px-2">
        {/* Left column — costs on right */}
        <div className="flex flex-col gap-12">
          {LAYOUT.map(([left]) => (
            <SlotTile key={left} slotId={left} pools={pools} loadout={loadout} psCount={psCounts[left] ?? 0} isOpen={activeSlotId === left} isFocused={focusedSlotId === left} craftTotal={costTotals[left]?.craft ?? null} corrosionTotal={costTotals[left]?.corrosion ?? null} costSide="right" hasDream={dreamFlags[left] ?? false} onOpen={() => onSlotOpen(left)} onFocus={() => onSlotFocus(left)} onSelect={(id) => onSelect(left, id)} onClose={onSlotClose} />
          ))}
        </div>
        {/* Right column — costs on left */}
        <div className="flex flex-col gap-12">
          {LAYOUT.map(([, right]) => (
            <SlotTile key={right} slotId={right} pools={pools} loadout={loadout} psCount={psCounts[right] ?? 0} isOpen={activeSlotId === right} isFocused={focusedSlotId === right} craftTotal={costTotals[right]?.craft ?? null} corrosionTotal={costTotals[right]?.corrosion ?? null} costSide="left" hasDream={dreamFlags[right] ?? false} onOpen={() => onSlotOpen(right)} onFocus={() => onSlotFocus(right)} onSelect={(id) => onSelect(right, id)} onClose={onSlotClose} />
          ))}
        </div>
      </div>

      {/* Dream affix counter */}
      <div className="flex justify-center mt-10">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Dream Affixes · {dreamCount} / 3
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "18px",
                  height: "3px",
                  borderRadius: "2px",
                  backgroundColor: i < dreamCount ? "#48b8ff" : "#3f3f46",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Total costs footer — always rendered to keep panel height fixed */}
      <div className="mt-6 pt-5 border-t border-[#1c1c1c] flex justify-between items-start px-2">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Gear Cost</span>
          <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${totalCraft !== null && Number.isNaN(totalCraft) ? "text-red-400" : "text-[#e0ddd8]"}`}>
            {totalCraft === null ? "—" : Number.isNaN(totalCraft) ? "NaN" : Math.round(totalCraft).toLocaleString("en-US")}
            {totalCraft !== null && !Number.isNaN(totalCraft) && <FEIcon className="w-5 h-5" />}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Gear Cost with Corrosion</span>
          <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${totalWithCorrosion !== null && Number.isNaN(totalWithCorrosion) ? "text-red-400" : "text-[#e0ddd8]"}`}>
            {totalWithCorrosion === null ? "—" : Number.isNaN(totalWithCorrosion) ? "NaN" : Math.round(totalWithCorrosion).toLocaleString("en-US")}
            {totalWithCorrosion !== null && !Number.isNaN(totalWithCorrosion) && <FEIcon className="w-5 h-5" />}
          </span>
        </div>
      </div>
    </div>
  );
}
