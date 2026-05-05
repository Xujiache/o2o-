# 阶段 6 — 用户端跑腿交易闭环 · 项目总结(FINAL)

## 1. 总览

| 维度             | 数据                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| 原子任务         | 32/32(开发 28 + 测试与文档 4)                                                                            |
| 后端模块         | 6 新业务 + 1 admin + 1 扩展(rider-task-pool) = 8                                                         |
| 数据表           | 10 新(8 业务 + 2 配置)                                                                                   |
| HTTP 接口        | 13(9 c 端 + 3 admin + 1 复用 callback,bizType 路由)                                                      |
| 领域事件         | 6 新(EventName 累计 33 → 39)                                                                             |
| 事件订阅器       | 6                                                                                                        |
| 定时任务         | 4(scheduler 累计 23 → 27)                                                                                |
| 权限点           | +2(admin:menu:errand-orders + admin:errand-orders:view)                                                  |
| 用户端页面       | 14(pages.json 累计 21 → 35)                                                                              |
| 平台 Web 页面    | +1(/admin/errand-orders)+ 1 详情抽屉                                                                     |
| 后端 jest 测试   | **603**(78 suites,stage 5 末 510 → +93)                                                                  |
| 前端 vitest 测试 | customer-app **63** + admin-web **66** = 129                                                             |
| 总 commit        | 9 个 stage 6 commit:05b5fe5 / 7e92c73 / 59cc8ee / 9d0236d / 1fcd5da / 8a45346 / bc0b793 / 7b94bcf / 本次 |

## 2. 能力矩阵

| 能力                                         | 端       | 入口                                              | 后端模块                 | 状态 |
| -------------------------------------------- | -------- | ------------------------------------------------- | ------------------------ | ---- |
| 跑腿首页(4 类配置驱动)                       | 用户端   | /pages/errand/home/index                          | errand-type              | ✓    |
| 4 类表单(BUY/DELIVER/HELP/CUSTOM)            | 用户端   | /pages/errand/form/{buy,deliver,help,custom}      | -(前端字段校验)          | ✓    |
| 跑腿报价(距离 Haversine + 计价 + 违禁扫描)   | 用户端   | /pages/errand/quote/index                         | errand-order.quote       | ✓    |
| 提交订单(锁 quote 5min + 调 payment.prepay)  | 用户端   | /pages/errand/confirm/index                       | errand-order.submit      | ✓    |
| 收银台 + 唤起 wxpay/alipay SDK               | 用户端   | /pages/payment/cashier(复用 stage 5)              | payment.prepay           | ✓    |
| 支付回调验签 + bizType 路由 + 双事件         | 后端     | POST /callback/{wxpay,alipay}                     | payment.handleCallback   | ✓    |
| 跑腿订单列表 + 5 tab 筛选(A1 补)             | 用户端   | /pages/errand/order/list                          | errand-order.list        | ✓    |
| 跑腿订单详情 + timeline + actions            | 用户端   | /pages/errand/order/detail                        | errand-order.detail      | ✓    |
| 用户取消订单(WAIT_PAY only,A2 补)            | 用户端   | 详情页内嵌弹窗                                    | errand-order.cancel      | ✓    |
| 加急(standard→fast/express)                  | 用户端   | 详情页内嵌弹窗                                    | errand-order.urgent      | ✓    |
| 补充备注 + 附件                              | 用户端   | 详情页内嵌弹窗                                    | errand-order.remark      | ✓    |
| 配送轨迹(简化 起点+终点+eta)                 | 用户端   | /pages/errand/track/index                         | errand-order.track       | ✓    |
| 地址选择 / 图片上传(占位)                    | 用户端   | /pages/errand/{address-picker,image-upload}/index | -(stage 8 接真定位/上传) | ✓    |
| 售后入口占位(复用 stage 5 stub)              | 用户端   | /pages/me/aftersales-stub                         | -(stage 7)               | ✓    |
| 骑手 APP 任务大厅(扫 errand_task 简化卡)     | 骑手端   | /api/v1/r/tasks/available 扩展                    | rider-task-pool          | ✓    |
| 平台 Web 跑腿订单监控页(列表/筛选/统计/抽屉) | 平台 Web | /admin/errand-orders                              | admin-errand-order       | ✓    |
| 15 min 未支付自动关单                        | 后端     | wait-pay-timeout-close-errand.job(每 30s)         | scheduler                | ✓    |
| 3 min 无骑手自动加价推送                     | 后端     | no-rider-price-increase.job(每 1min)              | scheduler                | ✓    |
| 10 min 无骑手取消并退款 mock                 | 后端     | no-rider-cancel.job(每 1min)                      | scheduler                | ✓    |
| 预约跑腿到点入调度池                         | 后端     | reserved-errand-dispatch.job(每 30s)              | scheduler                | ✓    |

## 3. 关键决策

### 用户拍板(对齐文档 § 4 决策清单)

- **A1 跑腿订单列表 → 甲方案**:本阶段新增 `GET /c/errand/orders` → 已实现
- **A2 用户主动取消 → 甲方案**:本阶段新增 `POST /c/errand/orders/{id}/cancel`(WAIT_PAY only)→ 已实现
- **A3 售后入口 → 甲方案**:复用 stage 5 `/pages/me/aftersales-stub` → 已实现
- **A4 平台 Web 跑腿监控 → 甲方案**:补 3 admin 接口 + 1 监控页(/admin/errand-orders)→ 已实现
- **A5 quote 缓存 → 甲方案**:5 min Redis SETEX + DB 双写,提交时校验未过期 + 未使用 → 已实现
- **A6 4 类配置驱动 → 甲方案**:errand_type 表 + requiredFields JSON + seed 4 条 → 已实现

### 自动决策(沿用 stage 5 套路)

| ID   | 决策                                                                                                   | 落地位置                             |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ | -------------------- |
| 6.1  | BIGINT 时间戳 + 主键 `<table>_id` 自增                                                                 | 10 个 entity 全部                    |
| 6.2  | 事件命名 `domain.errand[-quote                                                                         | -order].<verb>`                      | events.ts +6 stage 6 |
| 6.3  | orderNo = `E` + yyyyMMdd + redis incr 6 位                                                             | errand-order.service.generateOrderNo |
| 6.4  | 复用 stage 5 PaymentSucceededPayload(bizType='ERRAND')                                                 | payment.handleCallback               |
| 6.5  | 跑腿状态机:WAIT_PAY → PAID → DISPATCHING → ASSIGNED → PICKED_UP → DELIVERED → COMPLETED + CANCELLED    | errand-order.entity                  |
| 6.6  | quote 5 min Redis SETEX + DB 双写;提交时 quoteId 未过期 + 未使用                                       | errand-order.quote/submit            |
| 6.7  | callback 走 stage 5 既有 endpoint;按 payment.bizType 分发 applyFood/applyErrandPaid                    | payment.service.handleCallback       |
| 6.8  | jobs 每 30s/1min 扫描 + DistributedLock                                                                | 4 stage 6 jobs                       |
| 6.9  | 装饰器约定 @Idempotent + @Audit                                                                        | 全 c 端写接口                        |
| 6.10 | 违禁命中:WARN 不阻断 quote;REJECT 阻断 quote 抛 INVALID_PARAM                                          | errand-order.quote                   |
| 6.11 | 加急规则:standard 0 / fast 5 元 / express 10 元(可配置)                                                | errand_pricing 表                    |
| 6.12 | 3 min 加价 = job 写 errand_task.priceIncrease + push,不自动扣款,需用户加急确认                         | no-rider-price-increase.job          |
| 6.13 | 10 min 自动取消 = job → ErrandNoRiderCancelled → ErrandNoRiderCancelledSubscriber(payment.refund mock) | no-rider-cancel.job + subscriber     |
| 6.14 | 状态文案前端字典化(STATUS_LABEL_ERRAND / URGENT_LABEL / TYPE_LABEL)                                    | customer-app utils/errand-status.ts  |
| 6.15 | rider-task-pool 扩展 bizType filter,合并扫 food_order + errand_task                                    | rider-task-pool.service              |

## 4. 提交记录

```
05b5fe5  docs(stage-6): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)
7e92c73  feat(stage-6): T01-T03 schema + 6 events + map.adapter Haversine
59cc8ee  feat(stage-6): T04-T06 errand-type/prohibited-item/errand-pricing
9d0236d  feat(stage-6): T07-T10 errand-order quote/submit + paid/dispatch
1fcd5da  feat(stage-6): T11-T16 list/detail/cancel/urgent/remark/track
8a45346  feat(stage-6): T17-T20 5 subscribers + 4 jobs + admin + rider 扩展
bc0b793  feat(stage-6): T21-T27 customer-app 14 页 + 4 api + 3 stores + status 字典
7b94bcf  feat(stage-6): T28 admin-web 跑腿订单监控页 + 详情抽屉
本次     feat(stage-6): T29-T32 测试补漏 + 手动审查 + 阶段验收文档(完整交付 32/32)
```

## 5. 与 stage 5 的对照

| 维度          | stage 5 末 | stage 6 末 | 增量              |
| ------------- | ---------- | ---------- | ----------------- |
| 后端 modules  | 45         | 53         | +8(含 rider 扩展) |
| 数据表        | 49         | 59         | +10               |
| HTTP 接口     | 84         | 97         | +13               |
| EventName     | 33         | 39         | +6                |
| 事件订阅器    | 26         | 32         | +6                |
| 定时任务      | 23         | 27         | +4                |
| 用户端页面    | 21         | 35         | +14               |
| 平台 Web 页面 | 17         | 18         | +1                |
| jest 用例     | 510        | 603        | +93               |
| vitest 用例   | 49+62=111  | 63+66=129  | +18               |
| 总 commit     | 9          | 9          | -                 |

## 6. 后续阶段对接点

- **stage 7(商家端订单售后结算数据)**: 跑腿无商家闭环;但 `aftersales-stub` 真售后需对应骑手端入口
- **stage 8(骑手端调度轨迹收益考核)**: rider-task-pool 接单/取餐/送达完整动作 + 真 amap 路线 + 真 wxpay/alipay
- **stage 9(平台运营财务)**: errand_pricing 配置 UI + prohibited_item 配置 UI + 跑腿仲裁/取消/退款管理
- **stage 11(性能安全兼容)**: 真 sms 接入(把 customerId 占位换成 customer_user.mobile)
