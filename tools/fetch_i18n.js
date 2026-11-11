// Add Japanese and English names to the two data files, from XIVAPI v2.
//
// Everything in-game is named in a sheet row, so the authoritative JA/EN strings are one lookup
// away: SubmarineExploration.Destination for stops, SubmarineMap.Name for sea charts, and
// Item.Name for parts and drops (parts have no name column of their own — their display name is
// the item you craft). The CN names already in the files stay untouched.
//
// The sheet endpoint caps at 100 rows per response and only accepts comma lists or a single
// start id, so walk it with after=<last row id>.
//
// Usage: node tools/fetch_i18n.js
const fs = require('fs');
const path = require('path');

const LANGS = ['ja', 'en'];
const API = 'https://v2.xivapi.com/api/sheet';
const PAGE = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 400) throw new Error(`HTTP 400 for ${url}`);
    } catch (err) {
      if (i === tries - 1) throw err;
    }
    await sleep(400 * (i + 1));
  }
  return null;
}

// Walk a whole sheet for one language. `fields` is optional for sheets whose names are obvious.
async function wholeSheet(sheet, lang, fields) {
  const out = new Map();
  let after = null;
  for (;;) {
    const qs = [`language=${lang}`];
    if (after !== null) qs.push(`after=${after}`);
    if (fields) qs.push(`fields=${fields}`);
    const body = await getJson(`${API}/${sheet}?${qs.join('&')}`);
    const rows = (body && body.rows) || [];
    if (!rows.length) break;
    for (const row of rows) out.set(row.row_id, row.fields || {});
    const last = rows[rows.length - 1].row_id;
    if (after !== null && last <= after) break;
    after = last;
    if (rows.length < PAGE) break;
    await sleep(120);
  }
  return out;
}

// Fetch a comma list of item ids, resolved through `fields`.
async function itemNames(ids, lang) {
  const out = new Map();
  const uniq = [...new Set(ids)].filter((id) => Number(id) > 0);
  for (let i = 0; i < uniq.length; i += 40) {
    const chunk = uniq.slice(i, i + 40);
    const body = await getJson(`${API}/Item?language=${lang}&fields=Name&rows=${chunk.join(',')}`);
    for (const row of (body && body.rows) || []) out.set(row.row_id, (row.fields || {}).Name || '');
    await sleep(120);
  }
  return out;
}

// JA and CN destination strings carry the letter as a prefix, sometimes full-width ("Ｆ　桔梗海溝
// 中央"); EN instead appends it ("unidentified derelict (J)"). Strip either form and keep the name.
function cleanStopName(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^[A-Za-zＡ-Ｚａ-ｚ][\s　]+/, '');
  s = s.replace(/\s*\([A-Za-z]\)$/, '');
  return s.trim();
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'public', 'data', 'submarine-data.json');
  const lootPath = path.join(__dirname, '..', 'public', 'data', 'submarine-loot.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const loot = JSON.parse(fs.readFileSync(lootPath, 'utf8'));

  const dropIds = [];
  for (const entry of Object.values(loot.sectors)) {
    for (const pool of Object.values(entry.pools || {})) {
      for (const drop of pool) dropIds.push(drop.id);
    }
  }
  const partIds = [];
  for (const list of Object.values(data.parts)) for (const p of list) partIds.push(p.id);

  const names = {};
  for (const lang of LANGS) {
    process.stderr.write(`fetching ${lang}…\n`);
    const stops = await wholeSheet('SubmarineExploration', lang, 'Destination');
    const maps = await wholeSheet('SubmarineMap', lang);
    const partsItems = await itemNames(partIds, lang);
    const dropItems = await itemNames(dropIds, lang);
    names[lang] = { stops, maps, partsItems, dropItems };
  }

  const byRow = (map, id) => {
    const f = map.get(id);
    if (!f) return '';
    return typeof f === 'string' ? f : f.Name || f.Destination || '';
  };

  let missingStops = 0;
  for (const sector of data.sectors) {
    sector.names = sector.names || {};
    sector.names.zh = sector.nameZh || sector.name;
    for (const lang of LANGS) {
      const raw = byRow(names[lang].stops, sector.id);
      const value = cleanStopName(raw);
      if (!value) missingStops += 1;
      sector.names[lang] = value || sector.name;
    }
  }

  for (const start of data.starts) {
    start.names = start.names || {};
    start.names.zh = start.mapName;
    for (const lang of LANGS) {
      start.names[lang] = byRow(names[lang].maps, start.mapId) || start.mapName;
    }
  }

  for (const list of Object.values(data.parts)) {
    for (const part of list) {
      part.names = part.names || {};
      part.names.zh = part.nameZh || part.name;
      for (const lang of LANGS) {
        part.names[lang] = names[lang].partsItems.get(part.id) || part.name;
      }
    }
  }

  let named = 0;
  let unnamed = 0;
  for (const entry of Object.values(loot.sectors)) {
    for (const pool of Object.values(entry.pools || {})) {
      for (const drop of pool) {
        drop.names = drop.names || {};
        drop.names.zh = drop.name;
        for (const lang of LANGS) {
          const value = names[lang].dropItems.get(drop.id) || '';
          drop.names[lang] = value || drop.name;
        }
        if (drop.names.ja !== drop.name && drop.names.en !== drop.name) named += 1;
        else unnamed += 1;
      }
    }
  }

  // Keep each file's existing shape: the reference data is indented, the loot data ships minified
  // so that a re-fetch shows only the fields that changed.
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.writeFileSync(lootPath, `${JSON.stringify(loot)}\n`, 'utf8');
  console.log(`stops missing a JA/EN name: ${missingStops}`);
  console.log(`drops fully named: ${named}, missing one language: ${unnamed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
