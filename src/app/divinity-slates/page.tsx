"use client";

import { useState, useEffect } from "react";
import SlatesPanel from "./SlatesPanel";
import AffixPanel from "./AffixPanel";
import ItemCard from "./ItemCard";
import {
  SLATE_DEFS,
  EMPTY_SLATE_CONFIG,
  getAllSlots,
  type SlateConfig,
  type Talent,
} from "./slateData";

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const removed = new Set([
  "0,0","0,1","0,4","0,5",
  "1,0",            "1,5",
  "4,0",            "4,5",
  "5,0","5,1","5,4","5,5",
]);

const slot = 100;
const gap  = 8;
const step = slot + gap;
const pad  = 12;
const rows = 6;
const cols = 6;
const svgW = pad + cols * slot + (cols - 1) * gap + pad;
const svgH = pad + rows * slot + (rows - 1) * gap + pad;

const PANEL_W = 560;
const PANEL_GAP = 50;

export default function DivinitySlatesPage() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [talents, setTalents] = useState<Talent[]>([]);

  const [selectedSlateName, setSelectedSlateName] = useState<string | null>(null);
  const [slateConfigs, setSlateConfigs] = useState<Record<string, SlateConfig>>({});
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/talents").then((r) => r.json()).then(setTalents).catch(console.error);
  }, []);

  // Deselect the active affix slot when clicking outside any interactive element.
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("button, input, label, select, textarea, a, [data-affix-panel]")) {
        setActiveSlotKey(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleSelectSlate(name: string) {
    setSelectedSlateName((prev) => (prev === name ? null : name));
    setActiveSlotKey(null);
  }

  function closeOverlay() {
    setSelectedSlateName(null);
    setActiveSlotKey(null);
  }

  const activeDef = selectedSlateName ? SLATE_DEFS[selectedSlateName] : null;
  const activeConfig = selectedSlateName ? slateConfigs[selectedSlateName] ?? EMPTY_SLATE_CONFIG : null;
  const activeSlot = activeDef && activeSlotKey
    ? getAllSlots(activeDef).find((s) => s.key === activeSlotKey) ?? null
    : null;

  const takenIds = new Set(
    activeConfig
      ? Object.entries(activeConfig.slots)
          .filter(([key, value]) => key !== activeSlotKey && !!value)
          .map(([, value]) => value as string)
      : [],
  );

  function updateActiveConfig(patch: Partial<SlateConfig>) {
    if (!selectedSlateName) return;
    setSlateConfigs((prev) => ({
      ...prev,
      [selectedSlateName]: { ...(prev[selectedSlateName] ?? EMPTY_SLATE_CONFIG), ...patch },
    }));
  }

  function handleAffixSelect(value: string) {
    if (!selectedSlateName || !activeSlotKey || !activeConfig) return;
    updateActiveConfig({ slots: { ...activeConfig.slots, [activeSlotKey]: value } });
  }

  function handleAffixClear() {
    if (!selectedSlateName || !activeSlotKey || !activeConfig) return;
    updateActiveConfig({ slots: { ...activeConfig.slots, [activeSlotKey]: null } });
  }

  return (
    <div className="min-h-screen relative" style={BG_STYLE}>

      {/* Grid — exactly centered */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-200"
        style={{ filter: selectedSlateName ? "brightness(0.35)" : "none" }}
      >
        <svg width={svgW} height={svgH} style={{ pointerEvents: "auto" }}>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              if (removed.has(`${r},${c}`)) return null;
              const x = pad + c * step;
              const y = pad + r * step;
              return (
                <rect
                  key={`${r},${c}`}
                  x={x} y={y}
                  width={slot} height={slot}
                  rx="6"
                  fill={hovered === `${r},${c}` ? "#3d3c3c" : "#2b2929"}
                  stroke={hovered === `${r},${c}` ? "#535357" : "#3a3a3a"}
                  strokeWidth="2"
                  style={{ transition: "fill 0.1s, stroke 0.1s" }}
                  onMouseEnter={() => setHovered(`${r},${c}`)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Slates catalog panel — left of the grid. Sits above the overlay backdrop (z-40) so it
          stays clickable (e.g. switching slates) while the ItemCard overlay is open. */}
      <div
        className="absolute z-50"
        style={{ left: `calc(50% - ${svgW / 2}px - ${PANEL_GAP}px - ${PANEL_W}px)`, top: 0, width: PANEL_W, height: "100vh" }}
      >
        <SlatesPanel selected={selectedSlateName} onSelect={handleSelectSlate} />
      </div>

      {/* Affix panel — right of the grid, same position the catalog used to occupy. Also above
          the overlay backdrop so its options stay clickable while the ItemCard is open. */}
      <div
        className="absolute z-50"
        style={{ left: `calc(50% + ${svgW / 2}px + ${PANEL_GAP}px)`, top: 0, width: PANEL_W, height: "100vh" }}
      >
        <AffixPanel
          talents={talents}
          activeSlot={activeSlot}
          selectedValue={activeSlotKey && activeConfig ? activeConfig.slots[activeSlotKey] ?? null : null}
          takenIds={takenIds}
          onSelect={handleAffixSelect}
          onClear={handleAffixClear}
        />
      </div>

      {/* ItemCard overlay */}
      {selectedSlateName && activeDef && activeConfig && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={closeOverlay}
        >
          <ItemCard
            slateName={selectedSlateName}
            def={activeDef}
            config={activeConfig}
            talents={talents}
            activeSlotKey={activeSlotKey}
            onActiveSlotKeyChange={setActiveSlotKey}
            onConfigChange={(config) => updateActiveConfig(config)}
            onClose={closeOverlay}
          />
        </div>
      )}

    </div>
  );
}
