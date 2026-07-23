"use client";
import { useEffect, useRef, useState } from "react";
import { TalentTree } from "@/components/TalentTree";
import { TalentTrees } from "../../../data/crafted/torchcodex/talent-tree/talent-trees";
import { useTalentsBuild } from "@/app/state/BuildContext";

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

export interface GodDef {
  key: string;
  name: string;
  folder: string;
  heroes: { name: string; folder: string }[];
  portraitZoom?: number;
}

export const GODS: GodDef[] = [
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
      { name: "Alchemist",      folder: "alchemist"      },
      { name: "Artisan",        folder: "artisan"        },
      { name: "Machinist",      folder: "machinist"      },
      { name: "Steel Vanguard", folder: "steel vanguard" },
    ],
  },
];

function godIconPath(god: GodDef): string {
  const filename = (god.folder[0].toUpperCase() + god.folder.slice(1)).replace(/ /g, "_");
  return `/icons/talents/${god.folder}/${filename}.webp`;
}
function godTreeIconPath(god: GodDef): string {
  return `/icons/talents/${god.folder}/${god.folder}/${god.folder}.webp`;
}
function heroIconPath(god: GodDef, heroFolder: string) {
  return `/icons/talents/${god.folder}/${heroFolder}/${heroFolder}.webp`;
}

export const GOD_COLORS: Record<string, string> = {
  Might:     "#ac6a28",
  Hunting:   "#568241",
  Knowledge: "#3b4ac5",
  War:       "#ae3738",
  Deception: "#9323bc",
  Machines:  "#6dbccc",
};

// ─── Selection helpers ────────────────────────────────────────────────────────

export type Sel = string;
type SlotIdx = 0 | 1 | 2 | 3;

function godSel(key: string): Sel  { return `god:${key}`; }
function heroSel(godKey: string, heroName: string): Sel { return `hero:${godKey}:${heroName}`; }
export function isGodSel(s: Sel)          { return s.startsWith("god:"); }
export function selGodKey(s: Sel): string {
  return s.startsWith("god:") ? s.slice(4) : s.split(":")[1];
}
export function selHeroName(s: Sel): string { return s.split(":").slice(2).join(":"); }

// Human-readable display name for a selection
export function selToTreeName(sel: Sel): string | null {
  if (isGodSel(sel)) {
    const god = GODS.find(g => g.key === selGodKey(sel));
    return god ? god.name : null;
  }
  return selHeroName(sel) || null;
}

// Maps god key to the underscore tree name in TalentTrees
export const GOD_KEY_TO_TREE: Record<string, string> = {
  Might:     "God_of_Might",
  Hunting:   "Goddess_of_Hunting",
  Knowledge: "Goddess_of_Knowledge",
  War:       "God_of_War",
  Deception: "Goddess_of_Deception",
  Machines:  "God_of_Machines",
};

// Maps a sel to the TalentTrees name key
export function selToDataName(sel: Sel): string | null {
  if (isGodSel(sel)) return GOD_KEY_TO_TREE[selGodKey(sel)] ?? null;
  return selHeroName(sel).replace(/ /g, "_") || null;
}

// Maps a sel to the public/icons/talents subfolder for that tree's icons
export function selToIconFolder(sel: Sel): string {
  const god = GODS.find(g => g.key === selGodKey(sel));
  if (!god) return "god of might/god of might";
  if (isGodSel(sel)) return `${god.folder}/${god.folder}`;
  const heroName = selHeroName(sel);
  const hero = god.heroes.find(h => h.name === heroName);
  return hero ? `${god.folder}/${hero.folder}` : `${god.folder}/${god.folder}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface TreeProgress {
  points: Record<string, number>;
  core:   Partial<Record<1 | 2, string>>;
}

const EMPTY_PROGRESS: TreeProgress = { points: {}, core: {} };

export default function TalentsPage() {
  const [talentsBuild, setTalentsBuild] = useTalentsBuild();
  const slots    = talentsBuild.slots;
  const setSlots: React.Dispatch<React.SetStateAction<(Sel | null)[]>> = (v) =>
    setTalentsBuild(prev => ({ ...prev, slots: typeof v === "function" ? (v as (p: (Sel | null)[]) => (Sel | null)[])(prev.slots) : v }));
  const progress = talentsBuild.progress;
  const setProgress: React.Dispatch<React.SetStateAction<Record<string, TreeProgress>>> = (v) =>
    setTalentsBuild(prev => ({ ...prev, progress: typeof v === "function" ? (v as (p: Record<string, TreeProgress>) => Record<string, TreeProgress>)(prev.progress) : v }));

  const [active,       setActive]       = useState<SlotIdx>(0);
  const [hoveredNode,  setHoveredNode]  = useState<string | null>(null);
  const [viewedTree,   setViewedTree]   = useState<Sel | null>(null);

  // Jump straight into slot 0's tree on page entry if one's already picked, instead of
  // landing on the selection grid. Runs once — guarded so it doesn't refire (and hijack
  // the view) every time `slots` changes afterward, e.g. when the user reselects a tree.
  // Waits for a non-null slots[0] because on a hard refresh the build is still hydrating
  // from localStorage on the very first render.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || !slots[0]) return;
    bootstrapped.current = true;
    setViewedTree(slots[0]);
  }, [slots]);

  function getProgress(name: string): TreeProgress {
    return progress[name] ?? EMPTY_PROGRESS;
  }

  function updateProgress(name: string, updater: (p: TreeProgress) => TreeProgress) {
    setProgress(prev => ({ ...prev, [name]: updater(prev[name] ?? EMPTY_PROGRESS) }));
  }

  function handleAllocate(name: string, nodeId: string, delta: 1 | -1, maxPoints: number) {
    updateProgress(name, p => {
      // Clamp against the freshest state here (not the click handler's guard) so a burst of
      // rapid clicks landing in the same React batch can never push a node past its bounds.
      const next = Math.max(0, Math.min(maxPoints, (p.points[nodeId] ?? 0) + delta));
      const points = { ...p.points };
      if (next <= 0) delete points[nodeId]; else points[nodeId] = next;
      return { ...p, points };
    });
  }

  function handleSelectCore(name: string, tier: 1 | 2, iconName: string | null) {
    updateProgress(name, p => {
      const core = { ...p.core };
      if (iconName === null) delete core[tier]; else core[tier] = iconName;
      return { ...p, core };
    });
  }

  function handleResetTree(name: string) {
    setProgress(prev => ({ ...prev, [name]: EMPTY_PROGRESS }));
  }

  const godKey0 = slots[0] ? selGodKey(slots[0]) : null;
  const god0    = godKey0 ? (GODS.find(g => g.key === godKey0) ?? null) : null;

  // ── Pick a node ─────────────────────────────────────────────────────────────
  function pick(sel: Sel) {
    if (slots.some((s, i) => i !== active && s === sel)) return;

    const next = [...slots];
    next[active] = sel;

    if (active === 0) {
      const newGod = selGodKey(sel);
      if (next[1] && selGodKey(next[1]) !== newGod) next[1] = null;
    }

    setSlots(next);
    setViewedTree(sel); // show the talent tree for this selection instead of auto-advancing
  }

  // ── Activate a slot (click): filled → view tree; empty → selection ───────────
  function activateSlot(idx: SlotIdx) {
    setActive(idx);
    setViewedTree(slots[idx] ?? null);
  }

  // ── Reselect: clear this slot's tree entirely and drop back to selection mode ──
  function selectSlot(idx: SlotIdx) {
    setActive(idx);
    setViewedTree(null);
    setSlots(prev => {
      const next = [...prev];
      next[idx] = null;
      // Clearing the god slot orphans any hero already picked for it.
      if (idx === 0 && next[1]) next[1] = null;
      return next;
    });
  }

  // ── Can a node be picked in the current active slot? ────────────────────────
  function canPick(sel: Sel): boolean {
    if (slots.some((s, i) => i !== active && s === sel)) return false;
    if (active === 0) return isGodSel(sel);
    if (active === 1) return !isGodSel(sel) && !!godKey0 && selGodKey(sel) === godKey0;
    return !isGodSel(sel);
  }

  // ── Nodes to render inside a god column ─────────────────────────────────────
  interface NodeDef { sel: Sel; name: string; icon: string }

  function getNodes(god: GodDef): NodeDef[] {
    if (active === 0) {
      return [{ sel: godSel(god.key), name: god.name, icon: godTreeIconPath(god) }];
    }
    if (active === 1) {
      if (!god0 || god0.key !== god.key) return [];
      return god.heroes.map(h => ({ sel: heroSel(god.key, h.name), name: h.name, icon: heroIconPath(god, h.folder) }));
    }
    return god.heroes.map(h => ({ sel: heroSel(god.key, h.name), name: h.name, icon: heroIconPath(god, h.folder) }));
  }

  // ── Display info for a filled slot ──────────────────────────────────────────
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

  // ── Resolve the tree to display ─────────────────────────────────────────────
  const treeName    = viewedTree ? selToTreeName(viewedTree) : null;
  const dataName    = viewedTree ? selToDataName(viewedTree) : null;
  const treeDef     = dataName ? (TalentTrees.find(t => t.name === dataName) ?? null) : null;
  const iconFolder  = viewedTree ? selToIconFolder(viewedTree) : "";
  const treeGodKey  = viewedTree ? selGodKey(viewedTree) : null;
  const treeColor   = treeGodKey ? (GOD_COLORS[treeGodKey] ?? "#888") : "#888";

  // ─── Render ──────────────────────────────────────────────────────────────────
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
            const info        = slotDisplay(idx);
            const isActive    = active === idx && !viewedTree;
            const isViewing   = viewedTree !== null && viewedTree === slots[idx];
            const slotGodKey  = slots[idx] ? selGodKey(slots[idx]!) : null;
            const slotColor   = slotGodKey ? (GOD_COLORS[slotGodKey] ?? "#888") : "#888";

            // The gradient tint only appears once a tree has actually been picked for this
            // slot; the outline stays gray except on whichever slot is currently focused.
            const isFocused   = active === idx;
            const bg          = info ? `linear-gradient(145deg, ${slotColor}55 0%, #1b1a19 65%)`
                                      : "linear-gradient(145deg, #2a2827 0%, #1b1a19 100%)";
            const border      = isFocused ? "2px solid #ffffff" : "2px solid #4a4846";
            const shadow      = isViewing  ? `0 0 20px ${slotColor}44, inset 0 0 10px ${slotColor}08`
                              : isActive   ? "0 0 18px rgba(251,219,88,0.22), inset 0 0 10px rgba(251,219,88,0.04)"
                              :              "0 2px 6px rgba(0,0,0,0.4)";

            return (
              <div
                key={idx}
                onClick={() => activateSlot(idx)}
                style={{
                  position: "relative",
                  width: 270, height: 78, borderRadius: 14,
                  background: bg, border, cursor: "pointer",
                  display: "flex", flexDirection: "row", alignItems: "center",
                  padding: "0 16px", gap: 14,
                  boxShadow: shadow,
                  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                }}
              >
                {info ? (
                  <>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      overflow: "hidden", flexShrink: 0,
                      border: `1px solid ${isViewing ? slotColor + "66" : "#444240"}`,
                      background: "#1e1c1c",
                      transition: "border-color 0.15s",
                    }}>
                      <img src={info.icon} alt={info.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <span style={{
                      fontSize: 13, color: "#c8c6c6", fontWeight: 600, lineHeight: 1.3,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      flex: 1,
                    }}>
                      {info.name}
                    </span>
                  </>
                ) : (
                  <span style={{
                    fontSize: 28, color: "#3e3c3a", fontWeight: 200, lineHeight: 1,
                    userSelect: "none", width: "100%", textAlign: "center",
                  }}>
                    +
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Center: talent tree OR selection grid ───────────────────────── */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>

          {viewedTree && treeDef ? (
            /* ── TREE VIEW ─────────────────────────────────────────────── */
            <TalentTree
              tree={treeDef}
              iconFolder={iconFolder}
              godColor={treeColor}
              allocated={dataName ? getProgress(dataName).points : {}}
              coreSelected={dataName ? getProgress(dataName).core : {}}
              onAllocate={(nodeId, delta) => {
                if (!dataName) return;
                const node = treeDef.nodes.find(n => `${n.position.x},${n.position.y}` === nodeId);
                if (node) handleAllocate(dataName, nodeId, delta, node.maxPoints);
              }}
              onSelectCore={(tier, iconName) => dataName && handleSelectCore(dataName, tier, iconName)}
              onReselect={() => selectSlot(active)}
              onReset={() => dataName && handleResetTree(dataName)}
            />

          ) : viewedTree && !treeDef ? (
            /* ── TREE COMING SOON ──────────────────────────────────────── */
            <div style={{ textAlign: "center", color: "rgba(180,160,120,0.55)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{treeName}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em" }}>Tree layout coming soon</div>
            </div>

          ) : (
            /* ── SELECTION GRID ────────────────────────────────────────── */
            <div style={{ display: "flex", gap: 90, alignItems: "flex-start" }}>
              {GODS.map(god => {
                const nodes    = getNodes(god);
                const isDimmed = active === 1 && (!god0 || god0.key !== god.key);
                const color    = GOD_COLORS[god.key];

                const BORDER    = 10;
                const IMG_SIZE  = 118;
                const OUTER     = IMG_SIZE + BORDER * 2;
                const SPIKE_L   = 16;
                const W         = OUTER + 2 * SPIKE_L;
                const H         = OUTER + 2 * SPIKE_L;
                const outerPath =
                  "M 85,0 L 95,17 A 69,69 0 0,1 154,75 L 170,85 L 154,95" +
                  " A 69,69 0 0,1 95,153 L 85,170 L 75,153" +
                  " A 69,69 0 0,1 16,95 L 0,85 L 16,75 A 69,69 0 0,1 75,17 Z";
                const innerPath =
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
                    {/* Drop shadow */}
                    <div style={{
                      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
                      transform: "scale(1.06) translateY(5px)", transformOrigin: "50% 28%",
                    }}>
                      <div style={{
                        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                        width: W, height: H, background: "rgba(0,0,0,0.55)",
                        clipPath: `path('${outerPath}')`,
                      }} />
                      <div style={{
                        position: "absolute", top: 85, left: "50%", transform: "translateX(-50%)",
                        width: 112, height: 580,
                        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 44px), 50% 100%, 0 calc(100% - 44px))",
                        background: "rgba(0,0,0,0.55)",
                      }} />
                    </div>

                    {/* Column card */}
                    <div style={{
                      position: "relative", zIndex: 1, width: 112, height: 580,
                      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 44px), 50% 100%, 0 calc(100% - 44px))",
                      background: `linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0.55) 100%), ${color}`,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      paddingTop: 95, paddingBottom: 52, boxSizing: "border-box",
                    }}>
                      <div style={{
                        height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 6px",
                      }}>
                        <span style={{
                          fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: 700,
                          textAlign: "center", lineHeight: 1.3,
                          textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                          {god.name}
                        </span>
                      </div>

                      <div style={{ height: 16 }} />

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
                                  width: 58, height: 58, borderRadius: "50%", overflow: "hidden",
                                  border: `2px solid ${hoveredNode === node.sel && pickable ? "rgba(255,255,255,0.9)" : borderColor}`,
                                  opacity: nodeOpacity,
                                  cursor: pickable ? "pointer" : "default",
                                  background: "rgba(0,0,0,0.4)",
                                  transition: "transform 0.12s, border-color 0.12s, opacity 0.12s",
                                  transform: hoveredNode === node.sel && pickable ? "scale(1.12)" : "scale(1)",
                                  flexShrink: 0,
                                }}
                              >
                                <img src={node.icon} alt={node.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 10%" }} />
                              </div>
                              <span style={{
                                fontSize: 9, color: pickable ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                                marginTop: 4, marginBottom: 2, textAlign: "center", maxWidth: 104,
                                lineHeight: 1.25, padding: "0 4px", textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                              }}>
                                {node.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* God portrait */}
                    <div style={{
                      position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                      width: W, height: H, background: color,
                      clipPath: `path('${outerPath}')`, zIndex: 2,
                    }}>
                      <div style={{ position: "absolute", inset: 0, clipPath: `path('${innerPath}')`, overflow: "hidden" }}>
                        <img
                          src={godIconPath(god)}
                          alt={god.name}
                          style={{
                            position: "absolute", inset: 0, width: "100%", height: "100%",
                            objectFit: "cover", objectPosition: "50% 10%",
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
          )}
        </div>
      </div>
    </div>
  );
}
