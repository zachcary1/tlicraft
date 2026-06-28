"use client";

import { useState } from "react";
import {
  SHAPES,
  ROTATIONS,
  getGodSlateIconPath,
  getInstanceIconPath,
  getIconTransform,
  parseTalentEffectLines,
  getSlateQuality,
  getOrientationConfig,
  TALENT_TYPE_TIER_COLOR,
  COPY_AFFIX_TIER_COLOR,
  type SlateDef,
  type SlateConfig,
  type Slot,
  type Talent,
  type TalentType,
  type Shape,
  type GodName,
  type QualityConfig,
} from "./slateData";

function talentSummary(talent: Talent): string {
  const lines = parseTalentEffectLines(talent.effect);
  return (talent.name ? `${talent.name}: ` : "") + lines.join(" / ");
}

// ─── Tier diamond ─────────────────────────────────────────────────────────────────
// Tier-tag for an affix: a small colored diamond (rotated square) instead of the square
// tier badges used elsewhere — blue for Micro, purple for Medium, orange for Legendary
// Medium / Core / the T1 "copy" affixes (Prairie, Sparks of Moth Fire, Space Rift).

export function TierDiamond({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{ width: 10, height: 10, background: color, transform: "rotate(45deg)", boxShadow: `0 0 4px ${color}99` }}
    />
  );
}

// ─── Section box — light card chrome, matches hero-trait's MemorySectionBox ───────

function SectionBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative border border-[#bec4c9] mt-6 pt-5 px-3 pb-3" style={{ borderRadius: "0 12px 0 12px" }}>
      <div className="absolute top-0 left-[20px] right-[40px] -translate-y-1/2 z-[100]">
        <div className="flex items-center px-3 py-0.5" style={{ background: "linear-gradient(to right, #bdc3c9, #eaeaea)" }}>
          <span className="font-semibold uppercase tracking-wider text-[16px] text-[#555]">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Slot row — light card chrome, matches hero-trait's MemorySlotRow ─────────────

function SlotRow({
  slot, value, talents, isActive, quality, onActivate,
}: {
  slot: Slot;
  value: string | null;
  talents: Talent[];
  isActive: boolean;
  quality: QualityConfig;
  onActivate: () => void;
}) {
  let display: React.ReactNode = null;
  if (value) {
    if (slot.kind === "choice") {
      display = (
        <span className="flex items-center gap-2 min-w-0">
          <TierDiamond color={COPY_AFFIX_TIER_COLOR} />
          <span className="truncate" style={{ color: "#1a1a1a" }}>{value}</span>
        </span>
      );
    } else {
      const talent = talents.find((t) => t.id === value);
      display = talent ? (
        <span className="flex items-center gap-2 min-w-0">
          <TierDiamond color={TALENT_TYPE_TIER_COLOR[talent.type as TalentType]} />
          <span className="truncate" style={{ color: "#1a1a1a" }}>{talentSummary(talent)}</span>
        </span>
      ) : null;
    }
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={onActivate}
        className="flex-1 min-w-0 relative flex items-center pl-3 pr-[48px] py-3 rounded-sm border-0 overflow-hidden focus:outline-none text-sm cursor-pointer transition-colors"
        style={{
          backgroundColor: isActive ? "#e9e3f5" : "#dedfdf",
          outline: isActive ? `2px solid ${quality.border}` : "none",
          outlineOffset: "-2px",
        }}
      >
        {display ?? <span className="w-full text-center truncate" style={{ color: isActive ? "#5b4a78" : "#939393" }}>Empty affix</span>}
        <span
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center"
          style={{ backgroundColor: isActive ? quality.indicatorActive : "#979798" }}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isActive ? quality.indicatorActiveInner : "#6c6b6c" }}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}

// ─── Shape / rotation pickers ──────────────────────────────────────────────────────

function ShapeButton({ god, shape, selected, quality, onClick }: { god: GodName; shape: Shape; selected: boolean; quality: QualityConfig; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className="overflow-hidden transition-all cursor-pointer"
        style={{
          width: 56, height: 56, borderRadius: "0 10px 0 10px",
          border: `2px solid ${selected ? quality.border : "#bec4c9"}`,
          boxShadow: selected ? quality.glow : "none",
        }}
      >
        <img src={getGodSlateIconPath(god, shape)} alt={shape} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </button>
      <span className="text-[10px]" style={{ color: selected ? quality.border : "#888888" }}>{shape}</span>
    </div>
  );
}

function ToggleButton({ label, selected, quality, onClick }: { label: string; selected: boolean; quality: QualityConfig; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
      style={{
        borderRadius: "0 6px 0 6px",
        background: selected ? "#eaeaea" : "#e0e0e0",
        color: selected ? quality.border : "#888888",
        border: `2px solid ${selected ? quality.border : "#bec4c9"}`,
        boxShadow: selected ? quality.glow : "none",
      }}
    >
      {label}
    </button>
  );
}

// Same yellow used for the AffixPanel's active Micro/Medium/Legendary Medium/Core tabs, but
// with a plain black shadow instead of their yellow glow.
const INSTALL_BUTTON_STYLE = {
  background: "#ffde1f",
  color: "#000000",
  borderRadius: "12px 0 12px 0",
  border: "none",
  boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
};

// ─── ItemCard ─────────────────────────────────────────────────────────────────────

type Props = {
  slateName: string;
  def: SlateDef;
  config: SlateConfig;
  talents: Talent[];
  activeSlotKey: string | null;
  onActiveSlotKeyChange: (key: string | null) => void;
  onConfigChange: (config: SlateConfig) => void;
  onClose: () => void;
  mode: "draft" | "placed";
  onPlace?: () => void;
  onRemove?: () => void;
  // True once placed if the instance doesn't fully fit — overlapping another slate or hanging
  // off the board. Placement is never blocked; this just surfaces a warning.
  hasConflict?: boolean;
};

export default function ItemCard({ slateName, def, config, talents, activeSlotKey, onActiveSlotKeyChange, onConfigChange, onClose, mode, onPlace, onRemove, hasConflict }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const quality = getSlateQuality(def);
  const iconPath = getInstanceIconPath(def, config);

  function setSlotActive(key: string) {
    onActiveSlotKeyChange(activeSlotKey === key ? null : key);
  }

  function renderSlotRows(slots: Slot[]) {
    return slots.map((slot) => (
      <SlotRow
        key={slot.key}
        slot={slot}
        value={config.slots[slot.key] ?? null}
        talents={talents}
        quality={quality}
        isActive={activeSlotKey === slot.key}
        onActivate={() => setSlotActive(slot.key)}
      />
    ));
  }

  return (
    <div className="relative" style={{ width: 600 }} onClick={(e) => e.stopPropagation()} data-affix-panel>

      {/* Accent back panel */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: "-70px", background: quality.accentBg, borderRadius: "0 36px 0 36px", zIndex: 0, boxShadow: quality.bgGlow }}
      />

      {/* Slate name */}
      <h2 className="absolute z-10 text-[20px] font-semibold text-white leading-tight" style={{ top: "-58px", left: "150px", right: "44px" }}>
        {slateName}
      </h2>

      {/* Close button */}
      <button
        onClick={onClose}
        title="Close"
        className="absolute z-10 rounded p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
        style={{ top: "-63px", right: "8px" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Curved underline plate — sits behind the icon, peeking out around its edges */}
      <div
        className="absolute z-[19]"
        style={{ top: "-55px", left: "20px", width: "110px", height: "110px", background: quality.border, borderRadius: "0 28px 0 28px" }}
      />

      {/* Icon — no metallic border, just the quality gradient fill */}
      <div
        className="absolute z-20 flex items-center justify-center overflow-hidden"
        style={{ top: "-61px", left: "20px", width: "110px", height: "110px", background: quality.bg, borderRadius: "0 28px 0 28px" }}
      >
        {!imgErr ? (
          <img
            src={iconPath}
            alt={slateName}
            onError={() => setImgErr(true)}
            className="w-full h-full object-contain p-1"
            style={{ transform: getIconTransform(def, config) }}
          />
        ) : (
          <span style={{ color: "#666", fontSize: 28, fontWeight: 700 }}>?</span>
        )}
      </div>

      {/* Main card */}
      <div
        className="relative z-10 border border-[#bec4c9] bg-[#eaeaea] text-[#1a1a1a] px-5 pb-5 pt-1 overflow-y-auto"
        style={{ borderRadius: "0 36px 0 36px", maxHeight: "82vh" }}
      >
        <div className="min-h-[52px]" />

        {hasConflict && (
          <div
            className="mb-3 px-3 py-2 text-xs font-semibold text-center"
            style={{ background: "#fde2e1", color: "#b91c1c", borderRadius: "0 8px 0 8px", border: "1px solid #f3a6a4" }}
          >
            ⚠ Doesn&apos;t fit — overlapping another slate or off the board
          </div>
        )}

        {def.kind === "god" ? (
          <>
            {/* Shape */}
            <div className="mb-4 mt-2">
              <span className="text-xs uppercase tracking-widest text-[#777] block mb-2">Shape</span>
              <div className="flex gap-3 flex-wrap">
                {SHAPES.map((shape) => (
                  <ShapeButton
                    key={shape}
                    god={def.name}
                    shape={shape}
                    quality={quality}
                    selected={config.shape === shape}
                    onClick={() => onConfigChange({ ...config, shape, rotation: 0 })}
                  />
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div className="mb-2">
              <span className="text-xs uppercase tracking-widest text-[#777] block mb-2">Rotation</span>
              <div className="flex gap-2">
                {ROTATIONS.map((rotation) => (
                  <ToggleButton
                    key={rotation}
                    label={`${rotation}°`}
                    quality={quality}
                    selected={config.rotation === rotation}
                    onClick={() => onConfigChange({ ...config, rotation })}
                  />
                ))}
              </div>
            </div>

            <SectionBox label="Fixed Talent Nodes">
              {renderSlotRows(def.fixedSlots)}
            </SectionBox>

            <SectionBox label="Brand Talent Nodes">
              {renderSlotRows(def.randomSlots)}
            </SectionBox>
          </>
        ) : (
          <>
            {/* Rotation — only shown when the slate supports more than one orientation */}
            {(() => {
              const orientation = getOrientationConfig(def);
              if (orientation.rotations.length <= 1) return null;
              return (
                <div className="mb-2 mt-2">
                  <span className="text-xs uppercase tracking-widest text-[#777] block mb-2">Rotation</span>
                  <div className="flex gap-2">
                    {orientation.rotations.map((rotation) => (
                      <ToggleButton
                        key={rotation}
                        label={`${rotation}°`}
                        quality={quality}
                        selected={config.rotation === rotation}
                        onClick={() => onConfigChange({ ...config, rotation })}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            <SectionBox label="Fixed Talent Nodes">
              {renderSlotRows(def.slots)}
            </SectionBox>
          </>
        )}

        {/* Install / Confirm / Remove */}
        <div className="mt-6 flex justify-end gap-3">
          {mode === "draft" ? (
            <button onClick={onPlace} className="px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer" style={INSTALL_BUTTON_STYLE}>
              Install
            </button>
          ) : (
            <>
              <button
                onClick={onRemove}
                className="px-6 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{ background: "#c0392b", borderRadius: "0 10px 0 10px", border: "none", boxShadow: "0 3px 8px rgba(0,0,0,0.35)" }}
              >
                ✕ Remove from Grid
              </button>
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer" style={INSTALL_BUTTON_STYLE}>
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
