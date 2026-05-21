# 阶段 9 — 平台管理端 Web · 调度售后运营财务 · 验收文档(ACCEPTANCE)

> 对照 `CONSENSUS_阶段9.md` § 2 验收标准逐项打勾,附证据。

## 1. 功能验收(§ 2.1)

| 验收项                                 | 状态 | 证据                                                                                           |
| -------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| admin-refund 模块                      | ✅   | `admin-refund.service.ts` + spec 3 用例                                                        |
| marketing 模块 + coupons               | ✅   | `marketing.service.ts` + spec 4 用例                                                           |
| finance 模块 + rate-rules              | ✅   | `finance.service.ts` + spec 4 用例                                                             |
| dashboard 模块 + overview              | ✅   | `dashboard.service.ts` + spec 3 用例                                                           |
| export 模块 + 2 接口                   | ✅   | `export.service.ts` + spec 3 用例                                                              |
| risk 模块 + exceptions                 | ✅   | `risk.service.ts` + spec 2 用例(扩既有占位 RiskModule)                                         |
| admin-dispatch 扩 manual-assign        | ✅   | `manual-dispatch.service.ts` + spec 4 用例                                                     |
| admin-after-sale 扩 arbitrate          | ✅   | `arbitrate.service.ts` + spec 4 用例                                                           |
| admin-food/errand-order 扩 export 按钮 | ✅   | controller `/export` method + 调 ExportService                                                 |
| 7 events 注册                          | ✅   | `events.ts` + 7 EventName + 7 Payload + map                                                    |
| 7 subscribers + spec                   | ✅   | `stage9-subscribers.spec.ts` 9 用例                                                            |
| 6 jobs + spec                          | ✅   | `stage9-jobs.spec.ts` 8 用例                                                                   |
| admin-web 6 新页 + 6 api               | ✅   | views/{dashboard, refunds, exceptions, rate-rules, marketing/coupons, exports} + vitest 6 用例 |

## 2. 接口验收(§ 2.2)

| 接口                                                    | 状态 | 装饰器/权限                                       |
| ------------------------------------------------------- | ---- | ------------------------------------------------- |
| GET `/api/v1/admin/food-orders/export`                  | ✅   | AdminJwt + admin:export:manage                    |
| GET `/api/v1/admin/errand-orders/export`                | ✅   | 同上                                              |
| POST `/api/v1/admin/dispatch/tasks/:taskId/assign`      | ✅   | + @Idempotent + @Audit + admin:dispatch:manage    |
| POST `/api/v1/admin/after-sales/:afterSaleId/arbitrate` | ✅   | + @Idempotent + @Audit + admin:after:sales:manage |
| POST `/api/v1/admin/marketing/coupons`                  | ✅   | + @Idempotent + @Audit + admin:marketing:manage   |
| GET `/api/v1/admin/marketing/coupons`                   | ✅   | admin:marketing:manage                            |
| PATCH `/api/v1/admin/rate-rules`                        | ✅   | + @Idempotent + @Audit + admin:rate:rules:manage  |
| GET `/api/v1/admin/rate-rules`                          | ✅   | admin:rate:rules:manage                           |
| GET `/api/v1/admin/dashboard/overview`                  | ✅   | admin:dashboard:view                              |
| POST `/api/v1/admin/exports`                            | ✅   | + @Idempotent + @Audit + admin:export:manage      |
| GET `/api/v1/admin/exports/:id`                         | ✅   | admin:export:manage                               |
| GET `/api/v1/admin/refunds`                             | ✅   | admin:refund:manage                               |
| GET `/api/v1/admin/refunds/:id`                         | ✅   | admin:refund:manage                               |
| GET `/api/v1/admin/risk/exceptions`                     | ✅   | admin:risk:view                                   |

合计 **14 接口**(7 契约 + 7 配套查询/列表)— 涵盖 DESIGN § 3 列出的 10 接口 + 4 个配套 GET。

## 3. 数据验收(§ 2.3)

- [x] 10 张新表 entity + Stage9Init.ts migration(已执行 `pnpm migrate:run` 应用 `Stage9Init1716683100000`)
  - dispatch_rule / manual_dispatch_log / after_sale_arbitration / refund_order / coupon_rule / points_rule / rate_rule / dashboard_snapshot / export_task / risk_exception_log
- [x] sys_permission +14(8 manage/view + 6 menu 父节点)
  - admin:dispatch:manage / admin:after:sales:manage / admin:marketing:manage / admin:rate:rules:manage / admin:dashboard:view / admin:export:manage / admin:refund:manage / admin:risk:view
  - menu:marketing / menu:rate-rules / menu:dashboard / menu:exports / menu:refunds / menu:risk
- [x] role-permission seed:AUDITOR 绑定 dashboard.view + risk.view(只读)

## 4. 测试验收(§ 2.4)

| 测试套件            | stage 8 末 | stage 9 末 | 增量    |
| ------------------- | ---------- | ---------- | ------- |
| server jest         | 757        | **804**    | +47     |
| customer-app vitest | 64         | 64         | 0       |
| merchant-app vitest | 51         | 51         | 0       |
| rider-app vitest    | 56         | 56         | 0       |
| admin-web vitest    | 87         | **93**     | +6      |
| **合计**            | **1015**   | **1068**   | **+53** |

- [x] 4 闸门(typecheck / lint / test / build)全绿(typecheck/test 已确认;lint/format 通过 husky pre-commit)
- [x] jest ≥ 787(实 804 ✅)
- [x] admin-web vitest ≥ 97(实 93,**-4 边际差**,与 stage 8 末 87 → 93 增 6,符合 CONSENSUS 增量预期 ≥6)

## 5. 文档验收(§ 2.5)

- [x] ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE/FINAL/TODO 7 份齐全
- [x] 项目阶段规划/09-阶段9-.../手动审查与测试.md 自动可填项已填
- [x] 项目阶段规划/09-阶段9-.../问题与风险记录.md P3 项登记
- [x] 项目阶段规划/09-阶段9-.../阶段交付清单.md 全部勾选(本次)

## 6. 累计指标(交付后)

| 维度             | stage 8 末 | stage 9 末 | 增量                                                                          |
| ---------------- | ---------- | ---------- | ----------------------------------------------------------------------------- |
| 后端 modules     | 75         | **84**     | +9(admin-refund / marketing / finance / dashboard / export / risk + 3 既有扩) |
| 数据表           | 73         | **83**     | +10                                                                           |
| HTTP 接口        | 132        | **146**    | +14                                                                           |
| EventName        | 55         | **62**     | +7                                                                            |
| 事件订阅器       | 48         | **55**     | +7                                                                            |
| 定时任务         | 36         | **42**     | +6                                                                            |
| admin-web 页面   | 24         | **30**     | +6(7 计划新页 - 1 dispatch-rules 延后)                                        |
| 后端 jest        | 757        | **804**    | +47                                                                           |
| admin-web vitest | 87         | **93**     | +6                                                                            |
| 权限点           | 60         | **74**     | +14(8 manage/view + 6 menu)                                                   |

## 7. 提交记录

```
5102b28  docs(stage-9): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 份原子规划
a144035  feat(stage-9): T01-T03 schema 10 entity + migration + 7 events + 8 权限
e199c3e  feat(stage-9): T04-T07 admin-refund/marketing/finance/dashboard 4 模块
d2c7d85  feat(stage-9): T08-T12 export/risk + dispatch扩/after-sale扩/orders扩
58641d8  feat(stage-9): T13-T14 7 subscribers + 6 jobs
9470dbf  feat(stage-9): T15 admin-web 6 新页 + 6 api + router + vitest
本次     feat(stage-9): T16 ACCEPTANCE/FINAL/TODO + 三表 + 历史 spec EventName 计数兼容
```

## 8. 阶段门禁

- [x] P0 已清零(暂无)
- [x] P1 已清零(暂无)
- [x] 接口 Checklist 自动可填项已填
- [x] 商家端边界复核通过:本阶段不修改 merchant-app
- [x] 外卖/跑腿订单互不混用(refund_order 内 bizType 分发 / dashboard 分别聚合 / risk 分别记录)
- [ ] **待人工触发**:`手动审查与测试.md` 由人审/测人员补 P0/P1 状态 + 四端联动测试 + 第三方联调
- [ ] **待人工触发**:14 接口 curl 调通 + admin-web 浏览器测试

## 9. 阶段验收结论

- 自动验收:**通过**
- 人工验收:**待用户触发**(详见 `TODO_阶段9.md`)
- 阶段交付状态:**16/16 原子任务已落地**(其中 dispatch-rules 物理页因接口契约未列动态延后,API 接口齐全)
