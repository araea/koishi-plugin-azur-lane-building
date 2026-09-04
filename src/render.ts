import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { shipData } from './data'
import { BuildType, parsePool, RARITIES, RarityKey, ShipRareList } from './pools'
import { FALLBACK_AVATAR } from './wiki'

export interface BuildRecord {
  index: number
  buildType: BuildType
  rarityKey: RarityKey
  shipName: string
  times: number
}

export type StatsRow = Record<string, number>
export type BuildStats = Record<string, StatsRow>

export interface BuildInfo {
  poolName: string
  times: number
  cost: number
  cube: number
  username: string
  buildCount: number
}

export interface StatsInfo {
  username: string
  buildCount: number
  cube: number
  collectionRate: number
  owned: number
  totalShips: number
}

const escape = (text: string) => h.escape(String(text ?? ''))
const avatarOf = (name: string) => shipData[name]?.src ?? FALLBACK_AVATAR
const shortPool = (type: BuildType) => type.replace('舰建造', '')
const number = (value: number) => (value ?? 0).toLocaleString('zh-CN')
const percent = (value: number) => `${(value * 100).toFixed(2)}%`

/** 深色底上的稀有度配色：ink 文字、halo 填充、edge 描边、line 高亮。 */
const RARITY_STYLE: Record<RarityKey, { ink: string; halo: string; edge: string; line: string }> = {
  Legend: { ink: '#ffd6f0', halo: 'rgba(255,154,213,.14)', edge: 'rgba(255,154,213,.42)', line: '#ff9ad5' },
  SuperRare: { ink: '#ffe98a', halo: 'rgba(249,217,73,.13)', edge: 'rgba(249,217,73,.40)', line: '#f9d949' },
  Elite: { ink: '#cdb4ff', halo: 'rgba(169,139,240,.14)', edge: 'rgba(169,139,240,.42)', line: '#a98bf0' },
  Rare: { ink: '#93defb', halo: 'rgba(63,182,234,.13)', edge: 'rgba(63,182,234,.40)', line: '#3fb6ea' },
  Normal: { ink: '#c6cdd6', halo: 'rgba(160,172,186,.12)', edge: 'rgba(160,172,186,.34)', line: '#93a0ad' },
}

const styleOf = (key: RarityKey) => RARITY_STYLE[key] ?? RARITY_STYLE.Normal
const rarityOf = (key: RarityKey) => RARITIES.find((item) => item.key === key) ?? RARITIES[RARITIES.length - 1]
/** 把配色挂到 CSS 变量上，子元素按稀有度自动着色。 */
const vars = (key: RarityKey) => {
  const style = styleOf(key)
  return `--ink:${style.ink};--halo:${style.halo};--edge:${style.edge};--line:${style.line}`
}

const ICON = {
  anchor: '<path d="M12 7.6V21"/><circle cx="12" cy="5" r="2.6"/><path d="M5 13.5a7 7 0 0 0 14 0"/><path d="M8.4 11.4h7.2"/>',
  chart: '<path d="M4 20h16"/><path d="M7.5 20v-6"/><path d="M12 20v-10.5"/><path d="M16.5 20v-4"/>',
  list: '<path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h10"/>',
  crown: '<path d="M4 17.5h16"/><path d="M4 17.5 6 7l4 4.2L12 5l2 6.2 4-4.2 2 10.5z"/>',
}

const icon = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`

const stamp = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const shortDate = (value: Date | number) => {
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const STYLE = `
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  padding: 22px;
  background: transparent;
  color: #e9f2fb;
  font-family: "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.card {
  position: relative;
  width: 900px;
  padding: 26px 32px 20px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(150,205,245,.20);
  background:
    radial-gradient(780px 320px at 6% -14%, rgba(86,178,229,.28), rgba(86,178,229,0) 60%),
    radial-gradient(700px 380px at 104% -8%, rgba(238,198,120,.15), rgba(238,198,120,0) 58%),
    linear-gradient(158deg, #0a1728 0%, #10263c 46%, #0b1a2c 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.07), inset 0 0 60px rgba(6,14,24,.5);
}

/* 顶部细网格纹理，只留下淡淡的一层，避免喧宾夺主 */
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 32px 32px;
  -webkit-mask-image: radial-gradient(120% 78% at 50% -10%, #000 0%, rgba(0,0,0,.35) 45%, transparent 78%);
  mask-image: radial-gradient(120% 78% at 50% -10%, #000 0%, rgba(0,0,0,.35) 45%, transparent 78%);
  pointer-events: none;
}

.card > * { position: relative; }

.hd {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(150,205,245,.14);
}

.hd-badge {
  width: 46px;
  height: 46px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #bfe6ff;
  border: 1px solid rgba(150,215,250,.34);
  background: linear-gradient(150deg, rgba(96,190,240,.30), rgba(96,190,240,.06));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
}

.hd-badge svg { width: 24px; height: 24px; }

.hd-text { flex: 1; min-width: 0; }

.hd-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: .5px;
  color: #f2f8ff;
}

.hd-en {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2.4px;
  color: rgba(150,205,245,.55);
  text-transform: uppercase;
}

.hd-sub {
  margin-top: 5px;
  font-size: 13px;
  color: rgba(200,224,246,.72);
}

.hd-metrics { flex: none; display: flex; gap: 10px; }

.metric {
  min-width: 92px;
  padding: 8px 14px;
  text-align: center;
  border-radius: 13px;
  border: 1px solid rgba(150,205,245,.16);
  background: rgba(255,255,255,.05);
}

.metric .mv {
  display: block;
  font-size: 19px;
  font-weight: 700;
  color: #f4d98a;
  font-variant-numeric: tabular-nums;
}

.metric .ml {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: .6px;
  color: rgba(196,220,242,.62);
}

.rare-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0 2px; }

.rare-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--ink);
  background: var(--halo);
  border: 1px solid var(--edge);
}

.rare-chip b { font-size: 13.5px; font-variant-numeric: tabular-nums; }

.group { margin-top: 18px; }

.group-hd { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }

.group-hd .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--line);
  box-shadow: 0 0 10px var(--line);
}

.group-hd .nm { font-size: 14px; font-weight: 600; letter-spacing: .4px; color: var(--ink); }
.group-hd .ct { font-size: 12.5px; color: rgba(200,224,246,.5); font-variant-numeric: tabular-nums; }
.group-hd .ln { flex: 1; height: 1px; background: linear-gradient(90deg, var(--edge), transparent); }

.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 13px; }
.grid.solo { grid-template-columns: 288px; justify-content: center; }

.ship {
  position: relative;
  padding: 9px 9px 11px;
  border-radius: 15px;
  border: 1px solid var(--edge);
  background: linear-gradient(170deg, rgba(255,255,255,.075), rgba(255,255,255,.028));
  box-shadow: 0 6px 16px rgba(3,10,20,.34), inset 0 1px 0 rgba(255,255,255,.07);
}

.ship::before {
  content: "";
  position: absolute;
  left: 13px;
  right: 13px;
  top: 0;
  height: 2px;
  border-radius: 0 0 3px 3px;
  background: var(--edge);
}

.ship.legend::before {
  background: linear-gradient(90deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4);
}

.ship-av {
  position: relative;
  width: 100%;
  height: 118px;
  overflow: hidden;
  border-radius: 11px;
  background: radial-gradient(120% 90% at 50% 0%, var(--halo), rgba(255,255,255,.03));
}

.ship-av img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 12%;
}

.ship-av::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(8,18,30,.60), rgba(8,18,30,0) 46%);
}

.ship-name {
  margin-top: 9px;
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: .3px;
  text-align: center;
  color: #f1f7ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ship-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  color: rgba(198,220,242,.62);
}

.ship-meta i { width: 3px; height: 3px; border-radius: 50%; background: rgba(198,220,242,.35); }
.ship-meta .tm { color: var(--ink); font-variant-numeric: tabular-nums; }

.idx {
  position: absolute;
  top: 15px;
  left: 15px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  color: rgba(233,244,255,.85);
  background: rgba(8,18,30,.62);
  font-variant-numeric: tabular-nums;
}

.flag {
  position: absolute;
  top: 13px;
  right: 13px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: .6px;
  color: #3a1f00;
  background: linear-gradient(140deg, #ffe9a8, #f0c65c);
  box-shadow: 0 2px 8px rgba(240,198,92,.40);
}

.grid.solo .ship-av { height: 232px; }
.grid.solo .ship-name { margin-top: 12px; font-size: 21px; }

.tbl {
  width: 100%;
  margin-top: 16px;
  border-collapse: separate;
  border-spacing: 0 6px;
}

.tbl th {
  padding: 0 14px 6px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .8px;
  color: rgba(160,200,235,.62);
}

.tbl th:first-child { text-align: left; }

.tbl td {
  padding: 11px 14px;
  text-align: right;
  font-size: 14px;
  color: #e9f2fb;
  background: rgba(255,255,255,.038);
  font-variant-numeric: tabular-nums;
}

.tbl td:first-child { text-align: left; border-radius: 11px 0 0 11px; }
.tbl td:last-child { border-radius: 0 11px 11px 0; }

.tbl tr.sum td {
  color: #f6df9e;
  font-weight: 700;
  background: rgba(240,198,106,.10);
}

.td-tot { position: relative; overflow: hidden; }
.td-tot .bar { position: absolute; top: 0; bottom: 0; left: 0; background: var(--halo); }
.td-tot span { position: relative; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  background: var(--halo);
  border: 1px solid var(--edge);
}

.chip .d {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line);
  box-shadow: 0 0 8px var(--line);
}

.fav {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-radius: 16px;
  border: 1px solid rgba(240,198,106,.26);
  background: linear-gradient(120deg, rgba(240,198,106,.13), rgba(255,255,255,.03));
}

.fav-av {
  width: 56px;
  height: 56px;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid rgba(240,198,106,.55);
  box-shadow: 0 0 0 4px rgba(240,198,106,.10);
}

.fav-av img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 10%;
}

.fav-txt { flex: 1; min-width: 0; }

.fav-label { font-size: 11.5px; letter-spacing: 1.2px; color: rgba(240,214,150,.72); }

.fav-name {
  margin-top: 3px;
  font-size: 19px;
  font-weight: 700;
  color: #fdf3d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-count { flex: none; text-align: right; }
.fav-count b { font-size: 24px; color: #f4d98a; font-variant-numeric: tabular-nums; }
.fav-count span { margin-left: 3px; font-size: 12px; color: rgba(240,214,150,.7); }

.bands { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }

.band {
  padding: 13px 16px 14px;
  border-radius: 16px;
  border: 1px solid var(--edge);
  background: linear-gradient(120deg, var(--halo), rgba(255,255,255,.022));
}

.band-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.band-hd .odds { font-size: 12.5px; color: rgba(200,224,246,.62); font-variant-numeric: tabular-nums; }
.band-hd .cnt { margin-left: auto; font-size: 12px; color: rgba(200,224,246,.5); }

.chips { display: flex; flex-wrap: wrap; gap: 7px; }

.ship-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 11px 4px 4px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.05);
}

.ship-chip img {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  object-fit: cover;
  object-position: center 12%;
}

.ship-chip .nm { font-size: 12.5px; color: var(--ink); }

.rank { margin-top: 16px; }

.rank-row {
  display: grid;
  grid-template-columns: 58px 1fr 250px 92px 104px;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  padding: 10px 14px;
  border-radius: 13px;
  border: 1px solid rgba(255,255,255,.05);
  background: rgba(255,255,255,.038);
}

.rank-row.head {
  margin-bottom: 2px;
  padding-bottom: 4px;
  border: 0;
  background: transparent;
  font-size: 11.5px;
  letter-spacing: 1px;
  color: rgba(160,200,235,.55);
}

.rank-row.t1 { border-color: rgba(240,198,106,.28); background: rgba(240,198,106,.10); }
.rank-row.t2 { border-color: rgba(210,226,242,.22); background: rgba(210,226,242,.08); }
.rank-row.t3 { border-color: rgba(232,167,106,.24); background: rgba(232,167,106,.09); }

.rk {
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: rgba(200,224,246,.5);
  font-variant-numeric: tabular-nums;
}

.rk.t1 { color: #ffd76a; text-shadow: 0 0 12px rgba(255,200,80,.5); }
.rk.t2 { color: #e4eef8; text-shadow: 0 0 10px rgba(210,226,242,.35); }
.rk.t3 { color: #e8a76a; }

.who {
  font-size: 14.5px;
  font-weight: 600;
  color: #eef6ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rate {
  position: relative;
  height: 24px;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255,255,255,.05);
}

.rate .fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, rgba(86,190,240,.45), rgba(150,225,255,.85));
}

.rate span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: #f2f8ff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgba(0,0,0,.45);
}

.cube, .when { text-align: right; font-variant-numeric: tabular-nums; }
.cube { font-size: 14px; color: #f4d98a; }
.when { font-size: 12px; color: rgba(190,215,238,.5); }

.ft {
  margin-top: 20px;
  padding-top: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid rgba(150,205,245,.13);
  font-size: 11.5px;
  color: rgba(190,215,238,.5);
}

.ft i { width: 3px; height: 3px; border-radius: 50%; background: rgba(190,215,238,.3); }
.ft .sp { flex: 1; }
`

const PAGE = (body: string) => `<!DOCTYPE html>
<html lang="zh"><head><meta charset="UTF-8"><style>${STYLE}</style></head><body>${body}</body></html>`

const header = (title: string, en: string, sub: string, glyph: string, metrics: [string, string][]) => `
  <header class="hd">
    <div class="hd-badge">${icon(glyph)}</div>
    <div class="hd-text">
      <div class="hd-title">${escape(title)}<span class="hd-en">${escape(en)}</span></div>
      <div class="hd-sub">${escape(sub)}</div>
    </div>
    <div class="hd-metrics">${
  metrics.map(([label, value]) => `<div class="metric"><span class="mv">${escape(value)}</span><span class="ml">${escape(label)}</span></div>`).join('')
}</div>
  </header>`

const footer = (items: string[]) => `
  <footer class="ft">${items.map((item) => `<span>${escape(item)}</span>`).join('<i></i>')}<span class="sp"></span><span>${stamp()}</span></footer>`

/** 单张舰娘卡：头像 + 舰名 + 池子与累计次数，稀有度决定描边与文字色。 */
function shipCard(record: BuildRecord) {
  return `<article class="ship${record.rarityKey === 'Legend' ? ' legend' : ''}" style="${vars(record.rarityKey)}">
    <div class="ship-av"><img src="${escape(avatarOf(record.shipName))}" alt=""></div>
    <div class="ship-name">${escape(record.shipName)}</div>
    <div class="ship-meta">
      <span>${escape(shortPool(record.buildType))}</span><i></i>
      <span class="tm">第 ${record.times} 次</span>
    </div>
    <span class="idx">#${record.index}</span>
    ${record.times === 1 ? '<span class="flag">NEW</span>' : ''}
  </article>`
}

function group(key: RarityKey, records: BuildRecord[], solo: boolean) {
  return `<section class="group" style="${vars(key)}">
    <div class="group-hd">
      <span class="dot"></span>
      <span class="nm">${escape(rarityOf(key).name)}</span>
      <span class="ct">×${records.length}</span>
      <span class="ln"></span>
    </div>
    <div class="grid${solo ? ' solo' : ''}">${records.map(shipCard).join('')}</div>
  </section>`
}

export function buildResult(records: BuildRecord[], info: BuildInfo) {
  const tally = new Map<RarityKey, number>()
  for (const record of records) tally.set(record.rarityKey, (tally.get(record.rarityKey) ?? 0) + 1)

  const chips = RARITIES
    .filter((rarity) => tally.has(rarity.key))
    .map((rarity) => `<span class="rare-chip" style="${vars(rarity.key)}">${escape(rarity.name)}<b>${tally.get(rarity.key)}</b></span>`)
    .join('')

  const sections = RARITIES
    .filter((rarity) => tally.has(rarity.key))
    .map((rarity) => group(rarity.key, records.filter((record) => record.rarityKey === rarity.key), records.length === 1))
    .join('')

  return PAGE(`<div class="card">
    ${header('建造结果', 'Build Result', `${info.poolName}舰建造 · ${info.times} 发 · 单价 ${info.cost} 魔方`, ICON.anchor, [['消耗魔方', number(info.cost)], ['剩余魔方', number(info.cube)]])}
    ${chips ? `<div class="rare-bar">${chips}</div>` : ''}
    ${sections}
    ${footer([`指挥官 ${info.username}`, `累计建造 ${number(info.buildCount)} 发`])}
  </div>`)
}

export interface Favourite {
  name: string
  times: number
  avatar: string
}

export function statsTable(stats: BuildStats, favourite: Favourite, info: StatsInfo) {
  const grand = stats.total?.total ?? 0
  const row = (label: string, data: StatsRow, key: RarityKey | null, total = false) => {
    const share = grand ? Math.min(100, ((data.total ?? 0) / grand) * 100) : 0
    return `<tr${total ? ' class="sum"' : ''} style="${key ? vars(key) : '--halo:rgba(240,198,106,.14)'}">
      <td>${key ? `<span class="chip"><span class="d"></span>${escape(label)}</span>` : escape(label)}</td>
      <td>${number(data[BuildType.Light])}</td>
      <td>${number(data[BuildType.Heavy])}</td>
      <td>${number(data[BuildType.Special])}</td>
      <td class="td-tot"><div class="bar" style="width:${share.toFixed(1)}%"></div><span>${number(data.total)}</span></td>
    </tr>`
  }

  const body = RARITIES
    .filter((rarity) => stats[rarity.name])
    .map((rarity) => row(rarity.name, stats[rarity.name], rarity.key))
    .join('')

  return PAGE(`<div class="card">
    ${header('建造记录', 'Build Log', `指挥官 ${info.username} · 累计 ${number(info.buildCount)} 发`, ICON.chart, [['收藏率', percent(info.collectionRate)], ['魔方', number(info.cube)]])}
    <div class="fav">
      <div class="fav-av"><img src="${escape(favourite.avatar)}" alt=""></div>
      <div class="fav-txt">
        <div class="fav-label">最常获得</div>
        <div class="fav-name">${escape(favourite.name)}</div>
      </div>
      <div class="fav-count"><b>${number(favourite.times)}</b><span>次</span></div>
    </div>
    <table class="tbl">
      <thead><tr><th>稀有度</th><th>${BuildType.Light}</th><th>${BuildType.Heavy}</th><th>${BuildType.Special}</th><th>总计</th></tr></thead>
      <tbody>${body}${row('总计', stats.total ?? {}, null, true)}</tbody>
    </table>
    ${footer([`已收集 ${number(info.owned)} / ${number(info.totalShips)} 艘`, `收藏率 ${percent(info.collectionRate)}`])}
  </div>`)
}

export function poolTable(pool: ShipRareList, odds: Record<RarityKey, number>, title: string) {
  const columns = RARITIES.filter((rarity) => rarity.key !== 'Legend' || odds.Legend > 0)

  const bands = columns.map((rarity) => {
    const ships = parsePool(pool[rarity.key])
    return `<section class="band" style="${vars(rarity.key)}">
      <div class="band-hd">
        <span class="chip"><span class="d"></span>${escape(rarity.name)}</span>
        <span class="odds">出货率 ${odds[rarity.key]}%</span>
        <span class="cnt">${ships.length} 艘</span>
      </div>
      <div class="chips">${ships.map((name) => `
        <span class="ship-chip"><img src="${escape(avatarOf(name))}" alt=""><span class="nm">${escape(name)}</span></span>`).join('')}</div>
    </section>`
  }).join('')

  const total = columns.reduce((sum, rarity) => sum + parsePool(pool[rarity.key]).length, 0)

  return PAGE(`<div class="card">
    ${header(title, 'Ship Pool', `共 ${total} 艘舰船 · 按稀有度分层展示`, ICON.list, [])}
    <div class="bands">${bands}</div>
    ${footer(['出货率为配置值', '舰船清单可在插件配置中修改'])}
  </div>`)
}

export function ranking(rows: { username: string; collectionRate: number; cube: number; lastCheckInTimestamp: Date }[]) {
  const body = rows.map((item, index) => {
    const tier = index < 3 ? ` t${index + 1}` : ''
    const rate = Math.max(0, Math.min(1, item.collectionRate))
    return `<div class="rank-row${tier}">
      <div class="rk${tier}">${index < 3 ? ['①', '②', '③'][index] : `#${index + 1}`}</div>
      <div class="who">${escape(item.username)}</div>
      <div class="rate"><div class="fill" style="width:${(rate * 100).toFixed(1)}%"></div><span>${percent(rate)}</span></div>
      <div class="cube">${number(item.cube)}</div>
      <div class="when">${shortDate(item.lastCheckInTimestamp)}</div>
    </div>`
  }).join('')

  return PAGE(`<div class="card">
    ${header('收藏率排行榜', 'Collection Rank', `前 ${rows.length} 位指挥官`, ICON.crown, [])}
    <div class="rank">
      <div class="rank-row head"><div class="rk">名次</div><div class="who">指挥官</div><div class="rate">收藏率</div><div class="cube">魔方</div><div class="when">签到</div></div>
      ${body}
    </div>
    ${footer([`共 ${rows.length} 位指挥官上榜`])}
  </div>`)
}

/** 截图；头像来自外网，用 networkidle0 等图片加载完，超时也照样出图。 */
export async function screenshot(ctx: Context, html: string) {
  const page = await ctx.puppeteer.page()
  try {
    await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 1.5 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
    return await (await page.$('.card')).screenshot({ type: 'png' })
  } finally {
    await page.close()
  }
}
