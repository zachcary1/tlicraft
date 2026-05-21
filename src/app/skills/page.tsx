"use client";


const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/background.jpg')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

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

const HEX_R = 46;
const hexW = HEX_R * Math.sqrt(3);
const hexH = HEX_R * 2;
const hexCellPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 90);
  return `${hexW / 2 + HEX_R * Math.cos(angle)},${hexH / 2 + HEX_R * Math.sin(angle)}`;
}).join(" ");

function HexCell() {
  return (
    <svg width={hexW} height={hexH} style={{ display: "block", flexShrink: 0 }}>
      <polygon points={hexCellPoints} fill="#1e1e1e" stroke="#3a3a3a" strokeWidth="1" />
    </svg>
  );
}

export default function SkillsPage() {
  return (
    <div className="min-h-screen relative" style={BG_STYLE}>

      {/* Hexagon — exactly centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width={svgW} height={svgH}>
          <polygon
            points={hexPoints}
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="1"
          />
          <polygon
            points={hexPointsInner}
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Left panel — 50px to the left of the hexagon */}
      <div
        className="absolute flex flex-col"
        style={{
          right: `calc(50% + ${svgW / 2}px + 50px)`,
          top: 0,
          width: "129px",
          height: "100vh",
          background: "linear-gradient(to bottom, #1e1d1d 0%, #2b2929 10%, #2b2929 90%, #1e1d1d 100%)",
        }}
      >
        {/* Title */}
        <div
          className="flex items-center px-6"
          style={{ height: "6vh", borderBottom: "2px solid #333333", flexShrink: 0 }}
        >
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>
            Skills
          </span>
        </div>

        {/* Hex columns */}
        <div className="flex flex-col items-center pt-10 gap-2">
          <span className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Active</span>
          {Array.from({ length: 5 }, (_, i) => <HexCell key={i} />)}
          <div style={{ height: 40 }} />
          <span className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Passive</span>
          {Array.from({ length: 4 }, (_, i) => <HexCell key={i} />)}
        </div>

      </div>

      {/* Right panel — 50px to the right of the hexagon */}
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
        {/* Title */}
        <div
          className="flex items-center px-6"
          style={{ height: "6vh", borderBottom: "2px solid #333333", flexShrink: 0 }}
        >
          <span className="text-xl font-semibold tracking-wide" style={{ color: "#e4e4e7" }}>
            Skills
          </span>
        </div>

      </div>

    </div>
  );
}
