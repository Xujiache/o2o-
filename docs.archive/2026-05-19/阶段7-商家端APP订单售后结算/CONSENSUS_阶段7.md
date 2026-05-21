# 阶段 7 — 商家端 APP 订单售后结算数据 · 共识文档(CONSENSUS)

> 锁定 ALIGNMENT 阶段所有结论,本阶段后续 DESIGN / TASK / 编码均以本文为准。

## 1. 锁定的需求范围

### 1.1 后端

- **7 业务模块** + 1 admin 扩展模块
  - merchant-order
  - merchant-after-sale
  - merchant-review
  - merchant-statistics
  - merchant-settlement
  - merchant-withdrawal
  - customer-after-sale(c 端发起售后,A8 补)
  - admin-merchant-order / admin-after-sale / admin-settlement / admin-withdrawal(只读监控扩展)
- **9 数据表**
  - 业务表:after_sale / after_sale_evidence / merchant_order_action_log / merchant_settlement / merchant_withdrawal / merchant_statistics_snapshot / review_reply
  - 扩展现有表:food_order(+ 4 状态枚举值 + acceptedAt/expectedReadyAt/readyAt/rejectReason 字段)、order_review(+ replyId 关联)
- **9 领域事件**(7 规划 + 2 扩展)
  - MerchantOrderPushed
  - MerchantOrderAccepted
  - MerchantOrderRejected
  - FoodReadyForPickup
  - AfterSaleApplied(c 端,A8 扩展)
  - AfterSaleReviewedByMerchant
  - MerchantSettlementGenerated
  - MerchantWithdrawRequested
  - OrderReviewSubmitted(c 端,A4 扩展)
- **5 定时任务**:wait-merchant-accept-remind(5min)/ wait-merchant-accept-cancel(10min)/ t1-merchant-settlement(每日 02:00)/ withdrawal-status-poll(每分钟)/ daily-statistics-snapshot(每日 02:30)
- **13 接口**(8 规划核心 + 5 业务补充,后者列入"问题与风险记录.md" 作为契约清单 v2 候补)
  - GET /m/food-orders/pending
  - POST /m/food-orders/{orderId}/accept
  - POST /m/food-orders/{orderId}/reject
  - POST /m/food-orders/{orderId}/ready
  - GET /m/after-sales
  - POST /m/after-sales/{afterSaleId}/review
  - GET /m/settlements
  - POST /m/withdrawals
  - POST /c/reviews(A4 补)
  - POST /c/after-sales(A8 补)
  - POST /m/reviews/{reviewId}/reply(A4 补)
  - GET /m/withdrawals(列表,提现页历史必需)
  - GET /m/statistics(经营统计,移动端必需)
- **5 admin 监控接口**(只读)
  - GET /admin/merchant-orders/timeline-stats(扩展 admin-food-order)
  - GET /admin/after-sales / GET /admin/after-sales/{id}
  - GET /admin/settlements / GET /admin/settlements/{id}
  - GET /admin/withdrawals / GET /admin/withdrawals/{id}
  - GET /admin/merchant-statistics(店铺评分/月销/数据)

### 1.2 前端

- **merchant-app** 16 新页(注册到 pages.json)
  - workbench/index(增强:数据卡片 + 待办)
  - orders/pending(列表)
  - orders/detail
  - orders/reject-modal(组件,非独立路由)
  - orders/ready-modal(组件)
  - after-sales/list
  - after-sales/detail
  - statistics/index
  - settlements/list
  - settlements/detail
  - withdrawals/form
  - withdrawals/records
  - exports/index
  - reviews/list
  - reviews/reply-modal(组件)
  - me/index(个人中心增强)
- **customer-app** 2 新页(累计 35 → 37)
  - pages/order/review(评价提交)
  - pages/order/after-sale-apply(售后申请)
- **admin-web** 4 新增/扩展(累计 18 → 21,1 扩展 + 3 新增页)
  - views/food-orders 扩展("接单 / 拒单 / 出餐"时间字段 + 商家维度筛选)
  - views/after-sales/index.vue(新增)
  - views/settlements/index.vue(新增)
  - views/withdrawals/index.vue(新增)

### 1.3 权限点(累计 +6)

- merchant:store:own(已存,本阶段对所有 m/\* 写接口校验)
- admin:menu:after-sales / admin:after-sales:view
- admin:menu:settlements / admin:settlements:view
- admin:menu:withdrawals / admin:withdrawals:view

### 1.4 测试目标

| 套件                | stage 6 末            | stage 7 末目标 | 增量      |
| ------------------- | --------------------- | -------------- | --------- |
| server jest         | 603 / 78s             | ≥698 / ≥87s    | ≥+95      |
| customer-app vitest | 63 / 20s              | ≥73 / ≥22s     | ≥+10      |
| merchant-app vitest | 0 / 0s(前 stage 没动) | ≥40 / ≥8s      | ≥+40      |
| admin-web vitest    | 66 / 23s              | ≥75 / ≥25s     | ≥+9       |
| **合计**            | **732**               | **≥886**       | **≥+154** |

## 2. 验收标准

### 2.1 功能验收

- [ ] 用户下单 → 支付成功 → 商家 5min/10min 提醒 → 接单 → 出餐 → READY_FOR_PICKUP 状态。
- [ ] 商家 10min 未接单 → 自动取消 + 全额退款 mock。
- [ ] 用户端订单 COMPLETED 后可提交评价(rating + content + image),商家可回复。
- [ ] 用户端订单 DELIVERED 后可申请售后(reason + amount + evidence),商家审核(approve / reject)。
- [ ] T+1 凌晨结算 job 生成 merchant_settlement(grossAmount/commissionAmount/feeAmount/netAmount)。
- [ ] 商家提现:实名校验 + 单笔/单日额度 + sms 验证码,状态 PENDING → APPROVED → COMPLETED(走 stage 0 mock 模拟)。
- [ ] 经营统计快照:每日 02:30 生成前一日数据;m 端可查日/月聚合。

### 2.2 接口验收

- [ ] 13 业务接口 + 5 admin 监控接口全部 CRUD/校验/状态机/枚举/错误码符合契约清单。
- [ ] 写接口全部 @Idempotent + @Audit。
- [ ] 数据归属:商家只能访问自己店铺的订单/售后/结算/提现。

### 2.3 数据验收

- [ ] 9 张表 entity + Stage7Init.ts migration 建表通过。
- [ ] sys_config seed:MERCHANT_WITHDRAWAL_LIMIT 1 条 + AFTER_SALE_WINDOW_DAYS 1 条。
- [ ] sys_permission +6 条。
- [ ] role-permission seed 更新:AUDITOR 绑定 admin:after-sales/settlements/withdrawals:view。

### 2.4 测试验收

- [ ] 见 § 1.4 目标用例数。
- [ ] 关键路径:订单履约 / 自动取消 / 售后审核 / 评价回复 / T+1 结算 / 提现 100% 覆盖。

### 2.5 文档验收

- [ ] ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE/FINAL/TODO 7 文档齐全。
- [ ] 项目阶段规划/07-.../手动审查与测试.md 自动可填项填齐。
- [ ] 项目阶段规划/07-.../问题与风险记录.md 列 P3 项 ≥4(契约清单 v2 补充 / 真推送 / 真退款 / 真实名)。
- [ ] 阶段交付清单全部勾选(P0/P1 清零 + 边界复核)。

## 3. 任务边界

### 3.1 本阶段做

- 所有 § 1 锁定的后端 / 前端 / 测试 / 文档项。
- food_order 状态机扩展(向前兼容)。
- order_review c 端写入口。

### 3.2 本阶段不做

- 跑腿订单流程修改(stage 6 已完成,本阶段零修改)。
- 商家 Web 后台 / 商家小程序(按规划禁止)。
- 真支付 / 真退款 / 真推送 / 真实名(stage 11 接)。
- 平台 Web 主动仲裁/调度(stage 9)。
- merchant-app 真机适配 / 启动屏 / Push SDK(stage 11)。
- 商家骑手数据导出 PDF(本阶段仅 CSV mock)。
- 跨店统计 / 单品销量复杂报表(stage 9)。

## 4. 技术约束

- NestJS 10 + TypeORM,所有时间 BIGINT 毫秒戳,所有金额 BIGINT 分。
- 装饰器 `@Idempotent({ttl:60}) + @Audit + @RequirePermission('merchant:store:own')`。
- 事件总线 DomainEventBus,subscriber 按 stage 5/6 套路 writeAudit + push.adapter。
- jobs 用 BaseJob + DistributedLockService。
- merchant-app:Vue3 + uni-app + Pinia + axios(stage 0 已建)。
- customer-app:沿用 stage 5/6 既有套路。
- admin-web:Vue3 + ElementPlus + Pinia(stage 4)。

## 5. 风险登记

| 风险                                            | 等级 | 处理                                                                          |
| ----------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| food_order 状态机扩展可能影响 stage 5 老测试    | 高   | 老路径 PAID 直进 DISPATCHING 兼容;新路径 PAID_WAIT_MERCHANT 走 5min/10min job |
| 13 + 5 = 18 接口超出契约清单 8 接口             | 中   | 在 问题与风险记录 P3-01 登记契约清单 v2 候补                                  |
| merchant-app vitest 当前为 0,需新建测试基础设施 | 中   | 沿用 customer-app 套路(stage 5/6)                                             |
| OrderReview / ReviewReply / AfterSale 业务窗口  | 低   | sys_config seed 默认值(售后窗口 7 天)                                         |

## 6. 一致同意

- A1-A8 全部按推荐项。
- 契约清单 v2 补充 5 接口在 问题与风险记录 P3 登记。
- 39 → 48 EventName(+9)。
- 4 闸门必绿。
