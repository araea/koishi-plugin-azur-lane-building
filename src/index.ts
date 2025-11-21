import { Context, h, Schema, Session, Logger } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { shipData as importedShipData } from './data';
import * as cheerio from 'cheerio';

// --- 类型定义区 ---

export const name = 'azur-lane-building'
export const inject = ['database', 'puppeteer']
export const usage = `## 使用

1. 设置指令别名。
2. 发送 \`alb.每日魔方\` 获取魔方。
3. 发送 \`alb.抽轻型池 [次数（可选）]\` 抽卡。

## 补充

* 可手动更新建造清单（[参考](https://wiki.biligame.com/blhx/index.php?title=%E5%BB%BA%E9%80%A0%E6%A8%A1%E6%8B%9F%E5%99%A8&action=edit)）
`

// 为了防止 shipData 导入为空导致崩溃，做个兼容
const localShipData = importedShipData || {};

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
  requestTimeout: number; // 新增：请求超时设置
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    dayMaxCube: Schema.number().default(10).min(0).description('每日签到获取的魔方最大值'),
    dayMinCube: Schema.number().default(10).min(0).description('每日签到获取的魔方最小值'),
    LightCost: Schema.number().default(1).min(0).description('轻型建造消耗'),
    HeavyCost: Schema.number().default(2).min(0).description('重型建造消耗'),
    SpecialCost: Schema.number().default(2).min(0).description('特型建造消耗'),
  }).description('抽卡设置'),

  Schema.object({
    LightShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', { rows: [2, 4] }),
      SuperRare: Schema.string().role('textarea', { rows: [2, 4] }).default('圣地亚哥、蒙彼利埃、确捷、明石、阿芙乐尔、里诺、英格拉罕、布里斯托尔、卡律布狄斯、可怖、圣女贞德、塔什干、恰巴耶夫、赫敏、凉月、古比雪夫、基洛夫、不屈、阿布鲁齐公爵、马格德堡、雅努斯'),
      Elite: Schema.string().role('textarea', { rows: [2, 4] }).default('莫里、拉菲、圣路易斯、小海伦娜、丹佛、小克利夫兰、标枪、欧若拉、小贝法、吹雪、绫波、Z23、逸仙、文琴佐·焦贝蒂、库珀、勇敢、Z2、神速、马耶·布雷泽、沃克兰、塔尔图、威严、水星纪念、爱斯基摩人、博伊西、纽伦堡、雷鸣、摩尔曼斯克、进取、由良、海风、西北风、西南风、尼科洛索·达雷科、曼彻斯特、济安、龙武、虎贲'),
      Rare: Schema.string().role('textarea', { rows: [2, 4] }).default('哈曼、弗莱彻、贝奇、斯坦利、斯莫利、霍比、科尔克、康克德、布鲁克林、菲尼克斯、亚特兰大、朱诺、女将、阿卡司塔、热心、丘比特、泽西、库拉索、杓鹬、阿基里斯、阿贾克斯、南安普顿、格拉斯哥、神风、松风、旗风、初春、若叶、夕暮、大潮、浦风、矶风、谷风、Z19、清波、莱比锡、福尔班、勒马尔、文月、朝潮、滨风、那珂、马布尔黑德、追风'),
      Normal: Schema.string().role('textarea', { rows: [2, 4] }).default('卡辛、唐斯、克雷文、麦考尔、富特、斯彭斯、奥利克、奥马哈、罗利、小猎兔犬、大斗犬、彗星、新月、小天鹅、狐提、利安得、睦月、如月、卯月、长良、柯尼斯堡、卡尔斯鲁厄、科隆'),
    }).collapse().description('轻型舰建造池'),

    HeavyShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', { rows: [2, 4] }).default('信浓、新泽西、岛风、乌尔里希·冯·胡滕'),
      SuperRare: Schema.string().role('textarea', { rows: [2, 4] }).default('胡德、厌战、高雄、欧根亲王、布莱默顿、黎塞留、阿尔及利亚、苏维埃罗西亚、豪、纪伊、旧金山、海因里希亲王、苏维埃贝拉罗斯、塔林、筑摩、维托里奥·维内托、阿达尔伯特亲王、寰昌'),
      Elite: Schema.string().role('textarea', { rows: [2, 4] }).default('休斯敦、印第安纳波利斯、亚利桑那、伦敦、多塞特郡、约克、声望、伊丽莎白女王、纳尔逊、黑暗界、恐怖、阿贝克隆比、雾岛、德意志、小比叡、敦刻尔克、铃谷、比叡、英勇、小声望、小天城、福煦'),
      Rare: Schema.string().role('textarea', { rows: [2, 4] }).default('北安普敦、芝加哥、宾夕法尼亚、田纳西、加利福尼亚、什罗普郡、苏塞克斯、肯特、萨福克、诺福克、反击、伊势'),
      Normal: Schema.string().role('textarea', { rows: [2, 4] }).default('彭萨科拉、内华达、俄克拉荷马、青叶、衣笠'),
    }).collapse().description('重型舰建造池'),

    SpecialShipBuilding: Schema.object({
      Legend: Schema.string().role('textarea', { rows: [2, 4] }).default('信浓、新泽西、岛风、乌尔里希·冯·胡滕'),
      SuperRare: Schema.string().role('textarea', { rows: [2, 4] }).default('企业、埃塞克斯、半人马、胜利、伊19、明石、U-81、U-47、U-101、伊168、香格里拉、伊13、无畏、英仙座、提康德罗加、射水鱼、忒修斯、彼得·史特拉塞、U-37、霞飞、葛城、天鹰、阿尔比恩'),
      Elite: Schema.string().role('textarea', { rows: [2, 4] }).default('休斯敦、印第安纳波利斯、列克星敦、萨拉托加、约克城、大黄蜂、女灶神、伦敦、多塞特郡、独角兽、伊26、伊58、小赤城、小齐柏林、絮库夫、伊25、U-522、伊56、鹦鹉螺、镇海、鹰、威悉、樫野、千岁、千代田、华甲、普林斯顿、小光辉、小企业、易北'),
      Rare: Schema.string().role('textarea', { rows: [2, 4] }).default('北安普敦、芝加哥、长岛、什罗普郡、肯特、萨福克、诺福克'),
      Normal: Schema.string().role('textarea', { rows: [2, 4] }).default('彭萨科拉、博格、兰利、突击者、竞技神'),
    }).collapse().description('特型舰建造池'),
  }).description('建造清单配置'),

  Schema.object({
    maxRank: Schema.number().default(10).min(1).max(50).description('排行榜显示人数'),
    requestTimeout: Schema.number().default(5000).description('网络请求超时时间(毫秒)'),
  }).description('排行榜与网络'),

  Schema.object({
    atReply: Schema.boolean().default(false).description('响应时 @ 用户'),
    quoteReply: Schema.boolean().default(true).description('响应时引用消息'),
  }).description('回复设置'),
])

declare module 'koishi' {
  interface Tables {
    azur_lane_building: Building;
  }
}

interface ShipRareList {
  SpacalPR?: string;
  Legend?: string;
  SuperRare: string;
  Elite: string;
  Rare: string;
  Normal: string;
}

interface BuildParams {
  session: Session;
  frequency: number;
  type: string;
  cost: number;
  buildType: BuildType;
  shipBuilding: ShipRareList;
  getRarity: (rareProbability: number) => { rarity: RarityOrShipName; probabilityIndex: number };
}

interface RarityConfig {
  name: string;
  textColor: string;
  color: string;
  probability: number;
  ships?: string[];
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
  total: number;
}

interface BuildStats {
  [rarityOrShipName: string]: BuildStatsRow; // 索引签名放宽
  total: BuildStatsRow
}

interface BuildRecord {
  buildCount: number;
  buildType: string;
  rarity: RarityOrShipName;
  shipName: string;
  times: number
}

type BuildHistory = BuildRecord[];

// --- 缓存对象 ---
const avatarCache = new Map<string, string>();
const shipLineCache = new Map<string, string[]>();

export function apply(ctx: Context, cfg: Config) {
  const logger = ctx.logger('azur-lane-building');

  // --- 数据库模型 ---
  ctx.model.extend('azur_lane_building', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
    cube: 'unsigned',
    lastCheckInTimestamp: 'timestamp',
    buildStats: { type: 'json', initial: createDefaultBuildStats() },
    buildHistory: { type: 'json', initial: [] },
    collectionRate: 'double',
  }, { autoInc: true, primary: 'id' });

  // --- 常量与配置 ---
  const lightShipProbabilities = { SuperRare: 7, Elite: 12, Rare: 26, Normal: 55, Legend: 0 };
  const heavySpecialShipProbabilities = { Legend: 1.2, SuperRare: 7, Elite: 12, Rare: 51, Normal: 28.8 };

  const rarityDefinitions = {
    Legend: { name: '海上传奇', textColor: '#ee494c', color: 'linear-gradient(135deg, #59ae6a, #48ae96, #60d9ec, #65a5d5, #9491e0, #c382a4)' },
    SuperRare: { name: '超稀有', textColor: '#c90', color: '#f9f593' },
    Elite: { name: '精锐', textColor: '#8000ff', color: '#ae90ef' },
    Rare: { name: '稀有', textColor: '#3b8bff', color: '#1bb7eb' },
    Normal: { name: '普通', textColor: '#808080', color: '#dbdcdf' },
  };

  const baseRarityConfig: Omit<RarityConfig, 'probability'> = { name: '', textColor: '', color: '' };

  const lightShipBuildingRarityConfig = createShipBuildingRarityConfig(lightShipProbabilities);
  const heavySpecialShipBuildingRarityConfig = createShipBuildingRarityConfig(heavySpecialShipProbabilities);
  const specialShipBuildingRarityConfig = heavySpecialShipBuildingRarityConfig;

  const allShipBuildingData = {
    LightShipBuilding: cfg.LightShipBuilding,
    HeavyShipBuilding: cfg.HeavyShipBuilding,
    SpecialShipBuilding: cfg.SpecialShipBuilding,
  };
  const totalShipCount = countUniqueRoles(allShipBuildingData);

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

  // --- 指令注册 ---
  ctx.command('alb', '碧蓝航线建造模拟器');

  ctx.command('alb.每日魔方')
    .action(async ({ session }) => {
      await handleDailyCheckIn(session);
    });

  ctx.command('alb.抽卡记录')
    .action(async ({ session }) => {
      await handleBuildHistory(session);
    });

  ctx.command('alb.收藏率排行榜', '')
    .action(async ({ session }) => {
      await handleRanking(session);
    });

  // 列表查看指令
  ctx.command('alb.轻型池').action(({ session }) => handleShipBuildingList(session, cfg.LightShipBuilding, lightShipBuildingRarityConfig));
  ctx.command('alb.重型池').action(({ session }) => handleShipBuildingList(session, cfg.HeavyShipBuilding, heavySpecialShipBuildingRarityConfig));
  ctx.command('alb.特型池').action(({ session }) => handleShipBuildingList(session, cfg.SpecialShipBuilding, specialShipBuildingRarityConfig));

  // 动态注册建造指令
  for (const key in buildConfigs) {
    const config = buildConfigs[key];
    ctx.command(config.command)
      .action(async ({ session }, frequency = 1) => {
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

  // --- 核心功能函数 ---

  async function handleRanking(session: Session) {
    // 优化：不要 fetchAll，直接数据库排序并限制数量
    const topUsers = await ctx.database.select('azur_lane_building')
      .orderBy('collectionRate', 'desc')
      .limit(cfg.maxRank)
      .execute();

    if (topUsers.length === 0) {
      await sendMsg(session, `排行榜空空如也，快来当第一个指挥官吧！\n\n“${await getRandomShipLine()}”`);
      return;
    }

    const html = generateCollectionRateRanking(topUsers);
    const buffer = await html2img(html);
    if (buffer) await sendMsg(session, h.image(buffer, 'image/png'));
    else await sendMsg(session, '生成排行榜图片失败，请查看日志。');
  }

  async function handleBuildHistory(session: Session) {
    const userBd = await ctx.database.get('azur_lane_building', { userId: session.userId });
    if (userBd.length === 0) {
      await sendMsg(session, `请先领取每日魔方激活账号！\n\n“${await getRandomShipLine()}”`);
      return;
    }
    const { buildHistory, buildStats } = userBd[0];
    if (buildHistory.length === 0) {
      await sendMsg(session, '指挥官还没有进行过建造哦~');
      return;
    }

    const most = findMostFrequentShip(buildHistory);
    const html = await convertBuildStatsToHtml(buildStats, most);
    const buffer = await html2img(html);
    if (buffer) await sendMsg(session, h.image(buffer, 'image/png'));
  }

  async function handleDailyCheckIn(session: Session) {
    const timestamp = new Date();
    const userBd = await ctx.database.get('azur_lane_building', { userId: session.userId });
    const cubeReward = getDailyCubes();

    if (userBd.length === 0) {
      await ctx.database.create('azur_lane_building', {
        userId: session.userId,
        username: session.username,
        cube: cubeReward,
        lastCheckInTimestamp: timestamp,
        buildHistory: [],
        buildStats: createDefaultBuildStats(),
        collectionRate: 0,
      });
      await sendMsg(session, `指挥官，欢迎入驻！\n初始资金 ${cubeReward} 魔方已到账。\n\n“${await getRandomShipLine()}”`);
    } else {
      const user = userBd[0];
      if (isSameDay(timestamp, user.lastCheckInTimestamp)) {
        await sendMsg(session, `今天已经领过了哦~\n\n“${await getRandomShipLine()}”`);
        return;
      }

      await ctx.database.set('azur_lane_building', { id: user.id }, {
        username: session.username, // 更新用户名以防修改
        cube: user.cube + cubeReward,
        lastCheckInTimestamp: timestamp,
      });

      await sendMsg(session, `指挥官，欢迎回来！\n领取 ${cubeReward} 魔方成功。\n当前库存: ${user.cube + cubeReward}\n\n“${await getRandomShipLine()}”`);
    }
  }

  async function performBuild(params: BuildParams) {
      const { session, frequency, type, cost, buildType, shipBuilding, getRarity } = params;

      if (!frequency || frequency <= 0) {
        await sendMsg(session, '抽卡次数无效。');
        return;
      }
      if (frequency > 50) {
          await sendMsg(session, '单次建造不能超过50发哦，不仅伤身体，还容易卡住！');
          return;
      }

      const userBd = await ctx.database.get('azur_lane_building', { userId: session.userId });
      if (userBd.length === 0) {
        await sendMsg(session, `请先领取每日魔方！\n\n“${await getRandomShipLine()}”`);
        return;
      }

      const user = userBd[0];
      const need = cost * frequency;

      if (user.cube < need) {
        await sendMsg(session, `魔方不足！\n当前: ${user.cube}\n需要: ${need}\n\n“${await getRandomShipLine()}”`);
        return;
      }

      // 修改此处，避免类型不匹配
      let buildStats: Record<string, BuildStatsRow> = user.buildStats;
      const buildHistory: BuildRecord[] = user.buildHistory;
      const newRecords: BuildRecord[] = [];

      const rarityMapping = {
        "海上传奇": "Legend",
        "超稀有": "SuperRare",
        "精锐": "Elite",
        "稀有": "Rare",
        "普通": "Normal",
      };

      for (let i = 0; i < frequency; i++) {
        const rareProbability = Math.floor(Math.random() * 1000);
        const { rarity } = getRarity(rareProbability);
        const rarityKey = rarityMapping[rarity];

        // 更新统计
        if (!buildStats[rarity]) {
          buildStats[rarity] = { ...createDefaultBuildStats()[rarity], total: 0 };
        }
        buildStats[rarity][buildType]++;
        buildStats[rarity].total++;
        // 更新总计
        if (!buildStats['total']) {
          buildStats['total'] = createDefaultBuildStats().total;
        }
        buildStats['total'][buildType]++;
        buildStats['total'].total++;

        // 随机舰船
        const shipListStr = shipBuilding[rarityKey];
        let shipName = rarity; // 默认回退
        if (shipListStr) {
          const list = shipListStr.split('、');
          shipName = list[Math.floor(Math.random() * list.length)].trim();
        }

        const record: BuildRecord = {
          buildCount: buildHistory.length + 1,
          buildType: type,
          rarity,
          shipName,
          times: calculateTotalTimes(buildHistory, shipName) + 1 + calculateTotalTimes(newRecords, shipName),
        };
        newRecords.push(record);
      }

      // 更新数据库
      const finalHistory = [...buildHistory, ...newRecords];
      await ctx.database.set('azur_lane_building', { id: user.id }, {
        cube: user.cube - need,
        buildHistory: finalHistory,
        buildStats: buildStats,
        collectionRate: countUniqueShipNames(finalHistory) / totalShipCount,
      });

      // 生成结果图
      const html = formatBuildRecordsToHTML(newRecords);
      const buffer = await html2img(html);
      if (buffer) {
        await sendMsg(session, `${frequency}发${type}建造完成 (消耗${need}魔方，剩余${user.cube - need})\n${h.image(buffer, 'image/png')}`);
      } else {
        await sendMsg(session, '建造成功，但图片生成失败。');
      }
    }

  // --- 辅助函数 ---

  async function handleShipBuildingList(session: Session, shipBuildingData: ShipRareList, rarityConfig: ShipBuildingConfig) {
    const html = await generateShipBuildingContentHtml(shipBuildingData, rarityConfig);
    const buffer = await html2img(html);
    if (buffer) await sendMsg(session, h.image(buffer, 'image/png'));
  }

  async function html2img(html: string): Promise<Buffer | undefined> {
    let page;
    try {
      page = await ctx.puppeteer.page();
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 }); // 减少等待时间
      await page.setViewport({ width: 1000, height: 400 });
      const element = await page.$('body'); // 只截取 body
      const buffer = await element?.screenshot({ encoding: 'binary' }) || await page.screenshot({ fullPage: true });
      return buffer as Buffer;
    } catch (error) {
      logger.error('Puppeteer error:', error);
      return undefined;
    } finally {
      if (page) await page.close(); // 确保关闭页面
    }
  }

  function createShipBuildingRarityConfig(probabilities: { [key: string]: number }): ShipBuildingConfig {
    const config: ShipBuildingConfig = {};
    for (const key in rarityDefinitions) {
        config[key] = {
          ...baseRarityConfig,
          ...rarityDefinitions[key],
          probability: probabilities[key] || 0,
        };
    }
    return config;
  }

  function getLightRarity(prob: number) {
    if (prob < 0) return { rarity: "海上传奇", probabilityIndex: 0 };
    if (prob < 70) return { rarity: "超稀有", probabilityIndex: 1 };
    if (prob < 190) return { rarity: "精锐", probabilityIndex: 2 };
    if (prob < 450) return { rarity: "稀有", probabilityIndex: 3 };
    return { rarity: "普通", probabilityIndex: 4 };
  }

  function getHeavyAndSpecialRarity(prob: number) {
    if (prob < 12) return { rarity: "海上传奇", probabilityIndex: 0 };
    if (prob < 82) return { rarity: "超稀有", probabilityIndex: 1 };
    if (prob < 202) return { rarity: "精锐", probabilityIndex: 2 };
    if (prob < 712) return { rarity: "稀有", probabilityIndex: 3 };
    return { rarity: "普通", probabilityIndex: 4 };
  }

  // 简单的 fetch 封装，带超时
  async function fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), cfg.requestTimeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  async function getShipAvatarUrl(shipName: string): Promise<string | null> {
    // 1. 优先使用本地数据
    if (localShipData[shipName]?.src) return localShipData[shipName].src;
    // 2. 使用内存缓存
    if (avatarCache.has(shipName)) return avatarCache.get(shipName);

    // 3. 爬取
    try {
      const url = `https://wiki.biligame.com/blhx/${encodeURIComponent(shipName)}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) return null;

      const html = await response.text();
      const $ = cheerio.load(html);
      // 优化选择器
      const imgElement = $('.wikitable.sculpture img').first();
      let src = imgElement.attr('src');

      if (!src) {
          // 备用选择器
          const altImg = $(`img[alt^="${shipName}"][alt$="头像"]`).first();
          src = altImg.attr('src');
      }

      if (src) {
        if (!src.startsWith("http")) src = "https:" + src;
        // 处理缩略图 URL 还原为高清
        src = src.replace(/\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/[^/]+/, "/$1");
        avatarCache.set(shipName, src);
        return src;
      }
      return null;
    } catch (error) {
      logger.warn(`Get avatar failed for ${shipName}: ${error.message}`);
      return null;
    }
  }

  async function getRandomShipLine(): Promise<string> {
      try {
        const shipNames = Object.keys(localShipData);
        // 如果没有本地数据，就用几个写死的以防万一
        if (shipNames.length === 0) return "指挥官，今天也要加油哦！";

        const shipName = shipNames[Math.floor(Math.random() * shipNames.length)];

        // 缓存台词
        if (shipLineCache.has(shipName)) {
          const lines = shipLineCache.get(shipName);
          if (lines) {
            return lines[Math.floor(Math.random() * lines.length)];
          }
        }

        const url = `https://wiki.biligame.com/blhx/${encodeURIComponent(shipName)}`;
        const response = await fetchWithTimeout(url);
        if (!response.ok) return `指挥官，连接超时了... (${shipName})`;

        const html = await response.text();
        const $ = cheerio.load(html);
        const lines: string[] = [];
        // 针对 Wiki 结构的台词抓取
        $('.ship_word_line').each((_, el) => {
          const text = $(el).text().trim();
          if (typeof text === 'string') {
            lines.push(text);
          }
        });

        if (lines.length > 0) {
          shipLineCache.set(shipName, lines); // 写入缓存
          return lines[Math.floor(Math.random() * lines.length)];
        }
        return "指挥官？(似乎没有找到台词)";
      } catch (error) {
        return "指挥官，通讯似乎受到了干扰...";
      }
    }

  // --- HTML 生成与数据处理工具函数 ---

  async function generateShipBuildingContentHtml(shipBuildingData: ShipRareList, rarityConfig: ShipBuildingConfig): Promise<string> {
     // 构建数据结构
    const rarityMap = Object.keys(rarityConfig).reduce((acc, key) => {
        acc[key] = { ...rarityConfig[key], ships: [] };
        return acc;
    }, {});

    for (const rarityKey in shipBuildingData) {
        if (shipBuildingData[rarityKey] && rarityMap[rarityKey]) {
            rarityMap[rarityKey].ships = shipBuildingData[rarityKey].split('、').map(s => s.trim()).filter(s => s);
        }
    }

    let html = `<div style="background: linear-gradient(to bottom, #e0f2f7, #ffffff); padding: 10px; border-radius: 10px; font-family: sans-serif;">`;
    html += `<table style="width: 100%; text-align: center; border-collapse: collapse;"><thead><tr>`;

    // 表头
    for (const key in rarityMap) {
        const { name, color, probability } = rarityMap[key];
        html += `<th style="background: ${color}; padding: 8px; color: #333;">${name} ${probability}%</th>`;
    }
    html += `</tr></thead><tbody><tr>`;

    // 内容
    for (const key in rarityMap) {
        html += `<td style="vertical-align: top; padding: 5px; border: 1px solid #ddd;">`;
        for (const shipName of rarityMap[key].ships) {

            const src = localShipData[shipName]?.src
                || (avatarCache.has(shipName) ? avatarCache.get(shipName) : null)
                || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';

            html += `
              <div style="display: inline-block; margin: 2px;">
                <img src="${src}" style="width: 30px; height: 30px; border-radius: 4px; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                <span style="color:${rarityMap[key].textColor}; font-size: 12px;">${shipName}</span>
              </div>`;
        }
        html += `</td>`;
    }
    html += `</tr></tbody></table></div>`;
    return html;
  }

  async function convertBuildStatsToHtml(buildStats: BuildStats, mostFrequentShip: string): Promise<string> {
    const formatNumber = (num: number) => num.toLocaleString('zh-CN');
    const avatarSrc = await getShipAvatarUrl(mostFrequentShip) || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';

    const generateRow = (label: string, data: BuildStatsRow, isTotal = false) => `
      <tr style="${isTotal ? 'background-color: #e8f4f8; font-weight: bold;' : ''}">
        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${label}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatNumber(data[BuildType.Light])}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatNumber(data[BuildType.Heavy])}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatNumber(data[BuildType.Special])}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background-color: #f0f8ff;">${formatNumber(data.total)}</td>
      </tr>`;

    const rows = Object.entries(buildStats)
        .filter(([k]) => k !== 'total')
        .map(([k, v]) => generateRow(k, v))
        .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px;max-width:800px;margin:0 auto;}</style></head>
    <body>
      <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;">
        <h3 style="margin:0;">⭐ 最常获得: ${mostFrequentShip}</h3>
        <img src="${avatarSrc}" style="width:40px;height:40px;border-radius:50%;margin-left:10px;">
      </div>
      <table style="width:100%;border-collapse:collapse;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background-color:#4a89dc;color:white;">
            <th style="padding:10px;">稀有度</th>
            <th>${BuildType.Light}</th>
            <th>${BuildType.Heavy}</th>
            <th>${BuildType.Special}</th>
            <th>总计</th>
          </tr>
        </thead>
        <tbody>${rows}${generateRow('总计', buildStats.total, true)}</tbody>
      </table>
    </body></html>`;
  }

  function formatBuildRecordsToHTML(records: BuildRecord[]): string {
      // 简化的 HTML 生成，避免冗余 CSS，确保序号递增
      const rows = records.map((r, index) => {
          const src = localShipData[r.shipName]?.src || 'https://patchwiki.biligame.com/images/blhx/8/85/bqph8bamx4tamsp56ojsmqjm958axt6.png';
          let color = '#333';
          if(r.rarity === '超稀有') color = '#c90';
          else if(r.rarity === '海上传奇') color = '#ee494c';
          else if(r.rarity === '精锐') color = '#8000ff';
          else if(r.rarity === '稀有') color = '#3b8bff';

          return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${index + 1 + r.buildCount}</td>
            <td style="padding: 8px; display: flex; align-items: center;">
                <img src="${src}" style="width:30px;height:30px;border-radius:50%;margin-right:8px;">
                ${r.shipName}
            </td>
            <td style="padding: 8px; color: ${color}; font-weight: bold;">${r.rarity}</td>
            <td style="padding: 8px;">${r.buildType.replace('舰建造', '')}</td>
            <td style="padding: 8px;">第${r.times}次</td>
          </tr>`;
      }).join('');

      return `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:20px;">
      <h3 style="margin-top:0;">本次建造结果</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr style="background:#f0f0f0;text-align:left;">
            <th style="padding:8px;">序号</th><th>舰娘</th><th>稀有度</th><th>池子</th><th>累计</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`;
  }

  function generateCollectionRateRanking(buildings: Building[]): string {
    // 排名列表 HTML
    const rows = buildings.map((item, index) => `
        <tr>
            <td style="padding:12px;color:${index<3?'#f5a623':'#666'};font-weight:bold;">#${index + 1}</td>
            <td style="padding:12px;">${item.username}</td>
            <td style="padding:12px;color:#4a90e2;font-weight:bold;">${(item.collectionRate * 100).toFixed(2)}%</td>
            <td style="padding:12px;">${item.cube}</td>
            <td style="padding:12px;color:#999;font-size:0.9em;">${new Date(item.lastCheckInTimestamp).toLocaleDateString('zh-CN')}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="font-family:sans-serif;background:#f5f5f5;padding:20px;max-width:800px;margin:0 auto;">
        <div style="background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);padding:20px;">
            <h2 style="text-align:center;margin-top:0;color:#333;">收藏率排行榜</h2>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#4a90e2;color:white;text-align:left;">
                        <th style="padding:12px;border-radius:4px 0 0 4px;">排名</th><th>指挥官</th><th>收藏率</th><th>魔方</th><th style="border-radius:0 4px 4px 0;">最后签到</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="text-align:right;color:#999;font-size:12px;margin-top:10px;">统计截止: ${new Date().toLocaleString('zh-CN')}</div>
        </div>
    </body></html>`;
  }

  // 纯逻辑辅助函数
  function isSameDay(d1: Date | number, d2: Date | number): boolean {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  function createDefaultBuildStats(): BuildStats {
    const row = () => ({ [BuildType.Light]: 0, [BuildType.Heavy]: 0, [BuildType.Special]: 0, total: 0 });
    return { "海上传奇": row(), "超稀有": row(), "精锐": row(), "稀有": row(), "普通": row(), total: row() };
  }

  function getDailyCubes() {
    const { dayMinCube, dayMaxCube } = cfg;
    return Math.floor(Math.random() * (dayMaxCube - dayMinCube + 1)) + dayMinCube;
  }

  function countUniqueRoles(data: any): number {
    const set = new Set<string>();
    const add = (str?: string) => str?.split('、').forEach(s => set.add(s.trim()));
    Object.values(data).forEach((cat: any) => Object.values(cat).forEach((s: string) => add(s)));
    return set.size;
  }

  function countUniqueShipNames(history: BuildRecord[]) {
    return new Set(history.map(r => r.shipName)).size;
  }

  function findMostFrequentShip(history: BuildRecord[]) {
    const map = new Map<string, number>();
    let max = 0;
    let res = '';
    history.forEach(r => {
        const count = (map.get(r.shipName) || 0) + 1;
        map.set(r.shipName, count);
        if (count > max) { max = count; res = r.shipName; }
    });
    return res || '无';
  }

  function calculateTotalTimes(history: BuildRecord[], name: string) {
    return history.reduce((acc, cur) => cur.shipName === name ? acc + 1 : acc, 0);
  }

  async function sendMsg(session: Session, msg: any) {
    if (cfg.atReply) {
      msg = `${h.at(session.userId)}${h("p", "")}${msg}`;
    }

    if (cfg.quoteReply) {
      msg = `${h.quote(session.messageId)}${msg}`;
    }

    await session.send(msg);
  }
}
