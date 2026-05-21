# O2O 平台架构

## 业务定位

本地生活双业务平台,提供:

- **外卖订单(FOOD)**:用户在店铺下单 → 商家出餐 → 骑手配送 → 客户签收
- **跑腿订单(ERRAND)**:用户填表报价 → 支付 → 骑手抢单 → 取货 → 送达,4 个子类型(帮取/帮送/帮买/帮排队)
- **生鲜自提(GROCERY)**:用户在生鲜商城下单 → 商家拣货+称重(多退少补)→ 用户到自提点核销提货
- **溯源(TRACE)**:为生鲜产品提供批次/单 QR 维度的可追溯档案

> 外卖、跑腿、生鲜三套订单体系**完全独立** —— 独立状态机、独立计价、独立退款规则、独立结算。商家端只做 APP(禁止 Web/小程序);骑手端只做 APP。

## 工程结构(pnpm monorepo)

```
o2o-platform/
├── apps/
│   ├── server/              # NestJS 10 单体后端,模块化(85 个 modules)
│   ├── customer-app/        # 用户端 Uni-app(微信小程序 + Android + iOS + H5)
│   ├── merchant-app/        # 商家端 Uni-app(仅 Android/iOS)
│   ├── rider-app/           # 骑手端 Uni-app(仅 Android/iOS)
│   └── admin-web/           # 平台管理 Web(Vue 3 + Vite + Element Plus)
├── packages/
│   ├── contracts/           # 跨端共享:错误码、状态枚举、Header 常量、响应类型
│   ├── api-client/          # HTTP 客户端封装(axios + uni-request 双适配)
│   └── ui-kit/              # 跨端工具函数(formatAmount/formatDistance/maskPhone 等)
├── deploy/
│   ├── docker-compose.dev.yml
│   └── Dockerfile.server
├── docs/                    # 顶层架构文档(本文档 + API/OPERATIONS/STATUS)
└── docs.archive/2026-05-19/ # 历史 6A 阶段文档(stage 0-10 + 生鲜溯源 + 优惠券)
```

## 技术栈

| 层            | 选型                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| 后端语言/框架 | Node 20 + NestJS 10 + TypeScript 5 strict                                  |
| 数据          | MySQL 8(本地 3307)+ Redis 7 + MongoDB 7 + MinIO                            |
| ORM           | TypeORM(MySQL)+ Mongoose(MongoDB)                                          |
| 实时通信      | socket.io(@nestjs/websockets + @nestjs/platform-socket.io)                 |
| 前端框架      | Vue 3 + TS + Pinia + uview-plus(Uni-app)/ Element Plus(admin-web)          |
| 第三方        | 高德地图、微信支付 V3、支付宝、个推、阿里云短信、阿里云实名、微信登录      |
| 工程          | pnpm 9 workspace + ESLint + Prettier + Husky + commitlint + GitHub Actions |

## 端隔离(强制契约)

| 端         | 路径前缀              | Token Header     | JWT 密钥              |
| ---------- | --------------------- | ---------------- | --------------------- |
| 用户端     | `/api/v1/c/**`        | `Customer-Token` | `JWT_CUSTOMER_SECRET` |
| 商家端 APP | `/api/v1/m/**`        | `Merchant-Token` | `JWT_MERCHANT_SECRET` |
| 骑手端 APP | `/api/v1/r/**`        | `Rider-Token`    | `JWT_RIDER_SECRET`    |
| 平台 Web   | `/api/v1/admin/**`    | `Admin-Token`    | `JWT_ADMIN_SECRET`    |
| 公开接口   | `/api/v1/pub/**`      | 无或可选         | —                     |
| 第三方回调 | `/api/v1/callback/**` | 验签(强制)       | —                     |

跨端持错 token → `FORBIDDEN`。

## 后端模块清单(85)

按业务域:

- **认证/用户**:auth, customer-auth, merchant-auth, rider-auth, admin-auth, user-profile, realname
- **地址/地理**:address
- **店铺/商品**:store, store-query, public-store-readonly, product, product-query, stock, prohibited-item
- **购物车**:cart
- **订单**:food-order, errand-order, errand-pricing, errand-type, grocery-order, grocery-product, pickup-point
- **派单/骑手任务**:dispatch, errand-dispatch, rider-task, rider-task-pool, rider-location, rider-earning, rider-assessment
- **支付/财务**:payment, gateway(回调), finance, points, marketing, coupon
- **商家**:merchant-onboarding, merchant-order, merchant-after-sale, merchant-settlement, merchant-statistics, merchant-promotion, merchant-review, merchant-withdrawal
- **骑手**:rider-onboarding, rider-profile, rider-withdrawal, violation
- **客户**:customer-orders, customer-after-sale, customer-review
- **管理(admin-\*)**:auth, user, merchant, rider, orders, food-order, errand-order, after-sale, refund, payment, settlement, withdrawal, dispatch, category, city, merchant-statistics, role-permission, system-config, third-party-config, track-replay, violations
- **基础设施**:file, sms, push-device, audit-log, system, dict, dashboard, export, common-config, message-setting, risk
- **集成**:integration-gateway(WxPay/Alipay/AMap/Getui/SMS/Realname/WxLogin/MinIO 7+1 adapter)
- **实时**:ws-gateway(socket.io 网关 + DomainEvent 桥)
- **轨迹/溯源**:track, track-query, traceability

## 核心数据流

### 外卖下单全链路

```
用户 cart → preview(锁价+锁优惠券)→ submit(锁库存+创建 FoodOrder WAIT_PAY)
  → prepay → 调起 wxpay/alipay → 支付成功 → callback(验签)
  → PaymentSucceeded 事件 → food_order.status=PAID_WAIT_MERCHANT
  → 商家 accept → PREPARING → ready → READY_FOR_PICKUP
  → FoodReadyForPickup 事件 → dispatch.dispatch() 创 DispatchTask
  → 骑手大厅广播 → 骑手 accept → RiderTask ASSIGNED
  → 到店 ARRIVED_PICKUP → 取餐 PICKED_UP → 送达 DELIVERED
  → 30 分钟自动 → OrderCompleted → t1-merchant-settlement 计入
```

### 跑腿下单全链路

```
用户填表(buy/deliver/help/custom)→ quote(算价+违禁词扫)→ submit
  → ErrandOrder WAIT_PAY → 支付 → ErrandPaid 事件
  → errand-dispatch.createTask + dispatch.dispatch → 骑手大厅
  → 骑手抢单 → 到达取件 → 取件(核验取件码)→ 送达(核验收货码)
  → OrderCompleted → 结算
```

### 生鲜下单全链路

```
用户浏览 → 选自提点 → 下单(预付预估金额)→ GroceryOrder WAIT_PAY
  → 支付 → PAID → 商家拣货 CONFIRMED → 称重 WEIGHING
  → 称重结算 WEIGH_SETTLED:
    delta ≈ 0 → COMPLETED
    delta > 0 → PAYMENT_PENDING(用户扫码补付)→ COMPLETED
    delta < 0 → REFUNDING(自动退款)→ COMPLETED
  → 用户到自提点 → 出示 6 位提货码 → sha256(code+salt) 核验 → PICKED_UP
```

## 状态机(权威定义在 `packages/contracts/src/status/*`)

- **FoodOrder**:14 态,见 `takeaway.ts::TakeawayNextStates`
- **ErrandOrder**:8 态,见 `errand.ts::ErrandNextStates`
- **GroceryOrder**:8 态,见 `apps/server/src/modules/grocery-order/`
- **AfterSale**:`PENDING_MERCHANT → MERCHANT_ACCEPTED/REJECTED → PENDING_PLATFORM(申诉)→ ARBITRATION_DONE`
- **RefundOrder**:`PENDING → SUCCESS / FAILED`
- **PaymentOrder**:`pending → paid → refunding → refunded`
- **DispatchTask**:`PENDING → DISPATCHED / TIMEOUT`(超时自动重派)

每个状态跳转都有触发点 + 写 `OrderTimeline/ErrandTimeline` + 发 DomainEvent + 审计。

## 事件总线(63 个 EventName)

- 位置:`apps/server/src/events/events.ts`
- 实现:`DomainEventBus`(`domain-event-bus.ts`)— 落 `domain_event` 表 + EventEmitter2 emitAsync + 失败指数退避
- 订阅器:`apps/server/src/events/subscribers/*.subscriber.ts`,使用 `@OnEvent(EventName.X)` 装饰

关键事件:

| 事件                          | 发布点                                       | 订阅器副作用                                   |
| ----------------------------- | -------------------------------------------- | ---------------------------------------------- |
| `FoodOrderPaid`               | payment callback                             | 推送商家 + 短信用户 + 审计                     |
| `FoodReadyForPickup`          | merchant ready                               | dispatch.dispatch → 创 DispatchTask            |
| `ErrandPaid`                  | payment callback                             | errand-dispatch.createTask + dispatch.dispatch |
| `RiderDelivered`              | rider 送达                                   | rider-earning 累计 + 审计                      |
| `OrderCompleted`              | order-auto-complete job(30 分钟后)           | t1-merchant-settlement 计入 + WS 推送商家+客户 |
| `RefundExecuted`              | admin 仲裁 / customer cancel / wait-pay 超时 | 短信用户 + getui 推送 + 写 OrderTimeline       |
| `MerchantSettlementGenerated` | t1-merchant-settlement.job                   | 商家结算可用余额更新                           |

## 实时推送(WebSocket)

- **端点**:`ws://server/v1`(socket.io namespace `/v1`)
- **握手**:query 参数 `token=<scope-token>&scope=<customer|merchant|rider|admin>`,失败 close 4401
- **订阅**:`socket.emit('subscribe', { topic })`,服务端校验权限 ack `{ok, reason?}`
- **接收**:`socket.on('event', ({ type, data, ts, traceId }) => ...)`

Topic 命名:

| Topic                      | 受众           | 用途                  |
| -------------------------- | -------------- | --------------------- |
| `customer:order:<orderId>` | 订单所属客户   | 订单状态/骑手位置推送 |
| `merchant:store:<storeId>` | 店铺所属商家   | 新单/订单状态推送     |
| `rider:hall:<cityCode>`    | 同城已审核骑手 | 大厅可接单广播        |
| `rider:task:<taskId>`      | 接单骑手       | 任务状态/客服消息     |
| `admin:dispatch`           | admin          | 派单监控全量          |

13 个 DomainEvent → WS 桥实现在 `modules/ws-gateway/ws-event-bridge.service.ts`,自动把后端事件推到对应 topic。

客户端接入示例见 `docs/STATUS.md`。

## 调度(45 个 cron job)

位置:`apps/server/src/scheduler/jobs/*.job.ts`

关键 job:

| Job                            | Cron  | 用途                                                    |
| ------------------------------ | ----- | ------------------------------------------------------- |
| wait-pay-timeout-close         | 30s   | WAIT_PAY 15 分钟未支付自动取消 + 释放库存/优惠券        |
| order-auto-complete            | 1min  | DELIVERED 30 分钟后自动 COMPLETED + 发布 OrderCompleted |
| dispatch-timeout-retry         | 30s   | DispatchTask 超时自动重派                               |
| merchant-accept-timeout-cancel | 1min  | 商家不接单超时自动取消                                  |
| t1-merchant-settlement         | 03:00 | T+1 商家结算                                            |
| rider-earning-daily-settle     | 03:30 | 骑手日结                                                |
| coupon-expire                  | 00:00 | 优惠券过期清理                                          |
| track-compress                 | 04:00 | 轨迹压缩归档                                            |
| risk-exception-scan            | 5min  | 风控异常扫                                              |
| 总计                           | 45    | —                                                       |

所有 job 用分布式锁(Redis NX)防多实例并发。

## 跨切关注

| 关注点   | 实现                                            | 位置                                             |
| -------- | ----------------------------------------------- | ------------------------------------------------ |
| 响应包装 | `{code, message, data, traceId, timestamp}`     | `common/interceptors/response.interceptor.ts`    |
| 异常归一 | HTTP status → ErrorCode                         | `common/filters/all-exceptions.filter.ts`        |
| 幂等     | `@Idempotent({scope,ttl})` + Redis NX + DB 兜底 | `common/interceptors/idempotency.interceptor.ts` |
| 审计     | `@Audit({targetType})` 异步落 MySQL+Mongo       | `common/interceptors/audit.interceptor.ts`       |
| 链路追踪 | `X-Trace-Id` + AsyncLocalStorage                | `common/middleware/trace-id.middleware.ts`       |
| 限流     | ThrottlerGuard + Redis 后端                     | global,60 req/60s 默认                           |
| 加密     | 三方密钥 AES-256-CBC                            | `common/utils/cipher.util.ts`                    |
| 密码     | scrypt + 时序安全比对                           | `common/utils/password.util.ts`                  |

## 金额/距离/时间约定

- **金额**:整型分(BigInt 字符串)
- **距离**:米
- **时间**:毫秒时间戳(字符串落库,number 返回前端)
- **手机号**:E.164 前端不带 +86,后端规范化
- **身份证**:18 位,前后端均掩码展示

写接口必带 `Idempotency-Key` header(api-client 自动注入 nanoid)。
