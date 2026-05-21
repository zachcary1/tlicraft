"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { AffixGroupType } from "@prisma/client";
import type { CraftedPool } from "@/services/crafting/types";
import type { ItemSlots, SlotValue, ActiveSlotId } from "./ItemCard";
import {
  getOptions,
  buildAffixLabel,
  sortTiers,
  nightmareLabel,
  getNightmareGroup,
  NIGHTMARE_GROUP_ORDER,
  NIGHTMARE_GROUP_ACCENT,
  TierBadge,
  GroupDot,
  getEffectiveTier,
  type NightmareGroup,
} from "./ItemCard";

// ─── Base affix categorization ───────────────────────────────────────────────

type BaseGroup = "Blessings" | "Damage" | "Defense" | "Stats" | "Special";
const BASE_GROUP_ORDER: BaseGroup[] = ["Blessings", "Damage", "Defense", "Stats", "Special"];
const BASE_GROUP_ACCENT: Record<BaseGroup, string> = {
  Blessings: "text-[#48b8ff]",
  Damage:    "text-red-400",
  Defense:   "text-blue-400",
  Stats:     "text-amber-400",
  Special:   "text-purple-300",
};

function getBaseGroup(affix: PoolAffix): BaseGroup {
  const statId = affix.tiers[0]?.stats[0]?.statId ?? "";
  const name = affix.name.toLowerCase();
  if (/blessing/.test(statId) || /blessing/.test(name)) {
    if (/max/.test(statId) || /max/.test(name)) return "Blessings";
  }
  if (/strength|dexterity|intelligence/.test(statId) || /strength|dexterity|intelligence/.test(name)) return "Stats";
  if (/penetration/.test(statId) || /penetration/.test(name)) return "Damage";
  if (/eliminat|execut|kill_threshold/.test(statId) || /eliminat|execut/.test(name)) return "Special";
  if (/life|armor|resistance|shield|defense|block|evasion|endurance/.test(statId) ||
      /life|armor|resist|shield|defense|block/.test(name)) return "Defense";
  if (/damage|attack|critical|slam|strike|spell|weapon/.test(statId) ||
      /damage|attack|critical/.test(name)) return "Damage";
  return "Special";
}

// ─── Dream affix categorization ──────────────────────────────────────────────

import type { PoolAffix } from "@/services/crafting/types";

type DreamGroup = "Blessings" | "Damage" | "Defense" | "Stats" | "Special";
const DREAM_GROUP_ORDER: DreamGroup[] = ["Blessings", "Damage", "Defense", "Stats", "Special"];
const DREAM_GROUP_ACCENT: Record<DreamGroup, string> = {
  Blessings: "text-[#48b8ff]",
  Damage:    "text-red-400",
  Defense:   "text-blue-400",
  Stats:     "text-amber-400",
  Special:   "text-purple-300",
};

function getDreamGroup(affix: PoolAffix): DreamGroup {
  const statId = affix.tiers[0]?.stats[0]?.statId ?? "";
  const name = affix.name.toLowerCase();
  if (/blessing/.test(statId) || /blessing/.test(name)) {
    if (/max/.test(statId) || /max/.test(name)) return "Blessings";
  }
  if (/strength|dexterity|intelligence/.test(statId) ||
      /strength|dexterity|intelligence/.test(name)) return "Stats";
  if (/penetration/.test(statId) || /penetration/.test(name)) return "Damage";
  if (/eliminat|execut|kill_threshold/.test(statId) || /eliminat|execut/.test(name)) return "Special";
  if (/life|armor|resistance|shield|defense|block|evasion|endurance/.test(statId) ||
      /life|armor|resist|shield|defense|block/.test(name)) return "Defense";
  if (/damage|attack|critical|slam|strike|spell/.test(statId) ||
      /damage|attack|critical/.test(name)) return "Damage";
  return "Special";
}

// ─── Portaled tooltip row ─────────────────────────────────────────────────────

function TooltipRow({ tooltip, children, rowKey }: { tooltip: string | null; children: React.ReactNode; rowKey: string }) {
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      key={rowKey}
      ref={ref}
      className="relative flex gap-1"
      onMouseEnter={() => {
        if (!tooltip || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left + rect.width / 2 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {tooltip && pos && typeof document !== "undefined" && createPortal(
        <span
          style={{ position: "fixed", bottom: pos.bottom, left: pos.left, transform: "translateX(-50%)", zIndex: 9999 }}
          className="px-2.5 py-1.5 rounded text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap pointer-events-none"
        >
          {tooltip}
        </span>,
        document.body
      )}
    </div>
  );
}

// ─── Inline tier picker ───────────────────────────────────────────────────────

function InlineTierPicker({
  tiers,
  selectedTier,
  onSelect,
  disabledTiers = [],
  disabledTierMessage = "T0+ limit reached (max 2 per item)",
}: {
  tiers: { tier: string; stats: { minValue: number; maxValue: number; unit: string }[] }[];
  selectedTier: string;
  onSelect: (tier: string) => void;
  disabledTiers?: string[];
  disabledTierMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="shrink-0 self-stretch">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="h-full flex items-center gap-1.5 px-2 bg-[#2a2929] border border-[#535357] hover:bg-[#343333] transition-colors focus:outline-none"
        style={{ borderRadius: "0 8px 0 8px" }}
      >
        <TierBadge tier={selectedTier} />
        <svg className="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", bottom: pos.bottom, left: pos.left, zIndex: 9999, minWidth: 120, background: "#1a1919", border: "1px solid #535357", borderRadius: "0 8px 0 8px" }}
          className="py-0.5 shadow-xl"
        >
          {tiers.map((t) => {
            const isSelected = t.tier === selectedTier;
            const isDisabled = disabledTiers.includes(t.tier);
            const stats = t.stats.length > 0
              ? t.stats.map((s) => {
                  const r = s.minValue === s.maxValue ? `${s.minValue}` : `${s.minValue}–${s.maxValue}`;
                  return s.unit === "PERCENT" ? `${r}%` : r;
                }).join(", ")
              : "";
            return (
              <div key={t.tier} className="relative group/tdisabled">
                <button
                  onClick={isDisabled ? undefined : (e) => { e.stopPropagation(); onSelect(t.tier); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    isDisabled
                      ? "opacity-40"
                      : isSelected ? "bg-[#3a3838]" : "hover:bg-[#2e2d2d]"
                  }`}
                  style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
                >
                  <TierBadge tier={t.tier} />
                  {stats && <span className="text-zinc-400 text-[11px]">{stats}</span>}
                </button>
                {isDisabled && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/tdisabled:opacity-100 transition-opacity z-[10000]">
                    {disabledTierMessage}
                  </span>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Group definitions per slot ───────────────────────────────────────────────

type GroupDef = {
  label: string;
  groupTypes: AffixGroupType[];
  accent?: string;
};

function getGroupDefs(slot: ActiveSlotId): GroupDef[] {
  switch (slot) {
    case "base": return [
      { label: "Base Affix",           groupTypes: ["BASE_AFFIXES"] },
      { label: "Corroded Base Affix",  groupTypes: ["CORROSION_BASE_AFFIXES"] },
    ];
    case "dream": return [
      { label: "Dream Affix", groupTypes: ["SWEET_DREAM_AFFIXES"], accent: "text-[#48b8ff]" },
    ];
    case "nightmare": return [
      { label: "Nightmare Affix", groupTypes: ["NIGHTMARE_AFFIXES"], accent: "text-[#c64a28]" },
    ];
    case "sequence": return [
      { label: "Intermediate Sequence", groupTypes: ["INTERMEDIATE_SEQUENCES"], accent: "text-emerald-400" },
      { label: "Advanced Sequence",     groupTypes: ["ADVANCED_SEQUENCES"],     accent: "text-emerald-400" },
    ];
    case "prefix1": case "prefix2": case "prefix3": return [
      { label: "Basic Affix",    groupTypes: ["BASIC_PREFIXES"] },
      { label: "Advanced Affix", groupTypes: ["ADVANCED_PREFIXES"], accent: "text-sky-400" },
      { label: "Ultimate Affix", groupTypes: ["ULTIMATE_PREFIXES"], accent: "text-amber-400" },
    ];
    case "suffix1": case "suffix2": case "suffix3": return [
      { label: "Basic Affix",    groupTypes: ["BASIC_SUFFIXES"] },
      { label: "Advanced Affix", groupTypes: ["ADVANCED_SUFFIXES"], accent: "text-sky-400" },
      { label: "Ultimate Affix", groupTypes: ["ULTIMATE_SUFFIXES"], accent: "text-amber-400" },
    ];
  }
}

function slotLabel(slot: ActiveSlotId): string {
  switch (slot) {
    case "base":      return "Base Affix";
    case "dream":     return "Dream Affix";
    case "nightmare": return "Nightmare Affix";
    case "sequence":  return "Sequence Affix";
    case "prefix1":   return "Prefix 1";
    case "prefix2":   return "Prefix 2";
    case "prefix3":   return "Prefix 3";
    case "suffix1":   return "Suffix 1";
    case "suffix2":   return "Suffix 2";
    case "suffix3":   return "Suffix 3";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  pool: CraftedPool | null;
  slots: ItemSlots;
  activeSlot: ActiveSlotId | null;
  onChange: (slots: ItemSlots) => void;
  dreamsFull?: boolean;
  advancedCount: number;
  ultimateCount: number;
  t0PlusCount: number;
  takenAffixIds: Partial<Record<ActiveSlotId, Set<string>>>;
};

// ─── AffixPanel ───────────────────────────────────────────────────────────────

export default function AffixPanel({
  pool,
  slots,
  activeSlot,
  onChange,
  dreamsFull = false,
  advancedCount,
  ultimateCount,
  t0PlusCount,
  takenAffixIds,
}: Props) {
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  // When the active slot changes, jump to the group tab that contains the already-selected affix.
  useEffect(() => {
    if (!activeSlot || activeSlot === "nightmare") { setActiveGroupIdx(0); return; }
    const value = slotsRef.current[activeSlot as keyof typeof slotsRef.current] as import("./ItemCard").SlotValue;
    if (!value?.sourceGroup) { setActiveGroupIdx(0); return; }
    const defs = getGroupDefs(activeSlot);
    const idx = defs.findIndex((g) => (g.groupTypes as string[]).includes(value.sourceGroup));
    setActiveGroupIdx(idx >= 0 ? idx : 0);
  }, [activeSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty / no-pool state ──
  if (!pool || !activeSlot) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{
          height: "100vh",
          background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
        }}
      >
        <p className="text-center text-[20px] font-semibold whitespace-nowrap" style={{ color: "#d92020" }}>
          Select the affix location for crafting
        </p>
      </div>
    );
  }

  const groupDefs = getGroupDefs(activeSlot);
  const currentGroup = groupDefs[activeGroupIdx] ?? groupDefs[0];
  const isNightmare = activeSlot === "nightmare";
  const isPrefixSuffix = ["prefix1","prefix2","prefix3","suffix1","suffix2","suffix3"].includes(activeSlot);

  // Gather options for the active group tab
  const options = currentGroup.groupTypes.flatMap((gt) => getOptions(pool, gt));

  // Current selection state
  const currentValue = (activeSlot !== "nightmare" ? slots[activeSlot as keyof typeof slots] : null) as SlotValue;
  const nightmareSelectedIds = new Set(slots.nightmare.map((v) => v.affixId));
  const taken = takenAffixIds[activeSlot] ?? new Set<string>();

  // Disabled flags for advanced/ultimate
  const isAdvancedGroup = ["ADVANCED_PREFIXES","ADVANCED_SUFFIXES"].some((g) => currentGroup.groupTypes.includes(g as AffixGroupType));
  const isUltimateGroup = ["ULTIMATE_PREFIXES","ULTIMATE_SUFFIXES"].some((g) => currentGroup.groupTypes.includes(g as AffixGroupType));
  const advDisabled = isAdvancedGroup && advancedCount >= 2 && currentValue?.sourceGroup !== currentGroup.groupTypes[0];
  const ultDisabled = isUltimateGroup && ultimateCount >= 2 && currentValue?.sourceGroup !== currentGroup.groupTypes[0];
  const groupDisabled = advDisabled || ultDisabled;

  function selectAffix(affixId: string, groupType: AffixGroupType) {
    if (isNightmare) {
      if (nightmareSelectedIds.has(affixId)) {
        onChange({ ...slots, nightmare: slots.nightmare.filter((v) => v.affixId !== affixId) });
      } else {
        const opt = options.find((o) => o.affix.id === affixId);
        if (!opt) return;
        onChange({
          ...slots,
          nightmare: [
            ...slots.nightmare,
            { affixId: opt.affix.id, affixName: opt.affix.name, tier: opt.affix.tiers[0]?.tier ?? "", sourceGroup: opt.sourceGroup },
          ],
        });
      }
      return;
    }

    // Toggle off if already selected
    if (currentValue?.affixId === affixId) {
      onChange({ ...slots, [activeSlot]: null });
      return;
    }

    const opt = options.find((o) => o.affix.id === affixId);
    if (!opt) return;
    const sorted = sortTiers(opt.affix.tiers);
    const defaultTier = sorted.find((t) => t.tier === "T1") ?? sorted[sorted.length - 1];
    onChange({
      ...slots,
      [activeSlot]: {
        affixId: opt.affix.id,
        affixName: opt.affix.name,
        tier: defaultTier?.tier ?? "",
        sourceGroup: opt.sourceGroup,
      },
    });
  }

  function clearSlot() {
    if (isNightmare) {
      onChange({ ...slots, nightmare: [] });
    } else {
      onChange({ ...slots, [activeSlot]: null });
    }
  }

  // ── Nightmare: group affixes by category ──
  type NightmareGrouped = Map<NightmareGroup, { affix: ReturnType<typeof getOptions>[number]["affix"]; sourceGroup: AffixGroupType }[]>;
  let nightmareGrouped: NightmareGrouped | null = null;
  if (isNightmare) {
    nightmareGrouped = new Map(NIGHTMARE_GROUP_ORDER.map((g) => [g, []]));
    for (const opt of options) {
      const statId = opt.affix.tiers[0]?.stats[0]?.statId ?? "";
      nightmareGrouped.get(getNightmareGroup(statId))!.push({ affix: opt.affix, sourceGroup: opt.sourceGroup });
    }
    for (const list of nightmareGrouped.values()) {
      list.sort((a, b) => a.affix.name.localeCompare(b.affix.name));
    }
  }

  return (
    <div
      className="w-full flex flex-col"
      style={{
        height: "100vh",
        background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
      }}
    >
      {/* Slot label */}
      <div className="px-4 pt-5 pb-3 border-b border-[#3a3838]">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-0.5">Selecting</p>
        <p className="text-[15px] font-semibold text-[#e0ddd8]">{slotLabel(activeSlot)}</p>
      </div>

      {/* Group tabs */}
      <div className="flex flex-row flex-wrap justify-center gap-3 px-6 pt-16">
          {groupDefs.map((g, i) => (
            <div key={g.label} className="relative flex flex-col items-center">
              <button
                onClick={() => setActiveGroupIdx(i)}
                className={`px-6 py-4 text-[16px] font-semibold transition-colors ${
                  i === activeGroupIdx
                    ? "text-[#000000]"
                    : "text-[#ffffff] hover:opacity-80"
                }`}
                style={{
                  backgroundColor: i === activeGroupIdx ? "#ffde1f" : "#0c0c0c",
                  borderRadius: "12px 0 12px 0",
                  boxShadow: i === activeGroupIdx
                    ? "0 6px 10px rgba(255,222,31,0.4), 5px 3px 8px rgba(255,222,31,0.2), -5px 3px 8px rgba(255,222,31,0.2)"
                    : "0 3px 6px rgba(0,0,0,0.4)",
                }}
              >
                {g.label}
              </button>
              {i === activeGroupIdx && (
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "12px solid transparent",
                    borderRight: "12px solid transparent",
                    borderTop: "12px solid #ffde1f",
                    filter: "drop-shadow(0 4px 6px rgba(255,222,31,0.5))",
                  }}
                />
              )}
            </div>
          ))}
      </div>

      {/* Clear button — always rendered to prevent layout shift */}
      <div className="mx-3 mt-8 mb-[10px] flex justify-end">
        {(() => {
          const hasSelection = isNightmare ? slots.nightmare.length > 0 : currentValue !== null;
          return (
            <button
              onClick={hasSelection ? clearSlot : undefined}
              disabled={!hasSelection}
              className="px-4 py-1.5 rounded-sm text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: hasSelection ? "#c0392b" : "#1e1e1e", color: hasSelection ? "white" : "#555555", cursor: hasSelection ? "pointer" : "not-allowed", boxShadow: "0 3px 6px rgba(0,0,0,0.4)" }}
            >
              ✕ Clear selection
            </button>
          );
        })()}
      </div>

      {/* Affix list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {groupDisabled && (
          <p className="text-xs text-red-400 font-semibold px-1 mb-2">Limit reached for this tier</p>
        )}
        {isNightmare && nightmareGrouped ? (
          // Nightmare: grouped list with checkboxes
          <div className="space-y-4">
            {NIGHTMARE_GROUP_ORDER.map((group) => {
              const opts = nightmareGrouped!.get(group)!;
              if (opts.length === 0) return null;
              const groupSelectedIds = opts.filter(({ affix }) => nightmareSelectedIds.has(affix.id)).map(({ affix }) => affix.id);
              const allSelected = groupSelectedIds.length === opts.length;
              const minionOpts = group === "Damage"
                ? opts.filter(({ affix }) => /minion/.test(affix.tiers[0]?.stats[0]?.statId ?? ""))
                : [];
              const allMinionsSelected = minionOpts.length > 0 && minionOpts.every(({ affix }) => nightmareSelectedIds.has(affix.id));

              function selectAll() {
                const toAdd = opts.filter(({ affix }) => !nightmareSelectedIds.has(affix.id));
                onChange({ ...slots, nightmare: [...slots.nightmare, ...toAdd.map(({ affix, sourceGroup }) => ({ affixId: affix.id, affixName: affix.name, tier: affix.tiers[0]?.tier ?? "", sourceGroup }))] });
              }
              function selectNone() {
                const ids = new Set(opts.map(({ affix }) => affix.id));
                onChange({ ...slots, nightmare: slots.nightmare.filter((v) => !ids.has(v.affixId)) });
              }
              function selectAllMinions() {
                const toAdd = minionOpts.filter(({ affix }) => !nightmareSelectedIds.has(affix.id));
                onChange({ ...slots, nightmare: [...slots.nightmare, ...toAdd.map(({ affix, sourceGroup }) => ({ affixId: affix.id, affixName: affix.name, tier: affix.tiers[0]?.tier ?? "", sourceGroup }))] });
              }
              function selectNoneMinions() {
                const ids = new Set(minionOpts.map(({ affix }) => affix.id));
                onChange({ ...slots, nightmare: slots.nightmare.filter((v) => !ids.has(v.affixId)) });
              }

              return (
                <div key={group}>
                  <div className="flex items-center mb-1.5">
                    <button
                      onClick={allSelected ? selectNone : selectAll}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <span className={`text-[16px] font-bold uppercase tracking-wider ${NIGHTMARE_GROUP_ACCENT[group]}`}>{group}</span>
                      <span className="text-[10px] text-zinc-500">
                        {allSelected ? "deselect all" : "select all"}
                      </span>
                    </button>
                    {minionOpts.length > 0 && (
                      <button onClick={allMinionsSelected ? selectNoneMinions : selectAllMinions} className="ml-auto text-[16px] font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-300 transition-colors">
                        {allMinionsSelected ? "Deselect Minions" : "Minion Affixes"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {opts.map(({ affix, sourceGroup }) => {
                      const checked = nightmareSelectedIds.has(affix.id);
                      return (
                        <label
                          key={affix.id}
                          className="flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors"
                          style={{
                            border: "2px solid #535357",
                            backgroundColor: checked ? "#e0ddd8" : "#3d3c3c",
                            borderRadius: "0 10px 0 10px",
                            boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="shrink-0 mt-0.5 accent-[#e0ddd8]"
                            checked={checked}
                            onChange={() => selectAffix(affix.id, sourceGroup)}
                          />
                          <span className={`text-[14px] leading-snug ${checked ? "text-[#1a2028]" : "text-white"}`}>{nightmareLabel(affix)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeSlot === "dream" ? (
          // Dream affixes — categorized into Blessings / Damage / Special
          <div className="space-y-4">
            {DREAM_GROUP_ORDER.map((group) => {
              const groupOpts = options.filter(({ affix }) => getDreamGroup(affix) === group);
              if (groupOpts.length === 0) return null;
              return (
                <div key={group}>
                  <p className={`text-[16px] font-bold uppercase tracking-wider mb-1.5 ${DREAM_GROUP_ACCENT[group]}`}>{group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {groupOpts.map(({ affix, sourceGroup }) => {
                      const isSelected = currentValue?.affixId === affix.id;
                      const isTakenByOther = taken.has(affix.id);
                      const isUnavailable = isTakenByOther || groupDisabled;
                      const tooltipText = isTakenByOther ? "Already selected in another slot" : groupDisabled ? "Limit reached for this tier" : null;
                      const displayLabel = buildAffixLabel(affix, isSelected ? currentValue?.tier : undefined);
                      const tier = getEffectiveTier(sourceGroup, affix);
                      return (
                        <button
                          key={`${sourceGroup}-${affix.id}`}
                          onClick={() => !isUnavailable && selectAffix(affix.id, sourceGroup)}
                          className={`relative w-full text-left px-3 py-3 text-[14px] transition-all leading-snug group/tip ${
                            !isUnavailable && !isSelected ? "hover:brightness-110" : ""
                          }`}
                          style={{
                            border: `2px solid ${isUnavailable ? "#383737" : "#535357"}`,
                            backgroundColor: isSelected ? "#e0ddd8" : isUnavailable ? "#252424" : "#3d3c3c",
                            borderRadius: "0 10px 0 10px",
                            cursor: isUnavailable ? "not-allowed" : "pointer",
                            color: isSelected ? "#1a2028" : isUnavailable ? "#555555" : "#ffffff",
                            boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {tier && <TierBadge tier={tier} />}
                            <span>{displayLabel}</span>
                          </span>
                          {isUnavailable && tooltipText && (
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded text-xs text-white bg-[#1a1a1a] border border-[#535357] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                              {tooltipText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeSlot === "base" && currentGroup.groupTypes.includes("BASE_AFFIXES" as AffixGroupType) ? (
          // Base affixes — categorized like dream affixes
          <div className="space-y-4">
            {BASE_GROUP_ORDER.map((group) => {
              const groupOpts = options.filter(({ affix }) => getBaseGroup(affix) === group);
              if (groupOpts.length === 0) return null;
              return (
                <div key={group}>
                  <p className={`text-[16px] font-bold uppercase tracking-wider mb-1.5 ${BASE_GROUP_ACCENT[group]}`}>{group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {groupOpts.map(({ affix, sourceGroup }) => {
                      const isSelected = currentValue?.affixId === affix.id;
                      const isTakenByOther = taken.has(affix.id);
                      const isUnavailable = isTakenByOther || groupDisabled;
                      const tooltipText = isTakenByOther ? "Already selected in another slot" : groupDisabled ? "Limit reached for this tier" : null;
                      const displayLabel = buildAffixLabel(affix, isSelected ? currentValue?.tier : undefined);
                      const tier = getEffectiveTier(sourceGroup, affix);
                      return (
                        <TooltipRow key={`${sourceGroup}-${affix.id}`} rowKey={`${sourceGroup}-${affix.id}`} tooltip={isUnavailable ? (tooltipText ?? null) : null}>
                          <button
                            onClick={() => !isUnavailable && selectAffix(affix.id, sourceGroup)}
                            className={`relative w-full text-left px-3 py-3 text-[14px] transition-all leading-snug ${
                              !isUnavailable && !isSelected ? "hover:brightness-110" : ""
                            }`}
                            style={{
                              border: `2px solid ${isUnavailable ? "#383737" : "#535357"}`,
                              backgroundColor: isSelected ? "#e0ddd8" : isUnavailable ? "#252424" : "#3d3c3c",
                              borderRadius: "0 10px 0 10px",
                              cursor: isUnavailable ? "not-allowed" : "pointer",
                              color: isSelected ? "#1a2028" : isUnavailable ? "#555555" : "#ffffff",
                              boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                            }}
                          >
                            <span className="flex items-center gap-2">
                              {tier && <TierBadge tier={tier} />}
                              <span>{displayLabel}</span>
                            </span>
                          </button>
                        </TooltipRow>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Single-select list (corroded base, sequence, prefix/suffix)
          <div className={activeSlot === "base" ? "grid grid-cols-2 gap-1" : "space-y-1"}>
          {(() => {
            const isCorrodedBaseGroup = currentGroup.groupTypes.includes("CORROSION_BASE_AFFIXES" as AffixGroupType);
            const corrodedBaseBlocked = isCorrodedBaseGroup && t0PlusCount > 0;
            return options.map(({ affix, sourceGroup }) => {
            const isSelected = currentValue?.affixId === affix.id;
            const isTakenByOther = taken.has(affix.id);
            const isUnavailable = isTakenByOther || groupDisabled || corrodedBaseBlocked;
            const tooltipText = corrodedBaseBlocked
              ? "Cannot use corroded base — T0+ prefix/suffix affix already selected (corrosion is one-time per item)"
              : isTakenByOther
              ? "Already selected in another slot"
              : groupDisabled
              ? "Limit reached for this tier"
              : null;
            const displayLabel = buildAffixLabel(affix, isSelected ? currentValue?.tier : undefined);
            const sortedTiers = sortTiers(affix.tiers);
            const showTier = activeSlot === "base" || isPrefixSuffix;
            const tier = activeSlot === "base"
              ? getEffectiveTier(sourceGroup, affix)
              : isPrefixSuffix
              ? (isSelected ? currentValue!.tier : (sortedTiers.find((t) => t.tier === "T1") ?? sortedTiers[sortedTiers.length - 1])?.tier ?? "")
              : "";
            const sequenceDotColor = activeSlot === "sequence"
              ? sourceGroup === "INTERMEDIATE_SEQUENCES" ? "#fd7c1c" : "#fd0000"
              : null;
            const showTierPicker = isSelected && sortedTiers.length > 1;
            return (
              <TooltipRow key={`${sourceGroup}-${affix.id}`} rowKey={`${sourceGroup}-${affix.id}`} tooltip={isUnavailable ? (tooltipText ?? null) : null}>
                {showTierPicker && (
                  <InlineTierPicker
                    tiers={sortedTiers}
                    selectedTier={currentValue!.tier}
                    onSelect={(t) => onChange({ ...slots, [activeSlot]: { ...currentValue!, tier: t } })}
                    disabledTiers={(() => {
                      if (!isPrefixSuffix || currentValue?.tier === "T0_PLUS") return [];
                      if (slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES") return ["T0_PLUS"];
                      if (t0PlusCount >= 2) return ["T0_PLUS"];
                      return [];
                    })()}
                    disabledTierMessage={slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES"
                      ? "Cannot use T0+ — corroded base affix already selected (corrosion is one-time per item)"
                      : "T0+ limit reached (max 2 per item)"}
                  />
                )}
                <button
                  onClick={() => !isUnavailable && selectAffix(affix.id, sourceGroup)}
                  className={`flex-1 min-w-0 text-left px-3 text-[14px] transition-all leading-snug ${
                    isPrefixSuffix ? "py-4" : "py-3"
                  } ${!isUnavailable && !isSelected ? "hover:brightness-110" : ""}`}
                  style={{
                    border: `2px solid ${isUnavailable ? "#383737" : "#535357"}`,
                    backgroundColor: isSelected ? "#e0ddd8" : isUnavailable ? "#252424" : "#3d3c3c",
                    borderRadius: "0 10px 0 10px",
                    cursor: isUnavailable ? "not-allowed" : "pointer",
                    color: isSelected ? "#1a2028" : isUnavailable ? "#555555" : "#ffffff",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                  }}
                >
                  {showTier && tier && !showTierPicker ? (
                    <span className="flex items-center gap-2">
                      <TierBadge tier={tier} />
                      <span>{displayLabel}</span>
                    </span>
                  ) : sequenceDotColor ? (
                    <span className="flex items-center gap-2">
                      <GroupDot color={sequenceDotColor} />
                      <span>{displayLabel}</span>
                    </span>
                  ) : displayLabel}
                </button>
              </TooltipRow>
            );
          });
          })()}
          </div>
        )}
      </div>

    </div>
  );
}
