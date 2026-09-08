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

export interface RankRow {
  userId?: string
  username: string
  collectionRate: number
  cube: number
  lastCheckInTimestamp: Date
}

const escape = (text: string) => h.escape(String(text ?? ''))
const avatarOf = (name: string) => shipData[name]?.src ?? FALLBACK_AVATAR
const shortPool = (type: BuildType) => type.replace('舰建造', '')
const number = (value: number) => (value ?? 0).toLocaleString('zh-CN')
const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const clamp = (value: number) => Math.max(0, Math.min(1, value || 0))

/** 深色底上的稀有度配色：ink 文字、halo 填充、edge 描边、line 高亮。 */
const RARITY_STYLE: Record<RarityKey, { ink: string; halo: string; edge: string; line: string }> = {
  Legend: { ink: '#ffd6f0', halo: 'rgba(255,154,213,.14)', edge: 'rgba(255,154,213,.42)', line: '#ff9ad5' },
  SuperRare: { ink: '#ffe98a', halo: 'rgba(249,217,73,.13)', edge: 'rgba(249,217,73,.40)', line: '#f9d949' },
  Elite: { ink: '#cdb4ff', halo: 'rgba(169,139,240,.14)', edge: 'rgba(169,139,240,.42)', line: '#a98bf0' },
  Rare: { ink: '#93defb', halo: 'rgba(63,182,234,.13)', edge: 'rgba(63,182,234,.40)', line: '#3fb6ea' },
  Normal: { ink: '#c6cdd6', halo: 'rgba(160,172,186,.12)', edge: 'rgba(160,172,186,.34)', line: '#93a0ad' },
}

/** 单发焦点位右侧的稀有度水印，只描边不填色，安静地压住大片留白。 */
const RARITY_EN: Record<RarityKey, string> = {
  Legend: 'LEGENDARY',
  SuperRare: 'SUPER RARE',
  Elite: 'ELITE',
  Rare: 'RARE',
  Normal: 'NORMAL',
}

/** 海上传奇与超稀有值得被一眼看见，卡片额外加一层辉光。 */
const HIGHLIGHT: RarityKey[] = ['Legend', 'SuperRare']

const styleOf = (key: RarityKey) => RARITY_STYLE[key] ?? RARITY_STYLE.Normal
const rarityOf = (key: RarityKey) => RARITIES.find((item) => item.key === key) ?? RARITIES[RARITIES.length - 1]
/** 把配色挂到 CSS 变量上，子元素按稀有度自动着色。 */
const vars = (key: RarityKey) => {
  const style = styleOf(key)
  return `--ink:${style.ink};--halo:${style.halo};--edge:${style.edge};--line:${style.line}`
}
/** 金色是全局强调色，总计行、单发焦点等非稀有度语境统一用它。 */
const GOLD_VARS = '--ink:#f6df9e;--halo:rgba(240,198,106,.14);--edge:rgba(240,198,106,.30);--line:#f0c66a'

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
  text-rendering: optimizeLegibility;
}

/* 所有图片共用同一张「舰桥面板」：同宽、同圆角、同底色，风格自然统一。 */
.card {
  position: relative;
  width: 900px;
  padding: 26px 32px 20px;
  border-radius: 24px;
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

/* 顶边一道青金渐变细线，是四张图共同的「签名」 */
.card::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(124,201,242,0), rgba(124,201,242,.6) 20%, rgba(240,198,106,.55) 66%, rgba(240,198,106,0));
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
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 0 18px -6px rgba(120,205,255,.6);
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

/* ── 战果分布：色片 + 一条按比例分段的细条 ─────────────── */

.tally { margin: 16px 0 4px; }

.tally-chips { display: flex; flex-wrap: wrap; gap: 8px; }

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

.rare-chip .d {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line);
  box-shadow: 0 0 8px var(--line);
}

.rare-chip b { font-size: 13.5px; font-variant-numeric: tabular-nums; }

.tally-bar {
  display: flex;
  gap: 3px;
  height: 6px;
  margin-top: 11px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255,255,255,.05);
}

.tally-bar i { min-width: 5px; border-radius: 999px; background: var(--line); opacity: .85; }

/* ── 舰娘卡 ─────────────────────────────────────────── */

.grid { display: grid; gap: 13px; margin-top: 16px; }

.ship {
  position: relative;
  padding: 9px 9px 11px;
  border-radius: 15px;
  border: 1px solid var(--edge);
  background: linear-gradient(170deg, rgba(255,255,255,.075), rgba(255,255,255,.028));
  box-shadow: 0 6px 16px rgba(3,10,20,.34), inset 0 1px 0 rgba(255,255,255,.07);
}

.ship.hi {
  box-shadow: 0 6px 16px rgba(3,10,20,.34), 0 0 24px -8px var(--line), inset 0 1px 0 rgba(255,255,255,.09);
}

.ship::before {
  content: "";
  position: absolute;
  left: 13px;
  right: 13px;
  top: 0;
  height: 2px;
  border-radius: 0 0 3px 3px;
  background: var(--line);
  opacity: .85;
}

.ship.legend::before {
  opacity: 1;
  background: linear-gradient(90deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4);
}

.ship-av {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 11px;
  background: radial-gradient(120% 90% at 50% 0%, var(--halo), rgba(255,255,255,.03));
}

.ship-av img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 14%;
}

.ship-av::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(8,18,30,.55), rgba(8,18,30,0) 42%);
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
}

.ship-meta i { width: 3px; height: 3px; border-radius: 50%; background: rgba(198,220,242,.3); }
.ship-meta .rr { color: var(--ink); }
.ship-meta .tm { color: rgba(198,220,242,.55); font-variant-numeric: tabular-nums; }

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

/* ── 单发建造：横向焦点位，不留大片空白 ───────────────── */

.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 18px;
  padding: 20px 24px;
  border-radius: 20px;
  border: 1px solid var(--edge);
  background: linear-gradient(110deg, var(--halo), rgba(255,255,255,.022) 62%);
  box-shadow: 0 10px 30px rgba(3,10,20,.32), 0 0 40px -18px var(--line), inset 0 1px 0 rgba(255,255,255,.08);
}

.hero-mark {
  position: absolute;
  right: 16px;
  bottom: -12px;
  font-size: 52px;
  font-weight: 800;
  letter-spacing: 5px;
  color: transparent;
  -webkit-text-stroke: 1px var(--edge);
  opacity: .32;
  white-space: nowrap;
  pointer-events: none;
}

.hero-av {
  position: relative;
  width: 188px;
  height: 188px;
  flex: none;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--edge);
  background: radial-gradient(120% 90% at 50% 0%, var(--halo), rgba(255,255,255,.03));
}

.hero-av img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 14%; }

.hero-av .bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: var(--line);
}

.hero.legend .hero-av .bar {
  background: linear-gradient(90deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4);
}

.hero-body { position: relative; flex: 1; min-width: 0; }

.hero-name {
  margin: 12px 0 10px;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f6fbff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 18px rgba(8,20,34,.6);
}

.hero-meta { display: flex; align-items: center; gap: 9px; font-size: 13px; color: rgba(200,224,246,.66); }
.hero-meta i { width: 3px; height: 3px; border-radius: 50%; background: rgba(198,220,242,.3); }
.hero-meta b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

.hero-flag {
  flex: none;
  align-self: flex-start;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #3a1f00;
  background: linear-gradient(140deg, #ffe9a8, #f0c65c);
  box-shadow: 0 3px 12px rgba(240,198,92,.4);
}

/* ── 概览面板：最常获得 / 收藏进度 ───────────────────── */

.panels { margin-top: 18px; display: grid; grid-template-columns: 1.18fr 1fr; gap: 14px; }

.panel {
  display: flex;
  flex-direction: column;
  padding: 14px 18px 16px;
  border-radius: 18px;
  border: 1px solid rgba(150,205,245,.16);
  background: linear-gradient(120deg, rgba(255,255,255,.055), rgba(255,255,255,.02));
}

.panel.gold { border-color: rgba(240,198,106,.26); background: linear-gradient(120deg, rgba(240,198,106,.13), rgba(255,255,255,.03)); }

.panel-label { font-size: 11.5px; letter-spacing: 1.4px; color: rgba(200,224,246,.55); }
.panel.gold .panel-label { color: rgba(240,214,150,.72); }

.fav-row { margin-top: auto; padding-top: 12px; display: flex; align-items: center; gap: 14px; }

.fav-av {
  width: 54px;
  height: 54px;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid rgba(240,198,106,.55);
  box-shadow: 0 0 0 4px rgba(240,198,106,.10);
}

.fav-av img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 10%; }

.fav-txt { flex: 1; min-width: 0; }

.fav-name {
  font-size: 20px;
  font-weight: 700;
  color: #fdf3d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-sub { margin-top: 3px; font-size: 11.5px; color: rgba(240,214,150,.6); font-variant-numeric: tabular-nums; }

.fav-count { flex: none; text-align: right; }
.fav-count b { font-size: 26px; color: #f4d98a; font-variant-numeric: tabular-nums; }
.fav-count span { margin-left: 3px; font-size: 12px; color: rgba(240,214,150,.7); }

.prog-top { margin-top: auto; padding-top: 12px; display: flex; align-items: baseline; gap: 9px; }
.prog-top b { font-size: 26px; font-weight: 700; color: #a6e2ff; font-variant-numeric: tabular-nums; }
.prog-top span { font-size: 12.5px; color: rgba(200,224,246,.6); font-variant-numeric: tabular-nums; }

.prog-bar { margin-top: 12px; height: 9px; border-radius: 999px; background: rgba(255,255,255,.06); overflow: hidden; }

.prog-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(86,190,240,.5), rgba(160,230,255,.95));
  box-shadow: 0 0 12px rgba(120,210,255,.35);
}

/* ── 统计表 ─────────────────────────────────────────── */

.tbl {
  width: 100%;
  margin-top: 18px;
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
.tbl th:nth-child(n+2) { width: 88px; }
.tbl th:last-child { width: 208px; text-align: right; padding-right: 16px; }

.tbl td {
  padding: 10px 14px;
  text-align: right;
  font-size: 14px;
  color: rgba(233,242,251,.86);
  background: rgba(255,255,255,.038);
  font-variant-numeric: tabular-nums;
}

.tbl td:first-child { text-align: left; border-radius: 11px 0 0 11px; }
.tbl td:last-child { border-radius: 0 11px 11px 0; padding-right: 16px; }

.tbl .c-tot { font-weight: 700; color: #f2f8ff; }

.tbl .c-share > div { display: flex; align-items: center; justify-content: flex-end; gap: 11px; }

.sbar { width: 104px; height: 7px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: 999px; background: var(--line); opacity: .75; }

.c-share em { width: 48px; font-style: normal; font-size: 12.5px; color: var(--ink); }

.tbl tr.sum td { color: #f6df9e; font-weight: 700; background: rgba(240,198,106,.10); }
.tbl tr.sum .c-tot { color: #ffe9ae; }

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

/* ── 建造池 ─────────────────────────────────────────── */

.bands { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }

.band {
  padding: 13px 16px 14px;
  border-radius: 16px;
  border: 1px solid var(--edge);
  background: linear-gradient(120deg, var(--halo), rgba(255,255,255,.022));
}

.band-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 11px; }
.band-hd .olb { font-size: 12px; color: rgba(200,224,246,.5); }
.band-hd .obar { width: 118px; height: 6px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
.band-hd .obar i { display: block; height: 100%; border-radius: 999px; background: var(--line); opacity: .8; }
.band-hd .odds { font-size: 12.5px; color: var(--ink); font-variant-numeric: tabular-nums; }
.band-hd .cnt { margin-left: auto; font-size: 12px; color: rgba(200,224,246,.5); font-variant-numeric: tabular-nums; }

.chips { display: flex; flex-wrap: wrap; gap: 7px; }

.ship-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px 4px 4px;
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

/* ── 排行榜 ─────────────────────────────────────────── */

.rank { margin-top: 18px; }

.rank-row {
  display: grid;
  grid-template-columns: 54px 1fr 208px 72px 90px 60px;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  padding: 9px 16px;
  border-radius: 13px;
  border: 1px solid rgba(255,255,255,.05);
  background: rgba(255,255,255,.038);
}

.rank-head {
  display: grid;
  grid-template-columns: 54px 1fr 208px 72px 90px 60px;
  gap: 12px;
  margin-bottom: 4px;
  padding: 0 16px 6px;
  font-size: 11.5px;
  letter-spacing: 1px;
  color: rgba(160,200,235,.55);
}

.rank-head span:first-child { text-align: center; }
.rank-head span:nth-child(4), .rank-head span:nth-child(5), .rank-head span:nth-child(6) { text-align: right; }

.rank-row.t1 { border-color: rgba(240,198,106,.30); background: linear-gradient(100deg, rgba(240,198,106,.16), rgba(240,198,106,.05)); }
.rank-row.t2 { border-color: rgba(210,226,242,.24); background: linear-gradient(100deg, rgba(210,226,242,.12), rgba(210,226,242,.04)); }
.rank-row.t3 { border-color: rgba(232,167,106,.26); background: linear-gradient(100deg, rgba(232,167,106,.13), rgba(232,167,106,.04)); }

.rk {
  justify-self: center;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
  color: rgba(200,224,246,.5);
  font-variant-numeric: tabular-nums;
}

.rk.t1 { color: #4a3000; background: linear-gradient(140deg, #ffe9a8, #edbe52); box-shadow: 0 2px 10px rgba(240,198,92,.4); }
.rk.t2 { color: #2b3946; background: linear-gradient(140deg, #f2f7fc, #c3d3e2); box-shadow: 0 2px 10px rgba(210,226,242,.28); }
.rk.t3 { color: #40230a; background: linear-gradient(140deg, #f4c795, #d99155); box-shadow: 0 2px 10px rgba(232,167,106,.3); }

.who { min-width: 0; }

.who .nm {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: #eef6ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who .sub { display: block; margin-top: 2px; font-size: 11px; color: rgba(190,215,238,.45); font-variant-numeric: tabular-nums; }

.who .me {
  display: inline-block;
  margin-left: 7px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #0b2033;
  background: rgba(150,225,255,.85);
  vertical-align: 1px;
}

.rate { height: 22px; border-radius: 7px; overflow: hidden; background: rgba(255,255,255,.055); }

.rate i {
  display: block;
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, rgba(86,190,240,.42), rgba(150,225,255,.88));
}

.rank-row.t1 .rate i { background: linear-gradient(90deg, rgba(240,198,106,.45), rgba(255,226,150,.92)); }

.pct { text-align: right; font-size: 13px; font-weight: 700; color: #dfeeff; font-variant-numeric: tabular-nums; }
.cube, .when { text-align: right; font-variant-numeric: tabular-nums; }
.cube { font-size: 13.5px; color: #f4d98a; }
.when { font-size: 12px; color: rgba(190,215,238,.5); }

/* ── 页脚 ───────────────────────────────────────────── */

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

const chip = (key: RarityKey, label: string) =>
  `<span class="chip" style="${vars(key)}"><span class="d"></span>${escape(label)}</span>`

/** 单张舰娘卡：头像 + 舰名 + 稀有度与累计次数，稀有度决定描边与文字色。 */
function shipCard(record: BuildRecord) {
  const classes = ['ship']
  if (HIGHLIGHT.includes(record.rarityKey)) classes.push('hi')
  if (record.rarityKey === 'Legend') classes.push('legend')
  return `<article class="${classes.join(' ')}" style="${vars(record.rarityKey)}">
    <div class="ship-av"><img src="${escape(avatarOf(record.shipName))}" alt=""></div>
    <div class="ship-name">${escape(record.shipName)}</div>
    <div class="ship-meta">
      <span class="rr">${escape(rarityOf(record.rarityKey).name)}</span><i></i>
      <span class="tm">第 ${record.times} 次</span>
    </div>
    <span class="idx">#${record.index}</span>
    ${record.times === 1 ? '<span class="flag">NEW</span>' : ''}
  </article>`
}

/** 单发建造给一个横向焦点位：大头像 + 大名字，比孤零零一张小卡耐看得多。 */
function heroCard(record: BuildRecord, poolName: string) {
  return `<section class="hero${record.rarityKey === 'Legend' ? ' legend' : ''}" style="${vars(record.rarityKey)}">
    <span class="hero-mark">${RARITY_EN[record.rarityKey]}</span>
    <div class="hero-av"><span class="bar"></span><img src="${escape(avatarOf(record.shipName))}" alt=""></div>
    <div class="hero-body">
      ${chip(record.rarityKey, rarityOf(record.rarityKey).name)}
      <div class="hero-name">${escape(record.shipName)}</div>
      <div class="hero-meta">
        <span>${escape(poolName)}舰建造</span><i></i>
        <span>第 <b>${record.index}</b> 发</span><i></i>
        <span>累计第 <b>${record.times}</b> 次获得</span>
      </div>
    </div>
    ${record.times === 1 ? '<div class="hero-flag">NEW</div>' : ''}
  </section>`
}

/** 战果分布：色片给数量，细分段条给比例，一眼看清这一轮的手气。 */
function tally(records: BuildRecord[]) {
  const counts = new Map<RarityKey, number>()
  for (const record of records) counts.set(record.rarityKey, (counts.get(record.rarityKey) ?? 0) + 1)
  const present = RARITIES.filter((rarity) => counts.has(rarity.key))
  if (!present.length) return ''

  const chips = present
    .map((rarity) => `<span class="rare-chip" style="${vars(rarity.key)}"><span class="d"></span>${escape(rarity.name)}<b>${counts.get(rarity.key)}</b></span>`)
    .join('')
  const bar = present
    .map((rarity) => `<i style="${vars(rarity.key)};flex:${counts.get(rarity.key)} 1 0"></i>`)
    .join('')

  return `<div class="tally">
    <div class="tally-chips">${chips}</div>
    <div class="tally-bar">${bar}</div>
  </div>`
}

export function buildResult(records: BuildRecord[], info: BuildInfo) {
  const head = header(
    '建造结果',
    'Build Result',
    `${info.poolName}舰建造 · ${info.times} 发 · 单价 ${info.cost / Math.max(1, info.times)} 魔方`,
    ICON.anchor,
    [['消耗魔方', number(info.cost)], ['剩余魔方', number(info.cube)]],
  )
  const foot = footer([`指挥官 ${info.username}`, `累计建造 ${number(info.buildCount)} 发`])

  if (records.length === 1) {
    return PAGE(`<div class="card">${head}${heroCard(records[0], info.poolName)}${foot}</div>`)
  }

  // 按出货顺序平铺，稀有度靠卡片配色区分；不足一行时居中，避免右侧留白。
  const columns = Math.min(records.length, 5)
  const layout = columns < 5
    ? `grid-template-columns:repeat(${columns},164px);justify-content:center`
    : 'grid-template-columns:repeat(5,1fr)'

  return PAGE(`<div class="card">
    ${head}
    ${tally(records)}
    <div class="grid" style="${layout}">${records.map(shipCard).join('')}</div>
    ${foot}
  </div>`)
}

export interface Favourite {
  name: string
  times: number
  avatar: string
}

export function statsTable(stats: BuildStats, favourite: Favourite, info: StatsInfo) {
  const grand = stats.total?.total ?? 0
  const rate = clamp(info.collectionRate)
  const favShare = grand ? (favourite.times / grand) * 100 : 0

  const row = (label: string, data: StatsRow, key: RarityKey | null) => {
    const share = grand ? Math.min(100, ((data.total ?? 0) / grand) * 100) : 0
    return `<tr${key ? '' : ' class="sum"'} style="${key ? vars(key) : GOLD_VARS}">
      <td>${key ? chip(key, label) : escape(label)}</td>
      <td>${number(data[BuildType.Light])}</td>
      <td>${number(data[BuildType.Heavy])}</td>
      <td>${number(data[BuildType.Special])}</td>
      <td class="c-tot">${number(data.total)}</td>
      <td class="c-share"><div><span class="sbar"><i style="width:${share.toFixed(1)}%"></i></span><em>${share.toFixed(1)}%</em></div></td>
    </tr>`
  }

  const body = RARITIES
    .filter((rarity) => stats[rarity.name])
    .map((rarity) => row(rarity.name, stats[rarity.name], rarity.key))
    .join('')

  return PAGE(`<div class="card">
    ${header('建造记录', 'Build Log', `指挥官 ${info.username} · 累计 ${number(info.buildCount)} 发`, ICON.chart, [['收藏率', percent(rate)], ['魔方', number(info.cube)]])}
    <div class="panels">
      <div class="panel gold">
        <div class="panel-label">最常获得</div>
        <div class="fav-row">
          <div class="fav-av"><img src="${escape(favourite.avatar)}" alt=""></div>
          <div class="fav-txt">
            <div class="fav-name">${escape(favourite.name)}</div>
            <div class="fav-sub">占累计建造 ${favShare.toFixed(1)}%</div>
          </div>
          <div class="fav-count"><b>${number(favourite.times)}</b><span>次</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-label">收藏进度</div>
        <div class="prog-top"><b>${percent(rate)}</b><span>${number(info.owned)} / ${number(info.totalShips)} 艘</span></div>
        <div class="prog-bar"><i style="width:${(rate * 100).toFixed(1)}%"></i></div>
      </div>
    </div>
    <table class="tbl">
      <thead><tr><th>稀有度</th><th>${shortPool(BuildType.Light)}</th><th>${shortPool(BuildType.Heavy)}</th><th>${shortPool(BuildType.Special)}</th><th>总计</th><th>占比</th></tr></thead>
      <tbody>${body}${row('总计', stats.total ?? {}, null)}</tbody>
    </table>
    ${footer([`已收集 ${number(info.owned)} / ${number(info.totalShips)} 艘`, `尚缺 ${number(Math.max(0, info.totalShips - info.owned))} 艘`])}
  </div>`)
}

export function poolTable(pool: ShipRareList, odds: Record<RarityKey, number>, title: string, cost?: number) {
  const columns = RARITIES.filter((rarity) => rarity.key !== 'Legend' || odds.Legend > 0)
  const peak = Math.max(...columns.map((rarity) => odds[rarity.key] ?? 0), 1)

  const bands = columns.map((rarity) => {
    const ships = parsePool(pool[rarity.key])
    const width = ((odds[rarity.key] ?? 0) / peak) * 100
    return `<section class="band" style="${vars(rarity.key)}">
      <div class="band-hd">
        ${chip(rarity.key, rarity.name)}
        <span class="olb">出货率</span>
        <span class="obar"><i style="width:${width.toFixed(1)}%"></i></span>
        <span class="odds">${odds[rarity.key]}%</span>
        <span class="cnt">${ships.length} 艘</span>
      </div>
      <div class="chips">${ships.map((name) => `
        <span class="ship-chip"><img src="${escape(avatarOf(name))}" alt=""><span class="nm">${escape(name)}</span></span>`).join('')}</div>
    </section>`
  }).join('')

  const total = columns.reduce((sum, rarity) => sum + parsePool(pool[rarity.key]).length, 0)

  return PAGE(`<div class="card">
    ${header(title, 'Ship Pool', `共 ${total} 艘舰船 · 按稀有度分层展示`, ICON.list, cost ? [['单发价格', `${cost} 魔方`]] : [])}
    <div class="bands">${bands}</div>
    ${footer(['出货率为配置值', '舰船清单可在插件配置中修改'])}
  </div>`)
}

export function ranking(rows: RankRow[], totalShips = 0, selfId?: string) {
  const body = rows.map((item, index) => {
    const tier = index < 3 ? ` t${index + 1}` : ''
    const rate = clamp(item.collectionRate)
    const owned = totalShips ? Math.round(rate * totalShips) : 0
    return `<div class="rank-row${tier}">
      <div class="rk${tier}">${index + 1}</div>
      <div class="who">
        <span class="nm">${escape(item.username)}${selfId && item.userId === selfId ? '<span class="me">你</span>' : ''}</span>
        ${totalShips ? `<span class="sub">已收集 ${number(owned)} / ${number(totalShips)} 艘</span>` : ''}
      </div>
      <div class="rate"><i style="width:${(rate * 100).toFixed(1)}%"></i></div>
      <div class="pct">${percent(rate)}</div>
      <div class="cube">${number(item.cube)}</div>
      <div class="when">${shortDate(item.lastCheckInTimestamp)}</div>
    </div>`
  }).join('')

  return PAGE(`<div class="card">
    ${header('收藏率排行榜', 'Collection Rank', `前 ${rows.length} 位指挥官`, ICON.crown, [])}
    <div class="rank">
      <div class="rank-head"><span>名次</span><span>指挥官</span><span>收藏率</span><span></span><span>魔方</span><span>签到</span></div>
      ${body}
    </div>
    ${footer([`共 ${rows.length} 位指挥官上榜`, totalShips ? `舰船总数 ${number(totalShips)} 艘` : '按收藏率降序'])}
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
