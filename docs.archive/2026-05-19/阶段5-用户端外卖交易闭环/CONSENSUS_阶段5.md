# 阶段 5 — 用户端外卖交易闭环 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 0. 用户拍板决策(2026-05-05)

| ID          | 决策               | 结论                                                                                                                               |
| ----------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| A1          | 订单列表/取消/评价 | **甲方案** — 新增 3 个 c 端接口(GET /c/food/orders + POST cancel + POST reviews)                                                   |
| A6          | coupon / points    | **甲方案** — 最小化:仅建 coupon_lock 表 + service 锁释放;preview 收到券/分返 INVALID_PARAM                                         |
| A2-A5/A7-A9 | 自动决策           | 全部接受(回调接口 / 商家推送 mock / 骑手 task-pool 扩展 / 平台监控页 / snapshot 模式 / 评价限制 / stock_lock 与 stock_record 并存) |

## 1. 明确需求与范围

### 1.1 用户端(P0,本阶段必须完成)

| 模块/页面    | 内容                                                                                                     | 接口                                                |
| ------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 外卖首页     | 城市切换 + banner + 类目入口 + 推荐店铺(distance 排序)                                                   | GET /c/food/home                                    |
| 搜索/列表    | 关键字 + 类目筛选 + 排序(distance/sales/rating)                                                          | GET /c/food/stores                                  |
| 店铺详情     | 商品分类树 + sku + 库存 + 售罄置灰 + 满减规则展示                                                        | GET /c/food/stores/{storeId}/products               |
| 购物车       | 单店一车;UNIQUE (customer_id, store_id, sku_id);本阶段每用户每店一车                                     | POST /c/food/cart/items                             |
| 确认订单     | 试算 + addressId + couponId(返 INVALID_PARAM)+ pointsUsed(返 INVALID_PARAM)+ deliveryType + reservedTime | POST /c/food/orders/preview                         |
| 提交订单     | 引用 previewId 保留 5min;锁库存 + (尝试)锁优惠券 + 写订单 + 时间线 + FoodOrderCreated                    | POST /c/food/orders                                 |
| 收银台       | 创建支付单 + 调 wxpay/alipay adapter mock 返 payParams                                                   | POST /c/payments/prepay                             |
| 支付结果     | 支付成功后 callback 触发 → 订单 WAIT_PAY → PAID_WAIT_MERCHANT + getui 推商家 + sms 推用户                | POST /callback/wxpay + POST /callback/alipay        |
| 订单列表     | status 筛选 + 分页 + 简化字段                                                                            | GET /c/food/orders **(新增 A1)**                    |
| 订单详情     | 完整状态机 + timeline + actions(可点击的下一步)                                                          | GET /c/food/orders/{orderId}                        |
| 取消订单     | 仅 WAIT_PAY 用户可主动取消;返 stock_lock 释放                                                            | POST /c/food/orders/{orderId}/cancel **(新增 A1)**  |
| 轨迹页       | 简化骨架(本阶段返起点 + 终点 + 估时;真实 amap 路径 stage 8)                                              | GET /c/food/orders/{orderId}/track                  |
| 评价         | 限 COMPLETED 后 30 天 + 1 单 1 主评 + rating 1-5 + content 0-500 + images 0-9                            | POST /c/food/orders/{orderId}/reviews **(新增 A1)** |
| 售后申请入口 | 仅按钮跳转 /me/aftersales-stub 占位页(stage 7 真实现)                                                    | (无接口)                                            |

### 1.2 商家端(本阶段仅推送占位,无新接口)

- `FoodOrderPaid` 事件订阅器调 `getui.adapter.pushNotification(targetType='merchant', targetId=storeId, payload=订单简要)`
- 商家 APP 现有"订单推送页"占位(stage 2 已有 me-tab,无新增页)
- m 端接订单/拒单接口 stage 7 实现

### 1.3 骑手端(扩展 stage 3 task-pool)

- `GET /api/v1/r/tasks/available` 修改返回:扫 `food_order WHERE status='READY_FOR_PICKUP' AND store.cityCode IN service_area`,返简化任务卡(taskId=food_order_id, bizType='FOOD', distance, reward, pickupAddress, deliveryAddress, deadline)
- 接单 / 取餐 / 送达动作 stage 8 实现

### 1.4 平台 Web(A5,新增监控页)

- `GET /api/v1/admin/food-orders` 列表 — 分页 + status / cityCode / payChannel 筛选
- `GET /api/v1/admin/food-orders/{orderId}` 详情 — 完整状态机 + timeline + 支付状态
- `GET /api/v1/admin/food-orders/timeline-statistics` — 超时仪表盘(15min 未支付数、10min 商家未接数)
- admin-web 路由 `/admin/food-orders`,1 页 + 详情抽屉
- 权限点:`admin:food-orders:view` + `admin:menu:food-orders`(SUPER_ADMIN 全 + AUDITOR 只读)

## 2. 接口契约总表(17 个)

### 2.1 c 端(12 个)— 9 规划 + 3 A1 新增

| #   | Method | 路径                              | 功能         | Token | Idempotent | Audit |
| --- | ------ | --------------------------------- | ------------ | ----- | ---------- | ----- |
| 1   | GET    | /c/food/home                      | 首页         | 可选  | -          | -     |
| 2   | GET    | /c/food/stores                    | 店铺列表     | 可选  | -          | -     |
| 3   | GET    | /c/food/stores/{storeId}/products | 商品列表     | 可选  | -          | -     |
| 4   | POST   | /c/food/cart/items                | 购物车变更   | 必须  | 60s        | ✓     |
| 5   | POST   | /c/food/orders/preview            | 订单试算     | 必须  | 60s        | -     |
| 6   | POST   | /c/food/orders                    | 提交订单     | 必须  | 60s        | ✓     |
| 7   | POST   | /c/payments/prepay                | 创建支付单   | 必须  | 60s        | ✓     |
| 8   | GET    | /c/food/orders/{orderId}          | 订单详情     | 必须  | -          | -     |
| 9   | GET    | /c/food/orders/{orderId}/track    | 轨迹         | 必须  | -          | -     |
| 10  | GET    | /c/food/orders                    | 订单列表(A1) | 必须  | -          | -     |
| 11  | POST   | /c/food/orders/{orderId}/cancel   | 取消订单(A1) | 必须  | 60s        | ✓     |
| 12  | POST   | /c/food/orders/{orderId}/reviews  | 提交评价(A1) | 必须  | 60s        | ✓     |

### 2.2 callback(2 个 A2)

| #   | Method | 路径             | 功能         | Token | 验签 | 防重放    |
| --- | ------ | ---------------- | ------------ | ----- | ---- | --------- |
| 13  | POST   | /callback/wxpay  | 微信支付通知 | -     | ✓    | nonce 60s |
| 14  | POST   | /callback/alipay | 支付宝通知   | -     | ✓    | nonce 60s |

### 2.3 admin 端(3 个 A5)

| #   | Method | 路径                                   | 功能     | Token       | 权限点                 |
| --- | ------ | -------------------------------------- | -------- | ----------- | ---------------------- |
| 15  | GET    | /admin/food-orders                     | 列表     | Admin-Token | admin:food-orders:view |
| 16  | GET    | /admin/food-orders/{orderId}           | 详情     | Admin-Token | admin:food-orders:view |
| 17  | GET    | /admin/food-orders/timeline-statistics | 超时统计 | Admin-Token | admin:food-orders:view |

合计 **17 接口**(12 c + 2 callback + 3 admin)。

## 3. 技术实现方案

### 3.1 数据库 schema(9 表新建)

| 表名                   | 主键                      | 关键字段                                                                                                                                                                                    | UNIQUE / 索引                                                          |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `food_order`           | food_order_id BIGINT      | order_no / customer_id / store_id / city_code / status / pay_status / delivery_type / reserved_time / payable_amount / address_snapshot JSON / created_at / paid_at / cancelled_at / reason | uk_order_no, idx_customer_status, idx_store_status, idx_status_created |
| `food_order_item`      | food_order_item_id BIGINT | food_order_id / sku_id / product_id / sku_snapshot JSON(name/price/spec)/ quantity / unit_price / sub_total                                                                                 | idx_food_order_id                                                      |
| `cart_item`            | cart_item_id BIGINT       | customer_id / store_id / sku_id / quantity / created_at / updated_at                                                                                                                        | uk(customer_id, store_id, sku_id), idx_customer_store                  |
| `order_price_snapshot` | order_price_snapshot_id   | preview_id(uuid)/ customer_id / store_id / payload JSON / created_at / expires_at(5min)                                                                                                     | uk_preview_id, idx_expires                                             |
| `payment_order`        | payment_order_id BIGINT   | pay_order_no / biz_type=FOOD / biz_id / pay_channel / payable_amount / status / paid_at / channel_trade_no / callback_raw JSON                                                              | uk_pay_order_no, idx_biz_id                                            |
| `coupon_lock`          | coupon_lock_id BIGINT     | order_id / coupon_id / customer_id / status:active                                                                                                                                          | released                                                               | consumed / created_at / released_at | idx_coupon_id, idx_customer_status |
| `stock_lock`           | stock_lock_id BIGINT      | order_id / sku_id / quantity / status:active                                                                                                                                                | released                                                               | consumed / created_at / released_at | idx_sku, idx_order_id              |
| `order_timeline`       | order_timeline_id BIGINT  | order_id / biz_type=FOOD / from_status / to_status / actor_type / actor_id / reason / created_at                                                                                            | idx_order_created                                                      |
| `order_review`         | order_review_id BIGINT    | order_id / customer_id / store_id / rating(1-5)/ content(<=500)/ image_file_ids JSON / anonymous / created_at                                                                               | uk_order_id_main(主评一对一), idx_store_rating, idx_customer           |

### 3.2 状态机实现

- 后端 `OrderStatus` enum + `nextStates` 静态映射 + `transition(from, to, actor)` 函数
- 非法流转直接抛 `STATUS_INVALID code='INVALID_TRANSITION' detail='WAIT_PAY → PREPARING not allowed'`
- 每次 transition 写一行 order_timeline
- stage 5 实现的转移路径:
  - WAIT_PAY → PAID_WAIT_MERCHANT (callback 触发)
  - WAIT_PAY → CANCELLED (用户主动 / 15min job)
  - PAID_WAIT_MERCHANT → CANCELLED (10min job 平台触发)
- stage 7+ 实现:MERCHANT_ACCEPTED 之后的全部转移(本阶段订单详情查询要能展示这些状态,但 stage 5 不写入)

### 3.3 价格快照机制

```
preview 接口
  ↓
计算 goodsAmount + deliveryFee + discountAmount + payableAmount
  ↓
生成 previewId = uuid v4
  ↓
写 order_price_snapshot { preview_id, customer_id, store_id, payload(全部字段 JSON), expires_at: now+5min }
  ↓
返回 { previewId, ...全部金额字段, ...unavailableReason 若校验失败 }

orders 提交接口
  ↓
SELECT * FROM order_price_snapshot WHERE preview_id=? AND customer_id=?
  ↓
若 expires_at < now → STATUS_INVALID 'PREVIEW_EXPIRED'
  ↓
事务:
  1. 锁 stock(SELECT FOR UPDATE 各 sku → 校验 stock - stock_locked >= quantity → UPDATE stock_locked += quantity)
  2. 写 stock_lock active 行
  3. 优惠券 lock(本阶段先 INVALID_PARAM,接口预留)
  4. INSERT food_order(snapshot 拷贝)
  5. INSERT food_order_item(每行)
  6. INSERT order_timeline (NULL → WAIT_PAY)
  7. publish FoodOrderCreated
```

### 3.4 支付链路

```
prepay 接口
  ↓
SELECT food_order WHERE order_id=? AND customer_id=? AND status='WAIT_PAY'
  ↓
写 payment_order(pay_channel + payable_amount + status=pending + biz_id=order_id)
  ↓
调 wxpay/alipay.adapter.prepay({pay_order_no, payable, notify_url}) → mock 返 payParams 字符串
  ↓
返 { payOrderId, payParams, expireAt }

callback 接口(/callback/wxpay 或 /alipay)
  ↓
adapter.verifyCallback(rawBody) → 验签 + 解析
  ↓
SELECT * FROM payment_order WHERE pay_order_no=? FOR UPDATE
  ↓
若 status='success' → 返 duplicate(幂等)
  ↓
事务:
  1. UPDATE payment_order SET status='success', paid_at, channel_trade_no, callback_raw
  2. UPDATE food_order SET status='PAID_WAIT_MERCHANT', pay_status='paid', paid_at
  3. UPDATE stock_lock.status='consumed' + product_sku.stock -= quantity + stock_locked -= quantity + INSERT stock_record
  4. INSERT order_timeline(WAIT_PAY → PAID_WAIT_MERCHANT)
  5. publish PaymentSucceeded + FoodOrderPaid 两个事件
  6. 订阅器:getui.push(merchant) + sms.send(customer) + 轨迹 mock 数据准备
```

### 3.5 6 领域事件 payload(类型严格)

```ts
[EventName.FoodOrderCreated]: { orderId, orderNo, customerId, storeId, payableAmount, expireAt, createdAt }
[EventName.PaymentSucceeded]: { payOrderId, payOrderNo, bizType, bizId, payChannel, paidAmount, paidAt }
[EventName.FoodOrderPaid]:    { orderId, customerId, storeId, paidAmount, paidAt }
[EventName.FoodOrderCancelled]:{ orderId, customerId, reason, cancelledBy:'customer'|'system'|'merchant', cancelledAt }
[EventName.StockReleased]:    { orderId, items:[{skuId, quantity}], reason, releasedAt }
[EventName.FoodReviewCreated]:{ reviewId, orderId, customerId, storeId, rating, createdAt }
```

### 3.6 4 定时任务

| Job                            | Cron                  | 锁 key                            | 逻辑                                                                                                                             |
| ------------------------------ | --------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| WaitPayTimeoutCloseJob         | `*/30 * * * * *`(30s) | scheduler:wait-pay-timeout        | 扫 food_order WHERE status='WAIT_PAY' AND created_at < now-15min,逐单事务取消                                                    |
| MerchantAcceptTimeoutCancelJob | `*/30 * * * * *`(30s) | scheduler:merchant-accept-timeout | 扫 food_order WHERE status='PAID_WAIT_MERCHANT' AND paid_at < now-10min,自动取消 + 退款 mock                                     |
| PaymentCallbackRetryJob        | `0 */1 * * * *`(1min) | scheduler:payment-callback-retry  | 扫 payment_order WHERE status='pending' AND created_at < now-2min AND retry_count < 3,主动 query 第三方                          |
| ReservedOrderDispatchJob       | `0 */1 * * * *`(1min) | scheduler:reserved-dispatch       | 扫 food_order WHERE delivery_type='reserved' AND reserved_time < now+30min AND status='PAID_WAIT_MERCHANT',触发 m 端再次推送提醒 |

### 3.7 事件订阅器(6 个,本阶段)

| Subscriber                   | 监听事件           | 动作                                                                 |
| ---------------------------- | ------------------ | -------------------------------------------------------------------- |
| FoodOrderCreatedSubscriber   | FoodOrderCreated   | log + audit_log                                                      |
| PaymentSucceededSubscriber   | PaymentSucceeded   | 业务逻辑已在 callback 事务内执行;此处只 log + audit_log              |
| FoodOrderPaidSubscriber      | FoodOrderPaid      | getui.push(merchant) + sms.send(customer) + audit_log                |
| FoodOrderCancelledSubscriber | FoodOrderCancelled | 若 reason 包含退款 → mock 退款流程 log;sms.send(customer)+ audit_log |
| StockReleasedSubscriber      | StockReleased      | log + 订阅给 stage 7 商家库存预警(本阶段不实现)                      |
| FoodReviewCreatedSubscriber  | FoodReviewCreated  | log + audit_log + 后续 stage 7 商家评价提醒                          |

### 3.8 第三方适配器扩展

| Adapter                 | 新增方法                                                                                          | mock 行为                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wxpay.adapter`         | `prepay(payOrderNo, payable, notifyUrl)`<br>`verifyCallback(rawBody, sign)`                       | mock prepay 返 `{prepayId:'wx_mock_'+rand, payParams:JSON.stringify({appId,timeStamp,nonceStr,package,signType,paySign})}`;mock 回调验签按 query.sign==='mock-sign' |
| `alipay.adapter`        | `prepay(payOrderNo, payable, notifyUrl)`<br>`verifyCallback(rawBody, sign)`                       | 类似                                                                                                                                                                |
| `getui.adapter`         | `pushNotification(targetType, targetId, payload)` 已有 stage 3,扩展 payload schema 接外卖订单字段 | 写 integration_request_log,success                                                                                                                                  |
| `sms.adapter`           | 沿用 stage 1 send,新增 template `ORDER_PAID` / `ORDER_CANCELLED`                                  | 写 integration_request_log                                                                                                                                          |
| `amap-distance.adapter` | 沿用 stage 0 calculateDistance                                                                    | mock 按 cityCode + 经纬度 mock 距离                                                                                                                                 |

### 3.9 路由前缀

- c 端模块全部挂 `@Controller('c/food')` / `@Controller('c/payments')`(12 接口)
- callback 模块 `@Controller('callback')`(2 接口)
- admin food-order 模块 `@Controller('admin/food-orders')`(3 接口)

## 4. 验收标准(stage 5 完成定义)

### 4.1 业务 AC(20 条)

- AC-01 9 张表 entity + migration `1714867700000-Stage5Init.ts` 通过
- AC-02 10 后端模块全部 NestJS module + service + controller + dto + spec
- AC-03 17 HTTP 接口路径与 CONSENSUS § 2 完全一致
- AC-04 外卖状态机转移 spec 覆盖 stage 5 主路径(WAIT_PAY → PAID_WAIT_MERCHANT / CANCELLED)+ 非法流转抛 STATUS_INVALID
- AC-05 跨店购物车隔离:UNIQUE (customer_id, store_id, sku_id)+ 提交订单时按 storeId 分组
- AC-06 preview 短缓存 5min + orders 引用 previewId 过期返 PREVIEW_EXPIRED
- AC-07 stock_lock 三态(active/released/consumed)+ stage 2 stock_record 流水联动 + product_sku.stock_locked 联动
- AC-08 wxpay / alipay callback 验签 + nonce 防重放 + 幂等(重复回调返 duplicate=true)
- AC-09 6 领域事件 + 6 订阅器全部就位 + payload 类型严格
- AC-10 4 jobs 注册 + spec 覆盖锁/幂等/补偿
- AC-11 EventName 累计 27 → 33;scheduler.module 累计 19 → 23
- AC-12 关键写接口全部 @Idempotent(60s)+ @Audit
- AC-13 admin-food-orders 3 接口 + 1 admin-web 页 + 2 权限点 seed
- AC-14 customer-app 14 页 + 路由 + dictStore + 14 spec
- AC-15 评价限制:COMPLETED 后 30 天 + 1 单 1 主评 + rating 1-5 + content<=500
- AC-16 coupon 收到 couponId 返 INVALID_PARAM 'COUPON_NOT_AVAILABLE';points 同
- AC-17 跨端 Token:c 端接口 CustomerJwtGuard、callback 接口 @Public、admin 接口 AdminJwtGuard,任何跨端 token → FORBIDDEN
- AC-18 售后申请按钮跳转 /me/aftersales-stub 占位页(无后端接口)
- AC-19 骑手 task-pool 改造:扫 READY_FOR_PICKUP food_order 返简化任务卡(只读)
- AC-20 商家 APP 不新增接口/页面;仅推送占位

### 4.2 测试 AC(4 条)

- AC-21 后端 jest 累计 ≥ 460(stage 4 base 371 净增 ≥90)
- AC-22 前端 vitest 累计 ≥ 110(customer-app 25 → 65 + admin-web 57 → 67;净增 ≥40)
- AC-23 全 monorepo `pnpm -r build / -r test / lint / format:check` 四绿 + 工作树干净
- AC-24 端隔离回归:c 端 token 调 admin/m/r → FORBIDDEN(已有 cross-scope.spec 自然覆盖,新接口跑过)

### 4.3 文档 AC(3 条)

- AC-25 ALIGNMENT / CONSENSUS / DESIGN / TASK / ACCEPTANCE / FINAL / TODO 7 件齐全
- AC-26 `项目阶段规划/05-阶段5-.../手动审查与测试.md` 8 节填证据
- AC-27 `问题与风险记录.md` P0/P1=0 + P2/P3 已登记延后

## 5. 任务边界限制

### 5.1 严格不做(违反后退回 ALIGNMENT)

- ❌ 跑腿订单(stage 6)
- ❌ 商家完整接单流程(stage 7,本阶段 m 端只做 getui 推送占位)
- ❌ 骑手抢单接单流程(stage 8,本阶段 r 端 task-pool 只读)
- ❌ 售后真表/接口(stage 7,本阶段只占位)
- ❌ 优惠券/积分发放与抵扣(stage 6/7,本阶段只建 coupon_lock 表)
- ❌ 真实 amap 路径规划(stage 8,轨迹返简化骨架)
- ❌ 退款流水真接(stage 7,10min job 自动取消时 mock 退款 log)
- ❌ 平台仲裁/财务(stage 9)

### 5.2 不确定时中断条件

- 任一原子任务卡住 > 30 min → 写入 `项目阶段规划/05-阶段5-.../问题与风险记录.md` 中断询问
- migration 失败 → typeorm:migration:revert 修 entity 重出
- 第三方 mock 行为遇规划文档未覆盖 → 追加 ALIGNMENT § 5 决策

## 6. 已确认的所有不确定性

| 决策点                        | 状态                                                  |
| ----------------------------- | ----------------------------------------------------- |
| A1 订单列表/取消/评价接口     | ✅ 用户拍板:做(新增 3 个 c 端接口)                    |
| A2 支付回调                   | ✅ 自动决策:必做                                      |
| A3 m 端推送占位               | ✅ 自动决策:仅 getui mock,不加 m 端接口               |
| A4 r 端 task-pool 扩展        | ✅ 自动决策:复用 stage 3,扩展返 READY_FOR_PICKUP 订单 |
| A5 admin 监控页               | ✅ 自动决策:做(3 admin 接口 + 1 页)                   |
| A6 coupon/points              | ✅ 用户拍板:最小化(仅建 coupon_lock 表)               |
| A7 reservedTime 字段          | ✅ 自动决策:走 snapshot 机制                          |
| A8 评价接口字段               | ✅ 自动决策:rating + content + 30 天 + 1 单 1 评      |
| A9 stock_lock vs stock_record | ✅ 自动决策:并存,角色不同                             |

---

**已与用户对齐共识。下一步:DESIGN\_阶段5.md(系统分层 + 接口契约 + 序列图 + 文件清单)**
