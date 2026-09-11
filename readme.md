# koishi-plugin-azur-lane-building

碧蓝航线建造模拟器

## 安装

```sh
yarn add koishi-plugin-azur-lane-building
```

在 Koishi 配置中启用，并提供 database 与 puppeteer 服务。

## 指令

| 指令 | 说明 |
| --- | --- |
| `alb.每日魔方` | 每日领取魔方 |
| `alb.抽轻型池 [次数]` | 建造 |
| `alb.抽重型池 [次数]` | 建造 |
| `alb.抽特型池 [次数]` | 建造 |
| `alb.轻型池` / `alb.重型池` / `alb.特型池` | 池内容与出货率 |
| `alb.抽卡记录` | 个人建造统计 |
| `alb.收藏率排行榜` | 收藏率排行 |

出货率：

| 稀有度 | 轻型 | 重型 / 特型 |
| --- | --- | --- |
| 海上传奇 | — | 1.2% |
| 超稀有 | 7% | 7% |
| 精锐 | 12% | 12% |
| 稀有 | 26% | 51% |
| 普通 | 55% | 28.8% |

## 许可证

可按 [Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 使用。
