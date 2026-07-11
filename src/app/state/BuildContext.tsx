"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { EMPTY_LOADOUT, type GearLoadout, type GearSlotId } from "@/app/crafting/GearPanel";
import { EMPTY_SLOTS, EMPTY_RESOURCE_PRICES, type ItemSlots, type ResourcePrices } from "@/app/crafting/ItemCard";
import type { FateKey, FateState } from "@/app/pactspirits/page";
import type { HeroEntry, MemoryQuality, MemorySlotSelections } from "@/app/hero-trait/page";
import type { Sel, TreeProgress } from "@/app/talents/page";
import type { PlacedInstance } from "@/app/divinity-slates/slateData";

// ─── Build state shape ──────────────────────────────────────────────────────────

export interface GearSlotBuildData {
  itemSlots: ItemSlots;
  baseCostFE: string;
  shallowCostFE: string;
  modCostFE: string;
  corrosionCostFE: string;
  resourcePrices: ResourcePrices;
}

export interface GearBuild {
  loadout: GearLoadout;
  slots: Partial<Record<GearSlotId, GearSlotBuildData>>;
}

export interface SkillsBuild {
  activeSkillSelections: (string | null)[];
  passiveSkillSelections: (string | null)[];
  supportSelections: Record<string, string>;
}

export interface PactspiritsBuild {
  slotSelections: Record<string, string>;
  fates: Record<FateKey, FateState>;
  fateSelections: Record<string, string>;
}

export interface HeroTraitBuild {
  selectedHero: HeroEntry | null;
  memoryFilled: [boolean, boolean, boolean];
  memoryQuality: [MemoryQuality | null, MemoryQuality | null, MemoryQuality | null];
  memorySelections: [MemorySlotSelections, MemorySlotSelections, MemorySlotSelections];
  traitSelections: [string | null, string | null, string | null];
}

export interface TalentsBuild {
  slots: (Sel | null)[];
  progress: Record<string, TreeProgress>;
}

export interface DivinitySlatesBuild {
  placedInstances: PlacedInstance[];
}

// Mirrors hero-trait/page.tsx's EMPTY_MEMORY_SELECTIONS. Kept as a local literal (rather than
// imported) so this module has no runtime dependency on the page files whose hooks it exports —
// those pages import *from* here, and a runtime cycle would make hydration order fragile.
const EMPTY_MEMORY_SELECTIONS: MemorySlotSelections = {
  base: null, prefix1: null, prefix2: null, suffix1: null, suffix2: null,
};

export interface BuildState {
  gear: GearBuild;
  skills: SkillsBuild;
  pactspirits: PactspiritsBuild;
  heroTrait: HeroTraitBuild;
  talents: TalentsBuild;
  divinitySlates: DivinitySlatesBuild;
}

export const DEFAULT_BUILD_STATE: BuildState = {
  gear: {
    loadout: EMPTY_LOADOUT,
    slots: {},
  },
  skills: {
    activeSkillSelections: Array(5).fill(null),
    passiveSkillSelections: Array(4).fill(null),
    supportSelections: {},
  },
  pactspirits: {
    slotSelections: {},
    fates: {
      left:   { nodes: [] },
      right:  { nodes: [] },
      bottom: { nodes: [] },
    },
    fateSelections: {},
  },
  heroTrait: {
    selectedHero: null,
    memoryFilled: [false, false, false],
    memoryQuality: [null, null, null],
    memorySelections: [EMPTY_MEMORY_SELECTIONS, EMPTY_MEMORY_SELECTIONS, EMPTY_MEMORY_SELECTIONS],
    traitSelections: [null, null, null],
  },
  talents: {
    slots: [null, null, null, null],
    progress: {},
  },
  divinitySlates: {
    placedInstances: [],
  },
};

export { EMPTY_SLOTS, EMPTY_RESOURCE_PRICES };

const STORAGE_KEY = "tlicraft-build-v1";
const WRITE_DEBOUNCE_MS = 300;

// ─── Context ──────────────────────────────────────────────────────────────────

interface BuildContextValue {
  state: BuildState;
  setState: Dispatch<SetStateAction<BuildState>>;
}

const BuildContext = createContext<BuildContextValue | null>(null);

function mergeBuildState(partial: unknown): BuildState {
  if (!partial || typeof partial !== "object") return DEFAULT_BUILD_STATE;
  const p = partial as Partial<BuildState>;
  return {
    gear:           { ...DEFAULT_BUILD_STATE.gear,           ...p.gear },
    skills:         { ...DEFAULT_BUILD_STATE.skills,         ...p.skills },
    pactspirits:    { ...DEFAULT_BUILD_STATE.pactspirits,    ...p.pactspirits },
    heroTrait:      { ...DEFAULT_BUILD_STATE.heroTrait,      ...p.heroTrait },
    talents:        { ...DEFAULT_BUILD_STATE.talents,        ...p.talents },
    divinitySlates: { ...DEFAULT_BUILD_STATE.divinitySlates, ...p.divinitySlates },
  };
}

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BuildState>(DEFAULT_BUILD_STATE);
  const hydrated = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(mergeBuildState(JSON.parse(raw)));
    } catch {
      // corrupt/invalid localStorage contents — fall back to defaults
    } finally {
      hydrated.current = true;
    }
  }, []);

  // Debounced persistence on every change (skip until hydration has run, so we
  // never clobber a stored build with the pre-hydration default on first paint).
  useEffect(() => {
    if (!hydrated.current) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full/unavailable — ignore, build just won't persist
      }
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state]);

  return <BuildContext.Provider value={{ state, setState }}>{children}</BuildContext.Provider>;
}

function useBuildContextInternal(): BuildContextValue {
  const ctx = useContext(BuildContext);
  if (!ctx) throw new Error("useBuild* hooks must be used within a <BuildProvider>");
  return ctx;
}

function useBuildSlice<K extends keyof BuildState>(
  key: K,
): [BuildState[K], Dispatch<SetStateAction<BuildState[K]>>] {
  const { state, setState } = useBuildContextInternal();
  const setSlice = useCallback<Dispatch<SetStateAction<BuildState[K]>>>((updater) => {
    setState(prev => ({
      ...prev,
      [key]: typeof updater === "function"
        ? (updater as (p: BuildState[K]) => BuildState[K])(prev[key])
        : updater,
    }));
  }, [key, setState]);
  return [state[key], setSlice];
}

// ─── Public hooks ─────────────────────────────────────────────────────────────

export function useGearBuild()           { return useBuildSlice("gear"); }
export function useSkillsBuild()         { return useBuildSlice("skills"); }
export function usePactspiritsBuild()    { return useBuildSlice("pactspirits"); }
export function useHeroTraitBuild()      { return useBuildSlice("heroTrait"); }
export function useTalentsBuild()        { return useBuildSlice("talents"); }
export function useDivinitySlatesBuild() { return useBuildSlice("divinitySlates"); }

/** Read-only full build state — for the Overview page. */
export function useBuildState(): BuildState {
  return useBuildContextInternal().state;
}

/** Wholesale replace the entire build — for the import-build-code flow. */
export function useReplaceBuildState(): (next: BuildState) => void {
  const { setState } = useBuildContextInternal();
  return useCallback((next: BuildState) => setState(mergeBuildState(next)), [setState]);
}
