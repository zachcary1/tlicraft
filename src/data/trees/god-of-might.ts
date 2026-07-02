import type { TalentTreeDef } from "./types";

// Layout approximated from https://tlidb.com/en/God_of_Might#ProfessionTree
// Canvas: 900 × 620 px
// Two arcs of 3 core keystones each, connected by a center web of medium/micro nodes.

export const godOfMightTree: TalentTreeDef = {
  tree: "God of Might",
  iconFolder: "god of might/god of might",
  width: 900,
  height: 620,
  nodes: [
    // ── Core tier 1 (top arc) ──────────────────────────────────────
    { id: "elimination",    x: 175, y: 170, type: "Core", name: "Elimination",    icon: "core1_elimination"    },
    { id: "momentum",       x: 450, y:  90, type: "Core", name: "Momentum",       icon: "core1_momentum"       },
    { id: "tenacity",       x: 725, y: 170, type: "Core", name: "Tenacity",       icon: "core1_tenacity"       },

    // ── Core tier 2 (bottom arc) ──────────────────────────────────
    { id: "great_strength", x: 175, y: 450, type: "Core", name: "Great Strength", icon: "core2_great_strength" },
    { id: "hidden_mastery", x: 450, y: 530, type: "Core", name: "Hidden Mastery", icon: "core2_hidden_mastery" },
    { id: "judgment",       x: 725, y: 450, type: "Core", name: "Judgment",       icon: "core2_judgment"       },

    // ── Legendary Medium (4) ──────────────────────────────────────
    { id: "lm_tl", x: 290, y: 250, type: "LegendaryMedium", icon: "talent_dmgall"  },
    { id: "lm_tr", x: 610, y: 250, type: "LegendaryMedium", icon: "talent_atk"     },
    { id: "lm_bl", x: 290, y: 370, type: "LegendaryMedium", icon: "talent_armor"   },
    { id: "lm_br", x: 610, y: 370, type: "LegendaryMedium", icon: "talent_flask"   },

    // ── Medium (10) ───────────────────────────────────────────────
    { id: "m_atk",     x: 305, y: 112, type: "Medium", icon: "talent_atk"      }, // +6% Atk Spd, -4 Cost
    { id: "m_crit",    x: 595, y: 112, type: "Medium", icon: "talent_dmgele"   }, // +20% Crit Rating
    { id: "m_left",    x:  70, y: 310, type: "Medium", icon: "talent_dmgall"   }, // +18% damage
    { id: "m_right",   x: 830, y: 310, type: "Medium", icon: "talent_armor"    }, // +10% Armor, +4% Life
    { id: "m_il",      x: 178, y: 310, type: "Medium", icon: "talent_dmgextra" }, // +18% Atk Dmg +4% Move
    { id: "m_ir",      x: 722, y: 310, type: "Medium", icon: "talent_atk"      }, // +18% Atk Dmg
    { id: "m_ct",      x: 450, y: 232, type: "Medium", icon: "talent_dagger"   }, // +12% Skill Area
    { id: "m_cb",      x: 450, y: 388, type: "Medium", icon: "talent_dmgall"   }, // +18% damage
    { id: "m_lower_l", x: 305, y: 510, type: "Medium", icon: "talent_armor"    }, // +4% Life, 2.5% Regain
    { id: "m_flask",   x: 595, y: 510, type: "Medium", icon: "talent_flask"    }, // +10% Warcry CDR

    // ── Micro (12) ────────────────────────────────────────────────
    { id: "mc1",  x: 242, y: 118, type: "Micro", icon: "talent_dmgall"   }, // +9% dmg
    { id: "mc2",  x: 378, y:  90, type: "Micro", icon: "talent_atk"      }, // +3% Atk Spd
    { id: "mc3",  x: 522, y:  90, type: "Micro", icon: "talent_dmgextra" }, // +9% Atk Dmg
    { id: "mc4",  x: 658, y: 118, type: "Micro", icon: "talent_armor"    }, // +5% Armor, +2% Life
    { id: "mc5",  x: 113, y: 220, type: "Micro", icon: "talent_dmgall"   }, // +9% dmg
    { id: "mc6",  x: 113, y: 400, type: "Micro", icon: "talent_dmgextra" }, // +9% Atk Dmg, +2% Move
    { id: "mc7",  x: 787, y: 220, type: "Micro", icon: "talent_armor"    }, // +2% Life, 1.25% Regain
    { id: "mc8",  x: 787, y: 400, type: "Micro", icon: "talent_dmgele"   }, // +10% Crit Rating
    { id: "mc9",  x: 242, y: 500, type: "Micro", icon: "talent_dmgall"   }, // +9% Atk Dmg
    { id: "mc10", x: 378, y: 522, type: "Micro", icon: "talent_dmgextra" }, // +10% Tenacity Duration
    { id: "mc11", x: 522, y: 522, type: "Micro", icon: "talent_armor"    }, // +2% Life, 1.25% Regain
    { id: "mc12", x: 658, y: 500, type: "Micro", icon: "talent_dagger"   }, // +9% Atk Dmg
  ],

  edges: [
    // ── Top arc: Elimination → Momentum → Tenacity ────────────────
    ["elimination", "mc1"], ["mc1", "m_atk"],   ["m_atk",   "mc2"],  ["mc2", "momentum"],
    ["momentum",    "mc3"], ["mc3", "m_crit"],   ["m_crit",  "mc4"],  ["mc4", "tenacity"],

    // ── Left column: Elimination → Great Strength ─────────────────
    ["elimination",    "mc5"], ["mc5", "m_left"],    ["m_left",    "mc6"], ["mc6", "great_strength"],

    // ── Right column: Tenacity → Judgment ─────────────────────────
    ["tenacity",       "mc7"], ["mc7", "m_right"],   ["m_right",   "mc8"], ["mc8", "judgment"],

    // ── Bottom arc: Great Strength → Hidden Mastery → Judgment ────
    ["great_strength", "mc9"],  ["mc9",  "m_lower_l"], ["m_lower_l", "mc10"], ["mc10", "hidden_mastery"],
    ["hidden_mastery", "mc11"], ["mc11", "m_flask"],   ["m_flask",   "mc12"], ["mc12", "judgment"],

    // ── Center inner web ──────────────────────────────────────────
    ["elimination",    "m_il"],
    ["m_il",           "lm_tl"],  ["lm_tl", "m_ct"],  ["m_ct",  "lm_tr"],  ["lm_tr", "m_ir"],
    ["m_ir",           "tenacity"],
    ["m_il",           "lm_bl"],  ["lm_bl", "m_cb"],  ["m_cb",  "lm_br"],  ["lm_br", "m_ir"],
    ["great_strength", "lm_bl"],
    ["judgment",       "lm_br"],
    ["momentum",       "m_ct"],
    ["hidden_mastery", "m_cb"],
  ],
};
