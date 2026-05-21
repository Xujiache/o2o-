# 阶段 5 — 用户端外卖交易闭环 · 验收文档(ACCEPTANCE)

## 1. AC 27 条逐条验证

### 后端

| AC    | 内容                                                                                                     | 状态 | 证据                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | 9 张表 entity + migration `1714867700000-Stage5Init.ts`(+ ALTER product_sku stock_locked)                | ✓    | 9 entity / migration up + down                                                                                                         |
| AC-02 | 10 后端模块全部 NestJS module + service + controller + dto + spec                                        | ✓    | food-home / store-query / product-query / cart / food-order / payment / coupon / track-query / admin-food-order / rider-task-pool 扩展 |
| AC-03 | 17 HTTP 接口路径与 CONSENSUS § 2 完全一致                                                                | ✓    | 12 c 端 + 2 callback + 3 admin                                                                                                         |
| AC-04 | 外卖状态机转移覆盖 stage 5 主路径(WAIT_PAY → PAID_WAIT_MERCHANT / CANCELLED)+ 非法流转 STATUS_INVALID    | ✓    | food-order.cancel / payment.callback 状态机 + spec 覆盖                                                                                |
| AC-05 | 跨店购物车隔离:UNIQUE (customer_id, store_id, sku_id)+ 提交订单按 storeId 分组                           | ✓    | cart_item entity UNIQUE + cart.service spec                                                                                            |
| AC-06 | preview 短缓存 5min + orders 引用 previewId 过期返 PREVIEW_EXPIRED                                       | ✓    | food-order.preview 双写 DB+Redis SETEX 300s + submit spec                                                                              |
| AC-07 | stock_lock 三态(active/released/consumed)+ stage 2 stock_record 流水联动 + product_sku.stock_locked 联动 | ✓    | submit/cancel/callback/jobs 全覆盖 spec                                                                                                |
| AC-08 | wxpay / alipay callback 验签 + nonce 防重放 + 幂等(重复回调返 duplicate=true)                            | ✓    | payment-callback.controller + payment.service.handleCallback spec 8 用例                                                               |
| AC-09 | 6 领域事件 + 6 订阅器全部就位 + payload 类型严格                                                         | ✓    | events.stage5.spec 33 总 + stage5-subscribers.spec 12 用例                                                                             |
| AC-10 | 4 jobs 注册 + spec 覆盖锁/幂等/补偿                                                                      | ✓    | scheduler.module 19→23 + stage5-jobs.spec 9 用例                                                                                       |
| AC-11 | EventName 累计 27 → 33;scheduler.module 累计 19 → 23                                                     | ✓    | events.ts + scheduler.module                                                                                                           |
| AC-12 | 关键写接口全部 @Idempotent(60s)+ @Audit                                                                  | ✓    | submit/cart/cancel/review/prepay 全装饰器                                                                                              |
| AC-13 | admin-food-orders 3 接口 + 1 admin-web 页 + 2 权限点 seed                                                | ✓    | admin-food-order + role-permission seed +admin:menu:food-orders / admin:food-orders:view                                               |
| AC-14 | customer-app 14 页 + 路由 + dictStore + 14 spec                                                          | ✓    | pages.json 21 路由(stage 1 7 + stage 5 14)+ 49 vitest                                                                                  |
| AC-15 | 评价限制:COMPLETED 后 30 天 + 1 单 1 主评 + rating 1-5 + content<=500                                    | ✓    | food-order.review + spec ALREADY_REVIEWED / NOT_COMPLETED / REVIEW_EXPIRED                                                             |
| AC-16 | coupon 收到 couponId 返 INVALID_PARAM 'COUPON_NOT_AVAILABLE';points 同                                   | ✓    | coupon.service + food-order.preview 防御层 spec                                                                                        |
| AC-17 | 跨端 Token:c 端接口 CustomerJwtGuard、callback 接口 @Public、admin 接口 AdminJwtGuard                    | ✓    | controller 装饰器 + 既有 cross-scope.spec 自然覆盖                                                                                     |
| AC-18 | 售后申请按钮跳转 /me/aftersales-stub 占位页(无后端接口)                                                  | ✓    | pages/me/aftersales-stub.vue 占位                                                                                                      |
| AC-19 | 骑手 task-pool 改造:扫 READY_FOR_PICKUP food_order 返简化任务卡(只读)                                    | ✓    | rider-task-pool.service 扩展 + spec 11 用例(原 9 + stage 5 加 2)                                                                       |
| AC-20 | 商家 APP 不新增接口/页面;仅推送占位                                                                      | ✓    | food-order-paid.subscriber 调 getui.pushOne;m 端代码未改                                                                               |

### 测试

| AC    | 内容                                                                          | 状态 | 证据                                                                                            |
| ----- | ----------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| AC-21 | 后端 jest 累计 ≥ 460                                                          | ✓    | 67 suites / 510 tests pass(stage 4 base 371 → +139)                                             |
| AC-22 | 前端 vitest 累计 ≥ 110                                                        | ✓    | customer-app 49 + admin-web 62 = **111**(目标 ≥ 110 实达,客户端组件 page 测 stage 7 补 H5/真机) |
| AC-23 | 全 monorepo `pnpm -r build / -r test / lint / format:check` 四绿 + 工作树干净 | ✓    | 总闸命令全过 + 最终 commit                                                                      |
| AC-24 | 端隔离回归:c 端 token 调 admin/m/r → FORBIDDEN                                | ✓    | stage 1-3 cross-scope.spec 自然覆盖                                                             |

### 文档

| AC    | 内容                                                                   | 状态 | 证据                                    |
| ----- | ---------------------------------------------------------------------- | ---- | --------------------------------------- |
| AC-25 | ALIGNMENT / CONSENSUS / DESIGN / TASK / ACCEPTANCE / FINAL / TODO 7 件 | ✓    | docs/阶段5-用户端外卖交易闭环/          |
| AC-26 | 项目阶段规划 .../手动审查与测试.md 8 节填证据                          | ✓    | 17 接口审查 + 5 联动场景 + 6 第三方记录 |
| AC-27 | 问题与风险记录.md P0/P1=0 + P3 4 项延后                                | ✓    | P3-01~04 已登记                         |

## 2. 32 任务自审表

| Task   | 内容                                            | 状态 | commit  |
| ------ | ----------------------------------------------- | ---- | ------- |
| 文档 0 | ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档          | ✓    | f34c4db |
| T01    | 9 表 entity + migration                         | ✓    | c45e897 |
| T02    | 6 EventName + payload + spec                    | ✓    | c45e897 |
| T03    | wxpay/alipay adapter 扩展                       | ✓    | c45e897 |
| T04    | food-home 模块                                  | ✓    | ec88595 |
| T05    | store-query 模块                                | ✓    | ec88595 |
| T06    | product-query 模块                              | ✓    | ec88595 |
| T07    | cart 模块                                       | ✓    | c582ba0 |
| T08    | food-order preview                              | ✓    | c582ba0 |
| T09    | food-order submit                               | ✓    | c582ba0 |
| T10    | payment prepay                                  | ✓    | c582ba0 |
| T11    | payment callback                                | ✓    | c582ba0 |
| T12    | food-order list/detail                          | ✓    | bb8f7e9 |
| T13    | food-order cancel                               | ✓    | bb8f7e9 |
| T14    | food-order review                               | ✓    | bb8f7e9 |
| T15    | coupon.service                                  | ✓    | bb8f7e9 |
| T16    | track-query 模块                                | ✓    | bb8f7e9 |
| T17    | admin-food-order 3 接口                         | ✓    | 8686f14 |
| T18    | rider-task-pool 扩展 + role-permission seed     | ✓    | 8686f14 |
| T19    | 6 事件订阅器                                    | ✓    | 8686f14 |
| T20    | 4 jobs + scheduler.module                       | ✓    | 8686f14 |
| T21    | customer-app stores + api 基建                  | ✓    | fdaddba |
| T22    | customer-app 首页+城市+搜索 3 页                | ✓    | fdaddba |
| T23    | customer-app 店铺详情 + sku-picker              | ✓    | fdaddba |
| T24    | customer-app 购物车页                           | ✓    | fdaddba |
| T25    | customer-app 确认订单+收银台+支付结果           | ✓    | fdaddba |
| T26    | customer-app 订单列表+详情+轨迹+取消            | ✓    | fdaddba |
| T27    | customer-app 评价+售后占位                      | ✓    | fdaddba |
| T28    | admin-web food-orders 页 + 抽屉                 | ✓    | cf30186 |
| T29    | 后端 jest ≥460(实达 510)                        | ✓    | 8686f14 |
| T30    | 前端 vitest +41(customer-app 49 + admin-web 62) | ✓    | 本次    |
| T31    | 手动审查 + 风险记录                             | ✓    | 本次    |
| T32    | ACCEPTANCE/FINAL/TODO + 总闸                    | ✓    | 本次    |

## 3. 漏项审查表(对照 7 份规划文档)

- [x] **阶段规划.md** 9 模块 + 14 用户端页面 + 4 第三方依赖 + 完成定义 4 项,全部覆盖
- [x] **按端实施范围.md** 用户端必测 + 商家/骑手只消费 + 平台监控,边界审查 5 项
- [x] **前端页面与接口对接.md** 14 页 + 9 接口映射 + 接口对接总则(API 常量/loading/状态枚举权威/金额分),全部覆盖
- [x] **后端数据任务事件.md** 9 模块 + 9 表 + 4 task + 6 event + 后端约束,全部覆盖
- [x] **状态机与业务规则.md** 外卖状态机 stage 5 主路径(WAIT_PAY/PAID_WAIT_MERCHANT/CANCELLED)+ 全局规则(15 min 关单 / 商家 5/10 min 提醒/取消)
- [x] **权限与安全.md** Token 端隔离 + 数据归属 + 7 安全检查(脱敏 / 限频 / 防重放 / 关键写审计 / 第三方密钥不前端),全部覆盖
- [x] **阶段交付清单.md** 文档 9 / 开发 7 / 测试 7 / 阶段门禁 9,已映射并记录(三件套 + 总闸)

## 4. PowerShell replay 命令(curl 17 接口冒烟)

```pwsh
# 1. 数据库迁移 + seed(MySQL 3307)
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:9 张新表 + product_sku.stock_locked 列已就位 + role-permission +admin:menu:food-orders +admin:food-orders:view

# 2. 启动后端
pnpm --filter @o2o/server dev

# 3. 17 接口冒烟(部分,全集见 ACCEPTANCE)
$BASE = "http://127.0.0.1:3000"
$C_T = "<customer-token>"

# 3.1 GET food/home
curl.exe "$BASE/api/v1/c/food/home?cityCode=BJ" -H "Customer-Token: $C_T"

# 3.2 POST food/orders/preview
curl.exe -X POST "$BASE/api/v1/c/food/orders/preview" -H "Content-Type: application/json" -H "Customer-Token: $C_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d '{"storeId":"20001","items":[{"skuId":"9011","quantity":2}],"addressId":"60001","deliveryType":"instant"}'

# 3.3 POST food/orders(用 preview 返的 previewId)
curl.exe -X POST "$BASE/api/v1/c/food/orders" -H "Content-Type: application/json" -H "Customer-Token: $C_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d '{"previewId":"<from-preview>","payChannel":"wxpay"}'

# 3.4 POST payments/prepay
curl.exe -X POST "$BASE/api/v1/c/payments/prepay" -H "Content-Type: application/json" -H "Customer-Token: $C_T" -d '{"bizType":"FOOD","orderId":"<orderId>","payChannel":"wxpay"}'

# 3.5 POST callback/wxpay(模拟第三方回调,sign=mock-sign)
curl.exe -X POST "$BASE/api/v1/callback/wxpay?sign=mock-sign" -H "Content-Type: application/json" -d '{"outTradeNo":"<payOrderNo>","channelTradeNo":"wx_real","paidAmountCents":5900,"paidAt":1714867800000}'

# 3.6 GET food/orders/{id} 详情
curl.exe "$BASE/api/v1/c/food/orders/<orderId>" -H "Customer-Token: $C_T"

# 3.7 POST food/orders/{id}/cancel
curl.exe -X POST "$BASE/api/v1/c/food/orders/<orderId>/cancel" -H "Content-Type: application/json" -H "Customer-Token: $C_T" -d '{"reason":"don''t want"}'

# 3.8 admin 监控页(需 SUPER_ADMIN token)
$A_T = "<admin-token>"
curl.exe "$BASE/api/v1/admin/food-orders" -H "Admin-Token: $A_T"
curl.exe "$BASE/api/v1/admin/food-orders/timeline-statistics" -H "Admin-Token: $A_T"

# 4. customer-app 抽测(H5/真机)
pnpm --filter @o2o/customer-app dev:h5

# 5. admin-web 抽测
pnpm --filter @o2o/admin-web dev
```
