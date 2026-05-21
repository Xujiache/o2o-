# 阶段 GR-0 · ALIGNMENT（对齐）

> 严格按 Plan 6 项产品决策落地。所有越界（动 errand / rider / 跑腿页面）在自审时必须暴露并回滚。

## 1. 项目上下文（截至 GR-0 启动时）

- 当前 HEAD = `cd0fbcd`（外卖最新最好版本，已剥离商城实验分支 `archive/grocery-experiment`）
- 当前规模：84 modules / 89 表 / ~146 接口 / 62 EventName / 55 Subscriber / 42 Job
- 已 healthy 跑通：5 端 dev server（server :3000 / admin :8083 / customer :8081 / rider :8082 / merchant :8084）+ 4 个基础设施容器（MySQL/Redis/Mongo/MinIO）
- 跑腿 errand 业务线 spec 测试 ~20 个，本次改造不得使任何一个 fail

## 2. GR 阶段总范围（严格遵循 Plan 七项交付）

### 2.1 必须做

- 新增 5 个后端模块：`pickup-point` / `grocery-product` / `grocery-order` / `traceability-archive` / `traceability-qrcode`
- 新增 6 张表：`pickup_point` / `grocery_product` / `grocery_category` / `grocery_order` / `grocery_order_item` / `traceability_archive` / `traceability_qrcode` / `qrcode_batch`
- 4 端配套页面：customer 商城 + 选自提点 + 扫码识别；admin 自提点/二维码/档案管理；merchant-app 改造为自营运营员后台
- 商家端 merchant-app 整体改造为"平台自营运营员后台"：菜单只剩商品/订单/拣货/溯源
- 旧外卖 food-order / cart / coupon 链路在 GR-7 收尾时返回 410 GONE
- 演示 seed（`demo.seed.ts`）替换为生鲜版本（3 自提点 + 8 SKU + 一鸡一码档案 + 1 customer + 1 运营员）

### 2.2 严格不做（防越界）

- ❌ 不动 `apps/server/src/modules/errand-*` 任何一行
- ❌ 不动 `apps/server/src/database/entities/errand-*.entity.ts` 任何一行
- ❌ 不动 `apps/customer-app/src/pages/errand/` 任何一行
- ❌ 不动 rider 整条线（rider-account / auth / task / earning / withdrawal / assessment / violation / location / track）
- ❌ 不动 customer_user / customer_profile / customer_address / sms_code / login_device / 通用 payment_order / refund_order schema（仅扩展，不改字段）
- ❌ 不 cherry-pick `archive/grocery-experiment` 分支任何 commit（全新写）
- ❌ 不在 GR-0 写任何业务代码（本阶段纯文档）
- ❌ 不接真支付 / 真短信 / 真高德地图（仍 mock，与现有 INTEGRATION_MODE=mock 一致）
- ❌ 不引入新基础设施（不加 PostgreSQL / ElasticSearch / Kafka 等）
- ❌ 不改 4 端的鉴权框架（仍 4 token 严格隔离）

## 3. 智能决策记录（10 个 Q&A）

### Q1：差额补付的金额边界

**A**：默认硬上限 `|delta_cents| ≤ estimated_amount_cents × 0.30`（即 ±30%）。超出则：

- 拣货员调用 `settle` 接口时返回 `STATUS_INVALID` + `errorMessage="差额超过 30% 上限，转人工处理"`
- 该订单自动转 `cancelled`（退还预付款），通知用户重新下单
- 上限可由 sys_config 动态调整（key=`grocery.delta_max_ratio`，default=0.30）

### Q2：二维码 `code` 编码规则

**A**：固定格式 `O2OG-{batchSeq:4}-{itemSeq:6}-{checksum:2}`，共 16 字符，全大写字母+数字。

- `batchSeq`：批次序号，base36 编码（0~46655，最多支持 46656 批）
- `itemSeq`：批次内序号，base36 编码（0~46655，单批最多 46656 个，但实际限制 ≤1000/批）
- `checksum`：前 14 字符 SHA-256 取前 2 字符（防伪轻验签，**非加密签名**）
- 示例：`O2OG-A1B2-C3D4E5-F6`
- 公开扫码接口 `GET /api/v1/pub/trace/{code}` 校验 checksum；不通过返回 404

### Q3："运营员账号" 复用还是新建表？

**A**：**复用 `admin_user` 表 + 新角色 `OPERATOR`**，不新建 `operator_user` 表。理由：

- 运营员本质是平台员工，与超管同一管理身份
- 现有 admin-auth / sys_role / sys_permission 全套权限框架已就位
- 商家端 merchant-app 登录端口（Merchant-Token）**改造为复用 admin_user 登录**（用 username + password，不用手机号），与 admin-web 共用一套账户但 Token 端隔离
- 运营员账号在 admin-web 创建（OPERATOR 角色），登录 merchant-app 进入运营员后台

### Q4：数据库迁移策略

**A**：**叠加迁移，不 drop 现有库**。理由：

- 跑腿 errand 数据必须保留（活的业务线）
- 通用表 customer_user / customer_profile / sms_code 等被两条业务线共用
- 旧 food*order / store / merchant*\* 表 GR-7 收尾时保留 DDL 但代码中不再 select/insert/update
- 新 grocery\_\* 表通过新增 migration 文件追加（migration 时间戳 = `1780000000000` 之后）

### Q5：原 merchant-app 商家入驻链路如何"软废弃"

**A**：分两步：

- GR-1：admin-web 隐藏"商家入驻审核"菜单（路由仍在）；merchant-app 删除 onboarding 页面路由；merchant-auth.service 修改为"用 admin_user 表 + OPERATOR 角色 + Merchant-Token 签发"
- GR-6：完全移除 merchant-app 的 withdrawal / settlement / statistics 页面，菜单只剩商品/订单/拣货/溯源
- GR-7：merchant-onboarding / merchant-application / merchant-license 三个 module 整体 `unimport`，但保留代码以备未来回滚（不删 source）

### Q6：grocery 商品与 product 表的关系

**A**：**完全独立的新表 `grocery_product`，不与现有 `product` 表合并**。理由：

- 现有 `product` 表归属 store（外键 store_id），生鲜自营无 store 概念
- 现有 `product` 表 + `product_sku` 是"按份"模型，与"按斤"模型不兼容
- 新表更清晰；旧表在 GR-7 保留 DDL 但 service 层不再调用

### Q7：购物车跨业务线如何隔离

**A**：新增 `grocery_cart_item` 表（与现有 `cart_item` 物理隔离）。理由：

- 跑腿无购物车，外卖 cart_item 关联 store_id，无法复用
- 完全独立的新表更安全
- GR-7 时 cart_item 表保留 DDL 但代码不再调用

### Q8：customer 端 H5 首页 tabBar 的"首页"如何切换

**A**：GR-2 把 `apps/customer-app/src/pages/food/home/index` 路由替换为 `apps/customer-app/src/pages/grocery/home/index`。pages.json 中 tabBar 第一项的 `pagePath` 改为新路由。原 food/home/index 文件保留磁盘上但路由不再注册；GR-7 时返回 410 不可访问。

### Q9：差额补付支付通道与原支付一致性

**A**：差额补付走**同一 payment_order 表 + 同一 payment 模块**。

- 新增 `payment_order.purpose` 字段（已有则复用），取值 `grocery_estimate` / `grocery_delta` / `food_order` / `errand_order` 等
- 差额支付的 `relatedOrderId` = grocery_order_id（与估价支付指向同一订单）
- 差额退款走 `refund_order` 表，相同方式
- 这样 GR-4 不需要新建独立支付流水表

### Q10：一鸡一码档案中"已售出"如何记录

**A**：3 处冗余记录，互为审计：

- `traceability_qrcode.status` 改为 `sold`
- `traceability_qrcode.sold_order_id` 记录订单 ID
- `grocery_order_item.bound_qrcode_ids` JSON 数组记录所有绑定的二维码 ID
- 售后退款时，二维码状态保持 `sold`（已实际离开仓库），仅订单状态变 `refunded`

## 4. 性能与容量约束

- 单批二维码生成 ≤ 1000 张（防 MinIO 单文件过大；批次自身无上限）
- 一鸡一码档案表无上限，单表设计目标 ≤ 100 万行（年 30 万只鸡）
- 拣货称重接口必须 ≤ 500ms（运营员手持设备体验）
- 公开扫码查档案 `GET /pub/trace/{code}` 必须 ≤ 200ms（缓存到 Redis 1h）

## 5. 错误码新增（contracts 包）

- `WEIGHT_DELTA_EXCEEDED`：差额超过上限（GR-4）
- `QRCODE_INVALID_CHECKSUM`：二维码 checksum 校验失败（GR-5）
- `QRCODE_ALREADY_BOUND`：二维码已绑定档案（重复扫码）（GR-5）
- `QRCODE_ALREADY_SOLD`：二维码已售出（不能再绑）（GR-5）
- `PICKUP_CODE_INVALID`：自提码错误或已使用（GR-4）
- `GROCERY_OUT_OF_STOCK`：库存不足（按斤）（GR-2/3）
- `PICKING_NOT_READY`：订单未到拣货状态（GR-4）

## 6. 阶段 GR-0 输出物

- 6 份文档（README + ALIGNMENT + CONSENSUS + DESIGN + TASK + ACCEPTANCE）
- **不产出**：任何 .ts / .vue / .sql / migration / seed 代码改动

## 7. 与跑腿业务线的契约边界

- 跑腿订单状态机、跑腿 timeline、跑腿支付、跑腿售后**保持现状**
- 用户端 tabBar 的"订单" tab 进入后，**新增 segmented tab**：[生鲜] [跑腿]，分别拉 grocery_order 列表和 errand_order 列表（GR-3 实现）
- 用户端"我的"页面入口保持不变（个人资料/地址/优惠券/钱包）
