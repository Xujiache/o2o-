# 阶段 5 — 用户端外卖交易闭环 · 对齐文档(ALIGNMENT)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目上下文

### 1.1 stage 0/1/2/3/4 已交付的可复用基建(stage 5 直接消费,不再重建)

| 类别              | 资产                                                                                                             | stage 5 复用方式                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 4 端守卫          | `ScopeJwtGuard` 抽象 + Customer/Merchant/Rider/Admin 4 子类 + Optional Redis jti 黑名单                          | 用户端接口挂 `CustomerJwtGuard`(已就位);商家/骑手推送占位接口同此模式        |
| Token 签发        | `auth.service.signAccessToken({ scope:'customer' })`                                                             | 沿用,本阶段不动                                                              |
| 装饰器            | `@Idempotent` / `@Audit` / `@Mask` / `@RequirePermission` / `@Public`                                            | 全模块沿用                                                                   |
| 响应封装          | `ResponseInterceptor` ApiResponse + `AllExceptionsFilter` 统一错误码                                             | controller 透明继承                                                          |
| 第三方网关        | `IntegrationGatewayService` + 8 adapter(getui / sms / realname / wxpay / alipay / amap / amap-distance...)       | 本阶段新增 wxpay.adapter / alipay.adapter / amap-distance.adapter 真行为方法 |
| 调度              | `BaseJob` + `DistributedLockService` + dev trigger                                                               | 本阶段 +4 jobs,scheduler 累计 19 → 23                                        |
| 事件总线          | `DomainEventBus.publish` + `domain_event` 表 + `DomainEventRetryJob`                                             | 本阶段 +6 EventName,累计 27 → 33                                             |
| audit-log         | `sys_audit_log` + `audit-log.service.append()` + `GET /admin/audit-logs`                                         | 全 c 端写操作走装饰器自动写入                                                |
| 商家店铺数据      | stage 2 `store` / `product` / `product_sku` / `product_category` / `store_business_hour` / `store_delivery_area` | stage 5 store-query / product-query 模块只读这些表                           |
| 商家促销          | stage 2 `merchant_promotion` 满减 / 折扣                                                                         | 订单试算时读取应用                                                           |
| 用户地址          | stage 1 `customer_address`                                                                                       | 订单试算 + 提交时引用 addressId                                              |
| 配送区域          | stage 2 `store_delivery_area` GeoJSON + stage 3 `rider_service_area`                                             | 试算时校验地址是否在店铺配送范围                                             |
| 城市站点          | stage 4 `city_site`                                                                                              | 首页 cityCode 校验                                                           |
| 平台类目          | stage 4 `platform_category bizType=takeaway`                                                                     | 首页 categories 字段渲染                                                     |
| stock_record 流水 | stage 2 商家变更库存的流水(operatorType=merchant/admin/system)                                                   | stage 5 stock_lock 释放时也写一条 operatorType=system 流水                   |
| Pinia store       | customer-app 已有 `stores/auth.ts` + 7 错误页 + login 流程                                                       | stage 5 新增 cart / order / payment / track / dict 等 store                  |

### 1.2 当前 monorepo 状态(2026-05-05,commit `58dc3f3` stage 4 final)

- `pnpm -r test` 全绿:server 53 suites / 371 tests + admin-web 20 suites / 57 tests + customer-app 25 + merchant-app 21 + rider-app 28
- `pnpm -r build` 全绿;`pnpm lint` / `pnpm format:check` 全绿
- MySQL 3307 / Redis 6379 / Mongo 27017
- entities 共 40 个;modules 共 36 个;EventName 27 个;scheduler.module 19 jobs;migrations 6 个,下一编号 `1714867700000`
- customer-app 现状:`pages/{launch,permission,login,me,address,profile,error}` — 仅账号/地址,无外卖相关页面

### 1.3 stage 5 要交付的范围(规划文档点名,不多做不少做)

| 维度       | 数量 / 内容                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 后端模块   | 9 新:`food-home` / `store-query` / `product-query` / `cart` / `food-order` / `payment` / `coupon` / `points` / `track-query`                                                |
| 数据表     | 9 新:`food_order` / `food_order_item` / `cart_item` / `order_price_snapshot` / `payment_order` / `coupon_lock` / `stock_lock` / `order_timeline` / `order_review`           |
| 定时任务   | 4 新:15 min 未支付自动关单 + 释放库存;支付回调补偿;订单状态推送重试;预约订单到点调度                                                                                        |
| 领域事件   | 6 新:`FoodOrderCreated` / `PaymentSucceeded` / `FoodOrderCancelled` / `StockReleased` / `FoodOrderPaid` / `FoodReviewCreated`                                               |
| 用户端页面 | 14:首页 / 城市切换 / 搜索 / 店铺详情 / 商品规格 / 购物车 / 确认订单 / 收银台 / 支付结果 / 订单列表 / 订单详情 / 轨迹 / 取消弹窗 / 评价(售后申请仅入口跳转,真售后在 stage 7) |
| HTTP 接口  | 接口契约清单写明 9 个(c 端);其它端联调接口由歧义点 A1-A5 澄清                                                                                                               |
| 第三方依赖 | 真接 wxpay / alipay 沙箱(prepay + callback)、amap 距离测算、smart 模板消息推送(订单状态);其它沿用 stage 1-4                                                                 |

## 2. 原始需求(来自 `项目阶段规划/05-阶段5-用户端-外卖交易闭环/`)

- **阶段规划.md**:用户端外卖首页 / 店铺商品 / 购物车 / 下单 / 支付 / 订单 / 轨迹 / 评价 / 售后入口;商家端接订单提醒占位;骑手端接配送任务占位;平台 Web 外卖订单查询。**本阶段不做跑腿、不做秒杀拼团、不做商家财务**。
- **按端实施范围.md**:用户端为主;商家 APP "至少需接口联调订单推送";骑手 APP "接收外卖配送任务基础数据";平台 Web "外卖订单查询、状态日志、支付状态、超时监控"。
- **前端页面与接口对接.md**:14 用户端页面 + 9 接口映射;状态枚举权威、金额分单位、防重复点击。
- **接口契约清单.md**:仅列 **9 个 c 端接口**(home / stores / products / cart / preview / orders / prepay / order-detail / track)。
- **后端数据任务事件.md**:9 模块 + 9 表 + 4 jobs + 6 events;关键约束:"外卖与跑腿独立表 / 状态机 / 日志";"领域事件必须记录 eventId/bizType/bizId/payload/status/retryCount/errorMessage"。
- **状态机与业务规则.md**:外卖订单状态 `WAIT_PAY → PAID_WAIT_MERCHANT → MERCHANT_ACCEPTED → PREPARING → READY_FOR_PICKUP → RIDER_ASSIGNED → PICKED_UP → DELIVERING → DELIVERED → COMPLETED` + 异常 `CANCELLED/REFUNDING/REFUNDED/AFTER_SALE`;时效:15 min 未支付关单、商家 5 min 提醒、商家 10 min 取消退款。
- **权限与安全.md**:用户端只能访 own 数据;支付/退款/回调验签 + 防重放;接口限流 + 防刷单 + 防恶意下单;敏感信息加密 + 脱敏。
- **阶段交付清单.md**:文档 9 + 开发 7 + 测试 7 + 阶段门禁 9。

## 3. 边界确认

### 3.1 范围内(严格按规划)

- 用户端外卖首页 + 城市切换 + 搜索 + 排序 + 推荐
- 店铺详情(商品 / 规格 / 库存 / 售罄置灰 / 满减展示)
- 跨店购物车隔离(单店一车、不能跨店合并下单)
- 订单试算(coupon / points / 配送费 / 满减 / 即时与预约)
- 订单提交(锁库存 / 锁优惠券 / 写订单 / 写时间线)
- 微信支付 + 支付宝(沙箱 prepay + 回调)
- 订单详情 + 状态机 + 时间线
- 轨迹查询(本阶段返简化骨架,真位置 stage 8 接 amap)
- 15 min 未支付自动关单 + 释放库存 + 释放优惠券
- 商家 5/10 min 未接单提醒 / 自动取消退款(本阶段实现 job 但 m 端真处理在 stage 7)
- 4 jobs + 6 events 全部就位

### 3.2 严格不做(违反规划)

- ❌ 跑腿订单(stage 6)
- ❌ 秒杀 / 拼团 / 限时折扣(全周期不做)
- ❌ 商家完整接单流程(stage 7,本阶段 m 端只做接口推送占位)
- ❌ 骑手完整配送流程(stage 8,本阶段 r 端只做配送任务接收占位)
- ❌ 售后真实工单(stage 7,本阶段只做"申请入口"跳转)
- ❌ 平台仲裁 / 退款财务(stage 9)
- ❌ 商家结算 / 提现(stage 7+)
- ❌ 真实 amap 路径规划(stage 8,本阶段轨迹返简化数据)

## 4. 需求理解

### 4.1 核心业务流(P0)

```
首页 → 店铺 → 加车 → 试算 → 提交订单 → 支付 → 等商家接单 → ...→ 订单详情/轨迹 → 完成 → 评价
                                            ↓ 15 min 未支付 → 自动关单 + 释放库存
                                            ↓ 商家 10 min 未接 → 自动取消 + 全额退款
```

### 4.2 状态机(后端权威)

| 状态                 | 含义             | nextStates                                                 | 触发动作                         |
| -------------------- | ---------------- | ---------------------------------------------------------- | -------------------------------- |
| `WAIT_PAY`           | 待支付           | `PAID_WAIT_MERCHANT` / `CANCELLED`(15 min 超时 / 用户取消) | 用户支付成功 / 超时 job          |
| `PAID_WAIT_MERCHANT` | 已支付等商家接单 | `MERCHANT_ACCEPTED` / `CANCELLED`(10 min 商家未接)         | 商家接单 / 商家拒单 / 10 min job |
| `MERCHANT_ACCEPTED`  | 商家已接单       | `PREPARING` / `CANCELLED`(用户已不可取消,平台介入)         | stage 7 商家流程触发             |
| `PREPARING`          | 备餐中           | `READY_FOR_PICKUP`                                         | stage 7 商家"出餐完成"           |
| `READY_FOR_PICKUP`   | 待骑手取货       | `RIDER_ASSIGNED`                                           | stage 8 调度系统派单             |
| `RIDER_ASSIGNED`     | 已派单           | `PICKED_UP`                                                | stage 8 骑手"已取餐"             |
| `PICKED_UP`          | 已取餐           | `DELIVERING`                                               | 自动流转                         |
| `DELIVERING`         | 配送中           | `DELIVERED`                                                | stage 8 骑手"已送达"             |
| `DELIVERED`          | 已送达待用户确认 | `COMPLETED`(7 天自动确认)                                  | 自动流转(stage 8 job)            |
| `COMPLETED`          | 已完成           | (终态)                                                     | 用户可评价                       |
| `CANCELLED`          | 已取消           | (终态)                                                     | 退款补偿(stage 7)                |

stage 5 主要负责实现 `WAIT_PAY` → `PAID_WAIT_MERCHANT`、`CANCELLED` 路径,以及 _接收_ 后续状态变更(MERCHANT_ACCEPTED 之后由 stage 7/8 写入,本阶段订单详情查询要能展示)。

### 4.3 关键策略

| 策略           | 决策                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 库存锁定       | 提交订单时按 sku × quantity 写 `stock_lock` 行(orderId / skuId / quantity);15 min 关单 / 取消时写 `stock_record` 流水回退 |
| 优惠券锁定     | 提交订单时写 `coupon_lock`(orderId / couponId / customerId);关单 / 取消时释放                                             |
| 订单价格快照   | preview 试算后写 `order_price_snapshot`(previewId 短期 5 min 缓存)→ 提交订单时引用 → 一份不可变副本                       |
| 跨店校验       | 提交订单时遍历 cart_items 按 storeId 分组;不同 storeId 必须分多次提交;前端隐藏"全选合并下单"                              |
| 即时 vs 预约   | `deliveryType: 'instant'                                                                                                  | 'reserved'`,reserved 必填 `reservedTime`(BIGINT 时间戳),试算/提交均带 |
| 状态变更日志   | 每次状态流转写一行 `order_timeline`(orderId / fromStatus / toStatus / actor / reason / createdAt)                         |
| 支付回调验签   | wxpay / alipay 适配器执行 SDK 验签;失败 → THIRD_PARTY_ERROR + 不更新订单                                                  |
| 支付幂等       | 同一 payOrderId 多次回调:第二次起返 `{code:'0', data:{ok:true,duplicate:true}}`,不重复发 PaymentSucceeded                 |
| 关键写接口幂等 | 全部 `@Idempotent`(POST cart 60s key=customerId:storeId:skuId;POST orders 60s key=previewId)                              |
| 评价           | 提交评价限 `COMPLETED` 后 30 天内 + 1 单只 1 评(主评)+ 追评 14 天内 1 次(stage 7+ 接,本阶段实现主评)                      |
| 售后申请       | 仅"按钮跳转 /me/aftersales-stub"占位页(stage 7 接真售后);**本阶段不写任何售后表 / 接口**                                  |

## 5. 9 处歧义与决策建议

> 标注 **【自动决策】** 的项,我已基于已有代码 / 行业惯例做了选择,直接落 CONSENSUS。
> 标注 **【待用户确认】** 的项,我的建议方案后请用户拍板,有不同选项一并列出。

---

### A1【待用户确认】订单列表 / 取消 / 评价 接口未列入接口契约清单

**冲突**:

- `按端实施范围.md` 列了页面"外卖订单列表 / 取消订单弹窗 / 评价页 / 售后申请入口"
- `接口契约清单.md` 只列 9 个 c 端接口,**未列订单列表 / 取消 / 评价**
- `领域事件`列了 `FoodOrderCancelled` / `FoodReviewCreated` 但没对应接口

**我的决策建议**:**新增 3 个 c 端接口**(规划文档隐含,明确写出避免页面跑不起来):

- `GET /api/v1/c/food/orders` 订单列表(分页 + status 筛选)
- `POST /api/v1/c/food/orders/{orderId}/cancel` 取消订单(仅 WAIT_PAY 用户主动 / PAID_WAIT_MERCHANT 平台 5/10 min job)
- `POST /api/v1/c/food/orders/{orderId}/reviews` 提交评价
- 售后申请保持"页面占位 + 跳 /me/aftersales-stub",**不加接口**

**为什么这么选**:页面在规划里出现就必须能跑,这 3 个接口是"按端实施范围 → 用户端"明确写的,不算超范围;售后真功能在 stage 7,只占位即可。

**需用户拍板**:同意新增这 3 个,还是订单列表 / 取消 / 评价**全部留到 stage 7**(则本阶段页面变成"列表只渲染当前未支付/已支付订单详情入口"且取消/评价按钮置灰)?

---

### A2【自动决策】支付回调接口未列但 job 依赖回调

**冲突**:

- `定时任务`列了"支付回调补偿"
- `接口契约清单.md` 未列 callback 接口

**自动决策**:**必须新增 2 个 callback 接口**(否则 wxpay / alipay 沙箱无法回调,job 无可补偿):

- `POST /api/v1/callback/wxpay` 微信支付异步通知
- `POST /api/v1/callback/alipay` 支付宝异步通知

**约束**:

- `@Public` 路由 + 域名白名单(stage 8 接 nginx)
- 适配器层验签 + nonce 防重放(60 s redis key)
- 写 `integration_request_log`(stage 0 表)
- 通知后端 `payment.service.handleCallback(payOrderId)` 走业务流程

**理由**:全局接口契约规范 § 1 明确 `/api/v1/callback/**` 命名空间存在;无回调则支付链路无法闭环,与"完成定义"中"完整闭环"冲突。

---

### A3【自动决策】商家端"接收订单推送"具体形态

**冲突**:`按端实施范围.md` 写"接收外卖订单提醒,配合后续阶段完整接单;本阶段至少需接口联调订单推送" — 模糊。

**自动决策**:**仅做 push 推送 mock,不新增 m 端 HTTP 接口**:

- `FoodOrderPaid` 事件订阅器内调 `getui.adapter.pushNotification(targetType='merchant', targetId=storeId, payload={...})`
- m 端真接订单接口在 stage 7
- 商家 APP 收到推送后跳现有"订单详情"占位页(stage 7 真实现)

**理由**:stage 3 已建 `getui.adapter` mock 推送基建;按规划"完整接单 stage 7 做",此处只需走通推送链路即可。

---

### A4【自动决策】骑手端"接收配送任务"具体形态

**冲突**:`按端实施范围.md` 写"接收外卖配送任务基础数据;完整配送在阶段 8 强化"。

**自动决策**:**复用 stage 3 `rider-task-pool`,补充返回字段;不新增 r 端接口**:

- 现有 `GET /api/v1/r/tasks/available` 返空骨架 → stage 5 改为返 `READY_FOR_PICKUP` 状态的外卖订单(只读,不允许接单)
- 骑手"已取餐 / 已送达"动作在 stage 8 实现

**理由**:接单调度 / 抢单算法在 stage 8;本阶段只让 r 端能"看到"已就绪订单即可。

---

### A5【自动决策】平台 Web "外卖订单查询/详情/日志"

**冲突**:`按端实施范围.md` 写"外卖订单查询、状态日志、支付状态、超时监控" — 但 `接口契约清单.md` 未列 admin 接口。

**自动决策**:**新增 3 个 admin 接口 + 1 个 admin-web 页面**:

- `GET /api/v1/admin/food-orders` 列表(分页 + status / cityCode / payChannel 筛选)
- `GET /api/v1/admin/food-orders/{orderId}` 详情(完整状态机 + 时间线 + 支付状态)
- `GET /api/v1/admin/food-orders/timeline-statistics` 超时监控仪表盘统计(15 min 未支付数 / 10 min 商家未接数,本阶段返简单 count)
- admin-web 路由 `/admin/food-orders`,1 页 + 2 子组件(列表 + 详情抽屉)
- 权限点新增 `admin:food-orders:view` + `admin:menu:food-orders`

**理由**:平台 Web 监控订单是规划明确范围;不做就违反"按端实施范围"。新增权限点放 SUPER_ADMIN + AUDITOR(只读)。

---

### A6【待用户确认】coupon / points 模块本阶段做到什么程度

**冲突**:

- `后端模块`列了 `coupon` / `points`
- 接口契约清单仅 preview 接口入参带 `couponId` / `pointsUsed`,无 GET 优惠券列表 / 积分余额接口

**两套方案**:

**方案 A(最小化)**:仅建 `coupon_lock` 表 + service 锁 / 释放方法,**不实现真实发券 / 抵扣 / 积分获得逻辑**;preview 入参 couponId / pointsUsed 收到后**直接返 INVALID_PARAM 'COUPON_NOT_AVAILABLE'**(本阶段没真发券)。

- 优点:严格按"接口契约清单未列"原则
- 缺点:前端确认订单页 coupon / points 区域无数据可选

**方案 B(完整最小闭环)**:建表 + 适配 stage 1 customer_account 加积分余额列(本来没有)+ seed 给每个用户发 1 张 ¥5 满 ¥30 优惠券 + 100 积分作为联调数据 + 新增 2 个 c 端接口:

- `GET /api/v1/c/food/coupons/available?storeId&payable` 试算页可用券
- `GET /api/v1/c/customer/points` 用户积分余额

**我的建议**:**方案 A**(严格遵守"不多做"原则,接口契约清单是权威)。Stage 6/7 真发券。

**需用户拍板**。

---

### A7【自动决策】预约订单 reservedTime 字段

**冲突**:

- preview 接口列了 `reservedTime`(订单试算)
- orders 提交接口字段列表只写 `previewId, addressId, payChannel, remark, idempotencyKey`,未列 reservedTime

**自动决策**:**preview 时已写入 `order_price_snapshot.reservedTime`;orders 提交时直接读 snapshot 不重复传**。

- DB:`food_order` 表加 `delivery_type ENUM('instant','reserved')` + `reserved_time BIGINT NULL`
- 提交订单写 food_order 时从 snapshot 拷贝,不允许在 orders 接口篡改 reservedTime

**理由**:snapshot 模式天然解决,前端简化提交参数。

---

### A8【自动决策】评价接口字段与限制

**自动决策**:接口设计如下(已包含在 A1 决策范围):

- `POST /api/v1/c/food/orders/{orderId}/reviews`
- 请求:`{ rating: 1-5, content?: string<=500, anonymous?: boolean, images?: fileId[] }`
- 响应:`{ reviewId, createdAt }`
- 校验:订单 status='COMPLETED' + 评价时间 ≤ 完成后 30 天 + 1 单 1 主评
- 写 `order_review` 表 + 发 `FoodReviewCreated` 事件
- 追评 stage 7+(本阶段不实现 PATCH)

---

### A9【自动决策】stock_lock 与 stock_record 关系

**冲突**:stage 2 已有 `stock_record` 流水;stage 5 列了 `stock_lock` 新表。

**自动决策**:**两表并存,角色不同**:

- `stock_lock`:**预占**(orders 提交后,15 min 内的预占记录;字段 lock_id / order_id / sku_id / quantity / status:active|released|consumed / created_at / released_at)
- `stock_record`:**流水**(stage 2 已有,sku_id / quantity_change / reason / operator_type)

**生命周期**:

1. orders 提交 → `stock_lock` 写 active 一行 + `product_sku.stock_locked += quantity`(stage 2 已有 stock_locked 列)
2. 支付成功 → `stock_lock.status=consumed` + `stock_record` 写 quantityChange=-q reason='ORDER_PAID' operator='system' + `product_sku.stock -= quantity` + `product_sku.stock_locked -= quantity`
3. 关单/取消 → `stock_lock.status=released` + `stock_record` 写 quantityChange=0(信息流水) + `product_sku.stock_locked -= quantity`(stock 不动)

**理由**:符合电商行业惯例;stock_locked 字段 stage 2 已就位。

---

## 6. 范围内技术约束(已锁定)

### 6.1 数据完整性

- 全 BIGINT 时间戳;主键 `<table>_id`(food_order_id / cart_item_id / payment_order_id / coupon_lock_id / stock_lock_id 等)
- 金额单位**分**(BIGINT);距离米;时间毫秒
- 外卖订单与跑腿订单**严格独立表**(stage 6 跑腿用 `errand_order` / `errand_order_item` 等)

### 6.2 核心约束

- 跨店购物车隔离:`cart_item` UNIQUE (customer_id, store_id, sku_id);提交订单按 storeId 分组,前端不允许多店合并
- 订单号生成:`{yyyyMMdd}{seq6}`(雪花式或 redis incr daily reset)
- 支付单与业务订单 1 : 1 关系:`payment_order.biz_type='FOOD'` + `biz_id=food_order_id`
- preview 短缓存:Redis `food:preview:<previewId>` TTL=5 min;orders 提交超时返 `STATUS_INVALID 'PREVIEW_EXPIRED'`
- 关键写接口全部 `@Idempotent`(60 s)+ `@Audit`

### 6.3 第三方接入(stage 5 真接 mock 优先)

- **wxpay / alipay**:本阶段先实现 adapter mock(prepay 返 mock payParams 字符串,callback 端点接收 mock POST 返成功)。真接生产/沙箱由用户提供 appId/secret 后另设环境变量。
- **amap-distance**:测距已 stage 0 接,本阶段 store-query 排序按距离用 amap.calculateDistance() mock 返 stage 0 既有 mock 实现
- **getui 推送**:订单状态变更后给商家推送(mock,沿用 stage 3 行为)
- **sms**:订单支付成功 / 商家接单后给用户发短信(mock,sms.adapter 已就位)

### 6.4 装饰器约定

- `@Public` 仅 home / stores / products(Customer-Token 可选,登录态返收藏 / 推荐;游客返通用)
- `@Audit` 全部写接口 + cancel + review
- `@Idempotent` 全部 POST / PATCH(key 维度见 A 系列决策)
- `@Mask` 订单详情中 rider 字段(mobile_masked / realName_masked)

## 7. 待用户确认事项汇总

| ID  | 决策点                                  | 我的建议                                       | 备选方案                             |
| --- | --------------------------------------- | ---------------------------------------------- | ------------------------------------ |
| A1  | 订单列表 / 取消 / 评价 接口本阶段做不做 | **做**(新增 3 个 c 端接口)                     | 全推到 stage 7                       |
| A6  | coupon / points 模块到什么程度          | **方案 A 最小化**(只建表,接口先 INVALID_PARAM) | 方案 B 最小闭环(发券 + 积分查询接口) |

其它 7 项(A2/A3/A4/A5/A7/A8/A9)我已自动决策,如有反对请指出。

## 8. 范围数量预估(待 CONSENSUS / DESIGN 阶段精确)

| 维度             | 预估                                                            |
| ---------------- | --------------------------------------------------------------- |
| 后端模块         | 9 (规划) + 1 admin-food-order(A5) = **10**                      |
| 数据表           | 9 (规划) = **9**                                                |
| HTTP 接口        | 9 (c 规划) + 3 (A1 c) + 2 (A2 callback) + 3 (A5 admin) = **17** |
| 领域事件         | 6 (规划) = **6**                                                |
| 定时任务         | 4 (规划) = **4**                                                |
| 用户端页面       | 14 (规划)                                                       |
| 平台 Web 页面    | 1 (A5)                                                          |
| 后端测试净增     | 估 +90~110(订单状态机最大头)                                    |
| 前端测试净增     | 估 +40(customer-app +30 / admin-web +10)                        |
| 第三方 mock 真接 | wxpay / alipay 沙箱 + amap-distance + getui + sms               |

---

**等用户回答 A1 + A6 后,我开始写 CONSENSUS。**
