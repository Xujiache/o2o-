# 阶段 2 — 商家端 APP 入驻店铺与商品管理 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

> 本文以 ALIGNMENT\_阶段2.md 中所有决策(D-1/D-2/D-3 + 11 项自动决策)为基础。如用户调整任一决策,刷本文同步。

## 1. 验收标准(AC)

### 后端

- **AC-01**:11 张业务表 entity + migration + 2 权限点 seed 全部就位。`pnpm --filter @o2o/server typeorm:migration:show` 显示 `Stage2Init1714867400000` 已 applied;`SHOW TABLES` 出现 11 张新表。
- **AC-02**:商家端 7 模块上线。`apps/server/src/modules/{merchant-auth,merchant-onboarding,store,product,stock,merchant-promotion,admin-merchant}/` 7 个目录;每个有 `*.module.ts`,内部 service 根据需要带 controller。
- **AC-03**:7 接口契约 100% 一致(契约清单 7 条 + 业务必需的 8 条扩展 = 15 条)。前后端字段名一致(price 单位分;commissionRate 0~1 浮点)。
- **AC-04**:`MerchantJwtGuard` 端隔离生效。Customer/Admin/Rider Token 调 `/api/v1/m/**` → FORBIDDEN(由 stage 1 cross-scope 模式扩展验证)。
- **AC-05**:商家入驻自动注册流程。`MerchantApprovedSubscriber` 在事务中创建 `merchant_account` + `store`(business_status='offline')+ `product_category`(默认分类"未分类")3 行,任一失败回滚,事件总线走 retry job。
- **AC-06**:6 领域事件全部 `domain.{merchant,store,product,stock}.*` 前缀(对齐 stage 0/1 命名)。`Object.values(EventName)` 共 16 个(stage 0 五 + stage 1 五 + stage 2 六)。
- **AC-07**:5 定时任务可手动触发。`POST /admin/scheduler/trigger/<job>` 5 个新 job 名 + stage 0/1 已有 8 个 = 13 个全部可触发。
- **AC-08**:售罄自动下架。stock.adjust 把 product.stock 改成 0 时,同步置 product.sale_status='sold_out',`SoldOutAutoOffShelfJob` 兜底扫描。
- **AC-09**:限时折扣价格回滚。`PromoStartJob` / `PromoEndJob` 配合 product.original_price 字段实现起止价格切换;active promo 期间手改商品价格 → STATUS_INVALID。
- **AC-10**:平台审核完整流程。`POST /admin/merchants/:applicationId/audit` 写 audit_status + 通过时发布 `domain.merchant.approved` 事件 + 自动建 store(订阅器);驳回时填 reject_reason。
- **AC-11**:商家端 mobile/idCard/legalName/licenseNo 在 admin 详情接口中走 @Mask 脱敏(license 用 idcard 风格,前 4 后 4)。

### 前端 - 商家 APP

- **AC-12**:商家 APP 8 页(11 路由)交付。pages.json 注册 11 路由;`pnpm --filter @o2o/merchant-app build:app` 构建通过。
- **AC-13**:商家 APP `auth store` 模式同 customer-app(refresh / logout / 倒计时持久化);共用组件 `MobileInput` / `SmsCodeInput` 复用 customer-app 模式或独立实现(独立避免跨 app 依赖)。
- **AC-14**:商家 APP build 脚本只留 `build:app`(per D-1 决策);H5/小程序仅 dev 用,README 说明。

### 前端 - 平台 Web

- **AC-15**:平台 Web 商家审核 4 页 + 1 弹窗交付。3 路由(`/admin/merchants/audit` / `:id` / `stores`)注册;弹窗 `AuditDialog` + `LicensePreview`。AUDITOR 默认能查不能审,SUPER_ADMIN 可审核。
- **AC-16**:`v-permission` 控审核按钮显隐;无 `admin:merchants:manage` 权限完全不渲染按钮。

### 测试 / 验收

- **AC-17**:后端 jest 净增 ≥ 80(预估,具体看 TASK)。`pnpm --filter @o2o/server test` 全绿;含端隔离测试(Merchant-Token 调 admin → FORBIDDEN)。
- **AC-18**:前端 vitest 净增 ≥ 30。merchant-app 6+ spec + admin-web 3+ spec;全绿。
- **AC-19**:全 monorepo 总闸 `pnpm -r build / test / lint / format:check` 四绿;`git status` 干净。
- **AC-20**:`项目阶段规划/02-.../手动审查与测试.md` 8 节填证据,P0/P1=0;`docs/阶段2-商家入驻店铺商品/{ACCEPTANCE,FINAL,TODO}_阶段2.md` 三件套就位。

## 2. 技术约束(沿用 stage 0/1)

| 约束          | 实现方式                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| 时间戳列类型  | 全部 `BIGINT` 毫秒(沿用 stage 0/1)                                                                                   |
| 主键命名      | `<table>_id`(`merchant_id` / `application_id` / `store_id` / `product_id` ...),与 stage 1 customer_user.user_id 一致 |
| 事件命名      | `domain.<biz>.<verb>` 全小写连字符(`domain.merchant.submitted` / `domain.product.on-sale`)                           |
| 金额单位      | 数据库 `BIGINT` 分;DTO 同名 `price`(注释标"分");前端 `formatAmountFen()` 展示                                        |
| 配送范围      | `JSON` 类型 GeoJSON Polygon(per D-3)                                                                                 |
| 第三方适配器  | 扩展 `realname.adapter.ts`(per D-2);`provider='ali-realname'`                                                        |
| 文件 bizType  | 加 3 个(per ALIGN 4.11);更新 `FileBizScopeMap`                                                                       |
| 商家 APP 打包 | `build:app` 唯一 production 命令(per D-1)                                                                            |
| jti 黑名单    | 复用 stage 1 ScopeJwtGuard 的 Optional Redis 检查;商家 logout 时同款写 `jti:revoked:*`                               |
| 自动建关联    | 全部走 `MerchantApprovedSubscriber` + dataSource.transaction(per AC-05)                                              |

## 3. 集成方案

### 3.1 与 stage 0 集成

| 集成点                                             | stage 0 提供     | 阶段 2 使用                                                                 |
| -------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| MerchantJwtGuard                                   | 已实现           | T03 merchant-auth controller 全部 @UseGuards                                |
| @RequirePermission + PermissionGuard               | 已实现           | T03~T09 全部 controller 挂 `merchant:store:own` 或 `admin:merchants:manage` |
| Idempotency / Audit / Mask 装饰器                  | 已实现           | 全模块                                                                      |
| ResponseInterceptor + ApiResponse                  | 已实现           | controller 透明                                                             |
| IntegrationGatewayService + RealnameAdapter        | 已实现           | T02 加方法 + T04 onboarding 调用                                            |
| BaseJob + DistributedLockService                   | 已实现           | T10 5 job 继承                                                              |
| DomainEventBus                                     | 已实现           | T11 6 EventName + 4 订阅器                                                  |
| FileObject + /pub/files/upload                     | 已实现           | T01 add bizType + T04 上传商家资质                                          |
| 数据源 + 迁移 + 种子                               | 已实现           | T01 加 1 migration + 扩 seed                                                |
| ScopeTokenHeader / PathPrefix / Header / ErrorCode | contracts 已就位 | 所有 controller / DTO                                                       |

### 3.2 与 stage 1 集成

| 集成点                                         | stage 1 提供                             | 阶段 2 借鉴                              |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| customer-auth.service.autoRegister             | 3 表事务                                 | T11 MerchantApprovedSubscriber 同款模板  |
| @Mask 在 DTO 的 mobileMasked 模式              | address.dto + admin-user.dto             | T09 admin-merchant 详情 DTO              |
| customer-app/stores/auth.ts 模式               | Pinia + 持久化 + refresh                 | T12 merchant-app/stores/auth.ts 复刻     |
| customer-app/utils/request.ts 401 自动 refresh | setRefreshHandler 解决循环依赖           | T12 merchant-app/utils/request.ts 复刻   |
| admin-web v-permission + dictStore             | 已就位                                   | T17 admin-web 商家审核页直接用           |
| admin-web/api 模式                             | api/admin-customers.ts                   | T17 api/admin-merchants.ts 同款结构      |
| customer-app component 模式                    | MobileInput / SmsCodeInput / AddressCard | T12 merchant-app 独立创建(不跨 app 依赖) |

### 3.3 与 packages/contracts 集成

`FileBizType` enum 加 3 项 + `ThirdPartyProvider` **不增**(realname 复用)。`AuditStatus` / `BusinessStatus` / `SaleStatus` / `PromoType` / `PromoStatus` 等枚举可选添加(便于跨端共享),但 stage 1 模式是各模块本地定义 type 联合,不强加全局枚举,**沿用本地定义优先**。

## 4. 任务边界限制

### 严格不做

- 商家订单接收 / 履约 / 售后(stage 7)
- 商家财务 / 提现 / 结算(stage 7)
- 商家 Web 后台 / 商家小程序(全周期不做)
- 用户端店铺/商品 UI 页面(stage 5)
- 真第三方 SDK 接入(stage 11)
- 资质 OCR 自动识别(stage 11)
- 商家短信通知 / APP 推送实际发送(只 mock providerRequestId)
- 商家分账 / 商家账单 / 商家发票(stage 7)
- 配送范围内的"点是否在区内"算法实现(stage 5 算配送费时)

### 阶段 2 必做但隐含的扩展接口(契约清单未列,DESIGN 中显式定义)

为支撑前端页面正常运转,DESIGN 里要补齐:

- `POST /api/v1/m/auth/sms-code` + `POST /api/v1/m/auth/login` + `POST /api/v1/m/auth/refresh` + `POST /api/v1/m/auth/logout`(merchant-auth 4 接口,与 customer-auth 同款但前缀 `/m/auth`)
- `GET /api/v1/m/store`(查自己店铺)
- `GET/POST/PATCH/DELETE /api/v1/m/product-categories`(分类 CRUD)
- `GET /api/v1/m/products`(列表 + 分页 + 筛选)
- `PATCH /api/v1/m/products/:id`(编辑)
- `PATCH /api/v1/m/products/batch-sale-status`(批量上下架)
- `GET /api/v1/m/products/stock-alerts`(库存预警列表)
- `PATCH /api/v1/m/products/:id/stock-threshold`(改阈值)
- `POST /api/v1/m/promotions` + `GET /api/v1/m/promotions` + `PATCH /api/v1/m/promotions/:id/status`(限时/满减增查改)
- `GET /api/v1/admin/merchants/applications`(列表)+ `GET /admin/merchants/applications/:id`(详情)
- `GET /api/v1/admin/merchants/stores`(店铺列表)+ `PATCH /api/v1/admin/merchants/stores/:id/business-status`(强制下线)
- `GET /api/v1/pub/stores`(用户端只读,公开)+ `GET /api/v1/pub/stores/:id` + `GET /api/v1/pub/stores/:id/products`(用户端骨架)

总接口数:**契约 7 + 扩展 18 ≈ 25 个**(其中商家端 16,平台端 4,用户端公开 3,商家 auth 4 — 总 27,部分重叠 25 unique)。

## 5. 不确定性已解决清单

- ✅ stage 0/1 基建复用范围(见 §3.1 / §3.2)
- ✅ D-1/D-2/D-3 三个核心决策(见 ALIGNMENT §4.1~4.3)
- ✅ 11 项自动决策(见 ALIGNMENT §4.4~4.14)
- ✅ AC 20 条(本文 §1)
- ✅ 隐含扩展接口(本文 §4)
- ⏳ 待 DESIGN 阶段:11 表 schema 详细字段、15 接口 DTO 字段、6 事件 payload、5 任务 cron 与 lock key、3 状态机详细转换矩阵、3 sequence 数据流图

## 6. 阶段 2 完成定义(Done = 全部勾选)

- [ ] AC-01 ~ AC-20 全部 verified
- [ ] `pnpm -r build` ✓
- [ ] `pnpm -r test` ✓
- [ ] `git status` 干净 + 1 个最终汇总 commit
- [ ] `项目阶段规划/02-.../手动审查与测试.md` P0/P1 = 0
- [ ] `docs/阶段2-商家入驻店铺商品/{ACCEPTANCE,FINAL,TODO}_阶段2.md` 三件套就位
- [ ] 用户人工抽测(MySQL 跑通 migration + 12 接口 curl + 平台 Web 浏览器抽测)→ 留 TODO
