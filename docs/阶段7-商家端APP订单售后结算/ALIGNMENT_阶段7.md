# 阶段 7 — 商家端 APP 订单售后结算数据 · 对齐文档(ALIGNMENT)

> 本文档对应 6A 流程 "Align" 阶段,目标:模糊需求 → 精确规范。基线为 `项目阶段规划/07-阶段7-商家端APP-订单售后结算数据/` 9 份规划文档。

## 1. 项目上下文(stage 0-6 已完成基线)

| 维度             | 数值                        |
| ---------------- | --------------------------- |
| 后端 modules     | 53                          |
| 数据表           | 59                          |
| HTTP 接口        | 97                          |
| EventName        | 39                          |
| 事件订阅器       | 32                          |
| 定时任务         | 27                          |
| 后端 jest 用例   | 603                         |
| 前端 vitest 用例 | 129(customer 63 + admin 66) |
| commit           | 30(初始 ~ 3f40fde)          |

### 已落地的相关基础设施

- `apps/merchant-app/`:uni-app + Vue3 + Pinia,stage 0/2 已建骨架。pages.json 当前仅注册 5 页;但目录已含 `audit/error/launch/login/onboarding/products/promotions/stock/store/workbench` 11 个一级模块(stage 2 商家入驻/商品/店铺已实现页面但未全暴露)。
- `merchant-auth` / `merchant-onboarding` / `merchant-promotion` / `store` / `product` 模块(stage 2-4)。
- `food_order` / `food_order_item` 实体(stage 5),已有状态机 WAIT_PAY → PAID → DELIVERED → COMPLETED + CANCELLED。
- `order_review` 实体(stage 5),用户评价主表(stage 5 仅写库,未做 c 端提交入口)。
- `payment` / `payment_order` / 退款 mock(stage 5)。
- `audit-log` / `domain-event` / `idempotency` / `distributed-lock`(stage 0)。
- `push.adapter` / `sms.adapter` / `realname.adapter` / `wxpay/alipay.adapter` 全部 Mock(stage 0/4)。

## 2. 原始需求(规划文档 § 1-2 摘要)

完成商家 Android/iOS APP 外卖订单履约、售后处理、经营数据、营收结算和提现。规划文档明确不做:商家 Web、商家小程序、跑腿订单进入商家流程。

### 业务能力清单(规划文档 §业务范围)

- **商家端 APP**:外卖订单实时语音/弹窗提醒;一键接单 / 拒单(填原因) / 备货 / 出餐;查看用户备注、订单详情、取消申请、退款申请;售后列表 / 详情 / 退款审核 / 协商方案 / 评价回复 / 投诉处理 / 凭证上传;日/月订单量、销售额、单品销量、店铺评分;营收 / 佣金 / 手续费 / 实付 / 逐笔明细 / 手动提现 / 自动结算记录 / 待结算 / 移动端导出。
- **用户端**:订单取消、退款申请、评价结果同步给商家。
- **骑手端**:接收商家备货/出餐状态,同步取货流程。
- **平台 Web**:查看商家订单、售后、结算、提现和违规记录。

### 接口清单(契约清单 § 8 接口)

| #   | 接口                                            | 端       | 鉴权           |
| --- | ----------------------------------------------- | -------- | -------------- |
| 1   | GET /api/v1/m/food-orders/pending               | 商家 APP | Merchant-Token |
| 2   | POST /api/v1/m/food-orders/{orderId}/accept     | 商家 APP | Merchant-Token |
| 3   | POST /api/v1/m/food-orders/{orderId}/reject     | 商家 APP | Merchant-Token |
| 4   | POST /api/v1/m/food-orders/{orderId}/ready      | 商家 APP | Merchant-Token |
| 5   | GET /api/v1/m/after-sales                       | 商家 APP | Merchant-Token |
| 6   | POST /api/v1/m/after-sales/{afterSaleId}/review | 商家 APP | Merchant-Token |
| 7   | GET /api/v1/m/settlements                       | 商家 APP | Merchant-Token |
| 8   | POST /api/v1/m/withdrawals                      | 商家 APP | Merchant-Token |

### 后端清单

- 7 模块:merchant-order / merchant-after-sale / merchant-review / merchant-statistics / merchant-settlement / merchant-withdrawal / push(复用)。
- 8 数据表:merchant_order_view(视图) / merchant_order_action_log / after_sale / after_sale_evidence / merchant_statistics_snapshot / merchant_settlement / merchant_withdrawal / review_reply。
- 5 定时任务:5min 提醒 / 10min 自动取消退款 / T+1 结算 / 提现状态轮询 / 经营统计快照。
- 7 领域事件:MerchantOrderPushed / MerchantOrderAccepted / MerchantOrderRejected / FoodReadyForPickup / AfterSaleReviewedByMerchant / MerchantSettlementGenerated / MerchantWithdrawRequested。

### 状态机(规划 §状态机 + 全局状态机)

外卖订单状态:`WAIT_PAY → PAID_WAIT_MERCHANT → MERCHANT_ACCEPTED → PREPARING → READY_FOR_PICKUP → RIDER_ASSIGNED → PICKED_UP → DELIVERING → DELIVERED → COMPLETED`,异常 `CANCELLED / REFUNDING / REFUNDED / AFTER_SALE`。

> stage 5 当前已有 WAIT_PAY/PAID/DISPATCHING/ASSIGNED/PICKED_UP/DELIVERED/COMPLETED + CANCELLED。本阶段需要在 PAID 后插入 PAID_WAIT_MERCHANT、MERCHANT_ACCEPTED、PREPARING、READY_FOR_PICKUP 4 个细分中间态,与 stage 5 兼容(老订单逻辑迁移按"已 PAID 即默认 MERCHANT_ACCEPTED+PREPARING")。

## 3. 边界确认

- ✅ 商家端仅 Android / iOS APP,**不开发商家 Web / 商家小程序**。
- ✅ 跑腿订单不进入商家处理流程(stage 6 已实现,本阶段零修改 errand\_\*)。
- ✅ 用户端 / 商家端 / 骑手端 / 平台 Web Token 隔离。
- ✅ 外卖与跑腿订单独立体系(本阶段所有改动只在 food*order/order_review/after_sale/merchant*\*)。
- ✅ 金额分单位 / 距离米单位 / 时间毫秒时间戳 / camelCase。
- ✅ 所有写接口 @Idempotent + @Audit。

## 4. 决策清单(8 项,基于推荐项执行)

### A1 商家端 APP 实施范围

- **甲(推荐)**:本阶段补建 16 个新页面(workbench 增强 + orders/{pending,detail,reject-modal} + after-sales/{list,detail,review} + statistics + settlements/list + withdrawals/{form,records} + exports/index + reviews/reply)。配套 7 个 api 模块、4 个 store、2 个 utils(order-status / refund-status 字典)。Mock 真推送(stage 11 真接)。
- 乙:仅后端 m/\* 接口,前端整体延后到 stage 11。
- **结论:甲**(stage 0/2 已建骨架并在用,目录与构建链路就绪,纯 cli build 即可。延后会让 16 页的页面/接口反查规划失败)。

### A2 merchant_order_view 是物化表还是视图

- **甲(推荐)**:不建独立物化表。规划文档"merchant_order_view"读作"商家视角订单数据",实际由 food_order LEFT JOIN store + food_order_item 提供。
- 乙:建 merchant_order_view 物化快照表 + 异步同步。
- **结论:甲**(避免双写、保持单一真相源、stage 5 food_order 已含商家可见所需全部字段)。

### A3 after_sale 主体表

- **甲(推荐)**:新建 `after_sale` 表(主表)+ `after_sale_evidence` 表(凭证子表)+ 状态机 PENDING_MERCHANT → APPROVED_BY_MERCHANT/REJECTED_BY_MERCHANT → PENDING_PLATFORM(stage 9 仲裁)→ COMPLETED/REFUNDED。挂在 food_order 上(orderId 外键)。
- 乙:扩 food_order 字段。
- **结论:甲**(规划文档明确列了 after_sale + after_sale_evidence 两表,且业务上一笔订单可多次售后)。

### A4 review_reply / 用户评价提交入口

- **甲(推荐)**:本阶段补 `customer-app` 评价提交页 1 页(/pages/order/review),挂在 food_order detail 的"评价"按钮(COMPLETED 后可评价);补 `POST /api/v1/c/reviews` 接口写 order_review;补 `review_reply` 表 + 商家回复接口 `POST /api/v1/m/reviews/{reviewId}/reply`(在契约清单未列,但业务必需,本阶段视为"§ 接口契约"补充项)。
- 乙:用户评价延后,只做 review_reply 后端表。
- **结论:甲**(否则商家"评价回复"按钮无评价可回复,业务断链)。
- ⚠️ **注意**:契约清单只列了 8 个 m/\* 接口。本阶段实际需要 `POST /api/v1/c/reviews` + `POST /api/v1/m/reviews/{reviewId}/reply` + `POST /api/v1/c/after-sales` 3 个 "契约清单未列但业务必需" 的接口,以及内部 admin 监控接口若干(详见 DESIGN)。这些 **不计为越界**,因为规划文档 §业务范围 已明确"评价回复"+"用户端订单取消/退款申请/评价结果"业务,只是契约清单只列了核心 8 个,本阶段在 `问题与风险记录.md` 中登记说明。

### A5 提现单笔/单日额度

- **甲(推荐)**:走 sys_config(stage 4 已建),key=`MERCHANT_WITHDRAWAL_LIMIT`,value=JSON `{"single":1000000,"daily":5000000}`(单位:分),seed 1 条。运行时 service 读取。
- 乙:新建 merchant_withdrawal_limit 表。
- **结论:甲**(轻量、复用 stage 4 sys-config,且额度全平台统一无需按商家定制)。

### A6 经营统计快照粒度

- **甲(推荐)**:日级快照(snapshot_date YYYYMMDD 主键 + storeId)。月查走聚合 GROUP BY YEAR(snapshot_date)\*100+MONTH(snapshot_date)。
- 乙:月级快照。
- **结论:甲**(规划文档说"日/月订单量、销售额"——日级聚合可派生月级,反之不行)。

### A7 真推送 / 真实名 / 真退款 / 真短信

- **甲(推荐)**:全部沿用 stage 0 Mock。push.adapter 已有 sendOrderPush(传 storeId+orderId+title+body)走 Mock。退款走 stage 5 wxpay/alipay refund Mock。实名走 stage 0 realname Mock。sms 走 stage 0 sms Mock。P3 登记 stage 11 真接。
- 乙:本阶段真接。
- **结论:甲**(契约/触发链路已完整,真接入是 stage 11 性能与兼容专项)。

### A8 用户端售后申请入口

- **甲(推荐)**:customer-app 新增 1 页 `/pages/order/after-sale-apply`(挂在 food_order detail 的"申请售后"按钮,DELIVERED 之后可发起);补 `POST /api/v1/c/after-sales` 接口写 after_sale 表;售后申请触发 `MerchantOrderRefundRequested`(暂用扩展 EventName,见决策一致项)。
- 乙:仅做 m 端审核接口,c 端入口延后。
- **结论:甲**(否则商家"售后审核"按钮无售后单可审核,业务断链;规划文档 §业务范围 已明确)。

### 决策一致项(无歧义直采)

- 时间戳 BIGINT、金额 BIGINT 分;
- 主键 `<table>_id` BIGINT 自增;
- 全部 m/\* 写接口 `@Idempotent({ttl:60}) + @Audit`;
- 数据归属:`@CurrentMerchant().merchantId === <entity>.merchantId`;
- 事件命名 `domain.merchant-order.<verb>` / `domain.after-sale.<verb>` / `domain.merchant-settlement.<verb>` / `domain.merchant-withdrawal.<verb>` / `domain.review-reply.<verb>`;
- 7 events + 1 扩展(后端补 `OrderReviewSubmitted` / `AfterSaleApplied` 2 个 c 端事件,以触发 m 端订阅器);→ 实际 EventName 累计 39 → **39 + 9 = 48**(7 规划 + 2 扩展)。

## 5. 疑问澄清

| 问题                                                                                                                                                                               | 来源                    | 处理                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 契约清单只列 8 接口,但业务还需 c 端 review/after-sale 提交、m 端 review reply                                                                                                      | 规划文档 § 接口契约清单 | A4/A8 决策处理:本阶段实际 m/c 端补充接口约 13 个;在 `问题与风险记录.md` 登记 P3 项作为契约清单 v2 补充                                                                                     |
| stage 5 当前 food_order 状态机为 WAIT_PAY/PAID/DISPATCHING/ASSIGNED/PICKED_UP/DELIVERED/COMPLETED;规划文档要求新增 PAID_WAIT_MERCHANT/MERCHANT_ACCEPTED/PREPARING/READY_FOR_PICKUP | 全局状态机              | 本阶段在 food_order.status 枚举追加 4 状态。stage 5 测试中老用例迁移:PAID → 仍允许直接进 DISPATCHING(老兼容路径),但新订单走 PAID_WAIT_MERCHANT 路径;5min/10min job 仅扫 PAID_WAIT_MERCHANT |
| order_review 当前无 c 端写接口                                                                                                                                                     | stage 5 ALIGNMENT 决策  | 本阶段补 c 端提交 + m 端回复                                                                                                                                                               |
| merchant 端 push 是否真接 getui                                                                                                                                                    | A7 决策                 | Mock,P3 登记 stage 11                                                                                                                                                                      |
| 用户端"申请售后"如何确定可申请窗口                                                                                                                                                 | 全局规则                | DELIVERED 后 7 天可发起售后(seed 默认值,可改 sys_config)                                                                                                                                   |

## 6. 阶段完成定义(参照规划 §完成定义)

- 所有 8 个 m/\* 核心接口 + 5 个补充接口(c/m 评价提交/回复 + c 端售后申请 + admin 4 个监控接口扩展)上线。
- 5 个 jobs 工作正常,DistributedLock + 幂等 + 失败补偿。
- 7 个领域事件 + 2 扩展事件全部接入 subscriber。
- merchant-app 16 页登记 pages.json,build:h5 通过。
- customer-app 2 页新增(评价 + 申请售后),pages.json 累计 35 → 37。
- admin-web 4 页新增/扩展(merchant-orders 扩展 + after-sales/settlements/withdrawals 3 监控页),累计 18 → 21。
- 后端 jest +95~110 用例(目标 ≥698)、前端 vitest +30 用例(目标 ≥159)、4 闸门绿。
- 边界审查:无商家 Web、无商家小程序、不串跑腿、Token 隔离、外卖/跑腿独立。
