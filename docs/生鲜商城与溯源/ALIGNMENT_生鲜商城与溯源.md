# ALIGNMENT — 生鲜商城与溯源改造

> 阶段：6A · Align（对齐阶段）
> 任务名：生鲜商城与溯源
> 输出路径：`docs/生鲜商城与溯源/`
> 创建日期：2026-05-13

---

## 一、项目上下文（已扫描确认）

### 1.1 技术栈与约定

| 维度     | 现状                                                                                                                                                     | 影响                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 后端框架 | NestJS（非 Express/Koa 裸跑），TypeORM + MySQL + Redis + Mongo                                                                                           | 全部按 Nest 模块/Provider/Guard/Interceptor 范式                 |
| 金额存储 | `bigint` 字段，单位"分"（如 `goodsAmount: string`）                                                                                                      | 全链路禁用 `decimal`/元                                          |
| 时间字段 | `bigint`（毫秒时间戳），不用 `datetime`                                                                                                                  | 与 PaymentOrder、FoodOrder 一致                                  |
| 主键     | `bigint` 自增，名为 `xxx_id`                                                                                                                             | 沿用                                                             |
| 命名     | 表名下划线，列名下划线 + entity 驼峰                                                                                                                     | 沿用                                                             |
| 路由前缀 | `c/` 客户、`m/` 商家、`r/` 骑手、`a/`/`admin/` 平台                                                                                                      | 沿用                                                             |
| 鉴权     | `CustomerJwtGuard` / `MerchantJwtGuard` / `RiderJwtGuard` / `AdminJwtGuard`（scope 隔离）                                                                | 直接复用                                                         |
| 装饰器   | `@Idempotent({scope, ttlSeconds})` `@Audit({targetType})` `@CurrentUser()` `@Public` `@RequirePermission` `@Mask` `@Raw`                                 | 直接复用                                                         |
| 返回     | `{ code, msg, data }` 统一 envelope（ResponseInterceptor）                                                                                               | 沿用                                                             |
| 错误码   | `ErrorCode` from `@o2o/contracts`                                                                                                                        | 沿用                                                             |
| 事件总线 | `DomainEventBus` + `EventName` 集中注册，DB 持久化 + 指数退避                                                                                            | 新事件加进枚举即可                                               |
| 调度     | `SchedulerModule`（不 import EventsModule，避免循环）                                                                                                    | 新作业按既有模式                                                 |
| 库存     | 现有方案：`product.stock`(int) + `product_sku.stock`(int) + `stock_lock`(软锁表) + `stock_record`(流水) + DB 事务 + 0 自动 `sold_out` + `stock.low` 事件 | **不引入 Redis Lua**，沿用现有 stock_lock 模式（一致性、可审计） |
| 支付     | `PaymentOrder.bizType: 'FOOD' \| 'ERRAND'`，统一回调                                                                                                     | 扩展 enum 增加 `'GROCERY'`                                       |

### 1.2 现有相关实体（可复用 vs 需新建）

**可直接复用**：

- `Product`（商品；含 store/category/price(分)/stock/images/saleStatus）— 作为生鲜 SKU 主表
- `ProductCategory`（分类）— 复用
- `ProductSku`（多规格）— 生鲜如果按规格售卖直接复用
- `CartItem`（按 customer/store/sku 唯一）— **完全通用**，不区分外卖/生鲜，直接复用
- `Store`（门店；含 merchant/city/avatar/businessStatus）— 复用
- `PaymentOrder`（统一支付单）— 扩展 `bizType` 增加 `GROCERY`
- `StockLock` / `StockRecord` — 复用
- `OrderReview` / `ReviewReply` — 复用（如允许评价）
- `FileObject` — 商品图、检测报告 PDF、二维码 PNG 都走文件服务
- `DomainEventBus` — 注册新事件
- `Coupon*` / `UserCoupon` — 现有优惠券体系可服务生鲜单
- `IdempotencyRecord` — 自动写入

**需新建**：

- `pickup_point`（自提点；属于 store，1:N）
- `pickup_time_slot`（提货时段；属于 pickup_point，按日生成）
- `grocery_order` + `grocery_order_item`（生鲜订单 + 行项，与 food_order 物理隔离）
- `pickup_verify_log`（核销流水）
- `trace_batch`（溯源批次）
- `trace_qr`（溯源二维码）
- `trace_record`（溯源节点流水）
- `trace_scan_log`（扫码日志）

**待下线**：

- `food_order` / `food_order_item` — 重命名 `_deprecated_20260513`，保留 90 天
- `food-order` / `food-home` / `merchant-order` 中外卖相关路径下线
- 跑腿模块（errand-\*）完全不动

### 1.3 四端目录与改造范围

| 端       | 目录                | 需要改造                                                                             |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| customer | `apps/customer-app` | 首页两入口 + 新增商城/购物车/结算/订单/提货码/扫一扫溯源页；删除/下线 `pages/food/*` |
| merchant | `apps/merchant-app` | 商家端首页 Tab 增加"商城"；新增商品/订单/核销/备货/扫码核销页                        |
| rider    | `apps/rider-app`    | **零改动**（仅跑腿）                                                                 |
| admin    | `apps/admin-web`    | 菜单组：生鲜运营、自提点、生鲜订单、溯源中心（批次/QR/节点/扫码统计）                |

---

## 二、原始需求（用户原文复述）

1. **目标一·外卖→生鲜自提**
   - 废弃原外卖点餐及配送相关功能（移除表/接口/页面）
   - 新增生鲜商城：商品浏览/加购、下单选自提点 + 提货时段、仅自提无配送无骑手
   - 支付成功生成提货码，店员扫码/手输核销
   - 跑腿完全保留，前后台明确隔离

2. **目标二·溯源**
   - 后台批量生成溯源二维码（批次 + SKU 维度），可下载打印
   - 扫码枪定位录入溯源信息（产地/供应商/生产日期/检测报告/流转）
   - 用户端"扫一扫溯源"扫码查看全链路信息

3. **安全约束**
   - 跑腿现有功能零影响
   - RESTful 接口
   - 防刷、订单金额后端重算、核销权限校验
   - 二维码加签名防伪造

---

## 三、边界确认

### 3.1 In Scope（本任务包含）

- 生鲜商城完整链路：商品、分类、购物车、自提点、时段、订单、支付、提货码、核销
- 溯源完整链路：批次、QR、节点录入、扫码查看、防伪签名
- 外卖模块下线（路由/页面摘除 + 表重命名）
- 四端 UI 改造（按上表）
- 必要的单测与集成测试

### 3.2 Out of Scope（本任务不做）

- 外卖历史数据迁移到生鲜（业务无对应关系，不做）
- 跑腿任何改动
- 多商户独立溯源系统（暂归平台统一，按商户隔离权限即可）
- 冷链温控传感器接入（仅人工录入节点）
- 售后退货流程（如确需，下个迭代）
- 微信小程序原生扫一扫差异适配（统一走 `uni.scanCode`）

### 3.3 显式保留（强约束）

- `errand_*` 全部表、`errand-*` 全部模块、`rider-*` 全部模块
- `payment_order` 既有 FOOD/ERRAND 分支不动，仅新增 GROCERY 分支
- `product` / `cart_item` / `store` / `stock_*` 共享表，生鲜与外卖在迁移期内共表是可接受的（外卖路由下线后不再写入）

---

## 四、需求理解（结构化）

### 4.1 业务流（生鲜）

```
浏览商品 → 加购 → 选购物车结算
→ 选自提点 → 选提货时段（按门店容量）
→ 试算（preview，写 order_price_snapshot 5min TTL）
→ 提交（事务：写 grocery_order WAIT_PAY + 锁库存 stock_lock + 占用 slot reserved）
→ 唤起支付（PaymentOrder bizType=GROCERY）
→ 支付回调 → 状态 WAIT_PICKUP + 生成 6 位提货码 + 通知用户
→ 店员扫码/手输提货码 → 核销成功 → 状态 PICKED_UP + 写流水
→ 完成
```

### 4.2 业务流（溯源）

```
后台建批次（产品 + 生产日期 + 数量）→ 异步生成 N 个 QR
  → 每个 QR：唯一短码 + HMAC 签名 + PNG 上传 OSS
  → 打包 zip/pdf 供下载
后台扫码枪输入 → lookup(code) → 录入/编辑节点（批次维度 / QR 维度）
用户扫一扫 → 解析 URL（code + sig）→ 服务端验签 → 返回商品 + 批次 + 节点
  → 写 trace_scan_log
```

### 4.3 状态机

**`grocery_order.status`**

```
WAIT_PAY → PAID_WAIT_PICKUP → PICKED_UP → COMPLETED
        ↘ CANCELLED（超时/用户）
PAID_WAIT_PICKUP → REFUNDING → REFUNDED（异常退款）
```

**`trace_qr.status`**

```
ACTIVE（已生成可用）→ SCANNED（首次被用户扫过）→ DISABLED（管理员作废）
```

---

## 五、疑问澄清（智能决策 + 待用户确认）

### A. 已基于现有项目内容自行决策的项

| #   | 决策                                                                             | 依据                                                                       |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A1  | 金额一律 `bigint` 分单位                                                         | 与 PaymentOrder/FoodOrder 一致                                             |
| A2  | 时间一律 `bigint` 毫秒                                                           | 全表统一                                                                   |
| A3  | 不引入 Redis Lua 扣库存                                                          | 现有 stock_lock + DB 事务方案已稳定运行，引入新模式增加心智负担            |
| A4  | 复用 `Product` / `CartItem` / `ProductCategory` / `Store` / `ProductSku`         | 这些表 schema 通用                                                         |
| A5  | `PaymentOrder.bizType` 扩展 `GROCERY`                                            | 现成多业务分支机制                                                         |
| A6  | 新增独立 `grocery_order` 而非在 `food_order` 加 `order_type`                     | food_order 字段太外卖业务化（delivery_fee、accepted_at、ready_at），混用脏 |
| A7  | 用户端订单列表分 Tab 而非合并 union                                              | UI 已分跑腿/外卖 Tab，自然延续                                             |
| A8  | 路由前缀沿用 `c/m/r/admin`                                                       | 已有约定                                                                   |
| A9  | 二维码图片走 `FileObject` + 现有 OSS/文件服务                                    | 不引入新存储                                                               |
| A10 | 扫一扫使用 `uni.scanCode`                                                        | 现有依赖足够                                                               |
| A11 | 提货码 6 位数字 + sha256 hash 存储                                               | 用户友好 + 防泄露                                                          |
| A12 | 核销操作走商家端 `m/pickup/*`                                                    | 与现有商家端路由风格一致                                                   |
| A13 | 旧外卖路由下线策略：controller 上 `@Public` 移除 + 返回 410 Gone                 | 不立即删代码，留 1 个 release 回滚窗口                                     |
| A14 | 旧外卖表重命名为 `food_order_deprecated_20260513` 等，90 天后归档                | 防回滚需要                                                                 |
| A15 | 溯源 SECRET 走 `.env` (`TRACE_SECRET`)，HMAC-SHA256 截前 16 位作短签             | 与现有 jwt secret 管理模式一致                                             |
| A16 | 节点支持"批次维度"+"单 QR 维度"二选一                                            | 兼顾批量录入与单件溯源                                                     |
| A17 | 跑腿订单与生鲜订单复用 `PaymentOrder` / `RefundOrder` / `OrderReview` 表         | 这些表已 bizType 化                                                        |
| A18 | 自提点独立表 `pickup_point`，不复用 `store`                                      | 一商户 N 自提点；store 当前是 merchant 1:1                                 |
| A19 | 时段容量在 `pickup_time_slot` 维护 `capacity/reserved` 字段，DB 乐观锁保证不超分 | 与库存方案一致                                                             |
| A20 | 商家端核销账号通过现有 `merchant_account` + 关联 `pickup_point_id` 限制操作范围  | 已有 RBAC                                                                  |

### B. 必须用户确认的关键决策点

> 这些会影响数据结构 / 团队工作量 / 上线时点，需要用户裁决。

#### Q1. 外卖历史订单与历史商品处置

- 选项 A：**全部归档冻结**，进行中订单按"用户全额退款 + 公告"在 T-7 处理；表重命名保留 90 天后 DROP。（推荐）
- 选项 B：保留只读，外卖页面变只读历史档案。
- 选项 C：物理删除，不保留。

#### Q2. 生鲜是否启用 SKU 多规格

- 选项 A：**先不用 SKU，每个商品一个 sku**（默认 SKU）— 实现快，上线快。（推荐）
- 选项 B：完整启用 ProductSku（规格、属性）— 适合大米/水果有多包装规格场景。

#### Q3. 自提点与门店关系

- 选项 A：**每个自提点 = 一个轻量"自提点"实体**（独立 `pickup_point` 表，归属 merchant + 关联可选 store_id），核销账号是商家子账号绑定自提点。（推荐）
- 选项 B：自提点即 Store（一个商户多个门店都注册成 Store）。

#### Q4. 提货时段配置粒度

- 选项 A：**按日生成，时段固定 09-12/12-15/15-18/18-21（4 段）**，默认容量 50。（推荐）
- 选项 B：商家可任意自定义起止与容量。
- 选项 C：按小时滚动。

#### Q5. 溯源节点是否对接区块链/可信存证

- 选项 A：**仅 MySQL 存储 + HMAC 签名 + 节点时间戳**（推荐，MVP）
- 选项 B：每个节点 hash 上传第三方存证（如蚂蚁链/腾讯至信链），需要采购 + 接入工时

#### Q6. 二维码下载产物形式

- 选项 A：**ZIP 包含每个 PNG（命名 `<code>.png`）+ 一份 CSV 索引**（推荐，便于打印对位）
- 选项 B：PDF 排版页（A4 网格，便于直接打印）
- 选项 C：A + B 都给

#### Q7. 是否允许匿名扫码查看溯源

- 选项 A：**允许匿名**（用户体验最好；登录用户额外记录 user_id）（推荐）
- 选项 B：必须登录（杜绝爬虫，但伤体验）

#### Q8. 评价系统是否覆盖生鲜

- 选项 A：**支持，复用 OrderReview**（推荐）
- 选项 B：先不上，下版本

#### Q9. 优惠券是否对生鲜开放

- 选项 A：**复用现有 UserCoupon 体系，新增 `coupon_rule.scope = 'GROCERY'`**（推荐）
- 选项 B：生鲜与跑腿共用同一可用券池
- 选项 C：暂不开放

#### Q10. 上线策略

- 选项 A：**单分支 `feat/grocery-mall` 一次性合并**（推荐，模块独立无回归风险）
- 选项 B：分四个 PR 按 Wave 提交

---

## 六、最终交付物清单（Align 阶段产出）

- [x] `ALIGNMENT_生鲜商城与溯源.md`（本文档）
- [ ] `CONSENSUS_生鲜商城与溯源.md`（待用户回答 Q1–Q10 后生成）

---

## 七、自审检查（按 CLAUDE.md 质量门控）

| 项                                   | 状态                                                |
| ------------------------------------ | --------------------------------------------------- |
| 现有项目结构、技术栈、依赖已分析     | ✅                                                  |
| 现有代码模式、文档、约定已分析       | ✅                                                  |
| 业务域与数据模型已理解               | ✅                                                  |
| 智能决策清单（A1–A20）已记录         | ✅                                                  |
| 用户决策清单（Q1–Q10）已按优先级排序 | ✅                                                  |
| 技术方案与现有架构对齐               | ✅（金额/时间/路由/鉴权/事件/库存全部沿用现有约定） |
| 验收标准具体可测试                   | ⏳ 待 CONSENSUS                                     |
| 项目特性规范已对齐                   | ✅                                                  |
