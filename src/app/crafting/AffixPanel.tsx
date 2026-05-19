"use client";

import { useState, useEffect } from "react";
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
  displayTier,
  tierTextColor,
  type NightmareGroup,
} from "./ItemCard";

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
      { label: "Sequence Affix", groupTypes: ["INTERMEDIATE_SEQUENCES", "ADVANCED_SEQUENCES"], accent: "text-emerald-400" },
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
  takenAffixIds,
}: Props) {
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  // Reset selected group tab when the active slot changes
  useEffect(() => {
    setActiveGroupIdx(0);
  }, [activeSlot]);

  // ── Empty / no-pool state ──
  if (!pool || !activeSlot) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
        }}
      >
        <p className="text-center text-zinc-500 text-sm px-6 leading-relaxed">
          Select the affix location<br />for crafting
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
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
      }}
    >
      {/* Slot label */}
      <div className="px-4 pt-5 pb-3 border-b border-[#3a3838]">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-0.5">Selecting</p>
        <p className="text-[15px] font-semibold text-[#e0ddd8]">{slotLabel(activeSlot)}</p>
      </div>

      {/* Group tabs */}
      {groupDefs.length > 1 && (
        <div className="flex flex-col gap-1 px-3 pt-3">
          {groupDefs.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setActiveGroupIdx(i)}
              className={`w-full text-left px-3 py-2 rounded-sm text-[13px] font-semibold transition-colors ${
                i === activeGroupIdx
                  ? "bg-[#e0ddd8] text-[#1a2028]"
                  : "bg-[#3a3838] text-[#e0ddd8] hover:bg-[#444242]"
              } ${g.accent ?? ""}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Clear button */}
      {(isNightmare ? slots.nightmare.length > 0 : currentValue !== null) && (
        <button
          onClick={clearSlot}
          className="mx-3 mt-2 text-xs text-zinc-500 hover:text-red-400 transition-colors text-left"
        >
          ✕ Clear selection
        </button>
      )}

      {/* Affix list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {groupDisabled ? (
          <p className="text-xs text-zinc-500 italic px-1">Limit reached for this tier</p>
        ) : isNightmare && nightmareGrouped ? (
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
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[12px] font-bold uppercase tracking-wider ${NIGHTMARE_GROUP_ACCENT[group]}`}>{group}</span>
                    <button onClick={allSelected ? selectNone : selectAll} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      {allSelected ? "deselect all" : "select all"}
                    </button>
                    {minionOpts.length > 0 && (
                      <button onClick={allMinionsSelected ? selectNoneMinions : selectAllMinions} className="text-[10px] text-emerald-500 hover:text-emerald-300 transition-colors ml-1">
                        {allMinionsSelected ? "no minions" : "all minions"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {opts.map(({ affix, sourceGroup }) => {
                      const checked = nightmareSelectedIds.has(affix.id);
                      return (
                        <label key={affix.id} className="flex items-start gap-2 px-2 py-1 rounded-sm cursor-pointer hover:bg-[#3a3838] transition-colors">
                          <input
                            type="checkbox"
                            className="shrink-0 mt-0.5 accent-[#e0ddd8]"
                            checked={checked}
                            onChange={() => selectAffix(affix.id, sourceGroup)}
                          />
                          <span className="text-[12px] text-[#e0ddd8] leading-snug">{nightmareLabel(affix)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Single-select list
          options.map(({ affix, sourceGroup }) => {
            const isSelected = currentValue?.affixId === affix.id;
            const isTaken = taken.has(affix.id);
            const displayLabel = buildAffixLabel(affix);
            return (
              <button
                key={`${sourceGroup}-${affix.id}`}
                disabled={isTaken}
                onClick={() => !isTaken && selectAffix(affix.id, sourceGroup)}
                className={`w-full text-left px-3 py-2 rounded-sm text-[12px] transition-colors leading-snug ${
                  isTaken
                    ? "text-zinc-500 cursor-default opacity-40"
                    : isSelected
                    ? "bg-[#e0ddd8] text-[#1a2028]"
                    : "text-[#e0ddd8] hover:bg-[#3a3838]"
                }`}
              >
                {displayLabel}
              </button>
            );
          })
        )}
      </div>

      {/* Tier selection — shown when active slot has a selected affix with multiple tiers */}
      {!isNightmare && currentValue && (() => {
        const allOpts = currentGroup.groupTypes.flatMap((gt) => getOptions(pool, gt));
        const selectedOpt = allOpts.find((o) => o.affix.id === currentValue.affixId);
        if (!selectedOpt) return null;
        const tiers = sortTiers(selectedOpt.affix.tiers);
        if (tiers.length <= 1) return null;
        return (
          <div className="border-t border-[#3a3838] px-3 pt-3 pb-4">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Tier</p>
            <div className="flex flex-col gap-1">
              {tiers.map((t) => {
                const isSelected = currentValue.tier === t.tier;
                const color = tierTextColor(t.tier);
                const stats = t.stats.length > 0
                  ? ": " + t.stats.map((s) => {
                      const r = s.minValue === s.maxValue ? `${s.minValue}` : `${s.minValue}–${s.maxValue}`;
                      return s.unit === "PERCENT" ? `${r}%` : r;
                    }).join(", ")
                  : "";
                return (
                  <button
                    key={t.tier}
                    onClick={() => onChange({ ...slots, [activeSlot]: { ...currentValue, tier: t.tier } })}
                    className={`w-full text-left px-3 py-2 rounded-sm text-[12px] transition-colors flex items-center gap-2 ${
                      isSelected ? "bg-[#e0ddd8] text-[#1a2028]" : "text-[#e0ddd8] hover:bg-[#3a3838]"
                    }`}
                  >
                    <span className="font-bold" style={color && !isSelected ? { color } : undefined}>
                      {displayTier(t.tier)}
                    </span>
                    {stats && <span className={isSelected ? "text-[#1a2028]" : "text-zinc-400"}>{stats}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
