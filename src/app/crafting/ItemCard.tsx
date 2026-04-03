"use client";

import { useState, useRef, useEffect } from "react";
import type { AffixGroupType } from "@prisma/client";
import type { CraftedPool, PoolAffix, PoolTier } from "@/services/crafting/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotValue = {
  affixId: string;
  affixName: string;
  tier: string;
  sourceGroup: AffixGroupType;
} | null;

export type ItemSlots = {
  base: SlotValue;
  dream: SlotValue;
  nightmare: NonNullable<SlotValue>[]; // multiple acceptable nightmares
  sequence: SlotValue;
  prefix1: SlotValue;
  prefix2: SlotValue;
  prefix3: SlotValue;
  suffix1: SlotValue;
  suffix2: SlotValue;
  suffix3: SlotValue;
};

export const EMPTY_SLOTS: ItemSlots = {
  base: null,
  dream: null,
  nightmare: [],
  sequence: null,
  prefix1: null,
  prefix2: null,
  prefix3: null,
  suffix1: null,
  suffix2: null,
  suffix3: null,
};

type AffixOption = {
  affix: PoolAffix;
  sourceGroup: AffixGroupType;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_ORDER = ["T0_PLUS", "T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7"];

function displayTier(tier: string): string {
  return tier === "T0_PLUS" ? "T0+" : tier;
}

function tierTextColor(tier: string): string {
  if (tier === "T0_PLUS") return "#534dbf";
  if (tier === "T0")      return "#fe0000";
  if (tier === "T1")      return "#ff7d1c";
  return "";
}

function tierSquareColor(tier: string): string {
  // T0+ square uses same color as T0
  if (tier === "T0_PLUS") return "#fe0000";
  if (tier === "T0")      return "#fe0000";
  if (tier === "T1")      return "#ff7d1c";
  return "";
}

function sortTiers(tiers: PoolTier[]): PoolTier[] {
  return [...tiers].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.tier);
    const bi = TIER_ORDER.indexOf(b.tier);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

// Transforms an affix name template like "+(min-max) Dexterity" into a
// readable label with real values, handling three edge cases:
//   1. "(min-max)% Name"            → "(5–10)% Name"           (% stays outside parens)
//   2. "(min-max)% Verb (min-max)%" → "Verb (36–45)%"          (strip redundant leading prefix)
//   3. "+(min-max) +1 Name"         → "+(1) Name"              (strip repeated literal value)
function buildAffixLabel(affix: PoolAffix): string {
  const tier = affix.tiers[0];
  if (!tier || tier.stats.length === 0) return affix.name;
  const firstStat = tier.stats[0];

  // Step 1: replace each (min-max) sequentially with the corresponding stat's range.
  // e.g. two stats → first (min-max) gets stat[0]'s range, second gets stat[1]'s range.
  let statIdx = 0;
  let name = affix.name.replace(/\(min-max\)/gi, () => {
    const stat = tier.stats[statIdx] ?? firstStat;
    statIdx++;
    const r =
      stat.minValue === stat.maxValue
        ? `${stat.minValue}`
        : `${stat.minValue}–${stat.maxValue}`;
    return `(${r})`;
  });

  // Remaining edge-case fixes operate on the first stat's range only.
  const firstRange =
    firstStat.minValue === firstStat.maxValue
      ? `${firstStat.minValue}`
      : `${firstStat.minValue}–${firstStat.maxValue}`;
  const esc = firstRange.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Step 2: if the first stat's range appears twice, the leading prefix is redundant.
  // e.g. "(36–45)% Converts (36–45)% of X" → "Converts (36–45)% of X"
  const count = (name.match(new RegExp(`\\(${esc}\\)`, "g")) ?? []).length;
  if (count >= 2) {
    name = name.replace(new RegExp(`^\\+?\\(${esc}\\)%?\\s*`), "").trimStart();
  }

  // Step 3: strip a literal repeated value right after the leading (range).
  // e.g. "+(1) +1 Projectile Quantity" → "+(1) Projectile Quantity"
  if (firstStat.minValue === firstStat.maxValue) {
    name = name.replace(
      new RegExp(`^(\\+?\\(${esc}\\)\\S*\\s+)\\+?${esc}\\s+`),
      "$1",
    );
  }

  return name.trim();
}

function tierLabel(tier: PoolTier): string {
  if (tier.stats.length === 0) return displayTier(tier.tier);
  const parts = tier.stats.map((s) => {
    const range =
      s.minValue === s.maxValue
        ? `${s.minValue}`
        : `${s.minValue}–${s.maxValue}`;
    return s.unit === "PERCENT" ? `${range}%` : range;
  });
  return `${displayTier(tier.tier)}: ${parts.join(", ")}`;
}

function getOptions(pool: CraftedPool, group: AffixGroupType): AffixOption[] {
  return (pool.groups[group] ?? []).map((affix) => ({ affix, sourceGroup: group }));
}

// ─── Nightmare helpers ────────────────────────────────────────────────────────

function nightmareLabel(affix: PoolAffix): string {
  const tier = affix.tiers[0];
  if (!tier || tier.stats.length === 0) return affix.name;
  const parts = tier.stats.map((s) => {
    const range =
      s.minValue === s.maxValue
        ? `${s.minValue}`
        : `${s.minValue}–${s.maxValue}`;
    return s.unit === "PERCENT" ? `(${range})%` : `(${range})`;
  });
  return `-${parts.join(", ")} ${affix.name}`;
}

const NIGHTMARE_GROUP_ORDER = ["Damage", "Defense", "Utility", "Special"] as const;
type NightmareGroup = (typeof NIGHTMARE_GROUP_ORDER)[number];

function getNightmareGroup(statId: string): NightmareGroup {
  if (statId.endsWith("_penetration")) return "Damage";
  if (/max_life|max_mana|max_energy_shield|resistance$|life_regain|energy_shield_regain|damage_applied_to_life|block_chance/.test(statId))
    return "Defense";
  if (/blessing/.test(statId)) return "Special";
  if (/damage|attack|critical|minion|melee|physical|elemental|erosion|execute|combo|ailment|affliction|trauma|steep|skill_area/.test(statId))
    return "Damage";
  return "Utility";
}

// ─── Nightmare multi-select row ───────────────────────────────────────────────

type NightmareSlotRowProps = {
  pool: CraftedPool;
  values: NonNullable<SlotValue>[];
  onChange: (vals: NonNullable<SlotValue>[]) => void;
};

function NightmareSlotRow({ pool, values, onChange }: NightmareSlotRowProps) {
  const [expanded, setExpanded] = useState(false);
  const options = getOptions(pool, "NIGHTMARE_AFFIXES");
  if (options.length === 0) return null;

  const selectedIds = new Set(values.map((v) => v.affixId));

  function toggle(opt: AffixOption) {
    if (selectedIds.has(opt.affix.id)) {
      onChange(values.filter((v) => v.affixId !== opt.affix.id));
    } else {
      onChange([
        ...values,
        {
          affixId: opt.affix.id,
          affixName: opt.affix.name,
          tier: opt.affix.tiers[0]?.tier ?? "",
          sourceGroup: opt.sourceGroup,
        },
      ]);
    }
  }

  // Group options by category, sort alphabetically within each group
  const grouped = new Map<NightmareGroup, AffixOption[]>(
    NIGHTMARE_GROUP_ORDER.map((g) => [g, []]),
  );
  for (const opt of options) {
    const primaryStatId = opt.affix.tiers[0]?.stats[0]?.statId ?? "";
    grouped.get(getNightmareGroup(primaryStatId))!.push(opt);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.affix.name.localeCompare(b.affix.name));
  }

  const GROUP_ACCENT: Record<NightmareGroup, string> = {
    Damage:  "text-red-400",
    Defense: "text-blue-400",
    Utility: "text-yellow-400",
    Special: "text-purple-300",
  };

  return (
    <div className="flex items-start gap-2 py-2">
      <span className="w-24 shrink-0 flex items-center gap-1 pt-0.5">
        <span className="text-xs font-medium" style={{ color: "#c64a28" }}>Nightmare</span>
        <span className="relative group/tip">
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-zinc-600 text-zinc-500 text-[9px] font-bold cursor-default select-none hover:border-zinc-400 hover:text-zinc-300 transition-colors">?</span>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max rounded bg-zinc-800 border border-zinc-700 px-2.5 py-2 text-xs text-zinc-200 shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap text-center leading-relaxed">
            Choose all acceptable Nightmare Affixes<br />More Nightmare Affixes = cheaper craft!
          </span>
        </span>
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-zinc-500">
            {values.length > 0 ? `${values.length} selected` : "none selected"}
          </span>
          <div className="flex-1 h-px bg-zinc-800/60" />
          <button
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-sm font-bold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>
        {expanded && (
          <div className="space-y-3">
            {NIGHTMARE_GROUP_ORDER.map((group) => {
              const opts = grouped.get(group)!;
              if (opts.length === 0) return null;
              return (
                <div key={group}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${GROUP_ACCENT[group]}`}>
                    {group}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {opts.map(({ affix, sourceGroup }) => (
                      <label key={affix.id} className="flex items-center gap-1.5 cursor-pointer group min-w-0">
                        <input
                          type="checkbox"
                          className="shrink-0 accent-purple-400"
                          checked={selectedIds.has(affix.id)}
                          onChange={() => toggle({ affix, sourceGroup })}
                        />
                        <span className="text-xs text-zinc-300 group-hover:text-zinc-100 truncate">
                          {nightmareLabel(affix)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Material icon ────────────────────────────────────────────────────────────

function MatIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  return (
    <img
      src={`/icons/materials/${encodeURIComponent(name)}.webp`}
      alt={name}
      className={`inline-block object-contain shrink-0 ${className}`}
    />
  );
}

function FEIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <MatIcon name="Flame Elementium" className={className} />;
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Section({
  label,
  feCost,
  expanded,
  onToggle,
}: {
  label: string;
  feCost?: number | null;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-1">
      <div className="w-1/4 h-px bg-zinc-800 shrink-0" />
      <span className="shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
        {label}
      </span>
      {feCost != null && (
        <span className="shrink-0 text-xs text-white flex items-center gap-1">
          <span className="font-bold">{Math.round(feCost).toLocaleString("en-US")}</span> <FEIcon className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex-1 h-px bg-zinc-800" />
      {onToggle && (
        <button
          onClick={onToggle}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-sm font-bold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      )}
    </div>
  );
}

// ─── Tier display helpers ─────────────────────────────────────────────────────

function tierStatsStr(t: PoolTier): string {
  if (t.stats.length === 0) return "";
  const parts = t.stats.map((s) => {
    const range = s.minValue === s.maxValue ? `${s.minValue}` : `${s.minValue}–${s.maxValue}`;
    return s.unit === "PERCENT" ? `${range}%` : range;
  });
  return `: ${parts.join(", ")}`;
}

function TierLabel({ tier }: { tier: PoolTier }) {
  const sqColor = tierSquareColor(tier.tier);
  const textColor = tierTextColor(tier.tier);
  const stats = tierStatsStr(tier);
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {sqColor
        ? <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: sqColor }} />
        : <span className="inline-block w-2 h-2 shrink-0" />
      }
      <span className="font-bold" style={textColor ? { color: textColor } : undefined}>{displayTier(tier.tier)}</span>
      {stats && <span className="text-zinc-500">{stats}</span>}
    </span>
  );
}

// ─── Tier picker (shared) ─────────────────────────────────────────────────────

function TierPicker({
  options,
  value,
  onChange,
}: {
  options: AffixOption[];
  value: SlotValue;
  onChange: (tier: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!value) return null;
  const opt = options.find((o) => o.affix.id === value.affixId);
  if (!opt) return null;
  const tiers = sortTiers(opt.affix.tiers);
  const selectedTier = tiers.find((t) => t.tier === value.tier) ?? tiers[0];

  if (tiers.length === 1) {
    return (
      <span className="w-40 shrink-0 text-xs px-2">
        <TierLabel tier={tiers[0]} />
      </span>
    );
  }

  return (
    <div ref={ref} className="w-40 shrink-0 relative text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 focus:outline-none hover:border-zinc-600"
      >
        <TierLabel tier={selectedTier} />
        <svg className="shrink-0 text-zinc-500 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full rounded border border-zinc-700 bg-zinc-900 shadow-xl py-0.5">
          {tiers.map((t) => (
            <button
              key={t.tier}
              className={`w-full flex items-center px-2 py-1.5 hover:bg-zinc-800 transition-colors ${t.tier === value.tier ? "bg-zinc-800/60" : ""}`}
              onClick={() => { onChange(t.tier); setOpen(false); }}
            >
              <TierLabel tier={t} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Simple slot row (base, dream, nightmare) ─────────────────────────────────

type SimpleSlotProps = {
  label: string;
  accent: string;
  groups: { label: string; options: AffixOption[] }[];
  value: SlotValue;
  onChange: (val: SlotValue) => void;
  showStats?: boolean;
  groupDotColors?: Record<string, string>;
};

function GroupDot({ color }: { color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center w-3 h-3 rounded-full"
      style={{ border: `2px solid ${color}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
    </span>
  );
}

function SimpleSlotRow({ label, accent, groups, value, onChange, showStats = false, groupDotColors }: SimpleSlotProps) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const allOptions = groups.flatMap((g) => g.options);
  if (allOptions.length === 0) return null;

  function handleAffixChange(affixId: string) {
    if (!affixId) { onChange(null); return; }
    const opt = allOptions.find((o) => o.affix.id === affixId);
    if (!opt) return;
    onChange({
      affixId: opt.affix.id,
      affixName: opt.affix.name,
      tier: opt.affix.tiers[0]?.tier ?? "",
      sourceGroup: opt.sourceGroup,
    });
  }

  function optionLabel(affix: PoolAffix): string {
    return showStats ? buildAffixLabel(affix) : affix.name;
  }

  // Custom dropdown when groupDotColors is provided
  if (groupDotColors) {
    const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);
    const selectedGroup = selectedOpt
      ? groups.find((g) => g.options.some((o) => o.affix.id === selectedOpt.affix.id))
      : null;
    const selectedDotColor = selectedGroup ? groupDotColors[selectedGroup.label] : null;

    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className={`w-24 shrink-0 text-xs font-medium ${accent}`}>{label}</span>
        <div ref={dropRef} className="flex-1 min-w-0 relative text-xs">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 hover:border-zinc-600 focus:outline-none"
          >
            <span className="flex items-center gap-2 min-w-0">
              {selectedDotColor
                ? <GroupDot color={selectedDotColor} />
                : <span className="w-3 h-3 shrink-0" />
              }
              <span className="truncate text-zinc-100">
                {selectedOpt ? optionLabel(selectedOpt.affix) : <span className="text-zinc-500 italic">— empty —</span>}
              </span>
            </span>
            <svg className="shrink-0 text-zinc-500 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {open && (
            <div className="absolute z-50 top-full left-0 mt-1 w-full rounded border border-zinc-700 bg-zinc-900 shadow-xl py-0.5 max-h-64 overflow-y-auto">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-500 italic hover:bg-zinc-800 transition-colors"
                onClick={() => { onChange(null); setOpen(false); }}
              >
                <span className="w-3 h-3 shrink-0" />
                — empty —
              </button>
              {groups.map(({ label: groupLabel, options }) =>
                options.length === 0 ? null : (
                  <div key={groupLabel}>
                    <p className="px-2 pt-2 pb-0.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">{groupLabel}</p>
                    {options.map(({ affix, sourceGroup }) => (
                      <button
                        key={`${sourceGroup}-${affix.id}`}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 transition-colors ${value?.affixId === affix.id ? "bg-zinc-800/60" : ""}`}
                        onClick={() => { handleAffixChange(affix.id); setOpen(false); }}
                      >
                        {groupDotColors[groupLabel]
                          ? <GroupDot color={groupDotColors[groupLabel]} />
                          : <span className="w-3 h-3 shrink-0" />
                        }
                        <span className="text-zinc-100 truncate">{optionLabel(affix)}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className={`w-24 shrink-0 text-xs font-medium ${accent}`}>{label}</span>
      <select
        className="flex-1 min-w-0 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
        value={value?.affixId ?? ""}
        onChange={(e) => handleAffixChange(e.target.value)}
      >
        <option value="">— empty —</option>
        {groups.map(({ label: groupLabel, options }) =>
          options.length === 0 ? null : (
            <optgroup key={groupLabel} label={groupLabel}>
              {options.map(({ affix, sourceGroup }) => (
                <option key={`${sourceGroup}-${affix.id}`} value={affix.id}>
                  {optionLabel(affix)}
                </option>
              ))}
            </optgroup>
          )
        )}
      </select>
    </div>
  );
}

// ─── Prefix / Suffix slot row ─────────────────────────────────────────────────

const MAX_ADVANCED = 2;
const MAX_ULTIMATE = 2;

type PrefixSuffixSlotProps = {
  label: string;
  type: "prefix" | "suffix";
  pool: CraftedPool;
  value: SlotValue;
  onChange: (val: SlotValue) => void;
  advancedCount: number; // total advanced selected across all 6 slots
  ultimateCount: number; // total ultimate selected across all 6 slots
  takenAffixIds: Set<string>; // affix IDs selected in OTHER slots
};

function PrefixSuffixSlotRow({
  label,
  type,
  pool,
  value,
  onChange,
  advancedCount,
  ultimateCount,
  takenAffixIds,
}: PrefixSuffixSlotProps) {
  const basicGroup: AffixGroupType = type === "prefix" ? "BASIC_PREFIXES" : "BASIC_SUFFIXES";
  const advancedGroup: AffixGroupType = type === "prefix" ? "ADVANCED_PREFIXES" : "ADVANCED_SUFFIXES";
  const ultimateGroup: AffixGroupType = type === "prefix" ? "ULTIMATE_PREFIXES" : "ULTIMATE_SUFFIXES";

  const basicOptions = getOptions(pool, basicGroup);
  const advancedOptions = getOptions(pool, advancedGroup);
  const ultimateOptions = getOptions(pool, ultimateGroup);
  const allOptions = [...basicOptions, ...advancedOptions, ...ultimateOptions];

  if (allOptions.length === 0) return null;

  const thisIsAdvanced = value?.sourceGroup === advancedGroup;
  const thisIsUltimate = value?.sourceGroup === ultimateGroup;

  // Disable advanced if the OTHER slots already fill the cap
  const advancedOtherCount = advancedCount - (thisIsAdvanced ? 1 : 0);
  const ultimateOtherCount = ultimateCount - (thisIsUltimate ? 1 : 0);
  const disableAdvanced = advancedOtherCount >= MAX_ADVANCED;
  const disableUltimate = ultimateOtherCount >= MAX_ULTIMATE;

  function handleAffixChange(affixId: string) {
    if (!affixId) { onChange(null); return; }
    const opt = allOptions.find((o) => o.affix.id === affixId);
    if (!opt) return;
    const sorted = sortTiers(opt.affix.tiers);
    const defaultTier =
      sorted.find((t) => t.tier === "T1") ?? sorted[sorted.length - 1];
    onChange({
      affixId: opt.affix.id,
      affixName: opt.affix.name,
      tier: defaultTier?.tier ?? "",
      sourceGroup: opt.sourceGroup,
    });
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-24 shrink-0 text-xs font-medium text-zinc-300">{label}</span>
      <select
        className="flex-1 min-w-0 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
        value={value?.affixId ?? ""}
        onChange={(e) => handleAffixChange(e.target.value)}
      >
        <option value="">— empty —</option>

        {basicOptions.length > 0 && (
          <optgroup label="Basic">
            {basicOptions.map(({ affix }) => (
              <option key={affix.id} value={affix.id} disabled={takenAffixIds.has(affix.id)}>
                {affix.name}
              </option>
            ))}
          </optgroup>
        )}

        {advancedOptions.length > 0 && (
          <optgroup label={`Advanced${disableAdvanced ? " (limit reached)" : ""}`}>
            {advancedOptions.map(({ affix }) => (
              <option key={affix.id} value={affix.id} disabled={disableAdvanced || takenAffixIds.has(affix.id)}>
                {affix.name}
              </option>
            ))}
          </optgroup>
        )}

        {ultimateOptions.length > 0 && (
          <optgroup label={`Ultimate${disableUltimate ? " (limit reached)" : ""}`}>
            {ultimateOptions.map(({ affix }) => (
              <option key={affix.id} value={affix.id} disabled={disableUltimate || takenAffixIds.has(affix.id)}>
                {affix.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <TierPicker
        options={allOptions}
        value={value}
        onChange={(tier) => onChange(value ? { ...value, tier } : null)}
      />
    </div>
  );
}

// ─── Sequence cost section ────────────────────────────────────────────────────

// P(success per attempt) for sequences.
//
// Each attempt = N rolls of "draw 3 from {1-7}, pick 1". You need N specific
// numbers (with repetition). With N numbers needed and exactly N rolls, every
// roll must contribute a needed number — zero slack.
//
// Standard formula (all N needed numbers are distinct):
//   P = ∏_{j=1}^{N} [1 - C(7-j, 3) / C(7,3)]
//   Intermediate N=3: (15/35)(25/35)(31/35)         = 93/343    ≈ 27.1%
//   Advanced     N=4: (15/35)(25/35)(31/35)(34/35)  = 3162/12005 ≈ 26.3%
//
// For advanced sequences with duplicate required numbers, the state space
// differs because you can't count the same number twice on one roll. Computed
// via DP (optimal-strategy pick each roll):
//   Double (2+1+1, e.g. {3,3,6,7}):  2403/12005 ≈ 20.0%
//   Triple (3+1,   e.g. {1,1,1,5}):  1215/12005 ≈ 10.1%
//
// Affected advanced sequences (identified by ID suffix):
//   Triple: ..._lightning_damage_per_dexterity  (needs 1,1,1,5)
//           ..._fire_damage_per_strength         (needs 6,6,6,7)
//           ..._steamroll_support                (needs 2,2,2,3)
//   Double: ..._physical_damage_per_armor        (needs 3,3,6,7)
//           ..._fearless_aura                    (needs 4,4,5,6)

const P_INTERMEDIATE = 93 / 343;
const P_ADV_STANDARD = 3162 / 12005;
const P_ADV_DOUBLE   = 2403 / 12005;
const P_ADV_TRIPLE   = 1215 / 12005;

const ADV_TRIPLE_SUFFIXES = [
  "_lightning_damage_per_dexterity",
  "_fire_damage_per_strength",
  "_steamroll_support",
];
const ADV_DOUBLE_SUFFIXES = [
  "_physical_damage_per_armor",
  "_fearless_aura",
];

function getAdvancedSequenceP(affixId: string): number {
  if (ADV_TRIPLE_SUFFIXES.some((s) => affixId.endsWith(s))) return P_ADV_TRIPLE;
  if (ADV_DOUBLE_SUFFIXES.some((s) => affixId.endsWith(s))) return P_ADV_DOUBLE;
  return P_ADV_STANDARD;
}

const WARLOCK_WEAPONS = new Set([
  "wand", "rod", "scepter", "cane", "tin_staff", "cudgel",
]);
const VANGUARD_WEAPONS = new Set([
  "one_hand_sword", "two_hand_sword", "one_hand_axe", "two_hand_axe",
  "one_hand_hammer", "two_hand_hammer", "claw", "dagger",
]);
const SNIPER_WEAPONS = new Set([
  "pistol", "bow", "crossbow", "fire_cannon", "musket",
]);

function getModName(pool: CraftedPool, isAdvanced: boolean): string {
  if (!isAdvanced) return "Base Mod";
  const cat = pool.baseItemCategory.id;
  if (cat === "shield") return "Expansion Mod - Tank";
  const wt = pool.weaponType?.id ?? "";
  if (WARLOCK_WEAPONS.has(wt)) return "Expansion Mod - Warlock";
  if (VANGUARD_WEAPONS.has(wt)) return "Expansion Mod - Vanguard";
  if (SNIPER_WEAPONS.has(wt)) return "Expansion Mod - Sniper";
  return "Expansion Mod";
}

type SequenceCostSectionProps = {
  pool: CraftedPool;
  sequenceSlot: SlotValue;
  modCostFE: string;
  onModCostFEChange: (v: string) => void;
};

function SequenceCostSection({
  pool,
  sequenceSlot,
  modCostFE,
  onModCostFEChange,
}: SequenceCostSectionProps) {
  const [expanded, setExpanded] = useState(false);
  if (!sequenceSlot) return null;

  const isAdvanced = sequenceSlot.sourceGroup === "ADVANCED_SEQUENCES";
  const isTwoHanded = pool.baseItemCategory.id === "two_hand_weapon";
  const modsPerAttempt = isTwoHanded ? 20 : 10;
  const modName = getModName(pool, isAdvanced);
  const pSuccess = isAdvanced
    ? getAdvancedSequenceP(sequenceSlot.affixId)
    : P_INTERMEDIATE;
  const avgAttempts = 1 / pSuccess;
  const avgMods = avgAttempts * modsPerAttempt;

  const defaultModCost = MOD_COST_DEFAULTS[modName] ?? "0";
  const effectiveModCost = parseFloat(modCostFE) || parseFloat(defaultModCost);
  const totalFE = effectiveModCost > 0 ? avgMods * effectiveModCost : null;

  return (
    <div className="mt-2 mb-1 p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-emerald-400">Sequence Cost Estimate</p>
        {totalFE !== null && (
          <span className="text-xs text-white flex items-center gap-1">
            <span className="font-bold">{Math.round(totalFE).toLocaleString("en-US")}</span> <FEIcon />
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-sm font-bold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>
      {expanded && (
        <>
          <div className="space-y-1 text-xs text-zinc-400 mb-3">
            <div className="flex justify-between gap-8">
              <span>Type</span>
              <span className="text-zinc-200">{isAdvanced ? "Advanced" : "Intermediate"}</span>
            </div>
            {isAdvanced && (
              <div className="flex justify-between gap-8">
                <span>Combination</span>
                <span className="text-zinc-200">
                  {pSuccess === P_ADV_TRIPLE
                    ? "3+1 (triple repeat)"
                    : pSuccess === P_ADV_DOUBLE
                    ? "2+1+1 (double repeat)"
                    : "4 distinct"}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-8">
              <span>Mod</span>
              <span className="text-zinc-200">{modName}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Mods per attempt</span>
              <span className="text-zinc-200">{modsPerAttempt}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>P(success per attempt)</span>
              <span className="text-zinc-200">{(pSuccess * 100).toFixed(3)}%</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Avg attempts</span>
              <span className="text-zinc-200">{avgAttempts.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-8 font-medium border-t border-zinc-700/50 pt-1 mt-1">
              <span className="text-zinc-300">Avg mods needed</span>
              <span className="text-emerald-300">{Math.round(avgMods).toLocaleString("en-US")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 shrink-0 flex items-center gap-1.5">
              <MatIcon name={modName} />
              FE per {modName}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              placeholder={defaultModCost}
              value={modCostFE}
              onChange={(e) => onModCostFEChange(e.target.value)}
            />
          </div>
          {totalFE !== null && (
            <div className="flex justify-between mt-2 pt-2 border-t border-zinc-700/50 text-xs font-semibold">
              <span className="text-zinc-400 flex items-center gap-1">Estimated total <FEIcon /></span>
              <span className="text-white font-bold flex items-center gap-1">
                {Math.round(totalFE).toLocaleString("en-US")} <FEIcon />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Prefix / Suffix cost section ────────────────────────────────────────────

export type ResourcePrices = {
  preciousEmber: string;
  matchlessEmber: string;
  ultimateEmber: string;
  sacredFossil: string;
};

export const EMPTY_RESOURCE_PRICES: ResourcePrices = {
  preciousEmber: "",
  matchlessEmber: "",
  ultimateEmber: "",
  sacredFossil: "",
};

// ─── Default material / action costs ─────────────────────────────────────────

const RESOURCE_PRICE_DEFAULTS: ResourcePrices = {
  preciousEmber: "0.03",
  matchlessEmber: "0.2",
  ultimateEmber: "11",
  sacredFossil: "25",
};

const SHALLOW_COST_DEFAULTS: Record<"weapon" | "armor" | "trinket", string> = {
  weapon:  "8",
  armor:   "4",
  trinket: "24",
};

const MOD_COST_DEFAULTS: Record<string, string> = {
  "Base Mod":                "0.5",
  "Expansion Mod - Warlock": "55",
  "Expansion Mod - Vanguard":"60",
  "Expansion Mod - Sniper":  "20",
  "Expansion Mod - Tank":    "18",
};

const CORROSION_COST_DEFAULT = "400";

function getItemType(pool: CraftedPool): "weapon" | "armor" | "trinket" {
  const cat = pool.baseItemCategory.id;
  if (cat === "one_hand_weapon" || cat === "two_hand_weapon") return "weapon";
  if (cat === "necklace" || cat === "belt" || cat === "ring" || cat === "spirit_ring")
    return "trinket";
  return "armor"; // helmet, chest, gloves, boots, shield
}

function getShallowDreamName(pool: CraftedPool): string {
  const t = getItemType(pool);
  if (t === "weapon")  return "Shallow Dream Talking - Weapon";
  if (t === "trinket") return "Shallow Dream Talking - Trinket";
  return "Shallow Dream Talking - Armor";
}

type ResourceBundle = {
  fe: number;
  preciousEmbers: number;
  matchlessEmbers: number;
  ultimateEmbers: number;
  sacredFossils: number;
};

const ZERO_BUNDLE: ResourceBundle = {
  fe: 0, preciousEmbers: 0, matchlessEmbers: 0, ultimateEmbers: 0, sacredFossils: 0,
};

// Per single roll attempt (1H baseline; ×2 for 2H)
const ROLL_COST_PER: Record<string, ResourceBundle> = {
  BASIC_PREFIXES:    { fe: 1,  preciousEmbers: 10, matchlessEmbers: 0,  ultimateEmbers: 0, sacredFossils: 0 },
  BASIC_SUFFIXES:    { fe: 1,  preciousEmbers: 10, matchlessEmbers: 0,  ultimateEmbers: 0, sacredFossils: 0 },
  ADVANCED_PREFIXES: { fe: 3,  preciousEmbers: 0,  matchlessEmbers: 10, ultimateEmbers: 0, sacredFossils: 0 },
  ADVANCED_SUFFIXES: { fe: 3,  preciousEmbers: 0,  matchlessEmbers: 10, ultimateEmbers: 0, sacredFossils: 0 },
  ULTIMATE_PREFIXES: { fe: 30, preciousEmbers: 0,  matchlessEmbers: 0,  ultimateEmbers: 1, sacredFossils: 0 },
  ULTIMATE_SUFFIXES: { fe: 30, preciousEmbers: 0,  matchlessEmbers: 0,  ultimateEmbers: 1, sacredFossils: 0 },
};

// P(hit T1) per roll
const ROLL_HIT_P: Record<string, number> = {
  BASIC_PREFIXES: 0.01,    BASIC_SUFFIXES: 0.01,
  ADVANCED_PREFIXES: 0.01, ADVANCED_SUFFIXES: 0.01,
  ULTIMATE_PREFIXES: 0.05, ULTIMATE_SUFFIXES: 0.05,
};

// Per single T1→T0 upgrade attempt (1H baseline; ×2 for 2H)
const UPGRADE_COST_PER: Record<string, ResourceBundle> = {
  BASIC_PREFIXES:    { fe: 30,  preciousEmbers: 300, matchlessEmbers: 0, ultimateEmbers: 0, sacredFossils: 1 },
  BASIC_SUFFIXES:    { fe: 30,  preciousEmbers: 300, matchlessEmbers: 0, ultimateEmbers: 0, sacredFossils: 1 },
  ADVANCED_PREFIXES: { fe: 90,  preciousEmbers: 300, matchlessEmbers: 0, ultimateEmbers: 0, sacredFossils: 3 },
  ADVANCED_SUFFIXES: { fe: 90,  preciousEmbers: 300, matchlessEmbers: 0, ultimateEmbers: 0, sacredFossils: 3 },
  ULTIMATE_PREFIXES: { fe: 180, preciousEmbers: 0,   matchlessEmbers: 0, ultimateEmbers: 6, sacredFossils: 6 },
  ULTIMATE_SUFFIXES: { fe: 180, preciousEmbers: 0,   matchlessEmbers: 0, ultimateEmbers: 6, sacredFossils: 6 },
};

const P_T0_UPGRADE = 0.3; // 30% chance per upgrade attempt

function scaleBundle(b: ResourceBundle, n: number): ResourceBundle {
  return {
    fe: b.fe * n,
    preciousEmbers: b.preciousEmbers * n,
    matchlessEmbers: b.matchlessEmbers * n,
    ultimateEmbers: b.ultimateEmbers * n,
    sacredFossils: b.sacredFossils * n,
  };
}

function addBundles(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    fe: a.fe + b.fe,
    preciousEmbers: a.preciousEmbers + b.preciousEmbers,
    matchlessEmbers: a.matchlessEmbers + b.matchlessEmbers,
    ultimateEmbers: a.ultimateEmbers + b.ultimateEmbers,
    sacredFossils: a.sacredFossils + b.sacredFossils,
  };
}

// T0_PLUS is crafted to T0 first; the T0→T0+ step comes from corrosion.
// Returns null for unsupported tiers (T2–T7).
function getSlotCost(
  sourceGroup: string,
  tier: string,
  isTwoH: boolean,
): ResourceBundle | null {
  const rollCostPer = ROLL_COST_PER[sourceGroup];
  const effectiveTier = tier === "T0_PLUS" ? "T0" : tier;
  if (!rollCostPer || (effectiveTier !== "T1" && effectiveTier !== "T0")) return null;

  const mult = isTwoH ? 2 : 1;
  const avgRolls = 1 / ROLL_HIT_P[sourceGroup];
  const rollingTotal = scaleBundle(rollCostPer, avgRolls * mult);

  if (effectiveTier === "T1") return rollingTotal;

  // T0 = rolling to T1 + expected upgrade attempts
  const avgUpgrades = 1 / P_T0_UPGRADE;
  const upgradeTotal = scaleBundle(UPGRADE_COST_PER[sourceGroup], avgUpgrades * mult);
  return addBundles(rollingTotal, upgradeTotal);
}

function calcTotalFE(bundle: ResourceBundle, prices: ResourcePrices): number {
  const pe = parseFloat(prices.preciousEmber) || parseFloat(RESOURCE_PRICE_DEFAULTS.preciousEmber);
  const me = parseFloat(prices.matchlessEmber) || parseFloat(RESOURCE_PRICE_DEFAULTS.matchlessEmber);
  const ue = parseFloat(prices.ultimateEmber)  || parseFloat(RESOURCE_PRICE_DEFAULTS.ultimateEmber);
  const sf = parseFloat(prices.sacredFossil)   || parseFloat(RESOURCE_PRICE_DEFAULTS.sacredFossil);

  return (
    bundle.fe +
    bundle.preciousEmbers * pe +
    bundle.matchlessEmbers * me +
    bundle.ultimateEmbers * ue +
    bundle.sacredFossils * sf
  );
}

const SLOT_LABELS: Record<PrefixSuffixKey, string> = {
  prefix1: "Prefix 1", prefix2: "Prefix 2", prefix3: "Prefix 3",
  suffix1: "Suffix 1", suffix2: "Suffix 2", suffix3: "Suffix 3",
};

type PrefixSuffixCostSectionProps = {
  pool: CraftedPool;
  slots: ItemSlots;
  prices: ResourcePrices;
  onPricesChange: (p: ResourcePrices) => void;
};

function PrefixSuffixCostSection({
  pool,
  slots,
  prices,
  onPricesChange,
}: PrefixSuffixCostSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const isTwoH = pool.baseItemCategory.id === "two_hand_weapon";

  type Row = { key: PrefixSuffixKey; tier: string; cost: ResourceBundle };
  const rows: Row[] = [];
  const unsupported: string[] = [];

  for (const key of PREFIX_SUFFIX_KEYS) {
    const slot = slots[key] as SlotValue;
    if (!slot) continue;
    const cost = getSlotCost(slot.sourceGroup, slot.tier, isTwoH);
    if (cost) {
      rows.push({ key, tier: slot.tier, cost });
    } else {
      unsupported.push(`${SLOT_LABELS[key]} (${displayTier(slot.tier)})`);
    }
  }

  if (rows.length === 0 && unsupported.length === 0) return null;

  const needsPE = rows.some((r) => r.cost.preciousEmbers > 0);
  const needsME = rows.some((r) => r.cost.matchlessEmbers > 0);
  const needsUE = rows.some((r) => r.cost.ultimateEmbers > 0);
  const needsSF = rows.some((r) => r.cost.sacredFossils > 0);

  const totalBundle = rows.reduce((acc, r) => addBundles(acc, r.cost), ZERO_BUNDLE);
  const totalFEVal = rows.length > 0 ? calcTotalFE(totalBundle, prices) : null;

  const PRICE_INPUTS: { key: keyof ResourcePrices; label: string; show: boolean }[] = [
    { key: "preciousEmber",  label: "Precious Ember",  show: needsPE },
    { key: "matchlessEmber", label: "Matchless Ember", show: needsME },
    { key: "ultimateEmber",  label: "Ultimate Ember",  show: needsUE },
    { key: "sacredFossil",   label: "Sacred Fossil",   show: needsSF },
  ];

  function fmtR(n: number) {
    if (n === 0) return "—";
    return n % 1 === 0
      ? n.toLocaleString("en-US")
      : n.toFixed(1);
  }

  return (
    <div className="mt-2 mb-1 p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-violet-400">Prefix / Suffix Cost Estimate</p>
        {totalFEVal !== null && (
          <span className="text-xs text-white flex items-center gap-1">
            <span className="font-bold">{Math.round(totalFEVal).toLocaleString("en-US")}</span> <FEIcon />
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-sm font-bold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>
      {expanded && (
        <>
          {rows.length > 0 && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
                      <th className="pb-1.5 pr-3">Slot</th>
                      <th className="pb-1.5 pr-3">Tier</th>
                      <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end">Raw <FEIcon className="w-3.5 h-3.5" /></span></th>
                      {needsPE && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Precious Ember" className="w-3.5 h-3.5" />Precious</span></th>}
                      {needsME && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Matchless Ember" className="w-3.5 h-3.5" />Matchless</span></th>}
                      {needsUE && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Ultimate Ember" className="w-3.5 h-3.5" />Ult. Ember</span></th>}
                      {needsSF && <th className="pb-1.5 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Sacred Fossil" className="w-3.5 h-3.5" />Fossils</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ key, tier, cost }) => (
                      <tr key={key} className="border-b border-zinc-800/50">
                        <td className="py-1.5 pr-3 text-zinc-300">{SLOT_LABELS[key]}</td>
                        <td className="py-1.5 pr-3 text-zinc-400">{displayTier(tier)}</td>
                        <td className="py-1.5 pr-3 text-right text-zinc-200">{fmtR(cost.fe)}</td>
                        {needsPE && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.preciousEmbers)}</td>}
                        {needsME && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.matchlessEmbers)}</td>}
                        {needsUE && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.ultimateEmbers)}</td>}
                        {needsSF && <td className="py-1.5 text-right text-zinc-400">{fmtR(cost.sacredFossils)}</td>}
                      </tr>
                    ))}
                    {rows.length > 1 && (
                      <tr className="font-semibold border-t border-zinc-700">
                        <td colSpan={2} className="pt-2 pb-1 pr-3 text-zinc-300">Total</td>
                        <td className="pt-2 pb-1 pr-3 text-right text-zinc-200">{fmtR(totalBundle.fe)}</td>
                        {needsPE && <td className="pt-2 pb-1 pr-3 text-right text-zinc-300">{fmtR(totalBundle.preciousEmbers)}</td>}
                        {needsME && <td className="pt-2 pb-1 pr-3 text-right text-zinc-300">{fmtR(totalBundle.matchlessEmbers)}</td>}
                        {needsUE && <td className="pt-2 pb-1 pr-3 text-right text-zinc-300">{fmtR(totalBundle.ultimateEmbers)}</td>}
                        {needsSF && <td className="pt-2 pb-1 text-right text-zinc-300">{fmtR(totalBundle.sacredFossils)}</td>}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FE-per-resource price inputs */}
              {PRICE_INPUTS.some((p) => p.show) && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-500 flex items-center gap-1"><FEIcon className="w-3.5 h-3.5" /> per resource:</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {PRICE_INPUTS.filter((p) => p.show).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-400 shrink-0 flex items-center gap-1">
                          <MatIcon name={label} className="w-4 h-4" />
                          {label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="w-24 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                          placeholder={RESOURCE_PRICE_DEFAULTS[key]}
                          value={prices[key]}
                          onChange={(e) => onPricesChange({ ...prices, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  {totalFEVal !== null && (
                    <div className="space-y-1 pt-2 border-t border-zinc-700/50 text-xs">
                      <div className="flex justify-between text-zinc-500">
                        <span className="flex items-center gap-1">Raw crafting <FEIcon className="w-3.5 h-3.5" /></span>
                        <span className="flex items-center gap-1">{Math.round(totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span className="flex items-center gap-1">Materials (converted to <FEIcon className="w-3.5 h-3.5" />)</span>
                        <span className="flex items-center gap-1">{Math.round(totalFEVal - totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-zinc-700/50 pt-1">
                        <span className="text-zinc-400 flex items-center gap-1">Prefix / Suffix total <FEIcon className="w-3.5 h-3.5" /></span>
                        <span className="text-white font-bold flex items-center gap-1">{Math.round(totalFEVal).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {rows.some((r) => r.tier === "T0_PLUS") && (
            <p className="mt-1.5 text-xs text-zinc-600">
              * T0+ affixes shown at T0 craft cost. The T0→T0+ upgrade is calculated in the Corrosion section below.
            </p>
          )}
          {unsupported.length > 0 && (
            <p className="mt-1 text-xs text-zinc-600">
              Cost not modelled for: {unsupported.join(", ")} — only T1, T0, and T0+ are supported.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Grand total section ──────────────────────────────────────────────────────

type GrandTotalSectionProps = {
  pool: CraftedPool;
  slots: ItemSlots;
  baseCostFE: string;
  shallowCostFE: string;
  modCostFE: string;
  resourcePrices: ResourcePrices;
};

// Shared helper — computes each craft cost component and returns lines + total.
// Used by both GrandTotalSection and CorrosionSection.
function computeCraftCostLines(
  pool: CraftedPool,
  slots: ItemSlots,
  baseCostFE: string,
  shallowCostFE: string,
  modCostFE: string,
  resourcePrices: ResourcePrices,
): { lines: { label: string; value: number | null }[]; total: number | null } {
  const isTwoH = pool.baseItemCategory.id === "two_hand_weapon";

  const baseFE: number | null = (() => {
    if (slots.base?.sourceGroup !== "BASE_AFFIXES") return null;
    const v = parseFloat(baseCostFE);
    return isNaN(v) ? 0 : v;
  })();

  const dreamFE: number | null = (() => {
    if (!slots.dream) return null;
    const D = pool.groups["SWEET_DREAM_AFFIXES"]?.length ?? 0;
    const N = pool.groups["NIGHTMARE_AFFIXES"]?.length ?? 0;
    const k = slots.nightmare.length;
    if (D === 0 || N === 0 || k === 0) return null;
    const pSingle = (1 / D) * (k / N);
    const pRoll = 1 - Math.pow(1 - pSingle, 3);
    if (pRoll <= 0) return null;
    const defaultSc = SHALLOW_COST_DEFAULTS[getItemType(pool)];
    const sc = parseFloat(shallowCostFE) || parseFloat(defaultSc);
    return sc > 0 ? (1 / pRoll) * 3 * sc : null;
  })();

  const sequenceFE: number | null = (() => {
    if (!slots.sequence) return null;
    const isAdv = slots.sequence.sourceGroup === "ADVANCED_SEQUENCES";
    const pSuccess = isAdv ? getAdvancedSequenceP(slots.sequence.affixId) : P_INTERMEDIATE;
    const modName = getModName(pool, isAdv);
    const defaultMc = MOD_COST_DEFAULTS[modName] ?? "0";
    const mc = parseFloat(modCostFE) || parseFloat(defaultMc);
    return mc > 0 ? (1 / pSuccess) * (isTwoH ? 20 : 10) * mc : null;
  })();

  let psTotalBundle = ZERO_BUNDLE;
  let hasAnyPS = false;
  for (const key of PREFIX_SUFFIX_KEYS) {
    const slot = slots[key] as SlotValue;
    if (!slot) continue;
    const cost = getSlotCost(slot.sourceGroup, slot.tier, isTwoH);
    if (cost) { psTotalBundle = addBundles(psTotalBundle, cost); hasAnyPS = true; }
  }
  const psFE: number | null = hasAnyPS ? calcTotalFE(psTotalBundle, resourcePrices) : null;

  const lines: { label: string; value: number | null }[] = [];
  if (slots.base?.sourceGroup === "BASE_AFFIXES") lines.push({ label: "Base Affix", value: baseFE });
  if (slots.dream) lines.push({ label: "Dream Affix", value: dreamFE });
  if (slots.sequence) lines.push({ label: "Sequence", value: sequenceFE });
  if (hasAnyPS) lines.push({ label: "Prefix / Suffix", value: psFE });

  const total = lines.length > 0 && lines.every((l) => l.value !== null)
    ? lines.reduce((s, l) => s + l.value!, 0)
    : null;

  return { lines, total };
}

function GrandTotalSection({
  pool,
  slots,
  baseCostFE,
  shallowCostFE,
  modCostFE,
  resourcePrices,
}: GrandTotalSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { lines, total: grandTotal } = computeCraftCostLines(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices,
  );

  if (lines.length === 0) return null;

  return (
    <>
      <Section
        label="Cost Breakdown"
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
      />
      {expanded && (
        <div className="mt-1 p-3 rounded bg-zinc-800/50 border border-zinc-700/50 space-y-1.5 text-xs">
          {lines.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-8">
              <span className="text-zinc-400">{label}</span>
              <span className="text-zinc-200 flex items-center gap-1">
                {value !== null
                  ? <>{Math.round(value).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                  : "—"}
              </span>
            </div>
          ))}
          <div className="flex justify-between gap-8 font-semibold border-t border-zinc-700/50 pt-1.5">
            <span className="text-zinc-300">Total</span>
            <span className="text-white font-bold flex items-center gap-1">
              {grandTotal !== null
                ? <>{Math.round(grandTotal).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                : "—"}
            </span>
          </div>
          {grandTotal === null && (
            <p className="text-zinc-600 mt-0.5">
              Fill in all cost inputs above to see the grand total.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Corrosion total helper ───────────────────────────────────────────────────

function computeCorrosionTotal(
  pool: CraftedPool,
  slots: ItemSlots,
  baseCostFE: string,
  shallowCostFE: string,
  modCostFE: string,
  resourcePrices: ResourcePrices,
  corrosionCostFE: string,
): number | null {
  const wantsCorrodedBase = slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES";
  const t0PlusKeys = PREFIX_SUFFIX_KEYS.filter(
    (k) => (slots[k] as SlotValue)?.tier === "T0_PLUS",
  );
  const w = t0PlusKeys.length;
  const m = PREFIX_SUFFIX_KEYS.filter((k) => (slots[k] as SlotValue) !== null).length;

  if (!wantsCorrodedBase && w === 0) return null;
  if (wantsCorrodedBase && w > 0) return null; // impossible combo

  const nCorrodedBase = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;
  const pSuccess = corrosionSuccessP(wantsCorrodedBase, nCorrodedBase, w, m);
  if (pSuccess <= 0) return null;

  const corrCost = parseFloat(corrosionCostFE) || parseFloat(CORROSION_COST_DEFAULT);
  if (!(corrCost > 0)) return null;

  const avgAttempts = 1 / pSuccess;
  const { total: craftCostPerAttempt } = computeCraftCostLines(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices,
  );

  if (craftCostPerAttempt === null) return avgAttempts * corrCost;
  return avgAttempts * (craftCostPerAttempt + corrCost);
}

// ─── Corrosion section ────────────────────────────────────────────────────────

// Outcome probabilities
const P_MUTATION    = 0.30; // removes base affix → random corroded base
const P_DESECRATION = 0.15; // upgrades 2 random prefix/suffix by 1-2 tiers
const P_ARROGANCE   = 0.15; // upgrades 1 random prefix/suffix by 1-2 tiers
// Chaos (0.30) = rerolls values only (treated same as Void for our purposes)
// Void  (0.10) = does nothing

function corrosionSuccessP(
  wantsCorrodedBase: boolean,
  nCorrodedBase: number,
  w: number, // desired T0+ prefix/suffix count
  m: number, // total prefix/suffix count
): number {
  if (wantsCorrodedBase) {
    // Success = Mutation AND lands on the specific corroded base
    return nCorrodedBase > 0 ? P_MUTATION / nCorrodedBase : 0;
  }
  // Success = at least one of the desired T0+ affixes gets upgraded
  if (w === 0 || m === 0) return 1;
  if (w === 1) {
    // Arrogance: P(desired is the 1 chosen) = 1/m
    // Desecration: P(desired is among the 2 chosen) = min(2,m)/m
    return P_ARROGANCE / m + P_DESECRATION * Math.min(2, m) / m;
  }
  if (w === 2 && m >= 2) {
    // Only Desecration can upgrade 2 affixes. P(both desired chosen) = 2/(m*(m-1))
    return P_DESECRATION * 2 / (m * (m - 1));
  }
  return 0; // w >= 3 or degenerate: impossible
}

type CorrosionSectionProps = {
  pool: CraftedPool;
  slots: ItemSlots;
  baseCostFE: string;
  shallowCostFE: string;
  modCostFE: string;
  resourcePrices: ResourcePrices;
  corrosionCostFE: string;
  onCorrosionCostFEChange: (v: string) => void;
};

function CorrosionSection({
  pool,
  slots,
  baseCostFE,
  shallowCostFE,
  modCostFE,
  resourcePrices,
  corrosionCostFE,
  onCorrosionCostFEChange,
}: CorrosionSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const wantsCorrodedBase = slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES";
  const t0PlusKeys = PREFIX_SUFFIX_KEYS.filter(
    (k) => (slots[k] as SlotValue)?.tier === "T0_PLUS",
  );
  const w = t0PlusKeys.length;
  const m = PREFIX_SUFFIX_KEYS.filter((k) => (slots[k] as SlotValue) !== null).length;

  // Only show this section when corrosion has a specific goal
  if (!wantsCorrodedBase && w === 0) return null;

  const impossible = wantsCorrodedBase && w > 0;
  const nCorrodedBase = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;

  const pSuccess = impossible
    ? 0
    : corrosionSuccessP(wantsCorrodedBase, nCorrodedBase, w, m);
  const avgAttempts = pSuccess > 0 ? 1 / pSuccess : null;

  // Craft cost per attempt (re-crafting from scratch each time)
  const { total: craftCostPerAttempt } = computeCraftCostLines(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices,
  );

  const corrCost = parseFloat(corrosionCostFE) || parseFloat(CORROSION_COST_DEFAULT);
  const hasCorrCost = corrCost > 0;

  const corrosionOverhead =
    avgAttempts !== null && hasCorrCost ? avgAttempts * corrCost : null;
  const totalWithRecrafts =
    avgAttempts !== null && hasCorrCost && craftCostPerAttempt !== null
      ? avgAttempts * (craftCostPerAttempt + corrCost)
      : null;

  const corrosionTotal = totalWithRecrafts ?? corrosionOverhead;

  // Build scenario description
  const scenarioDesc = impossible
    ? null
    : wantsCorrodedBase
    ? `Mutation — 1 of ${nCorrodedBase} corroded base affixes`
    : w === 1
    ? `Arrogance or Desecration — 1 desired T0+ out of ${m} affixes`
    : w === 2
    ? `Desecration — 2 desired T0+ out of ${m} affixes`
    : `${w} desired T0+ (impossible in one corrosion)`;

  return (
    <>
      <Section
        label="Corrosion"
        feCost={corrosionTotal}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
      />
      {expanded && (
        <div className="mt-1 p-3 rounded bg-zinc-800/50 border border-zinc-700/50 text-xs space-y-1.5">
          {impossible ? (
            <p className="text-red-400">
              Cannot achieve both a specific corroded base (Mutation) and T0+ upgrades
              (Desecration/Arrogance) in a single corrosion — these are different outcomes.
              Corrosion is one-time and permanent.
            </p>
          ) : (
            <>
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Target</span>
                <span className="text-zinc-200 text-right">{scenarioDesc}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">P(success per attempt)</span>
                <span className="text-zinc-200">
                  {pSuccess > 0 ? (pSuccess * 100).toFixed(3) + "%" : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Avg attempts</span>
                <span className="text-zinc-200">
                  {avgAttempts !== null ? avgAttempts.toFixed(1) : "—"}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="text-zinc-400 shrink-0 flex items-center gap-1.5">
                  <MatIcon name="Glorious Axis" />
                  FE per Glorious Axis
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  placeholder={CORROSION_COST_DEFAULT}
                  value={corrosionCostFE}
                  onChange={(e) => onCorrosionCostFEChange(e.target.value)}
                />
              </div>

              {hasCorrCost && avgAttempts !== null && (
                <div className="space-y-1 border-t border-zinc-700/50 pt-1.5 mt-1">
                  <div className="flex justify-between gap-8 text-zinc-500">
                    <span>Corrosion items cost</span>
                    <span className="flex items-center gap-1">{Math.round(corrosionOverhead!).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                  </div>
                  {craftCostPerAttempt !== null && (
                    <div className="flex justify-between gap-8 text-zinc-500">
                      <span>Re-craft cost ({avgAttempts.toFixed(1)} × craft)</span>
                      <span className="flex items-center gap-1">
                        {Math.round(avgAttempts * craftCostPerAttempt).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8 font-semibold border-t border-zinc-700/50 pt-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      Total <FEIcon className="w-3.5 h-3.5" />{craftCostPerAttempt === null ? " (corrosion only)" : ""}
                    </span>
                    <span className="text-white font-bold flex items-center gap-1">
                      {totalWithRecrafts !== null
                        ? <>{Math.round(totalWithRecrafts).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                        : corrosionOverhead !== null
                        ? <>{Math.round(corrosionOverhead).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                        : "—"}
                    </span>
                  </div>
                  {craftCostPerAttempt === null && (
                    <p className="text-zinc-600 mt-0.5">
                      Fill in all craft cost inputs above to include re-craft overhead.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── Dream cost section ───────────────────────────────────────────────────────

type DreamCostSectionProps = {
  pool: CraftedPool;
  dreamSlot: SlotValue;
  nightmareSlots: NonNullable<SlotValue>[];
  shallowCostFE: string;
  onShallowCostFEChange: (v: string) => void;
};

function DreamCostSection({
  pool,
  dreamSlot,
  nightmareSlots,
  shallowCostFE,
  onShallowCostFEChange,
}: DreamCostSectionProps) {
  const [expanded, setExpanded] = useState(false);
  if (!dreamSlot) return null;

  const D = pool.groups["SWEET_DREAM_AFFIXES"]?.length ?? 0;
  const N = pool.groups["NIGHTMARE_AFFIXES"]?.length ?? 0;
  if (D === 0) return null;

  const shallowName = getShallowDreamName(pool);
  const defaultShallowCost = SHALLOW_COST_DEFAULTS[getItemType(pool)];

  const k = nightmareSlots.length;
  const pSingle = k > 0 && N > 0 ? (1 / D) * (k / N) : 0;
  const pRoll = pSingle > 0 ? 1 - Math.pow(1 - pSingle, 3) : 0;
  const avgRolls = pRoll > 0 ? 1 / pRoll : 0;
  const avgShallows = avgRolls * 3;
  const effectiveShallowCost = parseFloat(shallowCostFE) || parseFloat(defaultShallowCost);
  const totalFE = effectiveShallowCost > 0 && avgShallows > 0
    ? avgShallows * effectiveShallowCost
    : null;

  return (
    <div className="mt-2 mb-1 p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold" style={{ color: "#48b8ff" }}>Dream Cost Estimate</p>
        {totalFE !== null && (
          <span className="text-xs text-white flex items-center gap-1">
            <span className="font-bold">{Math.round(totalFE).toLocaleString("en-US")}</span> <FEIcon className="w-3.5 h-3.5" />
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-sm font-bold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>
      {expanded && (
        k === 0 ? (
          <p className="text-xs text-zinc-500">
            Select acceptable nightmare affixes above to calculate cost.
          </p>
        ) : (
          <>
            <div className="space-y-1 text-xs text-zinc-400 mb-3">
              <div className="flex justify-between gap-8">
                <span>Dream pool size</span>
                <span className="text-zinc-200">{D}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Nightmare pool size</span>
                <span className="text-zinc-200">{N}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Acceptable nightmares</span>
                <span className="text-zinc-200">{k}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>P(hit per slot)</span>
                <span className="text-zinc-200">{(pSingle * 100).toFixed(3)}%</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>P(hit per roll, 3 slots)</span>
                <span className="text-zinc-200">{(pRoll * 100).toFixed(3)}%</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Avg rolls</span>
                <span className="text-zinc-200">{avgRolls.toFixed(1)}</span>
              </div>
              <div className="flex justify-between gap-8 font-medium border-t border-zinc-700/50 pt-1 mt-1">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <MatIcon name={shallowName} />
                  Avg {shallowName}
                </span>
                <span className="text-sky-300">{avgShallows.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 shrink-0 flex items-center gap-1.5">
                <FEIcon className="w-3.5 h-3.5" /> per <MatIcon name={shallowName} /> {shallowName}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                placeholder={defaultShallowCost}
                value={shallowCostFE}
                onChange={(e) => onShallowCostFEChange(e.target.value)}
              />
            </div>
            {totalFE !== null && (
              <div className="flex justify-between mt-2 pt-2 border-t border-zinc-700/50 text-xs font-semibold">
                <span className="text-zinc-400 flex items-center gap-1">Estimated total <FEIcon className="w-3.5 h-3.5" /></span>
                <span className="text-white font-bold flex items-center gap-1">
                  {Math.round(totalFE).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

type Props = {
  pool: CraftedPool;
  slots: ItemSlots;
  onChange: (slots: ItemSlots) => void;
  onClear?: () => void;
  baseCostFE: string;
  onBaseCostFEChange: (v: string) => void;
  shallowCostFE: string;
  onShallowCostFEChange: (v: string) => void;
  modCostFE: string;
  onModCostFEChange: (v: string) => void;
  resourcePrices: ResourcePrices;
  onResourcePricesChange: (p: ResourcePrices) => void;
  corrosionCostFE: string;
  onCorrosionCostFEChange: (v: string) => void;
};

const ADVANCED_GROUPS: AffixGroupType[] = ["ADVANCED_PREFIXES", "ADVANCED_SUFFIXES"];
const ULTIMATE_GROUPS: AffixGroupType[] = ["ULTIMATE_PREFIXES", "ULTIMATE_SUFFIXES"];
const PREFIX_SUFFIX_KEYS = [
  "prefix1", "prefix2", "prefix3", "suffix1", "suffix2", "suffix3",
] as const;
type PrefixSuffixKey = (typeof PREFIX_SUFFIX_KEYS)[number];

export default function ItemCard({
  pool,
  slots,
  onChange,
  onClear,
  baseCostFE,
  onBaseCostFEChange,
  shallowCostFE,
  onShallowCostFEChange,
  modCostFE,
  onModCostFEChange,
  resourcePrices,
  onResourcePricesChange,
  corrosionCostFE,
  onCorrosionCostFEChange,
}: Props) {
  const hasSequences =
    (pool.groups["INTERMEDIATE_SEQUENCES"]?.length ?? 0) > 0 ||
    (pool.groups["ADVANCED_SEQUENCES"]?.length ?? 0) > 0;

  // Global counts for advanced / ultimate across all prefix+suffix slots
  const advancedCount = PREFIX_SUFFIX_KEYS.filter((k) => {
    const s = slots[k] as SlotValue;
    return s !== null && ADVANCED_GROUPS.includes(s!.sourceGroup);
  }).length;
  const ultimateCount = PREFIX_SUFFIX_KEYS.filter((k) => {
    const s = slots[k] as SlotValue;
    return s !== null && ULTIMATE_GROUPS.includes(s!.sourceGroup);
  }).length;

  // Per-slot set of affix IDs selected in all OTHER prefix/suffix slots
  function takenIdsExcluding(key: PrefixSuffixKey): Set<string> {
    return new Set(
      PREFIX_SUFFIX_KEYS
        .filter((k) => k !== key && slots[k] !== null)
        .map((k) => (slots[k] as SlotValue)!.affixId),
    );
  }

  function update(key: keyof ItemSlots, val: SlotValue) {
    onChange({ ...slots, [key]: val });
  }

  // Top summary computations
  const { total: grandTotal } = computeCraftCostLines(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices,
  );
  const corrosionTotal = computeCorrosionTotal(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices, corrosionCostFE,
  );

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-zinc-100">{pool.name}</h2>
          <p className="text-xs text-zinc-500">
            {pool.baseItemCategory.name}
            {pool.weaponType ? ` · ${pool.weaponType.name}` : ""}
            {pool.attributeType ? ` · ${pool.attributeType}` : ""}
          </p>
        </div>

        {/* Totals centered */}
        <div className="flex flex-col items-center gap-1 mx-4 shrink-0">
          {grandTotal !== null && (
            <span className="text-sm text-white flex items-center gap-1.5">
              <span className="font-bold">{Math.round(grandTotal).toLocaleString("en-US")}</span> <FEIcon className="w-4 h-4" />
            </span>
          )}
          {corrosionTotal !== null && (
            <span className="text-sm text-white opacity-70 flex items-center gap-1.5">
              +corr: <span className="font-bold">{Math.round(corrosionTotal).toLocaleString("en-US")}</span> <FEIcon className="w-4 h-4" />
            </span>
          )}
        </div>

        {onClear && (
          <button
            onClick={onClear}
            title="Remove item"
            className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Base Affix */}
      <Section label="Base Affix" />
      <SimpleSlotRow
        label="Base"
        accent="text-zinc-100"
        groups={[
          { label: "Base", options: getOptions(pool, "BASE_AFFIXES") },
          { label: "Corroded Base", options: getOptions(pool, "CORROSION_BASE_AFFIXES") },
        ]}
        value={slots.base}
        onChange={(v) => update("base", v)}
        showStats
      />
      {slots.base?.sourceGroup === "BASE_AFFIXES" && (
        <div className="flex items-center gap-2 py-1">
          <span className="w-24 shrink-0" />
          <label className="text-xs text-zinc-400 shrink-0 flex items-center gap-1">Cost (<FEIcon className="w-3.5 h-3.5" />)</label>
          <input
            type="number"
            min="0"
            className="w-36 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
            placeholder="0"
            value={baseCostFE}
            onChange={(e) => onBaseCostFEChange(e.target.value)}
          />
        </div>
      )}

      {/* Dream + Nightmare */}
      <Section label="Dream + Nightmare" />
      <SimpleSlotRow
        label="Dream"
        accent="text-[#48b8ff]"
        groups={[{ label: "Dream", options: getOptions(pool, "SWEET_DREAM_AFFIXES") }]}
        value={slots.dream}
        onChange={(v) => update("dream", v)}
        showStats
      />
      <NightmareSlotRow
        pool={pool}
        values={slots.nightmare}
        onChange={(v) => onChange({ ...slots, nightmare: v })}
      />
      <DreamCostSection
        pool={pool}
        dreamSlot={slots.dream}
        nightmareSlots={slots.nightmare}
        shallowCostFE={shallowCostFE}
        onShallowCostFEChange={onShallowCostFEChange}
      />

      {/* Sequence — weapons and shields only */}
      {hasSequences && (
        <>
          <Section label="Sequence" />
          <SimpleSlotRow
            label="Sequence"
            accent="text-emerald-400"
            groups={[
              { label: "Intermediate", options: getOptions(pool, "INTERMEDIATE_SEQUENCES") },
              { label: "Advanced", options: getOptions(pool, "ADVANCED_SEQUENCES") },
            ]}
            groupDotColors={{ "Intermediate": "#ff7d1c", "Advanced": "#fe0000" }}
            value={slots.sequence}
            onChange={(v) => update("sequence", v)}
          />
          <SequenceCostSection
            pool={pool}
            sequenceSlot={slots.sequence}
            modCostFE={modCostFE}
            onModCostFEChange={onModCostFEChange}
          />
        </>
      )}

      {/* Prefixes + Suffixes */}
      <Section label="Prefixes + Suffixes" />
      <p className="text-xs text-zinc-600 mb-1 -mt-0.5 pl-0.5">
        {advancedCount}/2 advanced · {ultimateCount}/2 ultimate
      </p>

      {/* Prefixes sub-section */}
      <div className="flex items-center gap-2 mt-2 mb-0.5">
        <span className="text-xs text-zinc-600 uppercase tracking-wider">Prefixes</span>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>
      {(["prefix1", "prefix2", "prefix3"] as const).map((key, i) => (
        <PrefixSuffixSlotRow
          key={key}
          label={`Prefix ${i + 1}`}
          type="prefix"
          pool={pool}
          value={slots[key]}
          onChange={(v) => update(key, v)}
          advancedCount={advancedCount}
          ultimateCount={ultimateCount}
          takenAffixIds={takenIdsExcluding(key)}
        />
      ))}

      {/* Suffixes sub-section */}
      <div className="flex items-center gap-2 mt-3 mb-0.5">
        <span className="text-xs text-zinc-600 uppercase tracking-wider">Suffixes</span>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>
      {(["suffix1", "suffix2", "suffix3"] as const).map((key, i) => (
        <PrefixSuffixSlotRow
          key={key}
          label={`Suffix ${i + 1}`}
          type="suffix"
          pool={pool}
          value={slots[key]}
          onChange={(v) => update(key, v)}
          advancedCount={advancedCount}
          ultimateCount={ultimateCount}
          takenAffixIds={takenIdsExcluding(key)}
        />
      ))}

      <PrefixSuffixCostSection
        pool={pool}
        slots={slots}
        prices={resourcePrices}
        onPricesChange={onResourcePricesChange}
      />

      <GrandTotalSection
        pool={pool}
        slots={slots}
        baseCostFE={baseCostFE}
        shallowCostFE={shallowCostFE}
        modCostFE={modCostFE}
        resourcePrices={resourcePrices}
      />

      <CorrosionSection
        pool={pool}
        slots={slots}
        baseCostFE={baseCostFE}
        shallowCostFE={shallowCostFE}
        modCostFE={modCostFE}
        resourcePrices={resourcePrices}
        corrosionCostFE={corrosionCostFE}
        onCorrosionCostFEChange={onCorrosionCostFEChange}
      />
    </div>
  );
}
