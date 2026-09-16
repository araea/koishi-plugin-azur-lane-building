import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { baseline, components, FONT_STACK, lch, MEDAL, MONO_STACK, scheme } from './m3'
import { shipData } from './data'
import { BuildType, parsePool, RARITIES, RARITY_SOURCE, RarityKey, ShipRareList } from './pools'
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

/** 碧蓝航线取海军蓝主调，暗色方案，和舰桥面板的气质一致。 */
const HUE = 245
const SCHEME = scheme(HUE, true)

const escape = (text: string) => h.escape(String(text ?? ''))
const avatarOf = (name: string) => shipData[name]?.src ?? FALLBACK_AVATAR
const shortPool = (type: BuildType) => type.replace('舰建造', '')
const number = (value: number) => (value ?? 0).toLocaleString('zh-CN')
const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const clamp = (value: number) => Math.max(0, Math.min(1, value || 0))

/**
 * 稀有度在深色卡片上的四种取值：ink 文字、halo 填充、edge 描边、line 高亮。
 *
 * 色相取自 `RARITY_SOURCE`（与表格、文字输出同一份），色调则一律固定：
 * 文字 84、高亮 70。于是五档并排时明度是齐的，「哪个更亮」不再暗示
 * 「哪个更稀有」——稀有度该由色相说了算。
 */
const rarityStyle = ({ hue, chroma }: { hue: number; chroma: number }) => ({
  ink: lch(84, Math.min(chroma, 28), hue),
  halo: lch(70, chroma, hue) + '22',
  edge: lch(70, chroma, hue) + '66',
  line: lch(70, chroma, hue),
})

const RARITY_STYLE: Record<RarityKey, { ink: string; halo: string; edge: string; line: string }> =
  Object.fromEntries(
    Object.entries(RARITY_SOURCE).map(([key, source]) => [key, rarityStyle(source)]),
  ) as Record<RarityKey, { ink: string; halo: string; edge: string; line: string }>

/** 单发焦点位右侧的稀有度水印，只描边不填色，安静地压住大片留白。 */
const RARITY_EN: Record<RarityKey, string> = {
  Legend: 'LEGENDARY',
  SuperRare: 'SUPER RARE',
  Elite: 'ELITE',
  Rare: 'RARE',
  Normal: 'NORMAL',
}

/** 海上传奇与超稀有值得被一眼看见，卡片抬高一档高度。 */
const HIGHLIGHT: RarityKey[] = ['Legend', 'SuperRare']

const styleOf = (key: RarityKey) => RARITY_STYLE[key] ?? RARITY_STYLE.Normal
const rarityOf = (key: RarityKey) => RARITIES.find((item) => item.key === key) ?? RARITIES[RARITIES.length - 1]
/** 把配色挂到 CSS 变量上，子元素按稀有度自动着色。 */
const vars = (key: RarityKey) => {
  const style = styleOf(key)
  return `--ink:${style.ink};--halo:${style.halo};--edge:${style.edge};--line:${style.line}`
}
/*
 * 非稀有度语境的强调（总计行、单发焦点、统计数值）一律走配色方案的主色，
 * 不再另立一支本插件专属的金色强调色——同一个群里前后脚出现的几张图，
 * 强调色得是同一支。名次的金银铜仍走 MEDAL，那是固定语义。
 */

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

/**
 * 要对齐的读数（次数、名次、占比、魔方数、日期）走等宽栈。等宽栈里没有汉字，
 * 把正文栈接在后面，读数里夹着的「第」「次」「艘」才不掉队。
 */
const NUM_FONT = `${MONO_STACK},${FONT_STACK}`

/** 名次徽章前三名借设计系统的金银铜档，其余退回 m3-badge 的中性档。 */
const MEDAL_CLASS = ['m3-badge--gold', 'm3-badge--silver', 'm3-badge--bronze']

const STYLE = `
${baseline(SCHEME)}${components()}
/* 截图对象是 .card，底色透明即可；其余排版重置由 baseline 给。 */
body { padding: 22px; background: transparent; }

/* 所有图片共用同一张「舰桥面板」：同宽、同圆角、同底色，风格自然统一。 */
.card {
  position: relative;
  width: 900px;
  padding: 26px 32px 20px;
  border-radius: var(--md-sys-shape-corner-extra-large-increased);
  overflow: hidden;
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
}

/* 顶边一道主色细线，是四张图共同的「签名」 */
.card::after {
  content: "";
  position: absolute;
  left: 32px;
  top: 0;
  width: 72px;
  height: 4px;
  border-radius: 0 0 var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small);
  background: var(--md-sys-color-primary);
  pointer-events: none;
}

.card > * { position: relative; }

.hd {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.hd-badge {
  width: 46px;
  height: 46px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--md-sys-shape-corner-large);
  color: var(--md-sys-color-on-primary-container);
  border: 1px solid var(--md-sys-color-primary);
  background: var(--md-sys-color-primary-container);
  box-shadow: var(--md-sys-elevation-level0);
}

.hd-badge svg { width: 24px; height: 24px; }

.hd-text { flex: 1; min-width: 0; }

.hd-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: var(--md-sys-typescale-headline-small-size);
  font-weight: 600;
  letter-spacing: .5px;
  color: var(--md-sys-color-on-surface);
}

.hd-en {
  font-size: var(--md-sys-typescale-label-small-size);
  font-weight: 600;
  letter-spacing: 2.4px;
  color: var(--md-sys-color-on-surface-variant);
  text-transform: uppercase;
}

.hd-sub {
  margin-top: 5px;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.hd-metrics { flex: none; display: flex; gap: 10px; }

.metric {
  min-width: 92px;
  padding: 8px 14px;
  text-align: center;
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
}

.metric .mv {
  display: block;
  font-family: ${NUM_FONT};
  font-size: var(--md-sys-typescale-title-large-size);
  font-weight: 600;
  color: var(--md-sys-color-primary);
  font-variant-numeric: tabular-nums;
}

.metric .ml {
  display: block;
  margin-top: 2px;
  font-size: var(--md-sys-typescale-label-small-size);
  letter-spacing: .6px;
  color: var(--md-sys-color-on-surface-variant);
}

/* ── 战果分布：色片 + 一条按比例分段的细条 ─────────────── */

.tally { margin: 16px 0 4px; }

.tally-chips { display: flex; flex-wrap: wrap; gap: 8px; }

.rare-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--ink);
  background: var(--halo);
  border: 1px solid var(--edge);
}

.rare-chip .d {
  width: 7px;
  height: 7px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--line);
}

.rare-chip b { font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-large-size); font-weight: 600; font-variant-numeric: tabular-nums; }

.tally-bar {
  display: flex;
  gap: 3px;
  height: 6px;
  margin-top: 11px;
  border-radius: var(--md-sys-shape-corner-full);
  overflow: hidden;
  background: var(--md-sys-color-surface-container-high);
}

.tally-bar i { min-width: 5px; border-radius: var(--md-sys-shape-corner-full); background: var(--line); opacity: .85; }

/* ── 舰娘卡 ─────────────────────────────────────────── */

.grid { display: grid; gap: 13px; margin-top: 16px; }

.ship {
  position: relative;
  padding: 9px 9px 11px;
  border-radius: var(--md-sys-shape-corner-large);
  border: 1px solid var(--edge);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level1);
}

/* 焦点卡抬到第二档高度；原来那道稀有度辉光是自造阴影值，已并掉。 */
.ship.hi {
  box-shadow: var(--md-sys-elevation-level2);
}

.ship::before {
  content: "";
  position: absolute;
  left: 13px;
  right: 13px;
  top: 0;
  height: 2px;
  border-radius: 0 0 var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small);
  background: var(--line);
  opacity: .85;
}

.ship.legend::before {
  opacity: 1;
  background: var(--md-sys-color-primary);
}

.ship-av {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--halo);
}

.ship-av img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 14%;
}

/* 真的压在头像上的半透明遮罩：为压住照片的亮部保留 rgba，取不到角色色。 */
.ship-av::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(8,18,30,.55), rgba(8,18,30,0) 42%);
}

.ship-name {
  margin-top: 9px;
  font-size: var(--md-sys-typescale-title-small-size);
  font-weight: 600;
  letter-spacing: .3px;
  text-align: center;
  color: var(--md-sys-color-on-surface);
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
  font-size: var(--md-sys-typescale-label-small-size);
}

.ship-meta i { width: 3px; height: 3px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-outline); }
.ship-meta .rr { color: var(--ink); }
.ship-meta .tm { font-family: ${NUM_FONT}; color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }

/* 序号压在头像上，遮罩取 scrim 角色色，尾部的 a8 是压在图片上的那层透明。 */
.idx {
  position: absolute;
  top: 15px;
  left: 15px;
  padding: 2px 7px;
  border-radius: var(--md-sys-shape-corner-full);
  font-family: ${NUM_FONT};
  font-size: var(--md-sys-typescale-label-small-size);
  color: var(--md-sys-color-on-surface);
  background: ${SCHEME.scrim}a8;
  font-variant-numeric: tabular-nums;
}

.flag {
  position: absolute;
  top: 13px;
  right: 13px;
  padding: 3px 8px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-small-size);
  font-weight: 600;
  letter-spacing: .6px;
  color: var(--md-sys-color-on-primary);
  background: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
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
  border-radius: var(--md-sys-shape-corner-large-increased);
  border: 1px solid var(--edge);
  background: var(--halo);
  box-shadow: var(--md-sys-elevation-level3);
}

.hero-mark {
  position: absolute;
  right: 16px;
  bottom: -12px;
  font-size: var(--md-sys-typescale-display-large-size);
  font-weight: 600;
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
  border-radius: var(--md-sys-shape-corner-large);
  border: 1px solid var(--edge);
  background: var(--halo);
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
  background: var(--md-sys-color-primary);
}

.hero-body { position: relative; flex: 1; min-width: 0; }

.hero-name {
  margin: 12px 0 10px;
  font-size: var(--md-sys-typescale-display-small-size);
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-meta { display: flex; align-items: center; gap: 9px; font-size: var(--md-sys-typescale-body-small-size); color: var(--md-sys-color-on-surface-variant); }
.hero-meta i { width: 3px; height: 3px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-outline); }
.hero-meta b { font-family: ${NUM_FONT}; color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

.hero-flag {
  flex: none;
  align-self: flex-start;
  padding: 4px 11px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-small-size);
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--md-sys-color-on-primary);
  background: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
}

/* ── 概览面板：最常获得 / 收藏进度 ───────────────────── */

.panels { margin-top: 18px; display: grid; grid-template-columns: 1.18fr 1fr; gap: 14px; }

.panel {
  display: flex;
  flex-direction: column;
  padding: 14px 18px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
}

/* 「gold」是沿用下来的类名，语义是「强调面板」，色值改走主色容器。 */
.panel.gold { border-color: var(--md-sys-color-primary); background: var(--md-sys-color-primary-container); }

.panel-label { font-size: var(--md-sys-typescale-label-small-size); letter-spacing: 1.4px; color: var(--md-sys-color-on-surface-variant); }
.panel.gold .panel-label { color: var(--md-sys-color-on-primary-container); }

.fav-row { margin-top: auto; padding-top: 12px; display: flex; align-items: center; gap: 14px; }

.fav-av {
  width: 54px;
  height: 54px;
  flex: none;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-full);
  border: 2px solid var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
}

.fav-av img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 10%; }

.fav-txt { flex: 1; min-width: 0; }

.fav-name {
  font-size: var(--md-sys-typescale-title-large-size);
  font-weight: 600;
  color: var(--md-sys-color-on-primary-container);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-sub { margin-top: 3px; font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-small-size); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }

.fav-count { flex: none; text-align: right; }
.fav-count b { font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-headline-medium-size); font-weight: 600; color: var(--md-sys-color-on-primary-container); font-variant-numeric: tabular-nums; }
.fav-count span { margin-left: 3px; font-size: var(--md-sys-typescale-label-medium-size); color: var(--md-sys-color-on-surface-variant); }

.prog-top { margin-top: auto; padding-top: 12px; display: flex; align-items: baseline; gap: 9px; }
.prog-top b { font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-headline-medium-size); font-weight: 600; color: var(--md-sys-color-primary); font-variant-numeric: tabular-nums; }
.prog-top span { font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-body-small-size); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }

.prog-bar { margin-top: 12px; height: 9px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-surface-container-highest); overflow: hidden; }

.prog-bar i {
  display: block;
  height: 100%;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
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
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: 600;
  letter-spacing: .8px;
  color: var(--md-sys-color-on-surface-variant);
}

.tbl th:first-child { text-align: left; }
.tbl th:nth-child(n+2) { width: 88px; }
.tbl th:last-child { width: 208px; text-align: right; padding-right: 16px; }

.tbl td {
  padding: 10px 14px;
  text-align: right;
  font-family: ${NUM_FONT};
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container-high);
  font-variant-numeric: tabular-nums;
}

.tbl td:first-child { text-align: left; border-radius: var(--md-sys-shape-corner-medium) 0 0 var(--md-sys-shape-corner-medium); }
.tbl td:last-child { border-radius: 0 var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium) 0; padding-right: 16px; }

.tbl .c-tot { font-weight: 600; color: var(--md-sys-color-on-surface); }

.tbl .c-share > div { display: flex; align-items: center; justify-content: flex-end; gap: 11px; }

.sbar { width: 104px; height: 7px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-surface-container-highest); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: var(--md-sys-shape-corner-full); background: var(--line); opacity: .75; }

.c-share em { width: 48px; font-style: normal; font-size: var(--md-sys-typescale-label-medium-size); color: var(--ink); }

.tbl tr.sum td { color: var(--md-sys-color-on-primary-container); font-weight: 600; background: var(--md-sys-color-primary-container); }
.tbl tr.sum .c-tot { color: var(--md-sys-color-on-primary-container); }
/* 总计行不带稀有度变量，条与占比改走主色与容器前景色。 */
.tbl tr.sum .sbar i { background: var(--md-sys-color-primary); }
.tbl tr.sum .c-share em { color: var(--md-sys-color-on-primary-container); }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: 600;
  color: var(--ink);
  background: var(--halo);
  border: 1px solid var(--edge);
}

.chip .d {
  width: 7px;
  height: 7px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--line);
}

/* ── 建造池 ─────────────────────────────────────────── */

.bands { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }

/* 分层改由容器色承担，稀有度仍由描边、色片与色条三重交代。 */
.band {
  padding: 13px 16px 14px;
  border-radius: var(--md-sys-shape-corner-large);
  border: 1px solid var(--edge);
  background: var(--md-sys-color-surface-container-high);
}

.band-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 11px; }
.band-hd .olb { font-size: var(--md-sys-typescale-label-medium-size); color: var(--md-sys-color-on-surface-variant); }
.band-hd .obar { width: 118px; height: 6px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-surface-container-highest); overflow: hidden; }
.band-hd .obar i { display: block; height: 100%; border-radius: var(--md-sys-shape-corner-full); background: var(--line); opacity: .8; }
.band-hd .odds { font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-medium-size); color: var(--ink); font-variant-numeric: tabular-nums; }
.band-hd .cnt { margin-left: auto; font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-medium-size); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }

.chips { display: flex; flex-wrap: wrap; gap: 7px; }

.ship-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px 4px 4px;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-highest);
}

.ship-chip img {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: var(--md-sys-shape-corner-small);
  object-fit: cover;
  object-position: center 12%;
}

.ship-chip .nm { font-size: var(--md-sys-typescale-label-medium-size); color: var(--ink); }

/* ── 排行榜 ─────────────────────────────────────────── */

.rank { margin-top: 18px; }

.rank-row {
  display: grid;
  grid-template-columns: 54px 1fr 208px 72px 90px 60px;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  padding: 9px 16px;
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
}

.rank-head {
  display: grid;
  grid-template-columns: 54px 1fr 208px 72px 90px 60px;
  gap: 12px;
  margin-bottom: 4px;
  padding: 0 16px 6px;
  font-size: var(--md-sys-typescale-label-small-size);
  letter-spacing: 1px;
  color: var(--md-sys-color-on-surface-variant);
}

.rank-head span:first-child { text-align: center; }
.rank-head span:nth-child(4), .rank-head span:nth-child(5), .rank-head span:nth-child(6) { text-align: right; }

/*
 * 前三名的底色与描边取 MEDAL 的金银铜，尾两位是叠在卡片色上的透明度。
 * 名次的含义固定，不跟主题变色；徽章里的数字始终在场，颜色不是唯一通道。
 */
.rank-row.t1 { border-color: ${MEDAL.gold}4d; background: linear-gradient(100deg, ${MEDAL.gold}29, ${MEDAL.gold}0d); }
.rank-row.t2 { border-color: ${MEDAL.silver}3d; background: linear-gradient(100deg, ${MEDAL.silver}1f, ${MEDAL.silver}0a); }
.rank-row.t3 { border-color: ${MEDAL.bronze}42; background: linear-gradient(100deg, ${MEDAL.bronze}21, ${MEDAL.bronze}0a); }

/*
 * 名次徽章降级到 m3-badge：底色与字色（前三名金银铜、其余中性档）由组件给，
 * 这里只把几何钉回原本的 30px 方块——组件默认 28px、左右各 8px 内边距。
 */
.rk {
  justify-self: center;
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--md-sys-shape-corner-full);
  font-family: ${NUM_FONT};
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.who { min-width: 0; }

.who .nm {
  display: block;
  font-size: var(--md-sys-typescale-title-small-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who .sub { display: block; margin-top: 2px; font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-small-size); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }

.who .me {
  display: inline-block;
  margin-left: 7px;
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-small-size);
  font-weight: 600;
  color: var(--md-sys-color-on-primary);
  background: var(--md-sys-color-primary);
  vertical-align: 1px;
}

.rate { height: 22px; border-radius: var(--md-sys-shape-corner-small); overflow: hidden; background: var(--md-sys-color-surface-container-highest); }

.rate i {
  display: block;
  height: 100%;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-primary);
}

/* 榜首的条与徽章同色，名次的金银铜不跟主题走。 */
.rank-row.t1 .rate i { background: ${MEDAL.gold}; }

.pct { text-align: right; font-family: ${NUM_FONT}; font-size: var(--md-sys-typescale-label-medium-size); font-weight: 600; color: var(--md-sys-color-on-surface); font-variant-numeric: tabular-nums; }
.cube, .when { text-align: right; font-family: ${NUM_FONT}; font-variant-numeric: tabular-nums; }
.cube { font-size: var(--md-sys-typescale-label-large-size); color: var(--md-sys-color-primary); }
.when { font-size: var(--md-sys-typescale-label-medium-size); color: var(--md-sys-color-on-surface-variant); }

/* ── 页脚 ───────────────────────────────────────────── */

.ft {
  margin-top: 20px;
  padding-top: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.ft i { width: 3px; height: 3px; border-radius: var(--md-sys-shape-corner-full); background: var(--md-sys-color-outline-variant); }
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
    return `<tr${key ? '' : ' class="sum"'}${key ? ` style="${vars(key)}"` : ''}>
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
      <div class="rk m3-badge${index < 3 ? ` ${MEDAL_CLASS[index]}` : ''}">${index + 1}</div>
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
