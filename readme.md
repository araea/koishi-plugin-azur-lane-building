koishi-plugin-azur-lane-building
================================

[<img alt="github" src="https://img.shields.io/badge/github-araea/azur_lane_building-8da0cb?style=for-the-badge&labelColor=555555&logo=github" height="20">](https://github.com/araea/koishi-plugin-azur-lane-building)
[<img alt="npm" src="https://img.shields.io/npm/v/koishi-plugin-azur-lane-building.svg?style=for-the-badge&color=fc8d62&logo=npm" height="20">](https://www.npmjs.com/package/koishi-plugin-azur-lane-building)

Koishi 的碧蓝航线建造（抽卡）模拟器插件。

## 使用

1. `alb.每日魔方` 领取魔方。
2. `alb.抽轻型池 [次数]` 开始建造。

## 指令

| 指令 | 说明 |
| --- | --- |
| `alb.每日魔方` | 每天领一次魔方 |
| `alb.抽轻型池 / 抽重型池 / 抽特型池 [次数]` | 建造 |
| `alb.轻型池 / 重型池 / 特型池` | 查看该池的舰船与出货率 |
| `alb.抽卡记录` | 查看自己的建造统计 |
| `alb.收藏率排行榜` | 查看收藏率排行榜 |

## 出货率

| 稀有度 | 轻型 | 重型 / 特型 |
| --- | --- | --- |
| 海上传奇 | — | 1.2% |
| 超稀有 | 7% | 7% |
| 精锐 | 12% | 12% |
| 稀有 | 26% | 51% |
| 普通 | 55% | 28.8% |

## 补充

* 建造清单可在配置项里手动更新（[参考](https://wiki.biligame.com/blhx/index.php?title=%E5%BB%BA%E9%80%A0%E6%A8%A1%E6%8B%9F%E5%99%A8&action=edit)）
* 舰娘台词从 wiki 抓取并缓存，未命中缓存时先用内置台词顶上，不会拖慢回复；
  不需要的话可以在配置里关掉

## 致谢

* [Koishi](https://koishi.chat/)
* [RainSun](https://forum.koishi.xyz/t/topic/6427/21)
* [碧蓝航线建造模拟器](https://wiki.biligame.com/blhx/%E5%BB%BA%E9%80%A0%E6%A8%A1%E6%8B%9F%E5%99%A8)


## QQ 群

* 956758505

<br>

#### License

<sup>
Licensed under either of <a href="LICENSE-APACHE">Apache License, Version
2.0</a> or <a href="LICENSE-MIT">MIT license</a> at your option.
</sup>

<br>

<sub>
Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this crate by you, as defined in the Apache-2.0 license, shall
be dual licensed as above, without any additional terms or conditions.
</sub>
