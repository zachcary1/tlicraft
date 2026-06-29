"use client";
import { useState } from "react";

// ─── Background ───────────────────────────────────────────────────────────────

const BG_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.28) 100%)",
    "url('/background/talents.png')",
  ].join(", "),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

interface GodDef {
  key: string;
  name: string;
  folder: string;
  heroes: { name: string; folder: string }[];
  portraitZoom?: number; // CSS scale applied to portrait img to fix transparent-padding icons
}

const GODS: GodDef[] = [
  {
    key: "Might", name: "God of Might", folder: "god of might",
    heroes: [
      { name: "The Brave",    folder: "the brave"    },
      { name: "Onslaughter",  folder: "onslaughter"  },
      { name: "Warlord",      folder: "warlord"      },
      { name: "Warrior",      folder: "warrior"      },
    ],
  },
  {
    key: "Hunting", name: "Goddess of Hunting", folder: "goddess of hunting",
    portraitZoom: 1.5,
    heroes: [
      { name: "Assassin",    folder: "assassin"    },
      { name: "Bladerunner", folder: "bladerunner" },
      { name: "Druid",       folder: "druid"       },
      { name: "Marksman",    folder: "marksman"    },
    ],
  },
  {
    key: "Knowledge", name: "Goddess of Knowledge", folder: "goddess of knowledge",
    heroes: [
      { name: "Arcanist",     folder: "arcanist"     },
      { name: "Elementalist", folder: "elementalist" },
      { name: "Magister",     folder: "magister"     },
      { name: "Prophet",      folder: "prophet"      },
    ],
  },
  {
    key: "War", name: "God of War", folder: "god of war",
    heroes: [
      { name: "Ranger",       folder: "ranger"       },
      { name: "Ronin",        folder: "ronin"        },
      { name: "Sentinel",     folder: "sentinel"     },
      { name: "Shadowdancer", folder: "shadowdancer" },
    ],
  },
  {
    key: "Deception", name: "Goddess of Deception", folder: "goddess of deception",
    portraitZoom: 1.5,
    heroes: [
      { name: "Lich",         folder: "lich"         },
      { name: "Psychic",      folder: "psychic"      },
      { name: "Shadowmaster", folder: "shadowmaster" },
      { name: "Warlock",      folder: "warlock"      },
    ],
  },
  {
    key: "Machines", name: "God of Machines", folder: "god of machines",
    heroes: [
      { name: "Alchemist",     folder: "alchemist"     },
      { name: "Artisan",       folder: "artisan"       },
      { name: "Machinist",     folder: "machinist"     },
      { name: "Steel Vanguard",folder: "steel vanguard"},
    ],
  },
];

// Parent folder portrait: "god of might" → "God_of_might.webp"
function godIconPath(god: GodDef): string {
  const filename = (god.folder[0].toUpperCase() + god.folder.slice(1)).replace(/ /g, "_");
  return `/icons/talents/${god.folder}/${filename}.webp`;
}
// Nested folder tree icon for the god node (used in slot-0 selection nodes)
function godTreeIconPath(god: GodDef): string {
  return `/icons/talents/${god.folder}/${god.folder}/${god.folder}.webp`;
}
function heroIconPath(god: GodDef, heroFolder: string) {
  return `/icons/talents/${god.folder}/${heroFolder}/${heroFolder}.webp`;
}

const GOD_COLORS: Record<string, string> = {
  Might:     "#ac6a28",
  Hunting:   "#568241",
  Knowledge: "#3b4ac5",
  War:       "#ae3738",
  Deception: "#9323bc",
  Machines:  "#6dbccc",
};

// ─── Selection helpers ────────────────────────────────────────────────────────
// Selection string format: "god:Might"  or  "hero:Might:The Brave"

type Sel = string;
type SlotIdx = 0 | 1 | 2 | 3;

const SLOT_LABELS = ["Tree I", "Tree II", "Tree III", "Tree IV"];

function godSel(key: string): Sel { return `god:${key}`; }
function heroSel(godKey: string, heroName: string): Sel { return `hero:${godKey}:${heroName}`; }
function isGodSel(s: Sel) { return s.startsWith("god:"); }
function selGodKey(s: Sel): string {
  return s.startsWith("god:") ? s.slice(4) : s.split(":")[1];
}
function selHeroName(s: Sel): string { return s.split(":").slice(2).join(":"); }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TalentsPage() {
  const [slots, setSlots] = useState<(Sel | null)[]>([null, null, null, null]);
  const [active, setActive] = useState<SlotIdx>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const godKey0 = slots[0] ? selGodKey(slots[0]) : null;
  const god0    = godKey0 ? (GODS.find(g => g.key === godKey0) ?? null) : null;

  // ── Pick a node ────────────────────────────────────────────────────────────
  function pick(sel: Sel) {
    // Prevent placing same tree in two slots
    if (slots.some((s, i) => i !== active && s === sel)) return;

    const next = [...slots];
    next[active] = sel;

    // If changing slot 0, clear slot 1 if it belongs to a different god
    if (active === 0) {
      const newGod = selGodKey(sel);
      if (next[1] && selGodKey(next[1]) !== newGod) next[1] = null;
    }

    setSlots(next);

    // Auto-advance to the next unfilled slot
    const nextEmpty = next.findIndex((v, i) => i > active && v === null);
    if (nextEmpty !== -1) setActive(nextEmpty as SlotIdx);
  }

  // ── Can a node be picked in the current active slot? ──────────────────────
  function canPick(sel: Sel): boolean {
    if (slots.some((s, i) => i !== active && s === sel)) return false;
    if (active === 0) return isGodSel(sel);
    if (active === 1) return !isGodSel(sel) && !!godKey0 && selGodKey(sel) === godKey0;
    return !isGodSel(sel); // slots 2 & 3: any hero tree
  }

  // ── Nodes to render inside a god column ───────────────────────────────────
  interface NodeDef { sel: Sel; name: string; icon: string }

  function getNodes(god: GodDef): NodeDef[] {
    if (active === 0) {
      return [{ sel: godSel(god.key), name: god.name, icon: godTreeIconPath(god) }];
    }
    if (active === 1) {
      if (!god0 || god0.key !== god.key) return []; // only the chosen god's column
      return god.heroes.map(h => ({ sel: heroSel(god.key, h.name), name: h.name, icon: heroIconPath(god, h.folder) }));
    }
    // slots 2 & 3: all 4 hero trees per column (no god node)
    return god.heroes.map(h => ({ sel: heroSel(god.key, h.name), name: h.name, icon: heroIconPath(god, h.folder) }));
  }

  // ── Display info for a filled slot ────────────────────────────────────────
  function slotDisplay(idx: SlotIdx): { icon: string; name: string } | null {
    const s = slots[idx];
    if (!s) return null;
    const god = GODS.find(g => g.key === selGodKey(s));
    if (!god) return null;
    if (isGodSel(s)) return { icon: godTreeIconPath(god), name: god.name };
    const hero = god.heroes.find(h => h.name === selHeroName(s));
    if (!hero) return null;
    return { icon: heroIconPath(god, hero.folder), name: hero.name };
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", position: "relative" }}>

        {/* ── Left: 4 tree slots ──────────────────────────────────────────── */}
        <div style={{
          position: "fixed",
          left: 196,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 20,
        }}>
          {([0, 1, 2, 3] as SlotIdx[]).map(idx => {
            const info     = slotDisplay(idx);
            const isActive = active === idx;

            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {/* Label */}
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: isActive ? "#fbdb58" : "#4a4846",
                  paddingLeft: 2,
                }}>
                  {SLOT_LABELS[idx]}
                </span>

                {/* Slot rectangle — 3:1 ratio (270 × 90) */}
                <div
                  onClick={() => setActive(idx)}
                  style={{
                    width: 270,
                    height: 90,
                    borderRadius: 14,
                    background: isActive
                      ? "linear-gradient(145deg, #2c2916 0%, #211f10 100%)"
                      : "linear-gradient(145deg, #222120 0%, #1b1a19 100%)",
                    border: isActive ? "2px solid #fbdb58" : "2px solid #333130",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    padding: "0 16px",
                    gap: 14,
                    boxShadow: isActive
                      ? "0 0 18px rgba(251,219,88,0.22), inset 0 0 10px rgba(251,219,88,0.04)"
                      : "0 2px 6px rgba(0,0,0,0.4)",
                    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                  }}
                >
                  {info ? (
                    <>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid #444240",
                        background: "#1e1c1c",
                      }}>
                        <img
                          src={info.icon}
                          alt={info.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <span style={{
                        fontSize: 13,
                        color: "#c8c6c6",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {info.name}
                      </span>
                    </>
                  ) : (
                    <span style={{
                      fontSize: 28,
                      color: "#3e3c3a",
                      fontWeight: 200,
                      lineHeight: 1,
                      userSelect: "none",
                      width: "100%",
                      textAlign: "center",
                    }}>
                      +
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Center: 6 god columns ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 90, alignItems: "flex-start" }}>
            {GODS.map(god => {
              const nodes    = getNodes(god);
              const isDimmed = active === 1 && (!god0 || god0.key !== god.key);
              const color    = GOD_COLORS[god.key];

              const BORDER     = 10;
              const IMG_SIZE   = 118;
              const OUTER      = IMG_SIZE + BORDER * 2; // 138
              const SPIKE_L    = 16;
              const W          = OUTER + 2 * SPIKE_L;   // 170
              const H          = OUTER + 2 * SPIKE_L;   // 170
              const outerPath  =
                "M 85,0 L 95,17 A 69,69 0 0,1 154,75 L 170,85 L 154,95" +
                " A 69,69 0 0,1 95,153 L 85,170 L 75,153" +
                " A 69,69 0 0,1 16,95 L 0,85 L 16,75 A 69,69 0 0,1 75,17 Z";
              const innerPath  =
                "M 85,20 L 94,27 A 59,59 0 0,1 143,76 L 150,85 L 143,94" +
                " A 59,59 0 0,1 94,143 L 85,150 L 76,143" +
                " A 59,59 0 0,1 27,94 L 20,85 L 27,76 A 59,59 0 0,1 76,27 Z";

              return (
                <div
                  key={god.key}
                  style={{
                    position: "relative",
                    paddingTop: 85,
                    opacity: isDimmed ? 0.25 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Drop shadow — duplicate of portrait + card, scaled up and darkened */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                    transform: "scale(1.06) translateY(5px)",
                    transformOrigin: "50% 28%",
                  }}>
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: W,
                      height: H,
                      background: "rgba(0,0,0,0.55)",
                      clipPath: `path('${outerPath}')`,
                    }} />
                    <div style={{
                      position: "absolute",
                      top: 85,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 112,
                      height: 580,
                      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 44px), 50% 100%, 0 calc(100% - 44px))",
                      background: "rgba(0,0,0,0.55)",
                    }} />
                  </div>

                  {/* Column card with triangular bottom */}
                  <div style={{
                    position: "relative",
                    zIndex: 1,
                    width: 112,
                    height: 580,
                    clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 44px), 50% 100%, 0 calc(100% - 44px))",
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0.55) 100%), ${color}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 95,
                    paddingBottom: 52,
                    boxSizing: "border-box",
                  }}>
                    {/* God/goddess name — fixed height so all columns' nodes align */}
                    <div style={{
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 6px",
                    }}>
                      <span style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.9)",
                        fontWeight: 700,
                        textAlign: "center",
                        lineHeight: 1.3,
                        textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {god.name}
                      </span>
                    </div>

                    {/* Fixed spacer — same height whether divider was here or not */}
                    <div style={{ height: 16 }} />

                    {/* Tree nodes */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {nodes.map((node, ni) => {
                        const isCurrentSlot = slots[active] === node.sel;
                        const takenByOther  = slots.some((s, i) => i !== active && s === node.sel);
                        const pickable      = canPick(node.sel);

                        let borderColor = "rgba(0,0,0,0.35)";
                        if (isCurrentSlot) borderColor = "#fbdb58";
                        else if (takenByOther) borderColor = "rgba(255,255,255,0.25)";
                        else if (pickable) borderColor = "rgba(255,255,255,0.55)";

                        let nodeOpacity = 1;
                        if (takenByOther) nodeOpacity = 0.4;
                        else if (!pickable && !isCurrentSlot) nodeOpacity = 0.22;

                        return (
                          <div key={ni} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            {ni > 0 && <div style={{ height: 10 }} />}

                            <div
                              onClick={() => pickable && pick(node.sel)}
                              onMouseEnter={() => pickable && setHoveredNode(node.sel)}
                              onMouseLeave={() => setHoveredNode(null)}
                              style={{
                                width: 58,
                                height: 58,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: `2px solid ${hoveredNode === node.sel && pickable ? "rgba(255,255,255,0.9)" : borderColor}`,
                                opacity: nodeOpacity,
                                cursor: pickable ? "pointer" : "default",
                                background: "rgba(0,0,0,0.4)",
                                transition: "transform 0.12s, border-color 0.12s, opacity 0.12s",
                                transform: hoveredNode === node.sel && pickable ? "scale(1.12)" : "scale(1)",
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={node.icon}
                                alt={node.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 10%" }}
                              />
                            </div>

                            <span style={{
                              fontSize: 9,
                              color: pickable ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                              marginTop: 4,
                              marginBottom: 2,
                              textAlign: "center",
                              maxWidth: 104,
                              lineHeight: 1.25,
                              padding: "0 4px",
                              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                            }}>
                              {node.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* God portrait — outer spike shape (border) + inner spike shape (image) */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: W,
                    height: H,
                    background: color,
                    clipPath: `path('${outerPath}')`,
                    zIndex: 2,
                  }}>
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      clipPath: `path('${innerPath}')`,
                      overflow: "hidden",
                    }}>
                      <img
                        src={godIconPath(god)}
                        alt={god.name}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "50% 10%",
                          transformOrigin: "50% 50%",
                          transform: `scale(${god.portraitZoom ?? 1})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
