"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import type { CraftedPool } from "@/services/crafting/types";
import ItemCard, {
  EMPTY_SLOTS,
  EMPTY_RESOURCE_PRICES,
  computeCraftCostLines,
  computeCorrosionTotal,
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

  const dreamCount = (Object.keys(slotDataMap) as GearSlotId[]).filter(
    (id) => slotDataMap[id]?.itemSlots.dream !== null
  ).length;

  const costTotals = Object.fromEntries(
    (Object.keys(slotDataMap) as GearSlotId[]).map((id) => {
      const d = slotDataMap[id];
      if (!d?.poolData) return [id, { craft: null, corrosion: null }];
      const { total: craft } = computeCraftCostLines(d.poolData, d.itemSlots, d.baseCostFE, d.shallowCostFE, d.modCostFE, d.resourcePrices);
      const corrosion = computeCorrosionTotal(d.poolData, d.itemSlots, d.baseCostFE, d.shallowCostFE, d.modCostFE, d.resourcePrices, d.corrosionCostFE);
      return [id, { craft, corrosion }];
    })
  ) as Partial<Record<GearSlotId, { craft: number | null; corrosion: number | null }>>;

  return (
    <Container fluid className="min-vh-100 py-4 px-4">
      <h1 className="fw-bold mb-4 fs-4">Crafting Calculator</h1>
      <Row className="min-vh-100">
        {/* Left: gear panel */}
        <Col className="d-flex justify-content-end align-items-start pe-4 border-end" style={{ borderColor: "var(--zinc-800)" }}>
          {loadingPools ? (
            <p className="text-secondary small">Loading pools...</p>
          ) : (
            <GearPanel
              pools={pools}
              loadout={loadout}
              activeSlotId={activeSlotId}
              focusedSlotId={focusedSlotId}
              psCounts={psCounts}
              costTotals={costTotals}
              dreamCount={dreamCount}
              onSlotOpen={(id) => setActiveSlotId((prev) => (prev === id ? null : id))}
              onSlotFocus={(id) => setFocusedSlotId(id)}
              onSlotClose={() => setActiveSlotId(null)}
              onSelect={handleSlotSelect}
            />
          )}
        </Col>

        {/* Right: item builder */}
        <Col className="ps-4">
          {!focusedSlotId || !focused ? (
            <p className="text-secondary small">Select a gear slot to start configuring.</p>
          ) : focused.loading ? (
            <p className="text-secondary small">Loading pool...</p>
          ) : focused.poolData ? (
            <div style={{ maxWidth: "48rem" }}>
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
              />
            </div>
          ) : null}
        </Col>
      </Row>
    </Container>
  );
}
