"use client";

import { useEffect, useState } from "react";
import type { CraftedPool } from "@/services/crafting/types";
import ItemCard, {
  EMPTY_SLOTS,
  EMPTY_RESOURCE_PRICES,
  type ItemSlots,
  type ResourcePrices,
} from "./ItemCard";
import GearPanel, {
  EMPTY_LOADOUT,
  type GearSlotId,
  type GearLoadout,
} from "./GearPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type PoolSummary = {
  id: string;
  name: string;
  attributeType: "STR" | "DEX" | "INT" | null;
  baseItemCategory: { id: string; name: string };
  weaponType: { id: string; name: string } | null;
};

type SlotData = {
  poolData: CraftedPool | null;
  itemSlots: ItemSlots;
  loading: boolean;
  baseCostFE: string;
  shallowCostFE: string;
  modCostFE: string;
  resourcePrices: ResourcePrices;
  corrosionCostFE: string;
};

const EMPTY_SLOT_DATA: SlotData = {
  poolData: null,
  itemSlots: EMPTY_SLOTS,
  loading: false,
  baseCostFE: "",
  shallowCostFE: "",
  modCostFE: "",
  resourcePrices: EMPTY_RESOURCE_PRICES,
  corrosionCostFE: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CraftingPage() {
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);

  const [loadout, setLoadout] = useState<GearLoadout>(EMPTY_LOADOUT);
  const [activeSlotId, setActiveSlotId] = useState<GearSlotId | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<GearSlotId | null>(null);

  // Per-slot state: map from GearSlotId → SlotData
  const [slotDataMap, setSlotDataMap] = useState<Partial<Record<GearSlotId, SlotData>>>({});

  useEffect(() => {
    fetch("/api/pools")
      .then((r) => r.json())
      .then((data) => {
        setPools(data);
        setLoadingPools(false);
      });
  }, []);

  // When a pool is selected for a slot, load the full pool data
  function handleSlotSelect(slotId: GearSlotId, poolId: string) {
    setLoadout((prev) => ({ ...prev, [slotId]: poolId }));

    if (!poolId) {
      setSlotDataMap((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      if (focusedSlotId === slotId) setFocusedSlotId(null);
      return;
    }

    // Start loading
    setSlotDataMap((prev) => ({
      ...prev,
      [slotId]: { ...EMPTY_SLOT_DATA, loading: true },
    }));
    setFocusedSlotId(slotId);

    fetch(`/api/pools/${poolId}`)
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error(`Empty response (status ${r.status})`);
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON (status ${r.status}): ${text.slice(0, 200)}`);
        }
      })
      .then((data: CraftedPool) => {
        setSlotDataMap((prev) => ({
          ...prev,
          [slotId]: { ...EMPTY_SLOT_DATA, poolData: data, loading: false },
        }));
      })
      .catch((err) => {
        console.error(`[pool load] ${poolId}:`, err);
        setSlotDataMap((prev) => ({
          ...prev,
          [slotId]: { ...EMPTY_SLOT_DATA, loading: false },
        }));
      });
  }

  function updateSlotData(slotId: GearSlotId, patch: Partial<SlotData>) {
    setSlotDataMap((prev) => ({
      ...prev,
      [slotId]: { ...(prev[slotId] ?? EMPTY_SLOT_DATA), ...patch },
    }));
  }

  function clearSlot(slotId: GearSlotId) {
    setLoadout((prev) => ({ ...prev, [slotId]: "" }));
    setSlotDataMap((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    if (focusedSlotId === slotId) {
      // Focus the next available slot, if any
      const remaining = (Object.keys(slotDataMap) as GearSlotId[]).filter(
        (id) => id !== slotId && slotDataMap[id]?.poolData,
      );
      setFocusedSlotId(remaining[0] ?? null);
    }
  }


  const focused = focusedSlotId ? slotDataMap[focusedSlotId] : null;

  const psCounts = Object.fromEntries(
    (Object.keys(slotDataMap) as GearSlotId[]).map((id) => {
      const itemSlots = slotDataMap[id]?.itemSlots;
      const count = itemSlots
        ? (["prefix1", "prefix2", "prefix3", "suffix1", "suffix2", "suffix3"] as (keyof ItemSlots)[]).filter((k) => itemSlots[k] !== null).length
        : 0;
      return [id, count];
    })
  ) as Partial<Record<GearSlotId, number>>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-bold mb-8">Crafting Calculator</h1>
      <div className="grid grid-cols-2 divide-x divide-zinc-800 min-h-[calc(100vh-8rem)]">
        {/* Left: gear panel */}
        <div className="flex justify-center items-start pr-8">
          {loadingPools ? (
            <p className="text-zinc-500 text-sm">Loading pools...</p>
          ) : (
            <GearPanel
              pools={pools}
              loadout={loadout}
              activeSlotId={activeSlotId}
              focusedSlotId={focusedSlotId}
              psCounts={psCounts}
              onSlotOpen={(id) => setActiveSlotId((prev) => (prev === id ? null : id))}
              onSlotFocus={(id) => setFocusedSlotId(id)}
              onSlotClose={() => setActiveSlotId(null)}
              onSelect={handleSlotSelect}
            />
          )}
        </div>

        {/* Right: item builder */}
        <div className="pl-8">
          {!focusedSlotId || !focused ? (
            <p className="text-zinc-600 text-sm">Select a gear slot to start configuring.</p>
          ) : focused.loading ? (
            <p className="text-zinc-500 text-sm">Loading pool...</p>
          ) : focused.poolData ? (
          <div className="space-y-8 max-w-3xl">
            <ItemCard
              pool={focused.poolData}
              slots={focused.itemSlots}
              onChange={(s) => updateSlotData(focusedSlotId, { itemSlots: s })}
              onClear={() => clearSlot(focusedSlotId)}
              baseCostFE={focused.baseCostFE}
              onBaseCostFEChange={(v) => updateSlotData(focusedSlotId, { baseCostFE: v })}
              shallowCostFE={focused.shallowCostFE}
              onShallowCostFEChange={(v) => updateSlotData(focusedSlotId, { shallowCostFE: v })}
              modCostFE={focused.modCostFE}
              onModCostFEChange={(v) => updateSlotData(focusedSlotId, { modCostFE: v })}
              resourcePrices={focused.resourcePrices}
              onResourcePricesChange={(p) => updateSlotData(focusedSlotId, { resourcePrices: p })}
              corrosionCostFE={focused.corrosionCostFE}
              onCorrosionCostFEChange={(v) => updateSlotData(focusedSlotId, { corrosionCostFE: v })}
            />

          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
