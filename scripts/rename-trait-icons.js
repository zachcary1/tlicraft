const fs   = require("fs");
const path = require("path");

const ORDER = {
  Rehan: {
    "Anger":               { 1: ["Anger"], 45: ["Righteous Fury","Frenzy Furious"], 60: ["Tunnel Vision"], 75: ["Rampaging","Uncontrolled Anger"] },
    "Seething Silhouette": { 1: ["Seething Silhouette"], 45: ["Ritual of Offering","Fury's Onslaught"], 60: ["Hysteria","Growing Anger"], 75: ["Split Form","Rage Infusion"] },
  },
  Carino: {
    "Ranger of Glory": { 1: ["Ranger of Glory"], 45: ["Ammo Expert"], 60: ["Landslide","Crushing Gale Trigger"], 75: ["Never Stopping","Well Prepared"] },
    "Lethal Flash":    { 1: ["Lethal Flash"], 45: ["Dart Shot","Shadow Magazine"], 60: ["Evil Ouroboros","Lethal Interval"], 75: ["Desperate Measure","Malice Charge"] },
    "Zealot of War":   { 1: ["Zealot of War"], 45: ["Incinerated Glory"], 60: ["Ceasefire","Extreme Heat"], 75: ["Endless Frenzy","Eternal Flames"] },
  },
  Erika: {
    "Wind Stalker":      { 1: ["Wind Stalker"], 45: ["Interest","Have Fun"], 60: ["Cat's Vision","Cat's Scratch"], 75: ["Cat's Punches","Cat Dive"] },
    "Lightning Shadow":  { 1: ["Lightning Shadow"], 45: ["Dazzling Lightning","Electroplated Motif"], 60: ["Wild Lightning"], 75: ["Swift as Lightning","Charging Equation"] },
    "Vendetta's Sting":  { 1: ["Vendetta's Sting"], 45: ["Twinblade Onslaught"], 60: ["Leisurely Stroll","Swift Stalk"], 75: ["Feline Fury","Mortal Gambit"] },
  },
  Bing: {
    "Blast Nova":      { 1: ["Blast Nova"], 45: ["Firepower Coverage","Dangerous Runaway"], 60: ["Blast Barrage","Phantom Delivery"], 75: ["Radiation Effect","Frenzy Hound"] },
    "Creative Genius": { 1: ["Creative Genius"], 45: ["Inspiration Overflow","Super Sonic Protocol"], 60: ["Mind Domain","Trouble Maker"], 75: ["Brainstorm","Flash of Brilliance"] },
  },
  Gemma: {
    "Ice-Fire Fusion":   { 1: ["Ice-Fire Fusion"], 45: ["Ice-Fire Embrace"], 60: ["Restless Ice-Fire","Ice-Fire Radiance"], 75: ["Bone-piercing Heat","Ice to Blaze"] },
    "Frostbitten Heart": { 1: ["Frostbitten Heart"], 45: ["Deepfreeze"], 60: ["Glacial Night","Dance of Frost"], 75: ["Frigid Infusion","Blooming Frost Flower"] },
    "Flame of Pleasure": { 1: ["Flame of Pleasure"], 45: ["Groaning Echo"], 60: ["Flames of Desire","Infernal Damnation"], 75: ["Banquet of Bliss","Dress Licker"] },
  },
  Iris: {
    "Growing Breeze":  { 1: ["Growing Breeze"], 45: ["Embrace the World","Struggle Free"], 60: ["Socialite","Amazing Friends"], 75: ["Run With the Wind","Grow With It"] },
    "Vigilant Breeze": { 1: ["Vigilant Breeze"], 45: ["Whirlwind Tango","Breeze's Whisper"], 60: ["Happiest Reunion","Warmest Vigilance"], 75: ["Merging Stream","Nurturing Breeze"] },
  },
  Moto: {
    "Order Calling": { 1: ["Order Calling"], 45: ["Veteran","All In"], 60: ["Last Stand","Tough as Nails"], 75: ["Charge Forward","Go for Broke"] },
    "Charge Calling":{ 1: ["Charge Calling"], 45: ["Unstoppable Wave"], 60: ["Heroic Sacrifice","Guerilla Tactics"], 75: ["Fuel War with War","Essential Speed"] },
  },
  Rosa: {
    "High Court Chariot": { 1: ["High Court Chariot"], 45: ["Unbreakable Stand","Whirlwind Advance"], 60: ["Invulnerability","Divine Intervention"], 75: ["Desperation","Improvision"] },
    "Unsullied Blade":    { 1: ["Unsullied Blade"], 45: ["Baptism of Purity"], 60: ["Cleanse Filth","Boundless Sanctuary"], 75: ["Utmost Devotion","Born to Cleanse"] },
  },
  Selena: {
    "Sing with the Tide": { 1: ["Sing with the Tide"], 45: ["Undersea Ballad","Wave Aria"], 60: ["Sea Foam Nocturne","Idyll of the Tide"], 75: ["Chantey of Sinking","Murmurs of the Distant Tide"] },
  },
  Thea: {
    "Wisdom of The Gods":      { 1: ["Wisdom of The Gods"], 45: ["Finale Prophecy","Predicted Harvest"], 60: ["Predicted Reincarnation","Predicted Hope"], 75: ["Farewell Prophecy","Predicted Justice"] },
    "Incarnation of The Gods": { 1: ["Incarnation of the Gods"], 45: ["Divinity"], 60: ["Might Flow","Divine Realm Power"], 75: ["Incarnation","Divine Spirit"] },
    "Blasphemer":              { 1: ["Blasphemer"], 45: ["Unholy Baptism"], 60: ["Disgraced Minister","Tarnished Sage"], 75: ["Extreme Desecration","Onset of Depravity"] },
  },
  Youga: {
    "Spacetime Illusion": { 1: ["Spacetime Illusion"], 45: ["Me and Myself"], 60: ["Make it Quick","Eeeendless Mana"], 75: ["I'm an Illusion","I'm Out of Mana"] },
    "Spacetime Elapse":   { 1: ["Spacetime Elapse"], 45: ["Spacetime Speed-up","Spacetime Upheaval"], 60: ["Spacetime Cutting"], 75: ["Spacetime Pause","Spacetime Expansion"] },
  },
  Sage: {
    "Licorice Note": { 1: ["Licorice Note"], 45: ["Pungent Stimulant Salt"], 60: ["Elixir of Immortality","Scent of Ambition"], 75: ["Everlasting Nectar","Licorice Tincture Blend"] },
  },
};

const base = path.join(__dirname, "..", "public", "heroes");
let ok = 0, skip = 0, missing = 0;

for (const [group, variants] of Object.entries(ORDER)) {
  for (const [variant, levels] of Object.entries(variants)) {
    const dir = path.join(base, group, "traits", variant);
    for (const [levelStr, names] of Object.entries(levels)) {
      const level = parseInt(levelStr);
      names.forEach((name, idx) => {
        const slot    = idx + 1;
        const newName = `${level}-${slot} ${name}.webp`;
        const oldFile = path.join(dir, `${name}.webp`);
        const newFile = path.join(dir, newName);
        if (fs.existsSync(newFile))  { skip++;    return; }
        if (!fs.existsSync(oldFile)) { console.log(`MISSING  ${group}/${variant}/${name}.webp`); missing++; return; }
        fs.renameSync(oldFile, newFile);
        console.log(`OK  ${group}/${variant}/${newName}`);
        ok++;
      });
    }
  }
}
console.log(`\nRenamed: ${ok}  Already prefixed: ${skip}  Missing: ${missing}`);
