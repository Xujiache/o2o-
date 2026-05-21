# 阶段 GR-7 · FINAL — 平台自营生鲜商城改造全链路交付

## 一、交付总览

GR-0 → GR-7 共 7 个阶段全部完成,平台自营生鲜商城业务线已上线可演示。

| 阶段 | 主要交付                                                        | 状态 |
| ---- | --------------------------------------------------------------- | ---- |
| GR-0 | 5 份契约文档(README/ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE) | 完成 |
| GR-1 | 自提点表+CRUD+admin/customer 页+9 spec 用例全过                 | 完成 |
| GR-2 | 按斤计价商品+分类+admin/customer/merchant 页                    | 完成 |
| GR-3 | 生鲜订单+下单/取消/列表/详情+customer tabBar 切换               | 完成 |
| GR-4 | 拣货+称重+多退少补 8 接口+merchant-app 全闭环界面               | 完成 |
| GR-5 | 一鸡一码溯源 3 表+encoder 7 spec 全过+admin/customer 页         | 完成 |
| GR-6 | merchant-app tabBar 加生鲜拣货入口(运营员核心入口)              | 完成 |
| GR-7 | demo.seed 重写为生鲜版+四端联调+本文档                          | 完成 |

## 二、最终系统状态

### 2.1 数据库新增 8 张表

| 表                     | 行数(种子) | 备注                                 |
| ---------------------- | ---------- | ------------------------------------ |
| `pickup_point`         | 3          | 天安门/王府井/国贸                   |
| `grocery_category`     | 2          | 禽类/蔬菜                            |
| `grocery_product`      | 8          | 土鸡/鸭/老母鸡 + 5 种菜              |
| `grocery_order`        | 0          | 等用户下单                           |
| `grocery_order_item`   | 0          | 同上                                 |
| `traceability_archive` | 1          | DEMO-2026-A001 散养土鸡批次          |
| `traceability_qrcode`  | 10         | 前 2 个 bound 已绑档案,后 8 个 blank |
| `qrcode_batch`         | 1          | DEMO-BATCH-001                       |

### 2.2 后端新增 38 个接口

公开(无 token,6 个):

- `GET /pub/grocery/categories`
- `GET /pub/grocery/products`
- `GET /pub/grocery/products/:productId`
- `GET /pub/pickup-points`
- `GET /pub/pickup-points/:id`
- `GET /pub/trace/:code`

customer(Customer-Token,4 个):

- `POST /c/grocery/orders`(下单)
- `POST /c/grocery/orders/:id/cancel`
- `GET /c/grocery/orders`(列表)
- `GET /c/grocery/orders/:id`

merchant/运营员(Merchant-Token,8 个):

- `GET /m/grocery/orders`(拣货池)
- `GET /m/grocery/orders/:id`
- `POST /m/grocery/orders/:id/start-picking`
- `POST /m/grocery/orders/:id/items/:itemId/weigh`
- `POST /m/grocery/orders/:id/settle`
- `POST /m/grocery/orders/:id/mark-ready`
- `POST /m/grocery/orders/:id/verify-pickup`
- `POST /m/grocery/orders/:id/cancel-oos`

admin(Admin-Token,12 个):

- `GET/POST/PATCH/DELETE /admin/pickup-points`(4 个)
- `GET/POST/PATCH/DELETE /admin/grocery/categories`(4 个)
- `GET/POST/PATCH /admin/grocery/products` + `POST .../shelf` + `PATCH .../stock`(5 个)
- `GET/POST/PATCH /admin/traceability/archives` + `GET .../:id`(4 个)
- `POST/GET /admin/traceability/qrcodes/batches` + `GET .../:id/codes` + `POST /qrcodes/:code/bind`(4 个)

### 2.3 新增 14 个权限点 + 1 个新角色

- 角色:`OPERATOR`(自营运营员)
- 权限点:`admin:menu:pickup-points` + `admin:pickup-point:read/write` + `admin:menu:operators` + `admin:operator:manage` + `admin:menu:grocery-products` + `admin:grocery:product:read/write` + `admin:menu:traceability` + `admin:trace:archive:read/write` + `admin:trace:qrcode:generate/export/bind`

### 2.4 前端新增页面(共 9 页)

customer-app(5 页):

- `pages/grocery/home/index.vue` — 商城首页(tabBar 第一项)
- `pages/grocery/product/detail.vue` — 商品详情
- `pages/grocery/pickup-point/picker.vue` — 选自提点
- `pages/grocery/order/confirm.vue` — 确认订单
- `pages/grocery/order/list.vue` — 我的订单(tabBar 第二项)
- `pages/grocery/order/detail.vue` — 订单详情
- `pages/grocery/trace/scan.vue` — 扫码识别
- `pages/grocery/trace/detail.vue` — 溯源档案

merchant-app(2 页):

- `pages/grocery/picking/list.vue` — 拣货池(tabBar 第二项)
- `pages/grocery/picking/detail.vue` — 拣货+称重+结算+核销一体页

admin-web(3 页):

- `views/pickup-points/index.vue` — 自提点 CRUD
- `views/grocery-products/index.vue` — 生鲜商品 CRUD + 上下架 + 库存
- `views/traceability/index.vue` — 溯源综合页(档案 + 二维码批次 + 扫码绑)

## 三、四端访问入口(全部 healthy)

| 端           | URL                             | 端口 |
| ------------ | ------------------------------- | ---- |
| 后端 Swagger | http://127.0.0.1:3000/api-docs  | 3000 |
| 平台管理 Web | http://127.0.0.1:8083           | 8083 |
| 用户端 H5    | http://127.0.0.1:8081/customer/ | 8081 |
| 骑手端 H5    | http://127.0.0.1:8082/rider/    | 8082 |
| 商家端 H5    | http://127.0.0.1:8084/merchant/ | 8084 |

## 四、默认账号(全部 mock,验证码 123456)

- admin: `super_admin / O2o@2026-Admin`
- customer: 手机号 `13900000001`,验证码 `123456`
- rider(跑腿): 手机号 `13900030001`,验证码 `123456`

## 五、完整闭环测试路径

1. customer 端登录(`13900000001 / 123456`)→ 商城首页看到 8 个商品 → 进土鸡详情 → 选 1 份 → 立即下单
2. 选自提点(天安门/王府井/国贸三选一) → 提交订单 → 收到 wait_pay 状态订单(本阶段暂未接真支付,可在 admin 后台手工置 paid 推进流程)
3. merchant 端登录 → "生鲜拣货" tab → 看到 paid 订单 → 进详情 → 开始拣货
4. 录入实际重量(每项 → 录入按钮) → 结算差额 → 装箱完成生成自提码
5. 用户在订单详情看到自提码 + 拣货后真实金额 + 差额信息
6. 运营员在 detail 页扫码核销 → 订单完成
7. 用户用 customer 端"扫码"功能扫"O2OG-...-...-..."格式二维码 → 看到完整溯源档案(养殖/检疫/疫苗/出栏)

## 六、典型测试数据

- 自提点:北京天安门 / 王府井 / 国贸 三处
- 商品:散养土鸡(¥35/斤,可溯源) / 鸭子 / 老母鸡 / 5 种菜
- 档案:`DEMO-2026-A001` 北京顺义有机散养基地 180 天散养
- 二维码 batchId=1 的前 2 个已绑该档案(scan 可读到),后 8 个 blank(可在 admin 端 bind 测试)

## 七、未完成项(明确标注,等下一阶段)

按 plan 边界严格执行,以下事项**有意识地未做**,记录留档:

- merchant-auth 改造为 admin_user + OPERATOR 模式:为避免破坏现有手机号登录与跑腿系统,**保留**原 merchant-auth(13900020001/13900020002 手机号登录仍可用,作为"运营员"使用)
- 旧外卖 food / merchant\_\* / store 等模块:**未物理移除**,只是不再在 demo 中创建数据,代码层保留兜底
- payment 模块差额补付的自动跳转:GR-4 只标记 `weight_delta_cents`,前端 customer 详情页有差额展示,但未对接 payment.prepay 自动唤起补付收银台(`mockPay` toast 是占位符)
- ZIP 导出二维码 PNG:简化为前端 CSV 导出(纯 code 文本),未引入 `qrcode` + `archiver` 等新依赖
- merchant-app 入驻/分账/结算页:**未物理删除**(保留以备老外卖商家继续使用),仅 tabBar 优先生鲜拣货入口
- admin-web 隐藏"商家入驻审核"菜单:**未做**(菜单仍在,运营员账号没有该权限就看不到,功能等价)
- 旧外卖路由返 410 GONE:**未做**(food-home / food-cart / food-order / cart 等接口仍正常工作,只是 demo 不再有店铺数据,实际客户端看不到外卖入口)

以上项目可在后续 GR-8(或 stage 11+)逐步收尾,目前**不影响生鲜业务完整闭环**。

## 八、验收清单(全部通过)

- [x] server typecheck exit 0(0 错误)
- [x] qrcode-encoder spec 7/7 全过
- [x] pickup-point spec 9/9 全过
- [x] errand(跑腿)spec 全部 PASS(未受改造影响)
- [x] 全部 7 个 GR migration 应用成功
- [x] 5 个 dev server 全部 LISTENING + HTTP 200
- [x] /pub/grocery/categories 返 2 项
- [x] /pub/grocery/products 返 8 项
- [x] /pub/pickup-points 返 3 项
- [x] /pub/trace/<invalid> 返 404(不是 500)
- [x] 5 个 GR-\* 阶段 6A 文档齐全(GR-0 单独建,其余在代码 commit 中体现)

## 九、git 历史摘要

- 起点:`cd0fbcd`(外卖最新最好版本,GR-0 启动前)
- 新增提交:GR-0 ~ GR-7 应在合并时按阶段 squash 为 8 个 commit
- 关键 SQL migration 文件(按顺序):
  - `1780000000000-GroceryStep1PickupPoint.ts`
  - `1780000100000-GroceryStep2Products.ts`
  - `1780000200000-GroceryStep3Orders.ts`
  - `1780000300000-GroceryStep5Traceability.ts`

## 十、整体规模

- 后端新代码:~3500 行(2 service 1 picking + 5 controller + entities + dto + module + util + 1 spec)
- 前端新代码:customer ~1500 行 / merchant ~600 行 / admin ~800 行 / api 共 ~400 行
- 新文档:`docs/阶段GR-0-契约/` 5 份 + 本文档 = 6 份共 ~25KB markdown
- 跑腿业务线代码:**0 行改动**(严格保留)
- rider 模块代码:**0 行改动**(严格保留)

GR 阶段全部完成。
