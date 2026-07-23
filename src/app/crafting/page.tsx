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
  isLegendaryId,
  findLegendary,
  parseLegendaryAffixSlots,
  LegendaryItemCard,
  LegendaryAffixPanel,
  type GearSlotId,
  type GearLoadout,
  type LegendarySummary,
  type LegendaryLineSelection,
} from "./GearPanel";
import AffixPanel from "./AffixPanel";
import { useGearBuild, type GearSlotBuildData, type LegendarySlotBuildData } from "@/app/state/BuildContext";
import { getJSON } from "@/lib/apiCache";

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

// Transient, per-slot fields that don't belong in the persisted build (poolData is re-fetched
// from the loadout's pool id, loading/activeAffixSlot are pure UI state).
type LocalSlotData = {
  poolData: CraftedPool | null;
  loading: boolean;
  activeAffixSlot: ActiveSlotId | null;
};

const EMPTY_LOCAL_SLOT_DATA: LocalSlotData = {
  poolData: null,
  loading: false,
  activeAffixSlot: null,
};

const EMPTY_GEAR_SLOT_BUILD_DATA: GearSlotBuildData = {
  itemSlots: EMPTY_SLOTS,
  baseCostFE: "",
  shallowCostFE: "",
  modCostFE: "",
  corrosionCostFE: "",
  resourcePrices: EMPTY_RESOURCE_PRICES,
};

const EMPTY_SLOT_DATA: SlotData = {
  ...EMPTY_LOCAL_SLOT_DATA,
  ...EMPTY_GEAR_SLOT_BUILD_DATA,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CraftingPage() {
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [legendary, setLegendary] = useState<LegendarySummary[]>([]);

  const [gearBuild, setGearBuild] = useGearBuild();
  const loadout = gearBuild.loadout;
  const setLoadout: React.Dispatch<React.SetStateAction<GearLoadout>> = (v) =>
    setGearBuild(prev => ({ ...prev, loadout: typeof v === "function" ? (v as (p: GearLoadout) => GearLoadout)(prev.loadout) : v }));
  const persistedSlots = gearBuild.slots;
  const setPersistedSlots: React.Dispatch<React.SetStateAction<Partial<Record<GearSlotId, GearSlotBuildData>>>> = (v) =>
    setGearBuild(prev => ({ ...prev, slots: typeof v === "function" ? (v as (p: Partial<Record<GearSlotId, GearSlotBuildData>>) => Partial<Record<GearSlotId, GearSlotBuildData>>)(prev.slots) : v }));
  const legendarySlots = gearBuild.legendarySlots;
  const setLegendarySlots: React.Dispatch<React.SetStateAction<Partial<Record<GearSlotId, LegendarySlotBuildData>>>> = (v) =>
    setGearBuild(prev => ({ ...prev, legendarySlots: typeof v === "function" ? (v as (p: Partial<Record<GearSlotId, LegendarySlotBuildData>>) => Partial<Record<GearSlotId, LegendarySlotBuildData>>)(prev.legendarySlots) : v }));

  const [activeSlotId, setActiveSlotId] = useState<GearSlotId | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<GearSlotId | null>(null);

  const [localSlotData, setLocalSlotData] = useState<Partial<Record<GearSlotId, LocalSlotData>>>({});

  // Which affix line of the focused legendary item is active (its options shown in the right
  // panel) — pure UI state, like activeAffixSlot for crafted items, so it resets on remount.
  const [legendaryActiveLine, setLegendaryActiveLine] = useState<Partial<Record<GearSlotId, number>>>({});

  // Merged read view combining the persisted (context) and transient (local) halves of a slot's
  // data, so the rest of this file can keep reading a single SlotData shape per slot id.
  function getSlotData(id: GearSlotId): SlotData {
    return {
      ...EMPTY_GEAR_SLOT_BUILD_DATA, ...persistedSlots[id],
      ...EMPTY_LOCAL_SLOT_DATA, ...localSlotData[id],
    };
  }
  const slotIds = Array.from(new Set([...Object.keys(persistedSlots), ...Object.keys(localSlotData)])) as GearSlotId[];
  const slotDataMap = Object.fromEntries(slotIds.map((id) => [id, getSlotData(id)])) as Partial<Record<GearSlotId, SlotData>>;

  useEffect(() => {
    getJSON<PoolSummary[]>("/api/pools")
      .then((data) => {
        setPools(data);
        setLoadingPools(false);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    getJSON<LegendarySummary[]>("/api/legendary").then(setLegendary).catch(console.error);
  }, []);

  // poolData lives in localSlotData (it's re-derived from the loadout's pool id, not part of
  // the persisted build), so it resets to empty whenever this component remounts — e.g. after
  // navigating away and back. Fetch it here for that case.
  function fetchPoolData(slotId: GearSlotId, poolId: string) {
    setLocalSlotData((prev) => ({
      ...prev,
      [slotId]: { ...EMPTY_LOCAL_SLOT_DATA, loading: true },
    }));

    getJSON<CraftedPool>(`/api/pools/${poolId}`)
      .then((data) => {
        setLocalSlotData((prev) => ({
          ...prev,
          [slotId]: { ...EMPTY_LOCAL_SLOT_DATA, poolData: data, loading: false },
        }));
      })
      .catch((err) => {
        console.error(`[pool load] ${poolId}:`, err);
        setLocalSlotData((prev) => ({
          ...prev,
          [slotId]: { ...EMPTY_LOCAL_SLOT_DATA, loading: false },
        }));
      });
  }

  // Backfill poolData for slots that already have an equipped item (from the persisted
  // loadout) but no cached poolData yet — otherwise clicking an already-crafted slot right
  // after navigating here shows nothing, since the item card only renders once poolData
  // resolves. Re-runs whenever the loadout itself changes (e.g. build hydration completing,
  // or an import-build-code replacing the whole build) so newly-appeared slots get picked up.
  useEffect(() => {
    (Object.keys(loadout) as GearSlotId[]).forEach((slotId) => {
      const poolId = loadout[slotId];
      if (!poolId || isLegendaryId(poolId)) return;
      if (localSlotData[slotId]?.poolData || localSlotData[slotId]?.loading) return;
      fetchPoolData(slotId, poolId);
    });
    // localSlotData is intentionally excluded — this effect backfills once per slot per
    // loadout change, not every time the fetches above update localSlotData themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadout]);

  function handleSlotSelect(slotId: GearSlotId, id: string) {
    setLoadout((prev) => ({ ...prev, [slotId]: id }));

    if (!id) {
      setLocalSlotData((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      setPersistedSlots((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      setLegendarySlots((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      setLegendaryActiveLine((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      if (focusedSlotId === slotId) setFocusedSlotId(null);
      return;
    }

    // Switching which item is equipped resets that slot's crafted affixes and costs — a
    // legendary item has neither (only its corrosion selections, reset fresh below), so it
    // just clears both and stops there (no pool fetch).
    setLocalSlotData((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setPersistedSlots((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setFocusedSlotId(slotId);
    setLegendaryActiveLine((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });

    if (isLegendaryId(id)) {
      setLegendarySlots((prev) => ({ ...prev, [slotId]: { selections: {} } }));
      return;
    }

    setLegendarySlots((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setPersistedSlots((prev) => ({
      ...prev,
      [slotId]: { ...EMPTY_GEAR_SLOT_BUILD_DATA },
    }));
    fetchPoolData(slotId, id);
  }

  function handleActivateLegendaryLine(slotId: GearSlotId, lineIndex: number) {
    setLegendaryActiveLine((prev) => ({ ...prev, [slotId]: lineIndex }));
  }

  function handleSelectLegendaryLine(slotId: GearSlotId, lineIndex: number, choice: LegendaryLineSelection) {
    setLegendarySlots((prev) => ({
      ...prev,
      [slotId]: { selections: { ...(prev[slotId]?.selections ?? {}), [lineIndex]: choice } },
    }));
  }

  // Deselect active affix slot when clicking outside any interactive element
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("button, input, label, select, textarea, a, [data-affix-panel]")) {
        setLocalSlotData((prev) => {
          if (!focusedSlotId || !prev[focusedSlotId]?.activeAffixSlot) return prev;
          return { ...prev, [focusedSlotId]: { ...prev[focusedSlotId]!, activeAffixSlot: null } };
        });
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [focusedSlotId]);

  const LOCAL_SLOT_KEYS = ["poolData", "loading", "activeAffixSlot"] as const;

  function updateSlotData(slotId: GearSlotId, patch: Partial<SlotData>) {
    const localPatch: Partial<LocalSlotData> = {};
    const persistedPatch: Partial<GearSlotBuildData> = {};
    for (const k of Object.keys(patch) as (keyof SlotData)[]) {
      if ((LOCAL_SLOT_KEYS as readonly string[]).includes(k)) {
        (localPatch as Record<string, unknown>)[k] = patch[k];
      } else {
        (persistedPatch as Record<string, unknown>)[k] = patch[k];
      }
    }
    if (Object.keys(localPatch).length > 0) {
      setLocalSlotData((prev) => ({
        ...prev,
        [slotId]: { ...(prev[slotId] ?? EMPTY_LOCAL_SLOT_DATA), ...localPatch },
      }));
    }
    if (Object.keys(persistedPatch).length > 0) {
      setPersistedSlots((prev) => ({
        ...prev,
        [slotId]: { ...(prev[slotId] ?? EMPTY_GEAR_SLOT_BUILD_DATA), ...persistedPatch },
      }));
    }
  }

  function clearSlot(slotId: GearSlotId) {
    setLoadout((prev) => ({ ...prev, [slotId]: "" }));
    setPersistedSlots((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setLocalSlotData((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setLegendarySlots((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setLegendaryActiveLine((prev) => {
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

  // Legendary equivalent of `focused` — the parsed affix slots for the focused item and
  // whichever line is currently active, for the right-hand affix panel.
  const focusedLegendaryItem = focusedSlotId && isLegendaryId(loadout[focusedSlotId])
    ? findLegendary(loadout[focusedSlotId], legendary)
    : undefined;
  const focusedLegendarySlots = focusedLegendaryItem ? parseLegendaryAffixSlots(focusedLegendaryItem.affixes) : null;
  const focusedLegendaryLineIndex = focusedSlotId ? legendaryActiveLine[focusedSlotId] ?? null : null;
  const focusedLegendarySlot = focusedLegendarySlots && focusedLegendaryLineIndex !== null
    ? focusedLegendarySlots[focusedLegendaryLineIndex] ?? null
    : null;
  const focusedLegendarySelections = focusedSlotId ? legendarySlots[focusedSlotId]?.selections ?? {} : {};
  const focusedLegendarySelection = focusedLegendaryLineIndex !== null ? focusedLegendarySelections[focusedLegendaryLineIndex] ?? null : null;
  const focusedLegendaryOtherCorroded = focusedLegendarySlots
    ? focusedLegendarySlots.filter((_, i) => focusedLegendarySelections[i]?.corroded).length - (focusedLegendarySelection?.corroded ? 1 : 0)
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
            legendary={legendary}
            legendarySlots={legendarySlots}
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
          {focusedSlotId && isLegendaryId(loadout[focusedSlotId]) ? (
            (() => {
              const item = findLegendary(loadout[focusedSlotId], legendary);
              return item
                ? (
                  <LegendaryItemCard
                    item={item}
                    slotSelections={legendarySlots[focusedSlotId]?.selections ?? {}}
                    activeLineIndex={legendaryActiveLine[focusedSlotId] ?? null}
                    onActivateLine={(i) => handleActivateLegendaryLine(focusedSlotId, i)}
                    onClear={() => clearSlot(focusedSlotId)}
                  />
                )
                : <PlaceholderItemCard title="Loading legendary item…" />;
            })()
          ) : !focusedSlotId || !focused ? (
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
          {focusedSlotId && isLegendaryId(loadout[focusedSlotId]) ? (
            <LegendaryAffixPanel
              slot={focusedLegendarySlot}
              selection={focusedLegendarySelection}
              otherCorrodedCount={focusedLegendaryOtherCorroded}
              onSelect={(choice) => focusedLegendaryLineIndex !== null && handleSelectLegendaryLine(focusedSlotId, focusedLegendaryLineIndex, choice)}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
