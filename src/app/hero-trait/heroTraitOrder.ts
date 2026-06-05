// Canonical slot ordering for each hero variant, keyed by heroGroup → variantName → level → [slot1, slot2]
// Slot 1 = top row (row 0), Slot 2 = bottom row (row 2)
// Source: tlidb.com game display order, with user corrections noted

export const HERO_TRAIT_ORDER: Record<string, Record<string, Record<number, string[]>>> = {
  Rehan: {
    "Anger": {
      1:  ["Anger"],
      45: ["Righteous Fury", "Frenzy Furious"],
      60: ["Tunnel Vision"],
      75: ["Rampaging", "Uncontrolled Anger"],
    },
    "Seething Silhouette": {
      1:  ["Seething Silhouette"],
      45: ["Ritual of Offering", "Fury's Onslaught"],
      60: ["Hysteria", "Growing Anger"],
      75: ["Split Form", "Rage Infusion"],
    },
  },
  Carino: {
    "Ranger of Glory": {
      1:  ["Ranger of Glory"],
      45: ["Ammo Expert"],
      60: ["Landslide", "Crushing Gale Trigger"],
      75: ["Never Stopping", "Well Prepared"],
    },
    "Lethal Flash": {
      1:  ["Lethal Flash"],
      45: ["Evil Ouroboros", "Impending Doom"],
      60: ["Shadow Magazine"],
      75: ["Weightless Step", "Born in the Breeze"],
    },
    "Zealot of War": {
      1:  ["Zealot of War"],
      45: ["Incinerated Glory"],
      60: ["Ceasefire", "Extreme Heat"],
      75: ["Endless Frenzy", "Eternal Flames"],
    },
  },
  Erika: {
    "Wind Stalker": {
      1:  ["Wind Stalker"],
      45: ["Interest", "Have Fun"],
      60: ["Cat's Vision", "Cat's Scratch"],
      75: ["Cat's Punches", "Cat Dive"],
    },
    "Lightning Shadow": {
      1:  ["Lightning Shadow"],
      45: ["Dazzling Lightning", "Electroplated Motif"],
      60: ["Wild Lightning"],
      75: ["Swift as Lightning", "Charging Equation"],
    },
    "Vendetta's Sting": {
      1:  ["Vendetta's Sting"],
      45: ["Twinblade Onslaught"],
      60: ["Leisurely Stroll", "Swift Stalk"],
      75: ["Feline Fury", "Mortal Gambit"],
    },
  },
  Bing: {
    "Blast Nova": {
      1:  ["Blast Nova"],
      45: ["Firepower Coverage", "Dangerous Runaway"],
      60: ["Blast Barrage", "Phantom Delivery"],
      75: ["Radiation Effect", "Frenzy Hound"],
    },
    "Creative Genius": {
      1:  ["Creative Genius"],
      45: ["Inspiration Overflow", "Super Sonic Protocol"],
      60: ["Mind Domain", "Trouble Maker"],
      75: ["Brainstorm", "Flash of Brilliance"],
    },
  },
  Gemma: {
    "Ice-Fire Fusion": {
      1:  ["Ice-Fire Fusion"],
      45: ["Ice-Fire Embrace"],
      60: ["Restless Ice-Fire", "Ice-Fire Radiance"],
      75: ["Bone-piercing Heat", "Ice to Blaze"],
    },
    "Frostbitten Heart": {
      1:  ["Frostbitten Heart"],
      45: ["Deepfreeze"],
      60: ["Glacial Night", "Dance of Frost"],
      75: ["Frigid Infusion", "Blooming Frost Flower"],
    },
    "Flame of Pleasure": {
      1:  ["Flame of Pleasure"],
      45: ["Groaning Echo"],
      60: ["Flames of Desire", "Infernal Damnation"],
      75: ["Banquet of Bliss", "Dress Licker"],
    },
  },
  Iris: {
    "Growing Breeze": {
      1:  ["Growing Breeze"],
      45: ["Socialite"],
      60: ["Gentle Zephyr", "World Within"],
      75: ["Run With the Wind", "Grow With Them"],
    },
    "Vigilant Breeze": {
      1:  ["Vigilant Breeze"],
      45: ["Whirlwind Tango", "Breeze's Whisper"],
      60: ["Happiest Reunion", "Warmest Vigilance"],
      75: ["Merging Stream", "Nurturing Breeze"],
    },
  },
  Moto: {
    "Order Calling": {
      1:  ["Order Calling"],
      45: ["Veteran", "All In"],
      60: ["Overload Program", "Self-Reconstruct"],
      75: ["Charge Forward", "Radiation Field"],
    },
    "Charge Calling": {
      1:  ["Charge Calling"],
      45: ["Unstoppable Wave"],
      60: ["Heroic Sacrifice", "Guerilla Tactics"],
      75: ["Fuel War with War", "Essential Speed"],
    },
  },
  Rosa: {
    "High Court Chariot": {
      1:  ["High Court Chariot"],
      45: ["Unbreakable Stand", "Whirlwind Advance"],
      60: ["Invulnerability", "Divine Intervention"],
      75: ["Desperation", "Improvision"],
    },
    "Unsullied Blade": {
      1:  ["Unsullied Blade"],
      45: ["Baptism of Purity"],
      60: ["Cleanse Filth", "Boundless Sanctuary"],
      75: ["Utmost Devotion", "Born to Cleanse"],
    },
  },
  Selena: {
    "Sing with the Tide": {
      1:  ["Sing with the Tide"],
      45: ["Undersea Ballad", "Wave Aria"],
      60: ["Sea Foam Nocturne", "Idyll of the Tide"],
      75: ["Chantey of Sinking", "Murmurs of the Distant Tide"],
    },
  },
  Thea: {
    "Wisdom of The Gods": {
      1:  ["Wisdom of The Gods"],
      45: ["Divine Prophecy"],
      60: ["Predicted Reincarnation", "Predicted Hope"],
      75: ["Farewell Prophecy", "Predicted Justice"],
    },
    "Incarnation of The Gods": {
      1:  ["Incarnation of the Gods"],
      45: ["Agile Godhood", "Tenacious Divinity"],
      60: ["Might Flow", "Divine Realm Power"],
      75: ["Incarnation", "Divine Spirit"],
    },
    "Blasphemer": {
      1:  ["Blasphemer"],
      45: ["Unholy Baptism"],
      60: ["Disgraced Minister", "Tarnished Sage"],
      75: ["Extreme Desecration", "Onset of Depravity"],  // user-confirmed order
    },
  },
  Youga: {
    "Spacetime Illusion": {
      1:  ["Spacetime Illusion"],
      45: ["Me and Myself"],
      60: ["Make it Quick", "Eeeendless Mana"],
      75: ["I'm an Illusion", "I'm Out of Mana"],
    },
    "Spacetime Elapse": {
      1:  ["Spacetime Elapse"],
      45: ["Spacetime Speed-up", "Spacetime Upheaval"],
      60: ["Spacetime Cutting"],
      75: ["Spacetime Pause", "Spacetime Expansion"],
    },
  },
  Sage: {
    "Licorice Note": {
      1:  ["Licorice Note"],
      45: ["Pungent Stimulant Salt"],
      60: ["Elixir of Immortality", "Scent of Ambition"],
      75: ["Everlasting Nectar", "Licorice Tincture Blend"],
    },
  },
};
