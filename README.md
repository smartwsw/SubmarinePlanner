# 潜水艇规划器

读取本机 AutoRetainer 配置，查看部队潜水艇状态与航点规划。

## 启动

```bash
node server.js
```

然后打开 http://127.0.0.1:4173 。

自动查找的配置路径：

- `%APPDATA%\XIVLauncherCN\pluginConfigs\AutoRetainer\DefaultConfig.json`
- `%APPDATA%\XIVLauncher\pluginConfigs\AutoRetainer\DefaultConfig.json`
- `~/.xlcore/pluginConfigs/AutoRetainer/DefaultConfig.json`

找不到时可用参数指定：

```bash
node server.js --config "D:\path\to\DefaultConfig.json"
```

未找到配置时页面会以**示例数据**运行（右上角会提示），不会报错。

## 数据说明

- 潜水艇与配件 ID 来自 AutoRetainer 实时配置。左栏列表**按配置显示**而不是按潜艇显示：等级与四件配件完全相同的几条合并成一条（如 4 艘同配艇只出现一行 `Lv.140 · VI/VI/VI/VI`），不显示潜艇名字。
- 点「＋ 添加配置」手动新建一条配置，存 localStorage，点「重新读取」不会重复也不会丢失。
- 每行右侧的 `✕` 删除该配置：手动配置会被移除，AutoRetainer 里的槽位只会被隐藏（配置文件不动），删完后出现「恢复全部」可以一键找回。
- 「服务器」下拉列出 Universalis 国服四个大区的全部世界，价格按所选世界所在大区查询；有 AutoRetainer 时默认填入配置里的角色世界。
- `public/data/submarine-data.json` 的 `sectors` 来自游戏数据表 `SubmarineExploration`：`id` 即 `RowId`，含需求等级、经验、青磷水、坐标、调查时长。`requires`/`needsSub`/`opensMap` 来自 AutoRetainer 的 `Unlocks.cs` 解锁树。
- `parts` 与 `ranks` 来自 `SubmarinePart`、`SubmarineRank` 表；部件 ID 与部位的对应关系按 AutoRetainer 的 `PartIdToItemId` 表建立。
- 名称全部取国服（zh-CN）客户端数据：航点/海域来自 `thewakingsands/ffxiv-datamining-cn` 的 `SubmarineExploration`/`SubmarineMap`，配件名来自 `Item` 表（经 `PartIdToItemId` 映射）。数值字段取自 xivapi v2。
- 航程按当前配件与等级总速度实时估算，公式同 AutoRetainer：距离 × 3990 ÷ (速度 × 100) × 60，另加 12 小时固定航时。
- 页面左下角「模拟等级」用于推演未达到的等级；手动改过的条目会保留，未改过的会跟随「重新读取」更新。
- `public/data/submarine-loot.json` 是每个航点的掉落池：`pools.1/2/3` 对应探索档位 1/2/3 池，`qty` 是「收集差/普通/最优」三档下的数量区间，`chance` 是单次抽取概率。数据取自 `ofnature/Argus` 的 `LootTable.json`（源头是 `Infiziert90/FFXIVGachaSpreadsheet` 众包航行记录），阈值取自 Argus `SubmarineData.cs`（源头 `Infiziert90/SubmarineTracker` 社区表格），物品名映射到国服 `Item.csv`。
- 掉落池按探索值**解锁**，不是互相替换：探索达到 `t2` 解锁池 2、达到 `t3` 解锁池 3，已解锁的池各抽一次（结构与 SubmarineTracker 的 `PredictBonusExp` 一致，最高 4 次）。只达到基础档时只有池 1。
- 掉落估值 = 各已解锁池内每件物品的 `概率 × 数量区间中点 × 单价` 之和，再按恩惠是否达标翻倍。数量区间由收集值决定（未达 `normal` 取差档、达 `normal` 取普通档、达 `optimal` 取优档）。
- 恩惠和其他属性一样由等级表与四个部件相加：`SubmarinePart` 表有 `Favor` 列，`submarine-data.json` 的每个部件都带 `favor`。界面「属性」区也会显示恩惠，并标出部件值与等级值，卡片下方附游戏内效果说明。
- **每项属性在计算里的作用**：探索决定解锁哪些掉落池（`t2`/`t3` 阈值）、收集决定数量档（`normal`/`optimal`）、速度决定航行时长、航程限制可达点位、恩惠达到 `favor` 阈值后把每趟抽取翻倍。恩惠「未达阈值时有概率多拿一件」这一条**没有公开概率数据**，Argus 的 `ItemYield.cs` 明确写了不建模，所以这里只按阈值建模。
- **耐久修理成本**：按 AutoRetainer `Build.cs` 的算法算——每个部件对每个航点累计 `(335 + 航点需求等级 − 部件Rank) × 7` 点损伤，取四部件最大值作为单趟消耗；修理一次回满 30000 点并消耗四部件 `RepairMaterials` 之和（你那套满配是 24 个）。把这次修理摊到它能撑的趟数上，得到每趟的材料成本，再乘 `10386 魔导修理材料` 的市场价。汇总区显示「净收益 = 掉落 − 修理」，并标出材料数和折算 gil。航点越高级、趟数越多，单趟损伤越大，成本随之上升（1 个点约 2.2 个材料/趟，3 个点约 6.0 个）。
- **低价值物品不计入估值**：单价低于 10,000 gil 的物品（原木、矿石、晶簇、乐谱、魔晶石等）照常掉落，但不贡献 gil，以免大批量廉价原料把真正值钱的家具/装备摊薄。143 个航点里还剩 95.7% 的估值，其中 37 个低级航点会因此估值为 0。表格里的 gil 单元格悬停可看到「计入 X/Y 件」以及被忽略的原因。
- **沉船首饰按商店回收价计价**：`22500`–`22507`（沉船/上等沉船 戒指·手镯·耳饰·项链）在市场上没有成交，单价直接取 `Item.csv` 的 `Price{Low}`（8,000–34,500 gil），不走 Universalis；这几件也不会被请求价格接口。**它们不受上面的 10,000 门槛限制**——那条门槛是筛掉市场垃圾的，而这批首饰本来就只能卖店，砍掉等于直接少算收益（沉船戒指 8,000、沉船手镯 9,000 会受影响，单个航点约损失 4,000–17,000 gil）。

## 路线生成

「生成路线」不需要先挑目标点，完全按掉落价值自动规划：

1. 候选停点 = 当前「海域」下拉框所选海域内、等级已满足、且有掉落数据的航点。下拉框只列分海域，规划范围与表格一致。
2. 枚举 1~5 个停点的组合与顺序，优先选择落在 **24/48/72 小时整数倍前 35 分钟内** 的航线；如果没有任何组合能命中，会退回最接近整点的那条并明确提示。
4. 「目标时长」下拉框切换 24/48/72 小时周期；「清除」清空已选航线；切换「海域」会一并清空已选点位（一条航线只覆盖一个海域）。

航程按 AutoRetainer 的算法核算：每段 `floor(两点距离 × 0.035)` 公里，加上各点自身的 `SurveyDistance`，总和不超潜艇的 `航程`（等级加成 + 四个部件）。超出航程的组合在搜索时直接淘汰；手动勾选时，加上该点会超限的行会变灰且勾选框禁用，状态列显示 `超出航程 291/240`。汇总区的「航程占用」按最优停留顺序计算。

价格通过 `GET /api/prices?worlds=<角色世界>&ids=<物品ID>` 走本地服务代理 Universalis（避免浏览器跨域），世界名会自动映射到大区（如 海猫茶屋 → 猫小胖）。优先采用近期成交均价，无成交时用挂牌价中位数，避免被单笔离谱挂单拉偏。

**价格缓存不会自动过期**：浏览器端把取到的价格和时间存进 localStorage，服务端也一直留着已查过的大区报价，刷新页面或重开浏览器都会继续用上次的数字。需要更新时点左栏「服务器」下的「重新获取价格」（请求带 `force=1`，服务端跳过缓存重查），下方会显示「价格更新于 YYYY-MM-DD HH:MM」。只有从没查过的物品、以及切换服务器（换大区）后才会自动重新请求一次。

## 接口

`GET /api/autoretainer` 返回：

```json
{
  "ok": true,
  "source": "配置文件路径",
  "characters": [{ "name": "...", "fcId": "...", "fcName": "...", "ceruleum": 0, "repairKits": 0 }],
  "fcs": [{ "fcId": "...", "name": "...", "rank": 0, "points": 0 }],
  "vessels": [
    {
      "name": "...", "slot": 0, "owner": "...", "level": 140, "exp": 0, "expToNext": 0,
      "parts": [0, 0, 0, 0],
      "currentPoints": [137],
      "route": [{ "id": 137, "name": "黑血域东", "mapName": "北洋" }],
      "unlockMode": 2
    }
  ]
}
```

`Points` 在 AutoRetainer 中是 `byte[5]`，存放潜艇**当前航线**的点位 ID（不足 5 个补 0），不是解锁位掩码；`currentPoints` 已去掉补位。`slot` 取 `OfflineSubmarineData` 的下标（即部队工坊里的槽位号），`vessels` 按它排序；`characters` / `fcs` 仍然返回，但界面已不再展示部队与当前航线信息。

`GET /api/prices?worlds=海猫茶屋&ids=44016,46836[&force=1]` 返回：

```json
{ "ok": true, "dcs": ["猫小胖"], "prices": { "44016": { "avg": 307.5, "sold": true, "listing": 333, "min": 200, "units": 415 } } }
```

`avg` 是用于估值的单价（近期成交价，无成交时为挂牌中位数），`updatedAt` 为服务端实际取数时间戳（命中缓存时是上次真正查询的时间，不是本次请求时间）。不带 `force=1` 时服务端只补查缓存里没有的物品。

## 已知限制

- 配置里只有当前航线，没有「已解锁航点」列表，因此页面按等级判断可达性，未按实际探索进度过滤。
- 每个海域的最后一点（`opensMap`）需要打通上一海域解锁链，当前未跨海域展开完整链路。
- 部分航点（如 `needsSub`）依赖额外的解锁条件，页面只展示 `requires` 前置链；AutoRetainer 用哨兵值 `9876` 表示「解锁条件未知」，页面显示为「条件未知」。
- 掉落估值的概率来自玩家众包航行记录，样本量有限；且游戏单次只抽一件，实际收入会高于或低于估值。
- 周期约束只能控制在可选航点范围内：高级航点单点调查就要 10 小时以上，若要严格 24 小时整，可能只剩 1~2 个停点。
