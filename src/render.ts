import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { shipData } from './data'
import { BuildType, parsePool, RARITIES, RarityKey, ShipRareList } from './pools'
import { FALLBACK_AVATAR } from './wiki'

export interface BuildRecord {
  index: number
  buildType: BuildType
  rarity: string
  textColor: string
  shipName: string
  times: number
}

export type StatsRow = Record<string, number>
export type BuildStats = Record<string, StatsRow>

const escape = (text: string) => h.escape(String(text ?? ''))
const avatarOf = (name: string) => shipData[name]?.src ?? FALLBACK_AVATAR

const PAGE = (body: string) => `<!DOCTYPE html>
<html lang="zh"><head><meta charset="UTF-8"><style>
  body { margin: 0; padding: 20px; background: #f5f5f5; font-family: "Microsoft YaHei", sans-serif; }
  .card { max-width: 900px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  h2 { margin: 0 0 16px; color: #333; text-align: center; }
  table { width: 100%; border-collapse: collapse; text-align: center; }
  th { padding: 10px; background: #4a90e2; color: #fff; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  img.avatar { width: 30px; height: 30px; border-radius: 50%; vertical-align: middle; }
</style></head><body>${body}</body></html>`

export function buildResult(records: BuildRecord[]) {
  const rows = records.map((record) => `
    <tr>
      <td>${record.index}</td>
      <td style="text-align:left"><img class="avatar" src="${escape(avatarOf(record.shipName))}"> ${escape(record.shipName)}</td>
      <td style="color:${record.textColor};font-weight:bold">${escape(record.rarity)}</td>
      <td>${escape(record.buildType.replace('舰建造', ''))}</td>
      <td>第 ${record.times} 次</td>
    </tr>`).join('')

  return PAGE(`<div class="card"><h2>本次建造结果</h2>
    <table><thead><tr><th>序号</th><th>舰娘</th><th>稀有度</th><th>池子</th><th>累计</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`)
}

export function statsTable(stats: BuildStats, favourite: string, avatar: string) {
  const number = (value: number) => (value ?? 0).toLocaleString('zh-CN')
  const row = (label: string, data: StatsRow, total = false) => `
    <tr style="${total ? 'background:#e8f4f8;font-weight:bold' : ''}">
      <td style="text-align:left">${escape(label)}</td>
      <td>${number(data[BuildType.Light])}</td>
      <td>${number(data[BuildType.Heavy])}</td>
      <td>${number(data[BuildType.Special])}</td>
      <td style="background:#f0f8ff">${number(data.total)}</td>
    </tr>`

  const body = RARITIES
    .filter((rarity) => stats[rarity.name])
    .map((rarity) => row(rarity.name, stats[rarity.name]))
    .join('')

  return PAGE(`<div class="card">
    <div style="display:flex;align-items:center;margin-bottom:16px;padding:12px;background:#f5f5f5;border-radius:8px">
      <h3 style="margin:0">⭐ 最常获得：${escape(favourite)}</h3>
      <img src="${escape(avatar)}" style="width:40px;height:40px;border-radius:50%;margin-left:10px">
    </div>
    <table><thead><tr><th>稀有度</th><th>${BuildType.Light}</th><th>${BuildType.Heavy}</th><th>${BuildType.Special}</th><th>总计</th></tr></thead>
    <tbody>${body}${row('总计', stats.total ?? {}, true)}</tbody></table></div>`)
}

export function poolTable(pool: ShipRareList, odds: Record<RarityKey, number>) {
  const columns = RARITIES.filter((rarity) => rarity.key !== 'Legend' || odds.Legend > 0)
  const head = columns.map((rarity) =>
    `<th style="background:${rarity.color};color:#333">${rarity.name} ${odds[rarity.key]}%</th>`).join('')
  const body = columns.map((rarity) => `<td style="vertical-align:top;text-align:left">${
    parsePool(pool[rarity.key]).map((name) => `
      <div style="display:inline-block;margin:2px">
        <img class="avatar" style="border-radius:4px" src="${escape(avatarOf(name))}">
        <span style="color:${rarity.textColor};font-size:12px">${escape(name)}</span>
      </div>`).join('')
  }</td>`).join('')

  return PAGE(`<div class="card"><table><thead><tr>${head}</tr></thead><tbody><tr>${body}</tr></tbody></table></div>`)
}

export function ranking(rows: { username: string; collectionRate: number; cube: number; lastCheckInTimestamp: Date }[]) {
  const body = rows.map((item, index) => `
    <tr>
      <td style="color:${index < 3 ? '#f5a623' : '#666'};font-weight:bold">#${index + 1}</td>
      <td>${escape(item.username)}</td>
      <td style="color:#4a90e2;font-weight:bold">${(item.collectionRate * 100).toFixed(2)}%</td>
      <td>${item.cube}</td>
      <td style="color:#999;font-size:.9em">${new Date(item.lastCheckInTimestamp).toLocaleDateString('zh-CN')}</td>
    </tr>`).join('')

  return PAGE(`<div class="card"><h2>收藏率排行榜</h2>
    <table><thead><tr><th>排名</th><th>指挥官</th><th>收藏率</th><th>魔方</th><th>最后签到</th></tr></thead>
    <tbody>${body}</tbody></table>
    <div style="margin-top:10px;color:#999;font-size:12px;text-align:right">统计截止：${new Date().toLocaleString('zh-CN')}</div></div>`)
}

/** 截图；头像来自外网，用 networkidle0 等图片加载完，超时也照样出图。 */
export async function screenshot(ctx: Context, html: string) {
  const page = await ctx.puppeteer.page()
  try {
    await page.setViewport({ width: 1000, height: 400 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
    return await (await page.$('.card')).screenshot({ type: 'png' })
  } finally {
    await page.close()
  }
}
