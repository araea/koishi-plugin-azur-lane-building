# koishi-plugin-azur-lane-building

碧蓝航线建造模拟器插件。

## 安装

~~~sh
yarn add koishi-plugin-azur-lane-building
~~~

在 Koishi 配置中启用 koishi-plugin-azur-lane-building。

## 指令

| 指令 | 说明 |
| --- | --- |
| alb.每日魔方 | 每日领取魔方 |
| alb.抽轻型池 / 抽重型池 / 抽特型池 [次数] | 建造 |
| alb.轻型池 / 重型池 / 特型池 | 查看池内容与出货率 |
| alb.抽卡记录 | 查看个人建造统计 |
| alb.收藏率排行榜 | 查看收藏率排行 |

## 出货率

| 稀有度 | 轻型 | 重型 / 特型 |
| --- | --- | --- |
| 海上传奇 | — | 1.2% |
| 超稀有 | 7% | 7% |
| 精锐 | 12% | 12% |
| 稀有 | 26% | 51% |
| 普通 | 55% | 28.8% |

需要 Koishi 的 database 和 puppeteer 服务。

## 许可证

可按 [Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 使用。
