"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  GOD_NAMES,
  TALENT_TYPE_LABEL,
  TALENT_TYPE_TIER_COLOR,
  COPY_AFFIX_TIER_COLOR,
  parseTalentEffectLines,
  uniqueTreesInOrder,
  type Talent,
  type Slot,
  type TalentType,
} from "./slateData";
import { TierDiamond } from "./ItemCard";

// ─── Tooltip wrapper for disabled rows ───────────────────────────────────────────

function TooltipRow({ tooltip, children }: { tooltip: string | null; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className="relative"
      onMouseEnter={(e) => { if (tooltip) setPos({ x: e.clientX, y: e.clientY }); }}
      onMouseMove={(e) => { if (tooltip) setPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {tooltip && pos && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", left: pos.x, top: pos.y - 42, transform: "translateX(-50%)", zIndex: 9999,
            background: "#1a1919", border: "1px solid #c0392b", borderRadius: "0 6px 0 6px",
            padding: "6px 12px", color: "#f87171", fontSize: 11, whiteSpace: "nowrap",
            pointerEvents: "none", letterSpacing: "0.03em",
          }}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────────

function OptionRow({
  selected, disabled, tooltip, onClick, children,
}: {
  selected: boolean;
  disabled: boolean;
  tooltip: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <TooltipRow tooltip={disabled ? tooltip : null}>
      <button
        onClick={() => !disabled && onClick()}
        className={`w-full text-left px-3 py-3 text-[14px] transition-all leading-snug ${
          !disabled && !selected ? "hover:brightness-110" : ""
        }`}
        style={{
          border: `2px solid ${disabled ? "#383737" : "#535357"}`,
          backgroundColor: selected ? "#e0ddd8" : disabled ? "#252424" : "#3d3c3c",
          borderRadius: "0 10px 0 10px",
          cursor: disabled ? "not-allowed" : "pointer",
          color: selected ? "#1a2028" : disabled ? "#555555" : "#ffffff",
          boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </button>
    </TooltipRow>
  );
}

function TalentRowContent({ talent }: { talent: Talent }) {
  const lines = parseTalentEffectLines(talent.effect);
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5"><TierDiamond color={TALENT_TYPE_TIER_COLOR[talent.type as TalentType]} /></span>
      <div className="min-w-0">
        {talent.name && <div className="font-semibold mb-0.5">{talent.name}</div>}
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Tree-grouped talent list — full-width rows, sub-headed by tree ───────────────

function TreeGroupedList({
  rows, selectedValue, takenIds, onSelect, onClear,
}: {
  rows: Talent[];
  selectedValue: string | null;
  takenIds: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
}) {
  const trees = uniqueTreesInOrder(rows);
  return (
    <>
      {trees.map((tree) => {
        const treeRows = rows.filter((t) => t.tree === tree);
        return (
          <div key={tree} className="mb-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5 pl-2 border-l-2 border-zinc-700">
              {tree}
            </p>
            <div className="space-y-1">
              {treeRows.map((talent) => {
                const isSelected = selectedValue === talent.id;
                const isTaken = takenIds.has(talent.id) && !isSelected;
                return (
                  <OptionRow
                    key={talent.id}
                    selected={isSelected}
                    disabled={isTaken}
                    tooltip="Already selected in this slate"
                    onClick={() => (isSelected ? onClear() : onSelect(talent.id))}
                  >
                    <TalentRowContent talent={talent} />
                  </OptionRow>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────────

function talentSearchText(talent: Talent): string {
  return `${talent.name} ${parseTalentEffectLines(talent.effect).join(" ")}`.toLowerCase();
}

function matchesQuery(haystack: string, needle: string): boolean {
  return !needle || haystack.toLowerCase().includes(needle);
}

// ─── AffixPanel ───────────────────────────────────────────────────────────────────

type Props = {
  talents: Talent[];
  activeSlot: Slot | null;
  selectedValue: string | null;
  takenIds: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
};

export default function AffixPanel({ talents, activeSlot, selectedValue, takenIds, onSelect, onClear }: Props) {
  const [activeTypeIdx, setActiveTypeIdx] = useState(0);
  const [query, setQuery] = useState("");

  // Jump to the tab matching the current selection whenever the slot or its value changes —
  // this is purely derived from props, so we adjust state during render rather than in an
  // effect (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const nextSyncKey = `${activeSlot?.key ?? ""}|${selectedValue ?? ""}`;
  if (nextSyncKey !== syncKey) {
    setSyncKey(nextSyncKey);
    let nextIdx = 0;
    if (activeSlot && activeSlot.kind === "talent" && selectedValue) {
      const selected = talents.find((t) => t.id === selectedValue);
      const idx = selected ? activeSlot.allowedTypes.indexOf(selected.type as TalentType) : -1;
      nextIdx = idx >= 0 ? idx : 0;
    }
    if (nextIdx !== activeTypeIdx) setActiveTypeIdx(nextIdx);
  }

  // Clear the search box when switching to a different slot (but not on every selection change).
  const [syncedSlotKey, setSyncedSlotKey] = useState<string | null>(null);
  const slotKey = activeSlot?.key ?? null;
  if (slotKey !== syncedSlotKey) {
    setSyncedSlotKey(slotKey);
    if (query !== "") setQuery("");
  }

  const needle = query.trim().toLowerCase();

  const PANEL_BG = "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)";

  if (!activeSlot) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: "100vh", background: PANEL_BG }}>
        <p className="text-center text-[20px] font-semibold whitespace-nowrap" style={{ color: "#d92020" }}>
          Select an affix slot
        </p>
      </div>
    );
  }

  const hasSelection = selectedValue !== null && selectedValue !== undefined;

  return (
    <div className="w-full flex flex-col" style={{ height: "100vh", background: PANEL_BG }} data-affix-panel>
      {/* Slot label */}
      <div className="px-4 pt-5 pb-3 border-b border-[#3a3838]">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-0.5">Selecting</p>
        <p className="text-[15px] font-semibold text-[#e0ddd8]">{activeSlot.label}</p>
      </div>

      {activeSlot.kind === "talent" && (
        <div className="flex flex-row flex-wrap justify-center gap-3 px-6 pt-16">
          {activeSlot.allowedTypes.map((type, i) => (
            <div key={type} className="relative flex flex-col items-center">
              <button
                onClick={() => setActiveTypeIdx(i)}
                className={`px-6 py-4 text-[16px] font-semibold transition-colors cursor-pointer ${
                  i === activeTypeIdx ? "text-[#000000]" : "text-[#ffffff] hover:opacity-80"
                }`}
                style={{
                  backgroundColor: i === activeTypeIdx ? "#ffde1f" : "#0c0c0c",
                  borderRadius: "12px 0 12px 0",
                  boxShadow: i === activeTypeIdx
                    ? "0 6px 10px rgba(255,222,31,0.4), 5px 3px 8px rgba(255,222,31,0.2), -5px 3px 8px rgba(255,222,31,0.2)"
                    : "0 3px 6px rgba(0,0,0,0.4)",
                }}
              >
                {TALENT_TYPE_LABEL[type]}
              </button>
              {i === activeTypeIdx && (
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2"
                  style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "12px solid #ffde1f", filter: "drop-shadow(0 4px 6px rgba(255,222,31,0.5))" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search + clear — same input height/styling as the other selection panels
          (pactspirits, skills, hero-trait: padding "10px 16px" row, 6px/10px input padding,
          fontSize 12, "#111111" bg, "0 8px 0 8px" radius). */}
      <div className={activeSlot.kind === "talent" ? "mt-8" : "mt-16"}>
        <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexShrink: 0 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search affixes…"
            style={{
              flex: 1, background: "#111111", border: "1px solid #2a2a2a",
              borderRadius: "0 8px 0 8px", color: "#e4e4e7", fontSize: 12,
              padding: "6px 10px", outline: "none",
            }}
          />
          <button
            onClick={hasSelection ? onClear : undefined}
            disabled={!hasSelection}
            className="shrink-0 px-4 py-1.5 rounded-sm text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: hasSelection ? "#c0392b" : "#1e1e1e", color: hasSelection ? "white" : "#555555", cursor: hasSelection ? "pointer" : "not-allowed", boxShadow: "0 3px 6px rgba(0,0,0,0.4)" }}
          >
            ✕ Clear selection
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {activeSlot.kind === "choice" ? (() => {
          const options = activeSlot.options.filter((option) => matchesQuery(option, needle));
          if (options.length === 0) return <p className="text-sm text-zinc-500 text-center mt-4">No matching affixes</p>;
          return (
            <div className="space-y-1">
              {options.map((option) => (
                <OptionRow
                  key={option}
                  selected={selectedValue === option}
                  disabled={false}
                  tooltip={null}
                  onClick={() => (selectedValue === option ? onClear() : onSelect(option))}
                >
                  <span className="flex items-start gap-2.5">
                    <span className="mt-1.5"><TierDiamond color={COPY_AFFIX_TIER_COLOR} /></span>
                    <span className="min-w-0">{option}</span>
                  </span>
                </OptionRow>
              ))}
            </div>
          );
        })() : (
          (() => {
            const type = activeSlot.allowedTypes[activeTypeIdx] ?? activeSlot.allowedTypes[0];
            const pool = talents.filter((t) => t.type === type && matchesQuery(talentSearchText(t), needle));

            if (activeSlot.god !== "all") {
              const rows = pool.filter((t) => t.god === activeSlot.god);
              if (rows.length === 0) return <p className="text-sm text-zinc-500 text-center mt-4">No matching affixes</p>;
              return (
                <TreeGroupedList rows={rows} selectedValue={selectedValue} takenIds={takenIds} onSelect={onSelect} onClear={onClear} />
              );
            }

            // Pooled across all 6 gods — group rows by god, then by tree within each god.
            if (pool.length === 0) return <p className="text-sm text-zinc-500 text-center mt-4">No matching affixes</p>;
            return (
              <>
                {GOD_NAMES.map((god) => {
                  const rows = pool.filter((t) => t.god === god);
                  if (rows.length === 0) return null;
                  return (
                    <div key={god} className="mb-4">
                      <p className="text-[16px] font-bold uppercase tracking-wider mb-2 text-zinc-300">{god}</p>
                      <TreeGroupedList rows={rows} selectedValue={selectedValue} takenIds={takenIds} onSelect={onSelect} onClear={onClear} />
                    </div>
                  );
                })}
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}
