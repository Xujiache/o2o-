# 阶段 GR-0 · TASK（原子任务拆分）

> GR-0 阶段输出物全部为文档，不产生代码改动。本文档列出 GR-0 自身的原子任务（已全部完成）+ GR-1~7 阶段的任务概览（详细拆分在各阶段自己的 TASK 文档中）。

## 1. GR-0 自身任务（共 5 个，全部由本批 commit 完成）

| TaskID | 内容                                                | 产物                                                     | 状态 |
| ------ | --------------------------------------------------- | -------------------------------------------------------- | ---- |
| T01    | 写 README 总览（边界 / 6 决策 / 阶段路线图）        | `docs/阶段GR-0-契约/README.md`                           | DONE |
| T02    | 写 ALIGNMENT 对齐文档（10 个智能决策记录 + 错误码） | `docs/阶段GR-0-契约/ALIGNMENT_GR-0.md`                   | DONE |
| T03    | 写 CONSENSUS 共识文档（模块/表/接口/权限/事件）     | `docs/阶段GR-0-契约/CONSENSUS_GR-0.md`                   | DONE |
| T04    | 写 DESIGN 设计文档（整体架构 + 状态机 + 算法）      | `docs/阶段GR-0-契约/DESIGN_GR-0.md`                      | DONE |
| T05    | 写 TASK + ACCEPTANCE                                | `docs/阶段GR-0-契约/TASK_GR-0.md` + `ACCEPTANCE_GR-0.md` | DONE |

## 2. GR-1 任务概览（自提点 + 多商户软废弃）

| TaskID  | 内容                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| GR1-T01 | 新增 migration：建 `pickup_point` 表                                                                                        |
| GR1-T02 | 新增 entity：`pickup-point.entity.ts`                                                                                       |
| GR1-T03 | 新增 module：`pickup-point/`（service + dto + spec）                                                                        |
| GR1-T04 | 新增 controllers：`pub/pickup-points` + `admin/pickup-points`                                                               |
| GR1-T05 | 改造 `merchant-auth.service`：登录改为 admin_user + OPERATOR 角色 + 签 Merchant-Token                                       |
| GR1-T06 | 改造 merchant-app `pages/login/index.vue`：username + password 表单                                                         |
| GR1-T07 | merchant-app 路由删除：`pages/onboarding/*`                                                                                 |
| GR1-T08 | admin-web 新页：`views/pickup-point/list.vue` + `edit.vue`（地图选点用 Leaflet）                                            |
| GR1-T09 | admin-web 新页：`views/operator/list.vue` + `edit.vue`（admin_user CRUD 限 OPERATOR 角色）                                  |
| GR1-T10 | admin-web 隐藏菜单："商家入驻审核"（路由保留代码）                                                                          |
| GR1-T11 | server 软废弃：移除 `MerchantOnboardingModule` / `MerchantApplicationModule` / `MerchantLicenseModule` 从 AppModule imports |
| GR1-T12 | customer-app 新页：`pages/grocery/pickup-point/picker.vue`（按距离排序）                                                    |
| GR1-T13 | 新增权限点：`admin:pickup-point:read/write` + `admin:operator:manage` + 新角色 OPERATOR                                     |
| GR1-T14 | 单元测试：pickup-point.service.spec.ts（5 用例）                                                                            |
| GR1-T15 | 跑腿 spec 回归全绿 + 5 端 dev server 重启正常                                                                               |
| GR1-T16 | 产出 ACCEPTANCE_GR-1 + FINAL_GR-1                                                                                           |

## 3. GR-2 任务概览（按斤计价商品）

| TaskID  | 内容                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| GR2-T01 | migration：建 `grocery_category` + `grocery_product` 表                                  |
| GR2-T02 | entities：`grocery-category.entity.ts` + `grocery-product.entity.ts`                     |
| GR2-T03 | module + service + controller：`grocery-product/`（public + m + admin 三套 controller）  |
| GR2-T04 | DTO：CreateGroceryProductDto / UpdateGroceryProductDto / ListGroceryProductsQuery 等     |
| GR2-T05 | customer-app pages.json：tabBar 第一项 pagePath 改 `pages/grocery/home/index`            |
| GR2-T06 | customer-app 新页：`pages/grocery/home/index.vue`（商城首页：banner + 分类 + 热销）      |
| GR2-T07 | customer-app 新页：`pages/grocery/category/index.vue`（分类商品列表）                    |
| GR2-T08 | customer-app 新页：`pages/grocery/product/detail.vue`（显示 ¥/斤 + 输入预估份数 + 加购） |
| GR2-T09 | merchant-app 新页：`pages/grocery/product/list.vue` + `edit.vue`                         |
| GR2-T10 | admin-web 新页：`views/grocery-product/list.vue` + `edit.vue`                            |
| GR2-T11 | 权限点：admin:grocery:product:read/write                                                 |
| GR2-T12 | 单元测试：grocery-product.service.spec.ts（10 用例）                                     |
| GR2-T13 | seed：本阶段不动 demo.seed.ts（GR-7 统一替换）                                           |
| GR2-T14 | 跑腿 + GR-1 已建 spec 回归全绿                                                           |
| GR2-T15 | 产出 ACCEPTANCE_GR-2 + FINAL_GR-2                                                        |

## 4. GR-3 任务概览（下单 + 估价支付）

| TaskID  | 内容                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| GR3-T01 | migration：建 `grocery_cart_item` + `grocery_order` + `grocery_order_item` 表 + 扩 `payment_order.purpose`           |
| GR3-T02 | entities：3 个新 entity                                                                                              |
| GR3-T03 | module：`grocery-cart/` + `grocery-order/`（仅 submit/cancel/list/detail，不含 picking）                             |
| GR3-T04 | controllers：`c/grocery/cart/*` + `c/grocery/orders/*`                                                               |
| GR3-T05 | events：`grocery_order.submitted` / `.paid` / `.cancelled`                                                           |
| GR3-T06 | subscribers：`GroceryOrderTimelineSubscriber` + `GroceryOrderStockSubscriber` + `GroceryOrderStockReleaseSubscriber` |
| GR3-T07 | cron job：`grocery-wait-pay-timeout-close.job`（每 1min）                                                            |
| GR3-T08 | customer-app 新页：`pages/grocery/cart/index.vue`                                                                    |
| GR3-T09 | customer-app 新页：`pages/grocery/order/confirm.vue`（选自提点 + 复显预估）                                          |
| GR3-T10 | customer-app 新页：`pages/grocery/order/list.vue`（含 [生鲜][跑腿] segmented tab）                                   |
| GR3-T11 | customer-app 新页：`pages/grocery/order/detail.vue`（含自提码 + 状态时间线）                                         |
| GR3-T12 | customer-app pages.json：tabBar 第二项 pagePath 改 `pages/grocery/order/list`                                        |
| GR3-T13 | 复用 `pages/payment/cashier.vue` 跑通估价支付（mock 自动成功）                                                       |
| GR3-T14 | 单元测试：grocery-cart.service.spec.ts（6 用例）+ grocery-order.service.spec.ts（15 用例）                           |
| GR3-T15 | 跑腿 + GR-1/2 spec 回归全绿 + 5 端联调跑通下单到 paid                                                                |
| GR3-T16 | 产出 ACCEPTANCE_GR-3 + FINAL_GR-3                                                                                    |

## 5. GR-4 任务概览（拣货 + 称重 + 多退少补）

| TaskID  | 内容                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| GR4-T01 | migration：扩 `grocery_order`（delta_payment_order_id / delta_refund_order_id / pickup_code 等如已有则跳）         |
| GR4-T02 | `picking.service.ts`：start_picking / weigh_item / settle / mark_ready / verify_pickup（核心算法 in DESIGN §4.2）  |
| GR4-T03 | controllers：`m/grocery/orders/:id/start-picking` + `.../items/:itemId/weigh` + `.../settle` + `.../verify-pickup` |
| GR4-T04 | events：`grocery_order.picking_started` / `.weigh_settled` / `.delta_paid` / `.pickup_ready` / `.picked_up`        |
| GR4-T05 | subscriber：`GroceryOrderStockSettleSubscriber`（library 调整）                                                    |
| GR4-T06 | cron job：`grocery-delta-pay-timeout-cancel.job`（每 2min）                                                        |
| GR4-T07 | merchant-app 新页：`pages/grocery/order/list.vue`（拣货池，按状态筛选）                                            |
| GR4-T08 | merchant-app 新页：`pages/grocery/picking/weigh.vue`（逐项称重，数字输入框 + 计算预览）                            |
| GR4-T09 | merchant-app 新页：`pages/grocery/picking/settle.vue`（差额预览 + 确认结算）                                       |
| GR4-T10 | merchant-app 新页：`pages/grocery/picking/verify.vue`（核销自提码）                                                |
| GR4-T11 | customer-app 新页：`pages/grocery/order/delta-pay.vue`（差额补付收银台跳转）                                       |
| GR4-T12 | customer-app order/detail.vue 增强：差额卡片 + 自动唤起补付                                                        |
| GR4-T13 | admin-web 新页：`views/grocery-order/monitor.vue` + `detail.vue`                                                   |
| GR4-T14 | 权限点：admin:grocery:order:read/settle                                                                            |
| GR4-T15 | 关键单元测试：picking.service.spec.ts（20 用例，覆盖 delta=0/+/-/超上限/超时）                                     |
| GR4-T16 | 跑腿 + GR-1/2/3 spec 回归全绿 + 5 端联调跑通拣货完整闭环                                                           |
| GR4-T17 | 产出 ACCEPTANCE_GR-4 + FINAL_GR-4                                                                                  |

## 6. GR-5 任务概览（一鸡一码溯源）

| TaskID  | 内容                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| GR5-T01 | migration：建 `traceability_archive` + `traceability_qrcode` + `qrcode_batch` 表                                    |
| GR5-T02 | entities：3 个                                                                                                      |
| GR5-T03 | utils：`qrcode-encoder.util.ts`（编码 + checksum） + spec                                                           |
| GR5-T04 | utils：`qrcode-png.util.ts`（用 `qrcode` npm 包生成 PNG）                                                           |
| GR5-T05 | utils：`qrcode-zip.util.ts`（用 `archiver` npm 包打 ZIP，stream 模式）                                              |
| GR5-T06 | 安装新依赖：`pnpm -F @o2o/server add qrcode archiver`                                                               |
| GR5-T07 | service：traceability-archive.service.ts + traceability-qrcode.service.ts                                           |
| GR5-T08 | controllers：pub/trace/:code + admin/traceability/_ + m/traceability/_                                              |
| GR5-T09 | admin-web 新页：`views/traceability/archive-list.vue` + `archive-edit.vue`                                          |
| GR5-T10 | admin-web 新页：`views/traceability/qrcode-batch.vue`（批次列表 + 新建 + 下载 ZIP）                                 |
| GR5-T11 | admin-web 新页：`views/traceability/scan-bind.vue`（扫码枪：input focus + 自动捕获键盘）                            |
| GR5-T12 | merchant-app 新页：`pages/grocery/trace/archive-list.vue` + `archive-edit.vue` + `scan-bind.vue`                    |
| GR5-T13 | merchant-app `pages/grocery/picking/weigh.vue` 增强：称重时扫已绑二维码，落 `grocery_order_item.bound_qrcode_ids`   |
| GR5-T14 | customer-app 新页：`pages/grocery/trace/scan.vue`（uni.scanCode） + `trace/detail.vue`（档案展示）                  |
| GR5-T15 | 权限点：6 个（admin:trace:\*）                                                                                      |
| GR5-T16 | 单元测试：qrcode-encoder.spec.ts（5）+ traceability-qrcode.service.spec.ts（12）+ traceability-archive.spec.ts（6） |
| GR5-T17 | 跑腿 + GR-1~4 spec 回归全绿 + 5 端联调跑通生成→录档案→售出→扫码查档案                                               |
| GR5-T18 | 产出 ACCEPTANCE_GR-5 + FINAL_GR-5                                                                                   |

## 7. GR-6 任务概览（商家端收口）

| TaskID  | 内容                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------- |
| GR6-T01 | merchant-app 路由删除：`pages/account/withdrawal*` + `settlement*` + `statistics*`                       |
| GR6-T02 | merchant-app 路由删除：`pages/orders/*`（旧外卖订单页面）                                                |
| GR6-T03 | merchant-app `pages/me/index.vue` 改造：移除商家自营/分账/营收，保留个人资料 + 退出                      |
| GR6-T04 | merchant-app tabBar 重整：[商品][订单][拣货][我的]（订单 tab 直接进 grocery 拣货池）                     |
| GR6-T05 | merchant-app App.vue 启动检查：未登录强制跳 `pages/login/index`                                          |
| GR6-T06 | server 软废弃：移除 `MerchantWithdrawalModule` / `MerchantPromotionModule` 等从 AppModule（保留 source） |
| GR6-T07 | 全端 typecheck + 跑腿 + GR-1~5 spec 回归全绿                                                             |
| GR6-T08 | 产出 ACCEPTANCE_GR-6 + FINAL_GR-6                                                                        |

## 8. GR-7 任务概览（联调 + seed + 410 兜底 + FINAL）

| TaskID  | 内容                                                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GR7-T01 | `demo.seed.ts` 重写：删老王炸鸡/美味食堂；加 3 自提点（天安门/王府井/国贸） + 8 生鲜 SKU（土鸡 ¥35/斤等） + 1 customer（13900000001） + 1 OPERATOR 运营员（admin/o2o123） + 1 测试档案 + 2 blank 二维码 |
| GR7-T02 | 旧外卖路由全部加 `GoneInterceptor` 返回 HTTP 410 + `{ code: 'RESOURCE_DEPRECATED', message: '外卖业务已下线' }`                                                                                         |
| GR7-T03 | 旧 food-order / cart / coupon / merchant-\* / store / product 全 module 从 AppModule 移除（保留 source）                                                                                                |
| GR7-T04 | 全端 typecheck + 全部 spec 回归 + 5 端 dev 重启                                                                                                                                                         |
| GR7-T05 | 浏览器手工跑通完整闭环：customer 加购→选自提点→提交→支付→merchant 拣货→称重→结算→（差额补付）→标记 ready→customer 出示自提码→merchant 扫码核销→customer 扫一鸡一码→展示档案                             |
| GR7-T06 | 产出 FINAL_GR-7 + 阶段交付清单 + 三表勾选齐全                                                                                                                                                           |

## 9. 总计估算（按相对工作量）

- GR-0：5 文档（已完成）
- GR-1：16 任务，工作量 0.8
- GR-2：15 任务，工作量 1.2
- GR-3：16 任务，工作量 1.0
- GR-4：17 任务，工作量 2.0
- GR-5：18 任务，工作量 1.5
- GR-6：8 任务，工作量 0.5
- GR-7：6 任务，工作量 0.8

合计 ≈ 8.3 GR-3 基准；约 96 个原子任务。
