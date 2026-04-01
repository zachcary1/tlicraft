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

export type GearLoadout = Record<GearSlotId, string>; // slot → poolId (or "")

export const EMPTY_LOADOUT: GearLoadout = {
  helmet: "",
  chest: "",
  gloves: "",
  boots: "",
  necklace: "",
  belt: "",
  ring_l: "",
  ring_r: "",
  main_hand: "",
  off_hand: "",
};

type PoolSummary = {
  id: string;
  name: string;
  attributeType: "STR" | "DEX" | "INT" | null;
  baseItemCategory: { id: string; name: string };
  weaponType: { id: string; name: string } | null;
};

// ─── Slot definitions ─────────────────────────────────────────────────────────

const SLOT_LABELS: Record<GearSlotId, string> = {
  helmet: "Helmet",
  chest: "Chest",
  gloves: "Gloves",
  boots: "Boots",
  necklace: "Necklace",
  belt: "Belt",
  ring_l: "Ring",
  ring_r: "Ring",
  main_hand: "Main Hand",
  off_hand: "Off Hand",
};

// Which baseItemCategoryIds are valid for each gear slot
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

// Layout: [left column, right column]
const LAYOUT: [GearSlotId, GearSlotId][] = [
  ["helmet",    "chest"],
  ["necklace",  "gloves"],
  ["belt",      "boots"],
  ["ring_l",    "ring_r"],
  ["main_hand", "off_hand"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMainHandTwoHanded(loadout: GearLoadout, pools: PoolSummary[]): boolean {
  if (!loadout.main_hand) return false;
  const pool = pools.find((p) => p.id === loadout.main_hand);
  return pool?.baseItemCategory.id === "two_hand_weapon";
}

function getAvailablePools(
  slotId: GearSlotId,
  pools: PoolSummary[],
  loadout: GearLoadout,
): PoolSummary[] {
  const validCategories = SLOT_CATEGORIES[slotId];
  if (slotId === "off_hand" && isMainHandTwoHanded(loadout, pools)) {
    return []; // off-hand locked when main hand has two-hander
  }
  return pools.filter((p) => validCategories.includes(p.baseItemCategory.id));
}

// Returns true if a pool should appear greyed-out (visible but unselectable)
function isPoolDisabled(
  slotId: GearSlotId,
  pool: PoolSummary,
  loadout: GearLoadout,
): boolean {
  // Two-handers are disabled in main hand when off-hand is occupied
  if (slotId === "main_hand" && loadout.off_hand && pool.baseItemCategory.id === "two_hand_weapon") {
    return true;
  }
  return false;
}

// ─── Dropdown popup ───────────────────────────────────────────────────────────

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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Group by category name
  const grouped = available.reduce<Record<string, PoolSummary[]>>((acc, p) => {
    const cat = p.baseItemCategory.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 min-w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1"
    >
      {locked ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">
          Off-hand locked (two-handed weapon equipped)
        </p>
      ) : available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-500 italic">No items available</p>
      ) : (
        <>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
            onClick={() => onSelect("")}
          >
            — empty —
          </button>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 pt-2 pb-0.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                {cat}
              </p>
              {items.map((p) => {
                const disabled = isPoolDisabled(slotId, p, loadout);
                return (
                  <button
                    key={p.id}
                    disabled={disabled}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      disabled
                        ? "text-zinc-600 cursor-not-allowed"
                        : loadout[slotId] === p.id
                        ? "text-amber-400 hover:bg-zinc-800"
                        : "text-zinc-100 hover:bg-zinc-800"
                    }`}
                    onClick={disabled ? undefined : () => onSelect(p.id)}
                  >
                    {p.name}
                    {p.attributeType ? (
                      <span className="ml-1 text-zinc-600">({p.attributeType})</span>
                    ) : null}
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
  isOpen: boolean;
  isFocused: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onSelect: (poolId: string) => void;
  onClose: () => void;
};

function SlotTile({ slotId, pools, loadout, isOpen, isFocused, onOpen, onFocus, onSelect, onClose }: SlotTileProps) {
  const selectedPool = pools.find((p) => p.id === loadout[slotId]);
  const locked = slotId === "off_hand" && isMainHandTwoHanded(loadout, pools);

  function handleClick() {
    if (locked) return;
    if (selectedPool) {
      onFocus();
    } else {
      onOpen();
    }
  }

  return (
    <div className="relative">
      <button
        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
          locked
            ? "border-zinc-800 bg-zinc-900 opacity-40 cursor-not-allowed"
            : isOpen
            ? "border-amber-500 bg-zinc-800"
            : isFocused && selectedPool
            ? "border-amber-500/60 bg-zinc-800"
            : selectedPool
            ? "border-zinc-600 bg-zinc-800 hover:border-zinc-500"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
        }`}
        onClick={handleClick}
        disabled={locked}
      >
        <p className="text-xs font-medium text-zinc-400 mb-0.5 pr-5">{SLOT_LABELS[slotId]}</p>
        {selectedPool ? (
          <p className="text-sm text-zinc-100 leading-tight truncate pr-5">{selectedPool.name}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">Empty</p>
        )}
        {selectedPool?.attributeType && (
          <p className="text-xs text-zinc-500 mt-0.5">{selectedPool.attributeType}</p>
        )}
      </button>

      {selectedPool && !locked && (
        <button
          title="Change item"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="absolute top-2 right-2 rounded p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  );
}

// ─── GearPanel ────────────────────────────────────────────────────────────────

type GearPanelProps = {
  pools: PoolSummary[];
  loadout: GearLoadout;
  activeSlotId: GearSlotId | null;
  focusedSlotId: GearSlotId | null;
  onSlotOpen: (id: GearSlotId) => void;
  onSlotFocus: (id: GearSlotId) => void;
  onSlotClose: () => void;
  onSelect: (slotId: GearSlotId, poolId: string) => void;
};

export default function GearPanel({
  pools,
  loadout,
  activeSlotId,
  focusedSlotId,
  onSlotOpen,
  onSlotFocus,
  onSlotClose,
  onSelect,
}: GearPanelProps) {
  return (
    <div className="w-64 shrink-0">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Equipment
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUT.map(([left, right]) => (
          <Fragment key={`${left}-${right}`}>
            <SlotTile
              slotId={left}
              pools={pools}
              loadout={loadout}
              isOpen={activeSlotId === left}
              isFocused={focusedSlotId === left}
              onOpen={() => onSlotOpen(left)}
              onFocus={() => onSlotFocus(left)}
              onSelect={(id) => onSelect(left, id)}
              onClose={onSlotClose}
            />
            <SlotTile
              slotId={right}
              pools={pools}
              loadout={loadout}
              isOpen={activeSlotId === right}
              isFocused={focusedSlotId === right}
              onOpen={() => onSlotOpen(right)}
              onFocus={() => onSlotFocus(right)}
              onSelect={(id) => onSelect(right, id)}
              onClose={onSlotClose}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
