import { Random } from 'koishi'

export enum BuildType {
  Light = '轻型舰建造',
  Heavy = '重型舰建造',
  Special = '特型舰建造',
}

export type RarityKey = 'Legend' | 'SuperRare' | 'Elite' | 'Rare' | 'Normal'

/** 稀有度从高到低，抽卡时按这个顺序累加概率。 */
export const RARITIES: { key: RarityKey; name: string; textColor: string; color: string }[] = [
  { key: 'Legend', name: '海上传奇', textColor: '#ee494c', color: 'linear-gradient(135deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4)' },
  { key: 'SuperRare', name: '超稀有', textColor: '#c90', color: '#f9f593' },
  { key: 'Elite', name: '精锐', textColor: '#8000ff', color: '#ae90ef' },
  { key: 'Rare', name: '稀有', textColor: '#3b8bff', color: '#1bb7eb' },
  { key: 'Normal', name: '普通', textColor: '#808080', color: '#dbdcdf' },
]

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
