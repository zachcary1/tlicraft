"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

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

// A legendary item's affixes are fixed (nothing to craft) except: for a "Randomly Chosen"
// line, which of its options is picked, and whether a line (up to 2 total on the item) has
// been corroded to T0+. Keyed by the affix line's index in its parsed slot list.
export interface LegendarySlotBuildData {
  selections: Record<number, { optionIndex: number; corroded: boolean }>;
}

export interface GearBuild {
  loadout: GearLoadout;
  slots: Partial<Record<GearSlotId, GearSlotBuildData>>;
  legendarySlots: Partial<Record<GearSlotId, LegendarySlotBuildData>>;
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
    legendarySlots: {},
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

const PROFILES_STORAGE_KEY = "tlicraft-profiles-v1";
// Pre-multi-profile storage key — migrated into a single "Personal" profile on first load.
const LEGACY_STORAGE_KEY = "tlicraft-build-v1";
const WRITE_DEBOUNCE_MS = 300;

// ─── Profiles ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  updatedAt: number;
  state: BuildState;
}

export type ProfileSummary = Omit<Profile, "state">;

function makeProfileId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

interface ProfilesState {
  profiles: Profile[];
  activeId: string;
}

function defaultProfilesState(seedState: BuildState = DEFAULT_BUILD_STATE): ProfilesState {
  const id = "default";
  return { profiles: [{ id, name: "Personal", updatedAt: Date.now(), state: seedState }], activeId: id };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BuildContextValue {
  state: BuildState;
  setState: Dispatch<SetStateAction<BuildState>>;
  profiles: Profile[];
  activeId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  importProfile: (name: string, state: BuildState) => void;
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
  const [{ profiles, activeId }, setProfilesState] = useState<ProfilesState>(() => defaultProfilesState());
  const hydrated = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once on mount — migrating the legacy single-build key
  // (from before multi-profile support existed) into a single "Personal" profile.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const restored: Profile[] = parsed.profiles.map((p: Partial<Profile>) => ({
          id: typeof p.id === "string" ? p.id : makeProfileId(),
          name: typeof p.name === "string" && p.name ? p.name : "Profile",
          updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
          state: mergeBuildState(p.state),
        }));
        const restoredActiveId = typeof parsed.activeId === "string" && restored.some((p) => p.id === parsed.activeId)
          ? parsed.activeId
          : restored[0].id;
        setProfilesState({ profiles: restored, activeId: restoredActiveId });
      } else {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        setProfilesState(defaultProfilesState(legacyRaw ? mergeBuildState(JSON.parse(legacyRaw)) : DEFAULT_BUILD_STATE));
      }
    } catch {
      // corrupt/invalid localStorage contents — fall back to a single default profile
      setProfilesState(defaultProfilesState());
    } finally {
      hydrated.current = true;
    }
  }, []);

  // Debounced persistence on every change (skip until hydration has run, so we
  // never clobber stored profiles with the pre-hydration default on first paint).
  useEffect(() => {
    if (!hydrated.current) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify({ profiles, activeId }));
      } catch {
        // storage full/unavailable — ignore, profiles just won't persist
      }
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [profiles, activeId]);

  // Stable across the provider's lifetime — each reads/writes via the `prev` passed into
  // setProfilesState, so none needs activeId/profiles in its closure or dependency array.
  const setState = useCallback<Dispatch<SetStateAction<BuildState>>>((updater) => {
    setProfilesState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => p.id !== prev.activeId ? p : {
        ...p,
        updatedAt: Date.now(),
        state: typeof updater === "function" ? (updater as (s: BuildState) => BuildState)(p.state) : updater,
      }),
    }));
  }, []);

  const switchProfile = useCallback((id: string) => {
    setProfilesState((prev) => prev.profiles.some((p) => p.id === id) ? { ...prev, activeId: id } : prev);
  }, []);

  const createProfile = useCallback((name: string) => {
    const id = makeProfileId();
    const trimmed = name.trim() || "New Profile";
    setProfilesState((prev) => ({
      profiles: [...prev.profiles, { id, name: trimmed, updatedAt: Date.now(), state: DEFAULT_BUILD_STATE }],
      activeId: id,
    }));
  }, []);

  const renameProfile = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfilesState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => p.id === id ? { ...p, name: trimmed } : p),
    }));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfilesState((prev) => {
      const remaining = prev.profiles.filter((p) => p.id !== id);
      const profiles = remaining.length > 0 ? remaining : defaultProfilesState().profiles;
      const activeId = prev.activeId === id ? profiles[0].id : prev.activeId;
      return { profiles, activeId };
    });
  }, []);

  // Adds the imported build as a new profile alongside the existing ones, rather than
  // overwriting whatever's currently active.
  const importProfile = useCallback((name: string, state: BuildState) => {
    const id = makeProfileId();
    const trimmed = name.trim() || "Imported Profile";
    setProfilesState((prev) => ({
      ...prev,
      profiles: [...prev.profiles, { id, name: trimmed, updatedAt: Date.now(), state: mergeBuildState(state) }],
    }));
  }, []);

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

  return (
    <BuildContext.Provider value={{ state: active.state, setState, profiles, activeId, switchProfile, createProfile, renameProfile, deleteProfile, importProfile }}>
      {children}
    </BuildContext.Provider>
  );
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

/** Read-only full build state of the active profile — for the Overview page. */
export function useBuildState(): BuildState {
  return useBuildContextInternal().state;
}

/** Profile list plus switch/create/delete/import actions — for the Profiles page. */
export function useProfiles(): {
  profiles: ProfileSummary[];
  activeId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  importProfile: (name: string, state: BuildState) => void;
} {
  const { profiles, activeId, switchProfile, createProfile, renameProfile, deleteProfile, importProfile } = useBuildContextInternal();
  const summaries = useMemo<ProfileSummary[]>(
    () => profiles.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
    [profiles],
  );
  return { profiles: summaries, activeId, switchProfile, createProfile, renameProfile, deleteProfile, importProfile };
}
