import { Random } from 'koishi'
import { lch } from './m3'

export enum BuildType {
  Light = '轻型舰建造',
  Heavy = '重型舰建造',
  Special = '特型舰建造',
}

export type RarityKey = 'Legend' | 'SuperRare' | 'Elite' | 'Rare' | 'Normal'

/**
 * 稀有度的色相与彩度，全插件唯一的一份。
 *
 * 色相沿用游戏里的约定（传奇粉、超稀金、精锐紫、稀有蓝、普通灰），玩家认得出；
 * 色调与彩度则交给设计系统，由 `lch()` 现算——深色卡片和浅色表格各取所需的色调，
 * 但同一个稀有度在两处永远是同一支色相。
 */
export const RARITY_SOURCE: Record<RarityKey, { hue: number; chroma: number }> = {
  Legend: { hue: 340, chroma: 48 },
  SuperRare: { hue: 88, chroma: 52 },
  Elite: { hue: 300, chroma: 44 },
  Rare: { hue: 240, chroma: 44 },
  Normal: { hue: 250, chroma: 8 },
}

/** 稀有度从高到低，抽卡时按这个顺序累加概率。 */
export const RARITIES: { key: RarityKey; name: string; textColor: string; color: string }[] = (
  [
    ['Legend', '海上传奇'],
    ['SuperRare', '超稀有'],
    ['Elite', '精锐'],
    ['Rare', '稀有'],
    ['Normal', '普通'],
  ] as [RarityKey, string][]
).map(([key, name]) => {
  const { hue, chroma } = RARITY_SOURCE[key]
  return { key, name, textColor: lch(46, chroma, hue), color: lch(72, chroma, hue) }
})

export const RARITY_NAMES = RARITIES.map((item) => item.name)

/** 轻型池没有海上传奇。 */
export const LIGHT_ODDS: Record<RarityKey, number> = { Legend: 0, SuperRare: 7, Elite: 12, Rare: 26, Normal: 55 }
export const HEAVY_ODDS: Record<RarityKey, number> = { Legend: 1.2, SuperRare: 7, Elite: 12, Rare: 51, Normal: 28.8 }

export interface ShipRareList {
  Legend?: string
  SuperRare: string
  Elite: string
  Rare: string
  Normal: string
}

/** 池子配置是「、」分隔的一长串，拆成数组并去掉空项。 */
export const parsePool = (list: string) =>
  (list ?? '').split('、').map((name) => name.trim()).filter(Boolean)

/** 按概率表抽一次稀有度，概率以千分之一为精度。 */
export function rollRarity(odds: Record<RarityKey, number>) {
  const roll = Random.int(1000)
  let cursor = 0
  for (const rarity of RARITIES) {
    cursor += (odds[rarity.key] ?? 0) * 10
    if (roll < cursor) return rarity
  }
  return RARITIES[RARITIES.length - 1]
}

/** 三个池子里出现过的舰船总数，用作收藏率的分母。 */
export function countShips(pools: ShipRareList[]) {
  const names = new Set<string>()
  for (const pool of pools) {
    for (const list of Object.values(pool ?? {})) parsePool(list).forEach((name) => names.add(name))
  }
  return names.size
}
