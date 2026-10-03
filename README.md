# 碧蓝航线建造模拟器

Koishi 插件：模拟碧蓝航线建造，记录出货与收藏率并生成排行榜

[![GitHub](https://img.shields.io/badge/GitHub-araea%2Fkoishi--plugin--azur--lane--building-181717?logo=github&logoColor=white)](https://github.com/araea/koishi-plugin-azur-lane-building)
[![npm](https://img.shields.io/npm/v/koishi-plugin-azur-lane-building?logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/koishi-plugin-azur-lane-building)

## 安装

```sh
npm i koishi-plugin-azur-lane-building
```

启用插件，并安装 `database` 与 `puppeteer` 服务。

## 快速使用

发送 `alb.每日魔方` 领取魔方、开张港区，再发 `alb.抽轻型池 [次数]` 开始建造。

| 指令 | 说明 |
| --- | --- |
| `alb` | 查看指令列表 |
| `alb.每日魔方` | 领取每日魔方 |
| `alb.抽轻型池 [次数]` | 轻型建造 |
| `alb.抽重型池 [次数]` | 重型建造 |
| `alb.抽特型池 [次数]` | 特型建造 |
| `alb.轻型池` / `alb.重型池` / `alb.特型池` | 查看池内容与出货率 |
| `alb.建造记录` | 查看个人建造统计 |
| `alb.收藏率排行榜` | 查看收藏率排行 |

轻型池无海上传奇，稀有度分布为超稀有 7%、精锐 12%、稀有 26%、普通 55%。重型与特型池含 1.2% 海上传奇，分布为超稀有 7%、精锐 12%、稀有 51%、普通 28.8%。

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `dayMinCube` | number | `10` | 每日签到获取的魔方最小值 |
| `dayMaxCube` | number | `10` | 每日签到获取的魔方最大值 |
| `LightCost` | number | `1` | 轻型建造消耗 |
| `HeavyCost` | number | `2` | 重型建造消耗 |
| `SpecialCost` | number | `2` | 特型建造消耗 |
| `maxBuildPerCommand` | number | `50` | 单条指令最多建造发数，范围 1–200 |
| `LightShipBuilding` | object | 内置 | 轻型舰建造池，按稀有度分组 |
| `HeavyShipBuilding` | object | 内置 | 重型舰建造池，按稀有度分组 |
| `SpecialShipBuilding` | object | 内置 | 特型舰建造池，按稀有度分组 |
| `maxRank` | number | `10` | 排行榜显示人数，范围 1–50 |
| `enableShipLines` | boolean | `true` | 回复末尾附上一句舰娘台词 |
| `requestTimeout` | number | `5000` | 抓取 wiki 的超时时间（毫秒） |
| `atReply` | boolean | `false` | 回复时 @ 用户 |
| `quoteReply` | boolean | `true` | 回复时引用消息 |
| `disableImages` | boolean | `false` | 全部改用文本，不发送图片 |

## 限制 / 风险

需要 `database` 与 `puppeteer` 服务；渲染不可用时开启 `disableImages` 退回纯文本。

舰娘台词从 wiki 后台抓取并缓存，未命中缓存时回退内置台词，不拖慢回复。

单条指令最多建造 `maxBuildPerCommand`（默认 50）发，超出需分多条发送。

## 链接

- [设计系统](DESIGN_SYSTEM.md)
- [MIT](LICENSE-MIT) / [Apache-2.0](LICENSE-APACHE)
