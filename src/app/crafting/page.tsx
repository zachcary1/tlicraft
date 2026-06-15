"use client";

import { useEffect, useState } from "react";
import type { CraftedPool } from "@/services/crafting/types";
import ItemCard, {
  PlaceholderItemCard,
  EMPTY_SLOTS,
  EMPTY_RESOURCE_PRICES,
  computeCraftCostLines,
  computeCorrosionTotal,
  type ItemSlots,
  type ResourcePrices,
  type ActiveSlotId,
} from "./ItemCard";
import GearPanel, {
  EMPTY_LOADOUT,
  type GearSlotId,
  type GearLoadout,
} from "./GearPanel";
import AffixPanel from "./AffixPanel";

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
  activeAffixSlot: ActiveSlotId | null;
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
  activeAffixSlot: null,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CraftingPage() {
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);

  const [loadout, setLoadout] = useState<GearLoadout>(EMPTY_LOADOUT);
  const [activeSlotId, setActiveSlotId] = useState<GearSlotId | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<GearSlotId | null>(null);

  const [slotDataMap, setSlotDataMap] = useState<Partial<Record<GearSlotId, SlotData>>>({});

  useEffect(() => {
    fetch("/api/pools")
      .then((r) => r.json())
      .then((data) => {
        setPools(data);
        setLoadingPools(false);
      });
  }, []);

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

    setSlotDataMap((prev) => ({
      ...prev,
      [slotId]: { ...EMPTY_SLOT_DATA, loading: true },
    }));
    setFocusedSlotId(slotId);

    fetch(`/api/pools/${poolId}`)
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error(`Empty response (status ${r.status})`);
        try { return JSON.parse(text); }
        catch { throw new Error(`Invalid JSON (status ${r.status}): ${text.slice(0, 200)}`); }
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

  // Deselect active affix slot when clicking outside any interactive element
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("button, input, label, select, textarea, a, [data-affix-panel]")) {
        setSlotDataMap((prev) => {
          if (!focusedSlotId || !prev[focusedSlotId]?.activeAffixSlot) return prev;
          return { ...prev, [focusedSlotId]: { ...prev[focusedSlotId]!, activeAffixSlot: null } };
        });
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [focusedSlotId]);

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

  const dreamCount = (Object.keys(slotDataMap) as GearSlotId[]).filter(
    (id) => slotDataMap[id]?.itemSlots.dream !== null
  ).length;

  const dreamFlags = Object.fromEntries(
    (Object.keys(slotDataMap) as GearSlotId[]).map((id) => [
      id,
      slotDataMap[id]?.itemSlots.dream !== null && slotDataMap[id]?.itemSlots.dream !== undefined,
    ])
  ) as Partial<Record<GearSlotId, boolean>>;

  const costTotals = Object.fromEntries(
    (Object.keys(slotDataMap) as GearSlotId[]).map((id) => {
      const d = slotDataMap[id];
      if (!d?.poolData) return [id, { craft: null, corrosion: null }];
      const { total: craft } = computeCraftCostLines(d.poolData, d.itemSlots, d.baseCostFE, d.shallowCostFE, d.modCostFE, d.resourcePrices);
      const corrosion = computeCorrosionTotal(d.poolData, d.itemSlots, d.baseCostFE, d.shallowCostFE, d.modCostFE, d.resourcePrices, d.corrosionCostFE);
      return [id, { craft, corrosion }];
    })
  ) as Partial<Record<GearSlotId, { craft: number | null; corrosion: number | null }>>;

  // Taken affix IDs per active slot (for prefix/suffix dedup)
  const PREFIX_SUFFIX_KEYS = ["prefix1","prefix2","prefix3","suffix1","suffix2","suffix3"] as const;
  const takenAffixIds: Partial<Record<ActiveSlotId, Set<string>>> = {};
  if (focused?.poolData) {
    for (const key of PREFIX_SUFFIX_KEYS) {
      const others = PREFIX_SUFFIX_KEYS.filter((k) => k !== key);
      takenAffixIds[key] = new Set(
        others.map((k) => focused.itemSlots[k]?.affixId).filter(Boolean) as string[]
      );
    }
  }

  // Advanced/ultimate counts for the focused item
  const ADVANCED_GROUPS = ["ADVANCED_PREFIXES", "ADVANCED_SUFFIXES"];
  const ULTIMATE_GROUPS = ["ULTIMATE_PREFIXES", "ULTIMATE_SUFFIXES"];
  const focusedAdvancedCount = focused
    ? PREFIX_SUFFIX_KEYS.filter((k) => {
        const s = focused.itemSlots[k];
        return s !== null && ADVANCED_GROUPS.includes(s!.sourceGroup);
      }).length
    : 0;
  const focusedUltimateCount = focused
    ? PREFIX_SUFFIX_KEYS.filter((k) => {
        const s = focused.itemSlots[k];
        return s !== null && ULTIMATE_GROUPS.includes(s!.sourceGroup);
      }).length
    : 0;
  const focusedT0PlusCount = focused
    ? PREFIX_SUFFIX_KEYS.filter((k) => {
        const s = focused.itemSlots[k];
        return s !== null && (s as import("./ItemCard").SlotValue)?.tier === "T0_PLUS";
      }).length
    : 0;

  return (
    <div
      className="min-h-screen text-[#1a2028]"
      style={{
        backgroundImage: [
          "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
          "url('/background/background.jpg')",
        ].join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex items-start gap-[25px] min-h-screen px-[15%]">
        <h1 className="sr-only">Crafting Calculator</h1>

        {/* Gear panel */}
        <div className="pr-12 pt-[35px]">
          <GearPanel
            pools={pools}
            loadout={loadout}
            activeSlotId={activeSlotId}
            focusedSlotId={focusedSlotId}
            psCounts={psCounts}
            costTotals={costTotals}
            dreamCount={dreamCount}
            dreamFlags={dreamFlags}
            slotItemSlots={Object.fromEntries(
              (Object.keys(slotDataMap) as GearSlotId[]).map((id) => [id, slotDataMap[id]?.itemSlots ?? null])
            ) as Partial<Record<GearSlotId, ItemSlots | null>>}
            slotPoolData={Object.fromEntries(
              (Object.keys(slotDataMap) as GearSlotId[]).map((id) => [id, slotDataMap[id]?.poolData ?? null])
            ) as Partial<Record<GearSlotId, import("@/services/crafting/types").CraftedPool | null>>}
            onSlotOpen={(id) => setActiveSlotId((prev) => (prev === id ? null : id))}
            onSlotFocus={(id) => setFocusedSlotId(id)}
            onSlotClose={() => setActiveSlotId(null)}
            onSelect={handleSlotSelect}
          />
        </div>

        {/* Item card */}
        <div className="w-[700px] shrink-0 pl-12 pr-4 self-center">
          {!focusedSlotId || !focused ? (
            <PlaceholderItemCard />
          ) : focused.loading ? (
            <PlaceholderItemCard title="Loading affix pools…" />
          ) : focused.poolData ? (
            <ItemCard
              pool={focused.poolData}
              slots={focused.itemSlots}
              onChange={(s) => updateSlotData(focusedSlotId, { itemSlots: s })}
              onClear={() => clearSlot(focusedSlotId)}
              dreamsFull={dreamCount >= 3 && !focused.itemSlots.dream}
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
              activeSlot={focused.activeAffixSlot}
              onActiveSlotChange={(id) => updateSlotData(focusedSlotId, { activeAffixSlot: id })}
            />
          ) : null}
        </div>

        {/* Affix panel */}
        <div className="w-[560px] shrink-0 pl-4" data-affix-panel>
          <AffixPanel
            pool={focused?.poolData ?? null}
            slots={focused?.itemSlots ?? EMPTY_SLOTS}
            activeSlot={focused?.activeAffixSlot ?? null}
            onChange={(s) => focusedSlotId && updateSlotData(focusedSlotId, { itemSlots: s })}
            dreamsFull={dreamCount >= 3 && !focused?.itemSlots.dream}
            advancedCount={focusedAdvancedCount}
            ultimateCount={focusedUltimateCount}
            t0PlusCount={focusedT0PlusCount}
            takenAffixIds={takenAffixIds}
          />
        </div>
      </div>
    </div>
  );
}
