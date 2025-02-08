import {Context, h, Schema, Session} from 'koishi'
import {} from 'koishi-plugin-puppeteer'

import * as cheerio from 'cheerio';

export const name = 'azur-lane-building'
export const inject = ['database', 'puppeteer']
export const usage = `## 使用

1. 设置指令别名。
2. 发送 \`alb.每日魔方\` 获取魔方。
3. 发送 \`alb.抽轻型池 [次数（可选）]\` 抽卡。

## 补充

* 可手动更新建造清单（[参考](https://wiki.biligame.com/blhx/index.php?title=%E5%BB%BA%E9%80%A0%E6%A8%A1%E6%8B%9F%E5%99%A8&action=edit)）

## QQ 群

* 956758505`

// pz*
export interface Config {
  dayMaxCube: number;
  dayMinCube: number;
  LightCost: number;
  HeavyCost: number;
  SpecialCost: number;

  LightShipBuilding: ShipRareList;
  HeavyShipBuilding: ShipRareList;
  SpecialShipBuilding: ShipRareList;

  maxRank: number;

  atReply: boolean;
  quoteReply: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    dayMaxCube: Schema
      .number()
      .default(10)
      .min(0)
      .description('每日签到获取的魔方最大值'),
    dayMinCube: Schema
      .number()
      .default(10)
      .min(0)
      .description('每日签到获取的魔方最小值'),
    LightCost: Schema
      .number()
      .default(1)
      .min(0)
      .description('轻型建造消耗'),
    HeavyCost: Schema
      .number()
      .default(2)
      .min(0)
      .description('重型建造消耗'),
    SpecialCost: Schema
      .number()
      .default(2)
      .min(0)
      .description('特型建造消耗'),
  }).description('抽卡'),

  Schema.object({
    LightShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', {rows: [2, 4]}),
      SuperRare: Schema.string().role('textarea', {rows: [2, 4]}).default('圣地亚哥、蒙彼利埃、确捷、明石、阿芙乐尔、里诺、英格拉罕、布里斯托尔、卡律布狄斯、可怖、圣女贞德、塔什干、恰巴耶夫、赫敏、凉月、古比雪夫、基洛夫、不屈、阿布鲁齐公爵、马格德堡、雅努斯'),
      Elite: Schema.string().role('textarea', {rows: [2, 4]}).default('莫里、拉菲、圣路易斯、小海伦娜、丹佛、小克利夫兰、标枪、欧若拉、小贝法、吹雪、绫波、Z23、逸仙、文琴佐·焦贝蒂、库珀、勇敢、Z2、神速、马耶·布雷泽、沃克兰、塔尔图、威严、水星纪念、爱斯基摩人、博伊西、纽伦堡、雷鸣、摩尔曼斯克、进取、由良、海风、西北风、西南风、尼科洛索·达雷科、曼彻斯特、济安、龙武、虎贲'),
      Rare: Schema.string().role('textarea', {rows: [2, 4]}).default('哈曼、弗莱彻、贝奇、斯坦利、斯莫利、霍比、科尔克、康克德、布鲁克林、菲尼克斯、亚特兰大、朱诺、女将、阿卡司塔、热心、丘比特、泽西、库拉索、杓鹬、阿基里斯、阿贾克斯、南安普顿、格拉斯哥、神风、松风、旗风、初春、若叶、夕暮、大潮、浦风、矶风、谷风、Z19、清波、莱比锡、福尔班、勒马尔、文月、朝潮、滨风、那珂、马布尔黑德、追风'),
      Normal: Schema.string().role('textarea', {rows: [2, 4]}).default('卡辛、唐斯、克雷文、麦考尔、富特、斯彭斯、奥利克、奥马哈、罗利、小猎兔犬、大斗犬、彗星、新月、小天鹅、狐提、利安得、睦月、如月、卯月、长良、柯尼斯堡、卡尔斯鲁厄、科隆'),
    }).collapse().description('轻型舰建造'),

    HeavyShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', {rows: [2, 4]}).default('信浓、新泽西、岛风、乌尔里希·冯·胡滕'),
      SuperRare: Schema.string().role('textarea', {rows: [2, 4]}).default('胡德、厌战、高雄、欧根亲王、布莱默顿、黎塞留、阿尔及利亚、苏维埃罗西亚、豪、纪伊、旧金山、海因里希亲王、苏维埃贝拉罗斯、塔林、筑摩、维托里奥·维内托、阿达尔伯特亲王、寰昌'),
      Elite: Schema.string().role('textarea', {rows: [2, 4]}).default('休斯敦、印第安纳波利斯、亚利桑那、伦敦、多塞特郡、约克、声望、伊丽莎白女王、纳尔逊、黑暗界、恐怖、阿贝克隆比、雾岛、德意志、小比叡、敦刻尔克、铃谷、比叡、英勇、小声望、小天城、福煦'),
      Rare: Schema.string().role('textarea', {rows: [2, 4]}).default('北安普敦、芝加哥、宾夕法尼亚、田纳西、加利福尼亚、什罗普郡、苏塞克斯、肯特、萨福克、诺福克、反击、伊势'),
      Normal: Schema.string().role('textarea', {rows: [2, 4]}).default('彭萨科拉、内华达、俄克拉荷马、青叶、衣笠'),
    }).collapse().description('重型舰建造'),

    SpecialShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', {rows: [2, 4]}).default('信浓、新泽西、岛风、乌尔里希·冯·胡滕'),
      SuperRare: Schema.string().role('textarea', {rows: [2, 4]}).default('企业、埃塞克斯、半人马、胜利、伊19、明石、U-81、U-47、U-101、伊168、香格里拉、伊13、无畏、英仙座、提康德罗加、射水鱼、忒修斯、彼得·史特拉塞、U-37、霞飞、葛城、天鹰、阿尔比恩'),
      Elite: Schema.string().role('textarea', {rows: [2, 4]}).default('休斯敦、印第安纳波利斯、列克星敦、萨拉托加、约克城、大黄蜂、女灶神、伦敦、多塞特郡、独角兽、伊26、伊58、小赤城、小齐柏林、絮库夫、伊25、U-522、伊56、鹦鹉螺、镇海、鹰、威悉、樫野、千岁、千代田、华甲、普林斯顿、小光辉、小企业、易北'),
      Rare: Schema.string().role('textarea', {rows: [2, 4]}).default('北安普敦、芝加哥、长岛、什罗普郡、肯特、萨福克、诺福克'),
      Normal: Schema.string().role('textarea', {rows: [2, 4]}).default('彭萨科拉、博格、兰利、突击者、竞技神'),
    }).collapse().description('特型舰建造'),
  }).description('建造清单'),

  Schema.object({
    maxRank: Schema
      .number()
      .default(10)
      .min(0)
      .description('最大排行榜人数'),
  }).description('排行榜'),

  Schema.object({
    atReply: Schema
      .boolean()
      .default(true)
      .description('响应时 @'),
    quoteReply: Schema
      .boolean()
      .default(false)
      .description('响应时引用'),
  }).description('回复'),

])

// smb*
declare module 'koishi' {
  interface Tables {
    azur_lane_building: Building;
  }
}

// jk*
interface BuildParams {
  session: any;
  frequency: number;
  type: string;
  cost: number;
  buildType: BuildType;
  shipBuilding: any;
  getRarity: (rareProbability: number) => { rarity: RarityOrShipName; probabilityIndex: number };
}

interface RarityConfig {
  name: string;
  textColor: string;
  color: string;
  probability: number;
}

interface ShipBuildingConfig {
  [key: string]: RarityConfig;
}

export interface Building {
  id: number;
  userId: string;
  username: string;
  cube: number;
  lastCheckInTimestamp: Date;
  collectionRate: number;
  buildHistory: BuildHistory;
  buildStats: BuildStats;
}

enum BuildType {
  Light = "轻型舰建造",
  Heavy = "重型舰建造",
  Special = "特型舰建造",
}

type RarityOrShipName = "海上传奇" | "超稀有" | "精锐" | "稀有" | "普通" | string;

interface BuildStatsRow {
  [BuildType.Light]: number;
  [BuildType.Heavy]: number;
  [BuildType.Special]: number;
  total: number; // 行总计
}

interface ShipRareList {
  SpacalPR?: string;
  Legend?: string;
  SuperRare: string;
  Elite: string;
  Rare: string;
  Normal: string;
}

interface BuildStats {
  [rarityOrShipName: RarityOrShipName]: BuildStatsRow;

  total: BuildStatsRow
}

// 单次建造记录
interface BuildRecord {
  buildCount: number;        // 建造次数
  buildType: string; // 建造类型
  rarity: RarityOrShipName;          // 稀有度
  shipName: string;        // 舰娘名称
  times: number
}

type BuildHistory = BuildRecord[];

interface Ship {
  id: number;
  nationality: number;
  type: number;
  rarity: number;
  src: string;
  alt: string;
  transform?: boolean;
}

type ShipData = Record<string, Ship>;


export function apply(ctx: Context, cfg: Config) {
  // tzb*
  ctx.model.extend('azur_lane_building', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
    cube: 'unsigned',
    lastCheckInTimestamp: 'timestamp',
    buildStats: {type: 'json', initial: createDefaultBuildStats()},
    buildHistory: {type: 'json', initial: []},
    collectionRate: 'double',
  }, {autoInc: true, primary: 'id'});

  // cl*
  const logger = ctx.logger('azur-lane-building')
  const lightShipProbabilities = {SuperRare: 7, Elite: 12, Rare: 26, Normal: 55, Legend: 0};
  const heavySpecialShipProbabilities = {Legend: 1.2, SuperRare: 7, Elite: 12, Rare: 51, Normal: 28.8};
  const rarityDefinitions = {
    Legend: {
      name: '海上传奇',
      textColor: '#ee494c',
      color: 'linear-gradient(135deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4)',
    },
    SuperRare: {
      name: '超稀有',
      textColor: '#c90',
      color: '#f9f593',
    },
    Elite: {name: '精锐', textColor: '#8000ff', color: '#ae90ef'},
    Rare: {name: '稀有', textColor: '#3b8bff', color: '#1bb7eb'},
    Normal: {name: '普通', textColor: '#808080', color: '#dbdcdf'},
  };
  const baseRarityConfig: Omit<RarityConfig, 'probability'> = {
    name: '',
    textColor: '',
    color: '',
  };
  const lightShipBuildingRarityConfig = createShipBuildingRarityConfig(lightShipProbabilities);
  const heavySpecialShipBuildingRarityConfig = createShipBuildingRarityConfig(heavySpecialShipProbabilities);
  const specialShipBuildingRarityConfig = heavySpecialShipBuildingRarityConfig
  const shipBuildingData = {
    LightShipBuilding: cfg.LightShipBuilding,
    HeavyShipBuilding: cfg.HeavyShipBuilding,
    SpecialShipBuilding: cfg.SpecialShipBuilding,
  }
  const shipCount = countUniqueRoles(shipBuildingData);

  const buildConfigs = {
    light: {
      type: '轻型',
      cost: cfg.LightCost,
      buildType: BuildType.Light,
      shipBuilding: cfg.LightShipBuilding,
      getRarity: getLightRarity,
      command: 'alb.抽轻型池 [frequency:number]'
    },
    heavy: {
      type: '重型',
      cost: cfg.HeavyCost,
      buildType: BuildType.Heavy,
      shipBuilding: cfg.HeavyShipBuilding,
      getRarity: getHeavyAndSpecialRarity,
      command: 'alb.抽重型池 [frequency:number]'
    },
    special: {
      type: '特型',
      cost: cfg.SpecialCost,
      buildType: BuildType.Special,
      shipBuilding: cfg.SpecialShipBuilding,
      getRarity: getHeavyAndSpecialRarity,
      command: 'alb.抽特型池 [frequency:number]'
    },
  };

  const shipData: ShipData = {
    "22": {
      "id": 10200011,
      "nationality": 102,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5e/snhbwvd5klhsft3mb72gfmw6xzl8gz8.jpg",
      "alt": "22"
    },
    "33": {
      "id": 10200021,
      "nationality": 102,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1b/dv522y17wdoz52bv1l93dsh1ypeehw1.jpg",
      "alt": "33"
    },
    "特装型布里MKIII": {
      "id": 100021,
      "nationality": 10,
      "type": 1,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c6/8ytp9bpabdolnijp72anaqapbln3rb7.jpg",
      "alt": "特装型布里MKIII"
    },
    "新泽西": {
      "id": 105171,
      "nationality": 1,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bc/kpg4ewdkf0wq0poxktetujr419l5d24.jpg",
      "alt": "新泽西"
    },
    "前卫": {
      "id": 205131,
      "nationality": 2,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/49pe1wvnlr3sb2j8knjvz6bhbc0jxyb.jpg",
      "alt": "前卫"
    },
    "武藏": {
      "id": 305101,
      "nationality": 3,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/1/18/9qxf4u3v78cp7pckwwouguqfk9dukpl.jpg",
      "alt": "武藏"
    },
    "信浓": {
      "id": 307081,
      "nationality": 3,
      "type": 7,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/5/56/1xd5w3zd2236x0snmnyhiwmwcq765dv.jpg",
      "alt": "信浓"
    },
    "岛风": {
      "id": 301291,
      "nationality": 3,
      "type": 1,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/2/21/lwy0gq6jlyfh6mdfo6eof5wvtoogbm5.jpg",
      "alt": "岛风"
    },
    "苏维埃同盟": {
      "id": 705021,
      "nationality": 7,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ee/rg7q3nfnjgqau1oplif032gaz4dxk92.jpg",
      "alt": "苏维埃同盟"
    },
    "乌尔里希·冯·胡滕": {
      "id": 405031,
      "nationality": 4,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a1/m15kemqjsirbix9ijun3auemuqqrrx2.jpg",
      "alt": "乌尔里希·冯·胡滕"
    },
    "喀琅施塔得": {
      "id": 718011,
      "nationality": 7,
      "type": 18,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/1/19/e1fze1bwju99c3oxfbo6w60dnpggij2.jpg",
      "alt": "喀琅施塔得"
    },
    "约克城II": {
      "id": 107101,
      "nationality": 1,
      "type": 7,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7c/juwnpq339lri20fadv8m4m4cm883ep7.jpg",
      "alt": "约克城II"
    },
    "怨仇": {
      "id": 207071,
      "nationality": 2,
      "type": 7,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e3/2hi99ds4373o67zdako2rzd36aqe32q.jpg",
      "alt": "怨仇"
    },
    "俾斯麦Zwei": {
      "id": 405051,
      "nationality": 4,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/9/94/2xb3s4l5pauohbxezyv5lj8tttnuvtu.jpg",
      "alt": "俾斯麦Zwei"
    },
    "云仙": {
      "id": 303191,
      "nationality": 3,
      "type": 3,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/c6ilrajaal7y25anajhrnkkgldiyx5g.jpg",
      "alt": "云仙"
    },
    "拉菲II": {
      "id": 101511,
      "nationality": 1,
      "type": 1,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b7/frgvz0emq9wxvsxnk7f6g9umbojr6ta.jpg",
      "alt": "拉菲II"
    },
    "关岛": {
      "id": 118021,
      "nationality": 1,
      "type": 18,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/3lfspllidx44ie9i7umgide8685mcdw.jpg",
      "alt": "关岛"
    },
    "阿尔萨斯": {
      "id": 805031,
      "nationality": 8,
      "type": 5,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4c/kk8j2ts6b2y2m90qax2aacu06mqn8a6.jpg",
      "alt": "阿尔萨斯"
    },
    "莫加多尔": {
      "id": 901071,
      "nationality": 9,
      "type": 1,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c7/debujlo97h0aiq82kg9ux0lm6mdsp8q.jpg",
      "alt": "莫加多尔"
    },
    "天城CV": {
      "id": 307151,
      "nationality": 3,
      "type": 7,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/8/82/hl0pvubgrbvvu7klg0xx2a96s3lu4xw.jpg",
      "alt": "天城CV"
    },
    "弗里茨·鲁梅": {
      "id": 407041,
      "nationality": 4,
      "type": 7,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e6/q3ernxcwv8p6p2untyd34h9gfz179an.jpg",
      "alt": "弗里茨·鲁梅"
    },
    "Z52": {
      "id": 401521,
      "nationality": 4,
      "type": 1,
      "rarity": 6,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5a/du2yo56ucm710vrzvjieq4jrmct4cco.jpg",
      "alt": "Z52"
    },
    "吾妻": {
      "id": 399041,
      "nationality": 3,
      "type": 18,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/9/96/o2wr2935t2pynnix87qhrepl0u0aau4.jpg",
      "alt": "吾妻"
    },
    "腓特烈大帝": {
      "id": 499021,
      "nationality": 4,
      "type": 5,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1c/hu3cano4tbdv5lzudhpp4vh7mu8i59m.jpg",
      "alt": "腓特烈大帝"
    },
    "德雷克": {
      "id": 299041,
      "nationality": 2,
      "type": 3,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/8/86/i1ked3youic8rg074xm4vaxfc2kryty.jpg",
      "alt": "德雷克"
    },
    "白龙": {
      "id": 399051,
      "nationality": 3,
      "type": 7,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f8/k5dz1oy54bpt8hzuaiknyubdlznru7z.jpg",
      "alt": "白龙"
    },
    "埃吉尔": {
      "id": 499051,
      "nationality": 4,
      "type": 18,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/jtr1kbtblv53ja8j7wta2rf2z88ahff.jpg",
      "alt": "埃吉尔"
    },
    "普利茅斯": {
      "id": 299051,
      "nationality": 2,
      "type": 2,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/e67k8mjoq58ipg26ptb0f81ttn1p0wj.jpg",
      "alt": "普利茅斯"
    },
    "布雷斯特": {
      "id": 899031,
      "nationality": 8,
      "type": 18,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c1/aifyle733511x0w16g9rczzmqkm3arp.jpg",
      "alt": "布雷斯特"
    },
    "奇尔沙治": {
      "id": 199041,
      "nationality": 1,
      "type": 10,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/6/65/cnsrg8xu4qgrixso3ts7dsej2hxiyo1.jpg",
      "alt": "奇尔沙治"
    },
    "兴登堡": {
      "id": 499091,
      "nationality": 4,
      "type": 3,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/8hf4yi79uwrgpbxjuwewq5gncmgo9gh.jpg",
      "alt": "兴登堡"
    },
    "那不勒斯": {
      "id": 699021,
      "nationality": 6,
      "type": 3,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/7/73/0ucqm111urd74gzwwolrkcjqvwfovxq.jpg",
      "alt": "那不勒斯"
    },
    "纳希莫夫海军上将": {
      "id": 799021,
      "nationality": 7,
      "type": 7,
      "rarity": 16,
      "src": "https://patchwiki.biligame.com/images/blhx/7/74/kv0wr2yrvyjf6mzici2opfqbzslcgne.jpg",
      "alt": "纳希莫夫海军上将"
    },
    "试作型布里MKII": {
      "id": 100011,
      "nationality": 10,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3a/9lpmlqsie36pn8mmm7oq29sj9vdvya0.jpg",
      "alt": "试作型布里MKII"
    },
    "埃尔德里奇": {
      "id": 101261,
      "nationality": 1,
      "type": 1,
      "rarity": 5,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/0/01/iafbwfgdmnoymxj38b39jrogtnkx997.jpg",
      "alt": "埃尔德里奇"
    },
    "圣地亚哥": {
      "id": 102081,
      "nationality": 1,
      "type": 2,
      "rarity": 5,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7d/969b5lqnxbbhds272jpd3dg8oyne7i2.jpg",
      "alt": "圣地亚哥"
    },
    "巴尔的摩": {
      "id": 103161,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5c/3c65bndvfl0k9eins6i2ilx3qnkj86g.jpg",
      "alt": "巴尔的摩"
    },
    "北卡罗来纳": {
      "id": 105121,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/08/n18b71bpuaq4x0xak9adybtqavbufiz.jpg",
      "alt": "北卡罗来纳"
    },
    "华盛顿": {
      "id": 105131,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/jwlmdtyg99umlje0qdb4hotd71rktid.jpg",
      "alt": "华盛顿"
    },
    "南达科他": {
      "id": 105141,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1e/chdw5ha3cbdgqh7o3jhzint8jhw1u6l.jpg",
      "alt": "南达科他"
    },
    "印第安纳": {
      "id": 105151,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/22/9coyxbrgkbcey30r91klhvvyigfm38c.jpg",
      "alt": "印第安纳"
    },
    "企业": {
      "id": 107061,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/61/5kfjys7ktqzj27i0y61i29vh8hu8901.jpg",
      "alt": "企业"
    },
    "黛朵": {
      "id": 202041,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5c/84rc9yrtr823w6qcd62meojc16keaje.jpg",
      "alt": "黛朵"
    },
    "贝尔法斯特": {
      "id": 202121,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9c/554u0uxfbpyb65xmo4txxrrexbgxbbn.jpg",
      "alt": "贝尔法斯特"
    },
    "胡德": {
      "id": 204031,
      "nationality": 2,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cb/0w5779coavgmvdi81qtn89dt9pjadlz.jpg",
      "alt": "胡德"
    },
    "厌战": {
      "id": 205021,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b2/25gybfcudpqnpupwf4ckhiwm2f6v0n9.jpg",
      "alt": "厌战"
    },
    "英王乔治五世": {
      "id": 205051,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/96/pirb8fospevqnve0ntvevmmmb1d2j41.jpg",
      "alt": "英王乔治五世"
    },
    "威尔士亲王": {
      "id": 205061,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5f/ijb9iyllza8pe6aad68mfeg4cspehdh.jpg",
      "alt": "威尔士亲王"
    },
    "约克公爵": {
      "id": 205071,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/398wdu3zxnw8mrbwwqecgeckr3fa5gz.jpg",
      "alt": "约克公爵"
    },
    "光辉": {
      "id": 207031,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/jn5drdo7sv6n09xvb8fyj44l3zs4ox3.jpg",
      "alt": "光辉"
    },
    "胜利": {
      "id": 207041,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f1/qp4h5ppuqsu0mwzrmgngmfg6ww84vvw.jpg",
      "alt": "胜利"
    },
    "可畏": {
      "id": 207051,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d9/e1qol9ueyzwnwq52jfo2zd058u2mfe8.jpg",
      "alt": "可畏"
    },
    "夕立": {
      "id": 301141,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/p09fstnht1ivi6094lw8iueokhbzk1y.jpg",
      "alt": "夕立"
    },
    "雪风": {
      "id": 301161,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/47/boy7kqqgbv1ekisqgubb3mkjydsk77w.jpg",
      "alt": "雪风"
    },
    "筑摩": {
      "id": 303061,
      "nationality": 3,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/8scum95h48tn5cb91nshwkdsh2gk4uw.jpg",
      "alt": "筑摩"
    },
    "高雄": {
      "id": 303111,
      "nationality": 3,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/30/2qgwpdcxs8ir6uxv5gz54paolwov1kq.jpg",
      "alt": "高雄"
    },
    "爱宕": {
      "id": 303121,
      "nationality": 3,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7a/fgh0ke8shgm2g9e2zr32jkls6v2b4h5.jpg",
      "alt": "爱宕"
    },
    "摩耶": {
      "id": 303131,
      "nationality": 3,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2e/sx4jh5iuael8j5swjlv8prnnx9stp2d.jpg",
      "alt": "摩耶"
    },
    "鸟海": {
      "id": 303141,
      "nationality": 3,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1a/ffgs2f83lc97hbpgogl7x1gr2s4avu4.jpg",
      "alt": "鸟海"
    },
    "长门": {
      "id": 305051,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/59/ntvbhrnbrxd4typnm1bxdluk8mvkrts.jpg",
      "alt": "长门"
    },
    "纪伊": {
      "id": 305121,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/13/rt133k7htj1fkcn45nhen4fevxvjlzp.jpg",
      "alt": "纪伊"
    },
    "土佐": {
      "id": 305081,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e3/2nsbu0z2cj7fpsl4lyymsyls5orx50w.jpg",
      "alt": "土佐"
    },
    "瑞凤": {
      "id": 306041,
      "nationality": 3,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/09/qu64n60xwl1ucww9i9npqtsag28uv1k.jpg",
      "alt": "瑞凤"
    },
    "赤城": {
      "id": 307011,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/20/m3tuyoksletphpbaw18yu6tlbdm9a42.jpg",
      "alt": "赤城"
    },
    "加贺": {
      "id": 307021,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3e/43e0p7ou1h4ct0ad4rc9fr1mq062w5n.jpg",
      "alt": "加贺"
    },
    "翔鹤": {
      "id": 307051,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a2/aysng9ro4larb6mcyb0z6sjauyi4kb7.jpg",
      "alt": "翔鹤"
    },
    "瑞鹤": {
      "id": 307061,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/aa/qrvqxnsypthx6pgh81mb17d7b4gc1vv.jpg",
      "alt": "瑞鹤"
    },
    "大凤": {
      "id": 307071,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/39/c1m0hcpvpjtduvayfdfy55ar0f4m54s.jpg",
      "alt": "大凤"
    },
    "明石": {
      "id": 312011,
      "nationality": 3,
      "type": 12,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7b/age684c06x5h0h19uog16jxsebzzii7.jpg",
      "alt": "明石"
    },
    "布吕歇尔": {
      "id": 403021,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4a/a831wbtieqqvxpu6trgoih8yffqxmzu.jpg",
      "alt": "布吕歇尔"
    },
    "欧根亲王": {
      "id": 403031,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1b/9ilgxv3l42uvdkqcb6395oj2n2o5dts.jpg",
      "alt": "欧根亲王"
    },
    "俾斯麦": {
      "id": 405011,
      "nationality": 4,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f6/4s7aiofe8kme6ie1bsoqtx6msw72p64.jpg",
      "alt": "俾斯麦"
    },
    "提尔比茨": {
      "id": 405021,
      "nationality": 4,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8e/krr70s6dahu8na0l3qf7lbjf02xb1b8.jpg",
      "alt": "提尔比茨"
    },
    "齐柏林伯爵": {
      "id": 407011,
      "nationality": 4,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9c/jhyzx1pr15mzgm2r5e6ip2r9ihzmulf.jpg",
      "alt": "齐柏林伯爵"
    },
    "阿芙乐尔": {
      "id": 702011,
      "nationality": 7,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2d/d52lpkvcssaymjo8o9j4itc3022ynlx.jpg",
      "alt": "阿芙乐尔"
    },
    "Z46": {
      "id": 401461,
      "nationality": 4,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/63/n5dic0mbimf6ibu25x6hb0jp138qg52.jpg",
      "alt": "Z46"
    },
    "江风": {
      "id": 301491,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0c/3p4clpszgvlio01vbqcguzp2ny0n51h.jpg",
      "alt": "江风"
    },
    "三笠": {
      "id": 305111,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/9idqy0sbrjeshh5hdo6uzribrwgdnqv.jpg",
      "alt": "三笠"
    },
    "能代": {
      "id": 302211,
      "nationality": 3,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/kssghgzid31st2ikvxqfzdb7hpk1xi9.jpg",
      "alt": "能代"
    },
    "酒匂": {
      "id": 302231,
      "nationality": 3,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/72/ilsbqid6z0n9lju4hyzoobbk69j1csp.jpg",
      "alt": "酒匂"
    },
    "蒙彼利埃": {
      "id": 102141,
      "nationality": 1,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d1/l9bb0ddicnh3hpkqjys824bmh78o5lb.jpg",
      "alt": "蒙彼利埃"
    },
    "伊19": {
      "id": 308011,
      "nationality": 3,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d8/mpq4a8ctcmow7agfovwy132qky5uwhv.jpg",
      "alt": "伊19"
    },
    "U-81": {
      "id": 408011,
      "nationality": 4,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/dd/rtvgwef5dcvmhrjnaiqbtmym3s2za79.jpg",
      "alt": "U-81"
    },
    "U-47": {
      "id": 408021,
      "nationality": 4,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/73/kai3lvt6tob7e03sesh37gwcebnj2ht.jpg",
      "alt": "U-47"
    },
    "凯旋": {
      "id": 801011,
      "nationality": 8,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/de/lkkblex2dufyoczqpo2rohy42el3ji9.jpg",
      "alt": "凯旋"
    },
    "让·巴尔": {
      "id": 905011,
      "nationality": 9,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/71/e4u1v4k3nd25fjf9a3jgqw0brid8axv.jpg",
      "alt": "让·巴尔"
    },
    "马萨诸塞": {
      "id": 105191,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d0/3nd5p9wjmof051fwb78dsx6xz9k4e2t.jpg",
      "alt": "马萨诸塞"
    },
    "半人马": {
      "id": 206041,
      "nationality": 2,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/f6nve9jtpfzz9f1z6mjzqee4p3zt2n2.jpg",
      "alt": "半人马"
    },
    "埃塞克斯": {
      "id": 107091,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5c/c4cssilf19yk7qixvtwfp710yz670yz.jpg",
      "alt": "埃塞克斯"
    },
    "大青花鱼": {
      "id": 108021,
      "nationality": 1,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2d/n37b8jnrjd50tjl2q06xg7jz6fvlim8.jpg",
      "alt": "大青花鱼"
    },
    "明尼阿波利斯": {
      "id": 103131,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/88/5hvk8yzqndnmle6yr56oqwqvqi6krp4.jpg",
      "alt": "明尼阿波利斯"
    },
    "天城": {
      "id": 304051,
      "nationality": 3,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c4/nyyd0l66ogos57lhommivxaklzc0cd6.jpg",
      "alt": "天城"
    },
    "加贺BB": {
      "id": 305071,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e2/jj1p1xjv8rtrxk3ngdmgpncu6xsa6he.jpg",
      "alt": "加贺BB"
    },
    "天狼星": {
      "id": 202201,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/54/rf4lxkwfrfhlpgshof8eex7r9a0ps2q.jpg",
      "alt": "天狼星"
    },
    "香格里拉": {
      "id": 107381,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/n2uvobexvxsf7a4ym5ywrzjrly0mydd.jpg",
      "alt": "香格里拉"
    },
    "邦克山": {
      "id": 107171,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0a/birmelvmmr0aksss3nvln56igveq36z.jpg",
      "alt": "邦克山"
    },
    "伊13": {
      "id": 317011,
      "nationality": 3,
      "type": 17,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5a/oevezznpanj0ga3nj4cjhbbmhpwppya.jpg",
      "alt": "伊13"
    },
    "确捷": {
      "id": 202231,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f9/19wxoe1rlxpf5eh2l4o9x30bgvqkidb.jpg",
      "alt": "确捷"
    },
    "恶毒": {
      "id": 901111,
      "nationality": 9,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/89/0wt39h53d34cuqiw81gm2fnbmipaahz.jpg",
      "alt": "恶毒"
    },
    "伊168": {
      "id": 308061,
      "nationality": 3,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/83/cbdclbdps2v8pk14yavifmgacp2vyql.jpg",
      "alt": "伊168"
    },
    "U-101": {
      "id": 408061,
      "nationality": 4,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/16/7i9l6gvbuipix9lg9qatktlxdldleio.jpg",
      "alt": "U-101"
    },
    "阿拉巴马": {
      "id": 105201,
      "nationality": 1,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/6s5jr0wvqv3f85v1ubkbloagqq7wied.jpg",
      "alt": "阿拉巴马"
    },
    "棘鳍": {
      "id": 108031,
      "nationality": 1,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ad/p9sfbx299i3d5rwdeyd7gq6wf2b9lyo.jpg",
      "alt": "棘鳍"
    },
    "利托里奥": {
      "id": 605021,
      "nationality": 6,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e1/6lswn60x3mngg52f5e9sdr8sq1tsnct.jpg",
      "alt": "利托里奥"
    },
    "扎拉": {
      "id": 603021,
      "nationality": 6,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/7r6pxhfqqxukx0mb8ctd3erl0ftt3ox.jpg",
      "alt": "扎拉"
    },
    "加斯科涅(μ兵装)": {
      "id": 905031,
      "nationality": 9,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/13/ad49uwaid1590e3mgxpgjmrcid8me02.jpg",
      "alt": "加斯科涅(μ兵装)"
    },
    "赤城(μ兵装)": {
      "id": 307101,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/96/mneae7fh81a0cmk3diw76i7dq5oxpmu.jpg",
      "alt": "赤城(μ兵装)"
    },
    "骏河": {
      "id": 305141,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/3gdjk9ozcscjstw8410txoz8tmd4t0g.jpg",
      "alt": "骏河"
    },
    "龙凤": {
      "id": 306071,
      "nationality": 3,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b0/4w9h3yd1w36csk3efe6uyg86pom9zns.jpg",
      "alt": "龙凤"
    },
    "塔什干": {
      "id": 701041,
      "nationality": 7,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b2/tw3onvzibpq3l2hh0voylt5cuoafohn.jpg",
      "alt": "塔什干"
    },
    "基洛夫": {
      "id": 702041,
      "nationality": 7,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5b/mj7vfn4n5k0krpsgq0w7schweix6sqf.jpg",
      "alt": "基洛夫"
    },
    "恰巴耶夫": {
      "id": 702031,
      "nationality": 7,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/ev4d0l1rrfb61isj2h9hki6q2n677ur.jpg",
      "alt": "恰巴耶夫"
    },
    "苏维埃贝拉罗斯": {
      "id": 705041,
      "nationality": 7,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a0/sqj9cyacw58bzp1hg1zln52wkm5g27w.jpg",
      "alt": "苏维埃贝拉罗斯"
    },
    "苏维埃罗西亚": {
      "id": 705051,
      "nationality": 7,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/59/dwolia6zo5gc7qdx8d3vu75rohzy6id.jpg",
      "alt": "苏维埃罗西亚"
    },
    "无畏": {
      "id": 107111,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f9/cabxzpfkwdedctjxb7nds11wfxk6dn1.jpg",
      "alt": "无畏"
    },
    "布莱默顿": {
      "id": 103241,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5b/6xzt6q9v52nseoxhp4ch1wmzln3qet0.jpg",
      "alt": "布莱默顿"
    },
    "里诺": {
      "id": 102261,
      "nationality": 1,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2a/pogjc1pkbbcg0myvk3j7e7i8lbv6z2u.jpg",
      "alt": "里诺"
    },
    "黎塞留": {
      "id": 805011,
      "nationality": 8,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/3fn1zoulw4n2tn3z2qbnxfxhzawf71a.jpg",
      "alt": "黎塞留"
    },
    "圣女贞德": {
      "id": 802021,
      "nationality": 8,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6b/8mo56lojzxt7hwr3rvsfr1eu4uk2oif.jpg",
      "alt": "圣女贞德"
    },
    "阿尔及利亚": {
      "id": 903021,
      "nationality": 9,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fe/siwhc28gqfd9ay76x5hcx1hhzbqxohj.jpg",
      "alt": "阿尔及利亚"
    },
    "豪": {
      "id": 205091,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/49/a6vvf8i0hd483ya0ytczzec2yexptz7.jpg",
      "alt": "豪"
    },
    "英仙座": {
      "id": 206061,
      "nationality": 2,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/69/7r734w45i0tr6hk13u8ija28w5o9bkz.jpg",
      "alt": "英仙座"
    },
    "赫敏": {
      "id": 202271,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/1zg7mmg3906j7zt292765c3dya6yzaj.jpg",
      "alt": "赫敏"
    },
    "U-96": {
      "id": 408091,
      "nationality": 4,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f1/5edmjnqbkebvoiptysrcj1bjka1jdjc.jpg",
      "alt": "U-96"
    },
    "凉月": {
      "id": 301841,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/sq38mhqm1tp4qtfb4gsov5tidhtgau8.jpg",
      "alt": "凉月"
    },
    "大凤(μ兵装)": {
      "id": 307111,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/kyml73g6hm68fj9gvds5qvma4hr37ng.jpg",
      "alt": "大凤(μ兵装)"
    },
    "塔什干(μ兵装)": {
      "id": 701051,
      "nationality": 7,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0f/8c3pmo2p8vkhh8c4lfhwmmz8e6ul3og.jpg",
      "alt": "塔什干(μ兵装)"
    },
    "黛朵(μ兵装)": {
      "id": 202281,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b8/fop7yeea6wn7i8i16oqw2oo68yvbnhb.jpg",
      "alt": "黛朵(μ兵装)"
    },
    "罗恩(μ兵装)": {
      "id": 403081,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/7bdotj56gymp31sazsqg1jlnkn74bcb.jpg",
      "alt": "罗恩(μ兵装)"
    },
    "光辉(μ兵装)": {
      "id": 207111,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/06/076s2neqpm6e8vrvesz2nkl8ds53e39.jpg",
      "alt": "光辉(μ兵装)"
    },
    "恶毒(μ兵装)": {
      "id": 901121,
      "nationality": 9,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1d/5oajg6jo3zwp8nbh7oqwd4oa5b5y971.jpg",
      "alt": "恶毒(μ兵装)"
    },
    "彼得·史特拉塞": {
      "id": 407031,
      "nationality": 4,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/85/7fu6cu1k70usbg0vabb6tlup1q9s973.jpg",
      "alt": "彼得·史特拉塞"
    },
    "海因里希亲王": {
      "id": 403091,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/72/8dvtl3b3ucs0xe5a6z6cm9bt108wjzr.jpg",
      "alt": "海因里希亲王"
    },
    "U-37": {
      "id": 408101,
      "nationality": 4,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/3wkbyetyuqvuq0k2lni4cjbceb93697.jpg",
      "alt": "U-37"
    },
    "波拉": {
      "id": 603031,
      "nationality": 6,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/jlv1l3rw3bpzjfzkiah3a7x080ku8y2.jpg",
      "alt": "波拉"
    },
    "塔林": {
      "id": 703011,
      "nationality": 7,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d6/si195mqvc8pqkoxfu4wzbxsi67xp2g5.jpg",
      "alt": "塔林"
    },
    "维托里奥·维内托": {
      "id": 605011,
      "nationality": 6,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f9/60rriuzkwauvu4qqvz7eb1azzarpnad.jpg",
      "alt": "维托里奥·维内托"
    },
    "阿布鲁齐公爵": {
      "id": 602011,
      "nationality": 6,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a4/rwrjc5upup2nrbj6d58l68w042wcjin.jpg",
      "alt": "阿布鲁齐公爵"
    },
    "天鹰": {
      "id": 607011,
      "nationality": 6,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/591zxgg0opu7a6851uzc6ic9qg44pw6.jpg",
      "alt": "天鹰"
    },
    "艾伦·萨姆纳": {
      "id": 101451,
      "nationality": 1,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e2/84h7271b9uh9tly3y7oehg4bnlln10d.jpg",
      "alt": "艾伦·萨姆纳"
    },
    "提康德罗加": {
      "id": 107141,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/db/e4iis8nx947rvfc3sw9zxvaypvrfq10.jpg",
      "alt": "提康德罗加"
    },
    "旧金山": {
      "id": 103141,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/5i5szoqpkr5eyd5tn8a94zxcfdwwhjm.jpg",
      "alt": "旧金山"
    },
    "射水鱼": {
      "id": 108061,
      "nationality": 1,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/jry6653q1pv76bguxqcrux0dvttcx3z.jpg",
      "alt": "射水鱼"
    },
    "风云": {
      "id": 301861,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/03/hkn9jxd476a0ogmegaj2xaq8rcwghk1.jpg",
      "alt": "风云"
    },
    "英格拉罕": {
      "id": 101481,
      "nationality": 1,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/95/no8hhf4crazzv71x6mo61hygocdran8.jpg",
      "alt": "英格拉罕"
    },
    "葛城": {
      "id": 307121,
      "nationality": 3,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c2/ta18gqp7hctj5brfyl8wq4rgl1d1aef.jpg",
      "alt": "葛城"
    },
    "新奥尔良": {
      "id": 103121,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3a/3bimwojo46v5odwn9hj8fmi8ypiizkj.jpg",
      "alt": "新奥尔良"
    },
    "可怖": {
      "id": 801071,
      "nationality": 8,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ac/n93ccitndcpnank0v5lz1rxgry1jrqk.jpg",
      "alt": "可怖"
    },
    "马格德堡": {
      "id": 402061,
      "nationality": 4,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/25/sasqwfj973q5z4mf36vkfgri7fs0eof.jpg",
      "alt": "马格德堡"
    },
    "阿达尔伯特亲王": {
      "id": 403101,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/96/m0hlrzjbn7b1fb851xxeuvy4ghc72jc.jpg",
      "alt": "阿达尔伯特亲王"
    },
    "卡律布狄斯": {
      "id": 202301,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4a/bmjkmd7k796g435arq46swawuwjsul1.jpg",
      "alt": "卡律布狄斯"
    },
    "布里斯托尔": {
      "id": 101491,
      "nationality": 1,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/79/mdkc0sj4sxyt52vcsn9buzxkmiussy2.jpg",
      "alt": "布里斯托尔"
    },
    "基辅": {
      "id": 701101,
      "nationality": 7,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e5/pejtlqzxxq8jx4p2rt7vnujfwz77f7a.jpg",
      "alt": "基辅"
    },
    "伏尔加": {
      "id": 707011,
      "nationality": 7,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b3/o02judm7qtaspfk86xunl4p1awvj4b1.jpg",
      "alt": "伏尔加"
    },
    "帝国": {
      "id": 607021,
      "nationality": 6,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9f/8f4wukwkjsk9y8lvqm11jphksfqmpaw.jpg",
      "alt": "帝国"
    },
    "庞培·马格诺": {
      "id": 601071,
      "nationality": 6,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7c/7vwzjqy1aizadsbvlwqfeqcgneufgad.jpg",
      "alt": "庞培·马格诺"
    },
    "塞德利茨": {
      "id": 404031,
      "nationality": 4,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1f/8b7qzusxx3h5dbpw1h1xppif4op775s.jpg",
      "alt": "塞德利茨"
    },
    "吕佐夫": {
      "id": 404041,
      "nationality": 4,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/be/tszhutpfma79yumrr2c8due5qo36b5g.jpg",
      "alt": "吕佐夫"
    },
    "埃姆登": {
      "id": 402071,
      "nationality": 4,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/34/ehdnrcj6fzaqvajnktb8nmm0d7m56z0.jpg",
      "alt": "埃姆登"
    },
    "贾维斯": {
      "id": 201341,
      "nationality": 2,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/4txxydh947vycfqr74x9tfwd5i7hyzk.jpg",
      "alt": "贾维斯"
    },
    "不挠": {
      "id": 207121,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f7/oubqxvmg0gfkfiyghpuhdltnn0euuk8.jpg",
      "alt": "不挠"
    },
    "霞飞": {
      "id": 907011,
      "nationality": 9,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/t545vyb0bdetkh9isghd5z8mw31ex43.jpg",
      "alt": "霞飞"
    },
    "不屈": {
      "id": 901131,
      "nationality": 9,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b2/aypducxvtfnb8janw9ofhysunvk3da5.jpg",
      "alt": "不屈"
    },
    "莱昂纳多·达·芬奇": {
      "id": 608021,
      "nationality": 6,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ac/4zzq1cwa07dfn7itc5u7zayg2cim6wq.jpg",
      "alt": "莱昂纳多·达·芬奇"
    },
    "朱塞佩·加里波第": {
      "id": 602021,
      "nationality": 6,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/de/ja3v94qzhvbghp7rf15k5gfsed2r4k6.jpg",
      "alt": "朱塞佩·加里波第"
    },
    "罗马": {
      "id": 605031,
      "nationality": 6,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/19/4c79o9df9l3vfay2jtgx5hfggszc52h.jpg",
      "alt": "罗马"
    },
    "布伦希尔德": {
      "id": 404051,
      "nationality": 4,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a1/re2u4s9hzqunz7au5j8knvuogjxepxi.jpg",
      "alt": "布伦希尔德"
    },
    "若月": {
      "id": 301881,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/99/q8cmh6laj2h8u4yhidskmyv3c89bbjc.jpg",
      "alt": "若月"
    },
    "雅努斯": {
      "id": 201351,
      "nationality": 2,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/69/q9r5sh34x7eix8qw12o8uhuwb0v0t57.jpg",
      "alt": "雅努斯"
    },
    "阿尔比恩": {
      "id": 206071,
      "nationality": 2,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b4/jp1pkglkcd4pk18s0i4r1rkgs71pcbw.jpg",
      "alt": "阿尔比恩"
    },
    "皇家财富号": {
      "id": 9600011,
      "nationality": 96,
      "type": 22,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fa/hht632x7ixdj45zky5you1a4hx20wqk.jpg",
      "alt": "皇家财富号"
    },
    "大黄蜂II": {
      "id": 107121,
      "nationality": 1,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4e/lbx0e9n23a876syy8x33hzwmobefwa1.jpg",
      "alt": "大黄蜂II"
    },
    "北安普敦II": {
      "id": 103261,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/50/mwfbd39et04rmu4c2b83aqrx9n5y3nl.jpg",
      "alt": "北安普敦II"
    },
    "古比雪夫": {
      "id": 702051,
      "nationality": 7,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/4plf2frlowbbb3h3lz72iv9faz2l36l.jpg",
      "alt": "古比雪夫"
    },
    "忒修斯": {
      "id": 206081,
      "nationality": 2,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/20/23mendova4bfmctp0pwhly9b7lo8tni.jpg",
      "alt": "忒修斯"
    },
    "皇家橡树": {
      "id": 205141,
      "nationality": 2,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4f/pejcfl992i9aanpgd2dqjligykmhbz9.jpg",
      "alt": "皇家橡树"
    },
    "斯库拉": {
      "id": 202331,
      "nationality": 2,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/de/kza674afugbohy19c8recti7939nbzd.jpg",
      "alt": "斯库拉"
    },
    "库尔斯克": {
      "id": 703021,
      "nationality": 7,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d0/oqyf7pgko2xlsmkdzxvzzrfdp13t177.jpg",
      "alt": "库尔斯克"
    },
    "伏罗希洛夫": {
      "id": 702071,
      "nationality": 7,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/77/brkaz92m5brff0h9u2q8bg2uwl6kqfm.jpg",
      "alt": "伏罗希洛夫"
    },
    "奥托·冯·阿尔文斯莱本": {
      "id": 401991,
      "nationality": 4,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/12/slnty6ri7uyn8r8nbbwu03949izzm1d.jpg",
      "alt": "奥托·冯·阿尔文斯莱本"
    },
    "雷根斯堡": {
      "id": 402101,
      "nationality": 4,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bc/k5q7emoo2e5pb2oqfjviowlr2gtlwvm.jpg",
      "alt": "雷根斯堡"
    },
    "阿蒂利奥·雷戈洛": {
      "id": 601101,
      "nationality": 6,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7a/gxmykkd9680drpfib6hqdnu8di1tzg7.jpg",
      "alt": "阿蒂利奥·雷戈洛"
    },
    "戈里齐亚": {
      "id": 603061,
      "nationality": 6,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7a/okx06ecz5bghgmyr4jre1cophkcccgp.jpg",
      "alt": "戈里齐亚"
    },
    "马赛曲": {
      "id": 902021,
      "nationality": 9,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7d/a3v3bq8n8yf5l9fmwa5h1epd69ytxhc.jpg",
      "alt": "马赛曲"
    },
    "伴尔维": {
      "id": 807021,
      "nationality": 8,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/11/decc08tzo8wkqupvpdwql1rl7u2h36f.jpg",
      "alt": "伴尔维"
    },
    "吉尚": {
      "id": 802031,
      "nationality": 8,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/ba/jimoqnaihtifq65fei4ckbn4cxkh4kj.jpg",
      "alt": "吉尚"
    },
    "克莱蒙梭": {
      "id": 905021,
      "nationality": 9,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2a/39asch0ghkcm9o3nmvqlwx5d538duh7.jpg",
      "alt": "克莱蒙梭"
    },
    "尾张": {
      "id": 305131,
      "nationality": 3,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6f/k3vu474kxw1m2b74q5hn3sc6clmkh7j.jpg",
      "alt": "尾张"
    },
    "初月": {
      "id": 301891,
      "nationality": 3,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a6/aek90b8n63kx88niz8p21d84gsdzofz.jpg",
      "alt": "初月"
    },
    "休斯敦II": {
      "id": 102301,
      "nationality": 1,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/88/1encjmm246fv1l08a56qnwsekkw7vmz.jpg",
      "alt": "休斯敦II"
    },
    "金鹿号": {
      "id": 9600031,
      "nationality": 96,
      "type": 23,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3b/p5mijognf4rd58nor714d2t2wo6z1st.jpg",
      "alt": "金鹿号"
    },
    "玛丽·西莱斯特号": {
      "id": 9600041,
      "nationality": 96,
      "type": 22,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ec/1m5fr5eqaf4edvml1120uuugmfg9ou8.jpg",
      "alt": "玛丽·西莱斯特号"
    },
    "圣马丁号": {
      "id": 9600021,
      "nationality": 96,
      "type": 24,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d9/1w64og12bc05tvi9myxz77ky9yo4ol4.jpg",
      "alt": "圣马丁号"
    },
    "星座": {
      "id": 104011,
      "nationality": 1,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/86/5manjkbdi0zhgt08f313phkux8bj0mq.jpg",
      "alt": "星座"
    },
    "松鲷": {
      "id": 108081,
      "nationality": 1,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/88/q01hmo62w54h6grlzz0rjkt5s753edp.jpg",
      "alt": "松鲷"
    },
    "寰昌": {
      "id": 504011,
      "nationality": 5,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/19/0ytrm3kspe5hh0ccai0ixs2n7jn4e8x.jpg",
      "alt": "寰昌"
    },
    "火力": {
      "id": 701111,
      "nationality": 7,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9d/s5feopmgh1he4mj3462qkx2d2gut4qs.jpg",
      "alt": "火力"
    },
    "努比亚人": {
      "id": 201371,
      "nationality": 2,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d8/se8p64edx2tkc8kgr0tfh3rrz9anbvp.jpg",
      "alt": "努比亚人"
    },
    "可畏(μ兵装)": {
      "id": 207141,
      "nationality": 2,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/h0we5r3ea6fe3prbnbq9p0wvqa9ebm4.jpg",
      "alt": "可畏(μ兵装)"
    },
    "欧根亲王(μ兵装)": {
      "id": 403151,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1b/de1t1q4z0czbjx49wzc9ftnokcchilj.jpg",
      "alt": "欧根亲王(μ兵装)"
    },
    "能代(μ兵装)": {
      "id": 302241,
      "nationality": 3,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b9/2lnwd03dlre3aiybfemlfkqj1opf2em.jpg",
      "alt": "能代(μ兵装)"
    },
    "腓特烈·卡尔": {
      "id": 403141,
      "nationality": 4,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ef/1kizmuj5ssfjm1b6giw3pmom4r26wzv.jpg",
      "alt": "腓特烈·卡尔"
    },
    "布伦努斯": {
      "id": 803021,
      "nationality": 8,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/20/9wnq55inovif19i07x6t21e0dqg85t0.jpg",
      "alt": "布伦努斯"
    },
    "亚尔薇特": {
      "id": 404061,
      "nationality": 4,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1c/3hc1ajoxhd4yhyhwrjb81elpirak468.jpg",
      "alt": "亚尔薇特"
    },
    "Z47": {
      "id": 401471,
      "nationality": 4,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/5sdhpd1jux9udulowwn6o0236d4a4vv.jpg",
      "alt": "Z47"
    },
    "斯特拉斯堡": {
      "id": 904021,
      "nationality": 9,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8e/ic9hw8ywnzxim3l2u3nbthz7ljj3a0m.jpg",
      "alt": "斯特拉斯堡"
    },
    "果敢": {
      "id": 901141,
      "nationality": 9,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c3/dkhcvcrr1pb1il5877lv58opdejsqzt.jpg",
      "alt": "果敢"
    },
    "匹兹堡": {
      "id": 103281,
      "nationality": 1,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8c/34agcxpthdwmpwzpqo9lzsb5jytfvca.jpg",
      "alt": "匹兹堡"
    },
    "法戈": {
      "id": 102331,
      "nationality": 1,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9a/7m4o9lsdd8eh6j6j1ydjitjgigf2y5g.jpg",
      "alt": "法戈"
    },
    "渡良濑": {
      "id": 302251,
      "nationality": 3,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/54/ktftruxlo5duvqodb07hu2n4a6zq1w8.jpg",
      "alt": "渡良濑"
    },
    "冈依沙瓦号": {
      "id": 9600071,
      "nationality": 96,
      "type": 24,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/69/42lpacnakmpdza7aon1u4pgrloqkbge.jpg",
      "alt": "冈依沙瓦号"
    },
    "幻想号": {
      "id": 9600081,
      "nationality": 96,
      "type": 23,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/8xbjbowssyyf8svf94bt4ojv4arj28i.jpg",
      "alt": "幻想号"
    },
    "和睦号": {
      "id": 9600091,
      "nationality": 96,
      "type": 22,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8a/e2w3cgxchn1q1xe19c3l4c713wpvill.jpg",
      "alt": "和睦号"
    },
    "杜伊斯堡": {
      "id": 402111,
      "nationality": 4,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/i595bd2ccm87mzgo0h9haur2ct30el0.jpg",
      "alt": "杜伊斯堡"
    },
    "建武": {
      "id": 503011,
      "nationality": 5,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bc/hlm6pylqbj4yvkkke4d6o9xybv56x4l.jpg",
      "alt": "建武"
    },
    "绀紫之心": {
      "id": 10100051,
      "nationality": 101,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a1/7gwegr93symne3lyye8i2yswpkshj05.jpg",
      "alt": "绀紫之心"
    },
    "圣黑之心": {
      "id": 10100061,
      "nationality": 101,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cd/lp0000ghgp17vwc1ti3d4x21keanmwm.jpg",
      "alt": "圣黑之心"
    },
    "群白之心": {
      "id": 10100071,
      "nationality": 101,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d2/cyjxmazqz6qbssflgtvi6apvl34ze2s.jpg",
      "alt": "群白之心"
    },
    "翡绿之心": {
      "id": 10100081,
      "nationality": 101,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a7/sdc7dqeasitk7iue2c8g6pnvpcrfe0u.jpg",
      "alt": "翡绿之心"
    },
    "久远": {
      "id": 10300011,
      "nationality": 103,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/nr3eo4xh4aorpjrkpfy71jfjlt5juzg.jpg",
      "alt": "久远"
    },
    "猫音": {
      "id": 10300021,
      "nationality": 103,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fb/trpboab65pc8jxqb8ycn43rwc78vpzd.jpg",
      "alt": "猫音"
    },
    "露露缇耶": {
      "id": 10300031,
      "nationality": 103,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7d/ec77nndoolybomglhths38hgwzwpn0w.jpg",
      "alt": "露露缇耶"
    },
    "绊爱·Elegant": {
      "id": 10400021,
      "nationality": 104,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a7/at3ix8bngf3qf8f28jyaydjfy3xyk3k.jpg",
      "alt": "绊爱·Elegant"
    },
    "绊爱·Anniversary": {
      "id": 10400031,
      "nationality": 104,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/3c1zi2s47lid84sq63mn6i9xj7txr2a.jpg",
      "alt": "绊爱·Anniversary"
    },
    "绊爱·SuperGamer": {
      "id": 10400041,
      "nationality": 104,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/07/fgqyv4astp5vp7s7eyimght9pmsiwdz.jpg",
      "alt": "绊爱·SuperGamer"
    },
    "玛莉萝丝": {
      "id": 10600011,
      "nationality": 106,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f3/ifdzw1u8mjemy8toyy7pzjd97fl16ep.jpg",
      "alt": "玛莉萝丝"
    },
    "穗香": {
      "id": 10600021,
      "nationality": 106,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0f/6147fdcz0gvjm8t6vnlxzfuohllnnlq.jpg",
      "alt": "穗香"
    },
    "霞DOA": {
      "id": 10600031,
      "nationality": 106,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/287cw5nsmspcoc2czbiegeacmkffmi8.jpg",
      "alt": "霞DOA"
    },
    "海咲": {
      "id": 10600041,
      "nationality": 106,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/97/e608j4gg8zxqo2d0ebzfntkv34p9czy.jpg",
      "alt": "海咲"
    },
    "露娜": {
      "id": 10600081,
      "nationality": 106,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/08/02v4dhnwem1cus31ewkmyaw759p1okh.jpg",
      "alt": "露娜"
    },
    "环": {
      "id": 10600091,
      "nationality": 106,
      "type": 4,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/03/tgh8v18asg3wfn2m1i401xekexsx0y6.jpg",
      "alt": "环"
    },
    "天海春香": {
      "id": 10700011,
      "nationality": 107,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b2/359msuyjsjsp5yuyqwlhrblm7t1wwp3.jpg",
      "alt": "天海春香"
    },
    "如月千早": {
      "id": 10700021,
      "nationality": 107,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/4nq7f8t2gddojny4f0a022shwiofafe.jpg",
      "alt": "如月千早"
    },
    "水濑伊织": {
      "id": 10700031,
      "nationality": 107,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/s2sl8mumzocaxkulsu2l0qgenbixoym.jpg",
      "alt": "水濑伊织"
    },
    "三浦梓": {
      "id": 10700041,
      "nationality": 107,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c8/aci8mgxtdznvrpzbna6rr7uud9vzal6.jpg",
      "alt": "三浦梓"
    },
    "宝多六花": {
      "id": 10800011,
      "nationality": 108,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/ibdhl4aojkzvmi43c3lpje5yc5vvjv5.jpg",
      "alt": "宝多六花"
    },
    "新条茜": {
      "id": 10800021,
      "nationality": 108,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/91/ld10e9zqk3m0ssvowism8037l627rsa.jpg",
      "alt": "新条茜"
    },
    "南梦芽": {
      "id": 10800051,
      "nationality": 108,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/34/5ocrdw78j43vl63rr9bf1v2qvk57ior.jpg",
      "alt": "南梦芽"
    },
    "飞鸟川千濑": {
      "id": 10800061,
      "nationality": 108,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9e/mrcr8gw612dpazjluurdzem87yc9ce6.jpg",
      "alt": "飞鸟川千濑"
    },
    "第二代": {
      "id": 10800081,
      "nationality": 108,
      "type": 10,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/79/t4kbabvfeuuyply6v1tzw70acqizf3v.jpg",
      "alt": "第二代"
    },
    "公主": {
      "id": 10800091,
      "nationality": 108,
      "type": 19,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/97/c4r4fcqqzz1pt8mvj27ztwhvv6055af.jpg",
      "alt": "公主"
    },
    "莱莎琳·斯托特": {
      "id": 10900011,
      "nationality": 109,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/46/ff844v5ikl50pga7vcweup4xs38xve5.jpg",
      "alt": "莱莎琳·斯托特"
    },
    "科洛蒂娅·巴兰茨": {
      "id": 10900021,
      "nationality": 109,
      "type": 6,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/3b61fsgo1tbjd2rji1itz5a1hwf5gi4.jpg",
      "alt": "科洛蒂娅·巴兰茨"
    },
    "帕特莉夏·阿贝尔海姆": {
      "id": 10900031,
      "nationality": 109,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/82/1enyk9aynhazxpx7z8xk7uzharga4y0.jpg",
      "alt": "帕特莉夏·阿贝尔海姆"
    },
    "卡菈·伊迪亚斯": {
      "id": 10900061,
      "nationality": 109,
      "type": 18,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/91/0wwyiybkayx4e631kl7v5ggmth01ugj.jpg",
      "alt": "卡菈·伊迪亚斯"
    },
    "飞鸟": {
      "id": 11000011,
      "nationality": 110,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/8/85/o539tgikun9iwbp7d9lgg2r6okkf3eb.jpg",
      "alt": "飞鸟"
    },
    "斑鸠": {
      "id": 11000021,
      "nationality": 110,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c0/15zch8dj5xm7plzvqhet3m7gsphq5kz.jpg",
      "alt": "斑鸠"
    },
    "焰": {
      "id": 11000031,
      "nationality": 110,
      "type": 8,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/mzzk8m8qzlbfzj87ux79kfiwh925t0k.jpg",
      "alt": "焰"
    },
    "雪泉": {
      "id": 11000041,
      "nationality": 110,
      "type": 7,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/71/oldqes9c5ebq70eomihdhjpr9kujx0f.jpg",
      "alt": "雪泉"
    },
    "雪不归": {
      "id": 11000051,
      "nationality": 110,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ae/5i25c0a1htv474noz9ssz0nsveq2v78.jpg",
      "alt": "雪不归"
    },
    "菈菈·撒塔琳·戴比路克": {
      "id": 11100011,
      "nationality": 111,
      "type": 3,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/ffh7pzvy8fohvtam37qdu1wlxafxwum.jpg",
      "alt": "菈菈·撒塔琳·戴比路克"
    },
    "娜娜·阿丝达·戴比路克": {
      "id": 11100021,
      "nationality": 111,
      "type": 1,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/4jw5qlyk7ushg2pm7dzfe5p8pnux5la.jpg",
      "alt": "娜娜·阿丝达·戴比路克"
    },
    "梦梦·贝莉雅·戴比路克": {
      "id": 11100041,
      "nationality": 111,
      "type": 2,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/2kj1z068ev9b4t8bxvqxrx6ty3lzpy7.jpg",
      "alt": "梦梦·贝莉雅·戴比路克"
    },
    "金色暗影": {
      "id": 11100031,
      "nationality": 111,
      "type": 5,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/4/45/h5ikyuhsetswttmibatswv5ej5wei9u.jpg",
      "alt": "金色暗影"
    },
    "飞龙·META": {
      "id": 9707011,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9e/du7m10w4j0p7tftb369gnzob6ek4u9w.jpg",
      "alt": "飞龙·META"
    },
    "皇家方舟·META": {
      "id": 9707021,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/3/33/6aeqc2i8ao68ntotsrqs1y2i7em7kqo.jpg",
      "alt": "皇家方舟·META"
    },
    "海伦娜·META": {
      "id": 9702011,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c5/p7o2tijt25suhpsj58dy736q4vxsblu.jpg",
      "alt": "海伦娜·META"
    },
    "苍龙·META": {
      "id": 9707031,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a4/qe6bvi67k30revu8cud05w2w5dj9aua.jpg",
      "alt": "苍龙·META"
    },
    "格奈森瑙·META": {
      "id": 9704011,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fc/phqv7phgcjfrv5vuu6vyngs50gnh2sb.jpg",
      "alt": "格奈森瑙·META"
    },
    "沙恩霍斯特·META": {
      "id": 9704021,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d7/qwcjrt2pej1w5sea1jm6b8onof5ll3r.jpg",
      "alt": "沙恩霍斯特·META"
    },
    "反击·META": {
      "id": 9704031,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d7/38wl0l5xubyj83h8e35acpqijnzs3lg.jpg",
      "alt": "反击·META"
    },
    "声望·META": {
      "id": 9704041,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/j5pwsbrv945r1jocnriro9tpgb6c93x.jpg",
      "alt": "声望·META"
    },
    "亚利桑那·META": {
      "id": 9705031,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ac/odijya7wr1zmugqklmd3y3tcjklxlwb.jpg",
      "alt": "亚利桑那·META"
    },
    "伊丽莎白女王·META": {
      "id": 9705041,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/27/okhrdfhxbi5rx9ljkt0kk3ayxqkk2yg.jpg",
      "alt": "伊丽莎白女王·META"
    },
    "U-556·META": {
      "id": 9708011,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1f/gncwx2jiv42avjzbz2s0sunec5p8da8.jpg",
      "alt": "U-556·META"
    },
    "阿尔及利亚·META": {
      "id": 9703021,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/0/07/i83hh0c3bz688j182383pbaso3nythk.jpg",
      "alt": "阿尔及利亚·META"
    },
    "神通·META": {
      "id": 9702051,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/97/14pj4oiqbf3lcz4q16o19n7etpr99eq.jpg",
      "alt": "神通·META"
    },
    "基洛夫·META": {
      "id": 9702061,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/92/s1ic5hju41kdlicfjb0g4tlvu6x97zl.jpg",
      "alt": "基洛夫·META"
    },
    "水星纪念·META": {
      "id": 9702071,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9e/hy9eqde60mcnz114n7y12ki5efob8ns.jpg",
      "alt": "水星纪念·META"
    },
    "罗德尼·META": {
      "id": 9705051,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/1/18/bmddytd4ao3zqc03zc0bn4lmyv0e2zq.jpg",
      "alt": "罗德尼·META"
    },
    "贝亚恩·META": {
      "id": 9707041,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/gyuzyqeynxtah1ryv7krdq3vkdop07n.jpg",
      "alt": "贝亚恩·META"
    },
    "威奇塔·META": {
      "id": 9703041,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ac/0blli6ejkxf9pttcose02itkyovg7lh.jpg",
      "alt": "威奇塔·META"
    },
    "长门·META": {
      "id": 9705061,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/fdbe8vk3cdsuoect4ot6r0yxlhweiof.jpg",
      "alt": "长门·META"
    },
    "比叡·META": {
      "id": 9704051,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/5/59/66jim5ff82d6ylokg8r1ic5n0f4qfqv.jpg",
      "alt": "比叡·META"
    },
    "大凤·META": {
      "id": 9707051,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c4/tpss7ksaapnbn3jvjcsuue1b1qtogw5.jpg",
      "alt": "大凤·META"
    },
    "希佩尔海军上将·META": {
      "id": 9703051,
      "nationality": 97,
      "type": 301,
      "rarity": 5,
      "src": "https://patchwiki.biligame.com/images/blhx/2/24/gk859avje3iqbx1qffgfjzgp4aib3ps.jpg",
      "alt": "希佩尔海军上将·META"
    },
    "海王星": {
      "id": 299011,
      "nationality": 2,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d1/l3q155blb13crrs0byb3lj716kvyvj7.jpg",
      "alt": "海王星"
    },
    "君主": {
      "id": 299021,
      "nationality": 2,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/6/61/ov7cz8a4438eutvkx4px5n6mzzqddo9.jpg",
      "alt": "君主"
    },
    "伊吹": {
      "id": 399011,
      "nationality": 3,
      "type": 3,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/7/77/pp4453w8lav4apzgl3za5wt95edjelc.jpg",
      "alt": "伊吹"
    },
    "出云": {
      "id": 399021,
      "nationality": 3,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/8f7jz58odnqc2jwxk700k0ri9dzu4tm.jpg",
      "alt": "出云"
    },
    "罗恩": {
      "id": 499011,
      "nationality": 4,
      "type": 3,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/o7595yrtse568bpj4o2z6gbm7kh8bxy.jpg",
      "alt": "罗恩"
    },
    "路易九世": {
      "id": 899011,
      "nationality": 8,
      "type": 3,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2b/8rc5ty6klot2kv1fpk2abqfcwiaotkl.jpg",
      "alt": "路易九世"
    },
    "西雅图": {
      "id": 199011,
      "nationality": 1,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ec/1fxhbla64szhm1du0j50tnfrkh3ipzt.jpg",
      "alt": "西雅图"
    },
    "佐治亚": {
      "id": 199021,
      "nationality": 1,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c9/et9uph48be0gpssyl9adppqknepkr0c.jpg",
      "alt": "佐治亚"
    },
    "北风": {
      "id": 399031,
      "nationality": 3,
      "type": 1,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/3/31/dnws3j4ovgzu4ivnfku0ptu2q09zxlf.jpg",
      "alt": "北风"
    },
    "加斯科涅": {
      "id": 999011,
      "nationality": 9,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/3/31/76onkmw5756hur5k3da4znu36t0saq2.jpg",
      "alt": "加斯科涅"
    },
    "柴郡": {
      "id": 299031,
      "nationality": 2,
      "type": 3,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/5phpv3wpastmnpgwy6aai7oe0mav76g.jpg",
      "alt": "柴郡"
    },
    "美因茨": {
      "id": 499031,
      "nationality": 4,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6a/pc4kjjqj4smcys087fej2mx4782ho4l.jpg",
      "alt": "美因茨"
    },
    "奥丁": {
      "id": 499041,
      "nationality": 4,
      "type": 4,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e3/5sm7md9gbwdzi38p74sacx2x1xtbh7f.jpg",
      "alt": "奥丁"
    },
    "香槟": {
      "id": 899021,
      "nationality": 8,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/6/67/qtgox335weg36soyhym22taeq812uf1.jpg",
      "alt": "香槟"
    },
    "安克雷奇": {
      "id": 199031,
      "nationality": 1,
      "type": 3,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d0/oifgggzgik1o88paxxikmtxv8fvuc52.jpg",
      "alt": "安克雷奇"
    },
    "奥古斯特·冯·帕塞瓦尔": {
      "id": 499061,
      "nationality": 4,
      "type": 7,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e2/q0ujouwym26owanuerv2s2gjrvpipqm.jpg",
      "alt": "奥古斯特·冯·帕塞瓦尔"
    },
    "马可·波罗": {
      "id": 699011,
      "nationality": 6,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a4/38rpjdv36vrlae9zkowlhkb71outnfh.jpg",
      "alt": "马可·波罗"
    },
    "鲁普雷希特亲王": {
      "id": 499071,
      "nationality": 4,
      "type": 4,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ad/4s5dtgdyo2as1s58mru6c8gky4p2oag.jpg",
      "alt": "鲁普雷希特亲王"
    },
    "哈尔滨": {
      "id": 599011,
      "nationality": 5,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/0/00/t9lg54bwtgfzvjvnrysu34nt6cack4x.jpg",
      "alt": "哈尔滨"
    },
    "契卡洛夫": {
      "id": 799011,
      "nationality": 7,
      "type": 7,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/0/02/i4qjk0cnxr8t9s3qe5hp1dexyljwe6l.jpg",
      "alt": "契卡洛夫"
    },
    "四万十": {
      "id": 399061,
      "nationality": 3,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3e/3ws33xdsoz2xs849ob35zev6f3lm7g7.jpg",
      "alt": "四万十"
    },
    "菲利克斯·舒尔茨": {
      "id": 499081,
      "nationality": 4,
      "type": 1,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/9/96/n6nw5i0e4xh53g767nr26onngckowgr.jpg",
      "alt": "菲利克斯·舒尔茨"
    },
    "弗兰德尔": {
      "id": 999021,
      "nationality": 9,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6f/9ud39qpqu68bbmdxk6njiut2cvhvgkp.jpg",
      "alt": "弗兰德尔"
    },
    "哈尔福德": {
      "id": 199051,
      "nationality": 1,
      "type": 1,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/5/53/cl5ilkk844w1u29qwfrltgonxmnujla.jpg",
      "alt": "哈尔福德"
    },
    "大山": {
      "id": 399071,
      "nationality": 3,
      "type": 5,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8f/s4outcst8o7hj06wmxuldf9ysdx9ywk.jpg",
      "alt": "大山"
    },
    "贝亚德": {
      "id": 899041,
      "nationality": 8,
      "type": 2,
      "rarity": 15,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0f/oskmo8xlljpki0fefwi05wyfqebeh4c.jpg",
      "alt": "贝亚德"
    },
    "泛用型布里": {
      "id": 100001,
      "nationality": 10,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e1/oecjjh63h5k2p48ba452epm6ws88tl6.jpg",
      "alt": "泛用型布里"
    },
    "莫里": {
      "id": 101081,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5e/bhlzgx3llrqoirbo8n6bohbi1had9ob.jpg",
      "alt": "莫里"
    },
    "查尔斯·奥斯本": {
      "id": 101111,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/b/be/eqfb03ul1x7w186zqc3ix02gyl5yfbt.jpg",
      "alt": "查尔斯·奥斯本"
    },
    "拉菲": {
      "id": 101171,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4a/qem3vdjudcyu0zc3mcqo96bursq9625.jpg",
      "alt": "拉菲"
    },
    "海伦娜": {
      "id": 102051,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/12/plt2so2embv48skylnd63o28kmvllni.jpg",
      "alt": "海伦娜"
    },
    "克利夫兰": {
      "id": 102091,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f1/adqyg5ulh9muhxyxs8v489s2i7ahu6k.jpg",
      "alt": "克利夫兰"
    },
    "哥伦比亚": {
      "id": 102101,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3b/esm2f6teims0dcveteypcrh45q39atn.jpg",
      "alt": "哥伦比亚"
    },
    "休斯敦": {
      "id": 103051,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d4/4donfo5saf3c5ehn220g2pswfaist32.jpg",
      "alt": "休斯敦"
    },
    "印第安纳波利斯": {
      "id": 103071,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/t4r6uxvttolwslguibi2v13b19fgwc3.jpg",
      "alt": "印第安纳波利斯"
    },
    "阿斯托利亚": {
      "id": 103081,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/37/r74irvbhnkv4yhovesb7i456hgtqsb1.jpg",
      "alt": "阿斯托利亚"
    },
    "昆西": {
      "id": 103091,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/7y91jzejebqfipobeub4oehcjhbrpwb.jpg",
      "alt": "昆西"
    },
    "文森斯": {
      "id": 103101,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d3/7qpsg3c8z55x6nfvg4jl00rffhjej8x.jpg",
      "alt": "文森斯"
    },
    "威奇塔": {
      "id": 103111,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/97/p6lxwngzco1g07m7jevm4ay3vrx0x6p.jpg",
      "alt": "威奇塔"
    },
    "亚利桑那": {
      "id": 105041,
      "nationality": 1,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1e/2ph8bk6z4ssbmuj0bl4l0cdv7sidxi6.jpg",
      "alt": "亚利桑那"
    },
    "科罗拉多": {
      "id": 105091,
      "nationality": 1,
      "type": 5,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8c/3ci08r2ezo7qvsf0fpfkqo7eg2iidh0.jpg",
      "alt": "科罗拉多"
    },
    "马里兰": {
      "id": 105101,
      "nationality": 1,
      "type": 5,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ca/5w2zomwd7odf560lr07lqsrxk8psm5a.jpg",
      "alt": "马里兰"
    },
    "西弗吉尼亚": {
      "id": 105111,
      "nationality": 1,
      "type": 5,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1e/oxv6ziaxifig103aili8ef9or8dmjrf.jpg",
      "alt": "西弗吉尼亚"
    },
    "列克星敦": {
      "id": 107021,
      "nationality": 1,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ad/npawf4rawwhk09ynylwvmsfg58as57w.jpg",
      "alt": "列克星敦"
    },
    "萨拉托加": {
      "id": 107031,
      "nationality": 1,
      "type": 7,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/76swhxsvmu2i0l14jjodpw4svbvp1pz.jpg",
      "alt": "萨拉托加"
    },
    "约克城": {
      "id": 107051,
      "nationality": 1,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/87/cmsv2fpnjocnsbxeurhi3e5ali2ds17.jpg",
      "alt": "约克城"
    },
    "大黄蜂": {
      "id": 107071,
      "nationality": 1,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/6fqg76qyqgrozuij3fm9v0j4jgtowmm.jpg",
      "alt": "大黄蜂"
    },
    "女灶神": {
      "id": 112011,
      "nationality": 1,
      "type": 12,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a5/2ztgow0n53udxgdtvdk25wv928937ze.jpg",
      "alt": "女灶神"
    },
    "格伦维尔": {
      "id": 201131,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/da/h3yhefxyg7rxf7a5cd6sny66mi9qxpv.jpg",
      "alt": "格伦维尔"
    },
    "萤火虫": {
      "id": 201141,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/63/qamclew8mnh3m1kpsstjvyjgf227nsm.jpg",
      "alt": "萤火虫"
    },
    "勇敢": {
      "id": 201161,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a2/7zm9m4esgb0wlzxw5dd4f4evaqmx445.jpg",
      "alt": "勇敢"
    },
    "标枪": {
      "id": 201211,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/74/oaiog2tdk4fkrzmidgf2quypmrcs63u.jpg",
      "alt": "标枪"
    },
    "吸血鬼": {
      "id": 201231,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/95/163y259nmom0tgz1gve5hvom8wepso6.jpg",
      "alt": "吸血鬼"
    },
    "谢菲尔德": {
      "id": 202081,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c1/4svguopuwtj5fvwfnx5bhm1nxawvyra.jpg",
      "alt": "谢菲尔德"
    },
    "曼彻斯特": {
      "id": 202091,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/6rsorkjm7veh5n77zvly8x4snv0q596.jpg",
      "alt": "曼彻斯特"
    },
    "格罗斯特": {
      "id": 202101,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d1/f6cn48klh5lyrvj7xzgkk34jp4yd8ya.jpg",
      "alt": "格罗斯特"
    },
    "爱丁堡": {
      "id": 202111,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9e/rjj5uuehm6ttuxqyn9vsuhkr7tbvs3i.jpg",
      "alt": "爱丁堡"
    },
    "欧若拉": {
      "id": 202151,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/ba/t0dsq6xgx4zm3q2kxfpvjtidwx3ax3z.jpg",
      "alt": "欧若拉"
    },
    "伦敦": {
      "id": 203011,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/54/4p3eqxnefbscebhc6m1m3lpqync1vvh.jpg",
      "alt": "伦敦"
    },
    "多塞特郡": {
      "id": 203061,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c4/b20h0ew08sc7jap338x4ozvwsuvz8p7.jpg",
      "alt": "多塞特郡"
    },
    "约克": {
      "id": 203071,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/t63i2cd6uj1cyo6wol6zts5ag2n4jwm.jpg",
      "alt": "约克"
    },
    "埃克塞特": {
      "id": 203081,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/eb/jllzbvl9gzetgbboynhvb5gf2wkd8vk.jpg",
      "alt": "埃克塞特"
    },
    "声望": {
      "id": 204011,
      "nationality": 2,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/53/any95u1kgnana1ten3wvms5s98eg9fo.jpg",
      "alt": "声望"
    },
    "伊丽莎白女王": {
      "id": 205011,
      "nationality": 2,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0e/eq87aq01soo20s134zcco8xik17yan2.jpg",
      "alt": "伊丽莎白女王"
    },
    "纳尔逊": {
      "id": 205031,
      "nationality": 2,
      "type": 5,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/s884krlu82gcw93qebs0jeo7foukiwr.jpg",
      "alt": "纳尔逊"
    },
    "罗德尼": {
      "id": 205041,
      "nationality": 2,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/09/00r56g3avg2h363tofjruslfoh0o0lm.jpg",
      "alt": "罗德尼"
    },
    "独角兽": {
      "id": 206031,
      "nationality": 2,
      "type": 6,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f6/3qjgu9ly2nt3c871r3mifb35g125au0.jpg",
      "alt": "独角兽"
    },
    "鹰": {
      "id": 207011,
      "nationality": 2,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7f/otdtoeqi30jypltqmhr5r7iltbl5dbo.jpg",
      "alt": "鹰"
    },
    "皇家方舟": {
      "id": 207021,
      "nationality": 2,
      "type": 7,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4e/th0ks07f02bbmgmwx0j1duo1vv3c29v.jpg",
      "alt": "皇家方舟"
    },
    "光荣": {
      "id": 207061,
      "nationality": 2,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/55rex9gwdv7o2dakg8uhyt5scd6sj6p.jpg",
      "alt": "光荣"
    },
    "黑暗界": {
      "id": 213011,
      "nationality": 2,
      "type": 13,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1e/5werd24kg1em6hx33mlaz7dm0l70v9p.jpg",
      "alt": "黑暗界"
    },
    "恐怖": {
      "id": 213021,
      "nationality": 2,
      "type": 13,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/58/j6jaa7nugpzthh12e1cchyn62bav0ix.jpg",
      "alt": "恐怖"
    },
    "吹雪": {
      "id": 301011,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/31/jncc25b2ovorf1bxlh1ybfswnmzuruy.jpg",
      "alt": "吹雪"
    },
    "白雪": {
      "id": 301021,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/29/qohn9fgpw6trhapq75ocb21ptr3i45k.jpg",
      "alt": "白雪"
    },
    "深雪": {
      "id": 301041,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6c/hs9mu4ud1jz7a31raw03zsyr2qivjbt.jpg",
      "alt": "深雪"
    },
    "绫波": {
      "id": 301051,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/45/c7ujxade59wst2qw6xcchdgfz2ew62h.jpg",
      "alt": "绫波"
    },
    "响": {
      "id": 301101,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f4/cpu9zq0b1eeeuw8eesc1cwgabaj80gq.jpg",
      "alt": "响"
    },
    "时雨": {
      "id": 301151,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f3/afbksdhlgaq7gwiae1slulz45jffgw1.jpg",
      "alt": "时雨"
    },
    "野分": {
      "id": 301201,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b0/tmxqu0ldobblzmw1pyg0htw30qm8i4x.jpg",
      "alt": "野分"
    },
    "夕张": {
      "id": 302011,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ed/joqm76hqm6t0vpwcsa1cg3lkn31kg2j.jpg",
      "alt": "夕张"
    },
    "名取": {
      "id": 302061,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0d/jw3kqnmm0wxyxfq6dggaja5s40rly14.jpg",
      "alt": "名取"
    },
    "由良": {
      "id": 302071,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/47/5znavgt7f0yfwm686gum4rctgqoskqh.jpg",
      "alt": "由良"
    },
    "鬼怒": {
      "id": 302081,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/a/aa/2qy5zq0y0wtmx51qpmydb8holpwkjrs.jpg",
      "alt": "鬼怒"
    },
    "最上": {
      "id": 302101,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c8/5v6276g6exdv74qq3z2fbreanbqri9d.jpg",
      "alt": "最上"
    },
    "三隈": {
      "id": 302111,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8c/as369ed4iltjgyxgdcl1c5eww5va69w.jpg",
      "alt": "三隈"
    },
    "足柄": {
      "id": 303091,
      "nationality": 3,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4c/r1qui9ar8zlly97hfvzt66oijnot1x3.jpg",
      "alt": "足柄"
    },
    "羽黑": {
      "id": 303101,
      "nationality": 3,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/25/88yrnbwo978agid6j5pw0dswpz73og1.jpg",
      "alt": "羽黑"
    },
    "金刚": {
      "id": 304011,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cc/6k28h0m7mnln5c292kwqm7j6cpxav18.jpg",
      "alt": "金刚"
    },
    "比叡": {
      "id": 304021,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/c6227gkzx5q3k1zmlgdpjc47n0dg70k.jpg",
      "alt": "比叡"
    },
    "榛名": {
      "id": 304031,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ea/idttofvzgawp8ldmdt1j4fvlp70fws4.jpg",
      "alt": "榛名"
    },
    "雾岛": {
      "id": 304041,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e1/0ih1yqee1sznh2vq35bzrfz66b3ir81.jpg",
      "alt": "雾岛"
    },
    "陆奥": {
      "id": 305061,
      "nationality": 3,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c5/cplrlgcf806625sb0ucfr5ld3jd2780.jpg",
      "alt": "陆奥"
    },
    "凤翔": {
      "id": 306031,
      "nationality": 3,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2b/l1j0ij9732dftf4okl13ansuez3aswz.jpg",
      "alt": "凤翔"
    },
    "龙骧": {
      "id": 306061,
      "nationality": 3,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d6/hgixu62ui3kzhun99xsmt7pymcp1q3n.jpg",
      "alt": "龙骧"
    },
    "苍龙": {
      "id": 307031,
      "nationality": 3,
      "type": 7,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/bzf7xkt477wpn7wtpcxngqc4iup7o29.jpg",
      "alt": "苍龙"
    },
    "飞龙": {
      "id": 307041,
      "nationality": 3,
      "type": 7,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/dp4wnkcj2hynrgdyqqay48pdw91n3km.jpg",
      "alt": "飞龙"
    },
    "Z1": {
      "id": 401011,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f4/pjzodtmeqqp86j49t3mpcoapg36qlt4.jpg",
      "alt": "Z1"
    },
    "Z23": {
      "id": 401231,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/m4nu2ekhqz9klie4vmztjhf8u9cx9n2.jpg",
      "alt": "Z23"
    },
    "Z25": {
      "id": 401251,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9d/3ifzd3dfb1fhe9qbcetc2a1xeia2epj.jpg",
      "alt": "Z25"
    },
    "希佩尔海军上将": {
      "id": 403011,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/65/8ugxiwyhydnwlf3wvvte4iusjo17pjr.jpg",
      "alt": "希佩尔海军上将"
    },
    "德意志": {
      "id": 403041,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/94/c7qw8vt9n23uarvo0l5v7lagebj6nmr.jpg",
      "alt": "德意志"
    },
    "斯佩伯爵海军上将": {
      "id": 403051,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/h845keo1dbp73e346f4j2mn5j0ttglb.jpg",
      "alt": "斯佩伯爵海军上将"
    },
    "沙恩霍斯特": {
      "id": 404011,
      "nationality": 4,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a7/j8y0gjcwf3b3iyjjf7lwcdaimn052z6.jpg",
      "alt": "沙恩霍斯特"
    },
    "格奈森瑙": {
      "id": 404021,
      "nationality": 4,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7e/2yhqpvxxo01jbub86x0zesgz15oezvd.jpg",
      "alt": "格奈森瑙"
    },
    "鞍山": {
      "id": 501011,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/27/at3aso82ztnepme7r069nddkp8mlxqv.jpg",
      "alt": "鞍山"
    },
    "抚顺": {
      "id": 501021,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/mkwp3jfthm5iejvl00o5wx5wsquhksw.jpg",
      "alt": "抚顺"
    },
    "长春": {
      "id": 501031,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/3/35/6furru9ysz7nrn7k4xj5wadnbud2bun.jpg",
      "alt": "长春"
    },
    "太原": {
      "id": 501041,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/a/af/lc08cnp2y8u57q6o5puury7gugv0meo.jpg",
      "alt": "太原"
    },
    "逸仙": {
      "id": 502011,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fb/5964992vk46o94ifnb28i6d8hjx2ay7.jpg",
      "alt": "逸仙"
    },
    "宁海": {
      "id": 502021,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/79/qnvy2ra2wm6598oi7jbp0dncdlfbct6.jpg",
      "alt": "宁海"
    },
    "平海": {
      "id": 502031,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d4/otl7q4332297k4qxfkm97hyr74m49gc.jpg",
      "alt": "平海"
    },
    "海风": {
      "id": 301471,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bd/aylssv32r0ewsqfdn19bmjqlxm1xobk.jpg",
      "alt": "海风"
    },
    "山风": {
      "id": 301481,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b4/o2pdyos3j8nph5871ztabjdiy7ok9k0.jpg",
      "alt": "山风"
    },
    "新月JP": {
      "id": 301561,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/62/35ufpaoyh1totq7rugzvk24dcnuypbd.jpg",
      "alt": "新月JP"
    },
    "春月": {
      "id": 301571,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/55/ec6vte6d3lewhr4yjoxy7ekkfrb5epd.jpg",
      "alt": "春月"
    },
    "宵月": {
      "id": 301581,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5c/r3g87gog502sid28hbe567c75rdt0m9.jpg",
      "alt": "宵月"
    },
    "尼古拉斯": {
      "id": 101311,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8a/hs9lbv8p0yw4rrfg3s8zjzsa06hhv08.jpg",
      "alt": "尼古拉斯"
    },
    "圣路易斯": {
      "id": 102131,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fe/qx4zjs6q0tg5b70vjik6repywxodvh8.jpg",
      "alt": "圣路易斯"
    },
    "神通": {
      "id": 302131,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/56/bvno6kzy4p19mo2widy5luaz7erm6jy.jpg",
      "alt": "神通"
    },
    "阿贺野": {
      "id": 302201,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/70/rltg1c6fe3ab58vn0oxhb8377ffdonf.jpg",
      "alt": "阿贺野"
    },
    "无敌": {
      "id": 201261,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c1/46pyd5j91o3ysxwq2e5lq38haelk627.jpg",
      "alt": "无敌"
    },
    "火枪手": {
      "id": 201271,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/56/bqtnq8fr3rl8w96st9f2gfdg3jdu65c.jpg",
      "alt": "火枪手"
    },
    "丹佛": {
      "id": 102151,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/08/5okgxvxewhzj5mc8c7zvosmme0xw8u8.jpg",
      "alt": "丹佛"
    },
    "小贝法": {
      "id": 202181,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bb/8ji7sqieq02uzr58dharcbwycvbxshq.jpg",
      "alt": "小贝法"
    },
    "阿贝克隆比": {
      "id": 213041,
      "nationality": 2,
      "type": 13,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/68/4ch90k49t2soktx16rwhe7l7gwwg2eg.jpg",
      "alt": "阿贝克隆比"
    },
    "伊26": {
      "id": 308021,
      "nationality": 3,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ef/rh98or6oq32a8hruv1fwpdiskh7yjod.jpg",
      "alt": "伊26"
    },
    "伊58": {
      "id": 308031,
      "nationality": 3,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/01/9bu16vh3513qlgp7fs923w0aw6x5mj3.jpg",
      "alt": "伊58"
    },
    "鲦鱼": {
      "id": 108011,
      "nationality": 1,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/3nxqg1dhwdutrt3ojp93sfuwsdp9tz4.jpg",
      "alt": "鲦鱼"
    },
    "U-557": {
      "id": 408031,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ed/pezxdpv2ong7hcva9jynvdn50cmpk0z.jpg",
      "alt": "U-557"
    },
    "Z35": {
      "id": 401351,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d5/modhvuapkdz7i986jjdwt49ngq22b4n.jpg",
      "alt": "Z35"
    },
    "埃米尔·贝尔汀": {
      "id": 802011,
      "nationality": 8,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/ecipw26mwnt6lteaiwxijojs09bm86s.jpg",
      "alt": "埃米尔·贝尔汀"
    },
    "絮库夫": {
      "id": 808011,
      "nationality": 8,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1a/9jg4js6oxzwf8x8y3jkq1vz2jnabt7m.jpg",
      "alt": "絮库夫"
    },
    "敦刻尔克": {
      "id": 904011,
      "nationality": 9,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/02/oze9ijfv2hi732njjzlq8b61q582hfu.jpg",
      "alt": "敦刻尔克"
    },
    "鲁莽": {
      "id": 801031,
      "nationality": 8,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f9/o6ti1kmcze943x8nvpg5v54lo2g8dtb.jpg",
      "alt": "鲁莽"
    },
    "卷波": {
      "id": 301801,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/68/kc3y7yec77cfqfbbki3yc7qs2el2vad.jpg",
      "alt": "卷波"
    },
    "马拉尼": {
      "id": 101391,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6a/6xpvdc7msj1q3rid72vyzy8agg2tjkr.jpg",
      "alt": "马拉尼"
    },
    "追赶者": {
      "id": 206051,
      "nationality": 2,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/aa/c4isj074a0v1p10jcdp269733b2rrr3.jpg",
      "alt": "追赶者"
    },
    "独立": {
      "id": 107221,
      "nationality": 1,
      "type": 6,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d6/qfkflzokoaz1g5s1qenttq1hxyvn66f.jpg",
      "alt": "独立"
    },
    "Z2": {
      "id": 401021,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/da/8t96ma2bwm7ehdmfzwohnjx3ha24j59.jpg",
      "alt": "Z2"
    },
    "铃谷": {
      "id": 303171,
      "nationality": 3,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/09/flhfsyl9jmmmaxvmj1a3jo6530bu7fz.jpg",
      "alt": "铃谷"
    },
    "小比叡": {
      "id": 304061,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/ou8uip06iz4zukn6d1rt022062zmi77.jpg",
      "alt": "小比叡"
    },
    "小赤城": {
      "id": 307091,
      "nationality": 3,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/m3j7faopeg2lc6wer08rt4ttpz4r05v.jpg",
      "alt": "小赤城"
    },
    "小齐柏林": {
      "id": 407021,
      "nationality": 4,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/qhglwjchhj6jndg9i2234tz3jczaxjo.jpg",
      "alt": "小齐柏林"
    },
    "U-556": {
      "id": 408041,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/18u6rgf8z94tzbkmx44dmffeh7btihs.jpg",
      "alt": "U-556"
    },
    "U-73": {
      "id": 408051,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6b/mqh9uiuiy7zgvj5434azndz6mv1l42b.jpg",
      "alt": "U-73"
    },
    "Z36": {
      "id": 401361,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/89/ia7kr8yxflx1qdtdc5i7chvxdw7h0ol.jpg",
      "alt": "Z36"
    },
    "小海伦娜": {
      "id": 102191,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/86/21xwabzrmdl31h97iwcje1qri4jkuf4.jpg",
      "alt": "小海伦娜"
    },
    "小克利夫兰": {
      "id": 102201,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/21/58nkeekrn3iwr1m61gtny4psfx59as7.jpg",
      "alt": "小克利夫兰"
    },
    "小圣地亚哥": {
      "id": 102211,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d5/j8ixub1q842e98djuoqkzwsgy3k4mp7.jpg",
      "alt": "小圣地亚哥"
    },
    "倔强": {
      "id": 801041,
      "nationality": 8,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a0/9ewwd49p716kw2ks3c502sh4bt1k16h.jpg",
      "alt": "倔强"
    },
    "伊25": {
      "id": 308041,
      "nationality": 3,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/de/5802irow5u6b9tf52pfw90lkh26wf19.jpg",
      "alt": "伊25"
    },
    "伊56": {
      "id": 308051,
      "nationality": 3,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9b/h8z85nu6azvncxpr6d3awfqnr3etksr.jpg",
      "alt": "伊56"
    },
    "U-522": {
      "id": 408071,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/dd/2119flhy8gaoh1b3kmwpbgr874cawar.jpg",
      "alt": "U-522"
    },
    "巴丹": {
      "id": 107291,
      "nationality": 1,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/32/et4ck0k0bevpemfpveilbupg5o03oro.jpg",
      "alt": "巴丹"
    },
    "伯明翰": {
      "id": 102231,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/ba/t3ra4wklj8mef71msqdilux8q43t9q2.jpg",
      "alt": "伯明翰"
    },
    "黑太子": {
      "id": 202241,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1d/3foke95a0czgpu474vh4ehthsodv0pn.jpg",
      "alt": "黑太子"
    },
    "朱利奥·凯撒": {
      "id": 605061,
      "nationality": 6,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a9/jeckrfl8vaijpnrg63z0v0dyy9gnyus.jpg",
      "alt": "朱利奥·凯撒"
    },
    "龙骑兵": {
      "id": 601021,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c9/fu92b6snoyy5jypmairyaexf065xew4.jpg",
      "alt": "龙骑兵"
    },
    "U-110": {
      "id": 408081,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c3/bi3fdt1dfu12wpqx3bsps1rc1dc9ik0.jpg",
      "alt": "U-110"
    },
    "克利夫兰(μ兵装)": {
      "id": 102241,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b3/b507sn1pbedz3sbfwqykcgbeauljrq1.jpg",
      "alt": "克利夫兰(μ兵装)"
    },
    "谢菲尔德(μ兵装)": {
      "id": 202251,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6e/ho816unf938s19rz9vpc7petnx44w1z.jpg",
      "alt": "谢菲尔德(μ兵装)"
    },
    "希佩尔海军上将(μ兵装)": {
      "id": 403071,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8e/pkrtqxq0iasdrmjmfgs0quvxyo7s5sw.jpg",
      "alt": "希佩尔海军上将(μ兵装)"
    },
    "霞": {
      "id": 301811,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/6/65/qcnn3xb0i3943b65xl3vc2spuzzpojv.jpg",
      "alt": "霞"
    },
    "比洛克西": {
      "id": 102251,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/swi1kjekxmaod7ebe065sa6l0aadq8n.jpg",
      "alt": "比洛克西"
    },
    "浦波": {
      "id": 301721,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/64/lu3pttecngqpu2k7rjoasx2k59anquf.jpg",
      "alt": "浦波"
    },
    "威严": {
      "id": 701021,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/h30cgfehgm660s2679iysz0onb7nbaz.jpg",
      "alt": "威严"
    },
    "明斯克": {
      "id": 701031,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5c/1anouggpgi1bkzg3ucavmplid8m1qxg.jpg",
      "alt": "明斯克"
    },
    "水星纪念": {
      "id": 702021,
      "nationality": 7,
      "type": 2,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b2/1f420pk5m1yg2vqyo32l61ynv6mikdg.jpg",
      "alt": "水星纪念"
    },
    "甘古特": {
      "id": 705011,
      "nationality": 7,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/63/smprm8fomjpjma5fydu5k8yh9s05lem.jpg",
      "alt": "甘古特"
    },
    "库珀": {
      "id": 101441,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/igmndbyg1kk5idxq51owilllbdb9uef.jpg",
      "alt": "库珀"
    },
    "蓝鳃鱼": {
      "id": 108041,
      "nationality": 1,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/de/taswhmmku32v40d8a3ibaghd2lsn02e.jpg",
      "alt": "蓝鳃鱼"
    },
    "花月": {
      "id": 301821,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/p4p2hb8ceu8ruuocmx2kdf30lbwarkd.jpg",
      "alt": "花月"
    },
    "长波": {
      "id": 301831,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/3li330fx36d7tkx48edqmtxj2s893l4.jpg",
      "alt": "长波"
    },
    "小声望": {
      "id": 204041,
      "nationality": 2,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7c/eel30e46do93yc5dodvx6v09d2vxxl8.jpg",
      "alt": "小声望"
    },
    "塔尔图": {
      "id": 901021,
      "nationality": 9,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cf/mnqj24y9aypd3wzd9muelqz2556xvl0.jpg",
      "alt": "塔尔图"
    },
    "拉·加利索尼埃": {
      "id": 902011,
      "nationality": 9,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/82/iosmmx5bv2wjdiqo5tq61md9gyqnvk6.jpg",
      "alt": "拉·加利索尼埃"
    },
    "沃克兰": {
      "id": 901031,
      "nationality": 9,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/j7dsjvn14oc9gmqxw5gq0rk3657n1xc.jpg",
      "alt": "沃克兰"
    },
    "贝亚恩": {
      "id": 807011,
      "nationality": 8,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/4h7253e34udralauzhbik4b5ljl21q2.jpg",
      "alt": "贝亚恩"
    },
    "小光辉": {
      "id": 207091,
      "nationality": 2,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/5a07zcsbhub9rkc5l3ffewfchr01h3p.jpg",
      "alt": "小光辉"
    },
    "爱斯基摩人": {
      "id": 201321,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/c9812taoof2de2dtzzpr5bsdg9hkszl.jpg",
      "alt": "爱斯基摩人"
    },
    "英勇": {
      "id": 205101,
      "nationality": 2,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b9/1pvf582nrrz84du8eusz613ovpvfj3f.jpg",
      "alt": "英勇"
    },
    "伊卡洛斯": {
      "id": 201331,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6f/mhzujfbps0e0yt64gwp0loz1m5ohidc.jpg",
      "alt": "伊卡洛斯"
    },
    "Z26": {
      "id": 401261,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/6fuko7m43ummscpkvk4iss9awsved79.jpg",
      "alt": "Z26"
    },
    "熊野": {
      "id": 303181,
      "nationality": 3,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/4ver9azci24joiv1lmreljlfgp7oedb.jpg",
      "alt": "熊野"
    },
    "千岁": {
      "id": 306081,
      "nationality": 3,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f0/f4clxy0lhaliq1fuwx53y6leyf8gosp.jpg",
      "alt": "千岁"
    },
    "千代田": {
      "id": 306091,
      "nationality": 3,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/87/616yfbimms450xavn8u0gfmtrzpfdud.jpg",
      "alt": "千代田"
    },
    "樫野": {
      "id": 319011,
      "nationality": 3,
      "type": 19,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a3/a20w70dzqe2drmrgm8chmpthck1qbcq.jpg",
      "alt": "樫野"
    },
    "普林斯顿": {
      "id": 107231,
      "nationality": 1,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/8v3h36x7mkymo0zfga9r420ogaehdf5.jpg",
      "alt": "普林斯顿"
    },
    "大青花鱼(μ兵装)": {
      "id": 108051,
      "nationality": 1,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c0/gkl7xx8udzpsjlzx2xlgc3vlp5mdsii.jpg",
      "alt": "大青花鱼(μ兵装)"
    },
    "巴尔的摩(μ兵装)": {
      "id": 103251,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e3/i5vlhr5660z32utabkvayfj1pjhdajs.jpg",
      "alt": "巴尔的摩(μ兵装)"
    },
    "威悉": {
      "id": 406011,
      "nationality": 4,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1a/2t4xsvz9xydv4t9fbq9fd5pipoiuk2d.jpg",
      "alt": "威悉"
    },
    "纽伦堡": {
      "id": 402051,
      "nationality": 4,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2e/rxr55rduxj37rc7klmbz8q8nmwqbice.jpg",
      "alt": "纽伦堡"
    },
    "Z24": {
      "id": 401241,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e2/p7f1269d4fl1em1vvu9z5xyvgrsmldp.jpg",
      "alt": "Z24"
    },
    "Z28": {
      "id": 401281,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5a/ifs223t7tslm1scjqne4nxsnbihqjts.jpg",
      "alt": "Z28"
    },
    "文琴佐·焦贝蒂": {
      "id": 601031,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f3/g0vfw9j7drivnz6q74m07uuq1nf39c8.jpg",
      "alt": "文琴佐·焦贝蒂"
    },
    "神速": {
      "id": 701061,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a1/ggo4lr09xf8vlowjl8sxdx7r5unwd0s.jpg",
      "alt": "神速"
    },
    "U-410": {
      "id": 408111,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/gpbqgw7hw9han4qyddwx3yepldlxs00.jpg",
      "alt": "U-410"
    },
    "应瑞": {
      "id": 502041,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/40/q23m59qykz6z0efo1homda4xqi2vf3h.jpg",
      "alt": "应瑞"
    },
    "肇和": {
      "id": 502051,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e6/rhhuaekmsdeg3dlonvndiao3uqhjv8m.jpg",
      "alt": "肇和"
    },
    "佩内洛珀": {
      "id": 202291,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/b3437kykil3xaj0hqx9ar3xb1yple7j.jpg",
      "alt": "佩内洛珀"
    },
    "雷鸣": {
      "id": 701071,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f2/ildm9tn1ee41yr2bc2udv814a59qi4d.jpg",
      "alt": "雷鸣"
    },
    "摩尔曼斯克": {
      "id": 702061,
      "nationality": 7,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/af/spnh75sfav24611064faraid6n77n27.jpg",
      "alt": "摩尔曼斯克"
    },
    "洪亮": {
      "id": 701081,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c0/g5blkn0zq9seqfwimial0rmvyduvehj.jpg",
      "alt": "洪亮"
    },
    "托里拆利": {
      "id": 608011,
      "nationality": 6,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/53/hmfqte1m55e0waltic4a0xbouorm8c1.jpg",
      "alt": "托里拆利"
    },
    "西北风": {
      "id": 601041,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/71/1y8ptyoc9l61oin1a8jdkrs48g2hnge.jpg",
      "alt": "西北风"
    },
    "西南风": {
      "id": 601051,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/55/for72c7n073igypr5x70sxm9jvchlnk.jpg",
      "alt": "西南风"
    },
    "尼科洛索·达雷科": {
      "id": 601061,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/04/q0snfa2gmuam1tvb46f33k3y333h15l.jpg",
      "alt": "尼科洛索·达雷科"
    },
    "史蒂芬·波特": {
      "id": 101461,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b0/17kaeiax5v1og82cv2lqe9ior9db74t.jpg",
      "alt": "史蒂芬·波特"
    },
    "小天城": {
      "id": 304071,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bb/dm4fr8rpi1ji3rjt5xlhpcfv2bykla6.jpg",
      "alt": "小天城"
    },
    "博伊西": {
      "id": 102291,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f7/elpr5hj4bmobyxb8fc4xwqrfhuo4abg.jpg",
      "alt": "博伊西"
    },
    "莫里森": {
      "id": 101471,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/74/oc5pf89bo9njfjwy2mfs9z7fayogix2.jpg",
      "alt": "莫里森"
    },
    "小企业": {
      "id": 107991,
      "nationality": 1,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/27/34qufvwkwdqn70k13l2eozlp6flvtci.jpg",
      "alt": "小企业"
    },
    "鹦鹉螺": {
      "id": 108071,
      "nationality": 1,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/hjj7p5dwg47wjotbvj721pxzgz4mbj2.jpg",
      "alt": "鹦鹉螺"
    },
    "马耶·布雷泽": {
      "id": 801081,
      "nationality": 8,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/05/r2i4ihpjkzz22jz95x5oy3tf38tjzbf.jpg",
      "alt": "马耶·布雷泽"
    },
    "福煦": {
      "id": 903011,
      "nationality": 9,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/ohmwj9xc2lohro907eq10a48njg0tbg.jpg",
      "alt": "福煦"
    },
    "易北": {
      "id": 406021,
      "nationality": 4,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8f/dhs09fww1o85306hhq4tatsk5j456i3.jpg",
      "alt": "易北"
    },
    "U-1206": {
      "id": 408121,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7b/cbvl9axccjwrl1u2rp5e84oxajvyfeu.jpg",
      "alt": "U-1206"
    },
    "海天": {
      "id": 502071,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/8bpwpg7lk0fz99gznjusqw0867pb910.jpg",
      "alt": "海天"
    },
    "海圻": {
      "id": 502081,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7e/0uwhodwvufxzr8jegcdneyfzcwuh7zy.jpg",
      "alt": "海圻"
    },
    "镇海": {
      "id": 506011,
      "nationality": 5,
      "type": 6,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9d/6whbb99odze03lrh2bq59ae439ajsxi.jpg",
      "alt": "镇海"
    },
    "阿尔汉格尔斯克": {
      "id": 705061,
      "nationality": 7,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/df/ek8cx98c8oxinoq9ic69rx2eymcvgut.jpg",
      "alt": "阿尔汉格尔斯克"
    },
    "灵敏": {
      "id": 701091,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f8/olv0j3783b8o8adw3dgp25evod6yhho.jpg",
      "alt": "灵敏"
    },
    "的里雅斯特": {
      "id": 603041,
      "nationality": 6,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/63/0dy4l2rkf3u0bd709yz3pa02uthedjp.jpg",
      "alt": "的里雅斯特"
    },
    "图林根": {
      "id": 405041,
      "nationality": 4,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a9/i3tkbmhjgr5dge068jgjxxp8hlh7dz7.jpg",
      "alt": "图林根"
    },
    "约克DE": {
      "id": 403111,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/69/b0pt7y2wetyeqtfqpnv5lkg5n4qr77f.jpg",
      "alt": "约克DE"
    },
    "埃尔宾": {
      "id": 402081,
      "nationality": 4,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/49/thp73d8xwua4q4mfrj2ldackqwsxr8j.jpg",
      "alt": "埃尔宾"
    },
    "小欧根": {
      "id": 403121,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/47/lh4wk932urlqrzhdea1jmp84a4ioi9f.jpg",
      "alt": "小欧根"
    },
    "司战女神": {
      "id": 202311,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/51/muiikqxqjiix1olc17e1w8fomdwgfeb.jpg",
      "alt": "司战女神"
    },
    "小柴郡": {
      "id": 203101,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0e/rtmv3x9ky41cguwffkxr9zktqvz3ox2.jpg",
      "alt": "小柴郡"
    },
    "复仇": {
      "id": 205111,
      "nationality": 2,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c8/ch4yoatm3fh5pw1xjfegf8wo1d7wtxe.jpg",
      "alt": "复仇"
    },
    "进取": {
      "id": 202321,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6c/l6jqi4t8ibpk4gy8a23yti6wtdvflqc.jpg",
      "alt": "进取"
    },
    "博尔扎诺": {
      "id": 603051,
      "nationality": 6,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/pggzccf4lllbrwgx4eyfkw6xzuuog58.jpg",
      "alt": "博尔扎诺"
    },
    "阿尔弗雷多·奥里亚尼": {
      "id": 601081,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/36/fmg3bd4hn53bx9l0rz8wwy8vbrc4jj0.jpg",
      "alt": "阿尔弗雷多·奥里亚尼"
    },
    "埃曼努埃尔·佩萨格诺": {
      "id": 601091,
      "nationality": 6,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a1/i8jppsxyr8l1prcdwe4lrbs9eqfyicl.jpg",
      "alt": "埃曼努埃尔·佩萨格诺"
    },
    "Z16": {
      "id": 401161,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/ff/23oz3ihph9hf8ylpahldxaozfgmpem7.jpg",
      "alt": "Z16"
    },
    "小斯佩": {
      "id": 403131,
      "nationality": 4,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/59/gefnl94vqafhc6m4x1qdm3o3nzb8tc5.jpg",
      "alt": "小斯佩"
    },
    "兰利II": {
      "id": 107271,
      "nationality": 1,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/df/f3cisvavb2fcgs8p7r2k8mb0rafecls.jpg",
      "alt": "兰利II"
    },
    "哈曼II": {
      "id": 101501,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/41/0yjak6qa25tdzrog7ugxbfg7j4vpuzt.jpg",
      "alt": "哈曼II"
    },
    "华甲": {
      "id": 506021,
      "nationality": 5,
      "type": 6,
      "rarity": 4,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2e/76dpl61t533191svg9or4u4r423bjnh.jpg",
      "alt": "华甲"
    },
    "定安": {
      "id": 519011,
      "nationality": 5,
      "type": 19,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/aa/8naux06py1uzpiq46evyd7a4z1yi44x.jpg",
      "alt": "定安"
    },
    "百眼巨人": {
      "id": 206021,
      "nationality": 2,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cd/d827jgs4jjnzed5vdyurqm6r0s1ctgq.jpg",
      "alt": "百眼巨人"
    },
    "英雄": {
      "id": 201361,
      "nationality": 2,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2f/3npjgo2g52ndjaal5la96vqmieu18bw.jpg",
      "alt": "英雄"
    },
    "塞瓦斯托波尔": {
      "id": 705071,
      "nationality": 7,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ca/6t0iwx1fy9jddsrcpj7198gz6ra4x66.jpg",
      "alt": "塞瓦斯托波尔"
    },
    "小可畏": {
      "id": 207131,
      "nationality": 2,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/12/gemkkfesafwcqmr4d5x1xz0rj2wbi5n.jpg",
      "alt": "小可畏"
    },
    "亚德": {
      "id": 406031,
      "nationality": 4,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7d/auewsrxbk0mto2mypbeh2cgzdmbquki.jpg",
      "alt": "亚德"
    },
    "小大凤": {
      "id": 307131,
      "nationality": 3,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/dc/n73n5mslkacdedndcnomq6t49z199iu.jpg",
      "alt": "小大凤"
    },
    "安德烈亚·多利亚": {
      "id": 605071,
      "nationality": 6,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/4vu8wpqynfty2o77vi7x6ecpqtxj94v.jpg",
      "alt": "安德烈亚·多利亚"
    },
    "絮弗伦": {
      "id": 803011,
      "nationality": 8,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7a/je04y5f5dt05yxyx5nqdwy0ur8tcdsl.jpg",
      "alt": "絮弗伦"
    },
    "凯尔圣": {
      "id": 901041,
      "nationality": 9,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d3/ntoapqdxadpzxcvf08omdkkufp95k4d.jpg",
      "alt": "凯尔圣"
    },
    "里昂": {
      "id": 805021,
      "nationality": 8,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/tpkj2xlf0c3k08egsj5bh7c7hrl2di9.jpg",
      "alt": "里昂"
    },
    "朝凪": {
      "id": 301901,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a4/g6zcagw10h319vw7xw920n65k6gm28o.jpg",
      "alt": "朝凪"
    },
    "加里冒险号": {
      "id": 9600061,
      "nationality": 96,
      "type": 23,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bc/ns8wd9a39s0nazoxo3e6zqxgzl2zaxy.jpg",
      "alt": "加里冒险号"
    },
    "维达号": {
      "id": 9600051,
      "nationality": 96,
      "type": 22,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8e/i6v2rvwzzdw2dizhema4e83ne53pv9u.jpg",
      "alt": "维达号"
    },
    "圣哈辛托": {
      "id": 107301,
      "nationality": 1,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b8/7zdt61dj8za4bkux6u8pnogr7tjqmjd.jpg",
      "alt": "圣哈辛托"
    },
    "路易斯维尔": {
      "id": 103271,
      "nationality": 1,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3f/9a1y03h7kuk9o617xesddirp7m49aq0.jpg",
      "alt": "路易斯维尔"
    },
    "济安": {
      "id": 502091,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c5/jzt62s3bbu075pyf4sc13mrq7s0bdkj.jpg",
      "alt": "济安"
    },
    "龙武": {
      "id": 501051,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/00/1bs52cu0e2ve6b436kthsdktpf9b4u6.jpg",
      "alt": "龙武"
    },
    "虎贲": {
      "id": 501061,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/5vm6l77we161mmx7wlpy9up86ibq88g.jpg",
      "alt": "虎贲"
    },
    "飞云": {
      "id": 501071,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5a/cvhhiw912jp43x559kcz45k24rxh56k.jpg",
      "alt": "飞云"
    },
    "凶猛": {
      "id": 701121,
      "nationality": 7,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/00/n0z9ztd9kt7gq91ddut8ajggda1782u.jpg",
      "alt": "凶猛"
    },
    "波尔塔瓦": {
      "id": 705081,
      "nationality": 7,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6b/a5h2prixa6v65k87334ugqw10b31mxs.jpg",
      "alt": "波尔塔瓦"
    },
    "利物浦": {
      "id": 202341,
      "nationality": 2,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/44/73rrlrp8ogxvcogg5zoudoq1gj77pq6.jpg",
      "alt": "利物浦"
    },
    "德文郡": {
      "id": 203131,
      "nationality": 2,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2f/594bk8cd7oodh5b6q39mdpfabp8p7ld.jpg",
      "alt": "德文郡"
    },
    "金刚(μ兵装)": {
      "id": 304081,
      "nationality": 3,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/fcwud2okok0f4jdq2ere9f7a6lkjy02.jpg",
      "alt": "金刚(μ兵装)"
    },
    "鲁莽(μ兵装)": {
      "id": 801091,
      "nationality": 8,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/28/cjrdt5c8sl1fl1l3amwgpca2dh7do61.jpg",
      "alt": "鲁莽(μ兵装)"
    },
    "博伊西(μ兵装)": {
      "id": 102321,
      "nationality": 1,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5f/hda8afhpvn8io53kyf20ck4athodmgn.jpg",
      "alt": "博伊西(μ兵装)"
    },
    "小信浓": {
      "id": 307141,
      "nationality": 3,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/se70fvw8j5v127q28oujg19rv1iuxxe.jpg",
      "alt": "小信浓"
    },
    "花剑": {
      "id": 901051,
      "nationality": 9,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/05/j5ampb3ki44k1civ34nsw6y34s6te3m.jpg",
      "alt": "花剑"
    },
    "重剑": {
      "id": 901061,
      "nationality": 9,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a6/e2ej7trea8grsc8zkhl3c7f9oq5mulv.jpg",
      "alt": "重剑"
    },
    "小腓特烈": {
      "id": 405061,
      "nationality": 4,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cc/o415l7nmuu34iueq62v4e9na8z3wp9y.jpg",
      "alt": "小腓特烈"
    },
    "U-31": {
      "id": 408131,
      "nationality": 4,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/iktad8pwuxuxvpycx1wyc9il2w8npk9.jpg",
      "alt": "U-31"
    },
    "Z43": {
      "id": 401431,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/84/2rchm42k0zv0f1ut0yjob2lczmis28z.jpg",
      "alt": "Z43"
    },
    "迪普莱克斯": {
      "id": 903031,
      "nationality": 9,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/35/g92lm2aw9d6iia8luyc575owu7aclfv.jpg",
      "alt": "迪普莱克斯"
    },
    "鲱鱼": {
      "id": 108091,
      "nationality": 1,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/ff/f17epi6zxnk4e75d2dku0z3tfabf4b9.jpg",
      "alt": "鲱鱼"
    },
    "贝尔": {
      "id": 101521,
      "nationality": 1,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/dc/0bkk1mm6ba2l01gn4o1r4djdutqy5lu.jpg",
      "alt": "贝尔"
    },
    "绫濑": {
      "id": 302261,
      "nationality": 3,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d7/514tuhczpv8nslz08tlpopuv1wjpegp.jpg",
      "alt": "绫濑"
    },
    "凉波": {
      "id": 301911,
      "nationality": 3,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5f/f23yah1sztjqmnosikhsm2mmg9njd6j.jpg",
      "alt": "凉波"
    },
    "朴茨茅斯冒险号": {
      "id": 9600101,
      "nationality": 96,
      "type": 23,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/53t8x0lngp4a4yx4i3935cp3rymt91a.jpg",
      "alt": "朴茨茅斯冒险号"
    },
    "海豚号": {
      "id": 9600111,
      "nationality": 96,
      "type": 22,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/otrfujpnphx0c3dmqpwhqfdw2jemnty.jpg",
      "alt": "海豚号"
    },
    "Z9": {
      "id": 401091,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/49/3i6t0az4z4jwis3a12q1qpqgx9bvf3j.jpg",
      "alt": "Z9"
    },
    "Z11": {
      "id": 401111,
      "nationality": 4,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/eybzy7ymypfv4v8ihn8s1jcol9tkb78.jpg",
      "alt": "Z11"
    },
    "海容": {
      "id": 502101,
      "nationality": 5,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/33/nl2aur6mu6857geb2uzy8r37cqyqpyt.jpg",
      "alt": "海容"
    },
    "长风": {
      "id": 501081,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e9/etj5wb2jsrjadil0r2mjtct6avwtwkd.jpg",
      "alt": "长风"
    },
    "伏波": {
      "id": 501091,
      "nationality": 5,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ee/qt4hqvtqllxo9i12qpxwvef4iylmxje.jpg",
      "alt": "伏波"
    },
    "涅普顿": {
      "id": 10100011,
      "nationality": 101,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9a/jbkkwywb39ana4b0kzq4x9dll75zo26.jpg",
      "alt": "涅普顿"
    },
    "诺瓦露": {
      "id": 10100021,
      "nationality": 101,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1a/t1vnlpngjb21m9fipaqowa92immrora.jpg",
      "alt": "诺瓦露"
    },
    "布兰": {
      "id": 10100031,
      "nationality": 101,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/gg62bgoun95bwa0a2z6pocn7zfeg807.jpg",
      "alt": "布兰"
    },
    "贝露": {
      "id": 10100041,
      "nationality": 101,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/79/efb66e6as1he8rctsv9gjtuynvw5k3f.jpg",
      "alt": "贝露"
    },
    "乌璐露": {
      "id": 10300041,
      "nationality": 103,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c7/s3u02azda8w0zl2wx6dbtphrzjan4my.jpg",
      "alt": "乌璐露"
    },
    "萨拉娜": {
      "id": 10300051,
      "nationality": 103,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/krt5idsv6bh3cp2jmog6lp5pdy6fysi.jpg",
      "alt": "萨拉娜"
    },
    "芙米露露": {
      "id": 10300061,
      "nationality": 103,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7a/2dou13la91c4ym0ntuxcyjesvjbrn89.jpg",
      "alt": "芙米露露"
    },
    "绊爱": {
      "id": 10400011,
      "nationality": 104,
      "type": 1,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/bf/0dajqwvkpt6g1gywt8qgyrkabfa3l56.jpg",
      "alt": "绊爱"
    },
    "凪咲": {
      "id": 10600051,
      "nationality": 106,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/6jr68mlo7u9uz30oj6dkk2ry3brxb6n.jpg",
      "alt": "凪咲"
    },
    "女天狗": {
      "id": 10600061,
      "nationality": 106,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/4/42/3cqtxr1g1py8rg3ttx7oypnsxwkzi47.jpg",
      "alt": "女天狗"
    },
    "莫妮卡": {
      "id": 10600071,
      "nationality": 106,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b3/31x52owxzjtq76xnh31itfqd1h1jxv1.jpg",
      "alt": "莫妮卡"
    },
    "秋月律子": {
      "id": 10700051,
      "nationality": 107,
      "type": 19,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/bzesztp32h17bb12phyg2ba3tm60xts.jpg",
      "alt": "秋月律子"
    },
    "双海亚美": {
      "id": 10700061,
      "nationality": 107,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/dfuw32072jj83fjnel3c3jzu2rhbwj0.jpg",
      "alt": "双海亚美"
    },
    "双海真美": {
      "id": 10700071,
      "nationality": 107,
      "type": 8,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/12/eyjv2t2mrdvdv25sexm730fpbuucviz.jpg",
      "alt": "双海真美"
    },
    "莲SSSS": {
      "id": 10800031,
      "nationality": 108,
      "type": 2,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ec/j45ie8wbryu5pnaccc0xpzyvpmr580g.jpg",
      "alt": "莲SSSS"
    },
    "奈美子": {
      "id": 10800041,
      "nationality": 108,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/76/p43k583d77hz0z7ot99bixaqibw8a6z.jpg",
      "alt": "奈美子"
    },
    "貉SSSS": {
      "id": 10800071,
      "nationality": 108,
      "type": 5,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/s8sn1kqg7a0qcmdtztd4diisqcvd0t7.jpg",
      "alt": "貉SSSS"
    },
    "莉拉·德西亚斯": {
      "id": 10900041,
      "nationality": 109,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/13/ha6gf91v2spp0q6404v291g1onkatss.jpg",
      "alt": "莉拉·德西亚斯"
    },
    "赛莉·古劳斯": {
      "id": 10900051,
      "nationality": 109,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0e/9snnqnefwkp8i94brelymhqcpxm0gul.jpg",
      "alt": "赛莉·古劳斯"
    },
    "紫": {
      "id": 11000061,
      "nationality": 110,
      "type": 6,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/54/hlkijb5vkuxt7yfslcltxresmwwaa56.jpg",
      "alt": "紫"
    },
    "夕烧": {
      "id": 11000071,
      "nationality": 110,
      "type": 3,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/9f/misb9zj9belcto94nlv3lh66251d150.jpg",
      "alt": "夕烧"
    },
    "西连寺春菜": {
      "id": 11100051,
      "nationality": 111,
      "type": 4,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/ld4a2rhosp0req7elabb1ow1n3vz7af.jpg",
      "alt": "西连寺春菜"
    },
    "古手川唯": {
      "id": 11100061,
      "nationality": 111,
      "type": 7,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c8/0aowf2913sikc25ku4oygvoxkl1ihfo.jpg",
      "alt": "古手川唯"
    },
    "扶桑·META": {
      "id": 9705011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d7/s4ybfbxogmur8hhtgceni5fvr5ypj0y.jpg",
      "alt": "扶桑·META"
    },
    "飞鹰·META": {
      "id": 9706011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d8/s5i2h6uxhygxe820utc6jjslu933dpu.jpg",
      "alt": "飞鹰·META"
    },
    "隼鹰·META": {
      "id": 9706021,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d9/fmrimnxv72cn3mr6o3pek6pwazbb04c.jpg",
      "alt": "隼鹰·META"
    },
    "山城·META": {
      "id": 9705021,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a5/qyv68y1bjvcvjoo5d289u5ed4j2kv4u.jpg",
      "alt": "山城·META"
    },
    "孟菲斯·META": {
      "id": 9702021,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/a/a3/p9xcm1w7tgtf47sl68rf9jlud6ljldg.jpg",
      "alt": "孟菲斯·META"
    },
    "特伦托·META": {
      "id": 9703011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/8/86/fma4ewa0esxh3f84b8c89nuixn8tv3g.jpg",
      "alt": "特伦托·META"
    },
    "猎人·META": {
      "id": 9701011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7e/n48fmp53gp4yzpd2me66s0ysp2h0z3s.jpg",
      "alt": "猎人·META"
    },
    "命运女神·META": {
      "id": 9701021,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/17/cqdhz1bbhm3sfda9n6zoi9w72wzc9d2.jpg",
      "alt": "命运女神·META"
    },
    "谢菲尔德·META": {
      "id": 9702031,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/1shv5vuwimag78lzlldlwu1a4nzcf0q.jpg",
      "alt": "谢菲尔德·META"
    },
    "拉·加利索尼埃·META": {
      "id": 9702041,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/25/m1uwfvgpkt1u2xruom8okiisgi6zgub.jpg",
      "alt": "拉·加利索尼埃·META"
    },
    "女灶神·META": {
      "id": 9712011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fe/88at6nkpe36ntq4if91glvct9snskn4.jpg",
      "alt": "女灶神·META"
    },
    "旗风·META": {
      "id": 9701031,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/5/59/00xxm5bxn8q6zmx87u22i6i0txoubr8.jpg",
      "alt": "旗风·META"
    },
    "普林斯顿·META": {
      "id": 970603,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/90/e6s2kxe9w4nap7xh9m86i1994jpa1nm.jpg",
      "alt": "普林斯顿·META"
    },
    "黑暗界·META": {
      "id": 9713011,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/0/07/bbit06qoi75flxj4x8lkmo8pdu7hbqa.jpg",
      "alt": "黑暗界·META"
    },
    "金伯利·META": {
      "id": 9701041,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cf/oktcratruf2258dvfyk33hd2kx0hcrn.jpg",
      "alt": "金伯利·META"
    },
    "吸血鬼·META": {
      "id": 9701051,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/8efx56ev6686i14ck6mopm4wnotfc54.jpg",
      "alt": "吸血鬼·META"
    },
    "福煦·META": {
      "id": 9703031,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2e/cnonu5bb4sojjarl4nc0h846bx4oepz.jpg",
      "alt": "福煦·META"
    },
    "霞·META": {
      "id": 9701061,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/2/21/tgq3yrzcmidpmxe7u0l1thafxu1hrl6.jpg",
      "alt": "霞·META"
    },
    "凤翔·META": {
      "id": 9706041,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/0t2uytk7nenb41i6uchqi7nohqiadia.jpg",
      "alt": "凤翔·META"
    },
    "朱利奥·凯撒·META": {
      "id": 9705071,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/3/36/9nnmj6ry6uaixig1qzzd41pjuvsrzrm.jpg",
      "alt": "朱利奥·凯撒·META"
    },
    "博尔扎诺·META": {
      "id": 9703061,
      "nationality": 97,
      "type": 301,
      "rarity": 4,
      "src": "https://patchwiki.biligame.com/images/blhx/9/91/1h0jaq852iwzurne2b0x6k4qqkne016.jpg",
      "alt": "博尔扎诺·META"
    },
    "杜威": {
      "id": 101021,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/87/6w9v7k5cm6jgyij2gu4fwf4yc7v4pfe.jpg",
      "alt": "杜威"
    },
    "格里德利": {
      "id": 101051,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/15/gcmrdfamri46enq5ty5g7fqvkjzphsp.jpg",
      "alt": "格里德利"
    },
    "弗莱彻": {
      "id": 101091,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/0/08/p711fzn51wjkdkpe25ff87ek4rk0f27.jpg",
      "alt": "弗莱彻"
    },
    "撒切尔": {
      "id": 101121,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/89/fibq5pdsch95ntg5bukun3qvfgtoq2y.jpg",
      "alt": "撒切尔"
    },
    "本森": {
      "id": 101161,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e7/fpvgpcxyeu6ovlir8yqwi3tnj3b677t.jpg",
      "alt": "本森"
    },
    "西姆斯": {
      "id": 101241,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/41/5l7a9pamcou2ti0zkkjhaiaxinx3p0l.jpg",
      "alt": "西姆斯"
    },
    "哈曼": {
      "id": 101251,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/0/01/fyhd4dk9pdgu0wy4lv7y9vydvdo18op.jpg",
      "alt": "哈曼"
    },
    "布鲁克林": {
      "id": 102031,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/68/1zbgk29lzbsd9mpkt3y6s1zp94e43nr.jpg",
      "alt": "布鲁克林"
    },
    "菲尼克斯": {
      "id": 102041,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3f/m81p9982eaqxumbnfbl74zyeodm0snr.jpg",
      "alt": "菲尼克斯"
    },
    "亚特兰大": {
      "id": 102061,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/7oocg39g8i9duk991sd06mkrfx56f8b.jpg",
      "alt": "亚特兰大"
    },
    "朱诺": {
      "id": 102071,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d1/ek265odd9c4cicrnpikmeexp9makon3.jpg",
      "alt": "朱诺"
    },
    "北安普敦": {
      "id": 103031,
      "nationality": 1,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2d/cyu2dmn5hgst23n2582loyfiybud3n4.jpg",
      "alt": "北安普敦"
    },
    "芝加哥": {
      "id": 103041,
      "nationality": 1,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e0/s1tcllrx68i4zul6quqgxqce12179nv.jpg",
      "alt": "芝加哥"
    },
    "波特兰": {
      "id": 103061,
      "nationality": 1,
      "type": 3,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/gldccj0r2qj64m01fhliqcswg3anh8f.jpg",
      "alt": "波特兰"
    },
    "宾夕法尼亚": {
      "id": 105031,
      "nationality": 1,
      "type": 5,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/c/ce/1f0v9vxtqlu1fgbaanezf8xm4idm5yi.jpg",
      "alt": "宾夕法尼亚"
    },
    "田纳西": {
      "id": 105071,
      "nationality": 1,
      "type": 5,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/66/0xeaa416poh4gk5hjrxxs36uapuuml1.jpg",
      "alt": "田纳西"
    },
    "加利福尼亚": {
      "id": 105081,
      "nationality": 1,
      "type": 5,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0c/rkm3n4lzk9ksnlx3vwmxwenh95nt4kz.jpg",
      "alt": "加利福尼亚"
    },
    "长岛": {
      "id": 106011,
      "nationality": 1,
      "type": 6,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f9/ptbsm2ks4okxweguykgivkrtz481mxl.jpg",
      "alt": "长岛"
    },
    "胡蜂": {
      "id": 107081,
      "nationality": 1,
      "type": 7,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f1/96zx47yu4p3ulripdw4q8hnoak1xhdj.jpg",
      "alt": "胡蜂"
    },
    "女将": {
      "id": 201011,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/qz8g3ayzek5xgcwa77ay9wfm074qlgc.jpg",
      "alt": "女将"
    },
    "阿卡司塔": {
      "id": 201021,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/nhzzyp2zjf64ikqzle7jx9gra3sc3xk.jpg",
      "alt": "阿卡司塔"
    },
    "热心": {
      "id": 201031,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/20/92n8nulfnryfw3oeieplvi519acgl5z.jpg",
      "alt": "热心"
    },
    "命运女神": {
      "id": 201121,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e2/7rfhe8i8e0o9bckiv1zlqzudpxsuu4a.jpg",
      "alt": "命运女神"
    },
    "猎人": {
      "id": 201201,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/30/sof2el3k28azm2bw7e46o8225ay7w53.jpg",
      "alt": "猎人"
    },
    "天后": {
      "id": 201221,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/ft7grr8y34y6sijfq6m15spv50iy7gl.jpg",
      "alt": "天后"
    },
    "阿基里斯": {
      "id": 202021,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ef/3cnuuhq399njtedjqcfzydlydzp55n9.jpg",
      "alt": "阿基里斯"
    },
    "阿贾克斯": {
      "id": 202031,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4a/3to3mxpa3fspoij65ou6tjt373ivtoj.jpg",
      "alt": "阿贾克斯"
    },
    "南安普顿": {
      "id": 202071,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/3febj45jor1schfrgg7prde4s5g824g.jpg",
      "alt": "南安普顿"
    },
    "阿瑞托莎": {
      "id": 202131,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/a/aa/k6u78hru5q3nr2mrksjlzxrtcnp2kr9.jpg",
      "alt": "阿瑞托莎"
    },
    "加拉蒂亚": {
      "id": 202141,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e8/t8hctvqu0zduc3cn2q68916gua278bh.jpg",
      "alt": "加拉蒂亚"
    },
    "什罗普郡": {
      "id": 203021,
      "nationality": 2,
      "type": 3,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/88/bmkh3asc5awh38o6v6fe9e101aews5s.jpg",
      "alt": "什罗普郡"
    },
    "肯特": {
      "id": 203031,
      "nationality": 2,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4b/n8uy3kooc38rhq5w2tsl9roox6r7o6u.jpg",
      "alt": "肯特"
    },
    "萨福克": {
      "id": 203041,
      "nationality": 2,
      "type": 3,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/19/189o5bnpqxznv4t1tf7lo0jbi1i4z79.jpg",
      "alt": "萨福克"
    },
    "诺福克": {
      "id": 203051,
      "nationality": 2,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f6/hp6kr96o7wcvnzr5snl4j5kgn9ncukh.jpg",
      "alt": "诺福克"
    },
    "反击": {
      "id": 204021,
      "nationality": 2,
      "type": 4,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cb/ripd3yrs3ia18nf503hykqpb8nzhcq7.jpg",
      "alt": "反击"
    },
    "晓": {
      "id": 301091,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/2/27/ettzz3yvwq9oycgxtnicf5zidqpzaep.jpg",
      "alt": "晓"
    },
    "雷": {
      "id": 301111,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/39/8hbczmc6k4f4gu9kcjr02gq6i6wlj7j.jpg",
      "alt": "雷"
    },
    "电": {
      "id": 301121,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8b/1a2n3p9ne7drfx2x788qfvs1wa89e4o.jpg",
      "alt": "电"
    },
    "白露": {
      "id": 301131,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fd/sq0501qdelde0rs1khojn7isz2co6sf.jpg",
      "alt": "白露"
    },
    "阳炎": {
      "id": 301171,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/74/5u1mr5emeoywadl337ufmm9846sezmu.jpg",
      "alt": "阳炎"
    },
    "初春": {
      "id": 301211,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/91/g5ll9bfctplrjreyfj3r3oai6g0hkg0.jpg",
      "alt": "初春"
    },
    "若叶": {
      "id": 301231,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/81ig5thkh6go2i6c8o9mu5q9gdk1r35.jpg",
      "alt": "若叶"
    },
    "初霜": {
      "id": 301241,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5d/5037tkhrzkyed4qnzfigjyco6b5reh6.jpg",
      "alt": "初霜"
    },
    "有明": {
      "id": 301251,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2d/hs8oheec0bsmoo7iwc0587fv54qohep.jpg",
      "alt": "有明"
    },
    "夕暮": {
      "id": 301261,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ec/euc3367an5fl817gtfta1iyzmmw5hzf.jpg",
      "alt": "夕暮"
    },
    "黑潮": {
      "id": 301271,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b1/sgwkg7q2m064hoevsoirrtup9wlfdfe.jpg",
      "alt": "黑潮"
    },
    "亲潮": {
      "id": 301281,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/cg8h8ck9x8wyfsxnfw4d4zgxucmwf5i.jpg",
      "alt": "亲潮"
    },
    "五十铃": {
      "id": 302051,
      "nationality": 3,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/0/0a/2mnqndnkocci6ywbr8dgylvamhu1lsh.jpg",
      "alt": "五十铃"
    },
    "妙高": {
      "id": 303071,
      "nationality": 3,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5a/ip4i8zfv32djl2582f34mtc90p9tejl.jpg",
      "alt": "妙高"
    },
    "那智": {
      "id": 303081,
      "nationality": 3,
      "type": 3,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/45/m70iy4yayhvu126cr1s2b6gu76j2igo.jpg",
      "alt": "那智"
    },
    "扶桑": {
      "id": 305011,
      "nationality": 3,
      "type": 5,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/77/5r0m08w8dpci42t1rfstx6k92eg8u9e.jpg",
      "alt": "扶桑"
    },
    "山城": {
      "id": 305021,
      "nationality": 3,
      "type": 5,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/ff/7u3ns0ayt1nwob5gouhms97kcs3kdzu.jpg",
      "alt": "山城"
    },
    "伊势": {
      "id": 305031,
      "nationality": 3,
      "type": 5,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fa/q58fseky5hl6re0fcdu57cc3e9xf9i1.jpg",
      "alt": "伊势"
    },
    "日向": {
      "id": 305041,
      "nationality": 3,
      "type": 5,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5e/egac8y51gcewghu987s94xlk3siesfe.jpg",
      "alt": "日向"
    },
    "飞鹰": {
      "id": 306011,
      "nationality": 3,
      "type": 6,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/4/43/ah8h5g2fd4p66168qo0fd9wofw63j34.jpg",
      "alt": "飞鹰"
    },
    "隼鹰": {
      "id": 306021,
      "nationality": 3,
      "type": 6,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/mmz59olppzjm88bynh7vzlrklc1q4js.jpg",
      "alt": "隼鹰"
    },
    "祥凤": {
      "id": 306051,
      "nationality": 3,
      "type": 6,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/0/04/q5vkb2hsk65t2qovx56pb2836pitya7.jpg",
      "alt": "祥凤"
    },
    "莱比锡": {
      "id": 402041,
      "nationality": 4,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cb/lphbgnlz9wqobk13cr40zw426okkcmg.jpg",
      "alt": "莱比锡"
    },
    "贝利": {
      "id": 101271,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c5/fjet61en2a8d6s7auckiqsfvh3rvz18.jpg",
      "alt": "贝利"
    },
    "Z19": {
      "id": 401191,
      "nationality": 4,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/09ixv1s1id52gjm36lx9xp212cjxxuc.jpg",
      "alt": "Z19"
    },
    "神风": {
      "id": 301301,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/6/62/1qxl1iwjeqybvj08gah6dv573xwnz6t.jpg",
      "alt": "神风"
    },
    "松风": {
      "id": 301311,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/11/pqdx1eqqenz4xao9wa4agei56gs6nif.jpg",
      "alt": "松风"
    },
    "文月": {
      "id": 301381,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/0/05/dqmcemfjmdc8pv4gizkr03ywstcij7s.jpg",
      "alt": "文月"
    },
    "长月": {
      "id": 301391,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/d/d2/ly1w91024hh86jo6biqooe7avva7631.jpg",
      "alt": "长月"
    },
    "清波": {
      "id": 301541,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4d/dccqh1gtfpugti4d3nl86d39rd19vlm.jpg",
      "alt": "清波"
    },
    "拉德福特": {
      "id": 101291,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/8a/er3vo6gxs58thtl28e7fz4nwtlzr3tj.jpg",
      "alt": "拉德福特"
    },
    "杰金斯": {
      "id": 101301,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cc/ig9nthsesl2v0x38jt63tr50esnfysu.jpg",
      "alt": "杰金斯"
    },
    "火奴鲁鲁": {
      "id": 102121,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ea/rrdf47nwnjv1pgrm00ik8vhsomaklzz.jpg",
      "alt": "火奴鲁鲁"
    },
    "丘比特": {
      "id": 201241,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f4/5fzpcnzcgtbc2zdx9f11mf7gpy8b4b1.jpg",
      "alt": "丘比特"
    },
    "泽西": {
      "id": 201251,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b1/10n7v6p2gz77ck3y36ti918yqdyrj0p.jpg",
      "alt": "泽西"
    },
    "川内": {
      "id": 302121,
      "nationality": 3,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/4e/a4o5g80yg48prgjj3h8tsdyv9mrbkyh.jpg",
      "alt": "川内"
    },
    "那珂": {
      "id": 302141,
      "nationality": 3,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/5/55/0l5f6yfhft21xx7a4pgst4mtuzbyfwq.jpg",
      "alt": "那珂"
    },
    "浦风": {
      "id": 301591,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/2/27/t5rbyxtq4843a6g9a9pun66wrqp8uys.jpg",
      "alt": "浦风"
    },
    "矶风": {
      "id": 301601,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ac/h3sj0ltp3rv9yddkr8xqsp6d0jdp3re.jpg",
      "alt": "矶风"
    },
    "滨风": {
      "id": 301611,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c4/4qtolv7g5fgjan3pvmn48yq8v7k43j9.jpg",
      "alt": "滨风"
    },
    "谷风": {
      "id": 301621,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e5/qruqs8uc6v81dylxq4k4abugwdm1h79.jpg",
      "alt": "谷风"
    },
    "斐济": {
      "id": 202161,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c9/9rxuqw9sz4em90ma3652cj8ltjuoh6j.jpg",
      "alt": "斐济"
    },
    "牙买加": {
      "id": 202171,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/5/57/c869uym90i1x0fli0pzny4grfeookzt.jpg",
      "alt": "牙买加"
    },
    "朝潮": {
      "id": 301631,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/32/q0y2b1a7u2gvzuqiol4p39l4tlfj99v.jpg",
      "alt": "朝潮"
    },
    "大潮": {
      "id": 301641,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7c/g2ilq0wi3wlbeq80zdaplrz24v6q4xm.jpg",
      "alt": "大潮"
    },
    "满潮": {
      "id": 301651,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6e/066bdachuib5j7shdptbr9zaupck71o.jpg",
      "alt": "满潮"
    },
    "荒潮": {
      "id": 301661,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/5gegn9gyi3kubnx9vq6bw0v91hk4p57.jpg",
      "alt": "荒潮"
    },
    "苏塞克斯": {
      "id": 203091,
      "nationality": 2,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f3/5l6rwd3dub3y5ta6kac6eh5cnr5paz3.jpg",
      "alt": "苏塞克斯"
    },
    "Z18": {
      "id": 401181,
      "nationality": 4,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/7/76/cqpy53qugvqgno51ku362wy5ojdsxva.jpg",
      "alt": "Z18"
    },
    "福尔班": {
      "id": 801021,
      "nationality": 8,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e8/idzshnrnfpbl8ft7exekhhio8qw9xx6.jpg",
      "alt": "福尔班"
    },
    "勒马尔": {
      "id": 901011,
      "nationality": 9,
      "type": 1,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/27flzx1f7gqwy4xxgelri9z6xdlid3z.jpg",
      "alt": "勒马尔"
    },
    "布什": {
      "id": 101331,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/7/78/hvhuw2z8ne9jo3xf1jcz4q2qr3f4tfv.jpg",
      "alt": "布什"
    },
    "孟菲斯": {
      "id": 102161,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/65/8roa0xtl3bb1qqd2ajhkhpsz9up20mk.jpg",
      "alt": "孟菲斯"
    },
    "纽卡斯尔": {
      "id": 202191,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1e/h24hs3e0xt56qpvc6n49qeokzgd5vcd.jpg",
      "alt": "纽卡斯尔"
    },
    "霍比": {
      "id": 101361,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/0/06/hjg8p84owkfbg9gk370rgdipr4k8u5w.jpg",
      "alt": "霍比"
    },
    "科尔克": {
      "id": 101371,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/3/36/66kjg3ts2ewbt016fjyokghht3ntun2.jpg",
      "alt": "科尔克"
    },
    "黑泽伍德": {
      "id": 101341,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/10/ci2eh5dq93y72lv6coodq42y6gtsb3m.jpg",
      "alt": "黑泽伍德"
    },
    "康克德": {
      "id": 102181,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/hd332b9ds6q9up5pwyfngfkabr6etee.jpg",
      "alt": "康克德"
    },
    "旗风": {
      "id": 301791,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/d/db/1ohbm59escmb81vgc701zcweo8f4dzv.jpg",
      "alt": "旗风"
    },
    "库拉索": {
      "id": 202211,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/6/65/48ni6hrimx5tx4l0tlaom0j3nu0oyxb.jpg",
      "alt": "库拉索"
    },
    "杓鹬": {
      "id": 202221,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/85/tibnxbzaujygrmf99rzxm2kjfxpmhwd.jpg",
      "alt": "杓鹬"
    },
    "金伯利": {
      "id": 101381,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6d/lort0821s2yaz41qqatcegclavw52hy.jpg",
      "alt": "金伯利"
    },
    "回声": {
      "id": 201291,
      "nationality": 2,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5b/2n0852uudk5xkrnpq1rk8zuqo9x0wsj.jpg",
      "alt": "回声"
    },
    "圣胡安": {
      "id": 102221,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/7/75/4vdgk29lwg9rl9y9k01heq0eegyfw38.jpg",
      "alt": "圣胡安"
    },
    "艾尔温": {
      "id": 101401,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fe/a8g2141k4fcmaolvzwx99cze3892ibm.jpg",
      "alt": "艾尔温"
    },
    "贝奇": {
      "id": 101351,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/14/08hivv43s51fkbx18bnkclzihdwsaax.jpg",
      "alt": "贝奇"
    },
    "斯坦利": {
      "id": 101411,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/83/97fj2jg4ftxhguzwxj067fyu472p9f2.jpg",
      "alt": "斯坦利"
    },
    "加富尔伯爵": {
      "id": 605051,
      "nationality": 6,
      "type": 5,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/6/63/8mywouof5xwmiocnpcv0iyfjfpl1xbu.jpg",
      "alt": "加富尔伯爵"
    },
    "特伦托": {
      "id": 603011,
      "nationality": 6,
      "type": 3,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/1/11/1nsw36n69olb602qi9nbdp4rha5ezbt.jpg",
      "alt": "特伦托"
    },
    "斯莫利": {
      "id": 101421,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ea/0pt80idzessrgem47sj3k2b720kznyy.jpg",
      "alt": "斯莫利"
    },
    "格拉斯哥": {
      "id": 202261,
      "nationality": 2,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/81/savqqplbujqyan766baiyeh94y3kvm3.jpg",
      "alt": "格拉斯哥"
    },
    "哈尔西·鲍威尔": {
      "id": 101431,
      "nationality": 1,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f7/axvssaptduuo8sqejnhzlu81viyqjnx.jpg",
      "alt": "哈尔西·鲍威尔"
    },
    "卡萨布兰卡": {
      "id": 106551,
      "nationality": 1,
      "type": 6,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/4/40/0f5yq0w9258xdr1dqibr0pyfl6je1nx.jpg",
      "alt": "卡萨布兰卡"
    },
    "马布尔黑德": {
      "id": 102271,
      "nationality": 1,
      "type": 2,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b6/lq6fn9k9n5pt8wacpoizwetndr5nkwp.jpg",
      "alt": "马布尔黑德"
    },
    "追风": {
      "id": 301851,
      "nationality": 3,
      "type": 1,
      "rarity": 3,
      "src": "https://patchwiki.biligame.com/images/blhx/8/85/3hx2hdkj46wjt5ktpr7j2z2dj7jkou7.jpg",
      "alt": "追风"
    },
    "卡辛": {
      "id": 101031,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/26/2bb3knkqsjcvbsz5wq5m2d9slneryf7.jpg",
      "alt": "卡辛"
    },
    "唐斯": {
      "id": 101041,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ab/q6vuc46x2m60x1zzuivu0cxd537qlq0.jpg",
      "alt": "唐斯"
    },
    "克雷文": {
      "id": 101061,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c0/k6vo9ijyltfdnjn4sha3reuoubmjwhi.jpg",
      "alt": "克雷文"
    },
    "麦考尔": {
      "id": 101071,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/a/ad/qwbznpqh2q94zanxedcijpl9i0iedxg.jpg",
      "alt": "麦考尔"
    },
    "奥利克": {
      "id": 101131,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/9/94/759mr967piqors86rb7to9zb4x4n5qb.jpg",
      "alt": "奥利克"
    },
    "富特": {
      "id": 101141,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/3/38/p79w0qyev6njwfgg5g7e4xunmit5ue4.jpg",
      "alt": "富特"
    },
    "斯彭斯": {
      "id": 101151,
      "nationality": 1,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/d/dd/eqfya5mz31csfvu4u47dohmzijditlo.jpg",
      "alt": "斯彭斯"
    },
    "奥马哈": {
      "id": 102011,
      "nationality": 1,
      "type": 2,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/c/cf/kccftfpww2qjtgumaowe9ve21n4bvbo.jpg",
      "alt": "奥马哈"
    },
    "罗利": {
      "id": 102021,
      "nationality": 1,
      "type": 2,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f7/3o4tegfvuhzyub865i3dq66t4fnvzqg.jpg",
      "alt": "罗利"
    },
    "彭萨科拉": {
      "id": 103011,
      "nationality": 1,
      "type": 3,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/5/5d/7vrjw16su7alxnvchvi7v2yx6tm7ht2.jpg",
      "alt": "彭萨科拉"
    },
    "盐湖城": {
      "id": 103021,
      "nationality": 1,
      "type": 3,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/4/44/qmk18sknbcqjq66up9584h0pu1thpm5.jpg",
      "alt": "盐湖城"
    },
    "内华达": {
      "id": 105011,
      "nationality": 1,
      "type": 5,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/91/ga2vgie35dqm37cbfv97sugue4pusnf.jpg",
      "alt": "内华达"
    },
    "俄克拉荷马": {
      "id": 105021,
      "nationality": 1,
      "type": 5,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/c/c6/gvtfi9cj965gpsm4pgid7anp8prbv2y.jpg",
      "alt": "俄克拉荷马"
    },
    "博格": {
      "id": 106021,
      "nationality": 1,
      "type": 6,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/e/e4/iugqyi44ln4dh62zkvjpf8s17yhhimt.jpg",
      "alt": "博格"
    },
    "兰利": {
      "id": 107011,
      "nationality": 1,
      "type": 6,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2f/0kxp55upbgprwzpx9py07ymt6ck8165.jpg",
      "alt": "兰利"
    },
    "突击者": {
      "id": 107041,
      "nationality": 1,
      "type": 6,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7e/fqa18mjejkn6icnervy2gaeqrxdj919.jpg",
      "alt": "突击者"
    },
    "小猎兔犬": {
      "id": 201061,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/2/28/01feoevp2q7qgedo8mbhwvdgy7vcbu0.jpg",
      "alt": "小猎兔犬"
    },
    "大斗犬": {
      "id": 201071,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1a/hqu05d87mc31u2634ntpglr4yhtmrgb.jpg",
      "alt": "大斗犬"
    },
    "彗星": {
      "id": 201081,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/4/40/bknmhf5zesfm00gc23i0arx13eevf6o.jpg",
      "alt": "彗星"
    },
    "新月": {
      "id": 201091,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/f/f4/1ml2qet1o6npjrjj4iihzedsre2to02.jpg",
      "alt": "新月"
    },
    "小天鹅": {
      "id": 201101,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/99/r8s9cpsj9zecfou8monon7lx62c7ydd.jpg",
      "alt": "小天鹅"
    },
    "狐提": {
      "id": 201111,
      "nationality": 2,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/b/b1/ozkeorrlj3kazl9ujm1ky3nc7tciv1o.jpg",
      "alt": "狐提"
    },
    "利安得": {
      "id": 202011,
      "nationality": 2,
      "type": 2,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/94/lx7vzk54jqvb8nmati5pjtdjxu96k4s.jpg",
      "alt": "利安得"
    },
    "竞技神": {
      "id": 206011,
      "nationality": 2,
      "type": 6,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/9/98/px9e5bvha4wmigek7f106ej8sb3zf57.jpg",
      "alt": "竞技神"
    },
    "不知火": {
      "id": 301181,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/79/cwr2o2l7yix5gq1ptoq3f2dwazc6qdg.jpg",
      "alt": "不知火"
    },
    "长良": {
      "id": 302041,
      "nationality": 3,
      "type": 2,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/1/1c/18n8avhp6n3ak1e7v1yta5eejbrxnzs.jpg",
      "alt": "长良"
    },
    "阿武隈": {
      "id": 302091,
      "nationality": 3,
      "type": 2,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/6/68/f22dhwpwps8jpbmgvs1oioxhnro9nk2.jpg",
      "alt": "阿武隈"
    },
    "古鹰": {
      "id": 303011,
      "nationality": 3,
      "type": 3,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/5/52/n5d6swgn2qwk3oau3amzyh7zdshve4q.jpg",
      "alt": "古鹰"
    },
    "加古": {
      "id": 303021,
      "nationality": 3,
      "type": 3,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/0/09/15r8pzb9w5hoqfk0len9w4mez4qc0yi.jpg",
      "alt": "加古"
    },
    "青叶": {
      "id": 303031,
      "nationality": 3,
      "type": 3,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/6/6b/ngo3y1li80jl1t906wnnmx9r983pwww.jpg",
      "alt": "青叶"
    },
    "衣笠": {
      "id": 303041,
      "nationality": 3,
      "type": 3,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2d/pigw1liajop0lt4nzej7zjhgif1x9je.jpg",
      "alt": "衣笠"
    },
    "柯尼斯堡": {
      "id": 402011,
      "nationality": 4,
      "type": 2,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/9/93/2qcs00pd0lidbbmqsl41ep160cmuz5p.jpg",
      "alt": "柯尼斯堡"
    },
    "卡尔斯鲁厄": {
      "id": 402021,
      "nationality": 4,
      "type": 2,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/82/1ljz6v3iq6jf3lpkhtkfsuwgv09g3gv.jpg",
      "alt": "卡尔斯鲁厄"
    },
    "科隆": {
      "id": 402031,
      "nationality": 4,
      "type": 2,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/8/85/r5trvejccnoepkhs7scyxuvewkmtmcs.jpg",
      "alt": "科隆"
    },
    "Z20": {
      "id": 401201,
      "nationality": 4,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/6/60/j9p5tx8gm2mm2shlegis49twmdg7smr.jpg",
      "alt": "Z20"
    },
    "Z21": {
      "id": 401211,
      "nationality": 4,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/e/ec/0b50ejbaf2c9kz0a6izge1fnv2j9f36.jpg",
      "alt": "Z21"
    },
    "睦月": {
      "id": 301321,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/7/77/lgl6kqnuf0tkrlu56g6bt8v7q1nxjzg.jpg",
      "alt": "睦月"
    },
    "如月": {
      "id": 301331,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "transform": true,
      "src": "https://patchwiki.biligame.com/images/blhx/3/3d/a916hqhqwhmhosx1j34pscslg5g4331.jpg",
      "alt": "如月"
    },
    "卯月": {
      "id": 301351,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/7/7d/6y5l7is3qshohxixwvyktxinckjmtho.jpg",
      "alt": "卯月"
    },
    "水无月": {
      "id": 301371,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/2/2f/i5m4zzri6rbzvv0o3jvoyhdh92bxnx5.jpg",
      "alt": "水无月"
    },
    "三日月": {
      "id": 301411,
      "nationality": 3,
      "type": 1,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/3/37/j5pp3ysvjm91e11eq1126ar91l0pfhk.jpg",
      "alt": "三日月"
    },
    "里士满": {
      "id": 102111,
      "nationality": 1,
      "type": 2,
      "rarity": 2,
      "src": "https://patchwiki.biligame.com/images/blhx/f/fa/6n49rmfkcewiye8x6wovw201l6yl0c9.jpg",
      "alt": "里士满"
    }
  }

  // zl*
  // bz*
  ctx
    .command('alb', '碧蓝航线建造模拟器')
  // mrmf*
  ctx
    .command('alb.每日魔方')
    .action(async ({session}) => {
      await mrmf(session);
    });
  // ckjl*
  ctx
    .command('alb.抽卡记录')
    .action(async ({session}) => {
      await ckjl(session);
    });
  // sclphb*
  ctx
    .command('alb.收藏率排行榜', '')
    .action(async ({session}) => {
      await sclphb(session);
    });
  // qxc*
  ctx
    .command('alb.轻型池')
    .action(async ({session}) => {
      await handleShipBuildingList(session, cfg.LightShipBuilding, lightShipBuildingRarityConfig);
    });
  // zxc*
  ctx
    .command('alb.重型池')
    .action(async ({session}) => {
      await handleShipBuildingList(session, cfg.HeavyShipBuilding, heavySpecialShipBuildingRarityConfig);
    });
  // txc*
  ctx
    .command('alb.特型池')
    .action(async ({session}) => {
      await handleShipBuildingList(session, cfg.SpecialShipBuilding, specialShipBuildingRarityConfig);
    });
  // c*
  for (const key in buildConfigs) {
    if (buildConfigs.hasOwnProperty(key)) {
      const config = buildConfigs[key];
      ctx.command(config.command)
        .action(async ({session}, frequency = 1) => {
          await performBuild({
            session,
            frequency,
            type: config.type,
            cost: config.cost,
            buildType: config.buildType,
            shipBuilding: config.shipBuilding,
            getRarity: config.getRarity,
          });
        });
    }
  }

  // hs*
  async function sclphb(session: Session<never, never>) {
    const userBd: Building[] = await ctx.database.get('azur_lane_building', {});
    if (userBd.length === 0) {
      await sendMsg(session, `请先领取每日魔方！\n\n“${await getRandomShipLine(shipData)}”`);
      return;
    }

    const html = generateCollectionRateRanking(userBd);
    const buffer = await html2img(html);
    await sendMsg(session, h.image(buffer, 'image/png'));
  }

  async function ckjl(session: Session<never, never>) {
    const userBd = await ctx.database.get('azur_lane_building', {userId: session.userId});
    if (userBd.length === 0) {
      await sendMsg(session, `请先领取每日魔方！\n\n“${await getRandomShipLine(shipData)}”`);
      return;
    }
    const buildHistory = userBd[0].buildHistory;
    const buildStats = userBd[0].buildStats;
    const most = findMostFrequentShip(buildHistory);
    const html = await convertBuildStatsToHtml(buildStats, most, userBd[0]);
    const buffer = await html2img(html);
    await sendMsg(session, h.image(buffer, 'image/png'));
  }

  async function mrmf(session: Session<never, never>) {
    const timestamp = session.timestamp;
    const userBd = await ctx.database.get('azur_lane_building', {userId: session.userId});
    const cube = getDailyCubes();
    const userCube = userBd.length === 0 ? 0 : userBd[0].cube;
    if (userBd.length === 0) {
      await ctx.database.create('azur_lane_building', {
        userId: session.userId,
        username: session.username,
        cube,
        lastCheckInTimestamp: new Date(timestamp),
        buildHistory: [],
        buildStats: createDefaultBuildStats(),
        collectionRate: 0,
      });
    } else {
      const lastCheckInTimestamp = userBd[0].lastCheckInTimestamp;
      if (isSameDay(timestamp, lastCheckInTimestamp)) {
        await sendMsg(session, `今天已经领过了哦~\n\n“${await getRandomShipLine(shipData)}”`);
        return;
      }
      await ctx.database.set('azur_lane_building', {userId: session.userId}, {
        username: session.username,
        cube: userBd[0].cube + cube,
        lastCheckInTimestamp: new Date(timestamp),
      });
    }

    await sendMsg(session, `指挥官，欢迎回来！
快领走你的 ${cube} 魔方吧~
你现在有 ${userCube + cube} 块魔方啦！\n\n“${await getRandomShipLine(shipData)}”`);
  }

  function generateCollectionRateRanking(buildings: Building[]): string {
    const processedData = buildings
      .sort((a, b) => b.collectionRate - a.collectionRate)
      .slice(0, cfg.maxRank)
      .map((building, index) => ({
        rank: index + 1,
        username: building.username,
        collectionRate: building.collectionRate,
        cube: building.cube,
        buildHistory: building.buildHistory,
        lastCheckIn: building.lastCheckInTimestamp
      }));

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>收藏率排行榜</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .ranking-table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .ranking-table th, .ranking-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .ranking-table th {
            background-color: #4a90e2;
            color: white;
            font-weight: 500;
        }
        .ranking-table tr:hover {
            background-color: #f8f9fa;
        }
        .rank {
            font-weight: bold;
            color: #666;
        }
        .rank-1 { color: #ffd700; }
        .rank-2 { color: #c0c0c0; }
        .rank-3 { color: #cd7f32; }
        .collection-rate {
            font-weight: bold;
            color: #4a90e2;
        }
        .last-update {
            text-align: right;
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <h1>收藏率排行榜</h1>
    <table class="ranking-table">
        <thead>
            <tr>
                <th>排名</th>
                <th>用户名</th>
                <th>收藏率</th>
                <th>魔方数量</th>
                <th>最后签到时间</th>
            </tr>
        </thead>
        <tbody>
            ${processedData.map(item => `
                <tr>
                    <td><span class="rank ${item.rank <= 3 ? `rank-${item.rank}` : ''}">#${item.rank}</span></td>
                    <td>${item.username}</td>
                    <td><span class="collection-rate">${(item.collectionRate * 100).toFixed(2)}%（${countUniqueShipNames(item.buildHistory)}/${shipCount}）</span></td>
                    <td>${item.cube}</td>
                    <td>${item.lastCheckIn.toLocaleDateString('zh-CN')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <div class="last-update">
        最后更新时间: ${new Date().toLocaleString('zh-CN')}
    </div>
</body>
</html>`;

    return html;
  }

  async function convertBuildStatsToHtml(buildStats: BuildStats, mostFrequentShip: string, userBd: Building): Promise<string> {
    const formatNumber = (num: number): string => {
      return num.toLocaleString('zh-CN');
    };

    const generateTableRow = (label: string, rowData: BuildStatsRow): string => {
      return `
      <tr>
        <td class="label">${label}</td>
        <td class="number">${formatNumber(rowData[BuildType.Light])}</td>
        <td class="number">${formatNumber(rowData[BuildType.Heavy])}</td>
        <td class="number">${formatNumber(rowData[BuildType.Special])}</td>
        <td class="number total">${formatNumber(rowData.total)}</td>
      </tr>
    `;
    };

    const tableRows = Object.entries(buildStats)
      .filter(([key]) => key !== 'total')
      .map(([label, rowData]) => generateTableRow(label, rowData))
      .join('');

    const totalRow = generateTableRow('总计', buildStats.total);
    const avatarSrc = shipData[mostFrequentShip]?.src || await getShipAvatarUrl(mostFrequentShip) || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        .container {
          font-family: "Microsoft YaHei", sans-serif;
          max-width: 1000px;
          margin: 20px auto;
          padding: 20px;
        }
        .most-frequent {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        th, td {
          padding: 12px;
          text-align: center;
          border: 1px solid #ddd;
        }
        th {
          background-color: #4a89dc;
          color: white;
        }
        td.label {
          text-align: left;
          font-weight: bold;
          background-color: #f8f9fa;
        }
        td.number {
          font-family: Monaco, monospace;
        }
        td.total {
          background-color: #e8f4f8;
          font-weight: bold;
        }
        tr:last-child {
          background-color: #f0f8ff;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="most-frequent">
          <h3>⭐ 最常获得的舰船 ------------------- >  ${avatarSrc ? `<img src="${avatarSrc}" class="ship-avatar" alt="${mostFrequentShip}"/>` : ''}${mostFrequentShip}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>稀有度/舰船</th>
              <th>${BuildType.Light}</th>
              <th>${BuildType.Heavy}</th>
              <th>${BuildType.Special}</th>
              <th>总计</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            ${totalRow}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  }

  function createShipBuildingRarityConfig(probabilities: { [key: string]: number }): ShipBuildingConfig {
    const config: ShipBuildingConfig = {};
    for (const key in rarityDefinitions) {
      if (rarityDefinitions.hasOwnProperty(key)) {
        config[key] = {
          ...baseRarityConfig,
          ...rarityDefinitions[key as keyof typeof rarityDefinitions],
          probability: probabilities[key] || 0,
        };
      }
    }
    return config;
  }

  async function handleShipBuildingList(
    session: any,
    shipBuildingData: ShipRareList,
    rarityConfig: ShipBuildingConfig
  ) {
    const html = await generateShipBuildingContentHtml(shipBuildingData, rarityConfig);
    const buffer = await html2img(html);
    await sendMsg(session, h.image(buffer, 'image/png'));
  }

  function getLightRarity(rareProbability: number): { rarity: RarityOrShipName; probabilityIndex: number } {
    if (rareProbability < 0) {
      return {rarity: "海上传奇", probabilityIndex: 0};
    } else if (rareProbability < 70) {
      return {rarity: "超稀有", probabilityIndex: 1};
    } else if (rareProbability < 190) {
      return {rarity: "精锐", probabilityIndex: 2};
    } else if (rareProbability < 450) {
      return {rarity: "稀有", probabilityIndex: 3};
    } else {
      return {rarity: "普通", probabilityIndex: 4};
    }
  }

  function getHeavyAndSpecialRarity(rareProbability: number): { rarity: RarityOrShipName; probabilityIndex: number } {
    if (rareProbability < 12) {
      return {rarity: "海上传奇", probabilityIndex: 0};
    } else if (rareProbability < 82) {
      return {rarity: "超稀有", probabilityIndex: 1};
    } else if (rareProbability < 202) {
      return {rarity: "精锐", probabilityIndex: 2};
    } else if (rareProbability < 712) {
      return {rarity: "稀有", probabilityIndex: 3};
    } else {
      return {rarity: "普通", probabilityIndex: 4};
    }
  }

  async function performBuild(params: BuildParams) {
    const {session, frequency, type, cost, buildType, shipBuilding, getRarity} = params;

    if (frequency <= 0) {
      await sendMsg(session, `抽卡次数必须大于 0！\n\n“${await getRandomShipLine(shipData)}”`);
      return;
    }

    const userBd = await ctx.database.get('azur_lane_building', {userId: session.userId});
    if (userBd.length === 0) {
      await sendMsg(session, `请先领取每日魔方！\n\n“${await getRandomShipLine(shipData)}”`);
      return;
    }

    const cube = userBd[0].cube;
    const need = cost * frequency;

    if (cube < need) {
      await sendMsg(session, `当前拥有 ${cube} 块魔方\n${frequency} 抽${type}池需 ${need} 块魔方\n\n“${await getRandomShipLine(shipData)}”`);
      return;
    }

    const buildStats: any = userBd[0].buildStats;
    const buildHistory = userBd[0].buildHistory;
    let records = [];

    for (let i = 0; i < frequency; i++) {
      let rareProbability = Math.floor(Math.random() * 1000);
      let {rarity, probabilityIndex} = getRarity(rareProbability);

      const convert = {
        "海上传奇": "Legend",
        "超稀有": "SuperRare",
        "精锐": "Elite",
        "稀有": "Rare",
        "普通": "Normal",
      }
      buildStats[rarity][buildType] += 1;
      buildStats[rarity].total += 1;
      buildStats.total[buildType] += 1;
      buildStats.total.total += 1;

      const buildingList = shipBuilding[convert[rarity]].split('、');
      const whichShip = Math.floor(Math.random() * buildingList.length);
      const shipName = buildingList[whichShip].trim();

      const record: BuildRecord = {
        buildCount: buildHistory.length + 1,
        buildType: type,
        rarity,
        shipName,
        times: calculateTotalTimes(buildHistory, shipName) + 1,
      };

      records.push(record);
      buildHistory.push(record);
    }

    await ctx.database.set('azur_lane_building', {userId: session.userId}, {
      username: session.username,
      cube: cube - need,
      buildHistory,
      buildStats,
      collectionRate: countUniqueShipNames(buildHistory) / shipCount,
    });

    const html = formatBuildRecordsToHTML(records);
    const buffer = await html2img(html);
    await sendMsg(session, `${frequency} 抽${type}池消耗 ${need} 块魔方\n剩余 ${cube - need} 块魔方\n${h.image(buffer, 'image/png')}`);
  }

  function formatBuildRecordsToHTML(records: BuildRecord[]): string {
    const styles = `
    <style>
      .build-records {
        font-family: Arial, sans-serif;
        width: 100%;
        max-width: 1200px;
        margin: 20px auto;
        border-collapse: collapse;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      }
      .build-records th,
      .build-records td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .build-records th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      .build-records tr:hover {
        background-color: #f5f5f5;
      }
      .ship-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        vertical-align: middle;
        margin-right: 10px;
      }
      .rarity-SSR { color: #FFD700; }
      .rarity-SR { color: #C0C0C0; }
      .rarity-R { color: #CD7F32; }
      .rarity-N { color: #808080; }
    </style>
  `;

    const tableHeader = `
    <table class="build-records">
      <thead>
        <tr>
          <th>建造次数</th>
          <th>舰娘</th>
          <th>稀有度</th>
          <th>建造类型</th>
          <th>获取次数</th>
        </tr>
      </thead>
  `;

    const tableBody = records.map(record => {
      const avatarSrc = shipData[record.shipName]?.src || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';
      const rarityClass = `rarity-${record.rarity}`;

      return `
      <tr>
        <td>${record.buildCount}</td>
        <td>
          ${avatarSrc ? `<img src="${avatarSrc}" class="ship-avatar" alt="${record.shipName}"/>` : ''}
          ${record.shipName}
        </td>
        <td class="${rarityClass}">${record.rarity}</td>
        <td>${record.buildType}</td>
        <td>第 ${record.times} 次</td>
      </tr>
    `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>建造记录</title>
        ${styles}
      </head>
      <body>
        ${tableHeader}
        <tbody>
          ${tableBody}
        </tbody>
        </table>
      </body>
    </html>
  `;

    return html;
  }

  function countUniqueShipNames(records: BuildRecord[]): number {
    const uniqueShipNames = new Set<string>();

    for (const record of records) {
      const shipName = record.shipName;

      if (!uniqueShipNames.has(shipName)) {
        uniqueShipNames.add(shipName);
      }
    }

    return uniqueShipNames.size;
  }

  function countUniqueRoles(shipBuildingData): number {
    const allRoles = new Set<string>();

    function extractRoles(category: ShipRareList
      | undefined) {
      if (!category) {
        return;
      }
      for (const rarity of Object.values(category)) {
        if (rarity) {
          const roles = rarity.split('、');
          for (const role of roles) {
            allRoles.add(role.trim());
          }
        }
      }
    }

    extractRoles(shipBuildingData.LightShipBuilding);
    extractRoles(shipBuildingData.HeavyShipBuilding);
    extractRoles(shipBuildingData.SpecialShipBuilding);

    return allRoles.size;
  }

  function findMostFrequentShip(records: BuildRecord[]): string {
    const shipCountMap: Map<string, number> = new Map();

    for (const record of records) {
      const shipName = record.shipName;
      const times = record.times
      if (shipCountMap.has(shipName)) {
        shipCountMap.set(shipName, (shipCountMap.get(shipName) || 0) + times);
      } else {
        shipCountMap.set(shipName, times);
      }
    }

    let mostFrequentShip = "";
    let maxCount = 0;

    for (const [shipName, count] of shipCountMap) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentShip = shipName;
      }
    }

    return mostFrequentShip;
  }

  function calculateTotalTimes(records: BuildRecord[], shipName: string): number {
    if (!records || records.length === 0) {
      return 0;
    }

    const totalTimes = records.reduce((accumulator, currentRecord) => {
      if (currentRecord.shipName === shipName) {
        return accumulator + currentRecord.times;
      } else {
        return accumulator;
      }
    }, 0);

    return totalTimes;
  }

  async function html2img(html: string) {
    const page = await ctx.puppeteer.page()
    await page.setContent(html, {waitUntil: 'load'});
    await page.setViewport({width: 1000, height: 400});
    await page.bringToFront()
    const buffer = await page.screenshot({fullPage: true});
    await page.close();
    return buffer;
  }

  async function generateShipBuildingContentHtml(shipBuildingData: ShipRareList, rarityConfig: ShipBuildingConfig): Promise<string> {
    const rarityMap = {};

    for (const rarityKey in rarityConfig) {
      if (rarityConfig.hasOwnProperty(rarityKey)) {
        rarityMap[rarityKey] = {
          name: rarityConfig[rarityKey].name,
          textColor: rarityConfig[rarityKey].textColor,
          color: rarityConfig[rarityKey].color,
          probability: rarityConfig[rarityKey].probability,
          ships: [],
        };
      }
    }

    for (const rarityKey in shipBuildingData) {
      if (shipBuildingData.hasOwnProperty(rarityKey)) {
        const ships = shipBuildingData[rarityKey].split('、');
        rarityMap[rarityKey].ships = ships.map((ship: string) => ship.trim()).filter((ship: string) => ship !== ''); // 去除空字符串
      }
    }
    let html = `
<div style="background: linear-gradient(to bottom, #e0f2f7, #ffffff); padding: 10px; border-radius: 10px;">
    <div class="Root Pick">
      <table class="wikitable" style="width: 100%; text-align: center">
        <tbody>
          <tr>
    `;

    for (const rarityKey in rarityMap) {
      if (rarityMap.hasOwnProperty(rarityKey)) {
        const {name, color, probability} = rarityMap[rarityKey];
        const headerStyle = rarityKey === 'Legend'
          ? `background: ${color}; width: 20%;`
          : `background-color: ${color}; width: 20%;`;
        html += `<th style="${headerStyle}">${name} ${probability}%</th>`;
      }
    }

    html += `
          </tr>
          <tr>
    `;

    for (const rarityKey in rarityMap) {
      if (rarityMap.hasOwnProperty(rarityKey)) {
        html += `<td class="BuildingList" id="LightShipBuildingList${rarityKey}">`;
        for (const shipName of rarityMap[rarityKey].ships) {
          let src = shipData[shipName]?.src || await getShipAvatarUrl(shipName) || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';

          const alt = shipData[shipName] ? shipData[shipName].alt : shipName;

          html += `
              <span style="display: inline-block">
                <span class="xtb-image">
                  <img
                    alt="${alt}"
                    src="${src}"
                    style="width: 30px; height: 30px; box-shadow: 0 0 2px #000;
    border-radius: 7px;
    margin: 0 2px;"
                  />
                </span>
                <span style="color:${rarityMap[rarityKey].textColor}">${shipName}</span>
              </span>
            `;
        }
        html += `</td>`;
      }
    }

    const totals = {};
    for (const rarityKey in rarityMap) {
      if (rarityMap.hasOwnProperty(rarityKey)) {
        totals[rarityKey] = rarityMap[rarityKey].ships.length;
      }
    }
    const totalShips = Object.values(totals).reduce((acc: number, val: number) => acc + val, 0) as number;

    html += `
      </tr>
      <tr>`;

    for (const rarityKey in rarityMap) {
      if (rarityMap.hasOwnProperty(rarityKey)) {
        const {name, color} = rarityMap[rarityKey];
        const headerStyle = rarityKey === 'Legend'
          ? `background: ${color};`
          : `background-color: ${color};`;
        html += `<th style="${headerStyle}">总 ${totals[rarityKey]}艘</th>`;
      }
    }


    html += `</tr>
      <tr>`;
    for (const rarityKey in rarityMap) {
      if (rarityMap.hasOwnProperty(rarityKey)) {
        const {name, color, probability} = rarityMap[rarityKey];
        const headerStyle = rarityKey === 'Legend'
          ? `background: ${color};`
          : `background-color: ${color};`;

        const average = totals[rarityKey] > 0 ? parseFloat((probability / totals[rarityKey]).toFixed(4)).toString() : '0';
        html += `<th style="${headerStyle}">平均每艘 ${average}%</th>`;
      }
    }

    html += `
      </tr>
    </tbody>
  </table>
   </div>
</div>
`;

    return html;
  }

  function isSameDay(timestamp: number, lastStartTimestamp: Date): boolean {
    const date1 = new Date(timestamp);

    const year1 = date1.getFullYear();
    const month1 = date1.getMonth() + 1;
    const day1 = date1.getDate();

    const year2 = lastStartTimestamp.getFullYear();
    const month2 = lastStartTimestamp.getMonth() + 1;
    const day2 = lastStartTimestamp.getDate();

    return year1 === year2 && month1 === month2 && day1 === day2;
  }

  function createDefaultBuildStats() {
    const defaultBuildStatsRow: BuildStatsRow = {
      [BuildType.Light]: 0,
      [BuildType.Heavy]: 0,
      [BuildType.Special]: 0,
      total: 0,
    };

    const defaultBuildStats: BuildStats = {
      "海上传奇": {...defaultBuildStatsRow},
      "超稀有": {...defaultBuildStatsRow},
      "精锐": {...defaultBuildStatsRow},
      "稀有": {...defaultBuildStatsRow},
      "普通": {...defaultBuildStatsRow},
      total: {...defaultBuildStatsRow},
    };

    return defaultBuildStats
  }

  async function getShipAvatarUrl(shipName: string): Promise<string | null> {
    try {
      const url = `https://wiki.biligame.com/blhx/${encodeURIComponent(shipName)}`;

      const response = await fetch(url);

      if (!response.ok) {
        logger.error(`HTTP error! Status: ${response.status}`);
        return null;
      }

      const html = await response.text();

      const $ = cheerio.load(html);

      const imgElement = $('img[alt*="头像"]');

      if (imgElement.length > 0) {
        let src = imgElement.attr('src');
        if (src) {
          if (!src.startsWith("http")) {
            src = "https:" + src;

          }
          const regex = /\/thumb\/[0-9a-f]\/[0-9a-f]{2}\//
          if (regex.test(src)) {
            src = src.replace(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\//, "/")
            src = src.replace(/\/[0-9]+px-(.*)/, "")
          }
          return src;
        } else {
          return null;
        }
      } else {
        return null; // 没找到头像
      }


    } catch (error) {
      logger.error('Error fetching or parsing:', error);
      return null;
    }
  }

  function getDailyCubes(): number {
    const {dayMinCube, dayMaxCube} = cfg;
    if (dayMaxCube === dayMinCube) {
      return dayMaxCube;
    } else {
      return Math.floor(Math.random() * (dayMaxCube - dayMinCube + 1)) + dayMinCube;
    }
  }

  function getRandomShipName(shipData: ShipData): string {
    const shipNames = Object.keys(shipData);
    const randomIndex = Math.floor(Math.random() * shipNames.length);
    return shipNames[randomIndex];
  }

  async function fetchShipPage(shipName: string): Promise<string> {
    const url = `https://wiki.biligame.com/blhx/${encodeURIComponent(shipName)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      logger.error("Error fetching ship page:", error);
      throw error;
    }
  }

  function extractShipLines(html: string): string[] {
    const $ = cheerio.load(html);
    const lines: string[] = [];

    $('p.ship_word_line').each((index, element) => {
      lines.push($(element).text().trim());
    });

    return lines;
  }

  function getRandomLine(lines: string[]): string {
    if (lines.length === 0) {
      return "No lines found for this ship.";
    }
    const randomIndex = Math.floor(Math.random() * lines.length);
    return lines[randomIndex];
  }

  async function getRandomShipLine(shipData: ShipData): Promise<string> {
    try {
      const shipName = getRandomShipName(shipData);
      const html = await fetchShipPage(shipName);
      const lines = extractShipLines(html);
      return getRandomLine(lines);
    } catch (error) {
      return "An error occurred: " + (error instanceof Error ? error.message : String(error));
    }
  }

  async function sendMsg(session: Session, msg: any) {
    if (cfg.atReply) {
      msg = `${h.at(session.userId)}${h('p', '')}${msg}`;
    }

    if (cfg.quoteReply) {
      msg = `${h.quote(session.messageId)}${msg}`;
    }

    await session.send(msg);
  }
}
