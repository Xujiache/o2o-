# 阶段 7 — 商家端 APP 订单售后结算数据 · 项目总结(FINAL)

## 1. 总览

| 维度             | 数据                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| 原子任务         | 32/32(开发 28 + 测试与文档 4)                                                                        |
| 后端模块         | 12 新 = 6 m 端业务 + 2 c 端补充 + 4 admin 监控(stage 5 已有 merchant-accept-timeout-cancel job 复用) |
| 数据表           | 7 新 + food_order 扩 4 字段                                                                          |
| HTTP 接口        | 20(11 m 端 + 2 c 端 + 7 admin)                                                                       |
| 领域事件         | 9 新(EventName 累计 39 → 48)                                                                         |
| 事件订阅器       | 9                                                                                                    |
| 定时任务         | 4 新(scheduler 累计 27 → 31;10min 取消复用 stage 5 现有)                                             |
| 权限点           | +6(admin:menu+view × {after-sales, settlements, withdrawals})                                        |
| 用户端页面       | +2(food/order/after-sale-apply + 改写 review/submit)                                                 |
| 商家端页面       | 24 注册路由(包括 stage 7 新 14 + stage 0/2 既有 10)                                                  |
| 平台 Web 页面    | +3(after-sales / settlements / withdrawals 监控页 + 1 字段扩展)                                      |
| 后端 jest 测试   | **689**(93 suites,stage 6 末 603 → +86)                                                              |
| 前端 vitest 测试 | customer 64 + merchant 51 + admin 80 = **195**                                                       |
| 总 commit        | 7 stage 7 commit:d03fb8c / 13996be / 18d7f14 / 71e8235 / f0a61f7 / 77a2172 / 本次                    |

## 2. 能力矩阵

| 能力                                   | 端       | 入口                                             | 后端模块            | 状态 |
| -------------------------------------- | -------- | ------------------------------------------------ | ------------------- | ---- |
| 商家工作台(16 入口聚合)                | 商家 APP | /pages/workbench/index                           | (聚合页)            | ✓    |
| 待接单列表                             | 商家 APP | /pages/orders/pending                            | merchant-order      | ✓    |
| 一键接单 / 拒单 / 出餐                 | 商家 APP | /pages/orders/detail(含 modal)                   | merchant-order      | ✓    |
| 售后列表 / 详情 / 审核(approve/reject) | 商家 APP | /pages/after-sales/{list,detail}                 | merchant-after-sale | ✓    |
| 评价回复                               | 商家 APP | /pages/reviews/list                              | merchant-review     | ✓    |
| 经营统计(日/月聚合 + 评分 + 热销 top5) | 商家 APP | /pages/statistics/index                          | merchant-statistics | ✓    |
| 结算列表 / 详情                        | 商家 APP | /pages/settlements/{list,detail}                 | merchant-settlement | ✓    |
| 提现(实名 + 额度 + sms 验证)           | 商家 APP | /pages/withdrawals/form                          | merchant-withdrawal | ✓    |
| 提现记录                               | 商家 APP | /pages/withdrawals/records                       | merchant-withdrawal | ✓    |
| 数据导出(CSV → 剪贴板)                 | 商家 APP | /pages/exports/index                             | (前端聚合)          | ✓    |
| 用户评价提交                           | 用户端   | /pages/food/review/submit                        | customer-review     | ✓    |
| 用户售后申请                           | 用户端   | /pages/food/order/after-sale-apply               | customer-after-sale | ✓    |
| 平台售后监控                           | 平台 Web | /admin/after-sales                               | admin-after-sale    | ✓    |
| 平台结算监控                           | 平台 Web | /admin/settlements                               | admin-settlement    | ✓    |
| 平台提现监控                           | 平台 Web | /admin/withdrawals                               | admin-withdrawal    | ✓    |
| 5 min 未接单提醒                       | 后端     | merchant-accept-remind.job(每 30s)               | scheduler           | ✓    |
| 10 min 未接单自动取消                  | 后端     | merchant-accept-timeout-cancel.job(stage 5 既有) | scheduler           | ✓    |
| T+1 商家结算                           | 后端     | t1-merchant-settlement.job(每日 02:00)           | scheduler           | ✓    |
| 提现状态轮询(mock 推进)                | 后端     | withdrawal-status-poll.job(每 1min)              | scheduler           | ✓    |
| 经营统计快照                           | 后端     | daily-statistics-snapshot.job(每日 02:30)        | scheduler           | ✓    |

## 3. 关键决策

### 用户拍板(对齐文档 § 4 决策清单)

- **A1 商家端 APP 实施范围 → 甲方案**:本阶段补 13 新页 + 工作台增强,merchant-app 16 路由 → 已实现
- **A2 merchant_order_view → 甲方案**:不建物化表,直接复用 food_order JOIN store → 已实现
- **A3 after_sale 主体表 → 甲方案**:新建 after_sale + after_sale_evidence → 已实现
- **A4 review_reply / 用户评价入口 → 甲方案**:补 customer-app 评价提交 + customer-review service + 补 5 接口(c/m/admin)→ 已实现
- **A5 提现额度 → 甲方案**:走 sys_config(merchant.withdrawal.limit JSON)→ 已实现
- **A6 统计快照粒度 → 甲方案**:日级快照(snapshot_date 主键),月查走聚合 → 已实现
- **A7 真推送/实名/退款 → 甲方案**:沿用 stage 0 Mock,P3 登记 stage 11 接 → 已实现
- **A8 用户售后入口 → 甲方案**:customer-app 新增 1 页 + customer-after-sale service → 已实现

### 自动决策(沿用 stage 5/6 套路)

| ID   | 决策                                                                                           | 落地位置                               |
| ---- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| 7.1  | BIGINT 时间戳 + 主键 `<table>_id` 自增                                                         | 7 个 entity 全部                       |
| 7.2  | 事件命名 `domain.<biz>.<verb>`                                                                 | events.ts +9 stage 7                   |
| 7.3  | settlement_no = `S` + yyyyMMdd + storeId(8 位 padStart)                                        | t1-merchant-settlement.job             |
| 7.4  | withdrawal_no = `W` + yyyyMMdd + ms 6 位                                                       | merchant-withdrawal.service            |
| 7.5  | food_order 状态机扩展(stage 5 已预留 14 状态枚举,本阶段补 4 时间字段)                          | food-order.entity 扩                   |
| 7.6  | 数据归属:merchant 端通过 storeRepo.findOne({merchantId}) 反查 storeId 过滤                     | 全 m/\* service                        |
| 7.7  | 售后状态机:PENDING_MERCHANT → APPROVED/REJECTED_BY_MERCHANT → PENDING_PLATFORM(stage 9)        | after-sale.entity + service            |
| 7.8  | 提现额度 sys_config JSON `{single, daily}`                                                     | merchant-withdrawal.service.getLimit() |
| 7.9  | 装饰器约定 @Idempotent + @Audit                                                                | 全 m/c 端写接口                        |
| 7.10 | 佣金 / 通道费率走 sys_config(commission.rate JSON.food / payment.fee_rate plain)               | t1-merchant-settlement.job             |
| 7.11 | 评价回复唯一性:review_reply.order_review_id 唯一索引                                           | review-reply.entity                    |
| 7.12 | 提现 mock 状态机:PENDING → APPROVED(30s) → COMPLETED(30s)                                      | withdrawal-status-poll.job             |
| 7.13 | 售后窗口 7 天可配置:sys_config `after_sale.window_days`                                        | customer-after-sale.service            |
| 7.14 | 9 subscribers 注册到 EventsModule(本阶段顺带补 stage 5/6 subscribers 是否注册的对齐留 stage 8) | events.module.ts                       |

## 4. 提交记录

```
d03fb8c  docs(stage-7): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)
13996be  feat(stage-7): T01-T04 schema + 9 events + sys_config/permission seed
18d7f14  feat(stage-7): T05-T13 9 业务模块 + 5 admin 监控
71e8235  feat(stage-7): T14-T16 9 subscribers + 4 jobs(10min 取消复用 stage 5)
f0a61f7  feat(stage-7): T17-T18+T20 customer-app 2 页 + merchant-app 13 页 + 6 api + 4 stores + utils + vitest
77a2172  feat(stage-7): T19 admin-web 商家监控扩展(after-sales/settlements/withdrawals 3 监控页)
本次     feat(stage-7): T21-T23 测试补漏 + 手动审查 + 阶段验收文档(完整交付 32/32)
```

## 5. 与 stage 6 的对照

| 维度          | stage 6 末 | stage 7 末 | 增量                                          |
| ------------- | ---------- | ---------- | --------------------------------------------- |
| 后端 modules  | 53         | 65         | +12                                           |
| 数据表        | 59         | 66         | +7(+1 扩字段)                                 |
| HTTP 接口     | 97         | 117        | +20                                           |
| EventName     | 39         | 48         | +9                                            |
| 事件订阅器    | 32         | 41         | +9                                            |
| 定时任务      | 27         | 31         | +4                                            |
| 用户端页面    | 35         | 37         | +2                                            |
| 商家端页面    | 5 注册     | 24 注册    | +19                                           |
| 平台 Web 页面 | 18         | 21         | +3                                            |
| jest 用例     | 603        | 689        | +86                                           |
| vitest 用例   | 129        | 195        | +66(merchant 0→51,customer 63→64,admin 66→80) |
| 总 commit     | 9          | 7          | -                                             |

## 6. 后续阶段对接点

- **stage 8(骑手端调度轨迹收益考核)**:rider-task-pool 接餐(scan food_order.status='READY_FOR_PICKUP')+ rider-app 卡片字典化(消费 stage 7 加的 readyAt 字段)+ 真 amap 路线 + 真 wxpay/alipay
- **stage 9(平台运营财务)**:平台仲裁(after_sale.status='REJECTED_BY_MERCHANT' 进入 PENDING_PLATFORM)+ merchant_withdrawal 真打款 + 商家违规处罚 + 投诉处理 UI
- **stage 11(性能安全兼容)**:真 push(merchant 工作台语音/弹窗)+ 真 sms(订单/售后/提现通知)+ 真实名(merchant 提现实名通过 realname.adapter)+ 真 wxpay refund
