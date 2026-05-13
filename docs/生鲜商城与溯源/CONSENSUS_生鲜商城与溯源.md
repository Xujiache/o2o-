# CONSENSUS — 生鲜商城与溯源改造

> 阶段：6A · Align 共识
> 任务名：生鲜商城与溯源
> 创建：2026-05-13
> 状态：用户已确认 Q1–Q10，进入 Architect 阶段

---

## 一、最终需求描述

将现有 O2O 平台的「外卖点餐 + 骑手配送」模块整体替换为「生鲜商城 + 到店自提」模块；同时新增「商品溯源」能力（批量二维码生成 + 扫码枪录入 + 用户端扫一扫查看）。跑腿模块完全保留、零回归。

---

## 二、核心业务规则（已确认）

### 2.1 商品定价模式

商品分两种 `pricing_mode`：

| 模式     | 标识      | 说明                                                                                                    |
| -------- | --------- | ------------------------------------------------------------------------------------------------------- |
| 固定计价 | `fixed`   | 一份一价（如盒装牛奶、净菜礼盒）                                                                        |
| 称重计价 | `weighed` | **散装现称**：商家公布单价（如 5.80 元/斤），用户下单时填写**预估重量**，店员到店实际称重后系统多退少补 |

### 2.2 散装称重订单流程（关键）

```
[下单]   用户选称重商品 → 输入预估数量(默认 1 斤,可调整)
         → 系统按 单价 × 预估量 计算 estimated_subtotal
         → 锁库存(按预估量)
         → 锁时段 + 写 WAIT_PAY

[支付]   按 estimated_amount 预付 → 状态 PAID_WAIT_PICKUP

[到店]   店员扫码/手输提货码 → 进入"待称重"页
         → 逐项称重，录入 actual_quantity
         → 系统计算 actual_subtotal & final_amount
         → 若 |final - estimated| / estimated <= 10%:
              直接通过(±10% 浮动免打扰),按 final 计差额自动多退少补
           若超出 10%:
              ▸ 需补付:展示二维码,客户扫码补付(走 PaymentOrder 二次单)
              ▸ 应退还:自动原路退款(走 RefundOrder)
         → 全部行项称完且差额处理完成 → 状态 PICKED_UP

[完成]   PICKED_UP 自动转 COMPLETED(或评价后) 进入售后期
```

> 单订单可同时含 fixed 和 weighed 行项；仅对 weighed 行项做称重和差价处理。

### 2.3 状态机

**`grocery_order.status`**

```
WAIT_PAY ──pay──> PAID_WAIT_PICKUP ──weighing──> SETTLING ──ok──> PICKED_UP ──> COMPLETED
   │                    │                            │
   │                    │                            └─ DIFF_PAYING (补付中) ──> PICKED_UP
   └─cancel──> CANCELLED
                        └─auto-cancel(no-show)──> CANCELLED(过期退款)
                        └─refund──> REFUNDING ──> REFUNDED
```

> **SETTLING** 是中间态：店员开始称重到差额处理完毕之间。若 30 分钟无后续动作，挂起报警但不自动取消。

**`trace_qr.status`**: `ACTIVE` → `SCANNED` → `DISABLED`

---

## 三、决策汇总（用户已确认）

| #      | 主题         | 决策                                                                                                                                                |
| ------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1     | 外卖历史数据 | **全量归档冻结**：表重命名 `_deprecated_20260513`，进行中订单 T-7 强制退款，保留 90 天后 DROP                                                       |
| Q2     | 商品规格     | **称重模式**：新增 `product.pricing_mode` 字段（`fixed`/`weighed`），称重商品不启用 ProductSku 多规格，沿用 product.unit_price 单价(元/斤或元/公斤) |
| Q3     | 自提点模型   | **独立 `pickup_point` 表**，归属 merchant + 可选关联 store_id                                                                                       |
| Q4     | 时段配置     | **商家完全自定义**：任意起止时间 + 自定义容量，后台支持按周复制批量配置                                                                             |
| Q5     | 称重结算     | **预估预付 + 多退少补**，±10% 浮动免打扰，超出触发补付/退款                                                                                         |
| Q6     | 存证方式     | **仅 MySQL + HMAC 签名**，不接区块链                                                                                                                |
| Q7     | 二维码下载   | **ZIP + CSV 索引**                                                                                                                                  |
| Q8     | 匿名扫码     | **允许**，登录用户额外记 user_id                                                                                                                    |
| Q9     | 生鲜评价     | **复用 OrderReview**，订单完成后可评价                                                                                                              |
| Q10    | 优惠券       | **开放**，`coupon_rule.scope` 扩展 `'GROCERY'`                                                                                                      |
| Q11    | 分支策略     | **单分支 `feat/grocery-mall` 一次性合并**                                                                                                           |
| A1–A20 | 项目约定     | 已记于 ALIGNMENT 文档，全部沿用现有金额/时间/路由/鉴权约定                                                                                          |

---

## 四、技术实现方案

### 4.1 后端

- **模块新增**：`grocery-product` `grocery-cart`（如复用 cart 则不新建）`pickup-point` `grocery-order` `grocery-weigh`（称重 + 差价结算）`pickup-verify` `trace-batch` `trace-qr` `trace-record` `trace-scan`
- **模块下线**：`food-order` `food-home` `merchant-order`(仅外卖部分)
- **PaymentOrder.bizType** 扩展 `'GROCERY'`（用于主单）+ `'GROCERY_DIFF'`（差价补付，可选；也可统一 GROCERY 用 metadata 区分）→ **决定**：统一用 `GROCERY`，在 callback raw 里区分主单/差价单的 `subType`
- **RefundOrder.bizType** 扩展 `'GROCERY'`
- **新增事件**：`grocery.order.created` `grocery.order.paid` `grocery.order.weighed` `grocery.order.settled` `grocery.order.picked_up` `grocery.order.cancelled` `trace.qr.scanned` `trace.batch.created`
- **新增定时任务**：`grocery-order-expire-job`（每分钟扫超时未付）`grocery-order-settle-timeout-job`（SETTLING 30min 报警）
- **新增权限位**：
  - `grocery:product:read|write`
  - `grocery:order:read|cancel|refund`
  - `pickup:point:read|write`
  - `pickup:verify` `pickup:weigh`
  - `trace:batch:read|write` `trace:qr:gen|export` `trace:record:write`

### 4.2 数据库新表（仅列名，详细 SQL 在 DESIGN）

| 表                   | 用途                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `pickup_point`       | 自提点                                                                                        |
| `pickup_time_slot`   | 时段配置（capacity/reserved）                                                                 |
| `grocery_order`      | 生鲜订单主表                                                                                  |
| `grocery_order_item` | 行项（含 pricing_mode/estimated_quantity/actual_quantity/estimated_subtotal/actual_subtotal） |
| `pickup_verify_log`  | 核销流水                                                                                      |
| `trace_batch`        | 溯源批次                                                                                      |
| `trace_qr`           | 二维码                                                                                        |
| `trace_record`       | 溯源节点                                                                                      |
| `trace_scan_log`     | 扫码日志                                                                                      |

**Product 表新增字段（向后兼容，非破坏）**：

- `pricing_mode` enum('fixed','weighed') default 'fixed'
- `weight_unit` varchar(8) nullable（'jin'/'kg'/'g'，仅 weighed 用）
- `min_weight` / `max_weight` int nullable（最小起售 / 单次上限，分位 g）
- `category_id` 旁路新增 `product_type` enum('food','grocery') 区分类目（默认 food，新建生鲜商品填 grocery；外卖下线后不再有 food 数据写入）

**CartItem 表新增字段**：

- `estimated_quantity_g` int nullable（称重商品的预估克数，仅 weighed sku 使用）
- `pricing_mode_snapshot` enum 冗余（避免 cart 与 product 实时联表）

> 这些新字段对外卖现状零影响（外卖路由即将下线）。

### 4.3 前端

| 端           | 改造                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| customer-app | 首页两入口（商城/跑腿）；新增 grocery/_ 与 trace/_ 全部页面；下线 food/\*；我的订单 Tab 增加"商城" |
| merchant-app | 新增 Tab："商城"；新增 商品/订单/称重/核销/备货页                                                  |
| rider-app    | 零改动                                                                                             |
| admin-web    | 菜单组：生鲜运营 / 自提点 / 生鲜订单 / 溯源中心                                                    |

### 4.4 安全

- 提货码 6 位数字 + sha256(code + salt) 入库；不日志明文
- 核销账号必须绑定 pickup_point_id，跨点核销 403
- 称重操作记录 operator_id 与 timestamp，禁止 0/负重量
- 差价补付 PaymentOrder 单独编号，沿用现有验签
- 溯源 URL 携带 HMAC 短签（16 位），后端验签失败 → 404
- 同 IP 1 分钟扫码 > 30 次封禁该 IP（接现有 RateLimitGuard）
- 二维码批量下载有 `trace:qr:export` 权限校验

---

## 五、验收标准

### 5.1 功能验收

- [ ] 用户可在客户端浏览生鲜商品、加购、选自提点 + 时段、下单支付
- [ ] 称重商品下单时可输入预估量，预付按预估金额
- [ ] 店员可扫提货码核销（固定商品直接核销）
- [ ] 店员可对称重商品逐项录入实际重量，系统正确算出差额
- [ ] 差额超出 ±10% 时正确触发补付/退款
- [ ] 用户可在我的订单查看商城订单 + 提货码 + 称重结果
- [ ] 跑腿全链路（下单/接单/支付/结算/评价）一键回归通过
- [ ] 后台可建批次、批量生成 N 个二维码、下载 ZIP + CSV
- [ ] 后台扫码枪输入码可定位 QR 并录入节点
- [ ] 客户端扫一扫可看到溯源详情（含商品 + 批次 + 节点 + 附件）
- [ ] 伪造二维码（错签）被服务端拒绝
- [ ] 外卖路由全部 410 Gone，旧表已重命名

### 5.2 非功能验收

- [ ] 下单 P95 < 500ms（生鲜订单创建）
- [ ] 二维码生成 10000 条 < 10min（异步任务）
- [ ] 单测覆盖：grocery-order.service、trace.service、pickup-verify.service 三个核心服务 ≥ 80%
- [ ] 集成测试：下单→支付→称重→核销→评价 e2e 通过
- [ ] 跑腿 e2e（errand-status-contract.spec.ts 等）零回归
- [ ] 安全：金额后端重算；签名校验；权限隔离

### 5.3 文档验收

- [ ] DESIGN/TASK/ACCEPTANCE/FINAL/TODO 五份文档齐全
- [ ] DB migration 文件命名规范（时间戳+描述）
- [ ] 阶段交付清单同步更新到「项目阶段规划/」

---

## 六、技术约束（不可违反）

1. **金额单位"分"，类型 `bigint`**
2. **时间单位"毫秒"，类型 `bigint`**
3. **不引入 Redis Lua 库存扣减**，沿用 stock_lock + DB 事务
4. **不修改任何 errand-_ 和 rider-_ 代码**
5. **不修改 PaymentOrder/RefundOrder 既有 FOOD/ERRAND 分支逻辑**，仅追加 GROCERY 分支
6. **SchedulerModule 不 import EventsModule**（已有约定）
7. **任何敏感配置写 `.env`**（TRACE_SECRET、PICKUP_CODE_SALT）
8. **rider-app 零改动**

---

## 七、风险与应对

| 风险                 | 应对                                                              |
| -------------------- | ----------------------------------------------------------------- |
| 称重差额过大引起客诉 | UI 提示"称重最终金额可能在 ±10% 内浮动"；超额必须用户手动确认补付 |
| 店员误录称重数据     | 称重提交需二次确认；保留 5 分钟内撤销窗口；写完整 audit log       |
| 商家恶意调高单价     | 商品价变更走 audit + 已下单订单价格快照不变                       |
| 二维码被预先扫描爬取 | 短签 + 同 IP 限频；异常告警                                       |
| 旧外卖数据回滚       | 表保留 90 天可回滚；下线第一周保留路由 410 提示但保留进程入口     |

---

## 八、交付物清单

```
docs/生鲜商城与溯源/
├── ALIGNMENT_生鲜商城与溯源.md   ✅
├── CONSENSUS_生鲜商城与溯源.md   ✅ (本文档)
├── DESIGN_生鲜商城与溯源.md      ⏳ 下一步
├── TASK_生鲜商城与溯源.md        ⏳
├── ACCEPTANCE_生鲜商城与溯源.md  ⏳
├── FINAL_生鲜商城与溯源.md       ⏳
└── TODO_生鲜商城与溯源.md        ⏳
```

下一步：进入 **Architect 阶段**，输出 DESIGN 文档（架构图 + 模块依赖 + 完整 DDL + OpenAPI 契约 + 序列图）。
