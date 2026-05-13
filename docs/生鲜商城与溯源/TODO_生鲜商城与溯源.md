# TODO — 生鲜商城与溯源

> 阶段：阶段性 Automate 后挂起；后端 Wave1-4 已落地并通过 tsc。
> 创建：2026-05-13

---

## 一、必须用户处理（启动前的运行依赖）

### A1. 环境变量（写入项目根 `.env`）

```bash
# 提货码哈希盐(必填,生产用足够长随机串)
PICKUP_CODE_SALT="<32+ chars random>"

# 溯源 HMAC 签名密钥(必填,绝不可公开)
TRACE_SECRET="<32+ chars random>"

# 可选:溯源 URL 基底(默认走当前请求 host)
# 生成 CSV 时拼成 https://m.your-domain.com/c/trace/info?code=...&sig=...
TRACE_QR_BASE_URL="https://m.your-domain.com/api/v1"
```

操作：

```bash
# 生成两个随机串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### A2. 数据库 migrations 执行

```bash
cd apps/server
pnpm typeorm migration:run
```

本次新增 2 条 migration：

- `1718500000000-GroceryProductAndCartFields` — product/cart_item ALTER
- `1718500100000-GroceryTables` — 9 张新表

### A3. 外卖旧数据下线（待商业决策）

脚本：`deploy/sql/rename-food-tables.sql`

- **执行时点**：客户端商城路径已上线 + 进行中外卖订单已 T-7 强制退款
- **回滚窗口**：90 天
- **终极清理**：90 天后 DBA 走 dump → OSS → DROP

---

## 二、强烈建议处理（功能完整性）

### B1. 安装可选依赖（PDF/ZIP 打包二维码下载）

当前实现：`GET admin/trace/batches/:id/qrcodes/export.csv` 返回 CSV 索引（含 qr_code + short_sig + URL），客户可自己批量生成 PNG。

若需后端直接出 ZIP/PDF（含每个 PNG）：

```bash
cd apps/server
pnpm add qrcode archiver
pnpm add -D @types/qrcode @types/archiver
```

然后在 `trace.service.ts` 补一个 `exportBatchZip(...)` 流式响应即可（DESIGN 6.2 序列图已给逻辑）。

### B2. 商家端 UI（Wave6 待做）

- merchant-app：商城/订单/称重/核销/备货页（详见 TASK\_\*.md T19）
- 当前后端 API 已就绪，路径：
  - `GET m/grocery/products` `POST/PUT/PATCH m/grocery/products/...`
  - `GET/POST/PATCH m/pickup-points` + `POST :id/slots/batch`
  - `POST m/pickup/verify` `POST m/pickup/weigh` `POST m/pickup/weigh/confirm` `POST m/pickup/finalize`

### B3. 客户端 UI（Wave5 待做）

- customer-app：
  - 首页两入口（商城/跑腿）
  - `pages/grocery/*` 全套商品/购物车/结算/订单/差价补付
  - `pages/trace/*` 扫一扫 + 详情时间轴
  - 我的订单 Tab 分商城/跑腿
- 详见 TASK\_\*.md T16-T18

### B4. 平台后台 UI（Wave6 待做）

- admin-web：
  - 生鲜运营（商品/分类/库存）
  - 自提点 + 时段批量配置
  - 生鲜订单管理 + 强制退款
  - 溯源中心（批次/QR/节点录入/扫码统计）
- 详见 TASK\_\*.md T20

---

## 三、后续阶段（Wave7 收尾）

### C1. 外卖路由 410 Gone

- 在 `food-order.controller.ts` `food-home.controller.ts` `merchant-order.controller.ts`（仅外卖部分）的 controller 全局注入 `FoodDeprecatedGuard`，返回 410
- 或在 `main.ts` 注册一个 path-prefix middleware：`/api/v1/c/food/*`、`/api/v1/m/order/food/*` → 410 + 文案
- 等 Wave5+6 上线后再启用，避免开发期 e2e 失败

### C2. 单测

- 重点：
  - `grocery-order.service.spec.ts` — preview 价格重算 + submit 事务回滚
  - `grocery-weigh.service.spec.ts` — ±10% 容差 / 退款分支 / 补付分支
  - `pickup-verify.service.spec.ts` — 限频 + 越权 + 状态校验
  - `trace.service.spec.ts` — HMAC 签名验签 + 限频
- 目标覆盖率 ≥80%

### C3. 集成测试

- 生鲜全链路 e2e：浏览→加购→preview→submit→pay callback→verify→weigh→confirm→finalize
- 跑腿回归：`errand-status-contract.spec.ts` 等全套必须通过

### C4. 阶段交付清单同步

- 在「项目阶段规划/」目录追加 `12-阶段12-生鲜商城与自提/` 与 `13-阶段13-溯源/` 两个文件夹
- 各自包含「需求清单 + 接口清单 + 数据模型 + 阶段交付清单」

---

## 四、已知技术债（不阻塞上线）

| #   | 项                                                                                   | 影响                                        | 建议                                                                    |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| D1  | 二维码 PNG 不在后端生成，仅 CSV                                                      | 商家需自己用 CSV 中 URL 批量出图            | B1 安装 qrcode + archiver 后启用                                        |
| D2  | 优惠券对生鲜的折扣计算暂未接入 `preview`                                             | discount 始终为 0                           | 取出 coupon-customer.service 公共方法挪入 grocery-order.service.preview |
| D3  | grocery 行项未联动 stock_lock 表（直接 decrement product.stock）                     | 与外卖路径不完全对称；超时回滚靠 expire job | 后续若开放高并发促销，再接入 stock_lock                                 |
| D4  | 差价补付 PaymentOrder 与主单使用同一 `bizId`，依靠 order.status + diffPayStatus 区分 | 对账时需双重判断                            | 已在 callback 用状态机分流，财务对账时注意                              |
| D5  | 自提点距离排序为内存计算（最多 200 条）                                              | 单城市规模可承受                            | 城市量级 > 10 万自提点后改 MySQL 5.7+ SPATIAL 索引或 Redis GEO          |
| D6  | scan_log 写入未走批量队列                                                            | 高峰时单条插入                              | 后续接 Mongo / Kafka                                                    |

---

## 五、立即可用的 API 索引

```
# 客户端
POST   /api/v1/c/grocery/orders/preview        # 试算(含称重金额预算)
POST   /api/v1/c/grocery/orders                # 提交订单(锁库存+占时段)
GET    /api/v1/c/grocery/orders                # 我的订单列表
GET    /api/v1/c/grocery/orders/:id            # 详情(含 pickupCode / qrPayload / 称重结果)
POST   /api/v1/c/grocery/orders/:id/cancel     # 取消(仅 WAIT_PAY)
GET    /api/v1/c/grocery/products              # 生鲜商品列表
GET    /api/v1/c/grocery/products/:id          # 商品详情
GET    /api/v1/c/pickup-points                 # 自提点列表(按距离)
GET    /api/v1/c/pickup-points/:id             # 自提点详情
GET    /api/v1/c/pickup-points/:id/slots       # 某日时段(remain>0)
GET    /api/v1/c/trace/info?code=&sig=         # 扫一扫溯源(匿名可访问)

# 商家端
GET/POST/PUT/PATCH /api/v1/m/grocery/products  # 商品管理(fixed/weighed)
GET/POST/PATCH /api/v1/m/pickup-points         # 自提点 CRUD
POST   /api/v1/m/pickup-points/:id/slots/batch # 批量配置时段(按周复制)
GET    /api/v1/m/pickup-points/:id/slots       # 查时段(日期范围)
POST   /api/v1/m/pickup/verify                 # 扫码/手输核销
GET    /api/v1/m/pickup/verify-logs            # 核销流水
POST   /api/v1/m/pickup/weigh                  # 录入称重行项
POST   /api/v1/m/pickup/weigh/confirm          # 确认结算(±10% 容差)
POST   /api/v1/m/pickup/finalize               # 差价完成后标记 PICKED_UP

# 平台后台
GET/POST/PUT/DELETE /api/v1/admin/trace/batches  # 批次
POST   /api/v1/admin/trace/batches/:id/qrcodes/generate
GET    /api/v1/admin/trace/batches/:id/qrcodes/generate/:taskId
GET    /api/v1/admin/trace/batches/:id/qrcodes/export.csv
GET    /api/v1/admin/trace/qrcodes/lookup?code=
GET    /api/v1/admin/trace/qrcodes/:qrId
POST/PUT/DELETE /api/v1/admin/trace/records
GET    /api/v1/admin/trace/batches/:id/stats

# 支付(扩展)
POST   /api/v1/payment/prepay                  # bizType=GROCERY 支持主单 + 差价补付(状态机自动识别)
# 回调路径不变,内部分流主单/差价
```
