# 阶段 9 — 平台管理端 Web · 调度售后运营财务 · 对齐文档(ALIGNMENT)

## 1. 项目特性规范

- 技术栈:NestJS 10 + TypeORM + MySQL/Redis/Mongo + admin-web(Vue3 + ElementPlus + Pinia)
- 既有累计:75 modules / 73 tables / 132 接口 / 55 EventName / 36 jobs / 1015 用例
- 4 端 Token 隔离;BIGINT 时间戳 + BIGINT 分;@Idempotent + @Audit + @RequirePermission;Swagger 自动注册
- BaseJob + DistributedLockService;DomainEventBus + Subscriber + try-catch 不阻塞
- 已交付的 stage 5/6/7/8 平台 Web 页面/接口必须复用,不得重做

## 2. 原始需求摘录(对照 项目阶段规划/09-.../)

### 2.1 业务范围(`阶段规划.md` § 业务范围)

- 全量外卖/跑腿订单查询、筛选、日志、售后记录、导出
- 智能调度规则、人工改派、手动派单、异常订单监控
- 售后仲裁、责任判定、退款赔付、违规处罚
- 优惠券、积分、秒杀、拼团、banner、弹窗活动
- 佣金、骑手服务费、提现手续费、结算周期
- 数据大屏、运营报表、服务指标

### 2.2 后端 9 模块(`后端数据任务事件.md`)

admin-order / admin-dispatch / admin-after-sale / admin-refund / marketing / finance / dashboard / export / risk

### 2.3 数据 10 表

admin_order_query / dispatch_rule / manual_dispatch_log / after_sale_arbitration / refund_order / coupon_rule / points_rule / rate_rule / dashboard_snapshot / export_task

### 2.4 jobs 6 个 + events 7 个

- jobs:异常订单扫描 / 报表生成 / 导出任务异步 / 优惠券过期 / 活动开始结束 / 对账任务
- events:ManualDispatchCreated / OrderReassigned / ArbitrationCompleted / RefundExecuted / CouponPublished / RateRuleChanged / ReportGenerated

### 2.5 接口 7 个(`接口契约清单.md`)

1. GET /api/v1/admin/food-orders(全量外卖订单)
2. GET /api/v1/admin/errand-orders(全量跑腿订单)
3. POST /api/v1/admin/dispatch/tasks/{taskId}/assign(人工派单)
4. POST /api/v1/admin/after-sales/{afterSaleId}/arbitrate(售后仲裁)
5. POST /api/v1/admin/marketing/coupons(发布优惠券)
6. PATCH /api/v1/admin/rate-rules(费率配置)
7. GET /api/v1/admin/dashboard/overview(数据大屏)

### 2.6 平台 Web 页面(`前端页面与接口对接.md` § 页面清单)

外卖订单、跑腿订单、订单详情、订单日志、调度监控、人工派单、轨迹回放、异常订单、售后仲裁、退款执行、投诉举报、评价审核、优惠券、积分、活动、banner、费率、结算、提现审核、数据大屏、报表导出 (合计 21 项)

## 3. 边界确认

- **绝对禁止**:商家 Web、商家小程序;外卖/跑腿订单混用;状态机/计价/退款规则跨业务复用
- **本阶段不做**:不替代商家 Android/iOS APP 接单,不替代骑手 APP 配送,不新增需求文档外功能
- **只复用不重做**:已交付的 stage 5/6/7/8 admin 接口与页面(食品订单/跑腿订单/调度监控/轨迹回放/违规/售后/结算/提现/评价/统计)— 本阶段在其上扩字段或新增筛选/导出能力

## 4. 决策清单(A1-A10)

### A1:`/admin/food-orders` 与 stage 5 既有 `/admin/food-orders`关系

- **甲方案(默认)**:复用 stage 5 既有 controller,本阶段补 `userKeyword` `merchantKeyword` `timeRange` 三个筛选字段(如缺失)+ 加导出接口 GET /admin/food-orders/export → 异步 export_task
- 乙:新建 admin-order 模块独占
- **决策:甲**(避免重复造接口;contract 字段以本阶段为准做向上兼容)

### A2:`/admin/errand-orders` 与 stage 6 既有

- **同 A1**,复用 stage 6 既有 + 补字段 + 加 export
- **决策:甲**

### A3:`/admin/dispatch/tasks/{taskId}/assign` (人工派单)

- 路径与 stage 8 既有 `/admin/dispatch-tasks` 不同 — 本阶段新建 admin-dispatch 子模块(在原 admin-dispatch 模块内加 controller method)
- **决策:在 stage 8 既有 `admin-dispatch.controller.ts` 内新增 POST `/admin/dispatch/tasks/:taskId/assign`**;dispatchTask.acceptedRiderId / dispatchedAt 状态切换 + manual_dispatch_log 写流水 + emit ManualDispatchCreated

### A4:`/admin/after-sales/{afterSaleId}/arbitrate` 与 stage 7 既有

- stage 7 已有 `/admin/after-sales` GET 列表 + 处理接口;本阶段新增 POST arbitrate(责任方判定 + 退款金额 + 处罚)
- **决策:在 admin-after-sale 模块内新增 arbitrate**;写 after_sale_arbitration 表 + emit ArbitrationCompleted + 触发 admin-refund 退款

### A5:admin-refund 模块

- **新建独立模块**:实现 refund_order CRUD,退款执行(mock 沿用 stage 11 接真 wxpay)
- emit RefundExecuted

### A6:marketing 模块

- 新建 coupon_rule + points_rule 表 + POST /admin/marketing/coupons + 优惠券过期 job + emit CouponPublished
- **本阶段不做**:积分/秒杀/拼团/banner/弹窗 的「发券」之外的细化(只做 coupon CRUD;积分仅占位 points_rule 表)— 因为接口契约清单只列出 `/admin/marketing/coupons` 单接口;按"不多做"原则只做这一个

### A7:finance 模块(费率)

- rate_rule 表 + PATCH /admin/rate-rules + emit RateRuleChanged
- 影响范围:不追改已结算订单,只对后续生效

### A8:dashboard 模块

- dashboard_snapshot 表(每日 snapshot)+ GET /admin/dashboard/overview 实时聚合
- 报表生成 job 每日 00:30 写 snapshot

### A9:export 模块

- export_task 表 + 内部 enqueue API + 异步 job 处理 + 写 minio + 返回下载链接
- 接口契约清单未明示导出接口 path,本阶段约定:
  - `POST /admin/exports`(创建任务)+ `GET /admin/exports/:id`(查询进度/下载)
  - 业务方触发(food-orders/errand-orders/settlements/withdrawals 等列表页都用这一组接口)

### A10:risk 模块(异常订单)

- 异常订单扫描 job:扫描 stage 5/6 食品/跑腿订单异常状态(超时未配送/重复退款/单店多退)
- GET /admin/risk/exceptions 列表
- 接口契约清单未明示 path,本阶段约定 `/admin/risk/exceptions`

## 5. 决策小结

- 7 接口契约清单中明示 + 必要补充:
  - 既有扩展:food-orders 添 export → 1 新 / errand-orders 添 export → 1 新 / dispatch/assign → 1 新 / after-sales/arbitrate → 1 新
  - 全新模块接口:marketing/coupons → 1 / rate-rules → 1 / dashboard/overview → 1
  - 推断必备:exports 创建 / 查询 → 2(承载 export 模块)/ risk/exceptions → 1
  - **合计本阶段新接口 ≈ 10**(7 契约清单 + 3 推断:exports CRUD 与 risk 列表)

- 数据表 10 张全部新建
- 6 jobs 全部新建
- 7 events 全部新建

## 6. 疑问澄清(基于"自动决策"原则,记录在此)

| ID  | 疑问                                                             | 自动决策                                                                                      |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Q1  | export 接口是否在契约清单内?                                     | 否 — 但模块/数据表明确含 export_task,故推断需配套接口                                         |
| Q2  | risk/异常订单接口?                                               | 同上 — 推断                                                                                   |
| Q3  | 积分/秒杀/拼团/banner/弹窗 是否要写代码?                         | 接口契约清单仅列 marketing/coupons,按"不多做"只占 points_rule 表 + coupon CRUD                |
| Q4  | 数据大屏/报表导出/投诉举报/评价审核/费率/结算/提现审核 这些页面? | 这些页面文字写在前端页面清单里,但只有 dashboard/overview 是契约接口,其余页面用既有 admin 接口 |
| Q5  | admin_order_query 表?                                            | 视为查询索引,本阶段不建物理表,使用 stage 5/6 既有 food_order/errand_order 表 + 索引足够       |

## 7. 验收标准(节选)

- 10 接口全部 200 OK + 状态机正确(冒烟)
- 10 数据表 entity + migration 落地
- 6 jobs 注册 + DistributedLock + spec 测试
- 7 events 注册 + 7 subscribers + spec
- admin-web 新页 ≥ 7(优惠券/活动/费率/退款执行/异常订单/数据大屏/报表导出 — 投诉举报/积分/banner/弹窗 在 stage 9 不做物理页,延后)
- 既有页面扩字段:food-orders / errand-orders / after-sales / dispatch-tasks 各 +1 列(导出按钮 / 仲裁按钮 / 人工派单按钮)
- 4 闸门(lint/format/test/build)全绿
- jest ≥ 757+30 = 787;admin-web vitest ≥ 87+10 = 97

## 8. 项目对齐总结

本阶段严格对照 9 份规划文档逐项实现,除 Q1/Q2/Q3 三处通过"模块明列但接口未列"自动推断的最小补足(exports 2 接口 / risk 1 接口)外,无任何越界。Q3 通过"只做 coupons,不做积分/banner/弹窗"严格限制范围。
