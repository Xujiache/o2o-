# 阶段 5 — 用户端外卖交易闭环 · 项目总结(FINAL)

## 1. 总览

| 维度             | 数据                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| 原子任务         | 32/32(开发 28 + 测试与文档 4)                                                                            |
| 后端模块         | 9 新业务 + 1 admin + 1 扩展(rider-task-pool)= 11                                                         |
| 数据表           | 9 新 + 1 ALTER(product_sku.stock_locked)                                                                 |
| HTTP 接口        | 17(12 c 端 + 2 callback + 3 admin)                                                                       |
| 领域事件         | 6 新(EventName 累计 27 → 33)                                                                             |
| 事件订阅器       | 6                                                                                                        |
| 定时任务         | 4(scheduler 累计 19 → 23)                                                                                |
| 权限点           | +2(admin:menu:food-orders + admin:food-orders:view)                                                      |
| 用户端页面       | 14(pages.json 累计 7 → 21)                                                                               |
| 平台 Web 页面    | +1(/admin/food-orders)+ 1 详情抽屉                                                                       |
| 后端 jest 测试   | **510**(67 suites,stage 4 base 371 → +139)                                                               |
| 前端 vitest 测试 | customer-app **49** + admin-web **62** = 111                                                             |
| 总 commit        | 8 个 stage 5 commit:f34c4db / c45e897 / ec88595 / c582ba0 / bb8f7e9 / 8686f14 / fdaddba / cf30186 / 本次 |

## 2. 能力矩阵

| 能力                                     | 端       | 入口                               | 后端模块               | 状态 |
| ---------------------------------------- | -------- | ---------------------------------- | ---------------------- | ---- |
| 外卖首页(banner/类目/推荐)               | 用户端   | /pages/food/home/index             | food-home              | ✓    |
| 城市切换                                 | 用户端   | /pages/food/city-picker/index      | -                      | ✓    |
| 搜索店铺(keyword/sort)                   | 用户端   | /pages/food/search/index           | store-query            | ✓    |
| 店铺详情(分类/sku/售罄置灰)              | 用户端   | /pages/food/store/detail           | product-query          | ✓    |
| 购物车(单店一车 + UNIQUE 跨店)           | 用户端   | /pages/food/cart/index             | cart                   | ✓    |
| 试算订单(coupon/points 置灰 + snapshot)  | 用户端   | /pages/food/order/confirm          | food-order.preview     | ✓    |
| 提交订单(锁库存 + WAIT_PAY)              | 用户端   | 同上                               | food-order.submit      | ✓    |
| 收银台 + 唤起 wxpay/alipay SDK           | 用户端   | /pages/payment/cashier             | payment.prepay         | ✓    |
| 支付回调验签 + 双事件 + 状态机推进       | 后端     | POST /callback/{wxpay,alipay}      | payment.handleCallback | ✓    |
| 订单列表 + 4 tab 筛选                    | 用户端   | /pages/food/order/list             | food-order.list        | ✓    |
| 订单详情 + timeline + actions + 倒计时   | 用户端   | /pages/food/order/detail           | food-order.detail      | ✓    |
| 用户取消订单(WAIT_PAY)                   | 用户端   | 详情页内嵌弹窗                     | food-order.cancel      | ✓    |
| 评价(rating/content/anonymous/images)    | 用户端   | /pages/food/review/submit          | food-order.review      | ✓    |
| 配送轨迹(简化骨架)                       | 用户端   | /pages/food/order/track            | track-query            | ✓    |
| 售后申请占位                             | 用户端   | /pages/me/aftersales-stub          | -(stage 7)             | ✓    |
| 商家 APP 推送(getui mock)                | 后端     | FoodOrderPaidSubscriber            | events.subscribers     | ✓    |
| 骑手 APP 任务大厅(只读 READY_FOR_PICKUP) | 骑手端   | /api/v1/r/tasks/available 改造     | rider-task-pool        | ✓    |
| 平台 Web 监控页(列表/筛选/统计/抽屉)     | 平台 Web | /admin/food-orders                 | admin-food-order       | ✓    |
| 15 min 未支付自动关单 + 释放库存         | 后端     | wait-pay-timeout-close.job(每 30s) | scheduler              | ✓    |
| 商家 10 min 未接自动取消 + 退款 mock     | 后端     | merchant-accept-timeout-cancel.job | scheduler              | ✓    |
| 支付回调补偿(retry + expired)            | 后端     | payment-callback-retry.job         | scheduler              | ✓    |
| 预约订单提醒                             | 后端     | reserved-order-dispatch.job        | scheduler              | ✓    |

## 3. 关键决策

### 用户拍板(对齐文档 § 5)

- **A1 订单列表/取消/评价 → 甲方案**:本阶段新增 3 个 c 端接口 → 已实现
- **A6 coupon / points → 甲方案**:仅建 coupon_lock 表 + service 锁释放;preview 收到 couponId/pointsUsed 直接返 INVALID_PARAM → 已实现

### 自动决策(7 项)

- **A2 callback 接口必须新增**(支付链路否则不闭环)→ /callback/{wxpay,alipay} 已实现
- **A3 商家端推送占位**:仅 getui mock,不新增 m 端接口 → FoodOrderPaidSubscriber.pushOne(`merchant:<storeId>`)
- **A4 骑手端复用 stage 3 task-pool**:扫 READY_FOR_PICKUP 食单返简化卡 → rider-task-pool.service 已扩展
- **A5 平台 Web 新增 3 admin 接口 + 1 页**:/admin/food-orders 监控
- **A7 reservedTime 走 snapshot**:不在 orders 提交接口入参,从 snapshot.payload 透传
- **A8 评价限制**:status=COMPLETED + 30 天内 + 1 单 1 主评 + UNIQUE order_id
- **A9 stock_lock 与 stock_record 并存**:lock 用于预占;record 用于流水

## 4. 自动决策(已落地)

| ID   | 决策                                                    | 落地位置                    |
| ---- | ------------------------------------------------------- | --------------------------- |
| 5.1  | BIGINT 时间戳                                           | 9 表 entity 全部            |
| 5.2  | 主键 `<table>_id`                                       | 全 entity                   |
| 5.3  | 事件命名 `domain.<biz>.<verb>`                          | events.ts +6 stage 5        |
| 5.4  | 跨店购物车 UNIQUE (customer_id, store_id, sku_id)       | cart_item entity            |
| 5.5  | preview 5 min Redis SETEX + DB 双写                     | food-order.preview          |
| 5.6  | orderNo = yyyyMMdd + redis incr daily 6 位              | food-order.submit           |
| 5.7  | payOrderNo = P + yyyyMMddHHmmss + 6 位 rand             | payment.prepay              |
| 5.8  | nonce 防重放 60s(`pay:cb:nonce:<channel>:<no>:<trade>`) | payment.handleCallback      |
| 5.9  | stock_lock 三态生命周期(active→consumed/released)       | submit/callback/cancel/jobs |
| 5.10 | jobs 每 30s/1min 扫描 + DistributedLock                 | scheduler stage 5 4 jobs    |
| 5.11 | 装饰器约定 @Idempotent + @Audit                         | 全 c 端写接口               |
| 5.12 | 状态文案前端字典化(STATUS_LABEL)                        | customer-app pages          |

## 5. 提交记录

```
f34c4db  docs(stage-5): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)
c45e897  feat(stage-5): T01-T03 schema + 6 events + wxpay/alipay adapter 扩展
ec88595  feat(stage-5): T04-T06 食品首页/店铺列表/商品列表 c 端只读模块
c582ba0  feat(stage-5): T07-T11 cart + food-order preview/submit + payment prepay/callback 主流程
bb8f7e9  feat(stage-5): T12-T16 list/detail + cancel + review + coupon + track
8686f14  feat(stage-5): T17-T20 admin-food-order + rider-task-pool 扩展 + 6 subscribers + 4 jobs
fdaddba  feat(stage-5): T21-T27 customer-app 14 页 + 7 api + 3 stores + format-price util
cf30186  feat(stage-5): T28 admin-web food-orders 监控页 + 详情抽屉
本次     feat(stage-5): T29-T32 测试补漏 + 手动审查 + 阶段验收文档(完整交付 32/32)
```
