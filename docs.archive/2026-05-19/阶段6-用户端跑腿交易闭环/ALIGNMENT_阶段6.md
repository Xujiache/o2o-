# 阶段 6 — 用户端跑腿交易闭环 · 对齐文档(ALIGNMENT)

> 严格遵循 `项目阶段规划/06-阶段6-用户端-跑腿交易闭环/` 9 份文档。
> 强约束:外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。
> 商家端在本阶段不出现任何跑腿处理入口。

## 1. 项目上下文(已落地资产 — 可复用)

### 1.1 仓库与技术栈

- monorepo:`apps/server`(NestJS 10 + TypeORM)、`apps/customer-app`(uni-app + Vue 3)、`apps/admin-web`(Vue 3 + ElementPlus)
- 通用包:`packages/shared-types`、`packages/utils`
- 测试:server jest 510 / customer-app vitest 49 / admin-web vitest 62 = **716** 全绿
- 当前 HEAD = 989644e(stage 5 完整交付 32/32)
- 阶段 1-5 累计:33 EventName / 23 jobs / 45 modules / 21 customer-app pages

### 1.2 与阶段 6 强相关的复用基线

| 资产                                  | 来源      | 复用方式                                                        |
| ------------------------------------- | --------- | --------------------------------------------------------------- |
| `payment` 模块(prepay+handleCallback) | stage 5   | 直接复用,bizType 已支持 `'FOOD' \| 'ERRAND'`                    |
| `payment_order` 表                    | stage 5   | 直接复用,biz_type 字段区分                                      |
| `wxpay` / `alipay` adapter            | stage 5   | 直接复用 PrepayResult.payParams + parseCallback                 |
| `track-query` 模块                    | stage 5   | 直接复用骨架,新增 errand 任务的轨迹查询                         |
| `rider-task-pool` 模块                | stage 3+5 | 已扩展扫 READY_FOR_PICKUP food_order;本阶段再扩展扫 errand_task |
| `EventName.PaymentSucceeded`          | stage 5   | 直接复用,bizType=`ERRAND` 即可                                  |
| `BaseJob` + DistributedLockService    | stage 0   | 4 个 stage 6 jobs 直接基于此基类                                |
| 装饰器 `@Idempotent` / `@Audit`       | stage 0+1 | 全部跑腿写接口直接用                                            |
| `customer-app` 全局 layout/router     | stage 1   | 直接接入跑腿入口/页面                                           |
| `admin-web` AuthGate/dictStore        | stage 4   | 直接接入跑腿监控页(若决定建)                                    |

### 1.3 用户全局规则(CLAUDE.md / memory)

- O2O 严格遵循规划文档 — 不漏不多,所有产物必须可反查到 `项目阶段规划/`
- MySQL 端口 3307(主机 3306 被 Windows MySQL 占用)
- 6A 流程 + 测试优先 + 文档同步

## 2. 原始需求(摘自规划)

### 2.1 阶段目标

完成用户端小程序 / Android APP / iOS APP 的跑腿入口、四类跑腿表单、报价、支付、订单、轨迹、加急、备注和售后入口。

### 2.2 业务范围(用户端为主)

- 跑腿入口独立,与外卖数据隔离。
- 代买、代送、代办、自定义跑腿 4 类。
- 预算、垫付上限、图片上传、重量、紧急度、预约、专人直送。
- 违禁品提示、基础费、距离费、加急费、实报实销。
- 跑腿订单状态、3 分钟无骑手加价推送、10 分钟无人取消、轨迹、加急、补充备注、售后入口。

### 2.3 后端模块(7 个)

- errand-type — 跑腿类型配置
- errand-pricing — 计价规则与报价
- errand-order — 订单(报价/提交/详情/加急/备注)
- payment(复用 stage 5)
- errand-dispatch — 调度池(扫 errand_task 推骑手)
- prohibited-item — 违禁品库
- track-query(复用 stage 5)

### 2.4 数据表(8 张新)

errand_order / errand_order_detail / errand_quote / errand_attachment / errand_price_snapshot / errand_task / prohibited_item / errand_timeline

### 2.5 c 端接口(7 个,严格按契约清单)

| Method | Path                                     | 页面         |
| ------ | ---------------------------------------- | ------------ |
| GET    | /api/v1/c/errand/service-types           | 跑腿首页     |
| POST   | /api/v1/c/errand/quotes                  | 跑腿报价页   |
| POST   | /api/v1/c/errand/orders                  | 报价确认页   |
| GET    | /api/v1/c/errand/orders/{orderId}        | 跑腿订单详情 |
| POST   | /api/v1/c/errand/orders/{orderId}/urgent | 加急弹窗     |
| PATCH  | /api/v1/c/errand/orders/{orderId}/remark | 补充备注弹窗 |
| GET    | /api/v1/c/errand/orders/{orderId}/track  | 轨迹页       |

### 2.6 领域事件(6 个新)

ErrandQuoteCreated / ErrandOrderCreated / ErrandPaid / ErrandPriceIncreased / ErrandNoRiderCancelled / ErrandRemarkAdded

### 2.7 定时任务(4 个新)

- 15 min 未支付自动关单
- 3 min 无骑手接单自动加价推送
- 10 min 无人接单自动取消并全额退款
- 预约跑腿到点入调度池

### 2.8 前端页面(用户端 14 个)

跑腿首页 / 代买表单 / 代送表单 / 代办表单 / 自定义需求页 / 地址选择 / 图片上传 / 报价页 / 支付页(复用) / 订单列表 / 订单详情 / 轨迹页 / 加急弹窗(详情内嵌) / 补充备注弹窗(详情内嵌) / 售后入口(复用 stage 5 stub)

### 2.9 骑手端 / 平台 Web

- 骑手端:rider-task-pool 扫 errand_task 返简化任务卡(只读),完整接单在 stage 8。
- 平台 Web:跑腿订单查询、计价规则、违禁品配置、异常监控(需用户拍板是否本阶段建,见 A4)。

## 3. 边界确认

### 3.1 必须做(规划明确)

- 7 后端模块 + 8 数据表 + 7 c 端接口 + 6 事件 + 4 jobs(全部明确写入规划文档)
- 4 类跑腿表单(BUY/DELIVER/HELP/CUSTOM)
- 用户端 14 页(规划列表已含)
- 骑手端 task-pool 扩展(规划"骑手 Android/iOS APP 跑腿任务卡片联调")

### 3.2 不做(规划明确)

- 真支付凭证(stage 8 接 wxpay/alipay 真模式,本阶段沿用 stage 5 MockAdapter)
- 完整接单/取餐/送达流程(stage 8 强化)
- 真售后流程(stage 7 接,本阶段仅入口)
- 商家端跑腿入口(本阶段商家端不参与)
- 真高德路线规划(stage 8 接,本阶段轨迹简化为起点+终点+eta 直线)
- 真 sms 提醒(stage 11 接)

### 3.3 与外卖订单的强隔离

| 维度       | 外卖(stage 5)                  | 跑腿(stage 6)                                               |
| ---------- | ------------------------------ | ----------------------------------------------------------- |
| 订单表     | food_order                     | errand_order                                                |
| 订单号前缀 | yyyyMMdd + 6 位                | E + yyyyMMdd + 6 位                                         |
| 状态机     | WAIT_PAY → PAID → ...          | WAIT_PAY → PAID → DISPATCH → PICKED → DELIVERED + CANCELLED |
| 计价       | 商品总价 + 配送费              | 基础费 + 距离费 + 加急费 + 垫付                             |
| 退款       | 商家未接 / 用户取消            | 10 min 无人接 / 用户取消                                    |
| 复用层     | payment_order(biz_type='FOOD') | payment_order(biz_type='ERRAND')                            |
| 不复用     | cart / food_review             | 跑腿无购物车、无评价(stage 8?)                              |

## 4. 关键决策清单(请用户拍板)

> 以下 6 项标注 **(需用户拍板)** 的决策直接影响接口/页面增减,请逐项确认。
> 默认推荐方案与 stage 5 同款套路保持一致(已经在 stage 5 验证过)。

### A1. 跑腿订单列表接口 **(需用户拍板)**

**问题**: 规划契约清单只有 7 个 c 端接口,**没有 GET /c/errand/orders 列表接口**。但前端"跑腿订单列表页"(规划页面清单第 9 项)必须从某处拉取数据。

**方案对比**:

- **甲方案(推荐)**: 本阶段新增 `GET /api/v1/c/errand/orders` 列表(与 stage 5 `/c/food/orders` 平行),支持 `status` tab 筛选 + 分页。理由:不能让前端页面"无接口可调"。
- **乙方案**: 不新增,前端订单列表页只展示从订单详情进入的单订单 — 不可行,违反"列表页"基本语义。

**推荐**: 甲方案。stage 5 同样补齐了 c 端列表/取消/评价 3 接口(用户拍板的 A1)。

---

### A2. 跑腿用户主动取消接口 **(需用户拍板)**

**问题**: 状态机有"15 min 未支付自动关单 / 10 min 无人接单自动取消",但**用户在 WAIT_PAY 期主动取消**没有显式接口。

**方案对比**:

- **甲方案(推荐)**: 新增 `POST /api/v1/c/errand/orders/{id}/cancel`,仅限 WAIT_PAY 状态用户主动取消。理由:常识体验 + stage 5 同款。
- **乙方案**: 仅靠 15 min job 关单,用户不能主动取消 — 体验差。

**推荐**: 甲方案。

---

### A3. 跑腿售后入口 **(需用户拍板)**

**问题**: 规划"售后入口"页面 — 是建独立 `pages/me/errand-aftersales-stub.vue`,还是复用 stage 5 的 `pages/me/aftersales-stub.vue`?

**方案对比**:

- **甲方案(推荐)**: 复用 stage 5 占位页(同一售后入口,stage 7 接真售后时统一处理)。
- **乙方案**: 跑腿独立售后页 — 增加冗余,stage 7 还要再合并。

**推荐**: 甲方案。

---

### A4. 平台 Web 跑腿监控页 **(需用户拍板)**

**问题**: 阶段规划明确"平台 Web:跑腿订单查询、计价规则、违禁品配置、异常监控",但**契约清单 7 个接口都是 c 端,没有 admin 接口**。是否本阶段补?

**方案对比**:

- **甲方案(推荐)**: 补 3 个 admin 接口(`GET /admin/errand-orders`、`GET /admin/errand-orders/{id}`、`GET /admin/errand-orders/stats`)+ 1 监控页(`/admin/errand-orders` + 详情抽屉)。与 stage 5 admin-food-orders 完全平行。
- **乙方案**: 计价规则与违禁品配置 admin 入口 — 推迟到 stage 9(平台运营)。

**推荐**: 甲方案(仅监控页 + 3 接口),计价规则与违禁品配置仍走 prohibited_item 表静态配置(无管理界面),stage 9 再补 admin 配置页。理由:stage 5 同样按"每阶段补对应监控页"套路。

---

### A5. quote 缓存策略 **(需用户拍板)**

**问题**: 跑腿报价 quote 是否走 stage 5 同款 `5 min Redis SETEX + DB 双写`?

**方案对比**:

- **甲方案(推荐)**: 5 min Redis SETEX(`errand:quote:<quoteId>`) + DB 双写(errand_quote 表)。提交订单时校验 quoteId 未过期 + amount 一致。
- **乙方案**: 仅 DB 不缓存,提交时重算。性能略差但简单。

**推荐**: 甲方案。与 stage 5 preview snapshot 完全一致。

---

### A6. 跑腿 4 类配置策略 **(需用户拍板)**

**问题**: BUY/DELIVER/HELP/CUSTOM 4 类的 `requiredFields` 差异如何配置?

**方案对比**:

- **甲方案(推荐)**: errand_type 表配置驱动 — typeCode + name + requiredFields(JSON 字段名数组) + enabled。seed 4 条记录:
  - `BUY` 代买:requiredFields=`["pickupAddress","deliveryAddress","budget","itemDesc"]`
  - `DELIVER` 代送:requiredFields=`["pickupAddress","deliveryAddress","weight","itemDesc"]`
  - `HELP` 代办:requiredFields=`["deliveryAddress","taskDesc","budget"]`
  - `CUSTOM` 自定义:requiredFields=`["taskDesc","budget"]`(其它字段全可选)
- **乙方案**: 4 类硬编码在 service 层 — 后续修改要改代码。

**推荐**: 甲方案(配置驱动,与 stage 4 sys-dict / category 套路一致)。

## 5. 自动决策(无需拍板,沿用 stage 5 套路)

| ID   | 决策                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 6.1  | 全部新表 BIGINT 时间戳 + 主键 `<table>_id`                                                                  |
| 6.2  | EventName 命名 `domain.errand.<verb>` / `domain.errand-quote.<verb>` 等                                     |
| 6.3  | orderNo 规则 = `E` + yyyyMMdd + redis incr daily 6 位                                                       |
| 6.4  | 复用 stage 5 PaymentSucceededPayload(bizType='ERRAND'),不新增支付事件                                       |
| 6.5  | 跑腿状态机:WAIT_PAY → PAID → DISPATCHING → ASSIGNED → PICKED_UP → DELIVERED → COMPLETED + CANCELLED         |
| 6.6  | quote 5 min Redis SETEX + DB 双写;提交时校验 quoteId 未过期 + amount 一致                                   |
| 6.7  | callback 走 stage 5 已建的 POST /callback/{wxpay,alipay}(bizType='ERRAND' 路由到 ErrandPaidSubscriber)      |
| 6.8  | 4 jobs 每 30s/1min 扫 + DistributedLock(与 stage 5 同基类)                                                  |
| 6.9  | 装饰器 `@Idempotent` + `@Audit` 全部跑腿写接口默认开                                                        |
| 6.10 | 违禁品命中规则:quote 接口扫 itemDesc/taskDesc 关键词命中 prohibited_item.keyword,返 prohibitedWarnings 数组 |
| 6.11 | 加急规则:urgentLevel ∈ {standard, fast, express},标准 0 元 / 快 5 元 / 急 10 元(可配置 errand_pricing)      |
| 6.12 | 3 min 无骑手加价推送 = job 写 errand_dispatch.priceIncrease + push,不自动扣款,需用户加急确认                |
| 6.13 | 10 min 无人接单 = job 触发 ErrandNoRiderCancelled → ErrandRefundSubscriber(payment.refund mock)             |
| 6.14 | 售后入口直接路由到 stage 5 已建的 `/pages/me/aftersales-stub`                                               |
| 6.15 | 真支付凭证 / 真高德路线 / 真 sms 全部 mock(沿用 stage 5 决策)                                               |

## 6. 疑问澄清(本阶段无 P0 阻塞)

`项目阶段规划/06-.../问题与风险记录.md` 的 P0/P1/P2 全部"暂无";本阶段决策点已在 § 4 列清,等用户拍板。

## 7. 完成定义(本阶段)

- [ ] 7 后端模块 + 8 表 + 7+1+1 c 端接口 + 6 事件 + 4 jobs + 3 admin 接口(若 A4 取甲)全部落地
- [ ] 用户端 14 页 + 7 api + stores 全部落地
- [ ] 平台 Web 1 监控页(若 A4 取甲)
- [ ] 骑手 task-pool 扩展扫 errand_task
- [ ] server jest 测试新增 ≥130 用例(对齐 stage 5 +139 节奏)
- [ ] customer-app vitest + admin-web vitest 全绿
- [ ] 全部 P0/P1 清零
- [ ] `手动审查与测试.md` 由人审填写
- [ ] FINAL*阶段6.md / TODO*阶段6.md / ACCEPTANCE\_阶段6.md 三件套交付
