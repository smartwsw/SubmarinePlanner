'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4173;

const args = process.argv.slice(2);
const configFlag = args.indexOf('--config');
const explicitConfig = configFlag >= 0 ? args[configFlag + 1] : null;

function configCandidates() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const list = [];
  if (explicitConfig) list.push(path.resolve(explicitConfig));
  for (const launcher of ['XIVLauncherCN', 'XIVLauncher']) {
    list.push(path.join(appData, launcher, 'pluginConfigs', 'AutoRetainer', 'DefaultConfig.json'));
  }
  list.push(path.join(os.homedir(), '.xlcore', 'pluginConfigs', 'AutoRetainer', 'DefaultConfig.json'));
  return [...new Set(list)];
}

function findConfig() {
  for (const p of configCandidates()) {
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch (_) {
      /* not present */
    }
  }
  return null;
}

// AutoRetainer stores Points as byte[5]: the sector row ids of the route currently
// deployed (padded with zeros). It is not a bitmask of unlocked sectors.
function readCurrentPoints(base64) {
  try {
    const buf = Buffer.from(String(base64 || ''), 'base64');
    const ids = [];
    for (const b of buf) {
      if (b !== 0) ids.push(b);
    }
    return ids;
  } catch (_) {
    return [];
  }
}

function loadSectorIndex() {
  try {
    const file = path.join(PUBLIC_DIR, 'data', 'submarine-data.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return new Map((data.sectors || []).map((s) => [s.id, s]));
  } catch (_) {
    return new Map();
  }
}

function parseConfig(raw, sourcePath) {
  const characters = Array.isArray(raw.OfflineData) ? raw.OfflineData : [];
  const vessels = [];
  const fcData = raw.FCData || {};
  const sectorIndex = loadSectorIndex();

  // FCID exceeds Number.MAX_SAFE_INTEGER, so JSON.parse rounds it. FCData keys stay
  // exact strings; compare numerically to recover the matching entry and exact id.
  function fcEntry(fcId) {
    const want = Number(fcId);
    for (const key of Object.keys(fcData)) {
      if (Number(key) === want) return { key, data: fcData[key] || {} };
    }
    return { key: String(fcId), data: {} };
  }

  for (const ch of characters) {
    const boatData = ch.AdditionalSubmarineData || {};
    const returnTimes = new Map(
      (ch.OfflineSubmarineData || []).map((s) => [s.Name, s.ReturnTime || 0])
    );
    // OfflineSubmarineData is the workshop's slot list, so its index is the slot number.
    const slotOf = new Map((ch.OfflineSubmarineData || []).map((s, i) => [s.Name, i]));
    for (const [name, d] of Object.entries(boatData)) {
      const currentPoints = readCurrentPoints(d.Points);
      vessels.push({
        name,
        slot: slotOf.has(name) ? slotOf.get(name) : vessels.length,
        owner: ch.Name || '',
        world: ch.World || '',
        level: Number(d.Level) || 0,
        exp: Number(d.CurrentExp) || 0,
        expToNext: Number(d.NextLevelExp) || 0,
        parts: [d.Part1, d.Part2, d.Part3, d.Part4].map((n) => Number(n) || 0),
        returnAt: returnTimes.get(name) || 0,
        currentPoints,
        route: currentPoints.map((id) => {
          const s = sectorIndex.get(id);
          return s ? { id, name: s.name, mapName: s.mapName } : { id, name: `#${id}`, mapName: '' };
        }),
        unlockMode: Number(d.UnlockMode) || 0,
        fcId: fcEntry(ch.FCID).key,
      });
    }
  }

  const charactersOut = characters.map((ch) => {
    const { key: fcId, data: fc } = fcEntry(ch.FCID);
    return {
      name: ch.Name || '',
      world: ch.World || '',
      fcId,
      fcName: fc.Name || '',
      numSubSlots: Number(ch.NumSubSlots) || 0,
      ceruleum: Number(ch.Ceruleum) || 0,
      repairKits: Number(ch.RepairKits) || 0,
      gil: Number(ch.Gil) || 0,
    };
  });

  const ownedFcIds = [...new Set(charactersOut.map((c) => c.fcId).filter(Boolean))];
  const fcs = ownedFcIds.map((id) => {
    const { data: fc } = fcEntry(id);
    const ch = charactersOut.find((c) => c.fcId === id) || {};
    return {
      fcId: id,
      name: fc.Name || '',
      rank: Number(fc.Rank) || 0,
      points: Number(fc.FCPoints) || 0,
      gil: Number(fc.Gil) || 0,
      numSubSlots: ch.numSubSlots || 0,
    };
  });

  vessels.sort((a, b) => a.slot - b.slot);
  return { ok: true, source: sourcePath, characters: charactersOut, fcs, vessels };
}

const SAMPLE = {
  OfflineData: [
    {
      Name: '示例角色',
      World: '示例世界',
      FCID: '12345678901234567',
      NumSubSlots: 4,
      Ceruleum: 320,
      RepairKits: 120,
      OfflineSubmarineData: [
        { Name: '示例潜水艇', ReturnTime: 0 },
      ],
      AdditionalSubmarineData: {
        示例潜水艇: {
          Level: 42,
          CurrentExp: 120000,
          NextLevelExp: 240000,
          Part1: 24358,
          Part2: 24357,
          Part3: 24367,
          Part4: 24370,
          Points: 'AQAAAAA=',
        },
      },
    },
  ],
  FCData: {
    '12345678901234567': { Name: '示例部队', Rank: 12, FCPoints: 1200000 },
  },
};

/* ---------- Universalis price proxy ---------- */

// Prices are cached until the client explicitly asks for a refresh (`force=1`) or the data center
// changes; nothing here expires on a timer.
let dcMapCache = { at: 0, worldToDc: new Map() };
const marketCache = new Map(); // dc -> { at, prices: { id: { avg, min } } }

async function fetchJson(url, timeout = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SubmarinePlanner/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function worldToDc(world) {
  if (Date.now() - dcMapCache.at > 24 * 3600 * 1000) {
    // On a failed refresh keep the previous map (or none) rather than failing the request.
    try {
      await refreshDcMap();
    } catch (_) {
      dcMapCache = { ...dcMapCache, at: Date.now() };
    }
  }
  return dcMapCache.worldToDc.get(world) || world;
}

async function refreshDcMap() {
  const [dcs, worlds] = await Promise.all([
    fetchJson('https://universalis.app/api/v2/data-centers'),
    fetchJson('https://universalis.app/api/v2/worlds'),
  ]);
  const idToName = new Map((worlds || []).map((w) => [w.id, w.name]));
  const map = new Map();
  for (const dc of dcs || []) {
    // Data-center names also resolve directly; configs may store an FC's world too.
    map.set(dc.name, dc.name);
    for (const id of dc.worlds || []) {
      const name = idToName.get(id);
      if (name) map.set(name, dc.name);
    }
  }
  dcMapCache = { at: Date.now(), worldToDc: map };
}

// Listing averages are skewed by one-off absurd listings, so prefer recent sales and fall
// back to the median listing price.
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function fetchPrices(dc, ids, force = false) {
  const entry = marketCache.get(dc) || { at: 0, prices: {} };
  const want = force ? ids : ids.filter((id) => !entry.prices[id]);

  const absorb = (body) => {
    for (const [id, v] of Object.entries(body.items || {})) {
      // Universalis' averagePrice is a plain mean over the window, so one troll sale owns it: a
      // Ruby sold for 210,526,315 gil on Mana dragged the figure to 1.3M while the other nineteen
      // sales sat at 1-4 gil. The median of the same sales ignores that, so prefer it and fall back
      // to the listing median when the item has not sold.
      const saleMedian = median((v.recentHistory || []).map((s) => Number(s.pricePerUnit) || 0).filter(Boolean));
      const listingMedian = median((v.listings || []).map((l) => Number(l.pricePerUnit) || 0).filter(Boolean));
      entry.prices[id] = {
        avg: saleMedian > 0 ? saleMedian : listingMedian,
        sold: saleMedian > 0,
        listing: listingMedian,
        min: Number(v.minPrice) || 0,
        units: Number(v.regularSaleVelocity) || 0,
      };
    }
  };

  let reached = false;
  const request = async (chunk) => {
    const url = `https://universalis.app/api/v2/${encodeURIComponent(dc)}/${chunk.join(',')}?listings=20&entries=20`;
    absorb(await fetchJson(url, 20000));
    reached = true;
  };

  // One id Universalis does not know fails the whole batch, so a failed batch is split in half
  // instead of retried one id at a time. A batch that 404s all the way down means those items
  // simply have no listings on this DC, which is a normal answer rather than an outage.
  const fetchRange = async (chunk) => {
    if (!chunk.length) return;
    try {
      await request(chunk);
    } catch (_) {
      if (chunk.length === 1) return;
      const mid = Math.ceil(chunk.length / 2);
      await fetchRange(chunk.slice(0, mid));
      await fetchRange(chunk.slice(mid));
    }
  };

  const chunks = [];
  for (let i = 0; i < want.length; i += 50) chunks.push(want.slice(i, i + 50));
  await Promise.all(chunks.map(fetchRange));
  // Only bump the timestamp when Universalis actually answered, so an outage does not get reported
  // to the UI as fresh prices. This is per-DC rather than per-id: an item with no listings can never
  // answer, and one reachable batch is enough to prove the API is up.
  if (reached) entry.at = Date.now();
  marketCache.set(dc, entry);
  return entry;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function serveStatic(reqPath, res) {
  const rel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  const root = path.resolve(PUBLIC_DIR);
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/prices') {
    const worlds = String(url.searchParams.get('worlds') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const ids = String(url.searchParams.get('ids') || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    // `force=1` bypasses the price cache: the UI only sends it from the manual refresh button.
    const force = url.searchParams.get('force') === '1';

    if (!worlds.length || !ids.length) {
      sendJson(res, 400, { ok: false, error: 'need worlds and ids' });
      return;
    }

    (async () => {
      const dcs = [...new Set(await Promise.all(worlds.map(worldToDc)))];
      const prices = {};
      const updatedAt = {};
      const okDcs = [];
      const errors = [];
      for (const dc of dcs) {
        try {
          const entry = await fetchPrices(dc, ids, force);
          for (const id of ids) {
            // A cached zero-price entry is meaningful (item has no listings), so test for presence.
            if (entry.prices[id] && !prices[id]) prices[id] = entry.prices[id];
          }
          for (const id of ids) updatedAt[id] = entry.at;
          okDcs.push(dc);
        } catch (err) {
          errors.push(`${dc}: ${err.message}`);
        }
      }
      if (!okDcs.length) {
        sendJson(res, 502, { ok: false, error: `Universalis: ${errors.join('; ')}` });
        return;
      }
      sendJson(res, 200, { ok: true, dcs: okDcs, errors, prices, updatedAt });
    })().catch((err) => {
      if (!res.headersSent) sendJson(res, 502, { ok: false, error: String(err && err.message) });
    });
    return;
  }

  if (url.pathname === '/api/autoretainer') {
    const found = findConfig();
    if (!found) {
      sendJson(res, 200, { ...parseConfig(SAMPLE, '示例数据（未找到 AutoRetainer 配置）'), demo: true });
      return;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(found, 'utf8').replace(/^\uFEFF/, ''));
      sendJson(res, 200, parseConfig(raw, found));
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message), source: found });
    }
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`潜水艇规划器已启动: http://127.0.0.1:${PORT}`);
  const found = findConfig();
  console.log(found ? `AutoRetainer 配置: ${found}` : '未找到 AutoRetainer 配置，将展示示例数据；可用 --config 指定路径');
});
