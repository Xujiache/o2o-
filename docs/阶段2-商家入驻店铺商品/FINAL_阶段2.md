# 阶段 2 — 商家端 APP 入驻店铺与商品管理 · 项目总结(FINAL)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 1. 总览

| 维度             | 数据                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| 原子任务         | 27/27                                                                                |
| 后端模块         | 7 业务 + 1 公开只读 + 1 adapter 扩展                                                 |
| 数据表           | 11                                                                                   |
| HTTP 接口        | 25(含商家 auth 4)                                                                    |
| 领域事件         | 6(全部 `domain.<biz>.<verb>` 前缀)                                                   |
| 定时任务         | 5                                                                                    |
| 权限点           | 5 + 1 菜单                                                                           |
| 商家 APP 页面    | 11(login×2 + onboarding×2 + workbench + store×3 + products×3 + stock + promotions×2) |
| 平台 Web 页面    | 3 + 1 弹窗                                                                           |
| 公开接口         | 3(只读骨架,无 UI)                                                                    |
| 后端 jest 测试   | 194(stage 2 净增 86)                                                                 |
| 前端 vitest 测试 | 21(merchant)+ 15(admin)+ 25(customer)= 61(stage 2 净增 30)                           |

## 2. 能力矩阵

| 能力                      | 端              | 入口                                           | 后端模块                                                | 状态                  |
| ------------------------- | --------------- | ---------------------------------------------- | ------------------------------------------------------- | --------------------- |
| 商家手机号登录            | 商家 APP        | `/pages/login/{index,verify}`                  | merchant-auth + sms(复用)                               | ✓                     |
| Token 刷新                | 商家 APP        | 401 自动                                       | merchant-auth refresh + Redis                           | ✓                     |
| 登出                      | 商家 APP        | (workbench 入口 / 后续)                        | merchant-auth + jti 黑名单                              | ✓                     |
| 入驻申请                  | 商家 APP        | `/pages/onboarding/apply`                      | merchant-onboarding + 5 license + verifyEnterprise mock | ✓                     |
| 入驻状态查询              | 商家 APP        | `/pages/onboarding/progress`                   | merchant-onboarding                                     | ✓                     |
| 平台审核入驻              | 平台 Web        | `/admin/merchants/audit` + 详情                | admin-merchant + AuditDialog                            | ✓                     |
| 自动建店 + 默认分类       | 后端            | MerchantApprovedSubscriber                     | events + store + product                                | ✓                     |
| 店铺信息编辑              | 商家 APP        | `/pages/store/settings`                        | store + GeoJSON 校验                                    | ✓                     |
| 营业开关                  | 商家 APP        | `/pages/store/business-status`                 | store + StoreStatusChanged 事件                         | ✓                     |
| 配送范围编辑              | 商家 APP        | `/pages/store/delivery-area`                   | store(JSON 文本占位)                                    | ✓                     |
| 商品分类 CRUD             | 商家 APP        | `/pages/products/categories`                   | product                                                 | ✓                     |
| 商品列表 + 单/批量上下架  | 商家 APP        | `/pages/products/list`                         | product                                                 | ✓                     |
| 商品创建(SKU 聚合)        | 商家 APP        | `/pages/products/edit`                         | product + price/stock 聚合                              | ✓                     |
| 库存调整 + 流水           | 后端            | stock.adjust(供 stage 5 订单调)                | stock                                                   | ✓                     |
| 售罄自动下架              | 后端            | stock.adjust + SoldOutAutoOffShelfJob          | stock + scheduler                                       | ✓                     |
| 库存预警(列表 + 阈值)     | 商家 APP        | `/pages/stock/alerts`                          | stock + StockAlertScanJob                               | ✓                     |
| 限时折扣 + 价格回滚       | 商家 APP + 后端 | `/pages/promotions/edit` + PromoStart/End jobs | merchant-promotion + scheduler                          | ✓                     |
| 单品满减(配置存储)        | 商家 APP        | `/pages/promotions/edit`                       | merchant-promotion(下单算逻辑留 stage 5)                | ✓                     |
| 平台店铺管控(强制 paused) | 平台 Web        | `/admin/merchants/stores`                      | admin-merchant + StoreService.forceSetStatus            | ✓                     |
| 用户端公开店铺接口        | 后端            | `GET /pub/stores`(只读骨架)                    | public-store-readonly                                   | ✓                     |
| 端 Token 隔离             | 全端            | ScopeJwtGuard                                  | auth                                                    | ✓(6 cross-scope 测试) |
| 资质核验 mock             | 后端            | onboarding 异步调                              | realname.adapter.verifyEnterprise                       | ✓                     |
| 资质到期提醒              | 后端            | LicenseExpiryReminderJob 每日 8:00             | scheduler                                               | ✓                     |

## 3. 关键决策

### D-1 商家端只 build:app(用户在 plan 时锁定)

`apps/merchant-app/package.json` build 脚本固定 `uni build -p app`;dev 保留 dev:h5 给本地预览,但生产不出 H5/小程序。manifest.json 不动小程序配置防误打。README 标明"H5 仅本地开发"。

### D-2 复用 stage 1 realname.adapter,新增 verifyEnterprise 方法(用户锁定)

`provider='ali-realname'` 不新增枚举;mock:`licenseNo.length==18` 且 `legalName` 首字汉字 → success。stage 11 真接入时同一阿里云 SDK 包子接口区分。

### D-3 配送范围用 GeoJSON Polygon JSON(用户锁定)

`store_delivery_area.geometry` 字段存 `{type:'Polygon', coordinates:[[[lng,lat],...]]}`。后端 ray-cast 算点在区内留 stage 5。前端本阶段 JSON 文本编辑;真拖拽留 stage 5+。

### D-4 商家:店铺 = 1:1 强约束

`store.merchant_id` UNIQUE。stage 11+ 可扩展为 1:N(连锁店),无需改 schema。

### D-5 价格字段统一 `price`(单位:分)

DTO 字段名一律 `price`,不用 `priceFen` 后缀;前端 `formatAmountFen()` 展示。一致与 stage 1。

### D-6 SKU 聚合规则

`hasSku=1` 时 product.price=MIN(sku.price),product.stock=SUM(sku.stock);hasSku=0 时 product 表自身字段为权威。`product.has_sku` 字段加 0/1。

### D-7 audit 幂等

POST /admin/merchants/:id/audit 已是目标态(approved/rejected)再调 → 返当前结果不重发事件。避免重复建店。

### D-8 active promo 期间禁改商品 price

product.update 校验 productId 是否在 status='active' 且 endTime>NOW 的 promo 中,在则 STATUS_INVALID。避免乱价。

### D-9 限时折扣价格回滚机制

product 加 `original_price BIGINT NULL`。PromoStartJob 缓存原价 + 改折扣价;PromoEndJob 还原。商家手改禁止(D-8)。

### D-10 平台 Web 审核按钮 v-if 而非 disabled

`v-if="userStore.has('admin:merchants:manage')"` 完全不渲染。AUDITOR 角色看不到审核按钮(无权感知能力)。

## 4. 文件总览(主要新增)

```
apps/server/src/
├ database/entities/         + 11 stage 2 entities
├ database/migrations/       + 1714867400000-Stage2Init.ts
├ database/seeds/            修改 role-permission.seed.ts(+5 权限)
├ events/                    events.ts +6 EventName + payloads
├ events/subscribers/        + 4 stage 2 subscribers
├ modules/merchant-auth/     5 文件
├ modules/merchant-onboarding/  5 文件
├ modules/store/             5 文件
├ modules/product/           5 文件
├ modules/stock/             4 文件
├ modules/merchant-promotion/   5 文件
├ modules/admin-merchant/    5 文件
├ modules/public-store-readonly/  5 文件
├ modules/integration-gateway/adapters/realname.adapter.ts  扩 verifyEnterprise
└ scheduler/jobs/            + 5 stage 2 jobs;scheduler.module 修复 stage 1 latent

apps/merchant-app/src/
├ api/index.ts               +13 stage 2 endpoints + DTO
├ stores/auth.ts             新建 Pinia store
├ utils/request.ts           改造 401 自动 refresh
├ main.ts                    注入 refreshHandler
├ components/common/         + MobileInput / SmsCodeInput / UploadField
├ pages/login/               + index / verify
├ pages/onboarding/          + apply / progress
├ pages/workbench/index.vue  新建
├ pages/store/               + settings / business-status / delivery-area
├ pages/products/            + categories / list / edit
├ pages/stock/alerts.vue     新建
├ pages/promotions/          + list / edit
└ pages.json                 注册 11 路由
package.json                 + pinia 依赖

apps/admin-web/src/
├ api/admin-merchants.ts     新建
├ views/merchants/           audit / detail / stores + components/{AuditDialog,LicensePreview}
└ router/index.ts            注册 6 路由(stage 1 customers 3 + stage 2 merchants 3)
                              + 修复 stage 1 router latent

packages/contracts/
└ src/enums/index.ts         FileBizType 加 3 项 + FileBizScopeMap 同步
```

## 5. 风险 & 已知问题

| ID                  | 严重度 | 描述                                                                               | 处理                              |
| ------------------- | ------ | ---------------------------------------------------------------------------------- | --------------------------------- |
| 阶段 2 P3-01        | P3     | 配送范围编辑仅 JSON 文本                                                           | stage 5+ 接高德拖拽               |
| 阶段 2 P3-02        | P3     | 资质 OCR 未自动                                                                    | stage 11 接 OCR                   |
| 阶段 2 P3-03        | P3     | 商家多端登录无 device 表                                                           | stage 11 加 merchant_login_device |
| 阶段 2 P3-04        | P3     | 单品满减下单时算优惠未实现                                                         | stage 5 订单模块                  |
| stage-1 latent 已修 | —      | scheduler.module.ts 未注册 stage 1 4 jobs;admin-web router 未注册 customers 3 路由 | 本阶段一并补齐                    |

## 6. 后续阶段(stage 3 入口)

**stage 3** = 骑手端 APP 入驻接单与配送基础。依赖本阶段:

- `merchant-auth` / `merchant-onboarding` 模式可直接复刻成 `rider-auth` / `rider-onboarding`
- 资质核验 adapter 已有 `verifyEnterprise`,骑手健康证可走类似扩展
- `domain.merchant.*` 事件命名约定 → `domain.rider.*` 复用
- ScopeJwtGuard `RiderJwtGuard` 已就位

stage 3 启动前 checklist 见 `TODO_阶段2.md`。

## 7. 提交记录

```
0fea1f7 docs(stage-2): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)
d7e5622 feat(stage-2): T01-T11 后端 11 表 + 7 模块 + 5 任务 + 6 事件
<下一>  feat(stage-2): T12-T27 前端 + 公开接口 + 测试 + 验收(完整阶段 2 交付)
```

## 8. 总结

阶段 2 严格按 6A 流程交付(用户授意"走完整 6A"):

- **Align**:11 项业务自动决策固定到 ALIGNMENT;3 个核心决策由用户在 plan mode 选定。
- **Architect**:DESIGN 含 11 表 schema + 25 接口契约 + 3 sequence + 状态机 + 6 事件 + 5 任务设计。
- **Atomize**:TASK 27 任务拆 7 组,依赖图清晰。
- **Approve**:用户两次"开工"信号(PhaseA 后 + PhaseB 启动)。
- **Automate**:6 波串行,每完一波跑测试 + 构建,关键节点提 commit。
- **Assess**:8 节手动审查 + 20 AC + 27 任务自审记。

阶段 2 上线后,**商家可用 APP 完成入驻 → 等审核 → 设店铺 → 上架商品 → 设促销 → 看库存预警**;**平台 Web 可审核商家 / 强制店铺管控**;**用户端公开接口已就绪,等 stage 5 出 UI**。stage 3 起骑手端可在此账号 + 商品体系上叠加配送任务。
