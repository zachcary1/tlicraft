"use client";

import { CONSTRAINTS, getCatalogIconPath, type Constraint } from "./slateData";

function CountGraphic({ c, count = 0 }: { c: Constraint; count?: number }) {
  if (c.graphic === "pips") {
    return (
      <div className="flex gap-1 items-center">
        {Array.from({ length: c.max }, (_, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < count ? "#a1a1aa" : "transparent", border: "1px solid #52525b" }} />
        ))}
      </div>
    );
  }
  if (c.graphic === "segments") {
    return (
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: c.max }, (_, i) => (
          <div key={i} style={{ width: 22, height: 7, borderRadius: 2, background: i < count ? "#71717a" : "#252525", border: "1px solid #3a3a3a" }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ width: 64, height: 7, background: "#252525", borderRadius: 3, overflow: "hidden", border: "1px solid #3a3a3a" }}>
      <div style={{ width: `${(count / c.max) * 100}%`, height: "100%", background: "#71717a", borderRadius: 3 }} />
    </div>
  );
}

type SlateTileProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

function SlateTile({ label, selected, onClick }: SlateTileProps) {
  return (
    <div
      className="transition-all duration-150 group-hover:brightness-125"
      onClick={onClick}
      style={{
        height: 155,
        background: "#1e1e1e",
        border: selected ? "1px solid #fbdb58" : "1px solid #3a3a3a",
        boxShadow: selected ? "0 0 0 1px #fbdb58, 0 4px 16px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.6)",
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <img src={getCatalogIconPath(label)} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

type Props = {
  selected: string | null;
  onSelect: (label: string) => void;
};

export default function SlatesPanel({ selected, onSelect }: Props) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "560px",
        height: "100vh",
        background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
      }}
    >
      {/* Title — top 10% */}
      <div
        className="flex items-center px-6"
        style={{ height: "6vh", borderBottom: "2px solid #333333", flexShrink: 0 }}
      >
        <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>
          Slates
        </span>
      </div>

      {/* Middle — 4 slot rows with fixed-size cards */}
      <div className="flex flex-col">

        {/* Row 0 — Non-Legendary (first row) */}
        <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
          {(["Might", "Hunting", "Knowledge"] as const).map((title, i) => (
            <div key={i} className="group flex flex-col px-3 pt-3"
              style={{ flex: 1, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
              <div style={{ height: 28 }}>
                {i === 0 && <span className="text-sm uppercase tracking-wide" style={{ color: "#71717a", marginBottom: 4, display: "block" }}>Non-Legendary</span>}
              </div>
              <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                <span className="text-xs uppercase tracking-wide text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{title}</span>
              </div>
              <SlateTile label={title} selected={selected === title} onClick={() => onSelect(title)} />
            </div>
          ))}
        </div>

        {/* Row 1 — Non-Legendary (second row) */}
        <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
          {(["War", "Deception", "Machines"] as const).map((title, i) => (
            <div key={i} className="group flex flex-col px-3"
              style={{ flex: 1, paddingTop: 10, paddingBottom: 32, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
              <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                <span className="text-xs uppercase tracking-wide text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{title}</span>
              </div>
              <SlateTile label={title} selected={selected === title} onClick={() => onSelect(title)} />
            </div>
          ))}
        </div>

        {/* Section divider */}
        <div style={{ height: 1, background: "#3a3a3a", margin: "0 12px" }} />

        {/* Row 2 — Pedigree of Gods | Corner of Divinity | Fallen Starlight */}
        <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
          {["Pedigree of Gods", "Corner of Divinity", "Fallen Starlight"].map((label, i) => (
            <div key={i} className="group flex flex-col px-3 pt-4"
              style={{ flex: 1, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
              <div style={{ height: 28 }}>
                {i === 0 && <span className="text-sm uppercase tracking-wide" style={{ color: "#71717a", marginBottom: 4, display: "block" }}>Legendary</span>}
              </div>
              <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                <span className="text-xs uppercase tracking-wide text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{label}</span>
              </div>
              <SlateTile label={label} selected={selected === label} onClick={() => onSelect(label)} />
            </div>
          ))}
        </div>

        {/* Row 3 — Prairie | Sparks of Moth Fire | Space Rift */}
        <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
          {["Prairie", "Sparks of Moth Fire", "Space Rift"].map((label, i) => (
            <div key={i} className="group flex flex-col px-3"
              style={{ flex: 1, paddingTop: 10, paddingBottom: 20, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
              <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                <span className="text-xs uppercase tracking-wide text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{label}</span>
              </div>
              <SlateTile label={label} selected={selected === label} onClick={() => onSelect(label)} />
            </div>
          ))}
        </div>

      </div>

      {/* Constraints */}
      <div
        style={{ borderTop: "2px solid #333333", flexShrink: 0, padding: "12px 24px" }}
        className="mt-auto flex flex-col justify-center"
      >
        <span className="text-xs uppercase tracking-widest mb-3" style={{ color: "#71717a" }}>Constraints</span>
        <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[CONSTRAINTS.slice(0, 3), CONSTRAINTS.slice(3)].map((col, ci) => (
            <div key={ci} className="flex flex-col gap-2">
              {col.map((c) => (
                <div key={c.label} className="group relative flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-150 hover:bg-white/5">
                  <div className="pointer-events-none absolute bottom-full left-0 mb-2 whitespace-nowrap rounded px-3 py-1 text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ background: "#141414", border: "1px solid #3a3a3a", color: "#a1a1aa" }}>
                    Divinity Slate effect limit: 0 / {c.max}
                  </div>
                  <img
                    src={getCatalogIconPath(c.label)}
                    alt={c.label}
                    className="transition-all duration-150 group-hover:brightness-125"
                    style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm transition-colors duration-150 group-hover:text-[#e4e4e7]" style={{ color: "#a1a1aa" }}>{c.label}</span>
                    <CountGraphic c={c} count={0} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
