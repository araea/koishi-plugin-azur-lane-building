# 碧蓝航线建造模拟器

Koishi 插件：模拟碧蓝航线建造，记录出货与收藏率并生成排行榜

[![GitHub](https://img.shields.io/badge/GitHub-仓库-181717)](https://github.com/araea/koishi-plugin-azur-lane-building)
[![npm](https://img.shields.io/badge/npm-包-CB3837)](https://www.npmjs.com/package/koishi-plugin-azur-lane-building)

## 安装

```sh
npm i koishi-plugin-azur-lane-building
```

需要 `database` 与 `puppeteer` 服务，在 Koishi 中启用本插件。

## 快速使用

启用后，发送 `alb.每日魔方` 领取魔方并开张港区，再发 `alb.抽轻型池 [次数]` 开始建造。

| 指令 | 说明 |
| --- | --- |
| `alb.每日魔方` | 领取每日魔方 |
| `alb.抽轻型池 [次数]` | 进行轻型建造 |
| `alb.抽重型池 [次数]` | 进行重型建造 |
| `alb.抽特型池 [次数]` | 进行特型建造 |
| `alb.轻型池` / `alb.重型池` / `alb.特型池` | 查看对应池内容与出货率 |
| `alb.建造记录` | 查看个人建造统计 |
| `alb.收藏率排行榜` | 查看收藏率排行 |

出货率：轻型池无海上传奇，其余稀有度轻型、重型与特型同为 7% / 12% / 26% / 55%；重型与特型含海上传奇 1.2%，普通为 28.8%。

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| dayMinCube | number | 10 | 每日签到获取的魔方最小值 |
| dayMaxCube | number | 10 | 每日签到获取的魔方最大值 |
| LightCost | number | 1 | 轻型建造消耗 |
| HeavyCost | number | 2 | 重型建造消耗 |
| SpecialCost | number | 2 | 特型建造消耗 |
| maxBuildPerCommand | number | 50 | 单条指令最多建造发数（范围 1–200） |
| LightShipBuilding | object | 内置轻型池舰名 | 轻型舰建造池，按稀有度分组 |
| HeavyShipBuilding | object | 内置重型池舰名 | 重型舰建造池，按稀有度分组 |
| SpecialShipBuilding | object | 内置特型池舰名 | 特型舰建造池，按稀有度分组 |
| maxRank | number | 10 | 排行榜显示人数（范围 1–50） |
| enableShipLines | boolean | true | 回复末尾附上一句舰娘台词 |
| requestTimeout | number | 5000 | 抓取 wiki 的超时时间（毫秒） |
| atReply | boolean | false | 回复时 @ 用户 |
| quoteReply | boolean | true | 回复时引用消息 |
| disableImages | boolean | false | 全部改用文本，不发送图片 |

## 限制 / 风险

依赖 `database` 与 `puppeteer` 服务。puppeteer 渲染不可用时，开启 `disableImages` 退回纯文本。

舰娘台词从 wiki 后台抓取并缓存，未命中缓存时回退内置台词，不会拖慢回复。

单条指令最多 `maxBuildPerCommand`（默认 50）发，超出需分多条发送。

## 必要链接

- [npm 包](https://www.npmjs.com/package/koishi-plugin-azur-lane-building)
