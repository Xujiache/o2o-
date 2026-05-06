# 阶段 9 — 平台管理端 Web · 调度售后运营财务 · 项目总结(FINAL)

## 1. 总览

| 维度           | 数据                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 原子任务       | 16/16                                                                                                                                                           |
| 后端模块       | 6 新 + 4 扩(admin-refund / marketing / finance / dashboard / export / risk + admin-dispatch扩 / admin-after-sale扩 / admin-food-order扩 / admin-errand-order扩) |
| 数据表         | 10 新                                                                                                                                                           |
| HTTP 接口      | 14(7 契约 + 7 配套)                                                                                                                                             |
| 领域事件       | 7 新(EventName 累计 55 → 62)                                                                                                                                    |
| 事件订阅器     | 7                                                                                                                                                               |
| 定时任务       | 6 新                                                                                                                                                            |
| 权限点         | +14(8 manage/view + 6 menu)                                                                                                                                     |
| admin-web 新页 | 6(dispatch-rules 因接口契约未列延后)                                                                                                                            |
| 后端 jest      | 804(stage 8 末 757 → +47)                                                                                                                                       |
| 前端 vitest    | 264(customer 64 / merchant 51 / rider 56 / admin 93)                                                                                                            |
| 总 commit      | 7(5102b28 → 本次)                                                                                                                                               |

## 2. 能力矩阵

| 能力                              | 端       | 入口                                    | 后端                    | 状态 |
| --------------------------------- | -------- | --------------------------------------- | ----------------------- | ---- |
| 退款执行(由仲裁触发,mock SUCCESS) | 后端     | RefundService.createFromArbitration     | admin-refund            | ✓    |
| 退款单查询                        | 平台 Web | /admin/refunds                          | admin-refund            | ✓    |
| 优惠券发布                        | 平台 Web | /admin/marketing/coupons (POST)         | marketing               | ✓    |
| 优惠券列表                        | 平台 Web | /admin/marketing/coupons (GET)          | marketing               | ✓    |
| 费率配置                          | 平台 Web | /admin/rate-rules (PATCH)               | finance                 | ✓    |
| 费率列表                          | 平台 Web | /admin/rate-rules (GET)                 | finance                 | ✓    |
| 数据大屏                          | 平台 Web | /admin/dashboard/overview               | dashboard               | ✓    |
| 创建导出任务                      | 平台 Web | /admin/exports (POST)                   | export                  | ✓    |
| 导出查询/下载                     | 平台 Web | /admin/exports/:id (GET)                | export                  | ✓    |
| 异常订单监控                      | 平台 Web | /admin/risk/exceptions                  | risk                    | ✓    |
| 人工派单                          | 平台 Web | /admin/dispatch/tasks/:id/assign        | admin-dispatch (扩)     | ✓    |
| 售后仲裁                          | 平台 Web | /admin/after-sales/:id/arbitrate        | admin-after-sale (扩)   | ✓    |
| 外卖订单导出按钮                  | 平台 Web | /admin/food-orders/export               | admin-food-order (扩)   | ✓    |
| 跑腿订单导出按钮                  | 平台 Web | /admin/errand-orders/export             | admin-errand-order (扩) | ✓    |
| 异常订单扫描                      | 后端     | risk-exception-scan.job (5min)          | scheduler               | ✓    |
| 数据快照生成                      | 后端     | dashboard-snapshot-generate.job (00:30) | scheduler               | ✓    |
| 导出任务异步处理                  | 后端     | export-task-process.job (30s)           | scheduler               | ✓    |
| 优惠券过期                        | 后端     | coupon-expire.job (00:00)               | scheduler               | ✓    |
| 营销活动起停                      | 后端     | marketing-activity-toggle.job (1min)    | scheduler               | ✓    |
| 对账任务                          | 后端     | reconciliation.job (03:30)              | scheduler               | ✓    |

## 3. 关键决策

### 自动决策(动态调整,记入 ACCEPTANCE)

| ID  | 决策                                                      | 理由                                                                        |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| 9.1 | dispatch-rules 物理页本阶段不做                           | 接口契约清单未列调度规则 CRUD 接口;按"不多做"原则延后 stage 11 智能调度时补 |
| 9.2 | admin_order_query 表不建                                  | 原规划列入但属查询索引语义,改建 risk_exception_log                          |
| 9.3 | refund_order.provider 默认 wxpay,真实接 stage 11          | mock SUCCESS 即可,P3 登记                                                   |
| 9.4 | dashboard 优先读 snapshot,无则实时聚合                    | 性能与一致性折中                                                            |
| 9.5 | rate_rule 旧规则同 city+category 维度标 EXPIRED           | 避免叠加多条 EFFECTIVE                                                      |
| 9.6 | 历史 stage spec 中 EventName 总数判断由 `===55` 改 `>=55` | 向上兼容,避免 stage N 加 events 后历史 spec 失败                            |

### 用户拍板(对齐文档 § 4 决策清单)

- A1-A10 全部按"甲方案"自动决策;无中断询问

## 4. 提交记录

见 ACCEPTANCE § 7。

## 5. 与 stage 8 对照

| 维度             | stage 8 末 | stage 9 末 | 增量 |
| ---------------- | ---------- | ---------- | ---- |
| 后端 modules     | 75         | 84         | +9   |
| 数据表           | 73         | 83         | +10  |
| HTTP 接口        | 132        | 146        | +14  |
| EventName        | 55         | 62         | +7   |
| 事件订阅器       | 48         | 55         | +7   |
| 定时任务         | 36         | 42         | +6   |
| admin-web 页面   | 24         | 30         | +6   |
| jest 用例        | 757        | 804        | +47  |
| admin-web vitest | 87         | 93         | +6   |
| 总 commit        | 8          | 9          | -    |

## 6. 后续阶段对接点

- **stage 10(四端联调-接口状态消息资金)**:验证仲裁→退款→消息推送链路,平台调度规则下发到 dispatch
- **stage 11(性能安全兼容)**:真 wxpay 退款 / 真 minio 上传 / 真 amap / 真 push,以及 dispatch_rule CRUD 智能调度引擎
- **stage 12(全量冒烟测试)**:14 接口 + 6 admin-web 新页 + 6 jobs 全量回归
