"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  if (tier === "T2")      return "#a457ff";
  return "";
}

function tierSquareColor(tier: string): string {
  // T0+ square uses same color as T0
  if (tier === "T0_PLUS") return "#fe0000";
  if (tier === "T0")      return "#fe0000";
  if (tier === "T1")      return "#ff7d1c";
  if (tier === "T2")      return "#a457ff";
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
  warn?: boolean;
  disabled?: boolean;
};

function NightmareSlotRow({ pool, values, onChange, warn = false, disabled = false }: NightmareSlotRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [dropDir, setDropDir] = useState<DropDir>("down");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const [tipOpen, setTipOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options = getOptions(pool, "NIGHTMARE_AFFIXES");

  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setExpanded(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  useLayoutEffect(() => {
    if (!expanded) { setDropDir("down"); setMaxHeight(undefined); return; }
    if (!panelRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = panelRef.current.getBoundingClientRect().height;
    const margin = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    if (menuHeight <= spaceBelow) {
      setDropDir("down"); setMaxHeight(undefined);
    } else if (menuHeight <= spaceAbove) {
      setDropDir("up"); setMaxHeight(undefined);
    } else {
      const centerY = triggerRect.top + triggerRect.height / 2;
      const maxHalf = Math.min(centerY - margin, window.innerHeight - centerY - margin);
      setDropDir("center"); setMaxHeight(Math.max(maxHalf * 2, 80));
    }
  }, [expanded]);

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

  const GROUP_ACCENT_COLOR: Record<NightmareGroup, string> = {
    Damage:  "#f87171",
    Defense: "#60a5fa",
    Utility: "#facc15",
    Special: "#d8b4fe",
  };

  const panelStyle: React.CSSProperties = dropDir === "down"
    ? { top: "100%", marginTop: 4 }
    : dropDir === "up"
    ? { bottom: "100%", marginBottom: 4 }
    : { top: "50%", transform: "translateY(-50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };

  return (
    <div className="d-flex align-items-start gap-2 py-2">
      <span className="d-flex align-items-center gap-1 flex-shrink-0 pt-1" style={{ width: 96 }}>
        <span className="fw-medium small" style={{ color: "#c64a28" }}>Nightmare</span>
        <span className="position-relative">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle border"
            style={{ width: 14, height: 14, fontSize: 9, fontWeight: "bold", cursor: "default", userSelect: "none", borderColor: "var(--zinc-600)", color: "var(--zinc-500)" }}
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
          >?</span>
          {tipOpen && (
            <span
              className="position-absolute z-3 rounded shadow-lg text-center"
              style={{ bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6, padding: "6px 10px", background: "var(--zinc-800)", border: "1px solid var(--zinc-700)", color: "var(--zinc-200)", fontSize: "0.75rem", whiteSpace: "nowrap", pointerEvents: "none", lineHeight: 1.5 }}
            >
              Choose all acceptable Nightmare Affixes<br />More Nightmare Affixes = cheaper craft!
            </span>
          )}
        </span>
      </span>
      <div ref={triggerRef} className="flex-grow-1 position-relative" style={{ minWidth: 0 }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          disabled={disabled && values.length === 0}
          title={disabled && values.length === 0 ? "No dream affix — nightmare affixes unavailable" : undefined}
          className={`zinc-trigger${warn ? " warn" : ""}`}
        >
          <span style={{ color: warn ? "#f87171" : disabled && values.length === 0 ? "var(--zinc-500)" : "var(--zinc-400)", fontStyle: disabled && values.length === 0 ? "italic" : undefined, fontWeight: warn ? 500 : undefined }}>
            {values.length > 0 ? `${values.length} selected` : disabled ? "— limit reached —" : "none selected"}
          </span>
          <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d={expanded ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
          </svg>
        </button>
        {expanded && (
          <div ref={panelRef} className="zinc-panel" style={{ padding: 12, ...panelStyle }}>
            <div className="d-flex flex-column gap-3">
              {NIGHTMARE_GROUP_ORDER.map((group) => {
                const opts = grouped.get(group)!;
                if (opts.length === 0) return null;
                const allSelected = opts.every(({ affix }) => selectedIds.has(affix.id));
                function selectAll() {
                  const toAdd = opts.filter(({ affix }) => !selectedIds.has(affix.id));
                  onChange([...values, ...toAdd.map(({ affix, sourceGroup }) => ({ affixId: affix.id, affixName: affix.name, tier: affix.tiers[0]?.tier ?? "", sourceGroup }))]);
                }
                function selectNone() {
                  const groupIds = new Set(opts.map(({ affix }) => affix.id));
                  onChange(values.filter((v) => !groupIds.has(v.affixId)));
                }
                const minionOpts = group === "Damage"
                  ? opts.filter(({ affix }) => /minion/.test(affix.tiers[0]?.stats[0]?.statId ?? ""))
                  : [];
                const allMinionsSelected = minionOpts.length > 0 && minionOpts.every(({ affix }) => selectedIds.has(affix.id));
                function selectAllMinions() {
                  const toAdd = minionOpts.filter(({ affix }) => !selectedIds.has(affix.id));
                  onChange([...values, ...toAdd.map(({ affix, sourceGroup }) => ({ affixId: affix.id, affixName: affix.name, tier: affix.tiers[0]?.tier ?? "", sourceGroup }))]);
                }
                function selectNoneMinions() {
                  const minionIds = new Set(minionOpts.map(({ affix }) => affix.id));
                  onChange(values.filter((v) => !minionIds.has(v.affixId)));
                }
                return (
                  <div key={group}>
                    <div className="position-relative d-flex align-items-center mb-2">
                      <button
                        onClick={allSelected ? selectNone : selectAll}
                        className="d-flex align-items-center gap-2 zinc-hover px-2 py-1 border-0 bg-transparent fw-semibold text-uppercase small"
                        style={{ color: GROUP_ACCENT_COLOR[group], letterSpacing: "0.05em" }}
                      >
                        {group}
                        <span className="fw-normal text-lowercase" style={{ letterSpacing: 0, color: "var(--zinc-500)", fontSize: "0.7rem" }}>
                          {allSelected ? "deselect all" : "select all"}
                        </span>
                      </button>
                      {minionOpts.length > 0 && (
                        <button
                          onClick={allMinionsSelected ? selectNoneMinions : selectAllMinions}
                          className="position-absolute start-50 translate-middle-x d-flex align-items-center gap-2 zinc-hover px-2 py-1 border-0 bg-transparent fw-semibold text-uppercase small"
                          style={{ color: "#34d399", letterSpacing: "0.05em" }}
                        >
                          Minions
                          <span className="fw-normal text-lowercase" style={{ letterSpacing: 0, color: "var(--zinc-500)", fontSize: "0.7rem" }}>
                            {allMinionsSelected ? "deselect all" : "select all"}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="row row-cols-2 g-1">
                      {opts.map(({ affix, sourceGroup }) => (
                        <div key={affix.id} className="col">
                          <label className="d-flex align-items-center gap-2 cursor-pointer" style={{ minWidth: 0, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              className="flex-shrink-0"
                              style={{ accentColor: "#c084fc" }}
                              checked={selectedIds.has(affix.id)}
                              onChange={() => toggle({ affix, sourceGroup })}
                            />
                            <span className="text-truncate small" style={{ color: "var(--zinc-300)" }}>
                              {nightmareLabel(affix)}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Material icon ────────────────────────────────────────────────────────────

function MatIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  // className here is used only for sizing — kept for back-compat with callers passing "w-3.5 h-3.5" etc.
  // We map to pixel sizes inline.
  const size = className.includes("3.5") ? 14 : className.includes("w-3 ") ? 12 : 16;
  return (
    <img
      src={`/icons/materials/${encodeURIComponent(name)}.webp`}
      alt={name}
      className="d-inline-block flex-shrink-0"
      style={{ width: size, height: size, objectFit: "contain" }}
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
}: {
  label: string;
  feCost?: number | null;
  expanded?: boolean;
  onToggle?: () => void;
  hoverCard?: React.ReactNode;
  highlighted?: boolean;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltipOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    <div className="position-relative">
      <div className="position-relative d-flex align-items-center justify-content-end gap-2 mt-3 mb-1" style={{ minHeight: "2rem" }}>
        <div className="position-absolute start-0 end-0" style={{ top: "50%", height: 1, background: "var(--zinc-800)" }} />
        <span
          className="position-absolute start-50 translate-middle-x flex-shrink-0 fw-semibold text-uppercase"
          style={{
            background: "var(--zinc-900)", padding: "0 8px", zIndex: 10,
            fontSize: highlighted ? "0.875rem" : "0.75rem",
            color: highlighted ? "var(--zinc-200)" : "var(--zinc-500)",
            letterSpacing: "0.1em", transition: "all 0.15s",
          }}
        >
          {label}
        </span>
        {feCost != null && (
          <span
            className="position-relative flex-shrink-0 d-flex align-items-center gap-2 rounded"
            style={{
              zIndex: 10, fontSize: "1.125rem", padding: "4px 12px",
              transform: highlighted ? "scale(1.1)" : undefined,
              transformOrigin: "right",
              transition: "all 0.15s",
              color: Number.isNaN(feCost) ? "#f87171" : hoverCard ? "var(--zinc-300)" : "#fff",
              background: Number.isNaN(feCost) ? "var(--zinc-800)" : hoverCard ? "var(--zinc-800)" : "var(--zinc-900)",
              border: Number.isNaN(feCost) ? "1px solid #7f1d1d" : hoverCard ? "1px solid var(--zinc-700)" : "none",
              cursor: hoverCard ? "help" : undefined,
            }}
            onMouseEnter={() => { cancelClose(); if (hoverCard) setTooltipOpen(true); }}
            onMouseLeave={scheduleClose}
          >
            {Number.isNaN(feCost) ? (
              <span className="fw-bold">NaN</span>
            ) : (
              <>
                <span className="fw-bold">{Math.round(feCost).toLocaleString("en-US")}</span>
                <FEIcon className="w-6 h-6" />
              </>
            )}
            {hoverCard && (
              <svg style={{ width: 20, height: 20, color: Number.isNaN(feCost) ? "#dc2626" : "var(--zinc-500)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            )}
          </span>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex-shrink-0 d-flex align-items-center justify-content-center rounded border-0 bg-transparent fw-bold zinc-hover"
            style={{ width: 20, height: 20, fontSize: "0.875rem", color: "var(--zinc-500)" }}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "−" : "+"}
          </button>
        )}
      </div>
      {tooltipOpen && hoverCard && (
        <div className="position-absolute end-0" style={{ zIndex: 50 }} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          {hoverCard}
        </div>
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
  const sqColor = tierSquareColor(tier.tier);
  const textColor = tierTextColor(tier.tier);
  const stats = tierStatsStr(tier);
  const sz = highlighted ? 12 : 8;
  return (
    <span className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
      <span className="flex-shrink-0 d-inline-block" style={{ width: sz, height: sz, backgroundColor: sqColor || "transparent", transition: "all 0.15s" }} />
      <span className="fw-bold" style={textColor ? { color: textColor } : undefined}>{displayTier(tier.tier)}</span>
      {stats && <span style={{ color: highlighted ? "var(--zinc-200)" : "var(--zinc-500)", transition: "color 0.15s" }}>{stats}</span>}
    </span>
  );
}

// Returns the effective display tier for an affix, overriding to T0_PLUS for
// corroded base affixes regardless of what the DB tier field says.
function getEffectiveTier(sourceGroup: AffixGroupType, affix: PoolAffix): string {
  if (sourceGroup === "CORROSION_BASE_AFFIXES") return "T0_PLUS";
  return affix.tiers[0]?.tier ?? "";
}

// Colored square + tier label + colon + affix name, used in base/dream dropdowns.
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
  const sqColor = tierSquareColor(tier);
  const textColor = tierTextColor(tier);
  const sz = highlighted ? 12 : 8;
  return (
    <span className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
      <span className="flex-shrink-0 d-inline-block" style={{ width: sz, height: sz, backgroundColor: sqColor || "transparent", transition: "all 0.15s" }} />
      {tier && (
        <>
          <span className="fw-bold flex-shrink-0" style={textColor ? { color: textColor } : undefined}>{displayTier(tier)}</span>
          <span className="flex-shrink-0" style={{ color: highlighted ? "var(--zinc-300)" : "var(--zinc-500)", transition: "color 0.15s" }}>:</span>
        </>
      )}
      <span className="text-truncate" style={{ color: highlighted ? "#fff" : "var(--zinc-100)", transition: "color 0.15s" }}>{displayLabel}</span>
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
      <span className="flex-shrink-0 px-2 small" style={{ width: 160, transform: highlighted ? "scale(1.1)" : undefined, transformOrigin: "left", transition: "transform 0.15s" }}>
        <TierLabel tier={tiers[0]} highlighted={highlighted} />
      </span>
    );
  }

  return (
    <div ref={ref} className="flex-shrink-0 position-relative small" style={{ width: 160 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="zinc-trigger"
        style={{ transform: highlighted ? "scale(1.1)" : undefined, transformOrigin: "left", transition: "transform 0.15s, border-color 0.15s" }}
      >
        <TierLabel tier={selectedTier} highlighted={highlighted} />
        <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="zinc-panel" style={{ top: "100%", marginTop: 4 }}>
          {tiers.map((t) => (
            <button key={t.tier} className={`zinc-item${t.tier === value.tier ? " is-active" : ""}`} onClick={() => { onChange(t.tier); setOpen(false); }}>
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
  showTiers?: boolean;
  groupDotColors?: Record<string, string>;
  highlighted?: boolean;
  disabled?: boolean;
};

function GroupDot({ color }: { color: string }) {
  return (
    <span
      className="d-inline-flex flex-shrink-0 align-items-center justify-content-center rounded-circle"
      style={{ width: 12, height: 12, border: `2px solid ${color}` }}
    >
      <span className="rounded-circle" style={{ width: 6, height: 6, background: "var(--zinc-700)" }} />
    </span>
  );
}

type DropDir = "down" | "up" | "center";

function SimpleSlotRow({ label, accent, groups, value, onChange, showStats = false, showTiers = false, groupDotColors, highlighted = false, disabled = false }: SimpleSlotProps) {
  const [open, setOpen] = useState(false);
  const [dropDir, setDropDir] = useState<DropDir>("down");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) { setDropDir("down"); setMaxHeight(undefined); return; }
    if (!dropMenuRef.current || !dropRef.current) return;
    const triggerRect = dropRef.current.getBoundingClientRect();
    const menuHeight = dropMenuRef.current.getBoundingClientRect().height;
    const margin = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    if (menuHeight <= spaceBelow) {
      setDropDir("down"); setMaxHeight(undefined);
    } else if (menuHeight <= spaceAbove) {
      setDropDir("up"); setMaxHeight(undefined);
    } else {
      const centerY = triggerRect.top + triggerRect.height / 2;
      const maxHalf = Math.min(centerY - margin, window.innerHeight - centerY - margin);
      setDropDir("center"); setMaxHeight(Math.max(maxHalf * 2, 80));
    }
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

  // Custom dropdown with tier labels (base affix, dream affix)
  if (showTiers) {
    const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);
    const menuStyle: React.CSSProperties = dropDir === "down" ? { top: "100%", marginTop: 4 } : dropDir === "up" ? { bottom: "100%", marginBottom: 4 } : { top: "50%", transform: "translateY(-50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };
    return (
      <div className="d-flex align-items-center gap-2 py-1">
        <span className="flex-shrink-0 fw-medium small" style={{ width: 96, color: highlighted ? "#fff" : accent, transition: "color 0.15s" }}>{label}</span>
        <div ref={dropRef} className="flex-grow-1 position-relative small" style={{ minWidth: 0 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={disabled && !value}
            title={disabled && !value ? "Build already has 3 dream affixes" : undefined}
            className="zinc-trigger"
            style={{ transform: highlighted ? "scale(1.02)" : undefined, transformOrigin: "left", transition: "transform 0.15s, border-color 0.15s" }}
          >
            <span className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
              {selectedOpt
                ? <AffixTierRow affix={selectedOpt.affix} sourceGroup={selectedOpt.sourceGroup} displayLabel={optionLabel(selectedOpt.affix)} highlighted={highlighted} />
                : <span style={{ color: "var(--zinc-500)", fontStyle: "italic" }}>{disabled ? "— limit reached —" : "— empty —"}</span>
              }
            </span>
            <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {open && (
            <div ref={dropMenuRef} className="zinc-panel" style={menuStyle}>
              <button className="zinc-item is-italic" onClick={() => { onChange(null); setOpen(false); }}>
                <span className="d-inline-block flex-shrink-0" style={{ width: 8, height: 8 }} />
                — empty —
              </button>
              {groups.map(({ label: groupLabel, options }) =>
                options.length === 0 ? null : (
                  <div key={groupLabel}>
                    {groups.length > 1 && (
                      <p className="px-2 pt-2 pb-1 mb-0 small fw-semibold text-uppercase" style={{ color: "var(--zinc-500)", letterSpacing: "0.08em" }}>{groupLabel}</p>
                    )}
                    {options.map(({ affix, sourceGroup }) => (
                      <button key={`${sourceGroup}-${affix.id}`} className={`zinc-item${value?.affixId === affix.id ? " is-active" : ""}`} onClick={() => { handleAffixChange(affix.id); setOpen(false); }}>
                        <AffixTierRow affix={affix} sourceGroup={sourceGroup} displayLabel={optionLabel(affix)} />
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

  // Custom dropdown when groupDotColors is provided
  if (groupDotColors) {
    const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);
    const selectedGroup = selectedOpt ? groups.find((g) => g.options.some((o) => o.affix.id === selectedOpt.affix.id)) : null;
    const selectedDotColor = selectedGroup ? groupDotColors[selectedGroup.label] : null;
    const menuStyle2: React.CSSProperties = dropDir === "down" ? { top: "100%", marginTop: 4 } : dropDir === "up" ? { bottom: "100%", marginBottom: 4 } : { top: "50%", transform: "translateY(-50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };
    return (
      <div className="d-flex align-items-center gap-2 py-1">
        <span className="flex-shrink-0 fw-medium small" style={{ width: 96, color: accent }}>{label}</span>
        <div ref={dropRef} className="flex-grow-1 position-relative small" style={{ minWidth: 0 }}>
          <button onClick={() => setOpen((o) => !o)} className="zinc-trigger">
            <span className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              {selectedOpt && (selectedDotColor ? <GroupDot color={selectedDotColor} /> : <span className="flex-shrink-0 d-inline-block" style={{ width: 12, height: 12 }} />)}
              <span className="text-truncate" style={{ color: selectedOpt ? "var(--zinc-100)" : "var(--zinc-500)", fontStyle: selectedOpt ? undefined : "italic" }}>
                {selectedOpt ? optionLabel(selectedOpt.affix) : "— empty —"}
              </span>
            </span>
            <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {open && (
            <div ref={dropMenuRef} className="zinc-panel" style={menuStyle2}>
              <button className="zinc-item is-italic gap-2" onClick={() => { onChange(null); setOpen(false); }}>
                <span className="flex-shrink-0 d-inline-block" style={{ width: 12, height: 12 }} />— empty —
              </button>
              {groups.map(({ label: groupLabel, options }) =>
                options.length === 0 ? null : (
                  <div key={groupLabel}>
                    <p className="px-2 pt-2 pb-1 mb-0 small fw-semibold text-uppercase" style={{ color: "var(--zinc-500)", letterSpacing: "0.08em" }}>{groupLabel}</p>
                    {options.map(({ affix, sourceGroup }) => (
                      <button key={`${sourceGroup}-${affix.id}`} className={`zinc-item gap-2${value?.affixId === affix.id ? " is-active" : ""}`} onClick={() => { handleAffixChange(affix.id); setOpen(false); }}>
                        {groupDotColors[groupLabel] ? <GroupDot color={groupDotColors[groupLabel]} /> : <span className="flex-shrink-0 d-inline-block" style={{ width: 12, height: 12 }} />}
                        <span className="text-truncate" style={{ color: "var(--zinc-100)" }}>{optionLabel(affix)}</span>
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

  const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);
  const menuStyle3: React.CSSProperties = dropDir === "down" ? { top: "100%", marginTop: 4 } : dropDir === "up" ? { bottom: "100%", marginBottom: 4 } : { top: "50%", transform: "translateY(-50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };

  return (
    <div className="d-flex align-items-center gap-2 py-1">
      <span className="flex-shrink-0 fw-medium small" style={{ width: 96, color: accent }}>{label}</span>
      <div ref={dropRef} className="flex-grow-1 position-relative small" style={{ minWidth: 0 }}>
        <button onClick={() => setOpen((o) => !o)} className="zinc-trigger">
          <span className="text-truncate" style={{ color: selectedOpt ? "var(--zinc-100)" : "var(--zinc-500)", fontStyle: selectedOpt ? undefined : "italic" }}>
            {selectedOpt ? optionLabel(selectedOpt.affix) : "— empty —"}
          </span>
          <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        {open && (
          <div ref={dropMenuRef} className="zinc-panel" style={menuStyle3}>
            <button className="zinc-item is-italic" onClick={() => { onChange(null); setOpen(false); }}>— empty —</button>
            {groups.map(({ label: groupLabel, options }) =>
              options.length === 0 ? null : (
                <div key={groupLabel}>
                  {groups.length > 1 && (
                    <p className="px-2 pt-2 pb-1 mb-0 small fw-semibold text-uppercase" style={{ color: "var(--zinc-500)", letterSpacing: "0.08em" }}>{groupLabel}</p>
                  )}
                  {options.map(({ affix, sourceGroup }) => (
                    <button
                      key={`${sourceGroup}-${affix.id}`}
                      className={`zinc-item${value?.affixId === affix.id ? " is-active" : ""}`}
                      onClick={() => { handleAffixChange(affix.id); setOpen(false); }}
                    >
                      <span className="text-truncate" style={{ color: "var(--zinc-100)" }}>{optionLabel(affix)}</span>
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
  highlighted?: boolean;
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
  highlighted = false,
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

  const advancedOtherCount = advancedCount - (thisIsAdvanced ? 1 : 0);
  const ultimateOtherCount = ultimateCount - (thisIsUltimate ? 1 : 0);
  const disableAdvanced = advancedOtherCount >= MAX_ADVANCED;
  const disableUltimate = ultimateOtherCount >= MAX_ULTIMATE;

  const [open, setOpen] = useState(false);
  const [dropDir, setDropDir] = useState<DropDir>("down");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) { setDropDir("down"); setMaxHeight(undefined); return; }
    if (!dropMenuRef.current || !dropRef.current) return;
    const triggerRect = dropRef.current.getBoundingClientRect();
    const menuHeight = dropMenuRef.current.getBoundingClientRect().height;
    const margin = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    if (menuHeight <= spaceBelow) {
      setDropDir("down"); setMaxHeight(undefined);
    } else if (menuHeight <= spaceAbove) {
      setDropDir("up"); setMaxHeight(undefined);
    } else {
      const centerY = triggerRect.top + triggerRect.height / 2;
      const maxHalf = Math.min(centerY - margin, window.innerHeight - centerY - margin);
      setDropDir("center"); setMaxHeight(Math.max(maxHalf * 2, 80));
    }
  }, [open]);

  function handleAffixChange(affixId: string) {
    if (!affixId) { onChange(null); setOpen(false); return; }
    const opt = allOptions.find((o) => o.affix.id === affixId);
    if (!opt) return;
    const sorted = sortTiers(opt.affix.tiers);
    const defaultTier = sorted.find((t) => t.tier === "T1") ?? sorted[sorted.length - 1];
    onChange({
      affixId: opt.affix.id,
      affixName: opt.affix.name,
      tier: defaultTier?.tier ?? "",
      sourceGroup: opt.sourceGroup,
    });
    setOpen(false);
  }

  const selectedOpt = allOptions.find((o) => o.affix.id === value?.affixId);

  const groups: { label: string; options: AffixOption[]; disabled: boolean; color: string }[] = [
    { label: "Basic", options: basicOptions, disabled: false, color: "var(--zinc-500)" },
    { label: `Advanced${disableAdvanced ? " (limit reached)" : ""}`, options: advancedOptions, disabled: disableAdvanced, color: "#38bdf8" },
    { label: `Ultimate${disableUltimate ? " (limit reached)" : ""}`, options: ultimateOptions, disabled: disableUltimate, color: "#fbbf24" },
  ].filter((g) => g.options.length > 0);

  const affinityLabel = value
    ? value.sourceGroup === basicGroup ? { text: "Basic", color: "var(--zinc-500)" }
    : value.sourceGroup === advancedGroup ? { text: "Advanced", color: "#38bdf8" }
    : { text: "Ultimate", color: "#fbbf24" }
    : null;

  const psMenuStyle: React.CSSProperties = dropDir === "down" ? { top: "100%", marginTop: 4 } : dropDir === "up" ? { bottom: "100%", marginBottom: 4 } : { top: "50%", transform: "translateY(-50%)", maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: "auto" };

  return (
    <div className="d-flex align-items-center gap-2 py-1">
      <div className="flex-shrink-0 d-flex flex-column" style={{ width: 96 }}>
        <span className="small fw-medium" style={{ color: highlighted ? "#fff" : "var(--zinc-300)", transition: "color 0.15s" }}>{label}</span>
        {affinityLabel && (
          <span className="fw-medium" style={{ fontSize: "0.625rem", color: affinityLabel.color, opacity: highlighted ? 1 : 0.7, transition: "opacity 0.15s" }}>{affinityLabel.text}</span>
        )}
      </div>
      <div ref={dropRef} className="flex-grow-1 position-relative small" style={{ minWidth: 0 }}>
        <button onClick={() => setOpen((o) => !o)} className="zinc-trigger">
          <span className="text-truncate" style={{ color: selectedOpt ? (highlighted ? "#fff" : "var(--zinc-100)") : "var(--zinc-500)", fontStyle: selectedOpt ? undefined : "italic", transition: "color 0.15s" }}>
            {selectedOpt ? selectedOpt.affix.name : "— empty —"}
          </span>
          <svg className="flex-shrink-0" style={{ color: "var(--zinc-500)", width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        {open && (
          <div ref={dropMenuRef} className="zinc-panel" style={psMenuStyle}>
            <button className="zinc-item is-italic indent" onClick={() => handleAffixChange("")}>— empty —</button>
            {groups.map(({ label: groupLabel, options, disabled, color }) => (
              <div key={groupLabel}>
                <p className="px-2 pt-2 pb-1 mb-0 small fw-semibold text-uppercase" style={{ color, letterSpacing: "0.08em" }}>{groupLabel}</p>
                {options.map(({ affix }) => {
                  const isDisabled = disabled || takenAffixIds.has(affix.id);
                  return (
                    <button
                      key={affix.id}
                      disabled={isDisabled}
                      className={`zinc-item indent${isDisabled ? " is-disabled" : value?.affixId === affix.id ? " is-active" : ""}`}
                      onClick={() => !isDisabled && handleAffixChange(affix.id)}
                    >
                      {affix.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <TierPicker options={allOptions} value={value} onChange={(tier) => onChange(value ? { ...value, tier } : null)} highlighted={highlighted} />
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

  const rowStyle = { color: "var(--zinc-400)" };
  const valStyle = { color: "var(--zinc-200)" };
  return (
    <div className="zinc-card small" style={{ width: 320 }}>
      <div className="d-flex flex-column gap-1 mb-3">
        <div className="d-flex justify-content-between gap-4" style={rowStyle}>
          <span>Type</span>
          <span className="d-flex align-items-center gap-2" style={valStyle}><GroupDot color={isAdvanced ? "#fe0000" : "#ff7d1c"} />{isAdvanced ? "Advanced" : "Intermediate"}</span>
        </div>
        {isAdvanced && (
          <div className="d-flex justify-content-between gap-4" style={rowStyle}>
            <span>Combination</span>
            <span style={valStyle}>{pSuccess === P_ADV_TRIPLE ? "3+1 (triple repeat)" : pSuccess === P_ADV_DOUBLE ? "2+1+1 (double repeat)" : "4 distinct"}</span>
          </div>
        )}
        <div className="d-flex justify-content-between gap-4" style={rowStyle}><span>Material</span><span className="d-flex align-items-center gap-2" style={valStyle}><MatIcon name={modName} />{modName}</span></div>
        <div className="d-flex justify-content-between gap-4" style={rowStyle}><span>Materials per attempt</span><span className="d-flex align-items-center gap-2" style={valStyle}>{modsPerAttempt}<MatIcon name={modName} /></span></div>
        <div className="d-flex justify-content-between gap-4" style={rowStyle}><span>P(success per attempt)</span><span style={valStyle}>{(pSuccess * 100).toFixed(3)}%</span></div>
        <div className="d-flex justify-content-between gap-4" style={rowStyle}><span>Avg attempts</span><span style={valStyle}>{avgAttempts.toFixed(1)}</span></div>
        <div className="d-flex justify-content-between gap-4 fw-medium pt-1 mt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
          <span className="d-flex align-items-center gap-2" style={{ color: "var(--zinc-300)" }}><MatIcon name={modName} />Avg {modName}</span>
          <span style={{ color: "#6ee7b7" }}>{Math.round(avgMods).toLocaleString("en-US")}</span>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label className="d-flex align-items-center gap-2" style={{ color: "var(--zinc-400)" }}><FEIcon className="w-3.5 h-3.5" /> per <MatIcon name={modName} /> {modName}</label>
        <div className="position-relative d-flex align-items-center">
          <input type="number" min="0" step="any" className="zinc-input" placeholder={defaultModCost} value={modCostFE} onChange={(e) => onModCostFEChange(e.target.value)} />
          <FEIcon className="position-absolute end-0 me-2 w-3.5 h-3.5 pointer-events-none" />
        </div>
      </div>
      {totalFE !== null && (
        <div className="d-flex justify-content-between mt-2 pt-2 fw-semibold" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
          <span className="d-flex align-items-center gap-1" style={{ color: "var(--zinc-400)" }}>Estimated total <FEIcon /></span>
          <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>{Math.round(totalFE).toLocaleString("en-US")} <FEIcon /></span>
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

function getPSRarityColors(count: number): { border: string; gradientEnd: string } {
  if (count === 0) return { border: "#71717a", gradientEnd: "#3f3f46" };
  if (count <= 4)  return { border: "#38bdf8", gradientEnd: "#0c4a6e" };
  if (count === 5) return { border: "#c084fc", gradientEnd: "#6b21a8" };
  return                  { border: "#f472b6", gradientEnd: "#9d174d" };
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

  const [t0TipKey, setT0TipKey] = useState<string | null>(null);
  const c2 = { color: "var(--zinc-200)" };
  const c4 = { color: "var(--zinc-400)" };
  const c3 = { color: "var(--zinc-300)" };
  return (
    <div className="zinc-card small">
      {rows.length > 0 && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-100">
              <thead>
                <tr className="text-start text-uppercase" style={{ color: "var(--zinc-500)", borderBottom: "1px solid var(--zinc-800)", letterSpacing: "0.05em" }}>
                  <th className="pb-2 pe-3">Slot</th>
                  <th className="pb-2 pe-3">Tier</th>
                  <th className="pb-2 pe-3 text-end"><span className="d-inline-flex align-items-center gap-1 justify-content-end">Raw <FEIcon className="w-3.5 h-3.5" /></span></th>
                  {needsPE && <th className="pb-2 pe-3 text-end"><span className="d-inline-flex align-items-center gap-1 justify-content-end"><MatIcon name="Precious Ember" className="w-3.5 h-3.5" />Precious</span></th>}
                  {needsME && <th className="pb-2 pe-3 text-end"><span className="d-inline-flex align-items-center gap-1 justify-content-end"><MatIcon name="Matchless Ember" className="w-3.5 h-3.5" />Matchless</span></th>}
                  {needsUE && <th className="pb-2 pe-3 text-end"><span className="d-inline-flex align-items-center gap-1 justify-content-end text-nowrap"><MatIcon name="Ultimate Ember" className="w-3.5 h-3.5" />Ult. Ember</span></th>}
                  {needsSF && <th className="pb-2 pe-3 text-end"><span className="d-inline-flex align-items-center gap-1 justify-content-end"><MatIcon name="Sacred Fossil" className="w-3.5 h-3.5" />Fossils</span></th>}
                  <th className="pb-2 text-end" style={{ color: "#f59e0b" }}><span className="d-inline-flex align-items-center gap-1 justify-content-end">Total <FEIcon className="w-3.5 h-3.5" /></span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, tier, sourceGroup, cost, rowFE }) => {
                  const typeLabel = sourceGroup.includes("ADVANCED") ? { text: "Advanced", color: "#38bdf8" }
                    : sourceGroup.includes("ULTIMATE") ? { text: "Ultimate", color: "#fbbf24" }
                    : { text: "Basic", color: "var(--zinc-500)" };
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid rgba(39,39,42,0.5)" }}>
                      <td className="py-2 pe-3 text-nowrap">
                        <div style={c3}>{SLOT_LABELS[key]}</div>
                        <div className="fw-medium" style={{ fontSize: "0.625rem", color: typeLabel.color }}>{typeLabel.text}</div>
                      </td>
                      <td className="py-2 pe-3">
                        <span className="d-flex align-items-center gap-1">
                          <span className="d-inline-block flex-shrink-0" style={{ width: 8, height: 8, backgroundColor: tierSquareColor(tier) || "transparent" }} />
                          <span style={tierTextColor(tier) ? { color: tierTextColor(tier) } : undefined}>{displayTier(tier)}</span>
                          {tier === "T0_PLUS" && (
                            <span className="position-relative">
                              <span
                                className="d-inline-flex align-items-center justify-content-center rounded-circle border"
                                style={{ width: 12, height: 12, fontSize: 8, fontWeight: "bold", cursor: "default", userSelect: "none", borderColor: "var(--zinc-600)", color: "var(--zinc-500)" }}
                                onMouseEnter={() => setT0TipKey(key)}
                                onMouseLeave={() => setT0TipKey(null)}
                              >?</span>
                              {t0TipKey === key && (
                                <span className="position-absolute z-3 rounded shadow-lg" style={{ top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6, width: 208, padding: "6px 10px", background: "var(--zinc-800)", border: "1px solid var(--zinc-700)", color: "var(--zinc-300)", fontSize: "0.75rem", pointerEvents: "none", lineHeight: 1.5 }}>
                                  Cost shown is for T0. The T0→T0+ upgrade cost is in the Corrosion tooltip. (top of the card)
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 pe-3 text-end" style={c2}>{fmtR(cost.fe)}</td>
                      {needsPE && <td className="py-2 pe-3 text-end" style={c4}>{fmtR(cost.preciousEmbers)}</td>}
                      {needsME && <td className="py-2 pe-3 text-end" style={c4}>{fmtR(cost.matchlessEmbers)}</td>}
                      {needsUE && <td className="py-2 pe-3 text-end" style={c4}>{fmtR(cost.ultimateEmbers)}</td>}
                      {needsSF && <td className="py-2 pe-3 text-end" style={c4}>{fmtR(cost.sacredFossils)}</td>}
                      <td className="py-2 text-end fw-semibold" style={{ color: "#fbbf24" }}>{Math.round(rowFE).toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
                {rows.length > 1 && (
                  <tr className="fw-semibold" style={{ borderTop: "1px solid var(--zinc-700)" }}>
                    <td colSpan={2} className="pt-2 pb-1 pe-3" style={c3}>Total</td>
                    <td className="pt-2 pb-1 pe-3 text-end" style={c2}><span className="d-inline-flex align-items-center gap-1 justify-content-end">{fmtR(totalBundle.fe)} <FEIcon className="w-3.5 h-3.5" /></span></td>
                    {needsPE && <td className="pt-2 pb-1 pe-3 text-end" style={c3}><span className="d-inline-flex align-items-center gap-1 justify-content-end">{fmtR(totalBundle.preciousEmbers)} <MatIcon name="Precious Ember" className="w-3.5 h-3.5" /></span></td>}
                    {needsME && <td className="pt-2 pb-1 pe-3 text-end" style={c3}><span className="d-inline-flex align-items-center gap-1 justify-content-end">{fmtR(totalBundle.matchlessEmbers)} <MatIcon name="Matchless Ember" className="w-3.5 h-3.5" /></span></td>}
                    {needsUE && <td className="pt-2 pb-1 pe-3 text-end" style={c3}><span className="d-inline-flex align-items-center gap-1 justify-content-end">{fmtR(totalBundle.ultimateEmbers)} <MatIcon name="Ultimate Ember" className="w-3.5 h-3.5" /></span></td>}
                    {needsSF && <td className="pt-2 pb-1 pe-3 text-end" style={c3}><span className="d-inline-flex align-items-center gap-1 justify-content-end">{fmtR(totalBundle.sacredFossils)} <MatIcon name="Sacred Fossil" className="w-3.5 h-3.5" /></span></td>}
                    {totalFEVal !== null && <td className="pt-2 pb-1 text-end fw-bold" style={{ color: "#fbbf24" }}>{Math.round(totalFEVal).toLocaleString("en-US")}</td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {PRICE_INPUTS.some((p) => p.show) && (
            <div className="mt-3 d-flex flex-column gap-2">
              <p className="mb-0 d-flex align-items-center gap-1" style={{ color: "var(--zinc-500)" }}><FEIcon className="w-3.5 h-3.5" /> per resource:</p>
              <div className="d-flex flex-wrap gap-3">
                {PRICE_INPUTS.filter((p) => p.show).map(({ key, label }) => (
                  <div key={key} className="d-flex align-items-center gap-2">
                    <label className="flex-shrink-0 d-flex align-items-center gap-1" style={{ color: "var(--zinc-400)" }}><MatIcon name={label} className="w-4 h-4" />{label}</label>
                    <div className="position-relative d-flex align-items-center">
                      <input type="number" min="0" step="any" className="zinc-input" style={{ width: 96 }} placeholder={RESOURCE_PRICE_DEFAULTS[key]} value={prices[key]} onChange={(e) => onPricesChange({ ...prices, [key]: e.target.value })} />
                      <FEIcon className="position-absolute end-0 me-2 w-3.5 h-3.5 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
              {totalFEVal !== null && (
                <div className="d-flex flex-column gap-1 pt-2" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
                  <div className="d-flex justify-content-between" style={{ color: "var(--zinc-500)" }}>
                    <span className="d-flex align-items-center gap-1">Raw crafting <FEIcon className="w-3.5 h-3.5" /></span>
                    <span className="d-flex align-items-center gap-1">{Math.round(totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                  </div>
                  <div className="d-flex justify-content-between" style={{ color: "var(--zinc-500)" }}>
                    <span className="d-flex align-items-center gap-1">Materials (converted to <FEIcon className="w-3.5 h-3.5" />)</span>
                    <span className="d-flex align-items-center gap-1">{Math.round(totalFEVal - totalBundle.fe).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                  </div>
                  <div className="d-flex justify-content-between fw-semibold pt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
                    <span className="d-flex align-items-center gap-1" style={c4}>Prefix / Suffix total <FEIcon className="w-3.5 h-3.5" /></span>
                    <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>{Math.round(totalFEVal).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {unsupported.length > 0 && (
        <p className="mt-1 mb-0" style={{ color: "var(--zinc-600)" }}>
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

  const c4b = { color: "var(--zinc-400)" };
  const c2b = { color: "var(--zinc-200)" };
  const c5b = { color: "var(--zinc-500)" };
  const hoverCard = (
    <div className="zinc-card small d-flex flex-column gap-2">
      {impossible ? (
        <p className="mb-0" style={{ color: "#f87171" }}>{impossibleMessage}</p>
      ) : (
        <>
          <div
            className="d-flex justify-content-between gap-4 rounded px-1 zinc-hover"
            style={{ margin: "0 -4px" }}
            onMouseEnter={() => onHoverSection?.(wantsCorrodedBase ? "Base Affix" : "Prefixes + Suffixes")}
            onMouseLeave={() => onHoverSection?.(null)}
          >
            <span style={c4b}>Target</span>
            <span className="text-end" style={c2b}>{scenarioDesc}</span>
          </div>
          <div className="d-flex justify-content-between gap-4" style={c4b}><span>P(success per attempt)</span><span style={c2b}>{pSuccess > 0 ? (pSuccess * 100).toFixed(3) + "%" : "—"}</span></div>
          <div className="d-flex justify-content-between gap-4" style={c4b}><span>Avg attempts</span><span style={c2b}>{avgAttempts !== null ? avgAttempts.toFixed(1) : "—"}</span></div>
          <div className="d-flex flex-column gap-1 pt-1">
            <label className="d-flex align-items-center gap-2" style={c4b}><FEIcon className="w-3.5 h-3.5" /> per <MatIcon name="Glorious Axis" /> Glorious Axis</label>
            <div className="position-relative d-flex align-items-center">
              <input type="number" min="0" step="any" className="zinc-input" placeholder={CORROSION_COST_DEFAULT} value={corrosionCostFE} onChange={(e) => onCorrosionCostFEChange(e.target.value)} />
              <FEIcon className="position-absolute end-0 me-2 w-3.5 h-3.5 pointer-events-none" />
            </div>
          </div>
          {hasCorrCost && avgAttempts !== null && (
            <div className="d-flex flex-column gap-1 pt-2" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
              <div className="d-flex justify-content-between gap-4" style={c5b}>
                <span>Corrosion items cost</span>
                <span className="d-flex align-items-center gap-1">{Math.round(corrosionOverhead!).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
              </div>
              {craftCostPerAttempt !== null && (
                <div className="d-flex justify-content-between gap-4" style={c5b}>
                  <span className="text-nowrap">Re-craft cost ({avgAttempts.toFixed(1)} × {Math.round(craftCostPerAttempt).toLocaleString("en-US")} FE)</span>
                  <span className="d-flex align-items-center gap-1 flex-shrink-0">{Math.round(avgAttempts * craftCostPerAttempt).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
                </div>
              )}
              <div className="d-flex justify-content-between gap-4 fw-semibold pt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
                <span className="d-flex align-items-center gap-1" style={{ color: "var(--zinc-300)" }}>Total <FEIcon className="w-3.5 h-3.5" />{craftCostPerAttempt === null ? " (corrosion only)" : ""}</span>
                <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>
                  {totalWithRecrafts !== null ? <>{Math.round(totalWithRecrafts).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></> : corrosionOverhead !== null ? <>{Math.round(corrosionOverhead).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></> : "—"}
                </span>
              </div>
              {craftCostPerAttempt === null && <p className="mb-0 mt-1" style={{ color: "var(--zinc-600)" }}>Fill in all craft cost inputs above to include re-craft overhead.</p>}
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

  const dc4 = { color: "var(--zinc-400)" };
  const dc2 = { color: "var(--zinc-200)" };
  return (
    <div className="zinc-card small" style={{ width: 384 }}>
      {k === 0 ? (
        <div>
          <span className="fw-bold" style={{ color: "#f87171" }}>NaN</span>
          <p className="mt-1 mb-0" style={{ color: "var(--zinc-500)" }}>Select at least one <span style={{ color: "#c64a28" }}>Nightmare</span> affix below to calculate cost.</p>
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-1 mb-3" style={dc4}>
            <div className="d-flex justify-content-between gap-4"><span><span style={{ color: "#48b8ff" }}>Dream</span> pool size</span><span style={dc2}>{D}</span></div>
            <div className="d-flex justify-content-between gap-4"><span><span style={{ color: "#c64a28" }}>Nightmare</span> pool size</span><span style={dc2}>{N}</span></div>
            <div className="d-flex justify-content-between gap-4"><span>Acceptable <span style={{ color: "#c64a28" }}>nightmares</span></span><span style={dc2}>{k}</span></div>
            <div className="d-flex justify-content-between gap-4"><span>Material</span><span className="d-flex align-items-center gap-2" style={dc2}><MatIcon name={shallowName} />{shallowName}</span></div>
            <div className="d-flex justify-content-between gap-4"><span>P(hit per slot)</span><span style={dc2}>{(pSingle * 100).toFixed(3)}%</span></div>
            <div className="d-flex justify-content-between gap-4"><span>P(hit per roll, 3 slots)</span><span style={dc2}>{(pRoll * 100).toFixed(3)}%</span></div>
            <div className="d-flex justify-content-between gap-4"><span>Avg rolls</span><span style={dc2}>{avgRolls.toFixed(1)}</span></div>
            <div className="d-flex justify-content-between gap-4 fw-medium pt-1 mt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
              <span className="d-flex align-items-center gap-2" style={{ color: "var(--zinc-300)" }}><MatIcon name={shallowName} />Avg {shallowName}</span>
              <span style={{ color: "#7dd3fc" }}>{avgShallows.toFixed(1)}</span>
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <label className="d-flex align-items-center gap-2" style={dc4}><FEIcon className="w-3.5 h-3.5" /> per <MatIcon name={shallowName} /> {shallowName}</label>
            <div className="position-relative d-flex align-items-center">
              <input type="number" min="0" step="any" className="zinc-input" placeholder={defaultShallowCost} value={shallowCostFE} onChange={(e) => onShallowCostFEChange(e.target.value)} />
              <FEIcon className="position-absolute end-0 me-2 w-3.5 h-3.5 pointer-events-none" />
            </div>
          </div>
          {totalFE !== null && (
            <div className="d-flex justify-content-between mt-2 pt-2 fw-semibold" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
              <span className="d-flex align-items-center gap-1" style={dc4}>Estimated total <FEIcon className="w-3.5 h-3.5" /></span>
              <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>{Math.round(totalFE).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
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
      <div className="zinc-card small">
        <p className="mb-0" style={{ color: "#f87171" }}>Cannot achieve both a specific corroded base (Mutation) and T0+ upgrades (Desecration/Arrogance) in a single corrosion — these are different outcomes. Corrosion is one-time and permanent.</p>
      </div>
    );
  }

  const pSuccess = P_MUTATION / nCorrodedBase;
  const avgAttempts = 1 / pSuccess;
  const corrCost = parseFloat(corrosionCostFE) || parseFloat(CORROSION_COST_DEFAULT);
  const hasCorrCost = corrCost > 0;

  const corrosionOverhead = hasCorrCost ? avgAttempts * corrCost : null;
  const totalWithRecrafts = hasCorrCost && craftCostPerAttempt !== null ? avgAttempts * (craftCostPerAttempt + corrCost) : null;
  const totalFE = totalWithRecrafts ?? corrosionOverhead;

  const cb4 = { color: "var(--zinc-400)" };
  const cb2 = { color: "var(--zinc-200)" };
  const cb5 = { color: "var(--zinc-500)" };
  return (
    <div className="zinc-card small" style={{ width: 384 }}>
      <div className="d-flex flex-column gap-1 mb-3" style={cb4}>
        <div className="d-flex justify-content-between gap-4"><span>Outcome</span><span style={cb2}>Mutation</span></div>
        <div className="d-flex justify-content-between gap-4"><span>P(Mutation)</span><span style={cb2}>{(P_MUTATION * 100).toFixed(0)}%</span></div>
        <div className="d-flex justify-content-between gap-4"><span>Corroded base pool size</span><span style={cb2}>{nCorrodedBase}</span></div>
        <div className="d-flex justify-content-between gap-4"><span>P(hit this base)</span><span style={cb2}>{(pSuccess * 100).toFixed(3)}%</span></div>
        <div className="d-flex justify-content-between gap-4 fw-medium pt-1 mt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
          <span style={{ color: "var(--zinc-300)" }}>Avg corrosions needed</span><span style={cb2}>{avgAttempts.toFixed(1)}</span>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label className="d-flex align-items-center gap-2" style={cb4}><FEIcon className="w-3.5 h-3.5" /> per <MatIcon name="Glorious Axis" /> Glorious Axis</label>
        <div className="position-relative d-flex align-items-center">
          <input type="number" min="0" step="any" className="zinc-input" placeholder={CORROSION_COST_DEFAULT} value={corrosionCostFE} onChange={(e) => onCorrosionCostFEChange(e.target.value)} />
          <FEIcon className="position-absolute end-0 me-2 w-3.5 h-3.5 pointer-events-none" />
        </div>
      </div>
      {hasCorrCost && (
        <div className="d-flex flex-column gap-1 pt-2 mt-2" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
          <div className="d-flex justify-content-between gap-4" style={cb5}><span>Corrosion items cost</span><span className="d-flex align-items-center gap-1">{Math.round(corrosionOverhead!).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span></div>
          {craftCostPerAttempt !== null && (
            <div className="d-flex justify-content-between gap-4" style={cb5}>
              <span className="text-nowrap">Re-craft cost ({avgAttempts.toFixed(1)} × {Math.round(craftCostPerAttempt).toLocaleString("en-US")} FE)</span>
              <span className="d-flex align-items-center gap-1 flex-shrink-0">{Math.round(avgAttempts * craftCostPerAttempt).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></span>
            </div>
          )}
          <div className="d-flex justify-content-between gap-4 fw-semibold pt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
            <span className="d-flex align-items-center gap-1" style={{ color: "var(--zinc-300)" }}>Total <FEIcon className="w-3.5 h-3.5" />{craftCostPerAttempt === null ? " (corrosion only)" : ""}</span>
            <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>{totalFE !== null ? <>{Math.round(totalFE).toLocaleString("en-US")} <FEIcon className="w-3.5 h-3.5" /></> : "—"}</span>
          </div>
          {craftCostPerAttempt === null && <p className="mb-0 mt-1" style={{ color: "var(--zinc-600)" }}>Fill in all craft cost inputs above to include re-craft overhead.</p>}
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
  dreamsFull = false,
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
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const grandTotalCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleGrandClose() { grandTotalCloseTimer.current = setTimeout(() => { setGrandTotalTooltipOpen(false); setHoveredLine(null); }, 120); }
  function cancelGrandClose() { if (grandTotalCloseTimer.current) clearTimeout(grandTotalCloseTimer.current); }

  const [corrTooltipOpen, setCorrTooltipOpen] = useState(false);
  const corrCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleCorrClose() { corrCloseTimer.current = setTimeout(() => setCorrTooltipOpen(false), 120); }
  function cancelCorrClose() { if (corrCloseTimer.current) clearTimeout(corrCloseTimer.current); }
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
  const { border: iconBorder, gradientEnd } = getPSRarityColors(psCount);

  return (
    <div className="position-relative rounded" style={{ background: "var(--zinc-900)", border: "1px solid var(--zinc-700)", padding: "108px 20px 20px", maxWidth: "48rem" }}>
      {/* Delete button */}
      {onClear && (
        <button
          onClick={onClear}
          title="Remove item"
          className="position-absolute rounded border-0 bg-transparent zinc-hover"
          style={{ top: 12, right: 12, padding: 6, color: "var(--zinc-500)", zIndex: 20 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--zinc-500)")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      )}

      {/* Icon — centered, top 1/3 hangs above card */}
      <div className="position-absolute start-50 translate-middle-x" style={{ top: 0, transform: "translateX(-50%) translateY(-33%)", zIndex: 10 }}>
        <div className="d-flex align-items-center justify-content-center overflow-hidden" style={{ width: 144, height: 144, borderRadius: 4, border: `2px solid ${iconBorder}`, background: `linear-gradient(to bottom, #1a1a1a 0%, ${gradientEnd} 100%)` }}>
          <img src={getEquipmentIconPath(pool)} alt={pool.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }} />
        </div>
      </div>

      {/* Costs — top-right, stacked vertically */}
      <div className="position-absolute d-flex flex-column align-items-end" style={{ top: 12, right: 96, gap: 6 }}>
        {grandTotal !== null && (
          <div className="position-relative d-flex flex-column align-items-end" style={{ cursor: "help" }} onMouseEnter={() => { cancelGrandClose(); setGrandTotalTooltipOpen(true); }} onMouseLeave={scheduleGrandClose}>
            <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em", marginBottom: 2 }}>Craft</span>
            <span className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: "1.5rem", color: Number.isNaN(grandTotal) ? "#f87171" : "#fff" }}>
              {Number.isNaN(grandTotal) ? "NaN" : Math.round(grandTotal).toLocaleString("en-US")}
              {!Number.isNaN(grandTotal) && <FEIcon className="w-5 h-5" />}
            </span>
            {grandTotalTooltipOpen && (
              <div className="position-absolute zinc-card small d-flex flex-column" style={{ zIndex: 50, top: 0, left: "100%", marginLeft: 8, width: 224, gap: 6 }} onMouseEnter={cancelGrandClose} onMouseLeave={scheduleGrandClose}>
                {grandTotalLines.map(({ label, value }) => (
                  <div key={label} className="d-flex justify-content-between gap-4 rounded px-1 zinc-hover" style={{ margin: "0 -4px" }} onMouseEnter={() => setHoveredLine(label)} onMouseLeave={() => setHoveredLine(null)}>
                    <span style={{ color: "var(--zinc-400)" }}>{label}</span>
                    <span className="d-flex align-items-center gap-1" style={{ color: value !== null && Number.isNaN(value) ? "#f87171" : "var(--zinc-200)", fontWeight: value !== null && Number.isNaN(value) ? "bold" : undefined }}>
                      {value === null ? "—" : Number.isNaN(value) ? "NaN" : <>{Math.round(value).toLocaleString("en-US")} <FEIcon className="w-3 h-3" /></>}
                    </span>
                  </div>
                ))}
                <div className="d-flex justify-content-between gap-4 fw-semibold pt-1" style={{ borderTop: "1px solid rgba(63,63,70,0.5)" }}>
                  <span style={{ color: "var(--zinc-300)" }}>Total</span>
                  {Number.isNaN(grandTotal) ? <span className="fw-bold" style={{ color: "#f87171" }}>NaN</span> : <span className="fw-bold d-flex align-items-center gap-1" style={{ color: "#fff" }}>{Math.round(grandTotal).toLocaleString("en-US")} <FEIcon className="w-3 h-3" /></span>}
                </div>
              </div>
            )}
          </div>
        )}
        {corrosionTotal !== null && (
          <div className="position-relative d-flex flex-column align-items-end" style={{ cursor: "help" }} onMouseEnter={() => { cancelCorrClose(); setCorrTooltipOpen(true); }} onMouseLeave={scheduleCorrClose}>
            <span className="text-uppercase" style={{ fontSize: 10, color: "var(--zinc-500)", letterSpacing: "0.1em", marginBottom: 2 }}>+Corrosion</span>
            <span className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: "1.5rem", color: Number.isNaN(corrosionTotal) ? "#f87171" : "var(--zinc-300)" }}>
              {Number.isNaN(corrosionTotal) ? "NaN" : Math.round(corrosionTotal).toLocaleString("en-US")}
              {!Number.isNaN(corrosionTotal) && <FEIcon className="w-5 h-5" />}
            </span>
            {corrTooltipOpen && (
              <div className="position-absolute" style={{ zIndex: 50, top: 0, left: "100%", marginLeft: 8, width: 384 }} onMouseEnter={cancelCorrClose} onMouseLeave={() => { scheduleCorrClose(); setHoveredLine(null); }}>
                <CorrosionHoverCard pool={pool} slots={slots} baseCostFE={baseCostFE} shallowCostFE={shallowCostFE} modCostFE={modCostFE} resourcePrices={resourcePrices} corrosionCostFE={corrosionCostFE} onCorrosionCostFEChange={onCorrosionCostFEChange} onHoverSection={(label) => setHoveredLine(label)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name/desc */}
      <div className="text-center mb-3">
        <h2 className="fw-bold mb-0" style={{ fontSize: "1rem", color: "var(--zinc-100)", lineHeight: 1.2 }}>{pool.name}</h2>
        <p className="mb-0 small" style={{ color: "var(--zinc-500)" }}>
          {pool.baseItemCategory.name}{pool.weaponType ? ` · ${pool.weaponType.name}` : ""}{pool.attributeType ? ` · ${pool.attributeType}` : ""}
        </p>
      </div>

      {/* Base Affix */}
      <Section label="Base Affix" feCost={baseFE} highlighted={hoveredLine === "Base Affix"}
        hoverCard={slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES" ? (
          <CorrodedBaseCostSection pool={pool} impossible={PREFIX_SUFFIX_KEYS.some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS")} craftCostPerAttempt={grandTotal} corrosionCostFE={corrosionCostFE} onCorrosionCostFEChange={onCorrosionCostFEChange} />
        ) : slots.base?.sourceGroup === "BASE_AFFIXES" ? (
          <div className="zinc-card small mt-1 ms-auto d-flex flex-column gap-2" style={{ width: 192 }}>
            <p className="mb-0" style={{ color: "var(--zinc-400)" }}>Cost of this base affix</p>
            <div className="position-relative d-flex align-items-center">
              <input type="number" min="0" autoFocus className="zinc-input" placeholder="0" value={baseCostFE} onChange={(e) => onBaseCostFEChange(e.target.value)} />
              <FEIcon className="position-absolute end-0 me-2 flex-shrink-0 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        ) : undefined}
      />
      <SimpleSlotRow label="Base" accent="var(--zinc-100)" groups={[{ label: "Base", options: getOptions(pool, "BASE_AFFIXES") }, { label: "Corroded Base", options: getOptions(pool, "CORROSION_BASE_AFFIXES") }]} value={slots.base} onChange={(v) => update("base", v)} showStats showTiers highlighted={hoveredLine === "Base Affix" && slots.base?.sourceGroup === "CORROSION_BASE_AFFIXES"} />

      {/* Dream + Nightmare */}
      <Section label="Dream + Nightmare" feCost={dreamFE} highlighted={hoveredLine === "Dream Affix"}
        hoverCard={slots.dream ? <DreamCostSection pool={pool} dreamSlot={slots.dream} nightmareSlots={slots.nightmare} shallowCostFE={shallowCostFE} onShallowCostFEChange={onShallowCostFEChange} /> : undefined}
      />
      <SimpleSlotRow label="Dream" accent="#48b8ff" groups={[{ label: "Dream", options: getOptions(pool, "SWEET_DREAM_AFFIXES") }]} value={slots.dream} onChange={(v) => update("dream", v)} showStats showTiers disabled={dreamsFull && !slots.dream} />
      <NightmareSlotRow pool={pool} values={slots.nightmare} onChange={(v) => onChange({ ...slots, nightmare: v })} warn={!!slots.dream && slots.nightmare.length === 0} disabled={dreamsFull && !slots.dream} />

      {/* Sequence */}
      {hasSequences && (
        <>
          <Section label="Sequence" feCost={sequenceFE} highlighted={hoveredLine === "Sequence"}
            hoverCard={slots.sequence ? <SequenceCostSection pool={pool} sequenceSlot={slots.sequence} modCostFE={modCostFE} onModCostFEChange={onModCostFEChange} /> : undefined}
          />
          <SimpleSlotRow label="Sequence" accent="#34d399" groups={[{ label: "Intermediate", options: getOptions(pool, "INTERMEDIATE_SEQUENCES") }, { label: "Advanced", options: getOptions(pool, "ADVANCED_SEQUENCES") }]} groupDotColors={{ "Intermediate": "#ff7d1c", "Advanced": "#fe0000" }} value={slots.sequence} onChange={(v) => update("sequence", v)} />
        </>
      )}

      {/* Prefixes + Suffixes */}
      <Section label="Prefixes + Suffixes" feCost={psFEVal} highlighted={hoveredLine === "Prefix / Suffix"}
        hoverCard={psFEVal !== null ? <PrefixSuffixCostSection pool={pool} slots={slots} prices={resourcePrices} onPricesChange={onResourcePricesChange} /> : undefined}
      />
      <p className="small mb-1" style={{ color: "var(--zinc-600)", paddingLeft: 2 }}>{advancedCount}/2 advanced · {ultimateCount}/2 ultimate</p>

      {/* Prefixes sub-divider */}
      {(() => {
        const prefixHighlighted = hoveredLine === "Prefixes + Suffixes" && (["prefix1","prefix2","prefix3"] as const).some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS");
        return (
          <div className="d-flex align-items-center gap-2 mt-2 mb-1">
            <div className="flex-grow-1" style={{ height: 1, background: "rgba(39,39,42,0.6)" }} />
            <span className="small text-uppercase" style={{ color: prefixHighlighted ? "var(--zinc-200)" : "var(--zinc-600)", fontWeight: prefixHighlighted ? 800 : undefined, letterSpacing: "0.05em", transition: "all 0.15s" }}>Prefixes</span>
            <div className="flex-grow-1" style={{ height: 1, background: "rgba(39,39,42,0.6)" }} />
          </div>
        );
      })()}
      {(["prefix1", "prefix2", "prefix3"] as const).map((key, i) => (
        <PrefixSuffixSlotRow key={key} label={`Prefix ${i + 1}`} type="prefix" pool={pool} value={slots[key]} onChange={(v) => update(key, v)} advancedCount={advancedCount} ultimateCount={ultimateCount} takenAffixIds={takenIdsExcluding(key)} highlighted={hoveredLine === "Prefixes + Suffixes" && (slots[key] as SlotValue)?.tier === "T0_PLUS"} />
      ))}

      {/* Suffixes sub-divider */}
      {(() => {
        const suffixHighlighted = hoveredLine === "Prefixes + Suffixes" && (["suffix1","suffix2","suffix3"] as const).some((k) => (slots[k] as SlotValue)?.tier === "T0_PLUS");
        return (
          <div className="d-flex align-items-center gap-2 mt-3 mb-1">
            <div className="flex-grow-1" style={{ height: 1, background: "rgba(39,39,42,0.6)" }} />
            <span className="small text-uppercase" style={{ color: suffixHighlighted ? "var(--zinc-200)" : "var(--zinc-600)", fontWeight: suffixHighlighted ? 800 : undefined, letterSpacing: "0.05em", transition: "all 0.15s" }}>Suffixes</span>
            <div className="flex-grow-1" style={{ height: 1, background: "rgba(39,39,42,0.6)" }} />
          </div>
        );
      })()}
      {(["suffix1", "suffix2", "suffix3"] as const).map((key, i) => (
        <PrefixSuffixSlotRow key={key} label={`Suffix ${i + 1}`} type="suffix" pool={pool} value={slots[key]} onChange={(v) => update(key, v)} advancedCount={advancedCount} ultimateCount={ultimateCount} takenAffixIds={takenIdsExcluding(key)} highlighted={hoveredLine === "Prefixes + Suffixes" && (slots[key] as SlotValue)?.tier === "T0_PLUS"} />
      ))}
    </div>
  );
}
