"use client";

import { useEffect, useState } from "react";
import type { CraftedPool } from "@/services/crafting/types";
import type { CostEstimate } from "@/services/crafting/cost-estimator";
import type { CraftingGroupKey } from "@/services/crafting/probability-lookup";
import ItemCard, {
  EMPTY_SLOTS,
  EMPTY_RESOURCE_PRICES,
  type ItemSlots,
  type ResourcePrices,
} from "./ItemCard";
import CostEstimatePanel from "./CostEstimatePanel";
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

type EstimateResult = {
  estimates: CostEstimate[];
  totalExpectedAttempts: number;
  totalExpectedCost: number;
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
  costPerAttempt: string;
  estimating: boolean;
  estimateResult: EstimateResult | null;
  estimateError: string | null;
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
  costPerAttempt: "",
  estimating: false,
  estimateResult: null,
  estimateError: null,
};

const PREFIX_SUFFIX_KEYS: (keyof ItemSlots)[] = [
  "prefix1", "prefix2", "prefix3",
  "suffix1", "suffix2", "suffix3",
];

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
      .then((r) => r.json())
      .then((data: CraftedPool) => {
        setSlotDataMap((prev) => ({
          ...prev,
          [slotId]: { ...EMPTY_SLOT_DATA, poolData: data, loading: false },
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

  async function handleEstimate(slotId: GearSlotId) {
    const data = slotDataMap[slotId];
    if (!data) return;

    const cost = parseFloat(data.costPerAttempt);
    if (!cost || cost <= 0) {
      updateSlotData(slotId, { estimateError: "Enter a valid cost per attempt." });
      return;
    }

    const targets = PREFIX_SUFFIX_KEYS.flatMap((key) => {
      const slot = data.itemSlots[key] as import("./ItemCard").SlotValue;
      return slot
        ? [{ group: slot.sourceGroup as CraftingGroupKey, affixId: slot.affixId, tier: slot.tier }]
        : [];
    });

    if (targets.length === 0) {
      updateSlotData(slotId, { estimateError: "Select at least one prefix or suffix." });
      return;
    }

    updateSlotData(slotId, { estimating: true, estimateError: null, estimateResult: null });

    const res = await fetch("/api/craft/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poolId: loadout[slotId],
        costPerAttempt: cost,
        targets,
      }),
    });

    const result = await res.json();
    updateSlotData(slotId, {
      estimating: false,
      ...(res.ok
        ? { estimateResult: result }
        : { estimateError: result.error ?? "Unknown error." }),
    });
  }

  const focused = focusedSlotId ? slotDataMap[focusedSlotId] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <h1 className="text-2xl font-bold mb-8">Crafting Calculator</h1>

      {loadingPools ? (
        <p className="text-zinc-500 text-sm">Loading pools...</p>
      ) : (
        <div className="flex gap-10 items-start">
          {/* Left: gear panel */}
          <GearPanel
            pools={pools}
            loadout={loadout}
            activeSlotId={activeSlotId}
            focusedSlotId={focusedSlotId}
            onSlotOpen={(id) => {
              setActiveSlotId((prev) => (prev === id ? null : id));
            }}
            onSlotFocus={(id) => setFocusedSlotId(id)}
            onSlotClose={() => setActiveSlotId(null)}
            onSelect={handleSlotSelect}
          />

          {/* Right: item builder */}
          <div className="flex-1 min-w-0">
            {/* Slot tabs (if multiple slots loaded) */}
            {(() => {
              const loadedSlots = (Object.keys(slotDataMap) as GearSlotId[]).filter(
                (id) => slotDataMap[id]?.poolData,
              );
              if (loadedSlots.length === 0) {
                return (
                  <p className="text-zinc-500 text-sm mt-2">
                    Click a gear slot to start configuring.
                  </p>
                );
              }
              return (
                <>
                  {loadedSlots.length > 1 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {loadedSlots.map((id) => {
                        const pool = slotDataMap[id]!.poolData!;
                        return (
                          <button
                            key={id}
                            onClick={() => setFocusedSlotId(id)}
                            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                              focusedSlotId === id
                                ? "bg-amber-500 text-zinc-950"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            }`}
                          >
                            {pool.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {focusedSlotId && focused && (
                    <div className="space-y-8">
                      {focused.loading ? (
                        <p className="text-zinc-500 text-sm">Loading pool...</p>
                      ) : focused.poolData ? (
                        <>
                          <ItemCard
                            pool={focused.poolData}
                            slots={focused.itemSlots}
                            onChange={(s) =>
                              updateSlotData(focusedSlotId, {
                                itemSlots: s,
                                estimateResult: null,
                              })
                            }
                            onClear={() => clearSlot(focusedSlotId)}
                            baseCostFE={focused.baseCostFE}
                            onBaseCostFEChange={(v) =>
                              updateSlotData(focusedSlotId, { baseCostFE: v })
                            }
                            shallowCostFE={focused.shallowCostFE}
                            onShallowCostFEChange={(v) =>
                              updateSlotData(focusedSlotId, { shallowCostFE: v })
                            }
                            modCostFE={focused.modCostFE}
                            onModCostFEChange={(v) =>
                              updateSlotData(focusedSlotId, { modCostFE: v })
                            }
                            resourcePrices={focused.resourcePrices}
                            onResourcePricesChange={(p) =>
                              updateSlotData(focusedSlotId, { resourcePrices: p })
                            }
                            corrosionCostFE={focused.corrosionCostFE}
                            onCorrosionCostFEChange={(v) =>
                              updateSlotData(focusedSlotId, { corrosionCostFE: v })
                            }
                          />

                          {PREFIX_SUFFIX_KEYS.some((k) => focused.itemSlots[k] !== null) && (
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end max-w-md">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                  Cost per attempt
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                                  placeholder="e.g. 1000"
                                  value={focused.costPerAttempt}
                                  onChange={(e) =>
                                    updateSlotData(focusedSlotId, {
                                      costPerAttempt: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <button
                                className="rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors"
                                onClick={() => handleEstimate(focusedSlotId)}
                                disabled={focused.estimating || !focused.costPerAttempt}
                              >
                                {focused.estimating ? "Calculating..." : "Estimate Cost"}
                              </button>
                            </div>
                          )}

                          {focused.estimateError && (
                            <p className="text-red-400 text-sm">{focused.estimateError}</p>
                          )}

                          {focused.estimateResult && (
                            <CostEstimatePanel
                              result={focused.estimateResult}
                              costPerAttempt={parseFloat(focused.costPerAttempt)}
                            />
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
