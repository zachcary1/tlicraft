"use client";

import { useState, useEffect } from "react";

interface Skill {
  name: string;
  type: string;
  tags: string[];
  effect: string;
}

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// ─── Slot type rules ──────────────────────────────────────────────────────────

export type SupportType = "normal" | "activation_medium" | "magnificent" | "noble";

const SUPPORT_TYPE_TO_DB: Record<SupportType, string> = {
  normal:            "Support",
  activation_medium: "Activation Medium",
  magnificent:       "Support (Magnificent)",
  noble:             "Support (Noble)",
};

// Maps the lowercased "Supports X" constraint text found in skill effects to a tag predicate.
const SUPPORT_CONSTRAINT_MAP: Record<string, (tags: string[]) => boolean> = {
  // Universal / active-only
  "":                                                                           () => true,
  "any skill":                                                                  () => true,
  "active skills":                                                              () => true,
  "active skill that deal damage":                                              () => true,
  "skills that hit enemies":                                                    () => true,
  "skills that hit the enemy":                                                  () => true,
  "skills that deal damage":                                                    () => true,
  "skills that deal damage over time or inflict ailments":                      () => true,
  // Passive → never show for active slots
  "passive skill":                                                              () => false,
  // Single-tag
  "spell skills":                                                               (t) => t.includes("Spell"),
  "attack skills":                                                              (t) => t.includes("Attack"),
  "area skills":                                                                (t) => t.includes("Area"),
  "barrage skills":                                                             (t) => t.includes("Barrage"),
  "beam skills":                                                                (t) => t.includes("Beam"),
  "channeled skills":                                                           (t) => t.includes("Channeled"),
  "combo skills":                                                               (t) => t.includes("Combo"),
  "curse skills":                                                               (t) => t.includes("Curse"),
  "defensive skills":                                                           (t) => t.includes("Defensive"),
  "empower skills":                                                             (t) => t.includes("Empower"),
  "mobility skills":                                                            (t) => t.includes("Mobility"),
  "projectile skills":                                                          (t) => t.includes("Projectile"),
  "restoration skills":                                                         (t) => t.includes("Restoration"),
  "sentry skills":                                                              (t) => t.includes("Sentry"),
  "shadow strike skills":                                                       (t) => t.includes("Shadow Strike"),
  "terra skills":                                                               (t) => t.includes("Terra"),
  "warcry skills":                                                              (t) => t.includes("Warcry"),
  "synthetic troop skills":                                                     (t) => t.includes("Synthetic Troop"),
  "spirit magus skills":                                                        (t) => t.includes("Sentry") || t.includes("Spirit Magus"),
  "aura skills":                                                                (t) => t.includes("Aura"),
  "duration skills":                                                            () => false,
  "focus skills":                                                               (t) => t.includes("Focus"),
  // Compound (AND)
  "active spell skills":                                                        (t) => t.includes("Spell"),
  "area spell skills":                                                          (t) => t.includes("Area") && t.includes("Spell"),
  "attack projectile skills":                                                   (t) => t.includes("Attack") && t.includes("Projectile"),
  "horizontal projectile skills":                                               (t) => t.includes("Horizontal") && t.includes("Projectile"),
  "parabolic projectile skills":                                                (t) => t.includes("Parabolic") && t.includes("Projectile"),
  "vertical projectile skills":                                                 (t) => t.includes("Vertical") && t.includes("Projectile"),
  "melee attack skills":                                                        (t) => t.includes("Melee") && t.includes("Attack"),
  "melee demolisher skills":                                                    (t) => t.includes("Melee") && t.includes("Demolisher"),
  "melee slash strike skills":                                                  (t) => t.includes("Melee") && t.includes("Slash-Strike"),
  // OR constraints
  "attack skills or spell skills":                                              (t) => t.includes("Attack") || t.includes("Spell"),
  "attack and spell skills":                                                    (t) => t.includes("Attack") || t.includes("Spell"),
  "horizontal projectile skills or chain skills":                               (t) => (t.includes("Horizontal") && t.includes("Projectile")) || t.includes("Chain"),
  "spell skills or skills that can activate spell burst":                       (t) => t.includes("Spell"),
  "persistent skills and skills that can inflict ailment":                      (t) => t.includes("Persistent"),
  // Summon variants
  "skills that summon minions":                                                 (t) => t.includes("Summon"),
  "skills that summon spirit magus":                                            (t) => t.includes("Sentry"),
  "skills that summon synthetic troops":                                        (t) => t.includes("Synthetic Troop"),
  // Activation Medium multi-tag OR lists
  "empower, defensive, restoration, curse, and warcry skills":                  (t) => t.includes("Empower") || t.includes("Defensive") || t.includes("Restoration") || t.includes("Curse") || t.includes("Warcry"),
  "empower, defensive, restoration, and curse skills":                          (t) => t.includes("Empower") || t.includes("Defensive") || t.includes("Restoration") || t.includes("Curse"),
  "empower, defensive, restoration, curse, mobility, and warcry skills":        (t) => t.includes("Empower") || t.includes("Defensive") || t.includes("Restoration") || t.includes("Curse") || t.includes("Mobility") || t.includes("Warcry"),
  "spell skills that deal damage or skills that can activate spell burst":      (t) => t.includes("Spell"),
  "attack skills and spell skills that deal damage":                            (t) => t.includes("Attack") || t.includes("Spell"),
  "attack skills that deal damage":                                             (t) => t.includes("Attack"),
};

function getPreciseSortKey(name: string): [string, number] {
  if (name.startsWith("Precise: ")) return [name.slice(9), 1];
  if (name.startsWith("Precise "))  return [name.slice(8), 1];
  return [name, 0];
}

function extractSupportConstraint(effect: string): string {
  const match = effect?.match(/<hr>Supports ([^<]+)\./i);
  return match ? match[1].trim() : "";
}

function canSupportBeUsedWithSkill(support: Skill, skill: Skill, mode: "active" | "passive"): boolean {
  // Magnificent / Noble: effect explicitly names the one skill they support
  if (support.type === "Support (Magnificent)" || support.type === "Support (Noble)") {
    const constraint = extractSupportConstraint(support.effect ?? "");
    return constraint === skill.name;
  }
  const constraint = extractSupportConstraint(support.effect ?? "").toLowerCase();
  // Passive-skill-only supports: only valid in passive slots
  if (constraint === "passive skill") return mode === "passive";
  const pred = SUPPORT_CONSTRAINT_MAP[constraint];
  return pred ? pred(skill.tags) : true;
}

export interface ActiveSupportSlotDef {
  slot: number;
  allowedTypes: SupportType[];
  specialLabel?: string;
  energyCost: number;
}

/**
 * Slots numbered 1–5, starting at the top-middle and going counter-clockwise.
 * Slot 1: top      — normal + activation medium — 0 energy
 * Slot 2: top-left  — normal only               — 10 energy
 * Slot 3: bot-left  — normal + magnificent      — 15 energy
 * Slot 4: bot-right — normal only               — 50 energy
 * Slot 5: top-right — normal + noble            — 100 energy
 */
export const ACTIVE_SUPPORT_SLOTS: ActiveSupportSlotDef[] = [
  { slot: 1, allowedTypes: ["normal", "activation_medium"], specialLabel: "AM", energyCost: 0   },
  { slot: 2, allowedTypes: ["normal"],                                           energyCost: 10  },
  { slot: 3, allowedTypes: ["normal", "magnificent"],       specialLabel: "M",  energyCost: 15  },
  { slot: 4, allowedTypes: ["normal"],                                           energyCost: 50  },
  { slot: 5, allowedTypes: ["normal", "noble"],             specialLabel: "N",  energyCost: 100 },
];

export function canPlaceInActiveSlot(slotNumber: number, type: SupportType): boolean {
  const def = ACTIVE_SUPPORT_SLOTS.find((s) => s.slot === slotNumber);
  return def ? def.allowedTypes.includes(type) : false;
}

export interface PassiveSupportSlotDef {
  slot: number;
  energyCost: number;
  allowedTypes: SupportType[];
}

/**
 * Slots numbered 1–5, starting at the leftmost position and going clockwise.
 * Slot 3: normal + magnificent   Slot 5: normal + noble   Others: normal only
 */
export const PASSIVE_SUPPORT_SLOTS: PassiveSupportSlotDef[] = [
  { slot: 1, energyCost: 10,  allowedTypes: ["normal"] },
  { slot: 2, energyCost: 10,  allowedTypes: ["normal"] },
  { slot: 3, energyCost: 15,  allowedTypes: ["normal", "magnificent"] },
  { slot: 4, energyCost: 50,  allowedTypes: ["normal"] },
  { slot: 5, energyCost: 100, allowedTypes: ["normal", "noble"] },
];

export function canPlaceInPassiveSlot(slotNumber: number, type: SupportType): boolean {
  const def = PASSIVE_SUPPORT_SLOTS.find((s) => s.slot === slotNumber);
  return def ? def.allowedTypes.includes(type) : false;
}

export const MAX_ENERGY = 531;

// ─── Geometry ─────────────────────────────────────────────────────────────────

const pad  = 12;
const svgW = 664;
const svgH = 664;
const cx   = svgW / 2;
const cy   = svgH / 2;
const R    = svgW / 2 - pad;

const hexPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 90);
  return `${cx + R * Math.cos(angle)},${cy + R * Math.sin(angle)}`;
}).join(" ");

const R2 = R * 0.55;
const hexPointsInner = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 90);
  return `${cx + R2 * Math.cos(angle)},${cy + R2 * Math.sin(angle)}`;
}).join(" ");

const CCW_VERTEX_ORDER = [0, 5, 4, 2, 1];
const activeOuterSlots = ACTIVE_SUPPORT_SLOTS.map((def, idx) => {
  const vi    = CCW_VERTEX_ORDER[idx];
  const angle = (Math.PI / 180) * (60 * vi - 90);
  return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), ...def };
});

const passiveInnerR = R * 0.65;
const passiveTinyR  = R * 0.42;

const passiveOuterSlots = [-150, -120, -90, -60, -30].map((deg, idx) => {
  const angle = (Math.PI / 180) * deg;
  const def = PASSIVE_SUPPORT_SLOTS[idx];
  return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), slot: def.slot, energyCost: def.energyCost };
});

// ─── Hex cell geometry ────────────────────────────────────────────────────────

const HEX_R        = 46;
const CENTER_HEX_R = 68;

const hexW  = HEX_R * Math.sqrt(3);
const hexH  = HEX_R * 2;
const hexCellPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 90);
  return `${hexW / 2 + HEX_R * Math.cos(angle)},${hexH / 2 + HEX_R * Math.sin(angle)}`;
}).join(" ");

const HEX_CELL_VARIANTS = {
  active:  { base: "#182332", hover: "#1f2d3e", darkHover: "#111c28", selected: "#253848", stroke: "#2a4060", strokeHover: "#3a5878", strokeSelected: "#aaaaaa", plus: "#7aaac8" },
  passive: { base: "#3c191b", hover: "#4a2022", darkHover: "#2e1315", selected: "#562629", stroke: "#5c2a2d", strokeHover: "#7a3a3e", strokeSelected: "#aaaaaa", plus: "#c06870" },
} as const;

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function hexCellPointsAt(px: number, py: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return `${px + HEX_R * Math.cos(angle)},${py + HEX_R * Math.sin(angle)}`;
  }).join(" ");
}

function centerHexCellPointsAt(px: number, py: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return `${px + CENTER_HEX_R * Math.cos(angle)},${py + CENTER_HEX_R * Math.sin(angle)}`;
  }).join(" ");
}

/** Asymmetric pill path: top-left and bottom-right squared, top-right and bottom-left rounded. */
function asymmetricPill(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    "Z",
  ].join(" ");
}

// ─── Left panel hex cell ──────────────────────────────────────────────────────

function HexCell({ onClick, selected, variant = "active" }: {
  onClick?: () => void;
  selected?: boolean;
  variant?: "active" | "passive";
}) {
  const [hovered, setHovered] = useState(false);
  const v = HEX_CELL_VARIANTS[variant];

  return (
    <svg
      width={hexW}
      height={hexH}
      overflow="visible"
      style={{
        display: "block",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        filter: selected
          ? "drop-shadow(0 0 5px rgba(255,255,255,0.55)) drop-shadow(0 0 10px rgba(255,255,255,0.25)) drop-shadow(0 3px 6px rgba(0,0,0,0.6))"
          : "drop-shadow(0 3px 6px rgba(0,0,0,0.6))",
        transition: "filter 0.15s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <polygon
        points={hexCellPoints}
        fill={selected ? v.selected : hovered ? v.hover : v.base}
        stroke={selected ? v.strokeSelected : hovered ? v.strokeHover : v.stroke}
        strokeWidth="1"
      />
      <text
        x={hexW / 2} y={hexH / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="32" fill={v.plus}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        +
      </text>
    </svg>
  );
}

// ─── Center panel hex slot ────────────────────────────────────────────────────

function SvgHexSlot({ x, y, variant, isSkillSlot = false, label, subLabel, energyCost, selected = false, hasSkill = false, skillName, disabled = false, onClick }: {
  x: number;
  y: number;
  variant: "active" | "passive";
  isSkillSlot?: boolean;
  label?: string;
  subLabel?: string;
  energyCost?: number;
  selected?: boolean;
  hasSkill?: boolean;
  skillName?: string | null;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const v = HEX_CELL_VARIANTS[variant];

  const energyLabel = energyCost !== undefined ? `${energyCost} energy` : null;
  const pillH = 24;
  const pillR = 10;
  const pillW = energyLabel ? energyLabel.length * 6.5 + 22 : 0;
  const pillY = y - CENTER_HEX_R - 16;

  return (
    <g
      onClick={disabled ? undefined : (e) => { e.stopPropagation(); onClick?.(); }}
      onMouseEnter={disabled ? undefined : () => setHovered(true)}
      onMouseLeave={disabled ? undefined : () => setHovered(false)}
      style={{
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        outline: "none",
        filter: selected
          ? "drop-shadow(0 0 6px rgba(255,255,255,0.6)) drop-shadow(0 0 14px rgba(255,255,255,0.25)) drop-shadow(0 3px 6px rgba(0,0,0,0.6))"
          : "drop-shadow(0 3px 6px rgba(0,0,0,0.6))",
        transition: "filter 0.15s ease",
      }}
    >
      <polygon
        points={centerHexCellPointsAt(x, y)}
        fill={hovered ? v.hover : v.base}
        stroke={hasSkill ? "white" : "none"}
        strokeWidth={hasSkill ? "2" : "0"}
      />
      {energyLabel && (
        <g style={{ pointerEvents: "none", userSelect: "none" }}>
          <path
            d={asymmetricPill(x - pillW / 2, pillY - pillH / 2, pillW, pillH, pillR)}
            fill="#111111" stroke="#2e2e2e" strokeWidth="1"
          />
          <text
            x={x} y={pillY}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="12" fill={hasSkill ? "#ffffff" : "#5a5a5a"} letterSpacing="0.04em"
          >
            {energyLabel}
          </text>
        </g>
      )}
      {label && (
        <text
          x={x} y={y - (subLabel ? 7 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={isSkillSlot ? "9" : "13"}
          fill={isSkillSlot ? "#52525b" : "#6b6b6b"}
          letterSpacing={isSkillSlot ? "0.08em" : undefined}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      )}
      {subLabel && (
        <text
          x={x} y={y + 9}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="7.5" fill="#484848" letterSpacing="0.06em"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {subLabel}
        </text>
      )}
      {(isSkillSlot || skillName !== undefined) && (
        <foreignObject
          x={x - 90} y={y + CENTER_HEX_R + 6}
          width={180} height={70}
          style={{ pointerEvents: "none", userSelect: "none", overflow: "visible" }}
        >
          <div style={{
            color: "#ffffff",
            fontSize: 14,
            fontFamily: "'TLFont', Arial, sans-serif",
            textAlign: "center",
            lineHeight: 1.35,
            wordBreak: "break-word",
            width: "100%",
          }}>
            {skillName ?? "Select Skill"}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────

const CARD_HEX_R   = 34;
const CARD_HEX_W   = CARD_HEX_R * Math.sqrt(3);
const CARD_HEX_H   = CARD_HEX_R * 2;
const CARD_HEX_PTS = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 90);
  return `${CARD_HEX_W / 2 + CARD_HEX_R * Math.cos(a)},${CARD_HEX_H / 2 + CARD_HEX_R * Math.sin(a)}`;
}).join(" ");

function SkillCard({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: 172,
        background: selected ? "#1e2d3e" : hovered ? "#1c1c1c" : "#161616",
        border: `1px solid ${selected ? "#3a5878" : "#2a2a2a"}`,
        borderRadius: "0 12px 0 12px",
        cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 6px",
        boxSizing: "border-box",
      }}
    >
      <svg width={CARD_HEX_W} height={CARD_HEX_H} overflow="visible" style={{ flexShrink: 0 }}>
        <polygon points={CARD_HEX_PTS} fill="#182332" stroke="#2a4060" strokeWidth="1" />
      </svg>
      <div style={{
        color: "#e4e4e7",
        fontSize: 14,
        fontWeight: 600,
        textAlign: "center",
        lineHeight: 1.3,
        width: "100%",
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      }}>
        {name}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type LayoutMode = "active" | "passive" | null;

// Energy rule: pay costs for all slots 1..N where N is the highest slot that has a support.
function getSkillEnergy(mode: "active" | "passive", skillIdx: number, supportSelections: Record<string, string>): number {
  const slots = mode === "active" ? ACTIVE_SUPPORT_SLOTS : PASSIVE_SUPPORT_SLOTS;
  const highestFilled = slots
    .filter((s) => !!supportSelections[`${mode}-${skillIdx}-${s.slot}`])
    .reduce((max, s) => Math.max(max, s.slot), 0);
  if (highestFilled === 0) return 0;
  return slots
    .filter((s) => s.slot <= highestFilled)
    .reduce((sum, s) => sum + s.energyCost, 0);
}

function getTotalEnergy(supportSelections: Record<string, string>): number {
  let total = 0;
  for (let i = 0; i < 5; i++) total += getSkillEnergy("active",  i, supportSelections);
  for (let i = 0; i < 4; i++) total += getSkillEnergy("passive", i, supportSelections);
  return total;
}

export default function SkillsPage() {
  const [layoutMode,           setLayoutMode]           = useState<LayoutMode>(null);
  const [selectedActive,       setSelectedActive]       = useState<number | null>(null);
  const [selectedPassive,      setSelectedPassive]      = useState<number | null>(null);
  const [selectedCenterSlot,   setSelectedCenterSlot]   = useState<string | null>(null);
  const [filledSlots,          setFilledSlots]          = useState<Record<string, boolean>>({});
  const [activeSkills,           setActiveSkills]           = useState<Skill[]>([]);
  const [passiveSkills,          setPassiveSkills]          = useState<Skill[]>([]);
  const [allSupportSkills,       setAllSupportSkills]       = useState<Skill[]>([]);
  const [activeSkillSelections,  setActiveSkillSelections]  = useState<(string | null)[]>(Array(5).fill(null));
  const [passiveSkillSelections, setPassiveSkillSelections] = useState<(string | null)[]>(Array(4).fill(null));
  const [supportSelections,      setSupportSelections]      = useState<Record<string, string>>({});
  const [searchQuery,            setSearchQuery]            = useState("");

  useEffect(() => { setSearchQuery(""); }, [selectedActive, selectedPassive, selectedCenterSlot]);

  useEffect(() => {
    fetch("/api/skills?type=Active")
      .then((r) => r.json()).then(setActiveSkills).catch(console.error);
    fetch("/api/skills?type=Passive")
      .then((r) => r.json()).then(setPassiveSkills).catch(console.error);
    fetch("/api/skills?types=Support,Support%20(Magnificent),Support%20(Noble),Activation%20Medium")
      .then((r) => r.json()).then(setAllSupportSkills).catch(console.error);
  }, []);

  function selectSkillForActiveSlot(slotIdx: number, skillName: string) {
    setActiveSkillSelections((prev) => {
      const next = [...prev];
      next[slotIdx] = next[slotIdx] === skillName ? null : skillName;
      return next;
    });
  }

  function selectSkillForPassiveSlot(slotIdx: number, skillName: string) {
    setPassiveSkillSelections((prev) => {
      const next = [...prev];
      next[slotIdx] = next[slotIdx] === skillName ? null : skillName;
      return next;
    });
  }

  function selectSkillForSupportSlot(key: string, skillName: string) {
    setSupportSelections((prev) => ({
      ...prev,
      [key]: prev[key] === skillName ? undefined as unknown as string : skillName,
    }));
  }

  function selectActive(i: number) {
    setSelectedActive(i);
    setSelectedPassive(null);
    setSelectedCenterSlot(null);
    setLayoutMode("active");
  }

  function selectPassive(i: number) {
    setSelectedPassive(i);
    setSelectedActive(null);
    setSelectedCenterSlot(null);
    setLayoutMode("passive");
  }

  function selectCenterSlot(id: string) {
    setSelectedCenterSlot((prev) => (prev === id ? null : id));
  }

  const selectionLabel = (() => {
    if (selectedCenterSlot?.startsWith("support-"))
      return `Support ${selectedCenterSlot.replace("support-", "")}`;
    if (layoutMode === "active"  && selectedActive  !== null) return `Active ${selectedActive + 1}`;
    if (layoutMode === "passive" && selectedPassive !== null) return `Passive ${selectedPassive + 1}`;
    return null;
  })();

  const currentSlotIdx = layoutMode === "active" ? selectedActive : selectedPassive;

  const currentSupportKey =
    layoutMode !== null && currentSlotIdx !== null && selectedCenterSlot?.startsWith("support-")
      ? `${layoutMode}-${currentSlotIdx}-${selectedCenterSlot.replace("support-", "")}`
      : null;

  const hasSkillSelection = (() => {
    if (layoutMode === null || currentSlotIdx === null) return false;
    const selections = layoutMode === "active" ? activeSkillSelections : passiveSkillSelections;
    if (selectedCenterSlot === "skill") return selections[currentSlotIdx] !== null;
    if (currentSupportKey) return currentSupportKey in supportSelections && !!supportSelections[currentSupportKey];
    return false;
  })();

  function clearSelection() {
    if (layoutMode === null || currentSlotIdx === null) return;
    if (selectedCenterSlot === "skill") {
      if (layoutMode === "active") {
        setActiveSkillSelections((prev) => { const next = [...prev]; next[currentSlotIdx] = null; return next; });
        setSupportSelections((prev) => {
          const next = { ...prev };
          ACTIVE_SUPPORT_SLOTS.forEach((s) => delete next[`active-${currentSlotIdx}-${s.slot}`]);
          return next;
        });
      } else {
        setPassiveSkillSelections((prev) => { const next = [...prev]; next[currentSlotIdx] = null; return next; });
        setSupportSelections((prev) => {
          const next = { ...prev };
          PASSIVE_SUPPORT_SLOTS.forEach((s) => delete next[`passive-${currentSlotIdx}-${s.slot}`]);
          return next;
        });
      }
    } else if (currentSupportKey) {
      setSupportSelections((prev) => { const next = { ...prev }; delete next[currentSupportKey]; return next; });
    }
  }

  function clearAll() {
    setSelectedCenterSlot(null);
    setSearchQuery("");
  }

  const currentSkillEnergy =
    layoutMode === "active"  && selectedActive  !== null ? getSkillEnergy("active",  selectedActive,  supportSelections) :
    layoutMode === "passive" && selectedPassive !== null ? getSkillEnergy("passive", selectedPassive, supportSelections) :
    null;

  const totalEnergy = getTotalEnergy(supportSelections);
  const overLimit   = totalEnergy > MAX_ENERGY;

  return (
    <div className="min-h-screen relative" style={BG_STYLE} onClick={clearAll}>

      {/* Center diagram */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width={svgW} height={svgH} overflow="visible">

          {layoutMode === "active" && (
            <>
              <polygon points={hexPoints}      fill="none" stroke="#3a3a3a" strokeWidth="1" style={{ pointerEvents: "none" }} />
              <polygon points={hexPointsInner} fill="none" stroke="#3a3a3a" strokeWidth="1" style={{ pointerEvents: "none" }} />
              <SvgHexSlot x={cx} y={cy} variant="active" isSkillSlot label="SKILL"
                skillName={selectedActive !== null ? activeSkillSelections[selectedActive] : null}
                hasSkill={selectedActive !== null && activeSkillSelections[selectedActive] !== null}
                selected={selectedCenterSlot === "skill"} onClick={() => selectCenterSlot("skill")} />
              {activeOuterSlots.map((slot) => {
                const noSkill = selectedActive === null || activeSkillSelections[selectedActive] === null;
                const supportKey = `active-${selectedActive ?? 0}-${slot.slot}`;
                const assignedSupport = supportSelections[supportKey];
                // undefined → don't render label at all (disabled); null → "Select Skill"; string → skill name
                const slotSkillName = noSkill ? undefined : (assignedSupport ?? null);
                return (
                  <SvgHexSlot key={slot.slot} x={slot.x} y={slot.y} variant="active"
                    label={String(slot.slot)} subLabel={slot.specialLabel} energyCost={slot.energyCost}
                    selected={selectedCenterSlot === `support-${slot.slot}`}
                    disabled={noSkill}
                    skillName={slotSkillName}
                    hasSkill={!noSkill && !!assignedSupport}
                    onClick={() => selectCenterSlot(`support-${slot.slot}`)} />
                );
              })}
            </>
          )}

          {layoutMode === "passive" && (
            <>
              <circle cx={cx} cy={cy} r={R}             fill="none" stroke="#3a3a3a" strokeWidth="1" style={{ pointerEvents: "none" }} />
              <circle cx={cx} cy={cy} r={passiveInnerR} fill="none" stroke="#3a3a3a" strokeWidth="1" style={{ pointerEvents: "none" }} />
              <circle cx={cx} cy={cy} r={passiveTinyR}  fill="none" stroke="#3a3a3a" strokeWidth="1" style={{ pointerEvents: "none" }} />
              <SvgHexSlot x={cx} y={cy} variant="passive" isSkillSlot label="SKILL"
                skillName={selectedPassive !== null ? passiveSkillSelections[selectedPassive] : null}
                hasSkill={selectedPassive !== null && passiveSkillSelections[selectedPassive] !== null}
                selected={selectedCenterSlot === "skill"} onClick={() => selectCenterSlot("skill")} />
              {passiveOuterSlots.map((pos) => {
                const noSkill = selectedPassive === null || passiveSkillSelections[selectedPassive] === null;
                const supportKey = `passive-${selectedPassive ?? 0}-${pos.slot}`;
                const assignedSupport = supportSelections[supportKey];
                const slotSkillName = noSkill ? undefined : (assignedSupport ?? null);
                return (
                  <SvgHexSlot key={pos.slot} x={pos.x} y={pos.y} variant="passive"
                    label={String(pos.slot)} energyCost={pos.energyCost}
                    selected={selectedCenterSlot === `support-${pos.slot}`}
                    disabled={noSkill}
                    skillName={slotSkillName}
                    hasSkill={!noSkill && !!assignedSupport}
                    onClick={() => selectCenterSlot(`support-${pos.slot}`)} />
                );
              })}
            </>
          )}

        </svg>
      </div>

      {/* Energy display — top-right of center panel */}
      <div
        style={{
          position: "absolute",
          right: `calc(50% - ${svgW / 2}px - 30px)`,
          top: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Skill energy card */}
        <div style={{
          background: "#161616",
          border: "1px solid #2a2a2a",
          borderRadius: "0 12px 0 12px",
          padding: "10px 14px",
          minWidth: 130,
        }}>
          <div style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
            Skill Energy
          </div>
          <div style={{ color: currentSkillEnergy !== null ? "#e4e4e7" : "#3a3a3a", fontSize: 24, fontWeight: 600, lineHeight: 1 }}>
            {currentSkillEnergy ?? "—"}
          </div>
        </div>

        {/* Total energy card */}
        <div style={{
          background: "#161616",
          border: "1px solid #2a2a2a",
          borderRadius: "0 12px 0 12px",
          padding: "10px 14px",
          minWidth: 130,
        }}>
          <div style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
            Total Energy
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", lineHeight: 1 }}>
            <div>
              <span style={{ color: overLimit ? "#c06060" : "#e4e4e7", fontSize: 24, fontWeight: 600 }}>
                {totalEnergy}
              </span>
              <span style={{ color: "#52525b", fontSize: 13, marginLeft: 5 }}>
                / {MAX_ENERGY}
              </span>
            </div>
            <button
              onClick={() => {}}
              style={{
                width: 18, height: 18,
                borderRadius: "0 4px 0 4px",
                background: "#222222",
                border: "1px solid #3a3a3a",
                color: "#6a6a6a",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                lineHeight: 1,
                padding: 0,
              }}
            >
              i
            </button>
          </div>
        </div>
      </div>

      {/* Left panel */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          right: `calc(50% + ${svgW / 2}px + 50px)`,
          top: 0, width: "129px", height: "100vh",
          background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
        }}
      >
        <div className="flex items-center px-6"
          style={{ height: "6vh", borderBottom: "2px solid #333333", flexShrink: 0 }}>
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>Skills</span>
        </div>
        <div className="flex flex-col items-center pt-10 gap-2">
          <span className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Active</span>
          {Array.from({ length: 5 }, (_, i) => (
            <HexCell key={i} variant="active" onClick={() => selectActive(i)} selected={layoutMode === "active" && selectedActive === i} />
          ))}
          <div style={{ height: 40 }} />
          <span className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Passive</span>
          {Array.from({ length: 4 }, (_, i) => (
            <HexCell key={i} variant="passive" onClick={() => selectPassive(i)} selected={layoutMode === "passive" && selectedPassive === i} />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        className="absolute flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          left: `calc(50% + ${svgW / 2}px + 50px)`,
          top: 0, width: "560px", height: "100vh",
          background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
        }}
      >
        <div className="px-4 pt-5 pb-3"
          style={{ borderBottom: "2px solid #333333", flexShrink: 0 }}>
          <p style={{ color: "#52525b", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            Selecting
          </p>
          <p style={{ color: "#e4e4e7", fontSize: 15, fontWeight: 600 }}>
            {selectionLabel ?? "—"}
          </p>
        </div>

        {/* Skill / support picker */}
        {layoutMode !== null && currentSlotIdx !== null && selectedCenterSlot !== null && (() => {
          const isSkillSlot  = selectedCenterSlot === "skill";
          const supportNum   = isSkillSlot ? null : parseInt(selectedCenterSlot.replace("support-", ""));
          const slotDefs     = layoutMode === "active" ? ACTIVE_SUPPORT_SLOTS : PASSIVE_SUPPORT_SLOTS;
          const slotDef      = supportNum !== null ? slotDefs.find((s) => s.slot === supportNum) : null;
          const skillPool    = layoutMode === "active" ? activeSkills : passiveSkills;
          const skillSelections = layoutMode === "active" ? activeSkillSelections : passiveSkillSelections;

          const selectedSkillObj =
            skillSelections[currentSlotIdx] != null
              ? skillPool.find((s) => s.name === skillSelections[currentSlotIdx]) ?? null
              : null;

          const pinnedType =
            supportNum === 3 ? SUPPORT_TYPE_TO_DB.magnificent :
            supportNum === 5 ? SUPPORT_TYPE_TO_DB.noble : null;

          const sortByPrecise = (a: Skill, b: Skill) => {
            const [aBase, aPrec] = getPreciseSortKey(a.name);
            const [bBase, bPrec] = getPreciseSortKey(b.name);
            const baseCmp = aBase.localeCompare(bBase);
            return baseCmp !== 0 ? baseCmp : aPrec - bPrec;
          };

          const pool = isSkillSlot
            ? [...skillPool].sort(sortByPrecise)
            : allSupportSkills
                .filter((s) =>
                  slotDef?.allowedTypes.some((t) => SUPPORT_TYPE_TO_DB[t] === s.type) &&
                  (selectedSkillObj ? canSupportBeUsedWithSkill(s, selectedSkillObj, layoutMode) : true)
                )
                .sort((a, b) => {
                  if (pinnedType) {
                    const pinDiff = (a.type === pinnedType ? 0 : 1) - (b.type === pinnedType ? 0 : 1);
                    if (pinDiff !== 0) return pinDiff;
                  }
                  return sortByPrecise(a, b);
                });

          const needle   = searchQuery.replace(/\s/g, "").toLowerCase();
          const filtered = needle ? pool.filter((s) => s.name.toLowerCase().includes(needle)) : pool;

          const currentSelection = isSkillSlot
            ? skillSelections[currentSlotIdx]
            : currentSupportKey ? (supportSelections[currentSupportKey] ?? null) : null;

          function handleCardClick(skillName: string) {
            if (isSkillSlot) {
              if (layoutMode === "active") selectSkillForActiveSlot(currentSlotIdx, skillName);
              else                        selectSkillForPassiveSlot(currentSlotIdx, skillName);
            } else if (currentSupportKey) {
              selectSkillForSupportSlot(currentSupportKey, skillName);
            }
          }

          return (
            <>
              {/* Search + clear row */}
              <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexShrink: 0 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
                  placeholder="Search skills…"
                  style={{
                    flex: 1,
                    background: "#111111",
                    border: "1px solid #2a2a2a",
                    borderRadius: "0 8px 0 8px",
                    color: "#e4e4e7",
                    fontSize: 12,
                    padding: "6px 10px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={hasSkillSelection ? clearSelection : undefined}
                  disabled={!hasSkillSelection}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "0 8px 0 8px",
                    background: hasSkillSelection ? "#c0392b" : "#1e1e1e",
                    border: "none",
                    color: hasSkillSelection ? "#ffffff" : "#555555",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: hasSkillSelection ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                    flexShrink: 0,
                  }}
                >
                  ✕ Clear Selection
                </button>
              </div>
              {/* Scrollable grid */}
              <div className="overflow-y-auto" style={{ flex: 1, padding: "0 16px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {filtered.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      name={skill.name}
                      selected={currentSelection === skill.name}
                      onClick={() => handleCardClick(skill.name)}
                    />
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      </div>

    </div>
  );
}
