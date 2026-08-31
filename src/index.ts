import { Context, h, Random, Session } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { Config } from './config'
import { BuildType, countShips, HEAVY_ODDS, LIGHT_ODDS, parsePool, RARITIES, RarityKey, rollRarity, ShipRareList } from './pools'
import { BuildRecord, BuildStats, buildResult, poolTable, ranking, screenshot, statsTable } from './render'
import { createWiki } from './wiki'

export { Config }
export const name = 'azur-lane-building'
export const inject = ['database', 'puppeteer']

export const usage = `## 使用

\`alb.每日魔方\` 领取魔方，\`alb.抽轻型池 [次数]\` 开始建造。

## 指令

| 指令 | 说明 |
| --- | --- |
| \`alb.每日魔方\` | 每日领取魔方 |
| \`alb.抽轻型池 / 抽重型池 / 抽特型池 [次数]\` | 建造 |
| \`alb.轻型池 / 重型池 / 特型池\` | 查看池内容与出货率 |
| \`alb.抽卡记录\` | 个人建造统计 |
| \`alb.收藏率排行榜\` | 收藏率榜 |

## 出货率

| 稀有度 | 轻型 | 重型 / 特型 |
| --- | --- | --- |
| 海上传奇 | — | 1.2% |
| 超稀有 | 7% | 7% |
| 精锐 | 12% | 12% |
| 稀有 | 26% | 51% |
| 普通 | 55% | 28.8% |`

declare module 'koishi' {
  interface Tables {
    azur_lane_building: Building
  }
}

export interface Building {
  id: number
  userId: string
  username: string
  cube: number
  lastCheckInTimestamp: Date
  collectionRate: number
  /** 累计建造发数。 */
  buildCount: number
  /** 舰船名 -> 获得次数，收藏率与「累计第几次」都由它算出来。 */
  shipCounts: Record<string, number>
  /** 各稀有度 × 各池子的建造次数。 */
  buildStats: BuildStats
  /** 旧版本的逐发流水，仅用于一次性迁移，之后不再写入。 */
  buildHistory: { shipName: string }[]
}

const emptyRow = () => ({ [BuildType.Light]: 0, [BuildType.Heavy]: 0, [BuildType.Special]: 0, total: 0 })
const emptyStats = (): BuildStats =>
  Object.fromEntries([...RARITIES.map((rarity) => [rarity.name, emptyRow()]), ['total', emptyRow()]])

const isSameDay = (a: Date | number, b: Date | number) => {
  const [x, y] = [new Date(a), new Date(b)]
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(name)
  const wiki = createWiki(ctx, config.requestTimeout)

  ctx.model.extend('azur_lane_building', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
    cube: 'unsigned',
    lastCheckInTimestamp: 'timestamp',
    collectionRate: 'double',
    buildCount: 'unsigned',
    shipCounts: { type: 'json', initial: {} },
    buildStats: { type: 'json', initial: emptyStats() },
    buildHistory: { type: 'json', initial: [] },
  }, { primary: 'id', autoInc: true })

  const POOLS = {
    light: { name: '轻型', cost: config.LightCost, type: BuildType.Light, pool: config.LightShipBuilding, odds: LIGHT_ODDS },
    heavy: { name: '重型', cost: config.HeavyCost, type: BuildType.Heavy, pool: config.HeavyShipBuilding, odds: HEAVY_ODDS },
    special: { name: '特型', cost: config.SpecialCost, type: BuildType.Special, pool: config.SpecialShipBuilding, odds: HEAVY_ODDS },
  }

  const totalShips = countShips([config.LightShipBuilding, config.HeavyShipBuilding, config.SpecialShipBuilding])

  function line() {
    return config.enableShipLines ? `\n\n“${wiki.shipLine()}”` : ''
  }

  function reply(session: Session, content: h.Fragment): h.Fragment {
    const prefix: h[] = []
    if (config.quoteReply && session.messageId) prefix.push(h.quote(session.messageId))
    if (config.atReply) prefix.push(h.at(session.userId), h('p'))
    return [...prefix, ...h.normalize(content)]
  }

  async function picture(session: Session, html: string, caption?: string) {
    try {
      const buffer = await screenshot(ctx, html)
      return reply(session, caption ? [caption, h.image(buffer, 'image/png')] : h.image(buffer, 'image/png'))
    } catch (error) {
      logger.error('生成图片失败：%s', error.message)
      return reply(session, '❌ 生成图片失败，请查看后台日志。')
    }
  }

  /** 取用户档案；顺带把旧版的逐发流水折叠成计数（只做一次）。 */
  async function profile(userId: string) {
    const [record] = await ctx.database.get('azur_lane_building', { userId })
    if (!record) return null
    if (record.buildHistory?.length && !Object.keys(record.shipCounts ?? {}).length) {
      const counts: Record<string, number> = {}
      for (const item of record.buildHistory) counts[item.shipName] = (counts[item.shipName] ?? 0) + 1
      record.shipCounts = counts
      record.buildCount = record.buildHistory.length
      await ctx.database.set('azur_lane_building', { id: record.id }, {
        shipCounts: counts,
        buildCount: record.buildCount,
        buildHistory: [],
      })
      logger.info('已把 %s 的 %d 条建造流水折叠为计数', userId, record.buildHistory.length)
      record.buildHistory = []
    }
    return record
  }

  const cmd = ctx.command('alb', '碧蓝航线建造模拟器')
    .action(({ session }) => session.execute('help alb'))

  cmd.subcommand('.每日魔方', '领取每日魔方')
    .action(async ({ session }) => {
      const now = new Date()
      const reward = Random.int(
        Math.min(config.dayMinCube, config.dayMaxCube),
        Math.max(config.dayMinCube, config.dayMaxCube) + 1)
      const record = await profile(session.userId)

      if (!record) {
        await ctx.database.create('azur_lane_building', {
          userId: session.userId,
          username: session.username,
          cube: reward,
          lastCheckInTimestamp: now,
          collectionRate: 0,
          buildCount: 0,
          shipCounts: {},
          buildStats: emptyStats(),
          buildHistory: [],
        })
        return reply(session, `✅ 账号已激活，到账 ${reward} 魔方。${line()}`)
      }

      if (isSameDay(now, record.lastCheckInTimestamp)) {
        return reply(session, `⚠️ 今天已经领过每日魔方了。${line()}`)
      }
      const cube = record.cube + reward
      await ctx.database.set('azur_lane_building', { id: record.id }, {
        username: session.username,
        cube,
        lastCheckInTimestamp: now,
      })
      return reply(session, `✅ 领取 ${reward} 魔方成功。当前库存：${cube}${line()}`)
    })

  for (const [key, entry] of Object.entries(POOLS)) {
    cmd.subcommand(`.抽${entry.name}池 [times:posint]`, `进行${entry.name}舰建造`)
      .action(async ({ session }, times = 1) => {
        if (times > config.maxBuildPerCommand) {
          return reply(session, `⚠️ 单次建造不能超过 ${config.maxBuildPerCommand} 发。`)
        }
        const record = await profile(session.userId)
        if (!record) return reply(session, `⚠️ 请先发送「alb.每日魔方」激活账号。${line()}`)

        const need = entry.cost * times
        if (record.cube < need) {
          return reply(session, `⚠️ 魔方不足。当前 ${record.cube}，需要 ${need}。${line()}`)
        }

        const stats: BuildStats = { ...emptyStats(), ...record.buildStats }
        const counts = { ...(record.shipCounts ?? {}) }
        const records: BuildRecord[] = []

        for (let i = 0; i < times; i++) {
          const rarity = rollRarity(entry.odds)
          const ships = parsePool(entry.pool[rarity.key])
          const shipName = ships.length ? Random.pick(ships) : rarity.name

          stats[rarity.name] ??= emptyRow()
          stats[rarity.name][entry.type]++
          stats[rarity.name].total++
          stats.total[entry.type]++
          stats.total.total++

          counts[shipName] = (counts[shipName] ?? 0) + 1
          records.push({
            index: record.buildCount + i + 1,
            buildType: entry.type,
            rarity: rarity.name,
            textColor: rarity.textColor,
            shipName,
            times: counts[shipName],
          })
        }

        const cube = record.cube - need
        await ctx.database.set('azur_lane_building', { id: record.id }, {
          username: session.username,
          cube,
          buildCount: record.buildCount + times,
          shipCounts: counts,
          buildStats: stats,
          collectionRate: totalShips ? Object.keys(counts).length / totalShips : 0,
        })

        return picture(session, buildResult(records),
          `✅ ${times} 发${entry.name}建造完成（消耗 ${need} 魔方，剩余 ${cube}）\n`)
      })

    cmd.subcommand(`.${entry.name}池`, `查看${entry.name}舰建造池`)
      .action(({ session }) => picture(session, poolTable(entry.pool as ShipRareList, entry.odds as Record<RarityKey, number>)))
  }

  cmd.subcommand('.抽卡记录', '查看自己的建造统计')
    .action(async ({ session }) => {
      const record = await profile(session.userId)
      if (!record) return reply(session, `⚠️ 请先发送「alb.每日魔方」激活账号。${line()}`)
      if (!record.buildCount) return reply(session, '⚠️ 还没有进行过建造。')

      const favourite = Object.entries(record.shipCounts ?? {})
        .reduce((best, entry) => entry[1] > best[1] ? entry : best, ['无', 0])[0]
      return picture(session, statsTable(record.buildStats, favourite, await wiki.avatar(favourite)))
    })

  cmd.subcommand('.收藏率排行榜', '查看收藏率排行榜')
    .action(async ({ session }) => {
      const rows = await ctx.database
        .select('azur_lane_building')
        .orderBy('collectionRate', 'desc')
        .limit(config.maxRank)
        .execute()
      if (!rows.length) return reply(session, `⚠️ 排行榜还空着。${line()}`)
      return picture(session, ranking(rows))
    })
}
