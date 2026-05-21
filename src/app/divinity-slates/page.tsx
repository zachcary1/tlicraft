"use client";

import { useState } from "react";

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

const CONSTRAINTS = [
  { label: "Pedigree of Gods",               max: 1 },
  { label: "Corner of Divinity",             max: 3 },
  { label: "Fallen Starlight",               max: 3 },
  { label: "Sparks of Moth Fire",            max: 3 },
  { label: "Space Rift",                     max: 3 },
  { label: "Prairie",                        max: 1 },
];


const slot = 100;
const gap  = 8;
const step = slot + gap;
const pad  = 12;
const rows = 6;
const cols = 6;
const svgW = pad + cols * slot + (cols - 1) * gap + pad;
const svgH = pad + rows * slot + (rows - 1) * gap + pad;


export default function DivinitySlatesPage() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen relative" style={BG_STYLE}>

      {/* Grid — exactly centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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

      {/* Slate panel — 50px to the right of the grid */}
      <div
        className="absolute flex flex-col"
        style={{
          left: `calc(50% + ${svgW / 2}px + 50px)`,
          top: 0,
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
                  {i === 0 && <span className="text-xs uppercase tracking-widest" style={{ color: "#71717a", marginBottom: 4, display: "block" }}>Non-Legendary</span>}
                </div>
                <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                  <span className="text-[10px] uppercase tracking-widest text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{title}</span>
                </div>
                <div className="transition-all duration-150 group-hover:brightness-125" style={{ height: 155, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 4, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
                  <img src={`/icons/slates/${title} Square.webp`} alt={title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Row 1 — Non-Legendary (second row) */}
          <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
            {(["War", "Deception", "Machines"] as const).map((title, i) => (
              <div key={i} className="group flex flex-col px-3"
                style={{ flex: 1, paddingTop: 10, paddingBottom: 32, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
                <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                  <span className="text-[10px] uppercase tracking-widest text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{title}</span>
                </div>
                <div className="transition-all duration-150 group-hover:brightness-125" style={{ height: 155, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 4, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
                  <img src={`/icons/slates/${title} Square.webp`} alt={title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Section divider */}
          <div style={{ height: 1, background: "#3a3a3a", margin: "0 12px" }} />

          {/* Row 2 — Corner of Divinity | Fallen Starlight | Pedigree of Gods */}
          <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
            {["Corner of Divinity", "Fallen Starlight", "Pedigree of Gods"].map((label, i) => (
              <div key={i} className="group flex flex-col px-3 pt-4"
                style={{ flex: 1, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
                <div style={{ height: 28 }}>
                  {i === 0 && <span className="text-xs uppercase tracking-widest" style={{ color: "#71717a", marginBottom: 4, display: "block" }}>Legendary</span>}
                </div>
                <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                  <span className="text-[10px] uppercase tracking-widest text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{label}</span>
                </div>
                <div className="transition-all duration-150 group-hover:brightness-125" style={{ height: 155, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 4, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
                  <img src={`/icons/slates/${label}.webp`} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Row 3 — Prairie | Sparks of Moth Fire | Space Rift */}
          <div className="flex" style={{ borderBottom: "1px solid #2a2a2a" }}>
            {["Prairie", "Sparks of Moth Fire", "Space Rift"].map((label, i) => (
              <div key={i} className="group flex flex-col px-3"
                style={{ flex: 1, paddingTop: 10, paddingBottom: 20, borderRight: i < 2 ? "1px solid #2a2a2a" : undefined }}>
                <div style={{ height: 26, display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
                  <span className="text-[10px] uppercase tracking-widest text-[#52525b] group-hover:text-[#a1a1aa] transition-colors duration-150">{label}</span>
                </div>
                <div className="transition-all duration-150 group-hover:brightness-125" style={{ height: 155, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 4, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
                  <img src={`/icons/slates/${label}.webp`} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Constraints — bottom 10% */}
        <div
          style={{ height: "15vh", borderTop: "2px solid #333333", flexShrink: 0, padding: "0 24px" }}
          className="flex flex-col justify-center gap-1"
        >
          <div className="grid gap-x-6" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
            <div className="flex flex-col gap-1">
              {CONSTRAINTS.slice(0, 3).map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#a1a1aa" }}>{c.label}</span>
                  <span className="text-xs font-medium" style={{ color: "#71717a" }}>0 / {c.max}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {CONSTRAINTS.slice(3).map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#a1a1aa" }}>{c.label}</span>
                  <span className="text-xs font-medium" style={{ color: "#71717a" }}>0 / {c.max}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
