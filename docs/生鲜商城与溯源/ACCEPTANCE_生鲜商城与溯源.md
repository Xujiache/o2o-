# ACCEPTANCE — 生鲜商城与溯源

> 阶段:6A · Assess(评估阶段)
> 创建:2026-05-13;更新:2026-05-14
> 上游: Wave1-7 全部落地

---

## 一、整体执行结果

### 1.1 阶段与交付

| 阶段           | 输出                                                                            | 状态 |
| -------------- | ------------------------------------------------------------------------------- | ---- |
| Align          | ALIGNMENT + CONSENSUS 文档                                                      | ✅   |
| Architect      | DESIGN 文档(架构图 + 完整 DDL + API 契约 + 序列图)                              | ✅   |
| Atomize        | TASK 文档(23 个原子任务 + 依赖图)                                               | ✅   |
| Approve        | 用户审批通过                                                                    | ✅   |
| Automate Wave1 | 9 entity + 2 migration + 类型联动 + 归档 SQL                                    | ✅   |
| Automate Wave2 | 商城主链(pickup-point/grocery-product/grocery-order/payment GROCERY/expire job) | ✅   |
| Automate Wave3 | pickup-verify + grocery-weigh + payment 差价分支                                | ✅   |
| Automate Wave4 | trace(批次/QR/节点/扫码 + HMAC)                                                 | ✅   |
| Automate Wave5 | customer-app UI(双入口 + 商城 10 页 + 扫一扫)                                   | ✅   |
| Automate Wave6 | merchant-app + admin-web UI                                                     | ✅   |
| Automate Wave7 | 外卖路由 410 middleware + 单测 + 阶段清单                                       | ✅   |
| Assess         | 本文档 + FINAL/TODO 更新                                                        | ✅   |

### 1.2 Git 里程碑

- `fbcc5c3` feat: backend Wave1-4 — 生鲜商城/自提/称重/核销/溯源全链路
- `9d1fa81` feat: UI Wave5-6 — 客户端商城/扫一扫 + 商家称重核销 + 后台溯源中心
- 待:Wave7 收尾 commit(本次会带 food 410 middleware + 单测 + 阶段清单 + FINAL)

---

## 二、功能验收清单

### 2.1 客户端

- [x] 首页双入口"生鲜商城 / 跑腿服务",移除外卖
- [x] 商品列表(分类筛选/搜索/排序)
- [x] 商品详情:fixed 显示份数;weighed 显示单价 ¥X.XX/斤 + 100g 步进重量选择器(在 minWeightG~maxWeightG 之间)
- [x] 购物车(localStorage 持久化)
- [x] 自提点列表(按距离排序)+ 详情
- [x] 结算:选自提点 + 时段(7 天 chip + 时段 grid;过滤 remain>0 与未来 30 分钟内)
- [x] preview → submit → prepay 一气呵成,前端不算价
- [x] 订单列表 + 详情;详情 PAID_WAIT_PICKUP 状态展示 6 位提货码大字 + QR
- [x] DIFF_PAYING 状态展示差价补付卡片,点击调同一 prepay(后端识别)
- [x] 实际称重三栏对比(预估/实际/实付)
- [x] 我的订单 Tab 分商城/跑腿
- [x] 扫一扫入口,扫码后跳溯源详情时间轴

### 2.2 商家端

- [x] 工作台快捷:今日待发货 / 待核销 / 已核销
- [x] 商品 CRUD(fixed/weighed 两套表单 + 封面上传)+ 上下架 + 库存调整
- [x] 自提点 CRUD,支持 chooseLocation
- [x] 时段批量配置(N 天 × M 段,按周复制)
- [x] 核销:扫码 + 6 位手输 + 流水
- [x] 称重:逐项录克数 + 实时小计
- [x] 确认结算 → AUTO_DONE / AUTO_REFUND / NEEDS_DIFF_PAY 分流
- [x] 差价等待页 5s 轮询 + finalize 按钮
- [x] 备货清单聚合视图

### 2.3 平台后台

- [x] 溯源中心菜单组 4 子菜单
- [x] 批次列表 / 新建 / 详情(异步生成进度条 + CSV 下载)
- [x] QR 扫码枪定位(autoFocus + mono + 历史 10 条)
- [x] QR 详情双时间轴(QR 高亮 + 批次淡灰)
- [x] 节点录入(批次/QR 双维度 + 附件)
- [x] 批次扫码统计

### 2.4 后端

- [x] 9 张新表迁移
- [x] product/cart_item 字段扩展(向后兼容)
- [x] payment GROCERY 主单 + 差价双阶段支付
- [x] 提货码 sha256(code+salt)
- [x] 核销限频 5/min + 防重 5s
- [x] 称重 ±10% 容差 + 自动多退少补
- [x] 溯源 HMAC-SHA256 短签 16chr 验签
- [x] 同 IP 扫码 30/min 限流
- [x] 超时未付订单 15 分钟自动取消 + 回滚库存 + 释放时段
- [x] 外卖路由 410 middleware(可通过 FOOD_ROUTES_GONE=false 暂关)

---

## 三、非功能验收

| 项                           | 标准                                   | 实测                                         |
| ---------------------------- | -------------------------------------- | -------------------------------------------- |
| TS 编译                      | server + 4 端 0 错                     | ✅ 全过                                      |
| 跑腿回归                     | errand-\* 与 rider-app 零改动          | ✅ git diff 不含 errand-/rider- 任何产品代码 |
| payment FOOD/ERRAND 既有分支 | 行为不变                               | ✅ 仅新增 GROCERY case                       |
| 金额单位                     | 全 bigint 分                           | ✅                                           |
| 时间单位                     | 全 bigint ms                           | ✅                                           |
| SchedulerModule 约束         | 不 import EventsModule                 | ✅                                           |
| 敏感配置                     | 走 .env(PICKUP_CODE_SALT/TRACE_SECRET) | ✅(实际值用户配置)                           |
| 单测覆盖                     | 4 个核心 service spec                  | ✅ Wave7 落地                                |

---

## 四、风险与遗留(从 TODO 拷贝并更新)

### 4.1 部署期必须做(用户)

1. 配 `.env`:`PICKUP_CODE_SALT` `TRACE_SECRET`(32+ 随机串)
2. `pnpm typeorm migration:run`
3. 验证一遍 demo 链路 + 跑腿回归
4. 90 天后执行 `deploy/sql/rename-food-tables.sql` 归档外卖旧表

### 4.2 可选增强

- 安装 `qrcode` + `archiver` 启用 ZIP/PDF 二维码后端打包
- 优惠券对生鲜的折扣计算接入 preview(目前 discount 始终 0)
- e2e 完整 happy path 自动化用例

---

## 五、自审结果

按 CLAUDE.md 质量门控:

- 所有需求已实现 ✅
- 验收标准全部满足 ✅(以本清单为准)
- 项目编译通过 ✅
- 单元测试基本覆盖 ✅
- 实现与设计文档一致 ✅
- 现有系统集成良好 ✅
- 未引入技术债(已知项均记录) ✅
