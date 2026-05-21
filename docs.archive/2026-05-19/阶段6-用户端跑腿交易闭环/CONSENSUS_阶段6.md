# 阶段 6 — 用户端跑腿交易闭环 · 共识文档(CONSENSUS)

> 在 `ALIGNMENT_阶段6.md` § 4 的 6 个决策点上,用户拍板:**全部按推荐方案推进**(A1=甲 / A2=甲 / A3=甲 / A4=甲 / A5=甲 / A6=甲)。
> 在此基础上锁定本阶段的需求、技术方案、边界与验收标准。

## 1. 已拍板需求

### 1.1 用户端(微信小程序 / Android APP / iOS APP)

- 跑腿入口独立,与外卖数据隔离;入口直接挂"我的"或外卖首页底部 tab 旁。
- 4 类跑腿表单:`BUY` 代买 / `DELIVER` 代送 / `HELP` 代办 / `CUSTOM` 自定义,字段差异由后端 errand_type 配置驱动。
- 报价(同步) → 提交订单(锁 quoteId 5 min) → 唤起支付 → 订单详情(状态 timeline) → 加急/补充备注 → 轨迹 → 售后入口(复用 stage 5 stub)。
- 违禁品提示在报价响应中以 prohibitedWarnings 数组返回;前端报价页/确认页两次展示。
- 计价 = 基础费 + 距离费 + 加急费(不含垫付);垫付实报实销在 errand_order_detail.budget 字段独立记录。
- 紧急度 urgentLevel ∈ {standard, fast, express},standard 0 元 / fast 5 元 / express 10 元(可配置 errand_pricing 表)。

### 1.2 后端服务(NestJS)

- 7 模块 + 8 数据表 + 8 c 端接口(含 A1+A2 补齐的 list/cancel) + 3 admin 接口 + 2 callback(复用 stage 5) = 13 接口。
- 6 新事件 + 6 订阅器 + 4 jobs。
- payment / track-query / wxpay-adapter / alipay-adapter / payment_order / rider-task-pool 全部复用 stage 5。

### 1.3 平台 Web(admin-web)

- 1 监控页 `/admin/errand-orders`(列表 + 筛选 + 统计) + 1 详情抽屉。
- 计价规则与违禁品配置不在本阶段做(放 stage 9),本阶段 prohibited_item / errand_pricing 仅 seed 数据。

### 1.4 骑手端

- rider-task-pool 模块再扩展:扫 errand_task.status='READY_FOR_DISPATCH' 返简化任务卡(只读,与 food 平行)。
- 完整接单/取送动作 stage 8 强化。

## 2. 验收标准

### 2.1 功能验收

- [ ] 用户端 14 页全部可走通(报价 → 提交 → 支付 → 详情 → 加急 → 轨迹 → 售后入口跳转)。
- [ ] 4 类表单字段差异生效(BUY 必填 itemDesc + budget;DELIVER 必填 weight;HELP 仅必填 deliveryAddress + taskDesc;CUSTOM 仅必填 taskDesc)。
- [ ] 违禁品命中(eg 报价 itemDesc 含"刀")在 prohibitedWarnings 返回非空,前端展示。
- [ ] 4 jobs 触发条件正确(15 min 关单 / 3 min 加价 / 10 min 取消退款 / 预约入池)。
- [ ] payment_order biz_type='ERRAND' 走通 callback → ErrandPaid 事件 → 状态推进 PAID → DISPATCHING。

### 2.2 接口验收

- [ ] 7 c 端接口 + A1 list + A2 cancel = 9 c 端接口路径与契约清单一致。
- [ ] 3 admin 接口走 admin:errand-orders:view 权限点。
- [ ] 全部写接口 @Idempotent + @Audit 装饰齐全。
- [ ] 错误码统一 INVALID_PARAM / UNAUTHORIZED / FORBIDDEN / DATA_NOT_FOUND / STATUS_INVALID / DUPLICATE_REQUEST / THIRD_PARTY_ERROR。

### 2.3 数据验收

- [ ] 8 张新表 entity + migration 全部建表通过。
- [ ] errand_type 4 条 seed(BUY/DELIVER/HELP/CUSTOM)。
- [ ] errand_pricing 1 条 seed(基础费 5 元 + 距离费 0.5 元/km + 加急费 0/5/10)。
- [ ] prohibited_item 5 条 seed(刀具/危险品/烟酒/药品/管制品 keyword)。
- [ ] sys_permission +2 条(admin:menu:errand-orders + admin:errand-orders:view)。

### 2.4 测试验收

- [ ] server jest 新增 ≥130 用例,全绿(累计 ≥640 用例)。
- [ ] customer-app vitest 新增 ≥40 用例(api/stores/util),全绿。
- [ ] admin-web vitest 新增 ≥10 用例(errand-orders 视图 + drawer + api),全绿。
- [ ] pnpm -r build / test / lint / format:check 全绿。

### 2.5 文档验收

- [ ] ACCEPTANCE\_阶段6.md 全部勾选。
- [ ] FINAL*阶段6.md / TODO*阶段6.md 交付。
- [ ] `项目阶段规划/06-.../手动审查与测试.md` + `问题与风险记录.md` 填齐(待人工触发部分明确标注)。

## 3. 技术实现方案(锁定)

### 3.1 状态机(跑腿订单)

```
            ┌────────────────────────────────────┐
            │                                    ▼
WAIT_PAY ──pay──> PAID ──dispatch──> DISPATCHING ──assign──> ASSIGNED
   │                                       │ 10min noRider
   │ 15min                                  ▼
   ▼                                    CANCELLED(refund)
CANCELLED                                   ▲
                                            │ user-cancel(WAIT_PAY only)
ASSIGNED ──pickup──> PICKED_UP ──deliver──> DELIVERED ──confirm/T+15min──> COMPLETED
```

### 3.2 关键流程

| 流程     | 主线                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 报价     | quote service 取 errand_pricing + 调用 map.distance + 扫 prohibited_item.keyword → 写 errand_quote + Redis 5 min                                      |
| 提交订单 | submit service 校验 quoteId 未过期 + 创 errand_order + errand_order_detail + errand_attachment + errand_price_snapshot + 触发 ErrandOrderCreated      |
| 支付     | 复用 stage 5 payment.prepay(bizType='ERRAND') → callback → PaymentSucceededPayload(bizType='ERRAND') → ErrandPaidSubscriber                           |
| 调度     | ErrandPaidSubscriber 写 errand_task.status='READY_FOR_DISPATCH' + 触发 ErrandDispatchSubscriber → push 骑手                                           |
| 加急     | 用户主动确认加价 → urgent service 重算 urgentFee + 更新 errand_order.urgent_fee + 触发 ErrandPriceIncreased                                           |
| 备注     | remark service 写 errand_timeline(type='REMARK') + 触发 ErrandRemarkAdded                                                                             |
| 取消     | 用户主动取消(WAIT_PAY only) → cancel service 推进状态 + 触发 ErrandOrderCancelled(沿用 FoodOrderCancelled 事件名复用?-> 不,新增 ErrandOrderCancelled) |
| 自动关单 | wait-pay-timeout-close-errand.job 30s 扫 expireAt < now 的 WAIT_PAY → 关单                                                                            |
| 自动加价 | no-rider-price-increase.job 1min 扫 ASSIGNED 超 3 min 未变 + DISPATCHING 超 3 min → 推 push                                                           |
| 自动取消 | no-rider-cancel.job 1min 扫 DISPATCHING 超 10 min → CANCELLED + ErrandNoRiderCancelled 事件 → refund mock                                             |
| 预约入池 | reserved-errand-dispatch.job 30s 扫 reservedTime ≤ now+10min 的 PAID 订单 → DISPATCHING                                                               |

### 3.3 模块依赖

```
errand-type ──┐
errand-pricing─┼──> errand-order ──> payment(stage5)
prohibited-item┘         │
                         │
                         ├──> errand-dispatch ──> rider-task-pool(stage3)
                         │           │
                         │           └──> push.adapter(stage0 mock)
                         │
                         └──> track-query(stage5)

events ──> errand-subscribers(6) ──> {sms, push, refund}.adapter
scheduler ──> errand-jobs(4)
admin-errand-order ──> errand-order(read-only)
```

### 3.4 第三方适配(本阶段全部 mock)

- map.adapter:`distance(lng1,lat1,lng2,lat2)` → 直线距离米(Haversine 公式);`route()` → 起点+终点+eta 直线。
- wxpay/alipay:沿用 stage 5 MockAdapter(0 元 + 自动 callback 已配)。
- push:沿用 getui mock(`pushOne({cid:'rider:<riderId>', title, body, payload})`)。
- sms:沿用 stage 1 mock(send(mobile, scene, code))。
- 真接入全部 stage 8/11 后续阶段。

### 3.5 装饰器与权限

- 全部 c 端写接口:`@Idempotent({ttl:60})` + `@Audit({targetType:'ERRAND_ORDER'})`。
- 读接口:仅 `@CustomerJwt`(从 stage 1)。
- admin 接口:`@AdminJwt` + `@RequirePermission('admin:errand-orders:view')`。
- callback:`@Public`(stage 5 已建,本阶段不动)。

## 4. 边界与限制

### 4.1 严格不做(已写规划)

- 商家端跑腿入口
- 真支付凭证 / 真高德路线 / 真 sms / 真售后流程
- 跑腿评价(规划文档没列,本阶段不做)
- 跑腿优惠券/积分(规划文档没列,本阶段不做 — 与 stage 5 A6 决策一致)
- 平台 Web 计价规则配置页 / 违禁品配置页(stage 9 接)

### 4.2 明确放过(stage 7/8/9/11 接)

- 跑腿售后真流程(stage 7 商家端)
- 接单/取送/送达完整动作(stage 8 骑手端)
- 真高德路线规划(stage 8)
- 真支付/真 sms(stage 8/11)
- 计价规则后台 UI(stage 9)
- 违禁品后台 UI(stage 9)

## 5. 累计指标(本阶段交付后)

| 维度           | stage 5 末 | stage 6 末(预计)                                        |
| -------------- | ---------- | ------------------------------------------------------- |
| 后端 modules   | 45         | 52(+7)                                                  |
| 数据表         | 49         | 57(+8)                                                  |
| HTTP 接口      | 84         | 97(+13)                                                 |
| EventName      | 33         | 39(+6)                                                  |
| 事件订阅器     | 26         | 32(+6)                                                  |
| 定时任务       | 23         | 27(+4)                                                  |
| 用户端页面     | 21         | 35(+14)                                                 |
| 平台 Web 页面  | 17         | 18(+1)                                                  |
| 后端 jest 用例 | 510        | ≥640(+≥130)                                             |
| 权限点         | 全栈累计   | +2(admin:menu:errand-orders / admin:errand-orders:view) |
