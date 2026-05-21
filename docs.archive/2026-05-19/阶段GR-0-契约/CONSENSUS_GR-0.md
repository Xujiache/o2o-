# 阶段 GR-0 · CONSENSUS（共识）

> 锁定 GR-1 ~ GR-7 全部交付项，严格对齐 `ALIGNMENT_GR-0.md`。任何越界 / 遗漏在阶段自审时必须暴露。

## 1. 后端模块清单

### 1.1 新增模块（共 5 个）

| 模块                   | 阶段        | 关键职责                                               |
| ---------------------- | ----------- | ------------------------------------------------------ |
| `pickup-point`         | GR-1        | 自提点 CRUD（admin 写 / customer 公开读 / 按距离排序） |
| `grocery-product`      | GR-2        | 按斤计价生鲜商品 CRUD + 公开查询（首页/详情/分类）     |
| `grocery-cart`         | GR-3        | 生鲜购物车（独立 cart_item 物理隔离）                  |
| `grocery-order`        | GR-3 / GR-4 | 下单/支付/拣货/称重/结算/自提码核销                    |
| `traceability-archive` | GR-5        | 一鸡一码档案 CRUD（运营员侧）+ 公开 GET                |
| `traceability-qrcode`  | GR-5        | 二维码批量生成/导出 ZIP/扫码枪录档案/公开扫码查档案    |

### 1.2 扩展模块（共 2 个，仅加 method）

| 模块           | 阶段        | 新增 method                               |
| -------------- | ----------- | ----------------------------------------- |
| `payment`      | GR-3 / GR-4 | 复用现有：发起估价支付 + 发起差额补付支付 |
| `admin-refund` | GR-4        | 复用现有：差额退款                        |

### 1.3 改造模块（共 1 个）

| 模块            | 阶段 | 改造内容                                                                                 |
| --------------- | ---- | ---------------------------------------------------------------------------------------- |
| `merchant-auth` | GR-1 | 登录改为 `admin_user.username + password`，签发 Merchant-Token，role=OPERATOR 才允许签发 |

### 1.4 软废弃模块（共 4 个，保留 source 不 import）

| 模块                   | 阶段 | 处理                                    |
| ---------------------- | ---- | --------------------------------------- |
| `merchant-onboarding`  | GR-1 | server module 不再注入 AppModule        |
| `merchant-application` | GR-1 | server module 不再注入                  |
| `merchant-license`     | GR-1 | server module 不再注入                  |
| `merchant-withdrawal`  | GR-6 | server module 不再注入；保留 entity DDL |

## 2. 数据表（共 8 张新表 + 1 张扩展 + N 张软废弃）

### 2.1 新增表（8 张）

| 表                     | 阶段 | PK                     | 关键字段                                                                                                                                                                                                                                      |
| ---------------------- | ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pickup_point`         | GR-1 | pickup_point_id BIGINT | name / address / lng / lat / business_hour_start / business_hour_end / contact_phone / status                                                                                                                                                 |
| `grocery_category`     | GR-2 | category_id BIGINT     | name / icon_file_id / display_order / status                                                                                                                                                                                                  |
| `grocery_product`      | GR-2 | product_id BIGINT      | category_id / name / cover_image_file_id / description / is_weighted / unit_price_cents_per_jin / estimated_weight_grams / stock_jin / sale_status / has_traceability                                                                         |
| `grocery_cart_item`    | GR-3 | cart_item_id BIGINT    | customer_id / product_id / portions / estimated_weight_grams / created_at / updated_at                                                                                                                                                        |
| `grocery_order`        | GR-3 | order_id BIGINT        | customer_id / pickup_point_id / status / estimated_amount_cents / final_amount_cents / weight_delta_cents / estimate_payment_order_id / delta_payment_order_id / delta_refund_order_id / pickup_code / picked_up_at / created_at / updated_at |
| `grocery_order_item`   | GR-3 | item_id BIGINT         | order_id / product_id / unit_price_cents_per_jin / estimated_weight_grams / final_weight_grams / estimated_line_cents / final_line_cents / bound_qrcode_ids JSON                                                                              |
| `traceability_archive` | GR-5 | archive_id BIGINT      | product_id / batch_no / farm_name / farm_address / breed_date / slaughter_date / weight_grams / quarantine_cert_no / veterinarian / feed_type / vaccine_records JSON / status                                                                 |
| `traceability_qrcode`  | GR-5 | qrcode_id BIGINT       | code UK / archive_id / status / generated_batch_id / generated_at / bound_at / sold_at / sold_order_id                                                                                                                                        |
| `qrcode_batch`         | GR-5 | batch_id BIGINT        | name / total_count / generated_by / export_zip_file_id / created_at                                                                                                                                                                           |

### 2.2 扩展表（仅加字段，不改既有字段）

| 表              | 加字段                                                                                        | 阶段                 |
| --------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `payment_order` | `purpose VARCHAR(32)`（取值 grocery_estimate / grocery_delta / food_order / errand_order 等） | GR-3（如已有则跳过） |

### 2.3 软废弃表（保留 DDL，代码不再 select/insert/update）

GR-7 收尾时：`food_order` / `food_order_item` / `cart_item` / `store` / `store_business_hour` / `store_delivery_area` / `merchant_account` / `merchant_application` / `merchant_license` / `merchant_promotion` / `merchant_settlement` / `merchant_statistics_snapshot` / `merchant_withdrawal` / `merchant_order_action_log` / `coupon_rule` / `user_coupon` / `coupon_lock` / `order_review` / `review_reply` / `after_sale` / `after_sale_evidence` / `after_sale_arbitration` / `product` / `product_sku` / `product_category` / `stock_record` / `stock_lock`

跑腿表全保留：`errand_order` / `errand_order_detail` / `errand_task` / `errand_quote` / `errand_attachment` / `errand_timeline` / `errand_type` / `errand_pricing` / `errand_price_snapshot` / `prohibited_item`

通用表保留并继续使用：`customer_user` / `customer_profile` / `customer_address` / `message_setting` / `sms_code` / `login_device` / `account_disable_record` / `push_device` / `payment_order` / `refund_order` / `order_timeline`（仅用于生鲜订单变更事件） / `points_record` / `points_rule` / `admin_user` / `sys_role` / `sys_permission` / `sys_role_permission` / `sys_config` / `sys_dict` / `sys_error_code` / `third_party_config` / `city_site` / `platform_category` / `integration_request_log` / `rate_rule` / `risk_user_tag` / `risk_exception_log` / `export_task` / `dashboard_snapshot` / `manual_dispatch_log` / `dispatch_rule` / `dispatch_task` / `rider_*`

## 3. 接口契约（生鲜业务全部 P0 接口，共 38 个）

> 接口前缀严格按四端隔离，path 前缀 `/api/v1/` 在表格中省略。

### 3.1 customer 端（生鲜公开 + 鉴权混合，14 个）

| #   | METHOD | PATH                               | Token    | 阶段 | 用途                                     |
| --- | ------ | ---------------------------------- | -------- | ---- | ---------------------------------------- |
| 1   | GET    | `pub/grocery/categories`           | 无       | GR-2 | 分类列表                                 |
| 2   | GET    | `pub/grocery/products`             | 无       | GR-2 | 商品列表（分页 + 分类筛选 + 关键词搜索） |
| 3   | GET    | `pub/grocery/products/:productId`  | 无       | GR-2 | 商品详情                                 |
| 4   | GET    | `pub/pickup-points`                | 无       | GR-1 | 自提点列表（按 lng/lat 距离排序）        |
| 5   | GET    | `pub/pickup-points/:id`            | 无       | GR-1 | 自提点详情                               |
| 6   | GET    | `pub/trace/:code`                  | 无       | GR-5 | 公开扫码查档案                           |
| 7   | GET    | `c/grocery/cart`                   | Customer | GR-3 | 购物车查询                               |
| 8   | POST   | `c/grocery/cart/items`             | Customer | GR-3 | 加入购物车（含份数 + 预估克数）          |
| 9   | PATCH  | `c/grocery/cart/items/:itemId`     | Customer | GR-3 | 修改购物车项                             |
| 10  | DELETE | `c/grocery/cart/items/:itemId`     | Customer | GR-3 | 删除购物车项                             |
| 11  | POST   | `c/grocery/orders`                 | Customer | GR-3 | 提交订单（→ wait_pay）                   |
| 12  | GET    | `c/grocery/orders`                 | Customer | GR-3 | 我的订单列表                             |
| 13  | GET    | `c/grocery/orders/:orderId`        | Customer | GR-3 | 订单详情                                 |
| 14  | POST   | `c/grocery/orders/:orderId/cancel` | Customer | GR-3 | 取消订单（仅 wait_pay/paid 前）          |

### 3.2 merchant 端（运营员操作，11 个）

| #   | METHOD | PATH                                            | Token          | 阶段 | 用途                                   |
| --- | ------ | ----------------------------------------------- | -------------- | ---- | -------------------------------------- |
| 15  | POST   | `m/auth/login`                                  | 无（出 Token） | GR-1 | 运营员登录（username + password）      |
| 16  | GET    | `m/grocery/products`                            | Merchant       | GR-2 | 商品管理列表                           |
| 17  | POST   | `m/grocery/products`                            | Merchant       | GR-2 | 新增商品                               |
| 18  | PATCH  | `m/grocery/products/:productId`                 | Merchant       | GR-2 | 修改商品                               |
| 19  | POST   | `m/grocery/products/:productId/shelf`           | Merchant       | GR-2 | 上下架                                 |
| 20  | PATCH  | `m/grocery/products/:productId/stock`           | Merchant       | GR-2 | 调整库存（按斤）                       |
| 21  | GET    | `m/grocery/orders`                              | Merchant       | GR-4 | 拣货池（按状态筛选）                   |
| 22  | POST   | `m/grocery/orders/:orderId/start-picking`       | Merchant       | GR-4 | 开始拣货（paid → picking）             |
| 23  | POST   | `m/grocery/orders/:orderId/items/:itemId/weigh` | Merchant       | GR-4 | 录入实际重量                           |
| 24  | POST   | `m/grocery/orders/:orderId/settle`              | Merchant       | GR-4 | 结算差额（picking → weigh_settled）    |
| 25  | POST   | `m/grocery/orders/:orderId/verify-pickup`       | Merchant       | GR-4 | 核销自提码（pickup_ready → picked_up） |

### 3.3 admin 端（管理后台，10 个）

| #   | METHOD | PATH                                               | Token | 阶段 | 用途                                  |
| --- | ------ | -------------------------------------------------- | ----- | ---- | ------------------------------------- |
| 26  | GET    | `admin/pickup-points`                              | Admin | GR-1 | 自提点管理列表                        |
| 27  | POST   | `admin/pickup-points`                              | Admin | GR-1 | 新增自提点                            |
| 28  | PATCH  | `admin/pickup-points/:id`                          | Admin | GR-1 | 修改自提点                            |
| 29  | DELETE | `admin/pickup-points/:id`                          | Admin | GR-1 | 软删自提点（status=offline）          |
| 30  | GET    | `admin/grocery/orders`                             | Admin | GR-4 | 订单监控（含状态分布、金额统计）      |
| 31  | GET    | `admin/grocery/orders/:orderId`                    | Admin | GR-4 | 订单详情（含拣货明细 + 差额历史）     |
| 32  | GET    | `admin/traceability/archives`                      | Admin | GR-5 | 档案管理列表                          |
| 33  | POST   | `admin/traceability/qrcodes/batch`                 | Admin | GR-5 | 批量生成二维码（指定数量 + 批次名）   |
| 34  | GET    | `admin/traceability/qrcodes/batch/:batchId/export` | Admin | GR-5 | 下载 ZIP（PNG + CSV 索引）            |
| 35  | POST   | `admin/traceability/qrcodes/:code/bind`            | Admin | GR-5 | 扫码枪录入：绑定档案（blank → bound） |

### 3.4 operator 端（运营员，复用 merchant-app 的 Merchant-Token，3 个）

| #   | METHOD | PATH                                | Token    | 阶段 | 用途                              |
| --- | ------ | ----------------------------------- | -------- | ---- | --------------------------------- |
| 36  | GET    | `m/traceability/archives`           | Merchant | GR-5 | 运营员侧档案管理（与 admin 同源） |
| 37  | POST   | `m/traceability/archives`           | Merchant | GR-5 | 新增档案                          |
| 38  | POST   | `m/traceability/qrcodes/:code/bind` | Merchant | GR-5 | 运营员扫码绑档案                  |

## 4. 权限点新增（共 12 个）

| code                          | type   | 绑定角色                         | 阶段 |
| ----------------------------- | ------ | -------------------------------- | ---- |
| `admin:pickup-point:read`     | menu   | SUPER_ADMIN / OPERATOR           | GR-1 |
| `admin:pickup-point:write`    | button | SUPER_ADMIN                      | GR-1 |
| `admin:grocery:product:read`  | menu   | SUPER_ADMIN / OPERATOR           | GR-2 |
| `admin:grocery:product:write` | button | SUPER_ADMIN / OPERATOR           | GR-2 |
| `admin:grocery:order:read`    | menu   | SUPER_ADMIN / OPERATOR / FINANCE | GR-4 |
| `admin:grocery:order:settle`  | button | OPERATOR                         | GR-4 |
| `admin:trace:archive:read`    | menu   | SUPER_ADMIN / OPERATOR           | GR-5 |
| `admin:trace:archive:write`   | button | OPERATOR                         | GR-5 |
| `admin:trace:qrcode:generate` | button | SUPER_ADMIN / OPERATOR           | GR-5 |
| `admin:trace:qrcode:export`   | button | SUPER_ADMIN / OPERATOR           | GR-5 |
| `admin:trace:qrcode:bind`     | button | OPERATOR                         | GR-5 |
| `admin:operator:manage`       | menu   | SUPER_ADMIN                      | GR-1 |

新角色：`OPERATOR`（自营运营员）

## 5. 事件 / 订阅器 / 任务

### 5.1 事件（新增 7 个 EventName）

| EventName                       | 触发点                     | 阶段        |
| ------------------------------- | -------------------------- | ----------- |
| `grocery_order.submitted`       | 订单提交成功               | GR-3        |
| `grocery_order.paid`            | 估价支付完成               | GR-3        |
| `grocery_order.picking_started` | 开始拣货                   | GR-4        |
| `grocery_order.weigh_settled`   | 称重结算完成（含差额生成） | GR-4        |
| `grocery_order.delta_paid`      | 差额补付完成               | GR-4        |
| `grocery_order.pickup_ready`    | 装箱完成，自提码可用       | GR-4        |
| `grocery_order.picked_up`       | 核销自提完成               | GR-4        |
| `grocery_order.cancelled`       | 订单取消（任何原因）       | GR-3 / GR-4 |
| `trace.qrcode.bound`            | 二维码绑定档案             | GR-5        |
| `trace.qrcode.sold`             | 二维码标记售出             | GR-4 / GR-5 |

### 5.2 订阅器（新增 4 个）

| Subscriber                           | 监听                        | 行为                                                | 阶段        |
| ------------------------------------ | --------------------------- | --------------------------------------------------- | ----------- |
| `GroceryOrderTimelineSubscriber`     | grocery_order.\* 全部       | 写 order_timeline 表                                | GR-3 / GR-4 |
| `GroceryOrderStockSubscriber`        | grocery_order.submitted     | 锁定预估库存（stock_jin -= portions × estimatedKg） | GR-3        |
| `GroceryOrderStockReleaseSubscriber` | grocery_order.cancelled     | 释放预估库存                                        | GR-3        |
| `GroceryOrderStockSettleSubscriber`  | grocery_order.weigh_settled | 调整库存到实际重量（多退少补库存）                  | GR-4        |

### 5.3 任务（新增 2 个 Cron Job）

| Job                                    | 频率    | 行为                                               | 阶段 |
| -------------------------------------- | ------- | -------------------------------------------------- | ---- |
| `grocery-wait-pay-timeout-close.job`   | 每 1min | 关闭 wait_pay > 15min 的订单 + 释放库存            | GR-3 |
| `grocery-delta-pay-timeout-cancel.job` | 每 2min | 差额补付 > 15min 未完成的订单整单取消 + 退原估价款 | GR-4 |

## 6. 前端页面清单

### 6.1 customer-app 新增（共 11 页）

| 路径                                    | 阶段        |
| --------------------------------------- | ----------- |
| `pages/grocery/home/index.vue`          | GR-2        |
| `pages/grocery/category/index.vue`      | GR-2        |
| `pages/grocery/product/detail.vue`      | GR-2        |
| `pages/grocery/cart/index.vue`          | GR-3        |
| `pages/grocery/pickup-point/picker.vue` | GR-1        |
| `pages/grocery/order/confirm.vue`       | GR-3        |
| `pages/grocery/order/list.vue`          | GR-3        |
| `pages/grocery/order/detail.vue`        | GR-3 / GR-4 |
| `pages/grocery/order/delta-pay.vue`     | GR-4        |
| `pages/grocery/trace/scan.vue`          | GR-5        |
| `pages/grocery/trace/detail.vue`        | GR-5        |

### 6.2 merchant-app 重做（共 9 页 + 1 改造 me）

| 路径                                   | 阶段 | 说明                          |
| -------------------------------------- | ---- | ----------------------------- |
| `pages/login/index.vue`                | GR-1 | 改为 username + password 登录 |
| `pages/grocery/product/list.vue`       | GR-2 | 商品管理列表                  |
| `pages/grocery/product/edit.vue`       | GR-2 | 商品新增/编辑                 |
| `pages/grocery/order/list.vue`         | GR-4 | 拣货池                        |
| `pages/grocery/picking/weigh.vue`      | GR-4 | 拣货+称重逐项录入             |
| `pages/grocery/picking/settle.vue`     | GR-4 | 结算差额预览                  |
| `pages/grocery/picking/verify.vue`     | GR-4 | 核销自提码                    |
| `pages/grocery/trace/archive-list.vue` | GR-5 | 档案管理                      |
| `pages/grocery/trace/archive-edit.vue` | GR-5 | 新增/编辑档案                 |
| `pages/grocery/trace/scan-bind.vue`    | GR-5 | 扫码绑档案                    |
| `pages/me/index.vue`                   | GR-6 | 改为"运营员中心"              |

### 6.3 admin-web 新增（共 6 页）

| 路径                                  | 阶段 |
| ------------------------------------- | ---- |
| `views/pickup-point/list.vue`         | GR-1 |
| `views/pickup-point/edit.vue`         | GR-1 |
| `views/grocery-product/list.vue`      | GR-2 |
| `views/grocery-product/edit.vue`      | GR-2 |
| `views/grocery-order/monitor.vue`     | GR-4 |
| `views/grocery-order/detail.vue`      | GR-4 |
| `views/traceability/archive-list.vue` | GR-5 |
| `views/traceability/archive-edit.vue` | GR-5 |
| `views/traceability/qrcode-batch.vue` | GR-5 |
| `views/traceability/scan-bind.vue`    | GR-5 |
| `views/operator/list.vue`             | GR-1 |
| `views/operator/edit.vue`             | GR-1 |

## 7. 严格不做（防越界，每阶段自审）

- ❌ 不接真 wxpay / alipay / getui / minio / 高德地图 / 阿里云短信
- ❌ 不动 errand / rider 任何代码
- ❌ 不删 food*order / merchant*\* / store / coupon / after_sale / product 等表 DDL（只是不再使用）
- ❌ 不实现"按件混合 SKU"（is_weighted=0 留接口但 GR 阶段全 1）
- ❌ 不实现库存预警 / 自动补货 / 推荐算法
- ❌ 不实现优惠券（旧 coupon 链路与生鲜不兼容；如需要单独立项 GR-8）
- ❌ 不实现配送上门（生鲜全自提；如需要单独立项）

## 8. 验收锁定（每阶段必须满足）

- `pnpm -C $p typecheck` 全绿
- `pnpm -C $p --filter @o2o/server test` 全绿（含 errand spec 不能 fail）
- `pnpm -C $p --filter @o2o/admin-web test` 全绿
- 5 端 dev server 启动后 HTTP 200
- 该阶段 ACCEPTANCE_GR-N.md 全部 checkbox 勾选
