"use client";

import { useState, useRef, useEffect, useLayoutEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import type { AffixGroupType } from "@prisma/client";
import type { CraftedPool, PoolAffix, PoolTier } from "@/services/crafting/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotValue = {
  affixId: string;
  affixName: string;
  tier: string;
  sourceGroup: AffixGroupType;
} | null;

export type ActiveSlotId =
  | "base"
  | "dream"
  | "nightmare"
  | "sequence"
  | "prefix1" | "prefix2" | "prefix3"
  | "suffix1" | "suffix2" | "suffix3";

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

export function displayTier(tier: string): string {
  return tier === "T0_PLUS" ? "T0+" : tier;
}

export function tierTextColor(tier: string): string {
  if (tier === "T0_PLUS") return "#fe3333";
  if (tier === "T0")      return "#fe3333";
  if (tier === "T1")      return "#ff7c1c";
  if (tier === "T2")      return "#c192ff";
  return "";
}

function tierBadgeFill(tier: string): string {
  if (tier === "T0" || tier === "T0_PLUS") return "#603020";
  if (tier === "T1") return "#6f3f22";
  if (tier === "T2") return "#5f2b90";
  return "";
}

export function TierBadge({ tier }: { tier: string }) {
  const textColor = tierTextColor(tier);
  const fillColor = tierBadgeFill(tier);
  if (!textColor || !fillColor) {
    return <span className="font-bold text-zinc-400 shrink-0 text-[11px]">{displayTier(tier)}</span>;
  }
  return (
    <span
      className="font-bold shrink-0"
      style={{
        color: textColor,
        border: `1px solid ${textColor}`,
        borderRadius: "3px 0 3px 0",
        background: `linear-gradient(to bottom, #111111, ${fillColor})`,
        padding: "1px 11px",
        fontSize: "13px",
        lineHeight: "1.4",
        height: "20px",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {displayTier(tier)}
    </span>
  );
}

export function sortTiers(tiers: PoolTier[]): PoolTier[] {
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
export function buildAffixLabel(affix: PoolAffix, tierStr?: string): string {
  const sorted = sortTiers(affix.tiers);
  const tier = tierStr
    ? (sorted.find((t) => t.tier === tierStr) ?? sorted[sorted.length - 1])
    : (sorted.find((t) => t.tier === "T1") ?? sorted[sorted.length - 1]);
  if (!tier || tier.stats.length === 0) return affix.name;
  const firstStat = tier.stats[0];

  function fillRange(template: string, stat: PoolStat): string {
    const r =
      stat.minValue === stat.maxValue
        ? `${stat.minValue}`
        : `${stat.minValue}–${stat.maxValue}`;
    return template
      .replace(/\(min-max\)/gi, `(${r})`)
      .replace(/\(min\)/g, `(${stat.minValue})`)
      .replace(/\bmin\b/g, `(${stat.minValue})`);
  }

  // Armor/ring/belt-style: affix name is bare ("Max Life"); value template lives
  // in each stat's label field ("+(min-max) Max Life"). Fill each stat label with
  // its own values and join when there are multiple stats.
  if (!/\(min-max\)/i.test(affix.name)) {
    return tier.stats
      .map((stat) => fillRange(stat.label, stat).trim())
      .join(" / ");
  }

  // Weapon/sequence-style: the affix name itself is the template with (min-max)
  // placeholders — replace them sequentially, one per stat.
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

  // If the name template had fewer (min-max) slots than there are stats, append
  // the remaining stat labels with their values filled in.
  if (statIdx < tier.stats.length) {
    const extras = tier.stats.slice(statIdx).map((s) => fillRange(s.label, s).trim());
    name = name.trim() + " / " + extras.join(" / ");
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

export function getOptions(pool: CraftedPool, group: AffixGroupType): AffixOption[] {
  return (pool.groups[group] ?? []).map((affix) => ({ affix, sourceGroup: group }));
}

// ─── Nightmare helpers ────────────────────────────────────────────────────────

export function nightmareLabel(affix: PoolAffix): string {
  const tier = affix.tiers[0];
  if (!tier || tier.stats.length === 0) return `-1 ${affix.name}`;
  const parts = tier.stats.map((s) => {
    const range =
      s.minValue === s.maxValue
        ? `${s.minValue}`
        : `${s.minValue}–${s.maxValue}`;
    return s.unit === "PERCENT" ? `(${range})%` : `(${range})`;
  });
  return `-${parts.join(", ")} ${affix.name}`;
}

export const NIGHTMARE_GROUP_ORDER = ["Damage", "Defense", "Utility", "Special"] as const;
export type NightmareGroup = (typeof NIGHTMARE_GROUP_ORDER)[number];
export const NIGHTMARE_GROUP_ACCENT: Record<NightmareGroup, string> = {
  Damage:  "text-red-400",
  Defense: "text-blue-400",
  Utility: "text-yellow-400",
  Special: "text-purple-300",
};

export function getNightmareGroup(statId: string): NightmareGroup {
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
  onActivate?: () => void;
  isActive?: boolean;
  warn?: boolean;
  disabled?: boolean;
  buttonBg?: string;
};

function NightmareSlotRow({ pool, values, onActivate, isActive = false, warn = false, disabled = false, buttonBg = "#dedfdf" }: NightmareSlotRowProps) {
  const options = getOptions(pool, "NIGHTMARE_AFFIXES");
  if (options.length === 0) return null;

  return (
    <div className="flex items-start gap-2 py-1">
      <button
        onClick={onActivate}
        disabled={disabled && values.length === 0}
        title={disabled && values.length === 0 ? "No dream affix — nightmare affixes unavailable" : undefined}
        className={`flex-1 min-w-0 relative flex items-center pl-3 pr-[48px] py-3 rounded-sm border-0 overflow-hidden focus:outline-none text-base transition-all ${
          warn ? "ring-1 ring-red-700 cursor-pointer hover:brightness-95"
          : disabled && values.length === 0 ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:brightness-95"
        }`}
        style={{ backgroundColor: buttonBg }}
      >
        <span className={`text-sm w-full text-center ${warn ? "text-red-400 font-medium" : ""}`} style={!warn ? { color: values.length > 0 ? "#1a1a1a" : "#939393" } : undefined}>
          {values.length > 0 ? `${values.length} selected` : disabled ? "— limit reached —" : "none selected"}
        </span>
        <span
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center"
          style={{ backgroundColor: isActive ? "#5ddc4d" : "#979798" }}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isActive ? "#2d9927" : "#6c6b6c" }}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={isActive ? "#2fff21" : "white"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </span>
      </button>
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

export function FEIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <MatIcon name="Flame Elementium" className={className} />;
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Section({
  label,
  feCost,
  expanded,
  onToggle,
  hoverCard,
  highlighted,
  plain = false,
  centerLabel = false,
}: {
  label: string;
  feCost?: number | null;
  expanded?: boolean;
  onToggle?: () => void;
  hoverCard?: React.ReactNode;
  highlighted?: boolean;
  plain?: boolean;
  centerLabel?: boolean;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ bottom: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltipOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function handleBadgeEnter() {
    cancelClose();
    if (!hoverCard) return;
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left + rect.width / 2 });
    }
    setTooltipOpen(true);
  }

  const labelCls = `font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-150 ${plain ? (highlighted ? "text-[15px] text-[#1a1a1a]" : "text-[13px] text-[#555]") : (highlighted ? "text-[18px] text-[#1a1a1a]" : "text-[16px] text-[#555]")}`;

  return (
    <div className={`relative flex items-center gap-2 px-3 py-0.5${plain ? " bg-[#eaeaea]" : ""}`} style={plain ? undefined : { background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
      {centerLabel ? (
        <>
          <span className={`absolute left-0 right-0 text-center pointer-events-none ${labelCls}`}>{label}</span>
          <span className={`invisible ${labelCls}`}>x</span>
        </>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
      <span
        ref={badgeRef}
        className={`ml-auto text-[15px] font-semibold tracking-[-0.02em] flex items-center gap-1.5 transition-all duration-150 bg-[#848485] px-2.5 py-0.5${
          feCost == null ? " invisible" :
          Number.isNaN(feCost)
            ? " text-red-400 cursor-help"
            : hoverCard
            ? " text-[#e0ddd8] cursor-help"
            : " text-[#e0ddd8]"
        }`}
        style={{ borderRadius: "0 6px 0 6px", boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}
        onMouseEnter={feCost != null ? handleBadgeEnter : undefined}
        onMouseLeave={feCost != null ? scheduleClose : undefined}
      >
        {feCost == null ? (
          <span className="font-bold">0</span>
        ) : Number.isNaN(feCost) ? (
          <span className="font-bold">NaN</span>
        ) : (
          <>
            <span className="font-bold">{Math.round(feCost).toLocaleString("en-US")}</span>
            <FEIcon className="w-5 h-5" />
          </>
        )}
      </span>
      {onToggle && (
        <button
          onClick={onToggle}
          className="w-5 h-5 flex items-center justify-center text-sm font-bold text-[#555] hover:text-[#1a1a1a] transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      )}
      {tooltipOpen && hoverCard && tooltipPos && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", bottom: tooltipPos.bottom, left: tooltipPos.left, transform: "translateX(-50%)", zIndex: 9999 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {hoverCard}
        </div>,
        document.body
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

function TierLabel({ tier, highlighted = false }: { tier: PoolTier; highlighted?: boolean }) {
  const stats = tierStatsStr(tier);
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <TierBadge tier={tier.tier} />
      {stats && <span className={`transition-colors duration-150 ${highlighted ? "text-[#1a1a1a]" : "text-zinc-500"}`}>{stats}</span>}
    </span>
  );
}

// Returns the effective display tier for an affix, overriding to T0_PLUS for
// corroded base affixes regardless of what the DB tier field says.
export function getEffectiveTier(sourceGroup: AffixGroupType, affix: PoolAffix): string {
  if (sourceGroup === "CORROSION_BASE_AFFIXES") return "T0_PLUS";
  return affix.tiers[0]?.tier ?? "";
}

// Tier badge + affix name, used in base/dream dropdowns.
function AffixTierRow({
  affix,
  sourceGroup,
  displayLabel,
  highlighted = false,
}: {
  affix: PoolAffix;
  sourceGroup: AffixGroupType;
  displayLabel: string;
  highlighted?: boolean;
}) {
  const tier = getEffectiveTier(sourceGroup, affix);
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {tier && <TierBadge tier={tier} />}
      <span className="truncate transition-colors duration-150" style={{ color: tier === "T0_PLUS" ? "#5e56e1" : "#1a1a1a" }}>{displayLabel}</span>
    </span>
  );
}

// ─── Tier picker (shared) ─────────────────────────────────────────────────────

function TierPicker({
  options,
  value,
  onChange,
  highlighted = false,
}: {
  options: AffixOption[];
  value: SlotValue;
  onChange: (tier: string) => void;
  highlighted?: boolean;
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
      <span className={`w-40 shrink-0 text-xs px-2 transition-transform duration-150 ${highlighted ? "scale-110 origin-left" : ""}`}>
        <TierLabel tier={tiers[0]} highlighted={highlighted} />
      </span>
    );
  }

  return (
    <div ref={ref} className="w-40 shrink-0 relative text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-1 rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] px-2 py-3 focus:outline-none hover:border-zinc-600 transition-transform duration-150 ${highlighted ? "scale-110 origin-left" : ""}`}
      >
        <TierLabel tier={selectedTier} highlighted={highlighted} />
        <svg className="shrink-0 text-zinc-500 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute z-[150] top-full left-0 mt-1 w-full rounded border border-[#1c1c1c] bg-[#d5d6d6] shadow-xl py-0.5">
          {tiers.map((t) => (
            <button
              key={t.tier}
              className={`w-full flex items-center px-2 py-1.5 hover:bg-[#d5d6d6] transition-colors ${t.tier === value.tier ? "bg-[#d5d6d6]/60" : ""}`}
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
  onActivate?: () => void;
  isActive?: boolean;
  showStats?: boolean;
  showTiers?: boolean;
  groupDotColors?: Record<string, string>;
  highlighted?: boolean;
  disabled?: boolean;
  buttonBg?: string;
};

export function GroupDot({ color }: { color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: "14px", height: "14px", backgroundColor: color, borderRadius: "6px" }}
    >
      <span style={{ width: "6px", height: "6px", backgroundColor: "#3a3a3a", borderRadius: "3px" }} />
    </span>
  );
}

type DropDir = "down" | "up" | "center";

function SimpleSlotRow({ label, accent, groups, value, onChange, onActivate, isActive = false, showStats = false, showTiers = false, groupDotColors, highlighted = false, disabled = false, buttonBg = "#dedfdf" }: SimpleSlotProps) {
  const allOptions = groups.flatMap((g) => g.options);
  if (allOptions.length === 0) return null;

  const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);
  const selectedGroup = selectedOpt
    ? groups.find((g) => g.options.some((o) => o.affix.id === selectedOpt.affix.id))
    : null;
  const selectedDotColor = selectedGroup && groupDotColors ? groupDotColors[selectedGroup.label] : null;

  function optionLabel(affix: PoolAffix): string {
    return showStats ? buildAffixLabel(affix, value?.affixId === affix.id ? value?.tier : undefined) : affix.name;
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={onActivate}
        disabled={disabled && !value}
        title={disabled && !value ? "Limit reached" : undefined}
        className={`flex-1 min-w-0 relative flex items-center gap-2 pl-3 pr-[48px] py-3 rounded-sm border-0 overflow-hidden focus:outline-none text-sm transition-all ${
          disabled && !value ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-95"}`}
        style={{ backgroundColor: buttonBg }}
      >
        {selectedOpt ? (
          showTiers ? (
            <AffixTierRow affix={selectedOpt.affix} sourceGroup={selectedOpt.sourceGroup} displayLabel={optionLabel(selectedOpt.affix)} highlighted={highlighted} />
          ) : groupDotColors ? (
            <span className="flex items-center gap-2 min-w-0">
              {selectedDotColor ? <GroupDot color={selectedDotColor} /> : <span className="w-3 h-3 shrink-0" />}
              <span className="truncate" style={{ color: value?.tier === "T0_PLUS" ? "#5e56e1" : "#1a1a1a" }}>{optionLabel(selectedOpt.affix)}</span>
            </span>
          ) : (
            <span className="truncate transition-colors duration-150" style={{ color: value?.tier === "T0_PLUS" ? "#5e56e1" : "#1a1a1a" }}>{optionLabel(selectedOpt.affix)}</span>
          )
        ) : (
          <span className="w-full text-center" style={{ color: "#939393" }}>{disabled ? "— limit reached —" : "Empty affix"}</span>
        )}
        <span
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center"
          style={{ backgroundColor: isActive ? "#5ddc4d" : "#979798" }}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isActive ? "#2d9927" : "#6c6b6c" }}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={isActive ? "#2fff21" : "white"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </span>
      </button>
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
  onActivate?: () => void;
  isActive?: boolean;
  advancedCount: number;
  ultimateCount: number;
  takenAffixIds: Set<string>;
  highlighted?: boolean;
};

function PrefixSuffixSlotRow({
  label,
  type,
  pool,
  value,
  onChange,
  onActivate,
  isActive = false,
  advancedCount,
  ultimateCount,
  highlighted = false,
}: PrefixSuffixSlotProps) {
  const basicGroup: AffixGroupType = type === "prefix" ? "BASIC_PREFIXES" : "BASIC_SUFFIXES";
  const advancedGroup: AffixGroupType = type === "prefix" ? "ADVANCED_PREFIXES" : "ADVANCED_SUFFIXES";
  const ultimateGroup: AffixGroupType = type === "prefix" ? "ULTIMATE_PREFIXES" : "ULTIMATE_SUFFIXES";

  const allOptions = [
    ...getOptions(pool, basicGroup),
    ...getOptions(pool, advancedGroup),
    ...getOptions(pool, ultimateGroup),
  ];
  if (allOptions.length === 0) return null;

  const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);

  const affinityLabel = value
    ? value.sourceGroup === basicGroup ? { text: "Basic", cls: "text-zinc-500" }
    : value.sourceGroup === advancedGroup ? { text: "Adv", cls: "text-sky-400" }
    : { text: "Ult", cls: "text-amber-400" }
    : null;

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={onActivate}
        className="flex-1 min-w-0 relative flex items-center pl-3 pr-[48px] py-3 rounded-sm bg-[#dedfdf] border-0 overflow-hidden focus:outline-none text-sm transition-all cursor-pointer hover:brightness-95"
      >
        {selectedOpt ? (() => {
          const typeLabel = value?.sourceGroup?.includes("ADVANCED") ? { text: "Advanced", cls: "text-sky-400" }
            : value?.sourceGroup?.includes("ULTIMATE") ? { text: "Ultimate", cls: "text-amber-400" }
            : { text: "Basic", cls: "text-zinc-500" };
          return (
            <span className="flex items-center gap-2 min-w-0">
              {value?.tier && <TierBadge tier={value.tier} />}
              <span className="relative min-w-0">
                <span className="truncate block transition-colors duration-150" style={{ color: value?.tier === "T0_PLUS" ? "#5e56e1" : "#1a1a1a" }}>{buildAffixLabel(selectedOpt.affix, value?.tier)}</span>
                <span className={`absolute top-full left-0 text-[10px] font-medium leading-none mt-0.5 whitespace-nowrap ${typeLabel.cls}`}>{typeLabel.text}</span>
              </span>
            </span>
          );
        })()
          : <span className="w-full text-center" style={{ color: "#939393" }}>Empty affix</span>
        }
        <span
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: isActive ? "#5ddc4d" : "#979798" }}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isActive ? "#2d9927" : "#6c6b6c" }}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={isActive ? "#2fff21" : "white"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </span>
      </button>
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
    <div className="w-80 p-3 rounded-sm bg-[#2b2929] border border-[#3a3838]">
      <div className="space-y-1 text-xs text-zinc-400 mb-3">
        <div className="flex justify-between gap-8">
          <span>Type</span>
          <span className="text-[#e8e6e4] flex items-center gap-1.5">
            <GroupDot color={isAdvanced ? "#fd0000" : "#fd7c1c"} />
            {isAdvanced ? "Advanced" : "Intermediate"}
          </span>
        </div>
        {isAdvanced && (
          <div className="flex justify-between gap-8">
            <span>Combination</span>
            <span className="text-[#e8e6e4]">
              {pSuccess === P_ADV_TRIPLE
                ? "3+1 (triple repeat)"
                : pSuccess === P_ADV_DOUBLE
                ? "2+1+1 (double repeat)"
                : "4 distinct"}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-8">
          <span>Material</span>
          <span className="text-[#e8e6e4] flex items-center gap-1.5"><MatIcon name={modName} />{modName}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>Materials per attempt</span>
          <span className="text-[#e8e6e4] flex items-center gap-1.5">{modsPerAttempt}<MatIcon name={modName} /></span>
        </div>
        <div className="flex justify-between gap-8">
          <span>P(success per attempt)</span>
          <span className="text-[#e8e6e4]">{(pSuccess * 100).toFixed(3)}%</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>Avg attempts</span>
          <span className="text-[#e8e6e4]">{avgAttempts.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-8 font-medium border-t border-[#1c1c1c]/50 pt-1 mt-1">
          <span className="text-[#e8e6e4] flex items-center gap-1.5"><MatIcon name={modName} />Avg {modName}</span>
          <span className="text-emerald-300">{Math.round(avgMods).toLocaleString("en-US")}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5">
          <FEIcon className="w-3.5 h-3.5" /> per <MatIcon name={modName} /> {modName}
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            min="0"
            step="any"
            className="w-full rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
            placeholder={defaultModCost}
            value={modCostFE}
            onChange={(e) => onModCostFEChange(e.target.value)}
          />
          <FEIcon className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      </div>
      {totalFE !== null && (
        <div className="flex justify-between mt-2 pt-2 border-t border-[#1c1c1c]/50 text-xs font-semibold">
          <span className="text-zinc-400 flex items-center gap-1">Estimated total <FEIcon /></span>
          <span className="text-[#e8e6e4] font-bold flex items-center gap-1">
            {Math.round(totalFE).toLocaleString("en-US")} <FEIcon />
          </span>
        </div>
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

function getEquipmentIconPath(pool: CraftedPool): string {
  const type = getItemType(pool);
  if (type === "weapon" && pool.weaponType)
    return `/icons/equipment/${pool.weaponType.name}.webp`;
  if (type === "trinket")
    return `/icons/equipment/${pool.baseItemCategory.name}.webp`;
  const attr = pool.attributeType ?? "STR";
  return `/icons/equipment/${attr} ${pool.baseItemCategory.name}.webp`;
}

function getPSRarityColors(count: number): { border: string; gradientEnd: string; accent: string; accentDark: string; metallicKey: "zinc" | "blue" | "purple" | "pink" } {
  if (count === 0) return { border: "#71717a", gradientEnd: "#3f3f46", accent: "#52525b", accentDark: "#141415", metallicKey: "zinc" };
  if (count <= 4)  return { border: "#38bdf8", gradientEnd: "#0c4a6e", accent: "#0369a1", accentDark: "#030e1c", metallicKey: "blue" };
  if (count === 5) return { border: "#c084fc", gradientEnd: "#6b21a8", accent: "#7e22ce", accentDark: "#0d0118", metallicKey: "purple" };
  return                  { border: "#f472b6", gradientEnd: "#9d174d", accent: "#be185d", accentDark: "#12010a", metallicKey: "pink" };
}

const METALLIC_GRADIENTS = {
  zinc:   "linear-gradient(145deg, #b8b8bc 0%, #4a4a4e 15%, #d8d8dc 35%, #6a6a70 55%, #2c2c30 75%, #9a9a9e 100%)",
  blue:   "linear-gradient(145deg, #bae6fd 0%, #0369a1 15%, #e0f2fe 35%, #38bdf8 55%, #075985 75%, #7dd3fc 100%)",
  purple: "linear-gradient(145deg, #e9d5ff 0%, #7e22ce 15%, #f3e8ff 35%, #c084fc 55%, #6b21a8 75%, #d8b4fe 100%)",
  pink:   "linear-gradient(145deg, #fce7f3 0%, #be185d 15%, #fdf2f8 35%, #f472b6 55%, #9d174d 75%, #f9a8d4 100%)",
};

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
  ADVANCED_PREFIXES: { fe: 90,  preciousEmbers: 0, matchlessEmbers: 300, ultimateEmbers: 0, sacredFossils: 3 },
  ADVANCED_SUFFIXES: { fe: 90,  preciousEmbers: 0, matchlessEmbers: 300, ultimateEmbers: 0, sacredFossils: 3 },
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
  const isTwoH = pool.baseItemCategory.id === "two_hand_weapon";

  type Row = { key: PrefixSuffixKey; tier: string; sourceGroup: string; cost: ResourceBundle; rowFE: number };
  const rows: Row[] = [];
  const unsupported: string[] = [];

  for (const key of PREFIX_SUFFIX_KEYS) {
    const slot = slots[key] as SlotValue;
    if (!slot) continue;
    const cost = getSlotCost(slot.sourceGroup, slot.tier, isTwoH);
    if (cost) {
      rows.push({ key, tier: slot.tier, sourceGroup: slot.sourceGroup, cost, rowFE: calcTotalFE(cost, prices) });
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
    <div className="p-3 rounded-sm bg-[#2b2929] border border-[#3a3838]">
      {rows.length > 0 && (
            <div>
              <div>
                <table className="text-xs">
                  <thead>
                    <tr className="text-left text-zinc-500 uppercase tracking-wide border-b border-[#1c1c1c]">
                      <th className="pb-1.5 pr-3">Slot</th>
                      <th className="pb-1.5 pr-3">Tier</th>
                      <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end">Raw <FEIcon className="w-3.5 h-3.5" /></span></th>
                      {needsPE && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Precious Ember" className="w-3.5 h-3.5" />Precious</span></th>}
                      {needsME && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Matchless Ember" className="w-3.5 h-3.5" />Matchless</span></th>}
                      {needsUE && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end whitespace-nowrap"><MatIcon name="Ultimate Ember" className="w-3.5 h-3.5" />Ult. Ember</span></th>}
                      {needsSF && <th className="pb-1.5 pr-3 text-right"><span className="inline-flex items-center gap-1 justify-end"><MatIcon name="Sacred Fossil" className="w-3.5 h-3.5" />Fossils</span></th>}
                      <th className="pb-1.5 text-right text-amber-500"><span className="inline-flex items-center gap-1 justify-end">Total <FEIcon className="w-3.5 h-3.5" /></span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ key, tier, sourceGroup, cost, rowFE }) => {
                      const typeLabel = sourceGroup.includes("ADVANCED") ? { text: "Advanced", cls: "text-sky-400" }
                        : sourceGroup.includes("ULTIMATE") ? { text: "Ultimate", cls: "text-amber-400" }
                        : { text: "Basic", cls: "text-zinc-500" };
                      return (
                      <tr key={key} className="border-b border-[#1c1c1c]/50">
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          <div className="text-[#e8e6e4]">{SLOT_LABELS[key]}</div>
                          <div className={`text-[10px] font-medium ${typeLabel.cls}`}>{typeLabel.text}</div>
                        </td>
                        <td className="py-1.5 pr-3">
                          <span className="flex items-center gap-1.5">
                            <TierBadge tier={tier} />
                            {tier === "T0_PLUS" && (
                              <span className="relative group/t0tip">
                                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-zinc-600 text-zinc-500 text-[8px] font-bold cursor-default select-none hover:border-zinc-400 hover:text-[#e8e6e4] transition-colors">?</span>
                                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-52 rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] px-2.5 py-2 text-xs text-[#1a1a1a] shadow-lg opacity-0 group-hover/t0tip:opacity-100 transition-opacity leading-relaxed">
                                  Cost shown is for T0. The T0→T0+ upgrade cost is in the Corrosion tooltip. (top of the card)
                                </span>
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-[#e8e6e4]">{fmtR(cost.fe)}</td>
                        {needsPE && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.preciousEmbers)}</td>}
                        {needsME && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.matchlessEmbers)}</td>}
                        {needsUE && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.ultimateEmbers)}</td>}
                        {needsSF && <td className="py-1.5 pr-3 text-right text-zinc-400">{fmtR(cost.sacredFossils)}</td>}
                        <td className="py-1.5 text-right font-semibold text-amber-400">{Math.round(rowFE).toLocaleString("en-US")}</td>
                      </tr>
                    );
                    })}
                    {rows.length > 1 && (
                      <tr className="font-semibold border-t border-[#1c1c1c]">
                        <td colSpan={2} className="pt-2 pb-1 pr-3 text-[#e8e6e4]">Total</td>
                        <td className="pt-2 pb-1 pr-3 text-right text-[#e8e6e4]">
                          <span className="inline-flex items-center gap-1 justify-end">{fmtR(totalBundle.fe)} <FEIcon className="w-3.5 h-3.5" /></span>
                        </td>
                        {needsPE && <td className="pt-2 pb-1 pr-3 text-right text-[#e8e6e4]">
                          <span className="inline-flex items-center gap-1 justify-end">{fmtR(totalBundle.preciousEmbers)} <MatIcon name="Precious Ember" className="w-3.5 h-3.5" /></span>
                        </td>}
                        {needsME && <td className="pt-2 pb-1 pr-3 text-right text-[#e8e6e4]">
                          <span className="inline-flex items-center gap-1 justify-end">{fmtR(totalBundle.matchlessEmbers)} <MatIcon name="Matchless Ember" className="w-3.5 h-3.5" /></span>
                        </td>}
                        {needsUE && <td className="pt-2 pb-1 pr-3 text-right text-[#e8e6e4]">
                          <span className="inline-flex items-center gap-1 justify-end">{fmtR(totalBundle.ultimateEmbers)} <MatIcon name="Ultimate Ember" className="w-3.5 h-3.5" /></span>
                        </td>}
                        {needsSF && <td className="pt-2 pb-1 pr-3 text-right text-[#e8e6e4]">
                          <span className="inline-flex items-center gap-1 justify-end">{fmtR(totalBundle.sacredFossils)} <MatIcon name="Sacred Fossil" className="w-3.5 h-3.5" /></span>
                        </td>}
                        {totalFEVal !== null && <td className="pt-2 pb-1 text-right font-bold text-amber-400">
                          {Math.round(totalFEVal).toLocaleString("en-US")}
                        </td>}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FE-per-resource price inputs */}
              {PRICE_INPUTS.some((p) => p.show) && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-500 flex items-center gap-1"><FEIcon className="w-3.5 h-3.5" /> per resource:</p>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                    {PRICE_INPUTS.filter((p) => p.show).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <label className="text-xs text-zinc-400 shrink-0 flex items-center gap-1">
                          <MatIcon name={label} className="w-4 h-4" />
                          {label}
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-24 rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
                            placeholder={RESOURCE_PRICE_DEFAULTS[key]}
                            value={prices[key]}
                            onChange={(e) => onPricesChange({ ...prices, [key]: e.target.value })}
                          />
                          <FEIcon className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalFEVal !== null && (
                    <div className="space-y-1 pt-2 border-t border-[#1c1c1c]/50 text-xs">
                      <div className="flex justify-between text-zinc-500">
                        <span className="flex items-center gap-1">Raw crafting <FEIcon className="w-3.5 h-3.5" /></span>
                        <span className="flex items-center gap-1">{Math.round(totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span className="flex items-center gap-1">Materials (converted to <FEIcon className="w-3.5 h-3.5" />)</span>
                        <span className="flex items-center gap-1">{Math.round(totalFEVal - totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-[#1c1c1c]/50 pt-1">
                        <span className="text-zinc-400 flex items-center gap-1">Prefix / Suffix total <FEIcon className="w-3.5 h-3.5" /></span>
                        <span className="text-[#e8e6e4] font-bold flex items-center gap-1">{Math.round(totalFEVal).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      {unsupported.length > 0 && (
        <p className="mt-1 text-xs text-zinc-400">
          Cost not modelled for: {unsupported.join(", ")} — only T1, T0, and T0+ are supported.
        </p>
      )}
    </div>
  );
}

// ─── Shared helper ────────────────────────────────────────────────────────────

// Computes each craft cost component and returns lines + total.
// Used by ItemCard header tooltip and CorrosionHoverCard.
export function computeCraftCostLines(
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
    if (D === 0 || N === 0) return null;
    if (k === 0) return NaN;
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


// ─── Corrosion total helper ───────────────────────────────────────────────────

export function computeCorrosionTotal(
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
  if (wantsCorrodedBase && w > 0) return NaN; // impossible combo

  const nCorrodedBase = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;
  const pSuccess = corrosionSuccessP(wantsCorrodedBase, nCorrodedBase, w, m);
  if (pSuccess <= 0) return NaN; // impossible too many T0+

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

type CorrosionHoverCardProps = {
  pool: CraftedPool;
  slots: ItemSlots;
  baseCostFE: string;
  shallowCostFE: string;
  modCostFE: string;
  resourcePrices: ResourcePrices;
  corrosionCostFE: string;
  onCorrosionCostFEChange: (v: string) => void;
  onHoverSection?: (label: string | null) => void;
};

function CorrosionHoverCard({
  pool,
  slots,
  baseCostFE,
  shallowCostFE,
  modCostFE,
  resourcePrices,
  corrosionCostFE,
  onCorrosionCostFEChange,
  onHoverSection,
}: CorrosionHoverCardProps) {
  const wantsCorrodedBase = slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES";
  const t0PlusKeys = PREFIX_SUFFIX_KEYS.filter(
    (k) => (slots[k] as SlotValue)?.tier === "T0_PLUS",
  );
  const w = t0PlusKeys.length;
  const m = PREFIX_SUFFIX_KEYS.filter((k) => (slots[k] as SlotValue) !== null).length;

  // Only show this section when corrosion has a specific goal
  if (!wantsCorrodedBase && w === 0) return null;

  const impossibleMixed = wantsCorrodedBase && w > 0;
  const impossibleTooMany = !wantsCorrodedBase && w >= 3;
  const impossible = impossibleMixed || impossibleTooMany;
  const nCorrodedBase = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;

  const pSuccess = impossible
    ? 0
    : corrosionSuccessP(wantsCorrodedBase, nCorrodedBase, w, m);
  const avgAttempts = pSuccess > 0 ? 1 / pSuccess : null;

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

  // Use NaN for impossible so the error badge still appears and is hoverable
  const corrosionTotal: number | null = impossible
    ? NaN
    : (totalWithRecrafts ?? corrosionOverhead);

  const scenarioDesc = wantsCorrodedBase
    ? `Mutation — 1 of ${nCorrodedBase} corroded base affixes`
    : w === 1
    ? `Arrogance or Desecration — 1 desired T0+ out of ${m} affixes`
    : `Desecration — 2 desired T0+ out of ${m} affixes`;

  const impossibleMessage = impossibleMixed
    ? "Cannot achieve both a specific corroded base (Mutation) and T0+ upgrades (Desecration/Arrogance) in a single corrosion — these are different outcomes. Corrosion is one-time and permanent."
    : `Cannot upgrade ${w} affixes to T0+ in a single corrosion — Desecration upgrades at most 2 affixes at a time. Corrosion is one-time and permanent.`;

  const hoverCard = (
    <div className="p-3 rounded-sm bg-[#2b2929] border border-[#3a3838] text-xs space-y-1.5">
      {impossible ? (
        <p className="text-red-400">{impossibleMessage}</p>
      ) : (
        <>
          <div
            className="flex justify-between gap-8 rounded px-1 -mx-1 cursor-default transition-colors hover:bg-[#3a3838]"
            onMouseEnter={() => onHoverSection?.(wantsCorrodedBase ? "Base Affix" : "Prefixes + Suffixes")}
            onMouseLeave={() => onHoverSection?.(null)}
          >
            <span className="text-zinc-400">Target</span>
            <span className="text-[#e8e6e4] text-right">{scenarioDesc}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-400">P(success per attempt)</span>
            <span className="text-[#e8e6e4]">
              {pSuccess > 0 ? (pSuccess * 100).toFixed(3) + "%" : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-400">Avg attempts</span>
            <span className="text-[#e8e6e4]">
              {avgAttempts !== null ? avgAttempts.toFixed(1) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1.5">
              <FEIcon className="w-3.5 h-3.5" /> per <MatIcon name="Glorious Axis" /> Glorious Axis
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="any"
                className="w-full rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
                placeholder={CORROSION_COST_DEFAULT}
                value={corrosionCostFE}
                onChange={(e) => onCorrosionCostFEChange(e.target.value)}
              />
              <FEIcon className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          {hasCorrCost && avgAttempts !== null && (
            <div className="space-y-1 border-t border-[#1c1c1c]/50 pt-1.5 mt-1">
              <div className="flex justify-between gap-8 text-zinc-500">
                <span>Corrosion items cost</span>
                <span className="flex items-center gap-1">{Math.round(corrosionOverhead!).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
              </div>
              {craftCostPerAttempt !== null && (
                <div className="flex justify-between gap-8 text-zinc-500">
                  <span className="whitespace-nowrap">Re-craft cost ({avgAttempts.toFixed(1)} × {Math.round(craftCostPerAttempt).toLocaleString("en-US")} FE)</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {Math.round(avgAttempts * craftCostPerAttempt).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-8 font-semibold border-t border-[#1c1c1c]/50 pt-1">
                <span className="text-[#e8e6e4] flex items-center gap-1">
                  Total <FEIcon className="w-3.5 h-3.5" />{craftCostPerAttempt === null ? " (corrosion only)" : ""}
                </span>
                <span className="text-[#e8e6e4] font-bold flex items-center gap-1">
                  {totalWithRecrafts !== null
                    ? <>{Math.round(totalWithRecrafts).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                    : corrosionOverhead !== null
                    ? <>{Math.round(corrosionOverhead).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                    : "—"}
                </span>
              </div>
              {craftCostPerAttempt === null && (
                <p className="text-zinc-400 mt-0.5">
                  Fill in all craft cost inputs above to include re-craft overhead.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return hoverCard;
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
    <div className="w-96 p-3 rounded-sm bg-[#2b2929] border border-[#3a3838]">
      {k === 0 ? (
        <div className="text-xs">
          <span className="font-bold text-red-400">NaN</span>
          <p className="text-zinc-500 mt-1">
            Select at least one <span style={{ color: "#c64a28" }}>Nightmare</span> affix below to calculate cost.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1 text-xs text-zinc-400 mb-3">
            <div className="flex justify-between gap-8">
              <span><span style={{ color: "#48b8ff" }}>Dream</span> pool size</span>
              <span className="text-[#e8e6e4]">{D}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span><span style={{ color: "#c64a28" }}>Nightmare</span> pool size</span>
              <span className="text-[#e8e6e4]">{N}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Acceptable <span style={{ color: "#c64a28" }}>nightmares</span></span>
              <span className="text-[#e8e6e4]">{k}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Material</span>
              <span className="text-[#e8e6e4] flex items-center gap-1.5"><MatIcon name={shallowName} />{shallowName}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>P(hit per slot)</span>
              <span className="text-[#e8e6e4]">{(pSingle * 100).toFixed(3)}%</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>P(hit per roll, 3 slots)</span>
              <span className="text-[#e8e6e4]">{(pRoll * 100).toFixed(3)}%</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Avg rolls</span>
              <span className="text-[#e8e6e4]">{avgRolls.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-8 font-medium border-t border-[#1c1c1c]/50 pt-1 mt-1">
              <span className="text-[#e8e6e4] flex items-center gap-1.5">
                <MatIcon name={shallowName} />
                Avg {shallowName}
              </span>
              <span className="text-sky-300">{avgShallows.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1.5">
              <FEIcon className="w-3.5 h-3.5" /> per <MatIcon name={shallowName} /> {shallowName}
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="any"
                className="w-full rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
                placeholder={defaultShallowCost}
                value={shallowCostFE}
                onChange={(e) => onShallowCostFEChange(e.target.value)}
              />
              <FEIcon className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          {totalFE !== null && (
            <div className="flex justify-between mt-2 pt-2 border-t border-[#1c1c1c]/50 text-xs font-semibold">
              <span className="text-zinc-400 flex items-center gap-1">Estimated total <FEIcon className="w-3.5 h-3.5" /></span>
              <span className="text-[#e8e6e4] font-bold flex items-center gap-1">
                {Math.round(totalFE).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Corroded base cost section ───────────────────────────────────────────────

type CorrodedBaseCostSectionProps = {
  pool: CraftedPool;
  impossible: boolean;
  craftCostPerAttempt: number | null;
  corrosionCostFE: string;
  onCorrosionCostFEChange: (v: string) => void;
};

function CorrodedBaseCostSection({
  pool,
  impossible,
  craftCostPerAttempt,
  corrosionCostFE,
  onCorrosionCostFEChange,
}: CorrodedBaseCostSectionProps) {
  const nCorrodedBase = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;
  if (nCorrodedBase === 0) return null;

  if (impossible) {
    return (
      <div className="p-3 rounded-sm bg-[#2b2929] border border-[#3a3838]">
        <p className="text-xs text-red-400">
          Cannot achieve both a specific corroded base (Mutation) and T0+ upgrades
          (Desecration/Arrogance) in a single corrosion — these are different outcomes.
          Corrosion is one-time and permanent.
        </p>
      </div>
    );
  }

  const pSuccess = P_MUTATION / nCorrodedBase;
  const avgAttempts = 1 / pSuccess;
  const corrCost = parseFloat(corrosionCostFE) || parseFloat(CORROSION_COST_DEFAULT);
  const hasCorrCost = corrCost > 0;

  const corrosionOverhead = hasCorrCost ? avgAttempts * corrCost : null;
  const totalWithRecrafts =
    hasCorrCost && craftCostPerAttempt !== null
      ? avgAttempts * (craftCostPerAttempt + corrCost)
      : null;
  const totalFE = totalWithRecrafts ?? corrosionOverhead;

  return (
    <div className="w-96 p-3 rounded-sm bg-[#2b2929] border border-[#3a3838]">
      <div className="space-y-1 text-xs text-zinc-400 mb-3">
        <div className="flex justify-between gap-8">
          <span>Outcome</span>
          <span className="text-[#e8e6e4]">Mutation</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>P(Mutation)</span>
          <span className="text-[#e8e6e4]">{(P_MUTATION * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>Corroded base pool size</span>
          <span className="text-[#e8e6e4]">{nCorrodedBase}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>P(hit this base)</span>
          <span className="text-[#e8e6e4]">{(pSuccess * 100).toFixed(3)}%</span>
        </div>
        <div className="flex justify-between gap-8 font-medium border-t border-[#1c1c1c]/50 pt-1 mt-1">
          <span className="text-[#e8e6e4]">Avg corrosions needed</span>
          <span className="text-[#e8e6e4]">{avgAttempts.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5">
          <FEIcon className="w-3.5 h-3.5" /> per <MatIcon name="Glorious Axis" /> Glorious Axis
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            min="0"
            step="any"
            className="w-full rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
            placeholder={CORROSION_COST_DEFAULT}
            value={corrosionCostFE}
            onChange={(e) => onCorrosionCostFEChange(e.target.value)}
          />
          <FEIcon className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      </div>
      {hasCorrCost && (
        <div className="space-y-1 border-t border-[#1c1c1c]/50 pt-1.5 mt-2 text-xs">
          <div className="flex justify-between gap-8 text-zinc-500">
            <span>Corrosion items cost</span>
            <span className="flex items-center gap-1">{Math.round(corrosionOverhead!).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
          </div>
          {craftCostPerAttempt !== null && (
            <div className="flex justify-between gap-8 text-zinc-500">
              <span className="whitespace-nowrap">Re-craft cost ({avgAttempts.toFixed(1)} × {Math.round(craftCostPerAttempt).toLocaleString("en-US")} FE)</span>
              <span className="flex items-center gap-1 shrink-0">
                {Math.round(avgAttempts * craftCostPerAttempt).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
          <div className="flex justify-between gap-8 font-semibold border-t border-[#1c1c1c]/50 pt-1">
            <span className="text-[#e8e6e4] flex items-center gap-1">
              Total <FEIcon className="w-3.5 h-3.5" />{craftCostPerAttempt === null ? " (corrosion only)" : ""}
            </span>
            <span className="text-[#e8e6e4] font-bold flex items-center gap-1">
              {totalFE !== null
                ? <>{Math.round(totalFE).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></>
                : "—"}
            </span>
          </div>
          {craftCostPerAttempt === null && (
            <p className="text-zinc-400 mt-0.5">
              Fill in all craft cost inputs above to include re-craft overhead.
            </p>
          )}
        </div>
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
  dreamsFull?: boolean;
  activeSlot?: ActiveSlotId | null;
  onActiveSlotChange?: (id: ActiveSlotId | null) => void;
};

const ADVANCED_GROUPS: AffixGroupType[] = ["ADVANCED_PREFIXES", "ADVANCED_SUFFIXES"];
const ULTIMATE_GROUPS: AffixGroupType[] = ["ULTIMATE_PREFIXES", "ULTIMATE_SUFFIXES"];
const PREFIX_SUFFIX_KEYS = [
  "prefix1", "prefix2", "prefix3", "suffix1", "suffix2", "suffix3",
] as const;
type PrefixSuffixKey = (typeof PREFIX_SUFFIX_KEYS)[number];

// ─── Placeholder card (no slot selected) ─────────────────────────────────────

export function PlaceholderItemCard({ title = "Select a gear slot…" }: { title?: string }) {
  const { accent: accentBg, accentDark } = getPSRarityColors(0);
  const iconBorderBg = `linear-gradient(to bottom, #1a1a1a 0%, #3f3f46 100%) padding-box, ${METALLIC_GRADIENTS.zinc} border-box`;

  const SkeletonRow = () => (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-[46px] rounded-sm bg-[#d8d9d9] opacity-50" />
    </div>
  );

  const SkeletonSection = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
      <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">{label}</span>
    </div>
  );

  return (
    <div className="relative max-w-3xl opacity-50 pointer-events-none select-none">
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "-70px",
          background: `linear-gradient(to right, ${accentBg}, ${accentDark})`,
          borderRadius: "0 36px 0 36px",
          zIndex: 0,
          boxShadow: "0 0 40px 8px rgba(0,0,0,0.45)",
        }}
      />

      <h2
        className="absolute z-10 text-[28px] font-semibold text-white/40 leading-tight pointer-events-none"
        style={{ top: "-60px", left: "160px", right: "48px" }}
      >
        {title}
      </h2>

      <div
        className="absolute z-20 flex items-center justify-center overflow-hidden"
        style={{
          top: "-61px",
          left: "20px",
          width: "128px",
          height: "128px",
          border: "6px solid transparent",
          background: iconBorderBg,
          borderRadius: "0 28px 0 28px",
        }}
      >
      </div>

      <div className="relative z-10 border border-[#bec4c9] bg-[#eaeaea] text-[#1a1a1a] px-5 pb-5 pt-1" style={{ borderRadius: "0 36px 0 36px" }}>
        <div className="flex items-start gap-4 mb-2 min-h-[72px]">
          <div className="w-32 shrink-0" />
          <div className="flex-1 min-w-0 pt-1 space-y-1">
            <div className="h-4 w-32 rounded bg-zinc-300 opacity-60" />
            <div className="h-4 w-40 rounded bg-zinc-300 opacity-60" />
          </div>
        </div>

        {/* Base Affix */}
        <div className="relative border border-[#bec4c9] mt-4 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">Base Affix</span>
            </div>
          </div>
          <SkeletonRow />
        </div>

        {/* Dream + Nightmare */}
        <div className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">Dream + Nightmare</span>
            </div>
          </div>
          <SkeletonRow />
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-[46px] rounded-sm opacity-50" style={{ backgroundColor: "#e6dada" }} />
          </div>
        </div>

        {/* Sequence */}
        <div className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">Sequence</span>
            </div>
          </div>
          <SkeletonRow />
        </div>

        <div className="mt-4 mr-[40px]">
          <div className="flex items-center px-3 py-0.5 bg-[#eaeaea]">
            <span className="font-semibold uppercase tracking-wider text-[15px] text-[#777] w-full text-center">Prefixes + Suffixes</span>
          </div>
        </div>

        <div className="relative border border-[#bec4c9] mt-3 pt-5 px-3 pb-2" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">Prefix (0/3)</span>
            </div>
          </div>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>

        <div className="relative border border-[#bec4c9] mt-4 pt-5 px-3 pb-2" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
              <span className="font-semibold uppercase tracking-wider text-[16px] text-[#777]">Suffix (0/3)</span>
            </div>
          </div>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  dreamsFull = false,
  activeSlot = null,
  onActiveSlotChange,
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
  const { lines: grandTotalLines, total: grandTotal } = computeCraftCostLines(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices,
  );

  const [grandTotalTooltipOpen, setGrandTotalTooltipOpen] = useState(false);
  const [grandTotalPos, setGrandTotalPos] = useState<{ top: number; left: number } | null>(null);
  const grandTotalRef = useRef<HTMLDivElement>(null);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const grandTotalCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleGrandClose() { grandTotalCloseTimer.current = setTimeout(() => { setGrandTotalTooltipOpen(false); setHoveredLine(null); }, 120); }
  function cancelGrandClose() { if (grandTotalCloseTimer.current) clearTimeout(grandTotalCloseTimer.current); }
  function handleGrandTotalEnter() {
    cancelGrandClose();
    if (grandTotalRef.current) {
      const rect = grandTotalRef.current.getBoundingClientRect();
      setGrandTotalPos({ top: rect.top, left: rect.right + 8 });
    }
    setGrandTotalTooltipOpen(true);
  }

  const [corrTooltipOpen, setCorrTooltipOpen] = useState(false);
  const [corrPos, setCorrPos] = useState<{ top: number; left: number } | null>(null);
  const corrRef = useRef<HTMLDivElement>(null);
  const corrCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleCorrClose() { corrCloseTimer.current = setTimeout(() => setCorrTooltipOpen(false), 120); }
  function cancelCorrClose() { if (corrCloseTimer.current) clearTimeout(corrCloseTimer.current); }
  function handleCorrEnter() {
    cancelCorrClose();
    if (corrRef.current) {
      const rect = corrRef.current.getBoundingClientRect();
      setCorrPos({ top: rect.top, left: rect.right + 8 });
    }
    setCorrTooltipOpen(true);
  }
  const corrosionTotal = computeCorrosionTotal(
    pool, slots, baseCostFE, shallowCostFE, modCostFE, resourcePrices, corrosionCostFE,
  );

  // Inline section cost computations
  const baseFE: number | null = (() => {
    if (slots.base?.sourceGroup === "BASE_AFFIXES") {
      const v = parseFloat(baseCostFE);
      return isNaN(v) ? 0 : v;
    }
    if (slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES") {
      const w = PREFIX_SUFFIX_KEYS.filter((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS").length;
      if (w > 0) return NaN; // impossible combo — show error badge
      const n = pool.groups["CORROSION_BASE_AFFIXES"]?.length ?? 0;
      if (n === 0) return null;
      const avgAttempts = n / P_MUTATION;
      const corrCost = parseFloat(corrosionCostFE) || parseFloat(CORROSION_COST_DEFAULT);
      if (!(corrCost > 0)) return null;
      if (grandTotal !== null) return avgAttempts * (grandTotal + corrCost);
      return avgAttempts * corrCost;
    }
    return null;
  })();

  const dreamFE: number | null = (() => {
    if (!slots.dream) return null;
    const D = pool.groups["SWEET_DREAM_AFFIXES"]?.length ?? 0;
    const N = pool.groups["NIGHTMARE_AFFIXES"]?.length ?? 0;
    const k = slots.nightmare.length;
    if (D === 0 || N === 0) return null;
    if (k === 0) return NaN;
    const pSingle = (1 / D) * (k / N);
    const pRoll = 1 - Math.pow(1 - pSingle, 3);
    if (pRoll <= 0) return null;
    const sc = parseFloat(shallowCostFE) || parseFloat(SHALLOW_COST_DEFAULTS[getItemType(pool)]);
    return sc > 0 ? (1 / pRoll) * 3 * sc : null;
  })();

  const sequenceFE: number | null = (() => {
    if (!slots.sequence) return null;
    const isAdv = slots.sequence.sourceGroup === "ADVANCED_SEQUENCES";
    const pSuccess = isAdv ? getAdvancedSequenceP(slots.sequence.affixId) : P_INTERMEDIATE;
    const mc = parseFloat(modCostFE) || parseFloat(MOD_COST_DEFAULTS[getModName(pool, isAdv)] ?? "0");
    const modsPerAttempt = pool.baseItemCategory.id === "two_hand_weapon" ? 20 : 10;
    return mc > 0 ? (1 / pSuccess) * modsPerAttempt * mc : null;
  })();

  const psFEVal: number | null = (() => {
    const isTwoH = pool.baseItemCategory.id === "two_hand_weapon";
    let total = ZERO_BUNDLE;
    let hasAny = false;
    for (const key of PREFIX_SUFFIX_KEYS) {
      const slot = slots[key] as SlotValue;
      if (!slot) continue;
      const cost = getSlotCost(slot.sourceGroup, slot.tier, isTwoH);
      if (cost) { total = addBundles(total, cost); hasAny = true; }
    }
    return hasAny ? calcTotalFE(total, resourcePrices) : null;
  })();

  const psCount = PREFIX_SUFFIX_KEYS.filter((k) => slots[k] !== null).length;
  const { gradientEnd, accent: accentBg, accentDark, metallicKey } = getPSRarityColors(psCount);
  const iconBorderBg = `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%) padding-box, ${METALLIC_GRADIENTS[metallicKey]} border-box`;

  return (
    <div className="relative max-w-3xl">
      {/* Accent back panel — peeks above main card with gradient */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "-70px",
          background: `linear-gradient(to right, ${accentBg}, ${accentDark})`,
          borderRadius: "0 36px 0 36px",
          zIndex: 0,
          boxShadow: "0 0 40px 8px rgba(0,0,0,0.45)",
        }}
      />

      {/* Item name — top of accent panel, white */}
      <h2 className="absolute z-10 text-[28px] font-semibold text-white leading-tight truncate pointer-events-none"
        style={{ top: "-60px", left: "160px", right: "48px" }}>
        {pool.name}
      </h2>

      {/* Trash button — top-right of accent panel */}
      {onClear && (
        <button
          onClick={onClear}
          title="Remove item"
          className="absolute z-10 rounded p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
          style={{ top: "-63px", right: "8px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      )}

      {/* Icon — overlays both panels */}
      <div
        className="absolute z-20 flex items-center justify-center overflow-hidden"
        style={{
          top: "-61px",
          left: "20px",
          width: "128px",
          height: "128px",
          border: "6px solid transparent",
          background: iconBorderBg,
          borderRadius: "0 28px 0 28px",
        }}
      >
        <div className="relative w-full h-full">
          <img
            src={getEquipmentIconPath(pool)}
            alt={pool.name}
            className="w-full h-full object-contain p-0.5"
          />
          {slots.dream && (
            <img
              src="/icons/slots/dream.png"
              alt="Dream affix"
              className="absolute bottom-0.5 right-0.5 w-7 h-7 pointer-events-none p-[3px] rounded-tr-[5px] rounded-bl-[5px]"
              style={{ background: "rgba(30,30,30,0.65)" }}
            />
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="relative z-10 border border-[#bec4c9] bg-[#eaeaea] text-[#1a1a1a] px-5 pb-5 pt-1" style={{ borderRadius: "0 36px 0 36px" }}>

      {/* Header: slot info + costs */}
      <div className="flex items-start gap-4 mb-2">
        {/* Spacer matching icon width */}
        <div className="w-32 shrink-0" />

        {/* Item level + slot info */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm text-[#1a1a1a]">Item Level: 100</p>
          <p className="text-sm text-[#1a1a1a]">
            Slot: {pool.weaponType
              ? pool.weaponType.name
              : pool.attributeType
              ? `${pool.attributeType} ${pool.baseItemCategory.name}`
              : pool.baseItemCategory.name}
          </p>
        </div>

        {/* Costs — right side of header */}
        <div className="flex flex-col items-end gap-1.5 z-[100]">
        <div
            ref={grandTotalRef}
            className={`relative flex flex-col items-end cursor-help${grandTotal === null ? " invisible" : ""}`}
            onMouseEnter={grandTotal !== null ? handleGrandTotalEnter : undefined}
            onMouseLeave={grandTotal !== null ? scheduleGrandClose : undefined}
          >
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Craft</span>
            <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(grandTotal) ? "text-red-400" : "text-[#1a1a1a]"}`}>
              {Number.isNaN(grandTotal) ? "NaN" : Math.round(grandTotal).toLocaleString("en-US")}
              {!Number.isNaN(grandTotal) && <FEIcon className="w-5 h-5" />}
            </span>
            {grandTotalTooltipOpen && grandTotalPos && typeof document !== "undefined" && createPortal(
              <div
                style={{ position: "fixed", top: grandTotalPos.top, left: grandTotalPos.left, zIndex: 9999 }}
                className="w-56 p-3 rounded-sm bg-[#2b2929] border border-[#3a3838] space-y-1.5 text-xs"
                onMouseEnter={cancelGrandClose}
                onMouseLeave={scheduleGrandClose}
              >
                {grandTotalLines.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 rounded px-1 -mx-1 cursor-default transition-colors hover:bg-[#3a3838]"
                    onMouseEnter={() => setHoveredLine(label)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    <span className="text-zinc-400">{label}</span>
                    <span className={`flex items-center gap-1 ${value !== null && Number.isNaN(value) ? "text-red-400 font-bold" : "text-[#e8e6e4]"}`}>
                      {value === null ? "—" : Number.isNaN(value) ? "NaN" : <>{Math.round(value).toLocaleString("en-US")} <FEIcon className="w-3 h-3" /></>}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 font-semibold border-t border-[#1c1c1c]/50 pt-1.5">
                  <span className="text-[#e8e6e4]">Total</span>
                  {Number.isNaN(grandTotal) ? (
                    <span className="text-red-400 font-bold">NaN</span>
                  ) : (
                    <span className="text-[#e8e6e4] font-bold flex items-center gap-1">
                      {Math.round(grandTotal).toLocaleString("en-US")} <FEIcon className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        <div
            ref={corrRef}
            className={`relative flex flex-col items-end cursor-help${corrosionTotal === null ? " invisible" : ""}`}
            onMouseEnter={corrosionTotal !== null ? handleCorrEnter : undefined}
            onMouseLeave={corrosionTotal !== null ? scheduleCorrClose : undefined}
          >
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">+Corrosion</span>
            <span className={`text-[22px] font-bold tracking-[-0.02em] flex items-center gap-1.5 ${Number.isNaN(corrosionTotal) ? "text-red-400" : "text-[#1a1a1a]"}`}>
              {Number.isNaN(corrosionTotal) ? "NaN" : Math.round(corrosionTotal).toLocaleString("en-US")}
              {!Number.isNaN(corrosionTotal) && <FEIcon className="w-5 h-5" />}
            </span>
            {corrTooltipOpen && corrPos && typeof document !== "undefined" && createPortal(
              <div
                style={{ position: "fixed", top: corrPos.top, left: corrPos.left, zIndex: 9999 }}
                className="w-96"
                onMouseEnter={cancelCorrClose}
                onMouseLeave={() => { scheduleCorrClose(); setHoveredLine(null); }}
              >
                <CorrosionHoverCard
                  pool={pool}
                  slots={slots}
                  baseCostFE={baseCostFE}
                  shallowCostFE={shallowCostFE}
                  modCostFE={modCostFE}
                  resourcePrices={resourcePrices}
                  corrosionCostFE={corrosionCostFE}
                  onCorrosionCostFEChange={onCorrosionCostFEChange}
                  onHoverSection={(label) => setHoveredLine(label)}
                />
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Base Affix */}
      <div className="relative border border-[#bec4c9] mt-4 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
        <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
          <Section
            label="Base Affix"
            feCost={baseFE}
            highlighted={hoveredLine === "Base Affix"}
            hoverCard={slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES" ? (
              <CorrodedBaseCostSection
                pool={pool}
                impossible={PREFIX_SUFFIX_KEYS.some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS")}
                craftCostPerAttempt={grandTotal}
                corrosionCostFE={corrosionCostFE}
                onCorrosionCostFEChange={onCorrosionCostFEChange}
              />
            ) : slots.base?.sourceGroup === "BASE_AFFIXES" ? (
              <div className="mt-1 ml-auto w-48 rounded-sm border border-[#3a3838] bg-[#2b2929] px-3 py-2.5 text-xs space-y-2">
                <p className="text-zinc-400">Cost of this base affix</p>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    className="w-full rounded-sm bg-[#d5d6d6] border border-[#1c1c1c] pl-2 pr-7 py-1.5 text-[#1a1a1a] focus:outline-none focus:border-zinc-600"
                    placeholder="0"
                    value={baseCostFE}
                    onChange={(e) => onBaseCostFEChange(e.target.value)}
                  />
                  <FEIcon className="absolute right-2 w-4 h-4 shrink-0 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            ) : undefined}
          />
        </div>
        <SimpleSlotRow
          label="Base"
          accent="text-[#1a1a1a]"
          groups={[
            { label: "Base", options: getOptions(pool, "BASE_AFFIXES") },
            { label: "Corroded Base", options: getOptions(pool, "CORROSION_BASE_AFFIXES") },
          ]}
          value={slots.base}
          onChange={(v) => update("base", v)}
          onActivate={() => onActiveSlotChange?.("base")}
          isActive={activeSlot === "base"}
          showStats
          showTiers
          highlighted={hoveredLine === "Base Affix" && slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES"}
        />
      </div>

      {/* Dream + Nightmare */}
      <div className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
        <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
          <Section
            label="Dream + Nightmare"
            feCost={dreamFE}
            highlighted={hoveredLine === "Dream Affix"}
            hoverCard={slots.dream ? (
              <DreamCostSection
                pool={pool}
                dreamSlot={slots.dream}
                nightmareSlots={slots.nightmare}
                shallowCostFE={shallowCostFE}
                onShallowCostFEChange={onShallowCostFEChange}
              />
            ) : undefined}
          />
        </div>
        <SimpleSlotRow
          label="Dream"
          accent="text-[#48b8ff]"
          buttonBg="#dae0e6"
          groups={[{ label: "Dream", options: getOptions(pool, "SWEET_DREAM_AFFIXES") }]}
          value={slots.dream}
          onChange={(v) => update("dream", v)}
          onActivate={() => onActiveSlotChange?.("dream")}
          isActive={activeSlot === "dream"}
          showStats
          showTiers
          disabled={dreamsFull && !slots.dream}
        />
        <NightmareSlotRow
          pool={pool}
          values={slots.nightmare}
          onChange={(v) => onChange({ ...slots, nightmare: v })}
          onActivate={() => onActiveSlotChange?.("nightmare")}
          isActive={activeSlot === "nightmare"}
          warn={!!slots.dream && slots.nightmare.length === 0}
          disabled={dreamsFull && !slots.dream}
          buttonBg="#e6dada"
        />
      </div>

      {/* Sequence — weapons and shields only */}
      {hasSequences && (
        <div className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
          <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
            <Section
              label="Sequence"
              feCost={sequenceFE}
              highlighted={hoveredLine === "Sequence"}
              hoverCard={slots.sequence ? (
                <SequenceCostSection
                  pool={pool}
                  sequenceSlot={slots.sequence}
                  modCostFE={modCostFE}
                  onModCostFEChange={onModCostFEChange}
                />
              ) : undefined}
            />
          </div>
          <SimpleSlotRow
            label="Sequence"
            accent="text-emerald-400"
            groups={[
              { label: "Intermediate", options: getOptions(pool, "INTERMEDIATE_SEQUENCES") },
              { label: "Advanced", options: getOptions(pool, "ADVANCED_SEQUENCES") },
            ]}
            groupDotColors={{ "Intermediate": "#fd7c1c", "Advanced": "#fd0000" }}
            buttonBg="#dae6da"
            value={slots.sequence}
            onChange={(v) => update("sequence", v)}
            onActivate={() => onActiveSlotChange?.("sequence")}
            isActive={activeSlot === "sequence"}
          />
        </div>
      )}

      {/* Prefixes + Suffixes — centered label, badge aligned to match other section headers */}
      <div className="mt-6 mr-[40px]">
        <Section
          label="Prefixes + Suffixes"
          feCost={psFEVal}
          highlighted={hoveredLine === "Prefix / Suffix"}
          plain
          centerLabel
          hoverCard={psFEVal !== null ? (
            <PrefixSuffixCostSection
              pool={pool}
              slots={slots}
              prices={resourcePrices}
              onPricesChange={onResourcePricesChange}
            />
          ) : undefined}
        />
      </div>
      <p className="font-mono text-[8px] text-[#3a3a3a] mt-1 mb-2 uppercase tracking-wider text-center">
        {advancedCount}/2 adv · {ultimateCount}/2 ult
      </p>

      {/* Prefixes */}
      <div className="relative border border-[#bec4c9] mt-3 pt-5 px-3 pb-2" style={{ borderRadius: "0 12px 0 12px" }}>
        <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
          <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
            <span className={`font-semibold uppercase tracking-wider whitespace-nowrap text-[16px] ${hoveredLine === "Prefixes + Suffixes" && (["prefix1","prefix2","prefix3"] as const).some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS") ? "text-[#1a1a1a]" : "text-[#555]"}`}>Pre-fix ({(["prefix1","prefix2","prefix3"] as const).filter((k) => slots[k] !== null).length}/3)</span>
          </div>
        </div>
        {(["prefix1", "prefix2", "prefix3"] as const).map((key, i) => (
          <PrefixSuffixSlotRow
            key={key}
            label={`Prefix ${i + 1}`}
            type="prefix"
            pool={pool}
            value={slots[key]}
            onChange={(v) => update(key, v)}
            onActivate={() => onActiveSlotChange?.(key)}
            isActive={activeSlot === key}
            advancedCount={advancedCount}
            ultimateCount={ultimateCount}
            takenAffixIds={takenIdsExcluding(key)}
            highlighted={hoveredLine === "Prefixes + Suffixes" && (slots[key] as SlotValue)?.tier === "T0_PLUS"}
          />
        ))}
      </div>

      {/* Suffixes */}
      <div className="relative border border-[#bec4c9] mt-4 pt-5 px-3 pb-2" style={{ borderRadius: "0 12px 0 12px" }}>
        <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
          <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
            <span className={`font-semibold uppercase tracking-wider whitespace-nowrap text-[16px] ${hoveredLine === "Prefixes + Suffixes" && (["suffix1","suffix2","suffix3"] as const).some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS") ? "text-[#1a1a1a]" : "text-[#555]"}`}>Suffix ({(["suffix1","suffix2","suffix3"] as const).filter((k) => slots[k] !== null).length}/3)</span>
          </div>
        </div>
        {(["suffix1", "suffix2", "suffix3"] as const).map((key, i) => (
          <PrefixSuffixSlotRow
            key={key}
            label={`Suffix ${i + 1}`}
            type="suffix"
            pool={pool}
            value={slots[key]}
            onChange={(v) => update(key, v)}
            onActivate={() => onActiveSlotChange?.(key)}
            isActive={activeSlot === key}
            advancedCount={advancedCount}
            ultimateCount={ultimateCount}
            takenAffixIds={takenIdsExcluding(key)}
            highlighted={hoveredLine === "Prefixes + Suffixes" && (slots[key] as SlotValue)?.tier === "T0_PLUS"}
          />
        ))}
      </div>
    </div>
    </div>
  );
}
