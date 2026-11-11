// Bake the observed surveillance-band → loot-pool distribution into submarine-loot.json.
//
// The crowd data records one surveillance proc per voyage. Its "Low/Mid/High" half is the
// capability band the build had (how far up the t2/t3 thresholds it reached); its "T1/T2/T3"
// half is the pool the drop actually came from. So counting High procs per pool tells us where
// a build that *could* reach tier 3 actually landed: they are not all sent to pool 3.
//
// Usage: node tools/bake_band_weights.js <path to FFXIVGachaSpreadsheet Submarines.json>
const fs = require('fs');
const path = require('path');

const rawPath = process.argv[2];
if (!rawPath) {
  console.error('usage: node tools/bake_band_weights.js <Submarines.json>');
  process.exit(1);
}

const lootPath = path.join(__dirname, '..', 'public', 'data', 'submarine-loot.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const loot = JSON.parse(fs.readFileSync(lootPath, 'utf8'));

// Stats.<field> counts records by capability band, per pool. Pool order is Tier1..Tier3.
const BANDS = { low: 'Min', mid: 'Mid', high: 'High' };

function bandShares(sector, field) {
  const counts = ['Tier1', 'Tier2', 'Tier3'].map((k) => {
    const pool = sector.Pools[k];
    const stats = pool && pool.Stats;
    return stats ? Number(stats[field]) || 0 : 0;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return counts.map((c) => Math.round((c / total) * 100000) / 100000);
}

function doubleDipRate(sector) {
  let chances = 0;
  let dips = 0;
  for (const k of ['Tier1', 'Tier2', 'Tier3']) {
    const stats = sector.Pools[k] && sector.Pools[k].Stats;
    if (!stats) continue;
    chances += Number(stats.Favor) || 0;
    dips += Number(stats.DoubleDips) || 0;
  }
  return chances > 0 ? Math.round((dips / chances) * 10000) / 10000 : 0;
}

const FALLBACK = [1, 0, 0];
let patched = 0;
let missing = 0;
for (const [sid, entry] of Object.entries(loot.sectors)) {
  const sector = raw.Sectors[sid];
  if (!sector) {
    missing += 1;
    continue;
  }
  // A band with no samples inherits the next lower one: the build still drops, we just have no
  // observation of where. Falling back upward would overstate it.
  const low = bandShares(sector, BANDS.low) || FALLBACK;
  const mid = bandShares(sector, BANDS.mid) || low;
  const high = bandShares(sector, BANDS.high) || mid;
  entry.weights = { low, mid, high };
  entry.secondItem = doubleDipRate(sector);
  patched += 1;
}

loot.meta.tierMeaning =
  '每个航点三档掉落池，每次出航只落一个池。weights.low/mid/high 是三个「探索能力档位」各自落到' +
  '三个池的比例（low=达不到 t2，mid=达到 t2，high=达到 t3），来自众包记录里各能力档的实际落池计数；' +
  'secondItem 是恩惠达标时确实拿到第二件的比例。qty 为 [min,max] 按收集档 0 poor / 1 normal / 2 optimal。';
loot.meta.bands = {
  generated: new Date().toISOString(),
  source: path.basename(rawPath),
};

// The file ships minified; keep it that way so the diff shows only the added fields.
fs.writeFileSync(lootPath, `${JSON.stringify(loot)}\n`, 'utf8');
console.log(`patched ${patched} sectors, ${missing} missing from the crowd file`);
