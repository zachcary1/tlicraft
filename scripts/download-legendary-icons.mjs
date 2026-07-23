// Downloads the icon for every legendary item in data/crafted/torchcodex/legendary.json
// from the tlidb.com wiki (same source/CDN as download-pactspirit-icons.mjs and
// download-node-icons.ps1), storing them under public/icons/legendary/<category>/<name>.webp.
//
// The wiki's Legendary_Gear page renders every item's icon directly in its static HTML as
//   <a href="<slug>"><img src="https://cdn.tlidb.com/.../EquipCommon/.../Icon_..._112.webp" ...>
// where <slug> is the item name with apostrophes stripped and spaces replaced by underscores —
// verified to match all 331 current legendary.json entries with zero misses before writing this.

import https from "https";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "icons", "legendary");
const WIKI_URL = "https://tlidb.com/en/Legendary_Gear";
const HEADERS = { "User-Agent": "Mozilla/5.0", Referer: "https://tlidb.com/" };

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} fetching ${url}`)); return; }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve("skip"); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve("ok"); });
    }).on("error", (err) => { fs.existsSync(dest) && fs.unlinkSync(dest); reject(err); });
  });
}

function decodeEntities(s) {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractName(nameHtml) {
  const m = /<span class="name">([^<]*)<\/span>/.exec(nameHtml ?? "");
  return m ? decodeEntities(m[1]) : null;
}

function slugify(name) {
  return name.replace(/'/g, "").replace(/\s+/g, "_");
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

async function main() {
  const html = await fetchText(WIKI_URL);
  const iconRe = /<a href="([^"]+)"><img src="(https:\/\/cdn\.tlidb\.com[^"]+EquipCommon[^"]+)"/g;
  const hrefToUrl = new Map();
  let m;
  while ((m = iconRe.exec(html))) hrefToUrl.set(m[1], m[2]);

  const legendaryPath = path.join(ROOT, "data", "crafted", "torchcodex", "legendary.json");
  const rows = JSON.parse(fs.readFileSync(legendaryPath, "utf8"));

  const items = new Map(); // name -> category
  for (const row of rows) {
    const name = extractName(row.name);
    if (name && !items.has(name)) items.set(name, row.category ?? "Misc");
  }

  let ok = 0, skipped = 0, failed = 0;
  const missing = [];
  for (const [name, category] of items) {
    const slug = slugify(name);
    const url = hrefToUrl.get(slug);
    if (!url) { missing.push(name); continue; }
    const dest = path.join(OUT_DIR, sanitizeFilename(category), `${sanitizeFilename(name)}.webp`);
    try {
      const result = await download(url, dest);
      if (result === "skip") { skipped++; process.stdout.write("s"); }
      else { ok++; process.stdout.write("."); }
    } catch (e) {
      failed++;
      console.error(`\nFAIL [${name}]: ${e.message}`);
    }
  }

  console.log(`\nDone — ${ok} downloaded, ${skipped} skipped, ${failed} failed, ${missing.length} not found on wiki.`);
  if (missing.length) console.log("Missing:", missing);
}

main().catch((err) => { console.error(err); process.exit(1); });
