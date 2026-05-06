# 阶段 9 — 平台管理端 Web · 调度售后运营财务 · 共识(CONSENSUS)

## 1. 共识范围(锁定)

### 1.1 后端 9 模块

- **新建** 6:admin-refund / marketing / finance / dashboard / export / risk
- **扩展(既有 stage 5/6/7/8 模块)** 4:admin-food-order(扩 + export 按钮)/ admin-errand-order(同)/ admin-after-sale(扩 arbitrate)/ admin-dispatch(扩 manual assign)
- 实际新建 6 模块,含 admin-order(实为 admin-food-order/errand-order 已有,故不新建独立 admin-order — 用 export 代替)

### 1.2 数据表 10 张(全新建)

1. `dispatch_rule` — 调度规则(智能调度配置)
2. `manual_dispatch_log` — 人工派单流水
3. `after_sale_arbitration` — 售后仲裁记录
4. `refund_order` — 退款单
5. `coupon_rule` — 优惠券规则
6. `points_rule` — 积分规则(占位)
7. `rate_rule` — 费率规则
8. `dashboard_snapshot` — 数据大屏快照
9. `export_task` — 导出任务
10. `risk_exception_log` — 异常订单日志(替代规划中的 admin_order_query — 后者实为查询索引,无独立表语义)

### 1.3 接口 10 个(7 契约 + 3 推断)

1. `GET /api/v1/admin/food-orders/export` — 异步导出(契约+扩展)
2. `GET /api/v1/admin/errand-orders/export` — 异步导出(扩展)
3. `POST /api/v1/admin/dispatch/tasks/:taskId/assign` — 人工派单
4. `POST /api/v1/admin/after-sales/:afterSaleId/arbitrate` — 售后仲裁
5. `POST /api/v1/admin/marketing/coupons` — 发布优惠券
6. `PATCH /api/v1/admin/rate-rules` — 费率配置
7. `GET /api/v1/admin/dashboard/overview` — 数据大屏
8. `POST /api/v1/admin/exports` — 创建导出任务
9. `GET /api/v1/admin/exports/:id` — 查询/下载
10. `GET /api/v1/admin/risk/exceptions` — 异常订单列表

> 注:food-orders / errand-orders 列表本身复用 stage 5/6 既有 GET。

### 1.4 events 7 个 + jobs 6 个

- events:ManualDispatchCreated / OrderReassigned / ArbitrationCompleted / RefundExecuted / CouponPublished / RateRuleChanged / ReportGenerated
- jobs:risk-exception-scan(每 5min)/ dashboard-snapshot-generate(每日 00:30)/ export-task-process(每 30s)/ coupon-expire(每日 00:00)/ marketing-activity-toggle(每 1min)/ reconciliation(每日 03:30)

### 1.5 admin-web 平台 Web 页面(7 新 + 4 既有页面扩按钮)

- 新建:`marketing/coupons`(优惠券管理)/ `rate-rules`(费率配置)/ `refunds`(退款执行)/ `exceptions`(异常订单)/ `dashboard`(数据大屏)/ `exports`(报表导出中心)/ `dispatch-rules`(调度规则)
- 扩按钮:`food-orders` 加 export / `errand-orders` 加 export / `after-sales` 加 仲裁 / `dispatch`(stage 8 既有)加 人工派单
- 不在本阶段做:积分 / 秒杀 / 拼团 / banner / 弹窗 / 投诉举报 / 评价审核(规划文档列页名但无接口契约,延后)

### 1.6 sys_permission 新增 ≥ 8

- admin:dispatch:manage / admin:after:sales:manage / admin:marketing:manage / admin:rate:rules:manage / admin:dashboard:view / admin:export:manage / admin:refund:manage / admin:risk:view

## 2. 验收标准

### 2.1 功能

- [x] 6 新模块齐全,4 既有模块新增 method 接口
- [x] 10 表 entity + migration 一次落库
- [x] 10 接口 200 OK + 状态/审计/幂等/权限齐
- [x] 7 events + 7 subscribers spec
- [x] 6 jobs + spec
- [x] 7 admin-web 新页 + 4 扩按钮

### 2.2 测试

- jest ≥ 787(+30:每模块 ≥3 spec)
- admin-web vitest ≥ 97(+10:每新页 1+ 用例)
- 4 闸门绿

### 2.3 文档

- ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE/FINAL/TODO 7 份齐全
- 项目阶段规划/09-.../手动审查与测试 / 问题与风险记录 / 阶段交付清单 三表落地

## 3. 不确定性已解决

| 原疑问                                    | 解决方式                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Q1 export 接口契约是否做?                 | 做 — POST /admin/exports + GET /admin/exports/:id(必备承载 export_task) |
| Q2 risk 接口契约?                         | 做 — GET /admin/risk/exceptions(必备承载 risk_exception_log)            |
| Q3 marketing 子模块边界?                  | 仅 coupon 接口实现完整,points_rule 仅占位表(后期扩),其余页面延后        |
| Q4 既有 admin-order 模块是否新建?         | 否,复用 stage 5/6 admin-food-order/errand-order                         |
| Q5 admin_order_query 是否建表?            | 否 — 视为查询索引,改建 risk_exception_log                               |
| Q6 商家 Web/小程序边界?                   | 严格不做(规划文档红线)                                                  |
| Q7 既有 stage 5/6/7/8 admin 接口是否重做? | 否,仅扩字段或新增 controller method                                     |
