# 阶段 10 — 四端联调 · 接口状态消息资金 · ALIGNMENT(对齐)

> 严格对照 `项目阶段规划/10-阶段10-四端联调-接口状态消息资金/` 9 份文档。商家端仅 Android/iOS APP,禁止商家 Web/小程序。外卖订单与跑腿订单独立。

## 1. 项目上下文

- 截至 stage 9:**84 modules / 83 表 / 146 接口 / 62 EventName / 55 Subscriber / 42 Job / 74 权限**;server 804 jest + admin-web 93 vitest = 1068 用例
- 关键基础设施已就位:
  - `OrderTimeline`(food)+ `ErrandTimeline`(errand)— stage 5/6 已建表,**仅 INSERT 处使用,无 GET 查询接口**
  - `PaymentOrder` 表 + `payment-callback.controller.ts`(`/callback/wxpay` 与 `/callback/alipay`)— stage 5 已实现,**但路径与契约 `/api/v1/callback/payments/{channel}` 不一致**
  - `c/payments/prepay` POST 已存在,**c 端 GET 单查询无**
  - `admin/payments` 完全无
  - `pub/push/devices` 完全无;getui adapter 已存在
  - `payment-callback-retry.job`、`merchant-accept-timeout-cancel.job`、`no-rider-cancel.job`、`dispatch-timeout-retry.job`、`t1-merchant-settlement.job`、`third-party-retry.job` 全部已存在

## 2. 阶段范围(严格遵循,不多不少)

### 2.1 必须做(来自接口契约清单 9 接口)

| #   | 接口                                                    | 端       | Token    | 现状                     | 行动               |
| --- | ------------------------------------------------------- | -------- | -------- | ------------------------ | ------------------ |
| 1   | GET `/api/v1/c/orders/{bizType}/{orderId}/timeline`     | 用户端   | Customer | 无                       | 新增               |
| 2   | GET `/api/v1/m/food-orders/{orderId}/timeline`          | 商家 APP | Merchant | 无                       | 新增               |
| 3   | GET `/api/v1/r/tasks/{taskId}/timeline`                 | 骑手 APP | Rider    | 无                       | 新增               |
| 4   | GET `/api/v1/admin/orders/{bizType}/{orderId}/timeline` | 平台 Web | Admin    | 无                       | 新增               |
| 5   | GET `/api/v1/c/payments/{payOrderId}`                   | 用户端   | Customer | 无                       | 新增               |
| 6   | GET `/api/v1/admin/payments/{payOrderId}`               | 平台 Web | Admin    | 无                       | 新增               |
| 7   | POST `/api/v1/callback/payments/{channel}`              | 第三方   | 验签     | 现 `/callback/{channel}` | 路径整改(契约对齐) |
| 8   | POST `/api/v1/callback/refunds/{channel}`               | 第三方   | 验签     | 无                       | 新增               |
| 9   | POST `/api/v1/pub/push/devices`                         | 三端 APP | C/M/R    | 无                       | 新增               |

### 2.2 必须做(数据)

- 新增 1 表:**push_device** (deviceToken 唯一 + principalType + principalId + platform + appType + pushEnabled)
- 不新增 event(全部复用)
- 不新增 job(全部已就位,本阶段对应"联调"性质)
- 不新增 subscriber

### 2.3 不做(防越界)

- ❌ 不新增任何业务功能(本阶段为"联调"阶段)
- ❌ 不重做 stage 5/6/7/8/9 已有接口和页面
- ❌ 真 wxpay/真 alipay/真 minio/真 getui — 仍 mock,真接 stage 11
- ❌ 商家 Web、商家小程序(红线)
- ❌ refund 仍走 stage 9 mock SUCCESS 路径,stage 10 仅补 callback 入口骨架 + Idempotency-Key 兜底
- ❌ admin-web 不新增页面(timeline 与 payment 查询已在订单详情/支付详情,留待 stage 11/12 浏览器联调时按需补)
- ❌ user/merchant/rider 客户端代码 stage 10 不动(本仓库无 mp/app 前端代码,仅服务端契约对齐)

## 3. 智能决策记录

### Q1:timeline 接口数据来源选用

**A**:外卖用 `order_timeline` 表,跑腿用 `errand_timeline` 表(两套独立状态机决定)。骑手任务时间线从 `order_timeline` 或 `errand_timeline` 通过 `rider_task` → `bizType+bizOrderId` 反查。

### Q2:`POST /callback/payments/{channel}` 路径整改方式

**A**:**保留** 旧路径 `/callback/wxpay` `/callback/alipay` 不删(向后兼容防生产事故),**新增** `/callback/payments/wxpay` `/callback/payments/alipay` 转发到同 service 方法。stage 11 真接时再废旧路径。

### Q3:`pub/push/devices` 三 token 兼容

**A**:用 ScopeJwt 三 token 任一 OR 守卫 + `principalType` 字段写入。绑定时按 `principalType+principalId+deviceToken` 唯一,`pushEnabled=false` 时软关。

### Q4:`POST /callback/refunds/{channel}` 实现深度

**A**:控制器层接入完整,service 仅做"验签 + nonce 防重 + 查 refund_order(若有)+ 设状态 SUCCESS"。不接真 wxpay refund(stage 11 P3-01)。

### Q5:timeline 响应字段中的 `availableActions` 数据源

**A**:本阶段返回**空数组 + 提示 stage 11 接入** (TODO 标记 + 单元测试覆盖空数组),不写状态机判断逻辑(避免与 stage 5/6 已有 `nextStates` 重复实现)。

### Q6:admin/orders/timeline 中的 `dispatchLogs` `paymentLogs` `operatorLogs`

**A**:`dispatchLogs` 来自 `manual_dispatch_log` + `dispatch_task`(已有);`paymentLogs` 来自 `payment_order.callbackRaw` + `payment_order.status` 历史(只读);`operatorLogs` 来自 `sys_audit_log` 按 targetType/targetId 过滤。

### Q7:用户端订单时间线越权检查

**A**:Customer-Token 校验后,`bizType=FOOD` 时校验 `food_order.customerId === principalId`;`bizType=ERRAND` 时校验 `errand_order.customerId === principalId`。返回 FORBIDDEN 而非 NOT_FOUND(契约要求)。

### Q8:商家任务时间线返回字段 `allowedMerchantActions`

**A**:返回内联数组,基于当前 `food_order.status`:`PAID_WAIT_MERCHANT` → `[ACCEPT, REJECT]`、`PREPARING` → `[READY]`、其他 → `[]`。复用 stage 7 的状态规则。

### Q9:骑手任务时间线返回字段 `allowedRiderActions`

**A**:基于 `rider_task.status`:`ASSIGNED` → `[ARRIVED_PICKUP]`、`ARRIVED_PICKUP` → `[PICKED_UP]`、`PICKED_UP` → `[DELIVERED]`、其他 → `[]`。

### Q10:错误码统一性

**A**:全部 9 接口使用契约清单约定的 7 错误码集(`INVALID_PARAM` / `UNAUTHORIZED` / `FORBIDDEN` / `DATA_NOT_FOUND` / `STATUS_INVALID` / `DUPLICATE_REQUEST` / `THIRD_PARTY_ERROR`),无新错误码。

## 4. 验收标准

- [x] 9 接口路径、Method、Token、错误码与契约清单完全一致
- [x] push_device 表定义完整 + 迁移可应用
- [x] `/callback/payments/{channel}` `/callback/refunds/{channel}` 同时存在(并保留旧路径兼容)
- [x] 三端 APP 共用 push 绑定接口,principalType 区分
- [x] 不出现商家 Web / 商家小程序文件
- [x] server jest 全绿,无新增 vitest 需求(admin-web 本阶段不动)
- [x] stage 10 准入门:gate-pre / gate-mid / gate-post 全绿(typecheck / jest / build)
