import { Context, Random } from 'koishi'
import * as cheerio from 'cheerio'
import { shipData } from './data'

const WIKI = 'https://wiki.biligame.com/blhx/'
export const FALLBACK_AVATAR = 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png'

/** 抓不到台词时顶上的内置台词，保证回复永远不会为了一句话去等网络。 */
const FALLBACK_LINES = [
  '指挥官，今天也要加油哦！',
  '指挥官，欢迎回来～',
  '指挥官，下一次建造说不定就是欧皇时刻。',
  '指挥官，港区一切正常。',
  '指挥官，需要我为您做点什么吗？',
]

const CACHE_MAX = 1024

export function createWiki(ctx: Context, timeout: number) {
  const logger = ctx.logger('azur-lane-building')
  const avatars = new Map<string, string>()
  const lines = new Map<string, string[]>()
  const fetching = new Set<string>()

  const html = (name: string) =>
    ctx.http.get<string>(WIKI + encodeURIComponent(name), { responseType: 'text', timeout })

  function remember<T>(cache: Map<string, T>, key: string, value: T) {
    if (cache.size >= CACHE_MAX) cache.clear()
    cache.set(key, value)
  }

  /** 舰娘头像：本地数据 -> 缓存 -> 抓 wiki。 */
  async function avatar(name: string): Promise<string> {
    if (shipData[name]?.src) return shipData[name].src
    if (avatars.has(name)) return avatars.get(name)

    try {
      const $ = cheerio.load(await html(name))
      let src = $('.wikitable.sculpture img').first().attr('src')
        ?? $(`img[alt^="${name}"][alt$="头像"]`).first().attr('src')
      if (!src) return FALLBACK_AVATAR
      if (!src.startsWith('http')) src = 'https:' + src
      // 缩略图链接还原成原图
      src = src.replace(/\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/[^/]+/, '/$1')
      remember(avatars, name, src)
      return src
    } catch (error) {
      logger.warn('获取 %s 的头像失败：%s', name, error.message)
      return FALLBACK_AVATAR
    }
  }

  /** 后台抓一次台词填缓存，失败就算了，绝不影响当前这条回复。 */
  function warm(name: string) {
    if (fetching.has(name) || lines.has(name)) return
    fetching.add(name)
    html(name).then((page) => {
      const $ = cheerio.load(page)
      const found = $('.ship_word_line').map((_, el) => $(el).text().trim()).get().filter(Boolean)
      if (found.length) remember(lines, name, found)
    }).catch((error) => {
      logger.debug('获取 %s 的台词失败：%s', name, error.message)
    }).finally(() => fetching.delete(name))
  }

  /** 随机一句台词，命中缓存就用真台词，否则先用内置的顶上并预热缓存。 */
  function shipLine(): string {
    const names = Object.keys(shipData)
    if (!names.length) return Random.pick(FALLBACK_LINES)

    const cached = [...lines.values()]
    if (cached.length) {
      warm(Random.pick(names))
      return Random.pick(Random.pick(cached))
    }
    warm(Random.pick(names))
    return Random.pick(FALLBACK_LINES)
  }

  return { avatar, shipLine }
}
