"use client";
import { useState } from "react";
import type { TalentTreeData, TalentNodeData } from "../../data/crafted/torchcodex/talent-tree/types";

// ── Grid constants ─────────────────────────────────────────────────────────────

const COLS     = 7;
const ROWS     = 5;
const CELL_W   = 138;
const CELL_H   = 110;
const HEADER_H = 34;

const COL_PTS = [0, 3, 6, 9, 12, 15, 18];

// ── Node sizes ─────────────────────────────────────────────────────────────────

const NODE_R: Record<string, number> = { micro: 20, medium: 28, legendary: 32 };

const BORDER: Record<string, string> = {
  micro:     "rgba(170,145,85,0.55)",
  medium:    "rgba(210,180,95,0.85)",
  legendary: "#d4a820",
};


// ── Grid position helper ───────────────────────────────────────────────────────

function gridPx(col: number, row: number) {
  return {
    x: col * CELL_W + CELL_W / 2,
    y: HEADER_H + row * CELL_H + CELL_H / 2,
  };
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

interface TooltipInfo {
  nodeType:  string;
  rawAffix:  string;
  maxPoints: number;
  px:        number;
  py:        number;
}

function NodeTooltip({ info, W }: { info: TooltipInfo; W: number }) {
  const TOOLTIP_W = 220;
  const lines     = info.rawAffix.split("\n").filter(Boolean);
  const isRight   = info.px < W - TOOLTIP_W - 24;
  const r         = NODE_R[info.nodeType] ?? NODE_R.micro;

  return (
    <div style={{
      position:     "absolute",
      left:         isRight ? info.px + r + 12 : info.px - r - TOOLTIP_W - 12,
      top:          info.py - 18,
      width:        TOOLTIP_W,
      background:   "rgba(10,8,5,0.97)",
      border:       `1px solid ${info.nodeType === "legendary" ? "#d4a820" : "rgba(130,105,55,0.5)"}`,
      borderRadius: 8,
      padding:      "10px 12px",
      pointerEvents:"none",
      zIndex:       50,
      boxShadow:    "0 4px 20px rgba(0,0,0,0.75)",
    }}>
      <div style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color:
          info.nodeType === "legendary" ? "#d4a820" :
          info.nodeType === "medium"    ? "rgba(210,180,95,0.9)" :
          "rgba(155,135,75,0.7)",
        marginBottom:  6,
        display:       "flex",
        alignItems:    "baseline",
        gap:           6,
      }}>
        {info.nodeType}
        {info.maxPoints > 1 && (
          <span style={{ color: "rgba(130,110,65,0.6)", fontSize: 8 }}>
            ({info.maxPoints} pts)
          </span>
        )}
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{
          fontSize:     12,
          color:        "rgba(220,205,165,0.92)",
          lineHeight:   1.45,
          marginBottom: i < lines.length - 1 ? 3 : 0,
        }}>
          {line}
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  tree:       TalentTreeData;
  iconFolder: string;
  godColor:   string;
}

export function TalentTree({ tree, iconFolder, godColor }: Props) {
  const [hovered,     setHovered]     = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null);

  const W = COLS * CELL_W;
  const H = ROWS * CELL_H + HEADER_H;

  function onEnter(node: TalentNodeData) {
    const id  = `${node.position.x},${node.position.y}`;
    const pos = gridPx(node.position.x, node.position.y);
    setHovered(id);
    setTooltipInfo({ nodeType: node.nodeType, rawAffix: node.rawAffix, maxPoints: node.maxPoints, px: pos.x, py: pos.y });
  }

  function onLeave() {
    setHovered(null);
    setTooltipInfo(null);
  }

  return (
    <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>

      {/* ── Column bands + labels ───────────────────────────────────── */}
      {COL_PTS.map((pts, col) => (
        <div key={col} style={{
          position:   "absolute",
          left:       col * CELL_W,
          top:        0,
          width:      CELL_W,
          height:     H,
          borderLeft: col > 0 ? "1px solid rgba(100,80,40,0.15)" : "none",
          background: col % 2 === 0 ? "rgba(0,0,0,0.07)" : "transparent",
          pointerEvents: "none",
        }}>
          <div style={{
            height:         HEADER_H,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderBottom:   "1px solid rgba(100,80,40,0.2)",
          }}>
            <span style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         pts === 0 ? "rgba(215,185,105,0.7)" : "rgba(150,130,75,0.5)",
            }}>
              {pts === 0 ? "Start" : `${pts} pts`}
            </span>
          </div>
        </div>
      ))}

      {/* ── SVG edges ──────────────────────────────────────────────── */}
      <svg width={W} height={H}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
        {tree.nodes.map((node) => {
          if (!node.prerequisite) return null;
          const from   = gridPx(node.prerequisite.x, node.prerequisite.y);
          const to     = gridPx(node.position.x,     node.position.y);
          const nodeId = `${node.position.x},${node.position.y}`;
          const preId  = `${node.prerequisite.x},${node.prerequisite.y}`;
          const lit    = hovered === nodeId || hovered === preId;
          return (
            <line key={nodeId}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={lit ? godColor : "rgba(130,105,50,0.4)"}
              strokeWidth={lit ? 2.5 : 1.5}
            />
          );
        })}
      </svg>

      {/* ── Nodes ──────────────────────────────────────────────────── */}
      {tree.nodes.map((node) => {
        const id      = `${node.position.x},${node.position.y}`;
        const pos     = gridPx(node.position.x, node.position.y);
        const r       = NODE_R[node.nodeType] ?? NODE_R.micro;
        const isH     = hovered === id;
        const isLeg   = node.nodeType === "legendary";
        const bc      = isH ? godColor : (BORDER[node.nodeType] ?? BORDER.micro);

        const iconSrc = node.iconName
          ? `/icons/talents/${iconFolder}/${node.iconName}.webp`
          : null;

        return (
          <div
            key={id}
            onMouseEnter={() => onEnter(node)}
            onMouseLeave={onLeave}
            style={{
              position:       "absolute",
              left:           pos.x - r,
              top:            pos.y - r,
              width:          r * 2,
              height:         r * 2,
              borderRadius:   isLeg ? "6px" : "50%",
              overflow:       "hidden",
              background:     isH
                ? (isLeg ? `${godColor}18` : "rgba(35,28,14,0.95)")
                : "rgba(14,11,6,0.88)",
              border:         `${isLeg ? 2 : 1.5}px solid ${bc}`,
              cursor:         "default",
              transform:      isH ? "scale(1.18)" : "scale(1)",
              transformOrigin:"50% 50%",
              transition:     "transform 0.12s, border-color 0.1s, background 0.1s",
              boxShadow:      isH
                ? `0 0 14px ${godColor}66`
                : isLeg ? `0 0 8px ${godColor}33` : "none",
              zIndex:         isLeg ? 3 : node.nodeType === "medium" ? 2 : 1,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            {iconSrc && (
              <img
                key={iconSrc}
                src={iconSrc}
                alt=""
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                style={{
                  width:        "78%",
                  height:       "78%",
                  objectFit:    "contain",
                  opacity:      isH ? 1 : 0.8,
                  filter:       isH ? "none" : "brightness(0.85)",
                  transition:   "opacity 0.1s, filter 0.1s",
                  pointerEvents:"none",
                  display:      "block",
                }}
              />
            )}
          </div>
        );
      })}

      {/* ── Tooltip ────────────────────────────────────────────────── */}
      {tooltipInfo && <NodeTooltip info={tooltipInfo} W={W} />}
    </div>
  );
}
