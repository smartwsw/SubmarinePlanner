'use strict';

const STORAGE_KEY = 'submarine-planner-v2';
const SLOT_KEYS = ['hull', 'stern', 'bow', 'bridge'];
const STAT_KEYS = ['surveillance', 'retrieval', 'speed', 'range', 'durability', 'favor'];

const LANGS = ['zh', 'ja', 'en'];
const LANG_NAMES = { zh: '中文', ja: '日本語', en: 'English' };
const LANG_TAGS = { zh: 'zh-CN', ja: 'ja', en: 'en' };
const LOCALES = { zh: 'zh-CN', ja: 'ja-JP', en: 'en-US' };

// UI text in the three client languages. Placeholders are `{name}` and are filled by t(); a few
// strings carry <b> because they are assigned through innerHTML.
const I18N = {
  appTitle: { zh: '潜水艇规划器', ja: 'サブマリン・プランナー', en: 'Submarine Planner' },
  appSubtitle: {
    zh: '部队潜水艇 · 配置 / 航点 / 升级规划',
    ja: 'フリーカンパニーのサブマリン · 装備 / 航路 / 育成計画',
    en: 'Free company submersibles · parts, destinations, levelling',
  },
  badgeReading: { zh: '正在读取 AutoRetainer…', ja: 'AutoRetainer を読み込み中…', en: 'Reading AutoRetainer…' },
  btnReload: { zh: '重新读取', ja: '再読み込み', en: 'Reload' },
  btnExport: { zh: '导出配置', ja: '設定を書き出す', en: 'Export' },
  btnImport: { zh: '导入数据', ja: 'データを読み込む', en: 'Import' },

  secVessels: { zh: '潜水艇', ja: 'サブマリン', en: 'Submersibles' },
  secWorld: { zh: '服务器', ja: 'サーバー', en: 'Server' },
  secParts: { zh: '配件', ja: 'パーツ', en: 'Parts' },
  secStats: { zh: '属性', ja: '性能', en: 'Stats' },
  secLevel: { zh: '等级', ja: 'レベル', en: 'Level' },
  secPlan: { zh: '航点规划', ja: '航路計画', en: 'Route planner' },

  fieldMap: { zh: '海域', ja: '海域', en: 'Sea' },
  durationHM: { zh: '{h} 小时 {m} 分', ja: '{h} 時間 {m} 分', en: '{h}h {m}m' },
  durationH: { zh: '{h} 小时', ja: '{h} 時間', en: '{h}h' },
  fieldDuration: { zh: '目标时长', ja: '目標時間', en: 'Target time' },
  durationHours: { zh: '{n} 小时', ja: '{n} 時間', en: '{n} hours' },
  btnGenerate: { zh: '生成路线', ja: 'ルート生成', en: 'Generate route' },
  btnGenerating: { zh: '计算中…', ja: '計算中…', en: 'Working…' },
  btnClear: { zh: '清除', ja: 'クリア', en: 'Clear' },

  fieldMode: { zh: '规划模式', ja: '計画モード', en: 'Planning mode' },
  mode_value: { zh: '价值优先', ja: '売却額優先', en: 'Value first' },
  mode_target: { zh: '目标掉落优先', ja: '目標ドロップ優先', en: 'Target drops first' },
  thValueTarget: { zh: '目标掉落/趟', ja: '目標/航海', en: 'Targets/voyage' },
  targetSearchPlaceholder: {
    zh: '搜索全部掉落物，点选加入目标…',
    ja: '全ドロップから検索して目標に追加…',
    en: 'Search every drop to add a target…',
  },
  targetEmpty: {
    zh: '还没有目标 —— 在上方搜索框里找到想要的掉落物并点选。',
    ja: '目標が未選択です。上の検索欄でアイテムを探して追加してください。',
    en: 'No targets yet — search above and pick the drops you want.',
  },
  targetRemove: { zh: '移除这个目标', ja: 'この目標を外す', en: 'Remove this target' },
  targetOnMap: { zh: '本地图 {n} 个航点', ja: '本地図 {n} 航点', en: '{n} stops on this sea' },
  targetNotHere: { zh: '本地图不掉落', ja: '本地図ではドロップなし', en: 'not on this sea' },
  targetNoMatch: { zh: '没有匹配的掉落物', ja: '一致するドロップはありません', en: 'No matching drops' },
  targetLine: { zh: '目标掉落：{items}', ja: '目標ドロップ：{items}', en: 'Target drops: {items}' },
  targetNone: {
    zh: '这条航线不掉落所选目标。',
    ja: 'この航路では選択した目標はドロップしません。',
    en: 'This route drops none of the selected targets.',
  },
  targetNeeded: {
    zh: '目标掉落优先模式需要先选择至少一个目标掉落物。',
    ja: '目標ドロップ優先モードでは、目標を1つ以上選んでください。',
    en: 'Target mode needs at least one target drop selected.',
  },
  targetMissing: {
    zh: '当前海域没有等级达标的航点掉落所选目标，换一个海图或目标。',
    ja: 'この海域には選択した目標をドロップする到達可能な航点がありません。海域か目標を変えてください。',
    en: 'No reachable stop on this sea drops the selected targets — try another sea or target.',
  },
  targetQtyCell: { zh: '{n} 个', ja: '{n} 個', en: '{n}' },
  targetCount: { zh: '已选 {n} 个目标', ja: '目標 {n} 件を選択中', en: '{n} targets selected' },
  targetCardsHead: {
    zh: '目标掉落 · 每趟期望件数',
    ja: '目標ドロップ · 1航海あたりの期待数',
    en: 'Target drops · expected per voyage',
  },
  targetCardsTotal: {
    zh: '每趟合计 {units} 个 · 已选 {n} 个目标',
    ja: '1航海合計 {units} 個 · 目標 {n} 件',
    en: '{units} per voyage · {n} targets',
  },
  targetCardUnits: { zh: '每趟 {units} 个', ja: '1航海 {units} 個', en: '{units} per voyage' },
  targetCardGil: { zh: '≈ {gil} gil/趟', ja: '≈ {gil} gil/航海', en: '≈ {gil} gil/voyage' },
  targetCardMissing: { zh: '本航线不掉落', ja: 'この航路ではドロップなし', en: 'not on this route' },

  thSector: { zh: '航点', ja: '航点', en: 'Destination' },
  thMap: { zh: '海域', ja: '海域', en: 'Sea' },
  thRank: { zh: '需求等级', ja: '必要レベル', en: 'Required Lv.' },
  thUnlock: { zh: '解锁自', ja: '解放条件', en: 'Unlocked from' },
  thSurvey: { zh: '调查耗时', ja: '調査時間', en: 'Survey time' },
  thExp: { zh: '经验', ja: '経験値', en: 'EXP' },
  thCeruleum: { zh: '青磷水', ja: 'セルリアン', en: 'Ceruleum' },
  thValue: { zh: '掉落估值', ja: 'ドロップ評価', en: 'Drop value' },
  thStatus: { zh: '状态', ja: '状態', en: 'Status' },

  noVessels: {
    zh: '没有可用的潜艇配置，点下方「添加配置」新建一条。',
    ja: '利用できるサブマリン設定がありません。下の「設定を追加」から作成してください。',
    en: 'No submersible setups yet — use “Add setup” below to create one.',
  },
  addConfig: { zh: '＋ 添加配置', ja: '＋ 設定を追加', en: '+ Add setup' },
  restoreAll: { zh: '恢复全部', ja: 'すべて復元', en: 'Restore all' },
  restoreTitle: { zh: '恢复 {n} 套已删除的配置', ja: '削除した設定 {n} 件を復元', en: 'Restore {n} deleted setups' },
  shipCount: { zh: '{n} 艘', ja: '{n} 隻', en: '{n} boats' },
  pillTitle: { zh: '槽位 {slots} 使用同一套配置', ja: 'スロット {slots} が同じ設定です', en: 'Slots {slots} share this setup' },
  deleteOne: { zh: '删除这套配置', ja: 'この設定を削除', en: 'Delete this setup' },
  deleteMany: { zh: '删除这套配置（{n} 艘潜艇）', ja: 'この設定を削除（サブマリン {n} 隻）', en: 'Delete this setup ({n} boats)' },
  manualConfig: { zh: '手动配置', ja: '手動設定', en: 'Manual setup' },
  notEquipped: { zh: '未装备', ja: '未装備', en: 'Unequipped' },
  unknownPart: { zh: '未装备 #{id}', ja: '未装備 #{id}', en: 'Unequipped #{id}' },
  unknownPartOption: { zh: '未知部件 #{id}', ja: '不明なパーツ #{id}', en: 'Unknown part #{id}' },
  emptyOption: { zh: '— 未装备 —', ja: '— 未装備 —', en: '— None —' },

  btnFetchPrices: { zh: '重新获取价格', ja: '価格を再取得', en: 'Refresh prices' },
  fetching: { zh: '获取中…', ja: '取得中…', en: 'Fetching…' },
  fetchTitle: {
    zh: '忽略已有缓存，重新向 Universalis 查询当前海域的全部掉落价',
    ja: 'キャッシュを無視して、現在の海域の全ドロップ価格を Universalis に問い合わせます',
    en: 'Ignore the cache and re-query Universalis for every drop on the current sea',
  },
  priceFailed: { zh: '价格读取失败：{err}', ja: '価格の取得に失敗しました：{err}', en: 'Could not read prices: {err}' },
  priceReadFailed: { zh: '价格读取失败', ja: '価格の取得に失敗しました', en: 'Could not read prices' },
  noPricesYet: {
    zh: '尚未获取价格，勾选航点或点上方按钮。',
    ja: '価格は未取得です。航点を選ぶか上のボタンを押してください。',
    en: 'No prices yet — pick destinations or use the button above.',
  },
  pricesUpdatedAt: { zh: '价格更新于 {time}', ja: '価格の更新：{time}', en: 'Prices updated {time}' },

  slot_hull: { zh: '船体', ja: '船体', en: 'Hull' },
  slot_stern: { zh: '船尾', ja: '船尾', en: 'Stern' },
  slot_bow: { zh: '舰首', ja: '艦首', en: 'Bow' },
  slot_bridge: { zh: '舰桥', ja: '艦橋', en: 'Bridge' },
  stat_surveillance: { zh: '探索', ja: '探索', en: 'Surveillance' },
  stat_retrieval: { zh: '收集', ja: '収集', en: 'Retrieval' },
  stat_speed: { zh: '速度', ja: '速度', en: 'Speed' },
  stat_range: { zh: '航程', ja: '航行距離', en: 'Range' },
  stat_durability: { zh: '耐久', ja: '耐久力', en: 'Durability' },
  stat_favor: { zh: '恩惠', ja: '恩恵', en: 'Favor' },
    desc_surveillance: {
    zh: '达到一定值后有概率获得更高级的物品。',
    ja: '一定値に達すると、より上位のアイテムを入手できる場合があります。',
    en: 'once high enough, you may obtain rarer items',
  },
  desc_retrieval: {
    zh: '达到一定值后有概率提高获得物品的数量（部分物品无效）。',
    ja: '一定値に達すると、入手数が増える場合があります（一部アイテムを除く）。',
    en: 'once high enough, you may receive larger stacks (some items excepted)',
  },
  desc_speed: {
    zh: '减少探索时间。',
    ja: '探索時間を短縮します。',
    en: 'shortens survey time',
  },
  desc_range: {
    zh: '可以到达更远的地点或更多的地点。',
    ja: 'より遠く、より多くの地点へ到達できます。',
    en: 'lets you reach farther and more destinations',
  },
  desc_durability: { zh: '', ja: '', en: '' },
  desc_favor: {
    zh: '达到一定值后有概率获取第二件物品；到达某个阈值必定获得第二件物品。',
    ja: '一定値に達すると、2つ目のアイテムを入手できる場合があります。閾値に達すると必ず入手できます。',
    en: 'once high enough, a second item may drop; past a threshold it always does',
  },
  statSub: { zh: '部件 {parts} · 等级 {level}', ja: 'パーツ {parts} · レベル {level}', en: 'Parts {parts} · Level {level}' },
  partTier: { zh: '部件阶级：{tiers}', ja: 'パーツ階級：{tiers}', en: 'Part grades: {tiers}' },

  expProgress: { zh: '{exp} / {max} 经验', ja: '{exp} / {max} 経験値', en: '{exp} / {max} EXP' },
  simLevel: { zh: '模拟等级', ja: 'レベルを試算', en: 'Simulated level' },
  levelCovers: { zh: '等级满足 {a} / {b} 个航点', ja: 'レベル条件を満たす航点 {a} / {b}', en: 'Level meets {a} of {b} destinations' },

  selectVesselFirst: { zh: '请先选择潜水艇', ja: '先にサブマリンを選択してください', en: 'Pick a submersible first' },
  needLevel: { zh: '需 Lv.{rank}', ja: 'Lv.{rank} 必要', en: 'Needs Lv.{rank}' },
  selectedTag: { zh: '已选', ja: '選択中', en: 'Selected' },
  maxPointsTag: { zh: '最多 {n} 点', ja: '最大 {n} 地点', en: 'Max {n} stops' },
  outOfRange: { zh: '超出航程 {d}/{r}', ja: '航行距離超過 {d}/{r}', en: 'Over range {d}/{r}' },
  outOfRangeTitle: {
    zh: '超出潜水艇航程上限，无法加入这条航线',
    ja: 'サブマリンの航行距離を超えるため、この航路には追加できません',
    en: 'Over the range limit, so it cannot join this route',
  },
  availableTag: { zh: '可选', ja: '選択可', en: 'Available' },
  lockedCannotPick: { zh: '需 Lv.{rank}，无法选择', ja: 'Lv.{rank} 必要のため選択できません', en: 'Needs Lv.{rank} to select' },
  unlockDefault: { zh: '默认解锁', ja: '初期解放', en: 'Default' },
  unlockMap: { zh: '需上一海域末期点位', ja: '前の海域の終盤地点が必要', en: 'Requires a late stop on the previous sea' },
  unknownCondition: { zh: '条件未知', ja: '条件不明', en: 'Unknown condition' },
  minutes: { zh: '{n} 分', ja: '{n} 分', en: '{n} min' },
  skipCheap: { zh: '{n} 件低于 {v} gil', ja: '{n} 件は {v} gil 未満', en: '{n} items under {v} gil' },
  skipUnpriced: { zh: '{n} 件无报价', ja: '{n} 件は価格なし', en: '{n} items unpriced' },
  counted: { zh: '计入 {a}/{b} 件', ja: '{a}/{b} 件を計上', en: '{a} of {b} items counted' },
  bandText: { zh: '探索档位 {band}', ja: '探索段階 {band}', en: 'Surveillance band {band}' },
  poolLanding: { zh: '落池 {odds}', ja: '抽選先 {odds}', en: 'lands in {odds}' },
  poolLandingParen: { zh: '（落池 {odds}）', ja: '（抽選先 {odds}）', en: ' (lands in {odds})' },
  poolN: { zh: '{n}池 {pct}%', ja: 'プール{n} {pct}%', en: 'pool {n} {pct}%' },
  poolSource: { zh: '{code} {name} {n}池', ja: '{code} {name} プール{n}', en: '{code} {name} pool {n}' },
  lootMeta: {
    zh: '{lead}（沉船首饰按商店回收价，不受单价门槛限制） · {tier}，按收集档折算{favors} · 单价低于 {v} gil 的物品不计入{repair}',
    ja: '{lead}（沈没船の装飾品は店売り価格で計算し、単価の下限は適用しません） · {tier}、収集段階で換算{favors} · 単価 {v} gil 未満のアイテムは除外{repair}',
    en: '{lead} (wrecked jewellery uses vendor prices and is exempt from the cutoff) · {tier}, scaled by retrieval band{favors} · items under {v} gil are excluded{repair}',
  },
  repairDeduct: {
    zh: ' · 已扣耐久修理 {per} 个材料 ≈ {gil} gil',
    ja: ' · 耐久修理 {per} 個相当 ≈ {gil} gil を控除済み',
    en: ' · {per} repair materials ≈ {gil} gil already deducted',
  },
  favoredText: {
    zh: '恩惠达标，第二件按实测 {pct}% 折算',
    ja: '恩恵達成、2件目は実測 {pct}% で計上',
    en: 'favour met — second item counted at the measured {pct}%',
  },
  favoredSuffix: {
    zh: '，恩惠达标，第二件按实测 {pct}% 折算',
    ja: '、恩恵達成、2件目は実測 {pct}% で計上',
    en: ', favour met — second item counted at the measured {pct}%',
  },
  notFavoredText: { zh: '恩惠未达标', ja: '恩恵未達成', en: 'favour not met' },

  noStops: { zh: '尚未选择航点', ja: '航点が未選択です', en: 'No destinations picked' },
  noStopsHint: {
    zh: '单次航线最多 {n} 个点位，勾选后显示航程与收益估算。',
    ja: '1航路は最大 {n} 地点です。選択すると航行時間と収益の見積もりを表示します。',
    en: 'One route covers up to {n} stops; tick them to see time and value.',
  },
  pickedCount: { zh: '已选 {n} / {max} 个点位', ja: '{n} / {max} 地点を選択中', en: '{n} / {max} stops selected' },
  seaChart: { zh: '海图：{name}', ja: '海図：{name}', en: 'Sea chart: {name}' },
  etaLine: {
    zh: '预计航程 <b>{time}</b> · 总经验 <b>{exp}</b>',
    ja: '所要時間 <b>{time}</b> · 経験値合計 <b>{exp}</b>',
    en: 'Voyage <b>{time}</b> · Total EXP <b>{exp}</b>',
  },
  netLine: {
    zh: '净收益 <b>{gil} gil</b> · 青磷水 <b>{fuel}</b>',
    ja: '純収益 <b>{gil} gil</b> · セルリアン <b>{fuel}</b>',
    en: 'Net <b>{gil} gil</b> · Ceruleum <b>{fuel}</b>',
  },
  grossNote: {
    zh: '（掉落 {gross} − 修理 {repair}）',
    ja: '（ドロップ {gross} − 修理 {repair}）',
    en: ' (drops {gross} − repairs {repair})',
  },
  repairLine: {
    zh: '修理：每次修理消耗 {materials} 个魔导修理材料，按当前消耗约 {voyages} 趟一次，折合每趟 {per} 个',
    ja: '修理：1回の修理で魔導修理材 {materials} 個を消費し、現在の消耗なら約 {voyages} 航海に1回、1航海あたり {per} 個',
    en: 'Repairs: {materials} magitek repair materials per repair, roughly one every {voyages} voyages — {per} per voyage',
  },
  repairNoPrice: { zh: '（材料价格未取到）', ja: '（材料の価格は未取得）', en: '(material price unavailable)' },
  cycleLine: { zh: '收放周期：{text}', ja: '運航周期：{text}', en: 'Cycle: {text}' },
  cycleText: {
    zh: '≈ {cycle} × {hours}h，比整点早 {minutes} 分',
    ja: '≈ {cycle} × {hours}時間、毎時ちょうどより {minutes} 分早い',
    en: '≈ {cycle} × {hours}h, {minutes} min ahead of the hour',
  },
  rangeLine: { zh: '航程占用：{d} / {r}', ja: '航行距離：{d} / {r}', en: 'Range used: {d} / {r}' },
  rangeOver: { zh: '（超出上限，无法出发）', ja: '（上限超過のため出航できません）', en: ' (over the limit — cannot depart)' },
  expPctLine: {
    zh: '约占当前等级升级所需经验的 {pct}%',
    ja: '現在のレベルの必要経験値の約 {pct}%',
    en: 'About {pct}% of the EXP needed for the next level',
  },
  routeLine: { zh: '路线：{route}', ja: '航路：{route}', en: 'Route: {route}' },
  effLine: {
    zh: '效率：{exp} 经验/小时 · {gil} gil/小时',
    ja: '効率：{exp} 経験値/時 · {gil} gil/時',
    en: 'Efficiency: {exp} EXP/h · {gil} gil/h',
  },
  nextUnlock: { zh: '下一个可解锁航点：{name}', ja: '次に解放できる航点：{name}', en: 'Next destination to unlock: {name}' },
  needLevelFor: { zh: '需要 Lv.{rank}（当前 Lv.{level}）', ja: 'Lv.{rank} 必要（現在 Lv.{level}）', en: 'Needs Lv.{rank} (currently Lv.{level})' },
  allUnlocked: {
    zh: '当前等级已满足全部航点的等级要求',
    ja: '現在のレベルで全航点の条件を満たしています',
    en: 'The current level meets every destination’s requirement',
  },
  stillLocked: { zh: '仍有 {n} 个航点等级不足', ja: 'まだ {n} 航点がレベル不足です', en: '{n} destinations still need a higher level' },

  noValuables: {
    zh: '该航线暂无可估价的掉落（单价均低于 {v} gil 或价格未取到）。',
    ja: 'この航路に評価可能なドロップはありません（単価が {v} gil 未満、または価格未取得）。',
    en: 'Nothing on this route can be valued (all under {v} gil, or unpriced).',
  },
  lootTotal: { zh: '预计掉落价值 {v} gil', ja: 'ドロップ想定額 {v} gil', en: 'Estimated drop value {v} gil' },
  lootTotalNet: {
    zh: '预计掉落价值 {v} gil · 扣修理后 <b>{net} gil</b>',
    ja: 'ドロップ想定額 {v} gil · 修理費控除後 <b>{net} gil</b>',
    en: 'Estimated drop value {v} gil<br><b>{net} gil</b> after repairs',
  },
  localDc: { zh: '本地大区', ja: 'ローカルDC', en: 'local DC' },
  vendorPrice: { zh: '商店回收价', ja: '店売り価格', en: 'vendor price' },
  lootMetaLead: { zh: '价格：Universalis · {dc} · ', ja: '価格：Universalis · {dc} · ', en: 'Prices: Universalis · {dc} · ' },
  fromSources: { zh: '来自 {sources}', ja: '{sources} より', en: 'From {sources}' },
  slowNote: { zh: '大区日成交 {v} 件，较难出手', ja: 'DCの日次取引 {v} 件、売れにくい', en: '{v}/day across the DC — slow to sell' },
  slowTitle: {
    zh: '该物品整个大区日均成交 {v} 件，低于 {n} 件。估值仍按市场价计算，但实际卖出可能很慢。',
    ja: 'このアイテムはDC全体で1日平均 {v} 件しか取引されておらず、{n} 件を下回ります。評価額は市場価格のままですが、実際に売れるまで時間がかかる可能性があります。',
    en: 'This item trades {v} times a day across the whole DC, below {n}. The valuation still uses the market price, but selling may be slow.',
  },
  lootUnit: { zh: '{units} 个 × {price} = ', ja: '{units} 個 × {price} = ', en: '{units} × {price} = ' },
  qtyTag: { zh: '数量 {label} {range}', ja: '数量 {label} {range}', en: 'Qty {label} {range}' },
  qtyRange: { zh: '{a}–{b} 个', ja: '{a}–{b} 個', en: '{a}–{b}' },
  ret_0: { zh: '收集差', ja: '収集・低', en: 'retrieval low' },
  ret_1: { zh: '收集普通', ja: '収集・標準', en: 'retrieval standard' },
  ret_2: { zh: '收集最优', ja: '収集・最良', en: 'retrieval best' },
  band_0: { zh: '达不到 T2', ja: 'T2未満', en: 'below T2' },
  band_1: { zh: '达到 T2', ja: 'T2到達', en: 'reaches T2' },
  band_2: { zh: '达到 T3', ja: 'T3到達', en: 'reaches T3' },

  noRouteRange: {
    zh: '没有航程在航程上限 {r} 内的航点组合（最近的也要 {d}）。',
    ja: '航行距離上限 {r} に収まる組み合わせがありません（最短でも {d}）。',
    en: 'No combination fits the {r} range (the closest needs {d}).',
  },
  noRoute: { zh: '没有找到可用航点', ja: '利用できる航点が見つかりません', en: 'No usable destinations found' },
  autoMap: { zh: '自动规划海域：{name}', ja: '自動選定海域：{name}', en: 'Planned on {name}' },
  cycleMiss: {
    zh: '在可选航点内无法贴合 {h}h 周期，最接近的是 {time}（比整点早 {m} 分）。',
    ja: '選択可能な航点では {h}時間周期に合わせられません。最も近いのは {time}（毎時ちょうどより {m} 分早い）です。',
    en: 'Cannot match a {h}h cycle with the available destinations; closest is {time} ({m} min ahead of the hour).',
  },

  jsonParseFailed: { zh: 'JSON 解析失败：{err}', ja: 'JSON の解析に失敗しました：{err}', en: 'Could not parse JSON: {err}' },
  dataImported: { zh: '数据已导入', ja: 'データを読み込みました', en: 'Data imported' },
  autoretainerRaw: {
    zh: '这是 AutoRetainer 原始配置，请放到插件配置目录后点“重新读取”。',
    ja: 'これは AutoRetainer の生設定です。プラグインの設定フォルダに置いて「再読み込み」を押してください。',
    en: 'This is a raw AutoRetainer config — place it in the plugin config folder, then press Reload.',
  },
  unknownFormat: {
    zh: '无法识别的数据格式：需要包含 parts / sectors 字段',
    ja: '認識できない形式です：parts / sectors フィールドが必要です',
    en: 'Unrecognised format — expected parts / sectors fields',
  },
  staticSource: { zh: '静态托管 · 未连接本地服务', ja: '静的ホスティング · ローカルサービス未接続', en: 'Static hosting · no local service' },
  staticBadge: {
    zh: '静态模式 · 示例潜艇，可手动改配置',
    ja: '静的モード · サンプルのサブマリン（設定は手動で変更可）',
    en: 'Static mode · sample submersible, edit it freely',
  },
  staticBadgeTitle: {
    zh: 'GitHub Pages 等静态托管读不到本机的 AutoRetainer 配置；价格直接向 Universalis 查询。',
    ja: 'GitHub Pages などの静的ホスティングではローカルの AutoRetainer 設定を読めません。価格は Universalis に直接問い合わせます。',
    en: 'Static hosting such as GitHub Pages cannot read a local AutoRetainer config; prices are queried from Universalis directly.',
  },
  readFailed: { zh: '读取失败', ja: '読み込み失敗', en: 'Read failed' },
  demoBadge: { zh: '示例数据 · 未找到 AutoRetainer', ja: 'サンプルデータ · AutoRetainer が見つかりません', en: 'Sample data · AutoRetainer not found' },
  arBadge: {
    zh: 'AutoRetainer · {vessels} 艘 / {groups} 种配置',
    ja: 'AutoRetainer · {vessels} 隻 / {groups} 設定',
    en: 'AutoRetainer · {vessels} boats / {groups} setups',
  },
  cannotConnect: { zh: '无法连接本地服务', ja: 'ローカルサービスに接続できません', en: 'Cannot reach the local service' },
  viewWorld: { zh: '世界 / 大区', ja: 'ワールド / DC', en: 'World / DC' },
  langLabel: { zh: '语言', ja: '言語', en: 'Language' },
};

function t(key, vars) {
  const entry = I18N[key];
  let s = entry ? entry[state.lang] || entry.zh : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

// Names come from the data files as `{ names: {zh, ja, en} }`; the older single `name` fields stay
// as the fallback so a hand-edited import still renders.
function localized(obj, fallback) {
  const names = obj && obj.names;
  const value = names && names[state.lang];
  return value || (obj && obj.name) || fallback || '';
}

function slotLabel(key) {
  return t(`slot_${key}`);
}
function statLabel(key) {
  return t(`stat_${key}`);
}
function statDesc(key) {
  return t(`desc_${key}`);
}
function bandLabel(tier) {
  return t(`band_${tier}`);
}
function retLabel(tier) {
  return t(`ret_${tier}`);
}

// "pool 1 51% / pool 2 33%" for one draw distribution, shared by the tooltip and the loot header.
function poolOddsText(drawings) {
  return [
    ...new Set(
      drawings.map((d) =>
        d.weights
          .map((w, i) => (w > 0 ? t('poolN', { n: i + 1, pct: Math.round(w * 100) }) : null))
          .filter(Boolean)
          .join(' / ')
      )
    ),
  ];
}

const state = {
  data: null,
  loot: null,
  slots: [],
  source: '',
  activeSlot: 0,
  hidden: new Set(),
  overrides: {},
  selected: new Set(),
  // Planning mode: 'value' ranks routes by gil, 'target' ranks by expected units of the items the
  // user asked for. The target ids need no prices, so they are stored on their own.
  mode: 'value',
  targets: new Set(),
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
  lang: 'zh',
  sourceInfo: null,
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
  return Number(n || 0).toLocaleString(LOCALES[state.lang] || LOCALES.zh);
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.overrides = saved.overrides || {};
    state.selected = new Set(saved.selected || []);
    if (saved.mode === 'target' || saved.mode === 'value') state.mode = saved.mode;
    state.targets = new Set(saved.targets || []);
    state.cycleHours = Number(saved.cycleHours) || 24;
    state.world = saved.world || '';
    state.slots = Array.isArray(saved.slots) ? saved.slots : [];
    state.hidden = new Set(saved.hidden || []);
    state.prices = saved.prices || {};
    state.pricesAt = saved.pricesAt || {};
    state.pricesFetchedAt = Number(saved.pricesFetchedAt) || 0;
    if (LANGS.includes(saved.lang)) state.lang = saved.lang;
  } catch (_) {
    /* ignore corrupt storage */
  }
}

function persist() {
  const payload = {
    overrides: state.overrides,
    selected: [...state.selected],
    mode: state.mode,
    targets: [...state.targets],
    cycleHours: state.cycleHours,
    world: state.world,
    lang: state.lang,
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
      state.partsIndex.set(Number(part.id), { slot, part, label: localized(part) });
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

// Both spellings at once, e.g. 1改/S+. The Chinese half is only useful to a Chinese reader, so the
// other two languages show the single code they use themselves.
function partLabel(partId) {
  const real = partCode(partId, 'zh');
  if (!real) return '';
  return state.lang === 'zh' ? `${real}/${partCode(partId, 'en')}` : partCode(partId, 'en');
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
      : { id: Number(id), slot: null, name: t('unknownPart', { id }), label: t('notEquipped'), surveillance: 0, retrieval: 0, speed: 0, range: 0, durability: 0, favor: 0, tier: '—' };
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
  for (const key of STAT_KEYS) total[key] = Number(bonus[key] || 0);
  for (const p of parts) {
    for (const key of STAT_KEYS) total[key] += Number(p[key] || 0);
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
    host.append(el('p', 'empty', t('noVessels')));
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
      const pill = el('span', 'pill', t('shipCount', { n: group.length }));
      pill.title = t('pillTitle', { slots: group.map((s) => s.slot + 1).join(', ') });
      right.append(pill);
    }
    row.addEventListener('click', () => {
      state.activeSlot = index;
      renderAll();
    });
    const del = el('button', 'vessel-del', '✕');
    del.title = group.length > 1 ? t('deleteMany', { n: group.length }) : t('deleteOne');
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroups([group]);
    });
    right.append(del);
    row.append(left, right);
    host.append(row);
  });

  const tools = el('div', 'vessel-tools');
  const add = el('button', 'btn', t('addConfig'));
  add.addEventListener('click', addSlot);
  tools.append(add);
  // Only offered once the user has hidden something, so there is a way back.
  if (state.hidden.size) {
    const undo = el('button', 'btn', t('restoreAll'));
    undo.title = t('restoreTitle', { n: state.hidden.size });
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
    name: t('manualConfig'),
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
  const reload = el('button', 'btn', state.pricesBusy ? t('fetching') : t('btnFetchPrices'));
  reload.disabled = state.pricesBusy || !state.data;
  reload.title = t('fetchTitle');
  reload.addEventListener('click', refreshPrices);
  row.append(reload);
  host.append(row);

  // Prices are never discarded on a timer, so state clearly how old the figures are.
  const at = state.pricesFetchedAt;
  let note;
  if (state.priceError) note = t('priceFailed', { err: state.priceError });
  else if (!at) note = t('noPricesYet');
  else note = t('pricesUpdatedAt', { time: fmtTime(at) });
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
    row.append(el('label', null, slotLabel(slot)));
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '0';
    empty.textContent = t('emptyOption');
    select.append(empty);
    for (const part of parts[slot] || []) {
      const opt = document.createElement('option');
      opt.value = String(part.id);
      // `partId` is the SubmarinePart row id the code is derived from; `id` is the item id.
      opt.textContent = `${localized(part)}${partLabel(part.partId) ? ` (${partLabel(part.partId)})` : ''}`;
      opt.title = `${localized(part)} · #${part.partId} / #${part.id}`;
      select.append(opt);
    }
    const currentId = String(ov.parts[slotIndex] ?? 0);
    select.value = currentId;
    if (select.value !== currentId) {
      const unknown = document.createElement('option');
      unknown.value = currentId;
      unknown.textContent = t('unknownPartOption', { id: currentId });
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
  for (const key of STAT_KEYS) {
    const box = el('div', 'stat');
    const desc = statDesc(key);
    if (desc) box.title = desc;
    box.append(el('div', 'stat-label', statLabel(key)));
    box.append(el('div', 'stat-value', fmt(total[key])));
    const fromParts = parts.reduce((a, p) => a + Number(p[key] || 0), 0);
    box.append(el('div', 'stat-sub', t('statSub', { parts: fmt(fromParts), level: fmt(bonus[key]) })));
    // The in-game effect text, so the numbers mean something without a wiki open.
    if (desc) box.append(el('div', 'stat-desc', desc));
    grid.append(box);
  }
  host.append(grid);

  const diff = el('div', 'vessel-meta');
  diff.style.marginTop = '10px';
  const tiers = parts.map((p) => p.tier || '?').join(' / ');
  diff.textContent = t('partTier', { tiers: tiers || '—' });
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
  meta.append(el('span', null, t('expProgress', { exp: fmt(ov.exp), max: fmt(expToNext) })));
  host.append(meta);

  const edit = el('div', 'part-row');
  edit.style.marginTop = '10px';
  edit.style.gridTemplateColumns = '48px 1fr';
  edit.append(el('label', null, t('simLevel')));
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
  host.append(
    el('div', 'vessel-meta', t('levelCovers', { a: unlocked, b: (state.data.sectors || []).length }))
  );
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
  return m ? t('durationHM', { h, m }) : t('durationH', { h });
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

// Surveillance does not decide the pool outright — it decides how high a band the voyage rolls
// into, and the band only sets the ceiling. The crowd data (60M records, one per voyage) shows a
// build that can reach tier 3 still lands in pool 1 / 2 / 3 about 51% / 33% / 16% of the time.
// weights[band] is that distribution, baked per sector by tools/bake_band_weights.js, so value
// has to be summed over all three pools weighted by it rather than read off the top pool alone.
function surveillanceTier(sectorId, surveillance) {
  const t = thresholdsFor(sectorId);
  if (!t) return 0;
  if (t.t3 > 0 && surveillance >= t.t3) return 2;
  if (t.t2 > 0 && surveillance >= t.t2) return 1;
  return 0;
}

function bandName(tier) {
  return ['low', 'mid', 'high'][tier] || 'low';
}

// Pool probabilities for this vessel's capability band. Sectors with no baked weights predate
// them or had no crowd samples; treat them as certain to land in the band's best pool, which is
// what the old model did, rather than silently dropping their value.
function poolWeights(sectorId, tier) {
  const entry = lootFor(sectorId);
  const baked = entry && entry.weights && entry.weights[bandName(tier)];
  if (Array.isArray(baked) && baked.length === 3) return baked;
  const fallback = [0, 0, 0];
  fallback[tier] = 1;
  return fallback;
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

// Meeting the favour line does not always yield a second item: the crowd data counts a chance
// every time favour was satisfied and a double-dip whenever a second one actually came back,
// which lands around 82% with a surplus. Use that measured rate instead of assuming two items.
const SECOND_ITEM_FALLBACK = 0.8;

function secondItemChance(sectorId, stats) {
  if (!favorMet(sectorId, stats.favor)) return 0;
  const entry = lootFor(sectorId);
  const rate = entry && Number(entry.secondItem);
  return rate > 0 ? Math.min(1, rate) : SECOND_ITEM_FALLBACK;
}

// One pool drops per visit, chosen by the weights above; the favour bonus adds a second draw at
// the measured rate, so every pool's value is scaled by (1 + secondItemChance).
function drawCounts(sectorId, stats) {
  const tier = surveillanceTier(sectorId, stats.surveillance);
  const weights = poolWeights(sectorId, tier);
  const second = secondItemChance(sectorId, stats);
  return {
    weights,
    total: 1 + second,
    second,
    favorMet: favorMet(sectorId, stats.favor),
    tier,
  };
}

function poolFor(sectorId, tier) {
  const entry = lootFor(sectorId);
  if (!entry) return [];
  return entry.pools[String(tier + 1)] || [];
}

// Expected units per visit: chance * midpoint of the [min,max] range for this retrieval tier.
// The retrieval band an item's quantity was taken from, for display: 收集差/普通/最优 plus the range.
function qtyBand(itemId, sectorId, stats, tier) {
  const ret = retrievalTier(sectorId, stats.retrieval);
  const drop = poolFor(sectorId, tier).find((d) => d.id === itemId);
  const q = (drop && drop.qty) || [];
  if (q.length < 6) return null;
  // Mirror expectedUnits' fallback so the label matches the number actually used.
  let used = ret;
  if ((q[used * 2 + 1] || 0) <= 0) {
    used = -1;
    for (let t = ret - 1; t >= 0; t -= 1) {
      if ((q[t * 2 + 1] || 0) > 0) { used = t; break; }
    }
  }
  if (used < 0) return null;
  return { label: retLabel(used), range: t('qtyRange', { a: q[used * 2], b: q[used * 2 + 1] }) };
}

function expectedUnits(drop, retTier) {
  const q = drop.qty || [];
  if (q.length < 6) return drop.chance || 0;
  const min = q[retTier * 2] || 0;
  const max = q[retTier * 2 + 1] || 0;
  // Some items have no recorded quantity at the optimal tier ([0,0], 252 entries). That is missing
  // data, not "you get nothing for collecting better", so fall back to the highest tier that has one.
  if (max <= 0) {
    for (let tier = retTier - 1; tier >= 0; tier -= 1) {
      const lo = q[tier * 2] || 0;
      const hi = q[tier * 2 + 1] || 0;
      if (hi > 0) return (drop.chance || 0) * ((lo + hi) / 2);
    }
    return drop.chance || 0;
  }
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

// Universalis 的 regularSaleVelocity 在大区查询下已经是整个大区的日成交件数（不是挂牌数），
// 所以这里不需要再按服务器换算。低于这个量的物品挂在市场上要很久才卖得掉，卡片标红提醒，
// 但估值照常计算——成交慢不代表不值钱。
const LOW_VOLUME_PER_DAY = 5;

// 返回该物品的大区日成交量，取不到时返回 null（不显示警告，而不是假装是 0）。
function saleVelocity(itemId) {
  if (!needsMarketPrice(itemId)) return null;
  const hit = state.prices && state.prices[itemId];
  if (!hit) return null;
  return Number(hit.units) || 0;
}

function isSlowMoving(itemId) {
  const velocity = saleVelocity(itemId);
  return velocity !== null && velocity < LOW_VOLUME_PER_DAY;
}

// Gil from one visit to a sector: every pool this vessel's band can land in, weighted by how often
// it does, times the chance the favour bonus brings a second item back. Items worth less than
// MIN_UNIT_VALUE are dropped from the sum so bulk raw materials do not crowd out the gear that
// actually pays.
function sectorValue(sectorId, stats) {
  const ret = retrievalTier(sectorId, stats.retrieval);
  const { weights, total, favorMet: favored, second } = drawCounts(sectorId, stats);
  let gil = 0;
  let priced = 0;
  let cheap = 0;
  let unpriced = 0;
  let counted = 0;
  for (const tier of [0, 1, 2]) {
    const weight = weights[tier];
    if (!weight) continue;
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
      gil += expectedUnits(drop, ret) * price * weight * (1 + second);
    }
  }
  return {
    gil,
    tier: surveillanceTier(sectorId, stats.surveillance),
    weights,
    second,
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
  const { weights, second } = drawCounts(sectorId, stats);
  const rows = [];
  for (const tier of [0, 1, 2]) {
    const weight = weights[tier];
    if (!weight) continue;
    for (const drop of poolFor(sectorId, tier)) {
      const price = priceOf(drop.id);
      if (price <= 0) continue;
      if (price < MIN_UNIT_VALUE && ignLowValue(drop.id)) continue;
      rows.push({
        id: drop.id,
        name: drop.name,
        names: drop.names,
        tier,
        vendor: Boolean(VENDOR_PRICES[drop.id]),
        units: expectedUnits(drop, ret) * weight * (1 + second),
        price,
      });
    }
  }
  return rows.sort((a, b) => b.units * b.price - a.units * a.price);
}

// Every item that can drop anywhere, for the target search box. Built once from the loot table;
// the names dict is language independent, so switching language needs no rebuild.
function dropCatalog() {
  if (state.dropCatalog) return state.dropCatalog;
  const seen = new Map();
  const sectors = (state.loot && state.loot.sectors) || {};
  for (const entry of Object.values(sectors)) {
    for (const pool of Object.values(entry.pools || {})) {
      for (const drop of pool) {
        if (!seen.has(drop.id)) seen.set(drop.id, { id: drop.id, name: drop.name, names: drop.names });
      }
    }
  }
  // The search box matches without regard to case or script, so a precomputed haystack is worth it.
  state.dropCatalog = [...seen.values()].map((d) => {
    const n = d.names || {};
    d.hay = [d.name, n.zh, n.ja, n.en].filter(Boolean).join(' ').toLowerCase();
    return d;
  });
  return state.dropCatalog;
}

// Expected units of the wanted items from one visit, using exactly the pool weighting and favour
// rate that sectorValue uses. No prices anywhere: the target mode is about getting the item, not
// about what it sells for.
function targetUnits(sectorId, stats, targets) {
  const ret = retrievalTier(sectorId, stats.retrieval);
  const { weights, second } = drawCounts(sectorId, stats);
  const hits = new Map();
  let units = 0;
  for (const tier of [0, 1, 2]) {
    const weight = weights[tier];
    if (!weight) continue;
    for (const drop of poolFor(sectorId, tier)) {
      if (!targets.has(drop.id)) continue;
      const u = expectedUnits(drop, ret) * weight * (1 + second);
      units += u;
      hits.set(drop.id, (hits.get(drop.id) || 0) + u);
    }
  }
  return { units, hits };
}

// The single place that answers "how good is this stop", so the tour search ranks by whichever
// mode is active without every call site knowing about it.
function stopScore(sectorId, stats) {
  if (state.mode === 'target') return targetUnits(sectorId, stats, state.targets).units;
  return sectorValue(sectorId, stats).gil;
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
  if (!body.ok) throw new Error(body.error || t('priceReadFailed'));
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
  const perStop = new Map(sectorList.map((s) => [s.id, stopScore(s.id, stats)]));
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

// Every pool this vessel's band can land in contributes to the valuation, so all of their items
// need a price. Target mode ranks by units, not gil, so it needs none of them.
function candidateIds(maps) {
  if (state.mode === 'target') return [];
  const v = activeVessel();
  const surveillance = v ? vesselStats(v).surveillance : 0;
  const ids = new Set();
  for (const sectors of maps) {
    for (const s of sectors) {
      const weights = poolWeights(s.id, surveillanceTier(s.id, surveillance));
      for (const tier of [0, 1, 2]) {
        if (!weights[tier]) continue;
        for (const drop of poolFor(s.id, tier)) ids.add(drop.id);
      }
    }
  }
  return [...ids];
}

// The tour search is combinatorial, so each map contributes only its richest stops. Target mode
// cannot filter out the stops that carry no wanted item — those still set the route's travel time,
// and a voyage must visit something — so it falls back to gil to order the rest.
function rankedMaps(v, stats) {
  return candidateMaps(v).map((sectors) =>
    sectors
      .map((s) => ({
        sector: s,
        value: stopScore(s.id, stats),
        gil: sectorValue(s.id, stats).gil,
      }))
      .sort((a, b) => b.value - a.value || b.gil - a.gil)
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

// Target mode shows what the voyage actually brings back for the wanted items. The value cards
// cannot serve that: they drop anything under MIN_UNIT_VALUE, and a cheap target would simply not
// appear even though the route was planned around it.
function renderTargetLoot(ordered, stats) {
  const host = $('#loot-view');
  const ids = [...state.targets];
  if (!ids.length) return;

  // Unit counts are the same ones the tour search scored, so the cards explain the route.
  const perTarget = new Map(ids.map((id) => [id, { id, units: 0, pools: [] }]));
  for (const s of ordered) {
    const { hits } = targetUnits(s.id, stats, state.targets);
    for (const [id, units] of hits) {
      const cur = perTarget.get(id);
      if (!cur) continue;
      cur.units += units;
      for (const tier of [0, 1, 2]) {
        if (!poolFor(s.id, tier).some((d) => d.id === id)) continue;
        cur.pools.push({ tier, sectorId: s.id, sector: s });
      }
    }
  }
  const list = [...perTarget.values()].sort((a, b) => b.units - a.units);
  const total = list.reduce((a, r) => a + r.units, 0);

  const head = el('div', 'loot-head');
  head.append(el('div', null, t('targetCardsHead')));
  head.append(
    el('div', 'vessel-meta', t('targetCardsTotal', { units: total.toFixed(2), n: ids.length }))
  );
  host.append(head);

  const grid = el('div', 'loot-grid');
  for (const r of list) {
    const drop = targetById(r.id);
    const box = el('div', `loot-item${r === list[0] && r.units > 0 ? ' top' : ''}`);
    box.append(el('div', 'loot-name', localized(drop) || `#${r.id}`));
    if (r.units > 0) {
      box.append(el('div', 'loot-value', t('targetCardUnits', { units: r.units.toFixed(2) })));
      const price = priceOf(r.id);
      // A target may simply have no market price — units are the point, gil is a bonus.
      if (price > 0) {
        box.append(el('div', 'loot-value', t('targetCardGil', { gil: fmt(Math.round(r.units * price)) })));
      }
      const sources = r.pools
        .map((p) => t('poolSource', { code: p.sector.code, name: localized(p.sector), n: p.tier + 1 }))
        .join(', ');
      box.append(el('div', 'vessel-meta', t('fromSources', { sources })));
      const tags = new Set();
      for (const p of r.pools) {
        const band = qtyBand(r.id, p.sectorId, stats, p.tier);
        if (!band) continue;
        const text = t('qtyTag', { label: band.label, range: band.range });
        if (tags.has(text)) continue;
        tags.add(text);
        box.append(el('div', 'loot-tag', text));
      }
    } else {
      box.append(el('div', 'vessel-meta', t('targetCardMissing')));
    }
    grid.append(box);
  }
  host.append(grid);
}

function renderLoot(ordered, stats, costs) {
  const host = $('#loot-view');
  if (!host) return;
  host.innerHTML = '';
  if (state.mode === 'target') {
    if (ordered.length) renderTargetLoot(ordered, stats);
    return;
  }
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
    host.append(el('div', 'vessel-meta', t('noValuables', { v: fmt(MIN_UNIT_VALUE) })));
    return;
  }

  const merged = new Map();
  for (const r of rows) {
    const cur = merged.get(r.id) || { ...r, units: 0, pools: [] };
    cur.units += r.units;
    // The same item can sit in more than one pool of more than one stop; keep each pairing so the
    // quantity label and the source line stay accurate.
    if (!cur.pools.some((p) => p.tier === r.tier && p.sectorId === r.sector.id)) {
      cur.pools.push({ tier: r.tier, sectorId: r.sector.id, sector: r.sector });
    }
    merged.set(r.id, cur);
  }
  const list = [...merged.values()].sort((a, b) => b.units * b.price - a.units * a.price);
  const total = list.reduce((a, r) => a + r.units * r.price, 0);

  const head = el('div', 'loot-head');
  const net = costs && costs.repair ? Math.max(0, total - costs.repair.gil) : null;
  // el() sets textContent, so markup has to be assigned explicitly.
  const totalLine = el('div', null, t('lootTotal', { v: fmt(Math.round(total)) }));
  if (net !== null) {
    totalLine.innerHTML = t('lootTotalNet', { v: fmt(Math.round(total)), net: fmt(Math.round(net)) });
  }
  head.append(totalLine);
  const dcText = (state.marketDcs || []).join(', ') || t('localDc');
  // A stop lands in a pool by chance, so show the band the vessel rolls into and where that lands.
  const bands = [...new Set(drawing.map((d) => bandLabel(d.tier)))].sort();
  const odds = poolOddsText(drawing);
  const favors = drawing.every((d) => d.favorMet);
  const tierText =
    t('bandText', { band: bands.join('/') }) + t('poolLandingParen', { odds: odds.join(' · ') });
  const repairText =
    costs && costs.repair && costs.repair.gil > 0
      ? t('repairDeduct', {
          per: costs.repair.perRepair.toFixed(1),
          gil: fmt(Math.round(costs.repair.gil)),
        })
      : '';
  const favorsText = favors ? t('favoredSuffix', { pct: Math.round((drawing[0].second || 0) * 100) }) : '';
  head.append(
    el(
      'div',
      'vessel-meta',
      t('lootMeta', {
        lead: t('lootMetaLead', { dc: dcText }),
        tier: tierText,
        favors: favorsText,
        v: fmt(MIN_UNIT_VALUE),
        repair: repairText,
      })
    )
  );
  host.append(head);

  const grid = el('div', 'loot-grid');
  for (const r of list.slice(0, 12)) {
    const slow = isSlowMoving(r.id);
    const box = el('div', `loot-item${r === list[0] ? ' top' : ''}${slow ? ' slow' : ''}`);
    box.append(el('div', 'loot-name', localized(r) || `#${r.id}`));
    box.append(
      el('div', 'loot-value', t('lootUnit', { units: r.units.toFixed(1), price: fmt(Math.round(r.price)) })),
    );
    const strong = el('b', null, `${fmt(Math.round(r.units * r.price))} gil`);
    box.lastChild.append(strong);
    const velocity = saleVelocity(r.id);
    const sources = r.pools
      .map((p) => t('poolSource', { code: p.sector.code, name: localized(p.sector), n: p.tier + 1 }))
      .join(', ');
    let note = t('fromSources', { sources }) + (r.vendor ? ` · ${t('vendorPrice')}` : '');
    if (slow) note += ` · ${t('slowNote', { v: velocity.toFixed(1) })}`;
    box.append(el('div', 'vessel-meta', note));
    // Quantity depends on the retrieval tier, so show each band that contributed. Stops on the same
    // map often share a band, so dedupe rather than printing the same tag once per stop.
    const tag = new Set();
    for (const p of r.pools) {
      const band = qtyBand(r.id, p.sectorId, stats, p.tier);
      if (!band) continue;
      const text = t('qtyTag', { label: band.label, range: band.range });
      if (tag.has(text)) continue;
      tag.add(text);
      box.append(el('div', 'loot-tag', text));
    }
    if (slow) box.title = t('slowTitle', { v: velocity.toFixed(1), n: LOW_VOLUME_PER_DAY });
    grid.append(box);
  }
  host.append(grid);
}

// A sector can only be ticked when the route still fits the hull's Range with it included.
function sectorStatus(sector, vessel, stats) {
  const ov = overrideFor(vessel);
  if (ov.level < sector.rank) {
    return { kind: 'locked', text: t('needLevel', { rank: sector.rank }) };
  }
  if (state.selected.has(sector.id)) return { kind: 'ok', text: t('selectedTag') };
  if (state.selected.size >= MAX_ROUTE_POINTS) {
    return { kind: 'blocked', text: t('maxPointsTag', { n: MAX_ROUTE_POINTS }) };
  }
  const picked = [...state.selected].map(sectorById).filter(Boolean);
  if (!fitsRange([...picked, sector], stats)) {
    const distance = minRouteDistance([...picked, sector]);
    return {
      kind: 'blocked',
      text: t('outOfRange', { d: distance, r: stats.range }),
      title: t('outOfRangeTitle'),
    };
  }
  return { kind: 'ok', text: t('availableTag') };
}

function unlockChainText(sector) {
  if (!sector.requires || !sector.requires.length) {
    return sector.unlockKind === 'map' ? t('unlockMap') : t('unlockDefault');
  }
  return sector.requires
    .map((id) => {
      const from = sectorById(id);
      if (from) return `[${from.code}] ${localized(from)}`;
      // AutoRetainer stores 9876 where the unlock condition is not documented yet.
      return id === 9876 ? t('unknownCondition') : `#${id}`;
    })
    .join(', ');
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
      $('#summary-levels').prepend(el('div', 'status blocked', t('priceFailed', { err: err.message })));
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
      const weights = poolWeights(id, surveillanceTier(id, stats.surveillance));
      for (const tier of [0, 1, 2]) {
        if (!weights[tier]) continue;
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

// The badge's wording is language dependent. Re-running the loader would rebuild it, but that also
// refetches prices, so keep the facts around and redraw just the label.
function relabelSource() {
  const badge = $('#source-badge');
  if (!badge) return;
  const info = state.sourceInfo || {};
  if (state.standalone) {
    badge.textContent = t('staticBadge');
    badge.title = t('staticBadgeTitle');
  } else if (info.error) {
    badge.textContent = info.error || t('readFailed');
    badge.title = state.source;
  } else if (info.demo) {
    badge.textContent = t('demoBadge');
    badge.title = state.source;
  } else if (info.vessels !== undefined) {
    badge.textContent = t('arBadge', { vessels: info.vessels, groups: info.groups });
    badge.title = state.source;
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
    tr.append(el('td', 'empty', t('selectVesselFirst')));
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
    const hints = [status.title, status.kind === 'locked' && !checked ? t('lockedCannotPick', { rank: sector.rank }) : ''];
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

    const nameCell = el('td', null, localized(sector));
    const code = el('span', 'sector-code', `[${sector.code}]`);
    nameCell.append(' ', code);
    tr.append(nameCell);
    tr.append(el('td', null, mapNameOf(sector.mapId) || '—'));
    tr.append(el('td', null, `Lv.${sector.rank}`));
    tr.append(el('td', null, unlockChainText(sector)));

    tr.append(el('td', null, t('minutes', { n: Math.round(surveySeconds(sector, stats.speed) / 60) })));
    tr.append(el('td', null, fmt(sector.exp)));
    tr.append(el('td', null, String(sector.ceruleum || 0)));

    // Target mode swaps the gil column for expected units of the wanted items; the gil figure is
    // still computed for the tooltip so the row keeps both readings.
    const val = sectorValue(sector.id, stats);
    const target = state.mode === 'target' ? targetUnits(sector.id, stats, state.targets) : null;
    const gilCell = el(
      'td',
      null,
      target
        ? target.units > 0
          ? t('targetQtyCell', { n: target.units.toFixed(2) })
          : '—'
        : val.gil > 0
          ? fmt(Math.round(val.gil))
          : '—'
    );
    const skipped = [];
    if (val.cheap) skipped.push(t('skipCheap', { n: val.cheap, v: fmt(MIN_UNIT_VALUE) }));
    if (val.unpriced) skipped.push(t('skipUnpriced', { n: val.unpriced }));
    gilCell.title = [
      target ? t('lootTotal', { v: fmt(Math.round(val.gil)) }) : null,
      `${t('bandText', { band: bandLabel(val.tier) })}, ${t('poolLanding', { odds: poolOddsText([val])[0] })}`,
      val.favored ? t('favoredText', { pct: Math.round(val.second * 100) }) : t('notFavoredText'),
      t('counted', { a: val.priced, b: val.counted }) + (skipped.length ? ` (${skipped.join(', ')})` : ''),
    ]
      .filter(Boolean)
      .join(' · ');
    tr.append(gilCell);

    const tdStatus = el('td');
    const badge = el('span', `status ${status.kind}`, status.text);
    if (status.title) badge.title = status.title;
    tdStatus.append(badge);
    tr.append(tdStatus);

    tbody.append(tr);
  }
}

/* ---------- planning mode / target drops ---------- */

const TARGET_SUGGEST_LIMIT = 30;

// drop id -> the sectors it can appear on. The search box asks this for every keystroke, so it is
// built once per loot table instead of rescanning 143 sectors per candidate.
function dropSectorIndex() {
  if (state.dropSectors) return state.dropSectors;
  const index = new Map();
  for (const [sectorId, entry] of Object.entries((state.loot && state.loot.sectors) || {})) {
    const id = Number(sectorId);
    for (const pool of Object.values(entry.pools || {})) {
      for (const drop of pool) {
        if (!index.has(drop.id)) index.set(drop.id, new Set());
        index.get(drop.id).add(id);
      }
    }
  }
  state.dropSectors = index;
  return index;
}

// Searching all drops means a few hundred names per keystroke, so the haystack is built once.
function dropMatches(drop, q) {
  if (!q) return true;
  return String(drop.hay || '').includes(q);
}

function addTarget(id) {
  state.targets.add(Number(id));
  persist();
  renderTargets();
  renderSectors();
  renderSummary();
}

function removeTarget(id) {
  state.targets.delete(Number(id));
  persist();
  renderTargets();
  renderSectors();
  renderSummary();
}

// The tag list and the suggestion list both have to follow the current language, so both are
// rebuilt from scratch rather than patched in place.
function renderTargets() {
  const bar = $('#target-bar');
  if (!bar) return;
  bar.hidden = state.mode !== 'target';
  if (bar.hidden) return;
  renderTargetTags();
  renderTargetSuggest();
}

function renderTargetTags() {
  const host = $('#target-tags');
  if (!host) return;
  host.innerHTML = '';
  const ids = [...state.targets];
  if (!ids.length) {
    host.append(el('div', 'vessel-meta', t('targetEmpty')));
    return;
  }
  for (const id of ids) {
    const drop = targetById(id);
    const tag = el('span', 'target-tag');
    tag.append(el('span', null, localized(drop) || `#${id}`));
    const close = el('button', 'target-del', '×');
    close.type = 'button';
    close.title = t('targetRemove');
    close.addEventListener('click', () => removeTarget(id));
    tag.append(close);
    host.append(tag);
  }
  host.append(el('span', 'vessel-meta target-count', t('targetCount', { n: ids.length })));
}

function renderTargetSuggest() {
  const box = $('#target-suggest');
  const input = $('#target-search');
  if (!box || !input) return;
  const q = String(input.value || '').trim().toLowerCase();
  if (!q) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const onMap = new Set(
    (state.data.sectors || [])
      .filter((s) => String(s.mapId) === state.mapFilter)
      .map((s) => s.id)
  );
  const index = dropSectorIndex();
  const rows = dropCatalog()
    .filter((drop) => !state.targets.has(drop.id) && dropMatches(drop, q))
    .map((drop) => {
      const sectors = index.get(drop.id) || new Set();
      let here = 0;
      for (const id of sectors) if (onMap.has(id)) here += 1;
      return { drop, here };
    })
    .sort((a, b) => b.here - a.here || localized(a.drop).localeCompare(localized(b.drop), LOCALES[state.lang]))
    .slice(0, TARGET_SUGGEST_LIMIT);
  box.innerHTML = '';
  if (!rows.length) {
    box.append(el('div', 'target-option empty', t('targetNoMatch')));
    box.hidden = false;
    return;
  }
  for (const { drop, here } of rows) {
    const row = el('button', 'target-option');
    row.type = 'button';
    row.append(el('span', null, localized(drop) || `#${drop.id}`));
    row.append(
      el('span', 'vessel-meta', here ? t('targetOnMap', { n: here }) : t('targetNotHere'))
    );
    row.addEventListener('click', () => {
      addTarget(drop.id);
      input.value = '';
      renderTargetSuggest();
      input.focus();
    });
    box.append(row);
  }
  box.hidden = false;
}

// A mode switch changes what every row and the summary mean, so repaint both. The table header
// carries the column meaning too.
function renderMode() {
  const select = $('#mode-select');
  if (select) select.value = state.mode;
  const th = $('#th-value');
  if (th) {
    th.dataset.i18n = state.mode === 'target' ? 'thValueTarget' : 'thValue';
    th.textContent = t(th.dataset.i18n);
  }
  // Leaving target mode drops the stale suggestion panel rather than leaving it floating over the
  // value table when the mode comes back.
  if (state.mode !== 'target') {
    const input = $('#target-search');
    const box = $('#target-suggest');
    if (input) input.value = '';
    if (box) {
      box.hidden = true;
      box.innerHTML = '';
    }
  }
  renderTargets();
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
    opt.textContent = `${localized(st)} (${count})`;
    select.append(opt);
  }
  select.value = [...select.options].some((o) => o.value === prev) ? prev : defaultMapFilter();
  state.mapFilter = select.value;
}

// Open on the sea the route was planned for. A ticked stop is the most direct evidence — the
// selection is restored on load — and before anything is ticked the vessel's own position decides.
function defaultMapFilter() {
  const picked = [...state.selected].map(sectorById).filter(Boolean);
  if (picked.length) return String(picked[0].mapId);
  const v = activeVessel();
  if (v && v.route && v.route.length) {
    const hit = (state.data.sectors || []).find((s) => s.id === v.route[0].id);
    if (hit) return String(hit.mapId);
  }
  const first = (state.data.starts || [])[0];
  return first ? String(first.mapId) : '';
}

function mapNameOf(mapId) {
  const st = (state.data.starts || []).find((s) => s.mapId === Number(mapId));
  return st ? localized(st) : '';
}

// The route only exists on one sea chart, so state which one — the table may be showing another.
function routeMapName(picked) {
  const names = [...new Set(picked.map((s) => mapNameOf(s.mapId)).filter(Boolean))];
  return names.join(' / ');
}

function targetById(id) {
  return dropCatalog().find((d) => d.id === Number(id)) || null;
}

// Expected units of each wanted item per voyage over the whole route, since a target mode route
// is judged by how much of it comes back, not by what it sells for.
function targetLine(picked, stats) {
  const totals = new Map();
  for (const s of picked) {
    for (const [id, units] of targetUnits(s.id, stats, state.targets).hits) {
      totals.set(id, (totals.get(id) || 0) + units);
    }
  }
  if (!totals.size) return el('div', 'vessel-meta', t('targetNone'));
  const items = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, units]) => {
      const drop = targetById(id);
      return `${localized(drop) || `#${id}`} ×${units.toFixed(2)}`;
    })
    .join(' · ');
  return el('div', 'vessel-meta', t('targetLine', { items }));
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
    routeBox.append(el('div', null, t('noStops')));
    routeBox.append(el('div', 'vessel-meta', t('noStopsHint', { n: MAX_ROUTE_POINTS })));
    renderLoot([], stats);
  } else {
    const { seconds, exp, fuel } = routeSummary(picked);
    const gross = picked.reduce((a, s) => a + sectorValue(s.id, stats).gil, 0);
    const repair = repairCost(picked);
    const gil = Math.max(0, gross - repair.gil);
    const fit = cycleFit(seconds, state.cycleHours);
    const distance = minRouteDistance(picked);

    routeBox.append(el('div', null, t('pickedCount', { n: picked.length, max: MAX_ROUTE_POINTS })));
    // The route belongs to one sea chart; say which, since the table can be showing another one.
    const chart = routeMapName(picked);
    if (chart) {
      const line = el('div', 'vessel-meta sea-chart', t('seaChart', { name: chart }));
      routeBox.append(line);
    }
    const l1 = el('div');
    l1.innerHTML = t('etaLine', { time: fmtDuration(seconds), exp: fmt(exp) });
    routeBox.append(l1);

    const l2 = el('div');
    l2.innerHTML =
      t('netLine', { gil: fmt(Math.round(gil)), fuel }) +
      (repair.gil > 0
        ? `<span class="vessel-meta">${t('grossNote', {
            gross: fmt(Math.round(gross)),
            repair: fmt(Math.round(repair.gil)),
          })}</span>`
        : '');
    routeBox.append(l2);

    if (state.mode === 'target') routeBox.append(targetLine(picked, stats));

    if (repair.perRepair > 0) {
      routeBox.append(
        el(
          'div',
          'vessel-meta',
          t('repairLine', {
            materials: repair.materials,
            voyages: repair.voyages,
            per: repair.perRepair.toFixed(1),
          }) + (repair.unit > 0 ? ` ≈ ${fmt(Math.round(repair.gil))} gil` : ` ${t('repairNoPrice')}`)
        )
      );
    }

    routeBox.append(
      el(
        'div',
        fit.ok ? 'vessel-meta good-text' : 'vessel-meta',
        t('cycleLine', {
          text: t('cycleText', {
            cycle: fit.cycle,
            hours: state.cycleHours,
            minutes: Math.round(fit.diffMinutes),
          }),
        })
      )
    );
    routeBox.append(
      el(
        'div',
        distance <= stats.range ? 'vessel-meta good-text' : 'vessel-meta',
        t('rangeLine', { d: distance, r: stats.range }) + (distance > stats.range ? t('rangeOver') : '')
      )
    );

    const need = (state.maxExp && state.maxExp.get(Number(ov.level))) || ov.expToNext;
    if (need > 0) {
      const pct = ((exp / need) * 100).toFixed(1);
      routeBox.append(el('div', null, t('expPctLine', { pct })));
    }
    routeBox.append(el('div', 'vessel-meta', t('routeLine', { route: picked.map((s) => `[${s.code}]`).join(' → ') })));
    const expPerHour = seconds > 0 ? (exp / (seconds / 3600)) : 0;
    const gilPerHour = seconds > 0 ? gil / (seconds / 3600) : 0;
    routeBox.append(
      el(
        'div',
        'vessel-meta',
        t('effLine', { exp: fmt(Math.round(expPerHour)), gil: fmt(Math.round(gilPerHour)) })
      )
    );
    renderLoot(picked, stats, { gross, repair });
  }

  const nextLocked = sectors
    .filter((s) => s.rank > ov.level)
    .sort((a, b) => a.rank - b.rank)[0];
  if (nextLocked) {
    levelBox.append(el('div', null, t('nextUnlock', { name: localized(nextLocked) })));
    levelBox.append(el('div', 'vessel-meta', t('needLevelFor', { rank: nextLocked.rank, level: ov.level })));
  } else {
    levelBox.append(el('div', null, t('allUnlocked')));
  }
  const locked = sectors.filter((s) => s.rank > ov.level).length;
  levelBox.append(el('div', 'vessel-meta', t('stillLocked', { n: locked })));
}

function renderAll() {
  renderVessels();
  renderWorld();
  renderParts();
  renderStats();
  renderLevel();
  renderMode();
  renderSectors();
  renderSummary();
  queuePriceFetch();
}

/* ---------- route generation ---------- */

// The search needs prices before it can rank anything, so pick candidates first, fetch, then rank.
async function generateRoute() {
  const v = activeVessel();
  if (!v) return;
  // Ranking by expected units needs to know which units count, so there is nothing to search for
  // until at least one target exists.
  if (state.mode === 'target') {
    if (!state.targets.size) {
      $('#summary-levels').prepend(el('div', 'status blocked', t('targetNeeded')));
      return;
    }
    const stats = vesselStats(v);
    const reachable = candidateMaps(v)
      .flat()
      .filter((s) => targetUnits(s.id, stats, state.targets).units > 0);
    if (!reachable.length) {
      $('#summary-levels').prepend(el('div', 'status blocked', t('targetMissing')));
      return;
    }
  }
  state.cycleHours = Number($('#duration-target').value) || CYCLE_HOURS;

  const btn = $('#add-route-btn');
  btn.disabled = true;
  btn.textContent = t('btnGenerating');
  try {
    const ids = candidateIds(candidateMaps(v));
    if (ids.length) {
      try {
        await ensurePrices(ids);
      } catch (err) {
        $('#summary-levels').prepend(el('div', 'status blocked', t('priceFailed', { err: err.message })));
      }
    }

    const { best, farthest, stats } = searchRoute();
    if (!best) {
      const why = farthest
        ? t('noRouteRange', { r: stats.range, d: farthest.distance })
        : t('noRoute');
      $('#summary-levels').prepend(el('div', 'status blocked', why));
      return;
    }

    state.selected = new Set(best.ordered.map((s) => s.id));
    persist();
    renderSectors();
    renderSummary();

    const mapName = mapNameOf(best.mapId);
    if (mapName) {
      $('#summary-levels').prepend(el('div', 'vessel-meta', t('autoMap', { name: mapName })));
    }
    if (best.fit && !best.fit.ok) {
      $('#summary-levels').prepend(
        el('div', 'vessel-meta', t('cycleMiss', {
          h: state.cycleHours,
          time: fmtDuration(best.seconds),
          m: Math.round(best.fit.diffMinutes),
        }))
      );
    }
  } finally {
    btn.disabled = false;
    btn.textContent = t('btnGenerate');
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
    state.source = t('staticSource');
    state.sourceInfo = { static: true };
    badge.className = 'badge';
    badge.textContent = t('staticBadge');
    badge.title = t('staticBadgeTitle');
    if (state.activeSlot >= state.slots.length) state.activeSlot = 0;
    return;
  }
  try {
    const res = await fetch('/api/autoretainer', { cache: 'no-store' });
    const body = await res.json();
    if (!body.ok) {
      badge.className = 'badge err';
      state.sourceInfo = { error: body.error || '' };
      badge.textContent = body.error || t('readFailed');
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
    state.sourceInfo = { demo: body.demo, vessels: vessels.length, groups };
    badge.className = body.demo ? 'badge' : 'badge ok';
    badge.textContent = body.demo
      ? t('demoBadge')
      : t('arBadge', { vessels: vessels.length, groups });
    badge.title = state.source;
    if (state.activeSlot >= state.slots.length) state.activeSlot = 0;
  } catch (err) {
    badge.className = 'badge err';
    badge.textContent = t('cannotConnect');
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
  state.dropCatalog = null;
  state.dropSectors = null;
}

function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    alert(t('jsonParseFailed', { err: err.message }));
    return;
  }
  if (parsed.parts || parsed.sectors) {
    state.data = { ...state.data, ...parsed };
    buildPartsIndex();
    renderAll();
    alert(t('dataImported'));
    return;
  }
  if (Array.isArray(parsed.OfflineData)) {
    alert(t('autoretainerRaw'));
    return;
  }
  alert(t('unknownFormat'));
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

// Static markup carries its Chinese text inline so the page reads correctly before the script
// runs; swapping in the other languages only needs to walk the tags with a data-i18n key.
function applyStaticText() {
  document.documentElement.lang = LANG_TAGS[state.lang] || LANG_TAGS.zh;
  document.title = t('appTitle');
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
}

function renderLangSelect() {
  const select = $('#lang-select');
  if (!select) return;
  select.innerHTML = '';
  for (const lang of LANGS) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = LANG_NAMES[lang];
    select.append(opt);
  }
  select.value = state.lang;
  select.addEventListener('change', () => {
    state.lang = select.value;
    // Part and item names are cached in the index at load time, so rebuild before repainting.
    buildPartsIndex();
    persist();
    applyStaticText();
    // The sea list and the per-row sea cells carry localised names; the selection itself does not
    // change, so remember it across the rebuild.
    const keepMap = state.mapFilter;
    renderFilters();
    if ([...$('#map-filter').options].some((o) => o.value === keepMap)) {
      $('#map-filter').value = keepMap;
      state.mapFilter = keepMap;
    }
    renderAll();
    relabelSource();
  });
}

async function boot() {
  loadStored();
  state.standalone = await detectStandalone();
  applyStaticText();
  renderLangSelect();
  await loadData();
  await loadVessels();

  renderFilters();
  $('#duration-target').value = String(state.cycleHours);
  // Reading AutoRetainer is the one thing static hosting cannot do; the badge already explains
  // where the sample comes from, so hide the button that would just re-run the same fallback.
  if (state.standalone) $('#refresh-btn').hidden = true;
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
    // The suggestion list labels each item with how many stops on this map carry it.
    renderTargets();
    // The new map's drops have probably never been priced; only uncached ids are requested.
    queuePriceFetch();
  });
  $('#mode-select').addEventListener('change', (e) => {
    state.mode = e.target.value === 'target' ? 'target' : 'value';
    persist();
    renderMode();
    renderSectors();
    renderSummary();
  });
  $('#target-search').addEventListener('input', renderTargetSuggest);
  // The suggestion list floats over the table; a click anywhere else closes it.
  document.addEventListener('click', (e) => {
    const box = $('#target-suggest');
    if (!box || box.hidden) return;
    if (box.contains(e.target) || e.target === $('#target-search')) return;
    box.hidden = true;
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
