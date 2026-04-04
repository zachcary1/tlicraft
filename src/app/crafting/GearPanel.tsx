"use client";

import { useRef, useEffect, Fragment } from "react";

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
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function SlotDropdown({ slotId, pools, loadout, onSelect, onClose }: SlotDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const available = getAvailablePools(slotId, pools, loadout);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const grouped = available.reduce<Record<string, PoolSummary[]>>((acc, p) => {
    const cat = p.baseItemCategory.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div ref={ref} className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 min-w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
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
  onOpen: () => void;
  onFocus: () => void;
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function getPSRarityColors(count: number): { border: string; gradientEnd: string } {
  if (count === 0) return { border: "#71717a", gradientEnd: "#3f3f46" };
  if (count <= 4)  return { border: "#38bdf8", gradientEnd: "#0c4a6e" };
  if (count === 5) return { border: "#c084fc", gradientEnd: "#6b21a8" };
  return                  { border: "#f472b6", gradientEnd: "#9d174d" };
}

function SlotTile({ slotId, pools, loadout, psCount, isOpen, isFocused, onOpen, onFocus, onSelect, onClose }: SlotTileProps) {
  const selectedPool = pools.find((p) => p.id === loadout[slotId]);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

  function handleClick() {
    if (locked) return;
    if (selectedPool) onFocus();
    else onOpen();
  }

  const { border: rarityBorder, gradientEnd } = getPSRarityColors(psCount);

  const border = locked
    ? "2px solid #27272a"
    : isOpen || (isFocused && selectedPool)
    ? "2px solid #f59e0b"
    : selectedPool
    ? `2px solid ${rarityBorder}`
    : "2px solid #3f3f46";

  const glow = (!locked && (isOpen || (isFocused && selectedPool)))
    ? "0 0 12px #f59e0b55"
    : "none";

  const bg = selectedPool
    ? `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)`
    : "#0a0a0a";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={locked}
          className="w-[88px] h-[88px] rounded-lg flex items-center justify-center relative overflow-hidden transition-all"
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
              className="w-10 h-10 rounded"
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
            className="absolute top-1 right-1 rounded p-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-black/40 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            onSelect={(id) => { onSelect(id); onClose(); }}
            onClose={onClose}
          />
        )}
      </div>

      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {SLOT_LABELS[slotId]}
      </span>
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
  onSlotOpen: (id: GearSlotId) => void;
  onSlotFocus: (id: GearSlotId) => void;
  onSlotClose: () => void;
  onSelect: (slotId: GearSlotId, poolId: string) => void;
};

export default function GearPanel({ pools, loadout, activeSlotId, focusedSlotId, psCounts, onSlotOpen, onSlotFocus, onSlotClose, onSelect }: GearPanelProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Equipment</h2>
      <div className="grid grid-cols-2 gap-3">
        {LAYOUT.map(([left, right]) => (
          <Fragment key={`${left}-${right}`}>
            <SlotTile slotId={left} pools={pools} loadout={loadout} psCount={psCounts[left] ?? 0} isOpen={activeSlotId === left} isFocused={focusedSlotId === left} onOpen={() => onSlotOpen(left)} onFocus={() => onSlotFocus(left)} onSelect={(id) => onSelect(left, id)} onClose={onSlotClose} />
            <SlotTile slotId={right} pools={pools} loadout={loadout} psCount={psCounts[right] ?? 0} isOpen={activeSlotId === right} isFocused={focusedSlotId === right} onOpen={() => onSlotOpen(right)} onFocus={() => onSlotFocus(right)} onSelect={(id) => onSelect(right, id)} onClose={onSlotClose} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
