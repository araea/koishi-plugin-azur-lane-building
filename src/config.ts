import { Schema } from 'koishi'
import { ShipRareList } from './pools'

export interface Config {
  dayMinCube: number
  dayMaxCube: number
  LightCost: number
  HeavyCost: number
  SpecialCost: number
  maxBuildPerCommand: number
  LightShipBuilding: ShipRareList
  HeavyShipBuilding: ShipRareList
  SpecialShipBuilding: ShipRareList
  maxRank: number
  requestTimeout: number
  enableShipLines: boolean
  atReply: boolean
  quoteReply: boolean
}

const pool = (defaults: Partial<ShipRareList>) => Schema.object({
  Legend: Schema.string().role('textarea', { rows: [2, 4] }).default(defaults.Legend ?? ''),
  SuperRare: Schema.string().role('textarea', { rows: [2, 4] }).default(defaults.SuperRare),
  Elite: Schema.string().role('textarea', { rows: [2, 4] }).default(defaults.Elite),
  Rare: Schema.string().role('textarea', { rows: [2, 4] }).default(defaults.Rare),
  Normal: Schema.string().role('textarea', { rows: [2, 4] }).default(defaults.Normal),
}).collapse()

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    dayMinCube: Schema.natural().default(10).description('每日签到获取的魔方最小值。'),
    dayMaxCube: Schema.natural().default(10).description('每日签到获取的魔方最大值。'),
    LightCost: Schema.natural().default(1).description('轻型建造消耗。'),
    HeavyCost: Schema.natural().default(2).description('重型建造消耗。'),
    SpecialCost: Schema.natural().default(2).description('特型建造消耗。'),
    maxBuildPerCommand: Schema.natural().min(1).max(200).default(50).description('单条指令最多建造几发。'),
  }).description('抽卡设置'),

  Schema.object({
    LightShipBuilding: pool({
      SuperRare: '圣地亚哥、蒙彼利埃、确捷、明石、阿芙乐尔、里诺、英格拉罕、布里斯托尔、卡律布狄斯、可怖、圣女贞德、塔什干、恰巴耶夫、赫敏、凉月、古比雪夫、基洛夫、不屈、阿布鲁齐公爵、马格德堡、雅努斯',
      Elite: '莫里、拉菲、圣路易斯、小海伦娜、丹佛、小克利夫兰、标枪、欧若拉、小贝法、吹雪、绫波、Z23、逸仙、文琴佐·焦贝蒂、库珀、勇敢、Z2、神速、马耶·布雷泽、沃克兰、塔尔图、威严、水星纪念、爱斯基摩人、博伊西、纽伦堡、雷鸣、摩尔曼斯克、进取、由良、海风、西北风、西南风、尼科洛索·达雷科、曼彻斯特、济安、龙武、虎贲',
      Rare: '哈曼、弗莱彻、贝奇、斯坦利、斯莫利、霍比、科尔克、康克德、布鲁克林、菲尼克斯、亚特兰大、朱诺、女将、阿卡司塔、热心、丘比特、泽西、库拉索、杓鹬、阿基里斯、阿贾克斯、南安普顿、格拉斯哥、神风、松风、旗风、初春、若叶、夕暮、大潮、浦风、矶风、谷风、Z19、清波、莱比锡、福尔班、勒马尔、文月、朝潮、滨风、那珂、马布尔黑德、追风',
      Normal: '卡辛、唐斯、克雷文、麦考尔、富特、斯彭斯、奥利克、奥马哈、罗利、小猎兔犬、大斗犬、彗星、新月、小天鹅、狐提、利安得、睦月、如月、卯月、长良、柯尼斯堡、卡尔斯鲁厄、科隆',
    }).description('轻型舰建造池（无海上传奇）'),

    HeavyShipBuilding: pool({
      Legend: '信浓、新泽西、岛风、乌尔里希·冯·胡滕',
      SuperRare: '胡德、厌战、高雄、欧根亲王、布莱默顿、黎塞留、阿尔及利亚、苏维埃罗西亚、豪、纪伊、旧金山、海因里希亲王、苏维埃贝拉罗斯、塔林、筑摩、维托里奥·维内托、阿达尔伯特亲王、寰昌',
      Elite: '休斯敦、印第安纳波利斯、亚利桑那、伦敦、多塞特郡、约克、声望、伊丽莎白女王、纳尔逊、黑暗界、恐怖、阿贝克隆比、雾岛、德意志、小比叡、敦刻尔克、铃谷、比叡、英勇、小声望、小天城、福煦',
      Rare: '北安普敦、芝加哥、宾夕法尼亚、田纳西、加利福尼亚、什罗普郡、苏塞克斯、肯特、萨福克、诺福克、反击、伊势',
      Normal: '彭萨科拉、内华达、俄克拉荷马、青叶、衣笠',
    }).description('重型舰建造池'),

    SpecialShipBuilding: pool({
      Legend: '信浓、新泽西、岛风、乌尔里希·冯·胡滕',
      SuperRare: '企业、埃塞克斯、半人马、胜利、伊19、明石、U-81、U-47、U-101、伊168、香格里拉、伊13、无畏、英仙座、提康德罗加、射水鱼、忒修斯、彼得·史特拉塞、U-37、霞飞、葛城、天鹰、阿尔比恩',
      Elite: '休斯敦、印第安纳波利斯、列克星敦、萨拉托加、约克城、大黄蜂、女灶神、伦敦、多塞特郡、独角兽、伊26、伊58、小赤城、小齐柏林、絮库夫、伊25、U-522、伊56、鹦鹉螺、镇海、鹰、威悉、樫野、千岁、千代田、华甲、普林斯顿、小光辉、小企业、易北',
      Rare: '北安普敦、芝加哥、长岛、什罗普郡、肯特、萨福克、诺福克',
      Normal: '彭萨科拉、博格、兰利、突击者、竞技神',
    }).description('特型舰建造池'),
  }).description('建造清单配置'),

  Schema.object({
    maxRank: Schema.natural().min(1).max(50).default(10).description('排行榜显示人数。'),
    enableShipLines: Schema.boolean().default(true)
      .description('回复末尾附上一句舰娘台词。台词从 wiki 后台抓取并缓存，未命中缓存时先用内置台词顶上，不会拖慢回复。'),
    requestTimeout: Schema.natural().default(5000).description('抓取 wiki 的超时时间（毫秒）。'),
  }).description('排行榜与网络'),

  Schema.object({
    atReply: Schema.boolean().default(false).description('回复时 @ 用户。'),
    quoteReply: Schema.boolean().default(true).description('回复时引用消息。'),
  }).description('回复设置'),
])
