import { present } from './ux'
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
| \`alb.每日魔方\` | 领取每日魔方 |
| \`alb.抽轻型池 [次数]\` | 进行轻型建造 |
| \`alb.抽重型池 [次数]\` | 进行重型建造 |
| \`alb.抽特型池 [次数]\` | 进行特型建造 |
| \`alb.轻型池\` / \`alb.重型池\` / \`alb.特型池\` | 查看对应池内容与出货率 |
| \`alb.建造记录\` | 查看个人建造统计 |
| \`alb.收藏率排行榜\` | 查看收藏率排行 |

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
    return config.enableShipLines ? `\n\n${wiki.shipLine()}` : ''
  }

  function reply(session: Session, content: h.Fragment): h.Fragment {
    const prefix: h[] = []
    if (config.quoteReply && session.messageId) prefix.push(h.quote(session.messageId))
    if (config.atReply) prefix.push(h.at(session.userId), h('p'))
    return [...prefix, ...h.normalize(content)]
  }

  async function picture(session: Session, html: string, caption?: string, text?: string) {
    // 部署者关图与渲染失败走同一条出口：等价文本，不报错
    const fallback = () => reply(session, text ?? '❌ 图片没能生成\n详细原因见后台日志，稍后再试一次。')
    if (config.disableImages) return fallback()
    try {
      const buffer = await screenshot(ctx, html)
      return reply(session, present(h.image(buffer, 'image/png'), h.text(text ?? caption ?? '图片内容')))
    } catch (error) {
      logger.error('生成图片失败：%s', error.message)
      return fallback()
    }
  }

  /** 池内容的文本形态，与图上的稀有度、出货率、舰名一一对应。 */
  function poolText(entry: { name: string; cost: number; pool: ShipRareList; odds: Record<RarityKey, number> }): string {
    const lines = [`📋 ${entry.name}池 · 每发 ${entry.cost} 魔方`]
    for (const rarity of RARITIES) {
      const odds = entry.odds[rarity.key]
      if (!odds) continue
      const ships = parsePool(entry.pool?.[rarity.key] ?? '')
      lines.push(`${rarity.name} ${odds}%${ships.length ? ` · ${ships.join(' / ')}` : ''}`)
    }
    return lines.join('\n')
  }

  /** 建造结果的文本形态：每一发的稀有度与舰名，逐条列出。 */
  function buildText(records: BuildRecord[], info: { name: string; times: number; cost: number; cube: number }): string {
    const rarityOf = new Map(RARITIES.map((item) => [item.key, item.name]))
    const lines = [`✅ ${info.times} 发${info.name}建造完成（消耗 ${info.cost} 魔方，剩余 ${info.cube}）`]
    for (const record of records) {
      lines.push(`第 ${record.index} 发 ${rarityOf.get(record.rarityKey) ?? ''} ${record.shipName}`)
    }
    return lines.join('\n')
  }

  /** 建造记录的文本形态。 */
  function statsText(record: {
    buildStats: BuildStats
    buildCount: number
    cube: number
    collectionRate?: number
  }, info: { owned: number; totalShips: number }): string {
    const lines = [
      '📋 建造记录',
      `收藏率 ${((record.collectionRate ?? 0) * 100).toFixed(1)}%（${info.owned}/${info.totalShips}）`,
      `魔方 ${record.cube} · 累计 ${record.buildCount} 发`,
    ]
    for (const rarity of RARITIES) {
      const row = record.buildStats?.[rarity.name]
      if (row?.total) lines.push(`${rarity.name} ${row.total} 次`)
    }
    return lines.join('\n')
  }

  /** 收藏率排行榜的文本形态。 */
  function rankText(rows: { username?: string; collectionRate?: number }[]): string {
    const lines = [`📋 收藏率排行榜 · 前 ${rows.length} 位`]
    rows.forEach((row, index) => {
      lines.push(`${index + 1}. ${row.username || '无名氏'} ${((row.collectionRate ?? 0) * 100).toFixed(1)}%`)
    })
    return lines.join('\n')
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

  /** 建造与签到都读改写同一份港区档案，按用户串行。 */
  const busy = new Set<string>()

  cmd.subcommand('.每日魔方', '领取今日份魔方')
    .action(async ({ session }) => {
      if (busy.has(session.userId)) return reply(session, '⏳ 上一次的操作还在处理\n稍等再发一次。')
      busy.add(session.userId)
      try {
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
          const next = new Date(now)
          next.setHours(24, 0, 0, 0)
          const left = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60000))
          const hours = Math.floor(left / 60)
          const minutes = left % 60
          return reply(session, `💡 今天的魔方已经领过了\n跨零点后重置，还要等 ${hours} 小时 ${minutes} 分。\n发送「alb.抽轻型池」先用现有魔方建造。${line()}`)
        }
        const cube = record.cube + reward
        await ctx.database.set('azur_lane_building', { id: record.id }, {
          username: session.username,
          cube,
          lastCheckInTimestamp: now,
        })
        return reply(session, `✅ 领取 ${reward} 魔方成功。当前库存：${cube}${line()}`)
      } finally {
        busy.delete(session.userId)
      }
    })

  for (const [key, entry] of Object.entries(POOLS)) {
    cmd.subcommand(`.抽${entry.name}池 [times:posint]`, `进行${entry.name}舰建造`)
      .action(async ({ session }, times = 1) => {
        if (times > config.maxBuildPerCommand) {
          return reply(session, `⚠️ 单次建造最多 ${config.maxBuildPerCommand} 发\n分几条指令，或把次数改小一些。`)
        }
        if (busy.has(session.userId)) return reply(session, '⏳ 上一次的操作还在处理\n稍等再发一次。')
        busy.add(session.userId)
        try {
          const record = await profile(session.userId)
          if (!record) return reply(session, `💡 账号还没有激活\n发送「alb.每日魔方」领一份魔方，港区就开张了。${line()}`)

          const need = entry.cost * times
          if (record.cube < need) {
            return reply(session, `⚠️ 魔方不足\n这一次需要 ${need}，当前 ${record.cube}。\n发送「alb.每日魔方」领取今日份。${line()}`)
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
              rarityKey: rarity.key,
              shipName,
              times: counts[shipName],
            })
          }

          const cube = record.cube - need
          const buildCount = record.buildCount + times
          const owned = Object.keys(counts).length
          await ctx.database.set('azur_lane_building', { id: record.id }, {
            username: session.username,
            cube,
            buildCount,
            shipCounts: counts,
            buildStats: stats,
            collectionRate: totalShips ? owned / totalShips : 0,
          })

          return picture(session, buildResult(records, {
            poolName: entry.name,
            times,
            cost: need,
            cube,
            username: session.username,
            buildCount,
          }), `✅ ${times} 发${entry.name}建造完成（消耗 ${need} 魔方，剩余 ${cube}）\n`,
            buildText(records, { name: entry.name, times, cost: need, cube }))
        } finally {
          busy.delete(session.userId)
        }
      })

    cmd.subcommand(`.${entry.name}池`, '查看可造舰船与出货率')
      .action(({ session }) => picture(
        session,
        poolTable(entry.pool as ShipRareList, entry.odds as Record<RarityKey, number>, entry.type, entry.cost),
        undefined,
        poolText({ name: entry.name, cost: entry.cost, pool: entry.pool as ShipRareList, odds: entry.odds }),
      ))
  }

  cmd.subcommand('.建造记录', '查看个人建造统计')
    .action(async ({ session }) => {
      const record = await profile(session.userId)
      if (!record) return reply(session, `💡 账号还没有激活\n发送「alb.每日魔方」领一份魔方，港区就开张了。${line()}`)
      if (!record.buildCount) return reply(session, '📋 还没有建造记录\n开过第一发之后，这里会记下出货分布与收藏进度。\n发送「alb.抽轻型池」试一发。')

      const [favouriteName, favouriteTimes] = Object.entries(record.shipCounts ?? {})
        .reduce((best, entry) => entry[1] > best[1] ? entry : best, ['无', 0])
      const owned = Object.keys(record.shipCounts ?? {}).length
      return picture(session, statsTable(record.buildStats, {
        name: favouriteName,
        times: favouriteTimes,
        avatar: await wiki.avatar(favouriteName),
      }, {
        username: session.username,
        buildCount: record.buildCount,
        cube: record.cube,
        collectionRate: record.collectionRate ?? 0,
        owned,
        totalShips,
      }), undefined, statsText(record, { owned, totalShips }))
    })

  cmd.subcommand('.收藏率排行榜', '查看收藏进度排名')
    .action(async ({ session }) => {
      const rows = await ctx.database
        .select('azur_lane_building')
        .orderBy('collectionRate', 'desc')
        .limit(config.maxRank)
        .execute()
      if (!rows.length) {
        return reply(session, `📋 排行榜还空着\n第一位开始建造的指挥官，名字会写在这里。\n发送「alb.抽轻型池」开一发。${line()}`)
      }
      return picture(session, ranking(rows, totalShips, session.userId), undefined, rankText(rows))
    })
}
