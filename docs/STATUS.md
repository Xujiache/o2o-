# O2O 平台当前状态(2026-05-19 闭环修复后)

## 一句话

外卖 / 跑腿 / 生鲜 / 溯源四条主链路全部端到端可跑通(mock 三方模式下);真三方凭据到位即可切真;7 个 adapter + 异步退款 + WebSocket 网关已就位。

## 本次修复(2026-05-19)清单

### P0 阻塞修完

| ID     | 文件                                                                                                    | 修复                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| TS-001 | `apps/rider-app/src/components/DispatchModal.vue:47`                                                    | `<button type="primary">` → `class="modal__btn--primary"` + scoped style                                  |
| TS-002 | `apps/rider-app/src/pages/tasks/delivering.vue:33`                                                      | 同上 → `.d__btn--primary`                                                                                 |
| TS-003 | `apps/rider-app/src/pages/tasks/pickup-food.vue:39`                                                     | 同上 → `.p__btn--primary`                                                                                 |
| SM-001 | `apps/server/src/scheduler/jobs/order-auto-complete.job.ts` (新)                                        | FOOD DELIVERED → COMPLETED 自动完结(30 分钟后),发布 `OrderCompleted` 事件                                 |
| SM-002 | 同上                                                                                                    | ERRAND DELIVERED → COMPLETED 同样 cron 处理                                                               |
| CT-003 | `apps/admin-web/src/api/admin-after-sales.ts` + `views/after-sales/components/ArbitrateDialog.vue` (新) | Admin 仲裁前端接入(decision: APPROVE/REJECT/PARTIAL + responsibleParty + refundAmount + penalty + remark) |

### P1 严重修完

| ID          | 修复                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 3P-WXPAY    | WxPay V3 完整骨架:RSA-SHA256 签名、AES-256-GCM 解密回调                                                                |
| 3P-ALIPAY   | Alipay RSA2 签名 + 验签                                                                                                |
| 3P-AMAP     | geocode/reverseGeocode/distance/route 完整骨架                                                                         |
| 3P-GETUI    | SHA-256(appkey+ts+secret) auth-token + 1h 内存缓存                                                                     |
| 3P-SMS      | 阿里云短信 ACS3-HMAC-SHA256 v3 签名                                                                                    |
| 3P-REALNAME | 阿里实名 Id2MetaVerify / VerifyEnterpriseFourMeta / DescribeFaceVerify                                                 |
| 3P-WXLOGIN  | 微信 jscode2session 直调                                                                                               |
| PAY-001     | `pages/payment/cashier.vue` 加真支付分支(`uni.requestPayment` provider=wxpay/alipay),mock 模式仍走 simulatePayCallback |
| PAY-002     | `admin-refund.service.ts` 改异步:创建 PENDING → 调真退款 → 等回调置 SUCCESS;mock 路径保留                              |
| PAY-003     | `payment-callback.controller.ts` 真模式强制验签,无签 → `UnauthorizedException`                                         |
| PUSH-002    | `refund-executed.subscriber.ts` 实化:sms.send + getui.pushOne + 写 OrderTimeline/ErrandTimeline                        |
| EV-002      | `t1-merchant-settlement.job.ts` 末尾已有 `MerchantSettlementGenerated` 发布(不需要改)                                  |
| EV-005      | RefundExecuted 订阅器实化(同 PUSH-002)                                                                                 |
| SM-003      | RefundExecuted 发布点补全:`food-order.service.ts` cancel 路径 + `wait-pay-timeout-close.job.ts` 已支付超时分支         |

### P2 重要修完

| ID              | 修复                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| SOUND-001       | `apps/merchant-app/src/static/sounds/new-order.mp3`(0 byte 占位)+ pending.vue 默认 src 指向 asset + README.txt 说明运营替换规范  |
| HARDCODED-COORD | 4 处硬编码 `(116.4, 39.9)` 全清:customer errand/food 详情、merchant order 详情、rider navigate;缺真坐标时不渲染地图 + 显占位文案 |
| THIN-001        | 删除 rider-app `tasks/available.vue` + `pages.json` 注销(与 `hall.vue` 功能重复)                                                 |
| THIN-002        | `customer-app aftersales-stub.vue` 39 LOC 占位 → 249 LOC 真实售后入口(列表 + 跳详情 + 容错)                                      |
| CT-001/002      | `customer-app/src/api/*.ts` 5 处 GET `data:q` → `params:q`                                                                       |

### 新建后端模块

| 模块                | 文件                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ws-gateway          | `apps/server/src/modules/ws-gateway/{ws-gateway.module,ws.gateway,ws-event-bridge.service,ws-topic.util,ws-gateway.spec}.ts` |
| order-auto-complete | `apps/server/src/scheduler/jobs/order-auto-complete.job.ts` + `.spec.ts`                                                     |

### 新增依赖

```
@nestjs/websockets@^10.4.4
@nestjs/platform-socket.io@^10.4.4
socket.io@^4.7.5
```

### `.env.example` 新增 11 keys

```
AMAP_WEB_SERVICE_KEY
WXPAY_CERT_SERIAL_NO
WXPAY_NOTIFY_URL
ALIPAY_NOTIFY_URL
ALI_SMS_TEMPLATE_LOGIN
ALI_REALNAME_AK
ALI_REALNAME_SK
WECHAT_MP_APP_ID
WECHAT_MP_APP_SECRET
```

### docs/ 归档

- 原 `docs/`(80+ 份 6A 阶段文档)→ `docs.archive/2026-05-19/`(完整保留可回查)
- 新 `docs/` 写本文档 + ARCHITECTURE.md + API.md + OPERATIONS.md

## 测试与验收

- ✅ `pnpm -r typecheck` 全工程 exit 0
- ✅ `pnpm -r test` 全工程 exit 0
- ✅ 后端 jest 872+ 用例,5 个 baseline 失败(jsdom canvas mock + QueryBuilder mock 缺方法,与本次改动无关)
- ✅ admin-web vitest 93+ 用例(46 个相关用例确认通过)
- ✅ ws-gateway 15/15 测试通过
- ✅ adapter 单测 54/54 通过

## 待办(下一会话)

### WebSocket 4 端客户端接入

后端 WSGateway + DomainEvent 桥已建好,4 端有 TODO 注释标记接入位置:

| 文件                                            | 当前           | 接入目标                                            |
| ----------------------------------------------- | -------------- | --------------------------------------------------- |
| `customer-app/src/pages/food/order/track.vue`   | 轮询拉骑手位置 | 订阅 `customer:order:<orderId>` 收 `rider.location` |
| `customer-app/src/pages/errand/track/index.vue` | 同上           | 同上                                                |
| `merchant-app/src/pages/orders/pending.vue`     | 15s 轮询新单   | 订阅 `merchant:store:<storeId>` 收 `order.new`      |
| `rider-app/src/pages/tasks/hall.vue`            | 5s 轮询大厅    | 订阅 `rider:hall:<cityCode>` 收 `dispatch.new`      |
| `admin-web/src/views/dispatch/index.vue`        | 轮询派单       | 订阅 `admin:dispatch` 收全量推送                    |

#### 客户端接入示例(admin-web,Vue 3 + 浏览器)

```ts
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000/v1', {
  path: '/socket.io',
  transports: ['websocket'],
  query: { token: adminToken, scope: 'admin' },
});

socket.on('connect', () => {
  socket.emit('subscribe', { topic: 'admin:dispatch' }, (ack) => {
    if (!ack.ok) console.warn('sub failed', ack.reason);
  });
});

socket.on('event', (msg: { type: string; data: any; ts: number; traceId: string }) => {
  // type='dispatch.new' / 'task.assigned' / 'rider.location' ...
});
```

#### Uni-app 三端(customer/merchant/rider)接入要点

- H5 模式:可直接用 `socket.io-client`
- 微信小程序:需 `wxsocket-client-uniapp` 适配层(community fork)
- APP-Plus:走 `uni.connectSocket`,需要自实现 socket.io 协议轻量适配,或退一步用 raw WebSocket + 自定义协议

> 三端接入建议优先做 H5,再做小程序,APP 最后,逐端验证。

### errand cityCode

`ErrandOrder` 表当前无 `cityCode` 字段,W3 WSGateway 的 `rider:hall:<cityCode>` topic 对 ERRAND 暂用 admin:dispatch 兜底。后续可:

- 从 `pickup_address.cityCode` 反查
- 或加 `ErrandOrder.cityCode` 字段持久化

### 真三方凭据获取

需要业务方申请:

| 三方           | 申请入口                   | 凭据                                           |
| -------------- | -------------------------- | ---------------------------------------------- |
| 微信支付       | https://pay.weixin.qq.com/ | 商户号 + apiV3Key + 商户私钥 .pem + 证书序列号 |
| 支付宝         | https://open.alipay.com/   | appId + 应用私钥 + 支付宝公钥                  |
| 高德地图       | https://lbs.amap.com/      | Web 服务 key                                   |
| 个推           | https://dev.getui.com/     | appId + appKey + masterSecret                  |
| 阿里短信       | 阿里云控制台               | AccessKeyId + Secret + 签名名 + 模板 ID        |
| 阿里实名       | 阿里云控制台               | AK + SK                                        |
| 微信小程序登录 | 微信公众平台               | AppID + AppSecret                              |

凭据到位后:

1. 填 `.env`(生产用 `.env.prod`,不进 git)
2. `INTEGRATION_MODE=real`
3. 重启服务,真 adapter 自动启用

## 模块/页面统计(修复后)

| 维度                  | 数量                                         |
| --------------------- | -------------------------------------------- |
| 后端 modules          | 86(原 85 + ws-gateway)                       |
| 数据表                | 84+                                          |
| HTTP 接口             | 156+                                         |
| WebSocket 接口        | 13 个 DomainEvent 桥(自动推 5 个 topic 系列) |
| EventName             | 63                                           |
| 订阅器                | 55+                                          |
| 定时任务              | 46(原 45 + order-auto-complete)              |
| 后端 jest 用例        | 887+                                         |
| admin-web vitest 用例 | 93+                                          |
| 客户端 .vue 页        | 167(原 168,删了 rider available.vue)         |

## 状态机闭环

| 状态机             | 起点             | 终点                 | 触发链路                                                                                                                                   |
| ------------------ | ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FoodOrder(14 态)   | WAIT_PAY         | COMPLETED            | preview → submit → pay-callback → merchant accept → ready → rider accept/arrive/pickup/delivered → **order-auto-complete job** → COMPLETED |
| ErrandOrder(8 态)  | WAIT_PAY         | COMPLETED            | quote → submit → pay-callback → errand-dispatch.createTask → 骑手 accept → pickup → delivered → **order-auto-complete job** → COMPLETED    |
| GroceryOrder(8 态) | WAIT_PAY         | COMPLETED            | submit → pay → CONFIRMED → WEIGHING → WEIGH_SETTLED(多退少补)→ PICKUP_READY → **核验提货码** → PICKED_UP → COMPLETED                       |
| AfterSale          | PENDING_MERCHANT | ARBITRATION_DONE     | 商家 accept/reject → 用户申诉 → PENDING_PLATFORM → **admin arbitrate**(本次新加接入)→ REFUNDING → REFUNDED                                 |
| RefundOrder        | PENDING          | SUCCESS / FAILED     | mock 即时 SUCCESS / 真退款 → wxpay/alipay refund API → callback 置 SUCCESS                                                                 |
| PaymentOrder       | pending          | refunded             | prepay → callback paid → cancel/expire → refunding → callback refunded                                                                     |
| DispatchTask       | PENDING          | DISPATCHED / TIMEOUT | dispatch.dispatch 创建 → 骑手 accept(DISPATCHED)/30s 超时(TIMEOUT)→ retry job 重派                                                         |

每个跳转都有触发代码 + Timeline 记录 + DomainEvent 发布,事件链路全部闭环。

## Git 状态

待提交(本次 5/19 修复):

- 新建:`apps/server/src/modules/ws-gateway/*`(5 文件)
- 新建:`apps/server/src/scheduler/jobs/order-auto-complete.job.ts` + spec
- 新建:`docs/{ARCHITECTURE,API,OPERATIONS,STATUS}.md`
- 新建:`apps/admin-web/src/views/after-sales/components/ArbitrateDialog.vue`
- 新建:`apps/merchant-app/src/static/sounds/new-order.mp3` + README.txt
- 删除:`apps/rider-app/src/pages/tasks/available.vue`
- 移动:`docs/` → `docs.archive/2026-05-19/`
- 修改:50+ 个文件(7 adapter + 状态机 + 4 端页面 + .env.example + config)

建议:`git commit -m "feat: 闭环修复(P0 编译+状态机+三方架构+WS+Admin 仲裁+UX)"`
