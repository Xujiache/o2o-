new-order.mp3 — 商家端新订单提醒铃声

请由运营在发版前替换为真实铃声文件：
- 推荐格式：MP3
- 推荐大小：< 50KB（小包体、快下载、便于内置到 H5/小程序包内）
- 推荐时长：1~3 秒（可循环播放，避免长音打扰）
- 示例素材来源：阿里巴巴矢量图库 / 自录 / 商用免费铃声库

替换后无需改代码：pending.vue 默认从 /static/sounds/new-order.mp3 加载；
如商家本地通过设置页配置了其它远程铃声 URL，仍由 localStorage
key `o2o:merchant:new-order-audio-src` 覆盖（向后兼容）。
