"use client";

import Link from "next/link";
import { SLOT_ICONS, SLOT_LABELS, LAYOUT } from "@/app/crafting/GearPanel";

function CardTitleLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        margin: "-20px -20px -12px -20px",
        padding: "12px 20px",
        color: "#52525b",
        textDecoration: "none",
        borderRadius: "0 24px 0 0",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; e.currentTarget.style.color = "#ffffff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#52525b"; }}
    >
      {icon}
      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      <SearchButton />
    </Link>
  );
}

function SearchButton() {
  return (
    <button
      style={{
        marginLeft: "auto",
        border: "2px solid currentColor",
        borderRadius: "0 6px 0 6px",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  );
}

function GearCard() {
  const slotSize = 88;
  const gap = 10;

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/crafting" icon={ICONS.gear} title="Gear" />
      <div style={{ height: "2px", background: "#333333" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
        {LAYOUT.map(([left, right]) =>
          [left, right].map((slotId) => (
            <div key={slotId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                {SLOT_LABELS[slotId]}
              </span>
              <div
                style={{
                  width: slotSize,
                  height: slotSize,
                  background: "#0a0a0a",
                  border: "3px solid #3f3f46",
                  borderRadius: "0 18px 0 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.35,
                }}
              >
                <div style={{ transform: "scale(0.62)", transformOrigin: "center" }}>
                  {SLOT_ICONS[slotId]}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
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

const HEX_R = 24;
const HEX_HW = HEX_R * 0.866; // half-width of a pointy-top hex
const HEX_STEP_X = HEX_HW * 2 + 6;
const HEX_STEP_Y = HEX_R * 2 + 16;

function hexPoints(cx: number, cy: number, r: number = HEX_R): string {
  const hw = r * 0.866;
  return [
    [cx,      cy - r    ],
    [cx + hw, cy - r/2  ],
    [cx + hw, cy + r/2  ],
    [cx,      cy + r    ],
    [cx - hw, cy + r/2  ],
    [cx - hw, cy - r/2  ],
  ].map(([x, y]) => `${x},${y}`).join(" ");
}

function SkillsCard() {
  const pad = 4;
  const row1Y = HEX_R + pad;
  const row2Y = row1Y + HEX_STEP_Y;
  const svgW = pad + HEX_HW * 2 * 5 + 4 * 5 + pad;
  const svgH = row2Y + HEX_R + pad;

  const startX = pad + HEX_HW - 1;
  const row1Xs = Array.from({ length: 5 }, (_, i) => startX + i * HEX_STEP_X);
  const row2Xs = Array.from({ length: 4 }, (_, i) => startX + i * HEX_STEP_X);

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/skills" icon={ICONS.skills} title="Skills" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {row1Xs.map((cx, i) => (
          <polygon key={i} points={hexPoints(cx, row1Y)} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
        ))}
        <line x1={0} y1={(row1Y + row2Y) / 2} x2={svgW} y2={(row1Y + row2Y) / 2} stroke="#1c1c1c" strokeWidth="1" />
        {row2Xs.map((cx, i) => (
          <polygon key={i} points={hexPoints(cx, row2Y)} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function PactspiritsCard() {
  const r = 26;
  const gap = 14;
  const pad = 2;
  const step = r * 2 + gap;
  const rowY = r + pad;
  const svgW = pad + r * 2 * 3 + gap * 2 + pad;
  const svgH = rowY + r + pad;
  const xs = Array.from({ length: 3 }, (_, i) => pad + r + i * step);

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/pactspirits" icon={ICONS.pactspirits} title="Pactspirits" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block", margin: "0 auto" }}>
        {xs.map((cx, i) => (
          <circle key={i} cx={cx} cy={rowY} r={r} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
        ))}
      </svg>
      <div style={{ height: "1px", background: "#1c1c1c" }} />
      <svg width={svgW} height={svgH} style={{ display: "block", margin: "0 auto" }}>
        {xs.map((cx, i) => (
          <circle key={i} cx={cx} cy={rowY} r={r} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function HeroTraitCard() {
  const cr = 20;          // circle radius
  const sq = cr * 2;      // square size (matches circle diameter)
  const cornerR = 7;      // rounded corner radius
  const colBPad = 6;
  const colBorderR = 10;
  const colGap = 20;
  const rowGap = 12;
  const pad = colBPad;
  const cols = 4;
  const stepX = sq + colGap;
  const circleY = pad + colBPad + cr;
  const sqTop = circleY + cr + rowGap;
  const svgW = pad + stepX * (cols - 1) + sq + pad + colBPad;
  const svgH = sqTop + sq + colBPad + pad;

  function trBlPath(x: number, y: number, w: number, h: number, r: number): string {
    return [
      `M ${x} ${y}`,
      `L ${x + w - r} ${y}`,
      `Q ${x + w} ${y} ${x + w} ${y + r}`,
      `L ${x + w} ${y + h}`,
      `L ${x + r} ${y + h}`,
      `Q ${x} ${y + h} ${x} ${y + h - r}`,
      `L ${x} ${y}`,
      `Z`,
    ].join(" ");
  }

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/hero-trait" icon={ICONS.heroTrait} title="Hero Trait" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {Array.from({ length: cols }, (_, i) => {
          const x = pad + i * stepX;
          const cx = x + cr;
          const bx = x - colBPad;
          const by = circleY - cr - colBPad;
          const bw = sq + colBPad * 2;
          const bh = sqTop + sq + colBPad - by;
          return (
            <g key={i}>
              <path d={trBlPath(bx, by, bw, bh, colBorderR)} fill="none" stroke="#2a2a2a" strokeWidth="1" />
              <circle cx={cx} cy={circleY} r={cr} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
              {i !== 0 && <path d={trBlPath(x, sqTop, sq, sq, cornerR)} fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DivinitySlatesCard() {
  const slot = 26;
  const gap = 5;
  const step = slot + gap;
  const pad = 6;
  const rows = 6;
  const cols = 6;
  const svgW = pad + cols * slot + (cols - 1) * gap + pad;
  const svgH = pad + rows * slot + (rows - 1) * gap + pad;

  const removed = new Set([
    "0,0","0,1","0,4","0,5",
    "1,0",            "1,5",
    "4,0",            "4,5",
    "5,0","5,1","5,4","5,5",
  ]);

  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/divinity-slates" icon={ICONS.divinitySlates} title="Divinity Slates" />
      <div style={{ height: "2px", background: "#333333" }} />
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            if (removed.has(`${r},${c}`)) return null;
            const x = pad + c * step;
            const y = pad + r * step;
            return (
              <rect key={`${r},${c}`} x={x} y={y} width={slot} height={slot} rx="3" fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
            );
          })
        )}
      </svg>
    </div>
  );
}

function TalentsCard() {
  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href="/talents" icon={ICONS.talents} title="Talents" />
      <div style={{ height: "2px", background: "#333333" }} />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              height: "56px",
              border: "1.5px solid #2a2a2a",
              borderRadius: "0 10px 0 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginLeft: "8px",
              marginRight: "8px",
            }}
          >
            <div style={{ position: "absolute", left: "calc(50% - 74px)", width: "36px", height: "36px", border: "2px solid #3a3a3a", background: "#111", borderRadius: "6px", transform: "skewY(-15deg)" }} />
            <div style={{ position: "absolute", left: "calc(50% - 38px)", width: "18px", height: "1px", background: "#3a3a3a", top: "50%", transform: "translateY(-50%)" }} />
            <svg width="40" height="40" style={{ flexShrink: 0 }}>
              <circle cx="20" cy="20" r="19.25" fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
            </svg>
            {i === 0 && <>
              <div style={{ position: "absolute", left: "calc(50% + 20px)", width: "18px", height: "1px", background: "#3a3a3a", top: "50%", transform: "translateY(-50%)" }} />
              <svg style={{ position: "absolute", left: "calc(50% + 38px)" }} width="40" height="40">
                <circle cx="20" cy="20" r="19.25" fill="#111" stroke="#3a3a3a" strokeWidth="1.5" />
              </svg>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewCard({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <div
      className="flex flex-col gap-3 p-5 text-[#e0ddd8]"
      style={{
        background: "linear-gradient(to bottom, #1d1e1e, #0a0a0a)",
        border: "1px solid #1c1c1c",
        borderRadius: "0 24px 0 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <CardTitleLink href={href} icon={icon} title={title} />
      <div style={{ height: "2px", background: "#333333" }} />
      <p className="text-xs text-[#3a3a3a] italic">Coming soon</p>
    </div>
  );
}

const ICONS = {
  gear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  skills: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  pactspirits: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v10l3-3 3 3 3-3 3 3 3-3V10a8 8 0 0 0-8-8z" />
    </svg>
  ),
  talents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  heroTrait: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  divinitySlates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
};

export default function OverviewPage() {
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div className="min-h-screen flex items-center justify-center px-[15%]">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "24px", width: "100%", maxWidth: "1100px", zoom: 1.265 }}>

          {/* Column 1 — Gear */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <GearCard />
          </div>

          {/* Column 2 — Skills, Pactspirits */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <SkillsCard />
            <PactspiritsCard />
          </div>

          {/* Column 3 — Hero Trait, Talents */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <HeroTraitCard />
            <TalentsCard />
          </div>

          {/* Column 4 — Divinity Slates */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <DivinitySlatesCard />
          </div>

        </div>
      </div>
    </div>
  );
}
