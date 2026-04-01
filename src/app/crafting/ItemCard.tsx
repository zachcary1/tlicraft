"use client";

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
      <span className="w-24 shrink-0 text-xs font-medium text-purple-400 pt-0.5">Nightmare</span>
      <div className="flex-1 space-y-3">
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
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-1">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
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
  if (!value) return null;
  const opt = options.find((o) => o.affix.id === value.affixId);
  if (!opt) return null;
  const tiers = sortTiers(opt.affix.tiers);

  if (tiers.length === 1) {
    return (
      <span className="w-40 shrink-0 text-xs text-zinc-500 px-2">
        {tierLabel(tiers[0])}
      </span>
    );
  }

  return (
    <select
      className="w-40 shrink-0 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
      value={value.tier}
      onChange={(e) => onChange(e.target.value)}
    >
      {tiers.map((t) => (
        <option key={t.tier} value={t.tier}>
          {tierLabel(t)}
        </option>
      ))}
    </select>
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
};

function SimpleSlotRow({ label, accent, groups, value, onChange, showStats = false }: SimpleSlotProps) {
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

// ─── ItemCard ─────────────────────────────────────────────────────────────────

type Props = {
  pool: CraftedPool;
  slots: ItemSlots;
  onChange: (slots: ItemSlots) => void;
  onClear?: () => void;
};

const ADVANCED_GROUPS: AffixGroupType[] = ["ADVANCED_PREFIXES", "ADVANCED_SUFFIXES"];
const ULTIMATE_GROUPS: AffixGroupType[] = ["ULTIMATE_PREFIXES", "ULTIMATE_SUFFIXES"];
const PREFIX_SUFFIX_KEYS: (keyof ItemSlots)[] = [
  "prefix1", "prefix2", "prefix3", "suffix1", "suffix2", "suffix3",
];

export default function ItemCard({ pool, slots, onChange, onClear }: Props) {
  const hasSequences =
    (pool.groups["INTERMEDIATE_SEQUENCES"]?.length ?? 0) > 0 ||
    (pool.groups["ADVANCED_SEQUENCES"]?.length ?? 0) > 0;

  // Global counts for advanced / ultimate across all prefix+suffix slots
  const advancedCount = PREFIX_SUFFIX_KEYS.filter(
    (k) => slots[k] !== null && ADVANCED_GROUPS.includes(slots[k]!.sourceGroup),
  ).length;
  const ultimateCount = PREFIX_SUFFIX_KEYS.filter(
    (k) => slots[k] !== null && ULTIMATE_GROUPS.includes(slots[k]!.sourceGroup),
  ).length;

  // Per-slot set of affix IDs selected in all OTHER prefix/suffix slots
  function takenIdsExcluding(key: keyof ItemSlots): Set<string> {
    return new Set(
      PREFIX_SUFFIX_KEYS
        .filter((k) => k !== key && slots[k] !== null)
        .map((k) => slots[k]!.affixId),
    );
  }

  function update(key: keyof ItemSlots, val: SlotValue) {
    onChange({ ...slots, [key]: val });
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-zinc-100">{pool.name}</h2>
          <p className="text-xs text-zinc-500">
            {pool.baseItemCategory.name}
            {pool.weaponType ? ` · ${pool.weaponType.name}` : ""}
            {pool.attributeType ? ` · ${pool.attributeType}` : ""}
          </p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            title="Remove item"
            className="ml-3 shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Special */}
      <Section label="Special" />
      <SimpleSlotRow
        label="Base"
        accent="text-yellow-400"
        groups={[
          { label: "Base", options: getOptions(pool, "BASE_AFFIXES") },
          { label: "Corroded Base", options: getOptions(pool, "CORROSION_BASE_AFFIXES") },
        ]}
        value={slots.base}
        onChange={(v) => update("base", v)}
        showStats
      />
      <SimpleSlotRow
        label="Dream"
        accent="text-sky-400"
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
      {hasSequences && (
        <SimpleSlotRow
          label="Sequence"
          accent="text-emerald-400"
          groups={[
            { label: "Intermediate", options: getOptions(pool, "INTERMEDIATE_SEQUENCES") },
            { label: "Advanced", options: getOptions(pool, "ADVANCED_SEQUENCES") },
          ]}
          value={slots.sequence}
          onChange={(v) => update("sequence", v)}
        />
      )}

      {/* Prefixes */}
      <Section label={`Prefixes — ${advancedCount}/2 advanced · ${ultimateCount}/2 ultimate`} />
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

      {/* Suffixes */}
      <Section label="Suffixes" />
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
    </div>
  );
}
