'use strict';

const STORAGE_KEY = 'submarine-planner-v2';
const SLOT_KEYS = ['hull', 'stern', 'bow', 'bridge'];
const SLOT_LABELS = { hull: '船体', stern: '船尾', bow: '舰首', bridge: '舰桥' };
const STAT_KEYS = [
  ['surveillance', '探索'],
  ['retrieval', '收集'],
  ['speed', '速度'],
  ['range', '航程'],
  ['durability', '耐久'],
  ['favor', '恩惠'],
];

// In-game descriptions of each stat, shown on hover.
const STAT_DESCRIPTIONS = {
  surveillance: '探索性能：达到一定值后有概率获得更高级的物品。',
  retrieval: '收集性能：达到一定值后有概率提高获得物品的数量（部分物品无效）。',
  speed: '巡航速度：减少探索时间。',
  range: '航行距离：可以到达更远的地点或更多的地点。',
  favor: '恩惠：达到一定值后有概率获取第二件物品；到达某个阈值必定获得第二件物品。',
};

const state = {
  data: null,
  loot: null,
  slots: [],
  source: '',
  activeSlot: 0,
  hidden: new Set(),
  overrides: {},
  selected: new Set(),
  partsIndex: new Map(),
  mapFilter: '',
  world: '',
  prices: {},
  pricesAt: {},
  pricesFetchedAt: 0,
  pricesBusy: false,
  priceError: '',
  marketDcs: [],
  cycleHours: 24,
  // Static hosting has no server.js, so there is no AutoRetainer config and no price proxy.
  // Detected once at boot: the UI then runs on the built-in sample vessel and calls
  // Universalis directly (it allows cross-origin reads).
  standalone: false,
};

// Universalis 的国服大区 → 世界表。只在取价时用来把世界映射到大区，界面直接列这张表。
const DC_WORLDS = {
  陆行鸟: ['红玉海', '神意之地', '拉诺西亚', '幻影群岛', '萌芽池', '宇宙和音', '沃仙曦染', '晨曦王座'],
  莫古力: ['白银乡', '白金幻象', '神拳痕', '潮风亭', '旅人栈桥', '拂晓之间', '龙巢神殿', '梦羽宝境'],
  猫小胖: ['紫水栈桥', '延夏', '静语庄园', '摩杜纳', '海猫茶屋', '柔风海湾', '琥珀原'],
  豆豆柴: ['水晶塔', '银泪湖', '太阳海岸', '伊修加德', '红茶川'],
};

const MAX_ROUTE_POINTS = 5;

const $ = (sel) => document.querySelector(sel);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fmt(n) {
  return Number(n || 0).toLocaleString('zh-CN');
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.overrides = saved.overrides || {};
    state.selected = new Set(saved.selected || []);
    state.cycleHours = Number(saved.cycleHours) || 24;
    state.world = saved.world || '';
    state.slots = Array.isArray(saved.slots) ? saved.slots : [];
    state.hidden = new Set(saved.hidden || []);
    state.prices = saved.prices || {};
    state.pricesAt = saved.pricesAt || {};
    state.pricesFetchedAt = Number(saved.pricesFetchedAt) || 0;
  } catch (_) {
    /* ignore corrupt storage */
  }
}

function persist() {
  const payload = {
    overrides: state.overrides,
    selected: [...state.selected],
    cycleHours: state.cycleHours,
    world: state.world,
    // Manual slots have no config behind them, so they only survive through localStorage.
    slots: state.slots.filter((s) => s.manual),
    // AutoRetainer slots cannot be deleted from the config, so "deleted" ones are hidden here.
    hidden: [...state.hidden],
    // Prices are kept across reloads on purpose; they are only refreshed by the button.
    prices: state.prices,
    pricesAt: state.pricesAt,
    pricesFetchedAt: state.pricesFetchedAt,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    /* storage may be full or blocked */
  }
}

function buildPartsIndex() {
  state.partsIndex.clear();
  const parts = state.data.parts || {};
  for (const slot of SLOT_KEYS) {
    for (const part of parts[slot] || []) {
      state.partsIndex.set(Number(part.id), { slot, part, label: part.nameZh || part.name });
    }
  }
  state.maxExp = new Map((state.data.ranks || []).map((r) => [r.rank, r.expToNext]));
}

function activeVessel() {
  return state.slots[state.activeSlot] || null;
}

// A "configuration" is level plus the four parts. Rows, overrides and deletions are all keyed by
// this, not by slot number, so re-reading AutoRetainer keeps each configuration as one row.
function configKey(s) {
  const ov = overrideFor(s);
  return [ov.level, ...ov.parts].join(',');
}

function visibleSlots() {
  return state.slots.filter((s) => !state.hidden.has(configKey(s)));
}

// AutoRetainer's own short code for a part (Build.cs ToIdentifier): rows come in groups of four per
// class — Shark / Unkiu / Whale / Coelacanth / Syldra — and the second five groups are the
// "Modified" versions. Chinese uses the class order 1–5 with 改, English uses SYUC+.
const PART_CLASS_ZH = ['1', '2', '3', '4', '5'];
const PART_CLASS_EN = ['S', 'U', 'W', 'C', 'Y'];

function partCode(partId, lang) {
  const group = Math.floor((Number(partId) - 1) / 4);
  if (group < 0) return '';
  const base = (lang === 'zh' ? PART_CLASS_ZH : PART_CLASS_EN)[group % 5];
  return group >= 5 ? base + (lang === 'zh' ? '改' : '+') : base;
}

// Shown in parentheses in the UI: both spellings at once, e.g. 1改/S+.
function partLabel(partId) {
  const zh = partCode(partId, 'zh');
  return zh ? `${zh}/${partCode(partId, 'en')}` : '';
}

// A row in the list stands for one configuration. The part codes carry the tier already
// (1–5, then 改/+ for the upgraded tier), so the list shows them instead of I/II/VI.
function slotSummary(s) {
  const ov = overrideFor(s);
  const ids = ov.parts.map((id) => (state.partsIndex.get(Number(id)) || {}).part);
  const codes = ids.map((p) => (p ? partLabel(p.partId) : '—'));
  return `Lv.${ov.level}${ids.some(Boolean) ? ` · ${codes.join(' ')}` : ''}`;
}

// Merge slots that end up with the same level and parts. The first slot of a group keeps the
// identity, so ticking the merged row edits the group as a whole.
function mergeSlots(slots) {
  const groups = new Map();
  for (const s of slots) {
    const key = configKey(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()];
}

function editsFor(v) {
  if (!v) return {};
  const key = vesselKey(v);
  if (!state.overrides[key]) state.overrides[key] = {};
  return state.overrides[key];
}

function overrideFor(v) {
  if (!v) return {};
  const edits = editsFor(v);
  return {
    level: edits.level ?? v.level,
    exp: edits.exp ?? v.exp,
    expToNext: edits.expToNext ?? v.expToNext,
    parts: edits.parts ?? [...(v.parts || [])],
  };
}

function currentParts(v) {
  const ov = overrideFor(v);
  const ids = [...ov.parts];
  while (ids.length < SLOT_KEYS.length) ids.push(0);
  return ids.map((id) => {
    const hit = state.partsIndex.get(Number(id));
    return hit
      ? { id: Number(id), slot: hit.slot, ...hit.part, label: hit.label }
      : { id: Number(id), slot: null, name: `未装备 #${id}`, label: '未装备', surveillance: 0, retrieval: 0, speed: 0, range: 0, durability: 0, favor: 0, tier: '—' };
  });
}

function rankBonus(level) {
  const rank = (state.data.ranks || []).find((r) => r.rank === Number(level));
  return rank || { surveillance: 0, retrieval: 0, speed: 0, range: 0, favor: 0, expToNext: 0 };
}

function currentStats(v) {
  const parts = currentParts(v);
  const ov = overrideFor(v);
  const bonus = rankBonus(ov.level);
  const total = {};
  for (const [key] of STAT_KEYS) total[key] = Number(bonus[key] || 0);
  for (const p of parts) {
    for (const [key] of STAT_KEYS) total[key] += Number(p[key] || 0);
  }
  return { parts, total, bonus };
}

// Overrides are keyed by the slot's stable uid (AutoRetainer slot number, or the manual id), so
// editing parts mid-session does not move the edit onto a different key.
function vesselKey(v) {
  if (v.manual) return `manual-${v.manualId}`;
  return `ar-${v.slot}`;
}

function worldOf(v) {
  return state.world || (v && v.world) || '';
}

// 世界 → 大区。静态模式下没有服务端帮忙映射，这张表就是唯一依据；表外的世界按原名直接查。
function dcOf(world) {
  for (const [dc, worlds] of Object.entries(DC_WORLDS)) {
    if (worlds.includes(world)) return dc;
  }
  return world;
}

/* ---------- rendering ---------- */

function renderVessels() {
  const host = $('#vessel-list');
  host.innerHTML = '';
  const groups = mergeSlots(visibleSlots());
  if (!groups.length) {
    host.append(el('p', 'empty', '没有可用的潜艇配置，点下方「添加配置」新建一条。'));
  }
  groups.forEach((group) => {
    const v = group[0];
    const index = state.slots.indexOf(v);
    const row = el('div', `vessel${index === state.activeSlot ? ' active' : ''}`);
    const left = el('div');
    // Rows are configurations, not slots: identical slots collapse into one and are not listed.
    left.append(el('div', 'vessel-name', slotSummary(v)));
    const right = el('div', 'vessel-pills');
    // The level is already in the row label; the pill counts how many slots share this config.
    if (group.length > 1) {
      const pill = el('span', 'pill', `${group.length} 艘`);
      pill.title = `槽位 ${group.map((s) => s.slot + 1).join('、')} 使用同一套配置`;
      right.append(pill);
    }
    row.addEventListener('click', () => {
      state.activeSlot = index;
      renderAll();
    });
    const del = el('button', 'vessel-del', '✕');
    del.title = group.length > 1 ? `删除这套配置（${group.length} 艘潜艇）` : '删除这套配置';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroups([group]);
    });
    right.append(del);
    row.append(left, right);
    host.append(row);
  });

  const tools = el('div', 'vessel-tools');
  const add = el('button', 'btn', '＋ 添加配置');
  add.addEventListener('click', addSlot);
  tools.append(add);
  // Only offered once the user has hidden something, so there is a way back.
  if (state.hidden.size) {
    const undo = el('button', 'btn', '恢复全部');
    undo.title = `恢复 ${state.hidden.size} 套已删除的配置`;
    undo.addEventListener('click', () => {
      state.hidden.clear();
      persist();
      renderAll();
    });
    tools.append(undo);
  }
  host.append(tools);
  // Deleting the active row leaves activeSlot pointing at a hidden configuration.
  const current = activeVessel();
  if (!current || state.hidden.has(configKey(current))) {
    const first = visibleSlots()[0];
    state.activeSlot = first ? state.slots.indexOf(first) : 0;
  }
}

function deleteGroups(groups) {
  for (const group of groups) {
    const key = configKey(group[0]);
    state.hidden.add(key);
    for (const s of group) {
      if (s.manual) removeSlot(state.slots.indexOf(s), { quiet: true });
    }
  }
  persist();
  renderAll();
}

let manualSeq = 0;

function addSlot() {
  const last = activeVessel() || {};
  manualSeq += 1;
  // A brand-new configuration starts empty; copying the current one would just merge into it.
  state.slots.push({
    slot: state.slots.length,
    manualId: `${Date.now().toString(36)}-${manualSeq}`,
    name: '手动配置',
    owner: '',
    world: '',
    level: Number(last.level) || 1,
    exp: 0,
    expToNext: 0,
    parts: [0, 0, 0, 0],
    currentPoints: [],
    route: [],
    manual: true,
  });
  state.hidden.delete(configKey(state.slots[state.slots.length - 1]));
  state.activeSlot = state.slots.length - 1;
  persist();
  renderAll();
}

function removeSlot(index, { quiet = false } = {}) {
  if (index < 0 || index >= state.slots.length) return;
  const [gone] = state.slots.splice(index, 1);
  if (gone) delete state.overrides[vesselKey(gone)];
  state.slots.forEach((s, i) => {
    s.slot = i;
  });
  state.activeSlot = Math.max(0, Math.min(state.activeSlot, state.slots.length - 1));
  if (quiet) return;
  persist();
  renderAll();
}

function renderWorld() {
  const host = $('#world-view');
  if (!host) return;
  host.innerHTML = '';
  const select = document.createElement('select');
  select.id = 'world-select';
  for (const [dc, worlds] of Object.entries(DC_WORLDS)) {
    const group = document.createElement('optgroup');
    group.label = dc;
    for (const w of worlds) {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      group.append(opt);
    }
    select.append(group);
  }
  select.value = state.world;
  if (select.value !== state.world) {
    const opt = document.createElement('option');
    opt.value = state.world;
    opt.textContent = state.world;
    select.append(opt);
    select.value = state.world;
  }
  select.addEventListener('change', () => {
    // The city a character is standing in is not where they buy; the chosen world is.
    state.world = select.value;
    // Prices belong to one data center, so a world change invalidates all of them.
    state.prices = {};
    state.pricesAt = {};
    state.pricesFetchedAt = 0;
    state.priceError = '';
    persist();
    renderWorld();
    renderSummary();
    queuePriceFetch();
  });
  host.append(select);

  const row = el('div', 'price-row');
  const reload = el('button', 'btn', state.pricesBusy ? '获取中…' : '重新获取价格');
  reload.disabled = state.pricesBusy || !state.data;
  reload.title = '忽略已有缓存，重新向 Universalis 查询当前海域的全部掉落价';
  reload.addEventListener('click', refreshPrices);
  row.append(reload);
  host.append(row);

  // Prices are never discarded on a timer, so state clearly how old the figures are.
  const at = state.pricesFetchedAt;
  let note;
  if (state.priceError) note = `价格读取失败：${state.priceError}`;
  else if (!at) note = '尚未获取价格，勾选航点或点上方按钮。';
  else note = `价格更新于 ${fmtTime(at)}`;
  const meta = el('div', 'vessel-meta', note);
  if (state.priceError) meta.classList.add('err-text');
  host.append(meta);
}

function renderParts() {
  const host = $('#parts-editor');
  host.innerHTML = '';
  const v = activeVessel();
  if (!v) return;
  const ov = overrideFor(v);
  const parts = state.data.parts || {};

  SLOT_KEYS.forEach((slot, slotIndex) => {
    const row = el('div', 'part-row');
    row.append(el('label', null, SLOT_LABELS[slot]));
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '0';
    empty.textContent = '— 未装备 —';
    select.append(empty);
    for (const part of parts[slot] || []) {
      const opt = document.createElement('option');
      opt.value = String(part.id);
      // `partId` is the SubmarinePart row id the code is derived from; `id` is the item id.
      opt.textContent = `${part.nameZh || part.name}（${partLabel(part.partId)}）`;
      opt.title = `${part.nameZh || ''} / ${part.name} · 部件 #${part.partId} · 物品 #${part.id}`;
      select.append(opt);
    }
    const currentId = String(ov.parts[slotIndex] ?? 0);
    select.value = currentId;
    if (select.value !== currentId) {
      const unknown = document.createElement('option');
      unknown.value = currentId;
      unknown.textContent = `未知部件 #${currentId}`;
      select.append(unknown);
      select.value = currentId;
    }
    select.addEventListener('change', () => {
      const edits = editsFor(v);
      const next = [...(edits.parts || v.parts)];
      next[slotIndex] = Number(select.value);
      edits.parts = next;
      persist();
      renderStats();
      renderLevel();
    });
    row.append(select);
    host.append(row);
  });
}

function renderStats() {
  const host = $('#stats-view');
  host.innerHTML = '';
  const v = activeVessel();
  if (!v) return;
  const { parts, total, bonus } = currentStats(v);

  const grid = el('div', 'stats-grid');
  for (const [key, label] of STAT_KEYS) {
    const box = el('div', 'stat');
    const desc = STAT_DESCRIPTIONS[key];
    if (desc) box.title = desc;
    box.append(el('div', 'stat-label', label));
    box.append(el('div', 'stat-value', fmt(total[key])));
    const fromParts = parts.reduce((a, p) => a + Number(p[key] || 0), 0);
    box.append(el('div', 'stat-sub', `部件 ${fmt(fromParts)} · 等级 ${fmt(bonus[key])}`));
    // The in-game effect text, so the numbers mean something without a wiki open.
    if (desc) box.append(el('div', 'stat-desc', desc.slice(desc.indexOf('：') + 1)));
    grid.append(box);
  }
  host.append(grid);

  const diff = el('div', 'vessel-meta');
  diff.style.marginTop = '10px';
  const tiers = parts.map((p) => p.tier || '?').join(' / ');
  diff.textContent = `部件阶级：${tiers || '—'}`;
  host.append(diff);
}

function renderLevel() {
  const host = $('#level-view');
  host.innerHTML = '';
  const v = activeVessel();
  if (!v) return;
  const ov = overrideFor(v);
  // AutoRetainer's NextLevelExp is a snapshot; the rank sheet is authoritative for the level.
  const knownExp = (state.maxExp && state.maxExp.get(Number(ov.level))) || 0;
  const expToNext = knownExp || ov.expToNext;

  const pct = expToNext > 0 ? Math.min(100, (ov.exp / expToNext) * 100) : 100;
  const bar = el('div', 'level-bar');
  const fill = el('div');
  fill.style.width = `${pct.toFixed(1)}%`;
  bar.append(fill);
  host.append(bar);

  const meta = el('div', 'level-meta');
  meta.append(el('span', null, `Lv.${ov.level}`));
  meta.append(el('span', null, `${fmt(ov.exp)} / ${fmt(expToNext)} 经验`));
  host.append(meta);

  const edit = el('div', 'part-row');
  edit.style.marginTop = '10px';
  edit.style.gridTemplateColumns = '48px 1fr';
  edit.append(el('label', null, '模拟等级'));
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = '200';
  input.value = String(ov.level);
  input.addEventListener('change', () => {
    editsFor(v).level = Math.max(0, Math.min(200, Number(input.value) || 0));
    persist();
    renderAll();
  });
  edit.append(input);
  host.append(edit);

  const unlocked = (state.data.sectors || []).filter((s) => ov.level >= s.rank).length;
  host.append(el('div', 'vessel-meta', `等级满足 ${unlocked} / ${(state.data.sectors || []).length} 个航点`));
}

/* ---------- voyage math (mirrors AutoRetainer's calculator) ---------- */

const FIXED_VOYAGE_SECONDS = 43200;

function sectorById(id) {
  return (state.data.sectors || []).find((s) => s.id === Number(id)) || null;
}

function startPointFor(sector) {
  return (state.data.starts || []).find((s) => s.mapId === sector.mapId) || { x: 0, y: 0, z: 0 };
}

function dist3(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function voyageSeconds(from, to, speed) {
  const v = Math.max(1, speed) * 100;
  return Math.floor((dist3(from, to) * 3990) / v * 60);
}

function surveySeconds(sector, speed) {
  const v = Math.max(1, speed) * 100;
  return Math.floor(((sector.surveyMin * 7000) / v) * 60);
}

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

/* ---------- loot value (Universalis CN, per surveillance/retrieval tier) ---------- */

// 沉船首饰没有市场成交记录，只能按商店回收价计价。数值取 Item.csv 的 Price{Low}。
const VENDOR_PRICES = {
  22500: 8000,
  22501: 9000,
  22502: 10000,
  22503: 13000,
  22504: 27000,
  22505: 28500,
  22506: 30000,
  22507: 34500,
};

// Below this per-unit price an item is not worth carrying to market; it still drops, it just
// contributes no gil. Keeps raw-material stacks from diluting the valuation.
const MIN_UNIT_VALUE = 10000;

// The cutoff is about market junk — stacks of cheap raw material diluting the tally. Vendor-priced
// items have no market at all; selling them is the whole point, so the 8,000–9,000 gil jewelry is
// counted instead of being thrown out with the ore.
function ignLowValue(itemId) {
  return !VENDOR_PRICES[itemId];
}

function lootFor(sectorId) {
  const table = state.loot && state.loot.sectors;
  return table ? table[String(sectorId)] || null : null;
}

function thresholdsFor(sectorId) {
  const entry = lootFor(sectorId);
  return (entry && entry.breakpoints) || null;
}

// Surveillance does not swap one pool for a richer one: each reached threshold unlocks its pool and
// every unlocked pool is drawn. Same structure as SubmarineTracker's PredictBonusExp.
function unlockedTiers(sectorId, surveillance) {
  const t = thresholdsFor(sectorId);
  if (!t) return [0];
  const tiers = [0];
  if (t.t2 > 0 && surveillance >= t.t2) tiers.push(1);
  if (t.t3 > 0 && surveillance >= t.t3) tiers.push(2);
  return tiers;
}

function surveillanceTier(sectorId, surveillance) {
  return Math.max(...unlockedTiers(sectorId, surveillance));
}

function retrievalTier(sectorId, retrieval) {
  const t = thresholdsFor(sectorId);
  if (!t) return 1;
  if (retrieval >= t.optimal) return 2;
  return retrieval >= t.normal ? 1 : 0;
}

function favorMet(sectorId, favor) {
  const t = thresholdsFor(sectorId);
  return Boolean(t && favor >= t.favor);
}

// Draws per visit: one per unlocked pool, doubled when the favour line is met (SubmarineTracker
// caps the whole thing at 4).
function drawCounts(sectorId, stats) {
  const unlocked = unlockedTiers(sectorId, stats.surveillance);
  const doubled = favorMet(sectorId, stats.favor) ? 2 : 1;
  // The cap applies to the whole voyage, not to each pool, so divide the capped total back out.
  const total = Math.min(unlocked.length * doubled, 4);
  const weight = total / unlocked.length;
  const counts = unlocked.map((tier) => ({ tier, draws: weight, weight }));
  return { counts, total, favorMet: doubled === 2 };
}

function poolFor(sectorId, tier) {
  const entry = lootFor(sectorId);
  if (!entry) return [];
  return entry.pools[String(tier + 1)] || [];
}

// Expected units per visit: chance * midpoint of the [min,max] range for this retrieval tier.
function expectedUnits(drop, retTier) {
  const q = drop.qty || [];
  if (q.length < 6) return drop.chance || 0;
  const min = q[retTier * 2] || 0;
  const max = q[retTier * 2 + 1] || 0;
  return (drop.chance || 0) * ((min + max) / 2);
}

// Magitek Repair Materials, the item that restores a submarine's 30000 condition.
const REPAIR_MATERIAL_ID = 10386;
// AutoRetainer Build.cs: hard-codes this as the health pool a repair restores.
const VESSEL_HEALTH = 30000;

// AutoRetainer's damage model: per part, every visited sector adds (335 + sector rank - part rank) * 7,
// and the voyage wears the part that took the most. Same as Build.cs VoyageDamage.
function voyageDamage(parts, ordered) {
  let worst = 1;
  for (const p of parts) {
    if (!p || !p.partId) continue;
    let damaged = 0;
    for (const s of ordered) damaged += (335 + Number(s.rank) - Number(p.rank)) * 7;
    if (damaged > worst) worst = damaged;
  }
  return worst;
}

// Condition is spent per voyage, repairs restore it in one go and consume the sum of the four parts'
// RepairMaterials. Spreading that repair across the voyages it lasts gives the per-voyage cost.
function repairCost(ordered) {
  const { parts } = currentStats(activeVessel());
  const equipped = parts.filter((p) => p && p.partId);
  if (!equipped.length || !ordered.length) return { materials: 0, gil: 0, perRepair: 0, voyages: 0 };
  const materials = equipped.reduce((a, p) => a + Number(p.repairMaterials || 0), 0);
  const damage = voyageDamage(equipped, ordered);
  const voyages = damage > 0 ? Math.ceil(VESSEL_HEALTH / damage) : 0;
  const perVoyage = voyages > 0 ? materials / voyages : 0;
  const unit = priceOf(REPAIR_MATERIAL_ID);
  return { materials: materials, perRepair: perVoyage, voyages, gil: perVoyage * unit, unit };
}

// Vendor-priced items never hit Universalis — they have no market — so the table wins outright.
function priceOf(itemId) {
  const vendor = VENDOR_PRICES[itemId];
  if (vendor) return vendor;
  const hit = state.prices && state.prices[itemId];
  return hit ? Number(hit.avg) || 0 : 0;
}

function needsMarketPrice(itemId) {
  return !VENDOR_PRICES[itemId];
}

// Gil from one visit to a sector: every unlocked pool contributes its own draw, and meeting the
// favour line doubles it. Items worth less than MIN_UNIT_VALUE are dropped from the sum so bulk
// raw materials do not crowd out the gear that actually pays.
function sectorValue(sectorId, stats) {
  const ret = retrievalTier(sectorId, stats.retrieval);
  const { counts, total, favorMet: favored } = drawCounts(sectorId, stats);
  let gil = 0;
  let priced = 0;
  let cheap = 0;
  let unpriced = 0;
  let counted = 0;
  for (const { tier, weight } of counts) {
    for (const drop of poolFor(sectorId, tier)) {
      counted += 1;
      const price = priceOf(drop.id);
      if (price <= 0) {
        unpriced += 1;
        continue;
      }
      if (price < MIN_UNIT_VALUE && ignLowValue(drop.id)) {
        cheap += 1;
        continue;
      }
      priced += 1;
      gil += expectedUnits(drop, ret) * price * weight;
    }
  }
  return {
    gil,
    tier: Math.max(...counts.map((c) => c.tier)),
    ret,
    priced,
    cheap,
    unpriced,
    counted,
    draws: total,
    favored,
  };
}

function itemValues(sectorId, stats) {
  const ret = retrievalTier(sectorId, stats.retrieval);
  const { counts } = drawCounts(sectorId, stats);
  const rows = [];
  for (const { tier, weight } of counts) {
    for (const drop of poolFor(sectorId, tier)) {
      const price = priceOf(drop.id);
      if (price < MIN_UNIT_VALUE && ignLowValue(drop.id)) continue;
      rows.push({
        id: drop.id,
        name: drop.name,
        tier,
        vendor: Boolean(VENDOR_PRICES[drop.id]),
        units: expectedUnits(drop, ret) * weight,
        price,
      });
    }
  }
  return rows.sort((a, b) => b.units * b.price - a.units * a.price);
}

// Cached prices never expire on their own: Universalis prices move slowly, and a stale figure the
// user chose to keep is safer than a silent refetch mid-planning. 「重新获取价格」 forces a reload.
async function ensurePrices(ids, { force = false } = {}) {
  const missing = [...new Set(ids)].filter((id) => needsMarketPrice(id) && (force || !state.pricesAt[id]));
  if (!missing.length) return;
  const world = worldOf(activeVessel());
  if (!world) return;
  const body = state.standalone
    ? await fetchPricesDirect(world, missing)
    : await fetchPricesProxied(world, missing, force);
  if (!body.ok) throw new Error(body.error || '价格读取失败');
  for (const [id, value] of Object.entries(body.prices || {})) {
    state.prices[id] = value;
    // Server-side update time when available, so the display reflects when the data was pulled.
    state.pricesAt[id] = body.updatedAt?.[id] || Date.now();
  }
  state.pricesFetchedAt = Date.now();
  state.marketDcs = body.dcs || [];
  persist();
}

async function fetchPricesProxied(world, ids, force) {
  const url = `/api/prices?worlds=${encodeURIComponent(world)}&ids=${ids.join(',')}${
    force ? '&force=1' : ''
  }`;
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
}

// Static hosting: Universalis sends `access-control-allow-origin: *`, so the browser can query it
// directly. Same shape as the proxy, so callers do not care which path ran.
async function fetchPricesDirect(world, ids) {
  const dc = dcOf(world);
  const prices = {};
  const updatedAt = {};
  const at = Date.now();

  const absorb = (body) => {
    for (const [id, v] of Object.entries(body.items || {})) {
      const listingMedian = median((v.listings || []).map((l) => Number(l.pricePerUnit) || 0).filter(Boolean));
      const sold = Number(v.averagePrice) || 0;
      prices[id] = {
        avg: sold > 0 ? sold : listingMedian,
        sold: sold > 0,
        listing: listingMedian,
        min: Number(v.minPrice) || 0,
        units: Number(v.regularSaleVelocity) || 0,
      };
      updatedAt[id] = at;
    }
  };

  const request = async (chunk) => {
    const url = `https://universalis.app/api/v2/${encodeURIComponent(dc)}/${chunk.join(',')}?listings=20&entries=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    absorb(await res.json());
  };

  // One unknown id fails the whole batch, so split and retry instead of giving up.
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
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  await Promise.all(chunks.map(fetchRange));
  return { ok: true, dcs: [dc], prices, updatedAt };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function vesselStats(v) {
  const { total } = currentStats(v);
  return {
    surveillance: Number(total.surveillance) || 0,
    retrieval: Number(total.retrieval) || 0,
    favor: Number(total.favor) || 0,
    speed: Number(total.speed) || 0,
    range: Number(total.range) || 0,
  };
}

// A stop may only be added when the resulting set still fits the hull's Range.
function fitsRange(list, stats) {
  return !list.length || minRouteDistance(list) <= stats.range;
}

/* ---------- value-based route search ---------- */

const CYCLE_HOURS = 24;
// How far under a whole cycle the return may land. Travel is only predictable to the minute,
// so 35 minutes is the tightest practical window around a daily collection slot.
const CYCLE_SLACK = 35 / 60;
const SEARCH_POOL = 24;

// Same distance measure as AutoRetainer's calculator: kilometres between points, plus each
// sector's survey distance. A voyage is only legal when the total stays within the hull's Range.
function legDistance(a, b) {
  return Math.floor(dist3(a, b) * 0.035);
}

function routeDistance(ordered) {
  if (!ordered.length) return 0;
  let total = 0;
  let prev = startPointFor(ordered[0]);
  for (const s of ordered) {
    total += legDistance(prev, s) + Number(s.surveyDistance || 0);
    prev = s;
  }
  return total;
}

// The player may visit the stops in any order, so a set of sectors is legal as long as its
// shortest ordering fits; the summary must measure that same ordering.
function minRouteDistance(list) {
  if (list.length <= 1) return routeDistance(list);
  let shortest = Infinity;
  for (const order of permutations(list)) shortest = Math.min(shortest, routeDistance(order));
  return shortest;
}

function routeSeconds(ordered, speed) {
  if (!ordered.length) return FIXED_VOYAGE_SECONDS;
  const v = Math.max(1, Number(speed) || 1);
  let seconds = FIXED_VOYAGE_SECONDS;
  let prev = startPointFor(ordered[0]);
  for (const s of ordered) {
    seconds += voyageSeconds(prev, s, v) + surveySeconds(s, v);
    prev = s;
  }
  return seconds;
}

function permutations(list) {
  if (list.length <= 1) return [list];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([list[i], ...tail]);
  }
  return out;
}

function combinations(list, k, start = 0, prefix = [], out = []) {
  if (prefix.length === k) {
    out.push([...prefix]);
    return out;
  }
  for (let i = start; i < list.length; i += 1) {
    prefix.push(list[i]);
    combinations(list, k, i + 1, prefix, out);
    prefix.pop();
  }
  return out;
}

// Prefer a voyage that lands just under a whole 24h cycle so the collection rhythm stays stable.
// Round up: a 25h voyage on a 24h cycle is collected after two days, not one, so it is 23h early.
function cycleFit(seconds, hours) {
  const targetSeconds = hours * 3600;
  const cycle = Math.max(1, Math.ceil(seconds / targetSeconds));
  const diffMinutes = (cycle * targetSeconds - seconds) / 60;
  return { ok: diffMinutes <= CYCLE_SLACK * 60, cycle, diffMinutes };
}

// A voyage that exceeds the hull's Range cannot be deployed at all, so it never competes.
function tourKey(score, fit, legal) {
  if (!legal) return -1;
  return (1 + Math.min(fit.diffMinutes, 1440) / 1440) * (fit.ok ? 1 + score : score / 1e6);
}

function buildTour(sectorList, stats) {
  const perStop = new Map(sectorList.map((s) => [s.id, sectorValue(s.id, stats).gil]));
  const sumValue = (list) => list.reduce((a, s) => a + (perStop.get(s.id) || 0), 0);
  const speed = stats.speed;

  let legal = null;
  let farthest = null;
  const consider = (ordered) => {
    if (!ordered.length) return;
    const seconds = routeSeconds(ordered, speed);
    const value = sumValue(ordered);
    const fit = cycleFit(seconds, state.cycleHours);
    const distance = routeDistance(ordered);
    const score = value / Math.max(seconds / 3600, 1);
    const tour = { ordered, seconds, value, fit, distance, score };
    if (distance > stats.range) {
      // Still remember the closest miss so the UI can explain why nothing fit.
      if (!farthest || distance < farthest.distance) farthest = tour;
      return;
    }
    const key = tourKey(score, fit, true);
    if (!legal || key > legal.key) legal = { ...tour, key };
  };

  if (sectorList.length <= 6) {
    for (const order of permutations(sectorList)) consider(order);
  } else {
    // Too many orderings: take the richest stops first, then refine small subsets.
    const ranked = [...sectorList].sort((a, b) => (perStop.get(b.id) || 0) - (perStop.get(a.id) || 0));
    const cap = Math.min(MAX_ROUTE_POINTS, ranked.length);
    for (let n = 1; n <= cap; n += 1) {
      consider(ranked.slice(0, n));
      if (n >= 2) {
        for (const combo of combinations(ranked.slice(0, Math.max(n + 2, 4)), n)) {
          for (const order of permutations(combo)) consider(order);
        }
      }
    }
  }
  return { tour: legal, farthest };
}

// A voyage only visits one map, and the map select scopes the search to that map.
function candidateMaps(v) {
  const all = state.data.sectors || [];
  const visible = all.filter((s) => String(s.mapId) === state.mapFilter);
  const level = overrideFor(v).level;
  const byMap = new Map();
  for (const s of visible) {
    if (s.rank > level || !lootFor(s.id)) continue;
    if (!byMap.has(s.mapId)) byMap.set(s.mapId, []);
    byMap.get(s.mapId).push(s);
  }
  return [...byMap.values()];
}

// Only the pools this vessel's surveillance unlocks contribute value, so don't price the rest.
function candidateIds(maps) {
  const v = activeVessel();
  const surveillance = v ? vesselStats(v).surveillance : 0;
  const ids = new Set();
  for (const sectors of maps) {
    for (const s of sectors) {
      for (const tier of unlockedTiers(s.id, surveillance)) {
        for (const drop of poolFor(s.id, tier)) ids.add(drop.id);
      }
    }
  }
  return [...ids];
}

// The tour search is combinatorial, so each map contributes only its richest stops.
function rankedMaps(v, stats) {
  return candidateMaps(v).map((sectors) =>
    sectors
      .map((s) => ({ sector: s, value: sectorValue(s.id, stats).gil }))
      .sort((a, b) => b.value - a.value)
      .slice(0, SEARCH_POOL)
      .map((x) => x.sector)
  );
}

// `ranked` is already ordered by value, so slicing it gives the richest stops first.
function searchMap(ranked, stats) {
  let best = null;
  let nearest = null;
  let farthest = null;
  const take = ({ tour, farthest: miss }) => {
    if (miss && (!farthest || miss.distance < farthest.distance)) farthest = miss;
    if (!tour) return;
    if (!best || tour.key > best.key) best = tour;
    if (!nearest || tour.fit.diffMinutes < nearest.fit.diffMinutes) nearest = tour;
  };

  const cap = Math.min(MAX_ROUTE_POINTS, ranked.length);
  for (let count = 1; count <= cap; count += 1) {
    take(buildTour(ranked.slice(0, count), stats));
    // The richest stops are not necessarily the ones that fit the cycle, so try neighbours too.
    if (count <= 4) {
      for (const combo of combinations(ranked.slice(0, count + 3), count)) take(buildTour(combo, stats));
    }
  }
  if (nearest && (!best || best.fit.diffMinutes > CYCLE_SLACK * 60)) best = nearest;
  return { tour: best, farthest };
}

function searchRoute() {
  const v = activeVessel();
  if (!v) return null;
  const stats = vesselStats(v);
  let best = null;
  let farthest = null;
  for (const sectors of rankedMaps(v, stats)) {
    if (!sectors.length) continue;
    const { tour, farthest: miss } = searchMap(sectors, stats);
    if (miss && (!farthest || miss.distance < farthest.distance)) farthest = miss;
    if (!tour) continue;
    // tourKey already folds cycle fit and gil/hour together, so it ranks across maps too.
    if (!best || tour.key > best.key) best = { ...tour, mapId: sectors[0].mapId };
  }
  return { best: best ? { ...best, stats } : null, farthest, stats };
}

function routeSummary(ordered) {
  const { total } = currentStats(activeVessel());
  const seconds = routeSeconds(ordered, total.speed);
  const exp = ordered.reduce((a, s) => a + Number(s.exp || 0), 0);
  const fuel = ordered.reduce((a, s) => a + Number(s.ceruleum || 0), 0);
  return { seconds, exp, fuel };
}

function renderLoot(ordered, stats, costs) {
  const host = $('#loot-view');
  if (!host) return;
  host.innerHTML = '';
  if (!ordered.length) return;

  const rows = [];
  const drawing = [];
  for (const s of ordered) {
    drawing.push({ ...drawCounts(s.id, stats), sector: s });
    for (const item of itemValues(s.id, stats)) {
      rows.push({ ...item, sector: s });
    }
  }
  if (!rows.length) {
    host.append(el('div', 'vessel-meta', `该航线暂无可估价的掉落（单价均低于 ${fmt(MIN_UNIT_VALUE)} gil 或价格未取到）。`));
    return;
  }

  const merged = new Map();
  for (const r of rows) {
    const cur = merged.get(r.id) || { ...r, units: 0 };
    cur.units += r.units;
    merged.set(r.id, cur);
  }
  const list = [...merged.values()].sort((a, b) => b.units * b.price - a.units * a.price);
  const total = list.reduce((a, r) => a + r.units * r.price, 0);

  const head = el('div', 'loot-head');
  const net = costs && costs.repair ? Math.max(0, total - costs.repair.gil) : null;
  // el() sets textContent, so markup has to be assigned explicitly.
  const totalLine = el('div', null, `预计掉落价值 ${fmt(Math.round(total))} gil`);
  if (net !== null) {
    totalLine.innerHTML = `预计掉落价值 ${fmt(Math.round(total))} gil · 扣修理后 <b>${fmt(Math.round(net))} gil</b>`;
  }
  head.append(totalLine);
  const dcText = (state.marketDcs || []).join('、') || '本地大区';
  const draws = drawing.reduce((a, d) => a + d.total, 0);
  const favors = drawing.some((d) => d.favored);
  const repairText =
    costs && costs.repair && costs.repair.gil > 0
      ? ` · 已扣耐久修理 ${costs.repair.perRepair.toFixed(1)} 个材料 ≈ ${fmt(Math.round(costs.repair.gil))} gil`
      : '';
  head.append(
    el(
      'div',
      'vessel-meta',
      `价格：Universalis · ${dcText}（沉船首饰按商店回收价，不受单价门槛限制） · 每趟 ${draws} 次抽取，按解锁池与收集档折算${favors ? '（含恩惠加成）' : ''} · 单价低于 ${fmt(MIN_UNIT_VALUE)} gil 的物品不计入${repairText}`
    )
  );
  host.append(head);

  const grid = el('div', 'loot-grid');
  for (const r of list.slice(0, 12)) {
    const box = el('div', `loot-item${r === list[0] ? ' top' : ''}`);
    box.append(el('div', 'loot-name', r.name || `#${r.id}`));
    box.append(
      el('div', 'loot-value', `${r.units.toFixed(1)} 个 × ${fmt(Math.round(r.price))} = `),
    );
    const strong = el('b', null, `${fmt(Math.round(r.units * r.price))} gil`);
    box.lastChild.append(strong);
    box.append(el('div', 'vessel-meta', `来自 ${r.sector.code} ${r.sector.name}${r.vendor ? ' · 商店回收价' : ''}`));
    grid.append(box);
  }
  host.append(grid);
}

// A sector can only be ticked when the route still fits the hull's Range with it included.
function sectorStatus(sector, vessel, stats) {
  const ov = overrideFor(vessel);
  if (ov.level < sector.rank) {
    return { kind: 'locked', text: `需 Lv.${sector.rank}` };
  }
  if (state.selected.has(sector.id)) return { kind: 'ok', text: '已选' };
  if (state.selected.size >= MAX_ROUTE_POINTS) {
    return { kind: 'blocked', text: `最多 ${MAX_ROUTE_POINTS} 点` };
  }
  const picked = [...state.selected].map(sectorById).filter(Boolean);
  if (!fitsRange([...picked, sector], stats)) {
    const distance = minRouteDistance([...picked, sector]);
    return { kind: 'blocked', text: `超出航程 ${distance}/${stats.range}`, title: '超出潜水艇航程上限，无法加入这条航线' };
  }
  return { kind: 'ok', text: '可选' };
}

function unlockChainText(sector) {
  if (!sector.requires || !sector.requires.length) {
    return sector.unlockKind === 'map' ? '需上一海域末期点位' : '默认解锁';
  }
  return sector.requires
    .map((id) => {
      const from = sectorById(id);
      if (from) return `[${from.code}] ${from.name}`;
      // AutoRetainer stores 9876 where the unlock condition is not documented yet.
      return id === 9876 ? '条件未知' : `#${id}`;
    })
    .join('、');
}

let priceTimer = 0;
// Only items that have never been priced are fetched automatically; a cached figure stays until
// the user presses 「重新获取价格」.
function queuePriceFetch() {
  clearTimeout(priceTimer);
  priceTimer = setTimeout(async () => {
    // Cover the whole visible map, not just ticked stops: the table ranks by value on load too.
    const ids = refreshableIds();
    if (!ids.length) return;
    try {
      const before = ids.filter((id) => state.pricesAt[id]).length;
      await ensurePrices(ids);
      // New figures change the table's value column and the timestamp in the sidebar, so redraw.
      if (ids.filter((id) => state.pricesAt[id]).length !== before) {
        renderSectors();
        renderWorld();
        renderSummary();
      }
    } catch (err) {
      $('#summary-levels').prepend(el('div', 'status blocked', `价格读取失败：${err.message}`));
    }
  }, 400);
}

// Every drop the current map can yield, so one click refreshes all figures the table shows.
function refreshableIds() {
  const v = activeVessel();
  const sectors = (state.data.sectors || []).filter(
    (s) => String(s.mapId) === state.mapFilter && lootFor(s.id)
  );
  const ids = new Set();
  if (!v) {
    for (const s of sectors) {
      for (const tier of [0, 1, 2]) for (const drop of poolFor(s.id, tier)) ids.add(drop.id);
    }
  } else {
    const stats = vesselStats(v);
    for (const id of candidateIds([sectors])) ids.add(id);
    for (const id of state.selected) {
      for (const tier of unlockedTiers(id, stats.surveillance)) {
        for (const drop of poolFor(id, tier)) ids.add(drop.id);
      }
    }
  }
  // Repair materials are a cost, not a drop, but they need a price too.
  ids.add(REPAIR_MATERIAL_ID);
  return [...ids];
}

async function refreshPrices() {
  if (state.pricesBusy) return;
  const ids = refreshableIds();
  if (!ids.length) return;
  state.pricesBusy = true;
  state.priceError = '';
  renderWorld();
  try {
    await ensurePrices(ids, { force: true });
  } catch (err) {
    state.priceError = err.message;
  } finally {
    state.pricesBusy = false;
    renderAll();
  }
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderSectors() {
  const tbody = $('#sector-table tbody');
  tbody.innerHTML = '';
  const v = activeVessel();
  const all = state.data.sectors || [];
  if (!v) {
    const tr = el('tr');
    tr.append(el('td', 'empty', '请先选择潜水艇'));
    tbody.append(tr);
    return;
  }
  const sectors = all.filter((s) => String(s.mapId) === state.mapFilter);
  const stats = vesselStats(v);
  // A single route may cover at most 5 stops, so cap the selection.
  if (state.selected.size > MAX_ROUTE_POINTS) {
    state.selected = new Set([...state.selected].slice(-MAX_ROUTE_POINTS));
    persist();
  }

  for (const sector of sectors) {
    const tr = document.createElement('tr');
    const status = sectorStatus(sector, v, stats);
    if (status.kind !== 'ok') tr.classList.add('disabled');

    const tdCheck = el('td', 'col-check');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const checked = state.selected.has(sector.id);
    cb.checked = checked;
    // Unreachable and over-range sectors stay visible but cannot be ticked. A sector already in
    // the route stays unticked-able even if the simulated level dropped, or it could never be removed.
    cb.disabled = status.kind === 'blocked' || (status.kind === 'locked' && !checked);
    const hints = [status.title, status.kind === 'locked' && !checked ? `需 Lv.${sector.rank}，无法选择` : ''];
    const hint = hints.filter(Boolean).join('；');
    if (hint) cb.title = hint;
    const toggle = (checked) => {
      if (checked) state.selected.add(sector.id);
      else state.selected.delete(sector.id);
      persist();
      renderSectors();
      renderSummary();
      queuePriceFetch();
    };
    cb.addEventListener('change', () => toggle(cb.checked));
    // The whole row is the hit target; the checkbox keeps native behaviour when clicked directly.
    tr.addEventListener('click', (e) => {
      if (e.target === cb || cb.disabled) return;
      if (window.getSelection().toString()) return;
      cb.checked = !cb.checked;
      toggle(cb.checked);
    });
    tdCheck.append(cb);
    tr.append(tdCheck);

    const nameCell = el('td', null, sector.name);
    const code = el('span', 'sector-code', `[${sector.code}]`);
    nameCell.append(' ', code);
    tr.append(nameCell);
    tr.append(el('td', null, sector.mapName || '—'));
    tr.append(el('td', null, `Lv.${sector.rank}`));
    tr.append(el('td', null, unlockChainText(sector)));

    tr.append(el('td', null, `${Math.round(surveySeconds(sector, stats.speed) / 60)} 分`));
    tr.append(el('td', null, fmt(sector.exp)));
    tr.append(el('td', null, String(sector.ceruleum || 0)));

    const val = sectorValue(sector.id, stats);
    const gilCell = el('td', null, val.gil > 0 ? fmt(Math.round(val.gil)) : '—');
    const skipped = [];
    if (val.cheap) skipped.push(`${val.cheap} 件低于 ${fmt(MIN_UNIT_VALUE)} gil`);
    if (val.unpriced) skipped.push(`${val.unpriced} 件无报价`);
    gilCell.title =
      `解锁池 ${val.tier + 1} 档 · 抽取 ${val.draws} 次${val.favored ? '（恩惠达标）' : ''} · ` +
      `计入 ${val.priced}/${val.counted} 件${skipped.length ? `（${skipped.join('、')}）` : ''}`;
    tr.append(gilCell);

    const tdStatus = el('td');
    const badge = el('span', `status ${status.kind}`, status.text);
    if (status.title) badge.title = status.title;
    tdStatus.append(badge);
    tr.append(tdStatus);

    tbody.append(tr);
  }
}

function renderFilters() {
  const select = $('#map-filter');
  const starts = state.data.starts || [];
  const prev = state.mapFilter;
  select.innerHTML = '';
  for (const st of starts) {
    const count = (state.data.sectors || []).filter((s) => s.mapId === st.mapId).length;
    const opt = document.createElement('option');
    opt.value = String(st.mapId);
    opt.textContent = `${st.mapName}（${count}）`;
    select.append(opt);
  }
  select.value = [...select.options].some((o) => o.value === prev) ? prev : defaultMapFilter();
  state.mapFilter = select.value;
}

// Open on the active vessel's current map so the table shows where the submarine already is.
function defaultMapFilter() {
  const v = activeVessel();
  if (v && v.route && v.route.length) {
    const hit = (state.data.sectors || []).find((s) => s.id === v.route[0].id);
    if (hit) return String(hit.mapId);
  }
  const first = (state.data.starts || [])[0];
  return first ? String(first.mapId) : '';
}

function renderSummary() {
  const routeBox = $('#summary-route');
  const levelBox = $('#summary-levels');
  const v = activeVessel();
  routeBox.innerHTML = '';
  levelBox.innerHTML = '';
  if (!v) return;

  const sectors = state.data.sectors || [];
  // Keep route order: the selected ids are stored as a sequence, not a set of independent picks.
  const picked = [...state.selected].map(sectorById).filter(Boolean);
  const ov = overrideFor(v);
  const stats = vesselStats(v);

  if (!picked.length) {
    routeBox.append(el('div', null, '尚未选择航点'));
    routeBox.append(el('div', 'vessel-meta', `单次航线最多 ${MAX_ROUTE_POINTS} 个点位，勾选后显示航程与收益估算。`));
    renderLoot([], stats);
  } else {
    const { seconds, exp, fuel } = routeSummary(picked);
    const gross = picked.reduce((a, s) => a + sectorValue(s.id, stats).gil, 0);
    const repair = repairCost(picked);
    const gil = Math.max(0, gross - repair.gil);
    const fit = cycleFit(seconds, state.cycleHours);
    const distance = minRouteDistance(picked);

    routeBox.append(el('div', null, `已选 ${picked.length} / ${MAX_ROUTE_POINTS} 个点位`));
    const l1 = el('div');
    l1.innerHTML = `预计航程 <b>${fmtDuration(seconds)}</b> · 总经验 <b>${fmt(exp)}</b>`;
    routeBox.append(l1);

    const l2 = el('div');
    l2.innerHTML =
      `净收益 <b>${fmt(Math.round(gil))} gil</b> · 青磷水 <b>${fuel}</b>` +
      (repair.gil > 0 ? `<span class="vessel-meta">（掉落 ${fmt(Math.round(gross))} − 修理 ${fmt(Math.round(repair.gil))}）</span>` : '');
    routeBox.append(l2);

    if (repair.perRepair > 0) {
      routeBox.append(
        el(
          'div',
          'vessel-meta',
          `修理：每次修理消耗 ${repair.materials} 个魔导修理材料，按当前消耗约 ${repair.voyages} 趟一次，` +
            `折合每趟 ${repair.perRepair.toFixed(1)} 个` +
            (repair.unit > 0 ? ` ≈ ${fmt(Math.round(repair.gil))} gil` : '（材料价格未取到）')
        )
      );
    }

    const cycleText = `≈ ${fit.cycle} × ${state.cycleHours}h，比整点早 ${Math.round(fit.diffMinutes)} 分`;
    routeBox.append(el('div', fit.ok ? 'vessel-meta good-text' : 'vessel-meta', `收放周期：${cycleText}`));
    routeBox.append(
      el(
        'div',
        distance <= stats.range ? 'vessel-meta good-text' : 'vessel-meta',
        `航程占用：${distance} / ${stats.range}${distance > stats.range ? '（超出上限，无法出发）' : ''}`
      )
    );

    const need = (state.maxExp && state.maxExp.get(Number(ov.level))) || ov.expToNext;
    if (need > 0) {
      const pct = ((exp / need) * 100).toFixed(1);
      routeBox.append(el('div', null, `约占当前等级升级所需经验的 ${pct}%`));
    }
    routeBox.append(el('div', 'vessel-meta', `路线：${picked.map((s) => `[${s.code}]`).join(' → ')}`));
    const expPerHour = seconds > 0 ? (exp / (seconds / 3600)) : 0;
    const gilPerHour = seconds > 0 ? gil / (seconds / 3600) : 0;
    routeBox.append(
      el('div', 'vessel-meta', `效率：${fmt(Math.round(expPerHour))} 经验/小时 · ${fmt(Math.round(gilPerHour))} gil/小时`)
    );
    renderLoot(picked, stats, { gross, repair });
  }

  const nextLocked = sectors
    .filter((s) => s.rank > ov.level)
    .sort((a, b) => a.rank - b.rank)[0];
  if (nextLocked) {
    levelBox.append(el('div', null, `下一个可解锁航点：${nextLocked.name}`));
    levelBox.append(el('div', 'vessel-meta', `需要 Lv.${nextLocked.rank}（当前 Lv.${ov.level}）`));
  } else {
    levelBox.append(el('div', null, '当前等级已满足全部航点的等级要求'));
  }
  const locked = sectors.filter((s) => s.rank > ov.level).length;
  levelBox.append(el('div', 'vessel-meta', `仍有 ${locked} 个航点等级不足`));
}

function renderAll() {
  renderVessels();
  renderWorld();
  renderParts();
  renderStats();
  renderLevel();
  renderSectors();
  renderSummary();
  queuePriceFetch();
}

/* ---------- route generation ---------- */

// The search needs prices before it can rank anything, so pick candidates first, fetch, then rank.
async function generateRoute() {
  const v = activeVessel();
  if (!v) return;
  state.cycleHours = Number($('#duration-target').value) || CYCLE_HOURS;

  const btn = $('#add-route-btn');
  btn.disabled = true;
  btn.textContent = '计算中…';
  try {
    const ids = candidateIds(candidateMaps(v));
    if (ids.length) {
      try {
        await ensurePrices(ids);
      } catch (err) {
        $('#summary-levels').prepend(el('div', 'status blocked', `价格读取失败：${err.message}`));
      }
    }

    const { best, farthest, stats } = searchRoute();
    if (!best) {
      const why = farthest
        ? `没有航程在航程上限 ${stats.range} 内的航点组合（最近的也要 ${farthest.distance}）。`
        : '没有找到可用航点';
      $('#summary-levels').prepend(el('div', 'status blocked', why));
      return;
    }

    state.selected = new Set(best.ordered.map((s) => s.id));
    persist();
    renderSectors();
    renderSummary();

    const mapName = (state.data.starts || []).find((s) => s.mapId === best.mapId)?.mapName;
    if (mapName) {
      $('#summary-levels').prepend(el('div', 'vessel-meta', `自动规划海域：${mapName}`));
    }
    if (best.fit && !best.fit.ok) {
      $('#summary-levels').prepend(
        el(
          'div',
          'vessel-meta',
          `在可选航点内无法贴合 ${state.cycleHours}h 周期，最接近的是 ${fmtDuration(best.seconds)}（比整点早 ${Math.round(best.fit.diffMinutes)} 分）。`
        )
      );
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '生成路线';
  }
}

/* ---------- data loading ---------- */

// AutoRetainer 的潜艇按部队槽位排列；配置相同的几条在列表里合并显示。
// Static hosting cannot read a local AutoRetainer config, so the page starts on a plausible
// maxed-out boat the user can edit or replace with their own numbers.
const STANDALONE_VESSEL = {
  name: '示例潜水艇',
  slot: 0,
  owner: '',
  world: '海猫茶屋',
  level: 140,
  exp: 0,
  expToNext: 0,
  parts: [24362, 24355, 24364, 24361],
  currentPoints: [],
  route: [],
  demo: true,
};

async function loadVessels() {
  const badge = $('#source-badge');
  if (state.standalone) {
    // Keep any manual rows the user added locally; only the demo row is synthetic.
    state.slots = [STANDALONE_VESSEL, ...state.slots.filter((s) => s.manual)];
    if (!state.world) state.world = STANDALONE_VESSEL.world;
    state.source = '静态托管 · 未连接本地服务';
    badge.className = 'badge';
    badge.textContent = '静态模式 · 示例潜艇，可手动改配置';
    badge.title = 'GitHub Pages 等静态托管读不到本机的 AutoRetainer 配置；价格直接向 Universalis 查询。';
    if (state.activeSlot >= state.slots.length) state.activeSlot = 0;
    return;
  }
  try {
    const res = await fetch('/api/autoretainer', { cache: 'no-store' });
    const body = await res.json();
    if (!body.ok) {
      badge.className = 'badge err';
      badge.textContent = body.error || '读取失败';
      badge.title = (body.searched || []).join('\n');
      return;
    }
    const vessels = body.vessels || [];
    const kept = state.slots.filter((s) => s.manual);
    // `slot` stays the AutoRetainer slot number so overrides keep pointing at the same submarine.
    const fetched = vessels.map((v) => ({ ...v, slot: Number(v.slot) || 0 }));
    // Auto-filled worlds are only a default; the world select is the source of truth once set.
    if (!state.world) {
      const w = vessels.map((v) => v.world).find(Boolean);
      if (w) state.world = w;
    }
    state.slots = [...fetched, ...kept];
    state.source = body.source || '';
    const groups = mergeSlots(visibleSlots()).length;
    badge.className = body.demo ? 'badge' : 'badge ok';
    badge.textContent = body.demo
      ? '示例数据 · 未找到 AutoRetainer'
      : `AutoRetainer · ${vessels.length} 艘 / ${groups} 种配置`;
    badge.title = state.source;
    if (state.activeSlot >= state.slots.length) state.activeSlot = 0;
  } catch (err) {
    badge.className = 'badge err';
    badge.textContent = '无法连接本地服务';
    badge.title = String(err);
  }
}

async function loadData() {
  const res = await fetch('./data/submarine-data.json', { cache: 'no-store' });
  state.data = await res.json();
  buildPartsIndex();
  try {
    const lootRes = await fetch('./data/submarine-loot.json', { cache: 'no-store' });
    state.loot = await lootRes.json();
  } catch (_) {
    state.loot = { sectors: {} };
  }
}

function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    alert('JSON 解析失败：' + err.message);
    return;
  }
  if (parsed.parts || parsed.sectors) {
    state.data = { ...state.data, ...parsed };
    buildPartsIndex();
    renderAll();
    alert('数据已导入');
    return;
  }
  if (Array.isArray(parsed.OfflineData)) {
    alert('这是 AutoRetainer 原始配置，请放到插件配置目录后点“重新读取”。');
    return;
  }
  alert('无法识别的数据格式：需要包含 parts / sectors 字段');
}

function exportJson() {
  const v = activeVessel();
  const payload = {
    exportedAt: new Date().toISOString(),
    data: state.data,
    world: state.world,
    slots: state.slots.map((s) => {
      const ov = overrideFor(s);
      return { ...s, level: ov.level, exp: ov.exp, expToNext: ov.expToNext, parts: ov.parts };
    }),
    active: v ? vesselKey(v) : null,
    selected: [...state.selected],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `submarine-plan-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- boot ---------- */

// A GitHub Pages (or any static) deployment answers /api/autoretainer with the SPA's own HTML,
// not JSON, so a redirect or HTML body means "no backend here".
async function detectStandalone() {
  try {
    const res = await fetch('/api/autoretainer', { cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) return false;
    // Some hosts omit the content-type on their 404 page; the body settles it.
    const text = await res.text();
    JSON.parse(text);
    return false;
  } catch (_) {
    return true;
  }
}

async function boot() {
  loadStored();
  state.standalone = await detectStandalone();
  await loadData();
  await loadVessels();

  renderFilters();
  $('#duration-target').value = String(state.cycleHours);
  renderAll();

  $('#refresh-btn').addEventListener('click', async () => {
    await loadVessels();
    renderAll();
  });
  $('#export-btn').addEventListener('click', exportJson);
  $('#add-route-btn').addEventListener('click', generateRoute);
  $('#map-filter').addEventListener('change', (e) => {
    state.mapFilter = e.target.value;
    // A voyage only covers one map, so stops picked on the previous map cannot carry over.
    state.selected = new Set();
    persist();
    renderSectors();
    renderSummary();
    // The new map's drops have probably never been priced; only uncached ids are requested.
    queuePriceFetch();
  });
  $('#duration-target').addEventListener('change', (e) => {
    state.cycleHours = Number(e.target.value) || CYCLE_HOURS;
  });
  $('#clear-btn').addEventListener('click', () => {
    state.selected = new Set();
    persist();
    renderSectors();
    renderSummary();
  });
  $('#select-all').addEventListener('change', (e) => {
    const v = activeVessel();
    const all = state.data.sectors || [];
    const visible = all.filter((s) => String(s.mapId) === state.mapFilter);
    const check = e.target.checked;
    if (!check) {
      for (const s of visible) state.selected.delete(s.id);
    } else if (v) {
      // Checkbox means "select the reachable ones on this page", capped at one route.
      const ov = overrideFor(v);
      const stats = vesselStats(v);
      for (const s of visible) {
        if (s.rank > ov.level || state.selected.size >= MAX_ROUTE_POINTS) continue;
        const picked = [...state.selected].map(sectorById).filter(Boolean);
        if (!fitsRange([...picked, s], stats)) continue;
        state.selected.add(s.id);
      }
    }
    persist();
    renderSectors();
    renderSummary();
    queuePriceFetch();
  });
  $('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    importJson(await file.text());
    e.target.value = '';
  });
}

boot();
