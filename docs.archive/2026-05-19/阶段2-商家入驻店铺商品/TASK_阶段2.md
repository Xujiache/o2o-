# 阶段 2 — 商家端 APP 入驻店铺与商品管理 · 原子任务清单(TASK)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 任务总览

共 **27 个原子任务**,分为 7 组:

| 组  | 范围                      | 任务      |
| --- | ------------------------- | --------- |
| A   | 数据层                    | T01       |
| B   | 第三方适配 + 文件 bizType | T02       |
| C   | 后端业务模块              | T03 ~ T09 |
| D   | 定时任务 + 领域事件       | T10、T11  |
| E   | 商家 APP 页面             | T12 ~ T17 |
| F   | 平台 Web 页面             | T18       |
| G   | 用户端公开骨架接口        | T19       |
| H   | 测试 + 验收收尾           | T20 ~ T27 |

## 任务依赖图

```mermaid
flowchart TB
    T01[T01 11表 entity+migration+seed] --> T02[T02 realname+verifyEnterprise + bizType扩]
    T01 --> T03[T03 merchant-auth]
    T02 --> T03
    T01 --> T04[T04 merchant-onboarding]
    T03 --> T04
    T02 --> T04
    T01 --> T05[T05 store]
    T04 --> T05
    T01 --> T06[T06 product]
    T05 --> T06
    T01 --> T07[T07 stock]
    T06 --> T07
    T01 --> T08[T08 merchant-promotion]
    T06 --> T08
    T01 --> T09[T09 admin-merchant]
    T04 --> T09
    T05 --> T09
    T05 --> T10[T10 5 定时任务]
    T06 --> T10
    T07 --> T10
    T08 --> T10
    T04 --> T11[T11 6 事件 + 4 订阅器]
    T05 --> T11
    T06 --> T11
    T07 --> T11
    T09 --> T11
    T03 --> T12[T12 商家APP login + auth store]
    T04 --> T13[T13 商家APP onboarding 2 页]
    T12 --> T13
    T05 --> T14[T14 商家APP 店铺设置/营业/配送 3 页]
    T12 --> T14
    T06 --> T15[T15 商家APP 商品分类/列表/编辑 3 页]
    T12 --> T15
    T07 --> T16[T16 商家APP 库存预警 1 页]
    T12 --> T16
    T08 --> T17[T17 商家APP 促销活动 2 页]
    T12 --> T17
    T09 --> T18[T18 平台Web 商家审核 3页+1弹窗]
    T05 & T06 --> T19[T19 用户端 /pub/stores 只读 3 接口]
    T03~T11 --> T20[T20 后端 jest ≥80]
    T12~T18 --> T21[T21 前端 vitest ≥30]
    T19 --> T22[T22 用户端 /pub/stores 冒烟 spec]
    T20 & T21 & T22 --> T23[T23 手动审查文档]
    T23 --> T24[T24 ACCEPTANCE 阶段 2]
    T24 --> T25[T25 FINAL 阶段 2]
    T25 --> T26[T26 TODO 阶段 2]
    T26 --> T27[T27 总闸 + 最终 commit]
```

---

## 第 A 组:数据层(T01)

### T01 11 张业务表 entity + migration + seed

- **输入**:DESIGN § 3。
- **产出**:
  - `apps/server/src/database/entities/` 11 个新 entity:`merchant-account / merchant-application / merchant-license / store / store-business-hour / store-delivery-area / product-category / product / product-sku / stock-record / merchant-promotion`
  - `apps/server/src/database/entities/index.ts` 加 11 个 export
  - `apps/server/src/database/migrations/1714867400000-Stage2Init.ts`(11 表 + 索引 + 5 个新 sys_permission seed:`merchant:public` / `merchant:store:own` / `admin:menu:merchants` / `admin:merchants:view` / `admin:merchants:manage`)
  - `role-permission.seed.ts` 扩展角色绑定(MERCHANT 绑 merchant:store:own;SUPER_ADMIN 绑全部 admin:merchants:\*;AUDITOR 绑 admin:merchants:view + admin:menu:merchants)
- **约束**:
  - 时间戳 BIGINT 毫秒(沿用 stage 0/1)
  - 主键命名 `<table>_id`
  - `store.merchant_id` UNIQUE 约束(per ALIGN 4.8)
  - `merchant_promotion.product_ids` `JSON`;`store_delivery_area.geometry` `JSON`(GeoJSON Polygon)
  - 金额字段 `BIGINT`(单位:分)
  - DECIMAL(5,4) for commission_rate
- **验收**:
  - `pnpm --filter @o2o/server typeorm:migration:show` 显示 `Stage2Init1714867400000`
  - 跑 `migrate:run` 后 `SHOW TABLES` 出现 11 张
  - `SELECT code FROM sys_permission WHERE code LIKE 'merchant:%' OR code LIKE 'admin:merchants:%'` 至少 5 行
- **依赖**:无(stage 1 数据源已就绪)

## 第 B 组:第三方适配 + 文件 bizType(T02)

### T02 realname.adapter 加 verifyEnterprise + FileBizType 扩展

- **输入**:DESIGN § 4.1 提交入驻接口、ALIGNMENT § 4.2、§ 4.11。
- **产出**:
  - `apps/server/src/modules/integration-gateway/adapters/realname.adapter.ts` 加 `verifyEnterprise()` 接口方法 + Mock + Real-stub
  - `packages/contracts/src/enums/index.ts` `FileBizType` 加 `MERCHANT_FOOD_PERMIT` / `STORE_PHOTO` / `PRODUCT_IMAGE`(`MERCHANT_LICENSE` stage 0 已有)
  - `FileBizScopeMap` 同步加 3 行(全部 [MERCHANT])
  - `realname.adapter.spec.ts` 加 verifyEnterprise 3 测试(成功 / 法人非汉字 / 真凭证 not configured)
- **约束**:
  - `provider='ali-realname'`(不增 ThirdPartyProvider 枚举)
  - mock 行为:licenseNo.length==18 且 legalName 首字汉字 → success;否则 reason='企业资质不一致'
- **验收**:
  - jest 单测 3 个 verifyEnterprise 行为
  - `pnpm --filter @o2o/server build` 全绿
- **依赖**:T01

## 第 C 组:后端业务模块(T03 ~ T09)

### T03 merchant-auth 模块

- **输入**:DESIGN § 4.1 auth 4 接口、§ 5.1 数据流。
- **产出**:
  - `apps/server/src/modules/merchant-auth/{merchant-auth.module,*.service,*.controller,*.dto,*.constants}.ts`
  - 4 接口:`POST /m/auth/sms-code`(@Public,复用 sms.service)/ `POST /m/auth/login`(@Public,Idempotency + Audit)/ `POST /m/auth/refresh`(@Public)/ `POST /m/auth/logout`(MerchantJwtGuard + Audit)
  - login service:无自动注册,merchant_account.account_status='pending' 的也允许 login(便于查 status);disabled → STATUS_INVALID
  - 复用 stage 1 jti 黑名单写入逻辑
- **约束**:
  - 4 接口全 @Idempotent;login/logout 挂 @Audit
  - 不挂 customer-auth 的"自动注册"逻辑
- **验收**:
  - jest:6+ 用例(首次 login pending 账号 / 已 active / disabled / refresh 轮换 / logout 黑名单 / 无 merchant 账号 → DATA_NOT_FOUND)
  - 接口 e2e:Customer-Token 调 /m/auth/logout → FORBIDDEN
- **依赖**:T01,T02

### T04 merchant-onboarding 模块

- **输入**:DESIGN § 4.1 onboarding 2 接口、§ 5.1。
- **产出**:
  - `apps/server/src/modules/merchant-onboarding/{*.module,*.service,*.controller,*.dto}.ts`
  - 2 接口:`POST /m/onboarding/applications` / `GET /m/onboarding/status`
  - service.submitApplication:校验 sms code → consumeCode → TX{首次 INSERT merchant_account(pending) + INSERT application + N×INSERT license + UPDATE merchant_account.latest_application_id} → 异步调 verifyEnterprise + 写 integration_request_log → 发 domain.merchant.submitted
  - service.getStatus:查最新 application + canResubmit 规则
  - DTO 字段全部 class-validator
- **约束**:
  - submit 挂 @Idempotent + @Audit
  - 重提申请校验 latest_application 状态 = rejected
  - file_id 必须存在于 file_object 表且 owner_type=merchant
- **验收**:
  - jest:6 用例(首次提交 / 重复提交 24h 内 → DUPLICATE / rejected 后重提 / sms code 错 / 文件不存在 / status 查询)
- **依赖**:T01,T02,T03(用 sms,login 拿 token)

### T05 store 模块

- **输入**:DESIGN § 4.1 store 接口、§ 3.4~3.6。
- **产出**:
  - `apps/server/src/modules/store/{*.module,*.service,*.controller,*.dto}.ts`
  - 3 接口:`GET /m/store`(查自己店)/ `PATCH /m/store/settings` / `PATCH /m/store/business-status`
  - service.update:同步更新 store + N×store_business_hour + N×store_delivery_area(均事务)
  - GeoJSON 校验:DTO 用 `@IsGeoJsonPolygon()` 自定义装饰器(校验 type=Polygon + coordinates 至少 4 个点闭合)
  - business-status 切换:商家自己只能 online↔offline,不能写 paused
- **约束**:
  - active promo 期间不允许改 price 字段(本任务无 price,但留 hook 给 T08)
  - 写接口 @Idempotent + @Audit
  - 发 domain.store.status-changed
- **验收**:
  - jest:5+ 用例(查自己店 / settings 部分更新 / GeoJSON 不闭合 → INVALID_PARAM / business-status online↔offline / 商家试图写 paused → INVALID_PARAM)
- **依赖**:T01,T04

### T06 product 模块

- **输入**:DESIGN § 4.1 product 接口、§ 3.7~3.9、ALIGNMENT § 4.4。
- **产出**:
  - `apps/server/src/modules/product/{*.module,*.service,*.controller,*.dto}.ts`
  - 接口:product-categories CRUD 4 个 / `POST /m/products` / `GET /m/products` / `GET/PATCH /m/products/:id` / `PATCH /m/products/:id/sale-status` / `PATCH /m/products/batch-sale-status`
  - service.create:hasSku=1 时 TX{INSERT product + N×INSERT product_sku + 聚合 product.price=MIN, stock=SUM} → 调 stock.adjust 写流水 → 发 domain.product.created [+ on-sale]
  - service.update:校验 product 不在 active promo,否则 STATUS_INVALID
  - sale-status 切换:发 domain.product.on-sale
- **约束**:
  - 所有 controller 检查 store 归属(store.merchant_id == req.user.principalId)
  - 写接口 @Idempotent + @Audit
- **验收**:
  - jest:8+ 用例(分类 CRUD / 创建无 SKU / 创建多 SKU 聚合 / 列表筛选 / 上下架 / 批量上下架 / 跨商家访问 → FORBIDDEN / active promo 改价 → STATUS_INVALID)
- **依赖**:T01,T05

### T07 stock 模块

- **输入**:DESIGN § 3.10、ALIGNMENT § 4.6。
- **产出**:
  - `apps/server/src/modules/stock/{*.module,*.service}.ts`(无 controller)+ 2 接口扩在 product:`GET /m/products/stock-alerts` / `PATCH /m/products/:id/stock-threshold`(归在 product 模块,但 service 在 stock)
  - service.adjust(productId, sku_id, delta, reason, operator):TX{UPDATE product/sku stock + INSERT stock_record};stock 到 0 时 sale_status='sold_out';发 domain.stock.low(本次扣减后 < threshold)
  - service.listAlerts(storeId)
  - service.setThreshold(productId, threshold)
- **约束**:
  - 内部 service,T06 product create / batch ops 调用
  - 库存负数禁止(STATUS_INVALID)
- **验收**:
  - jest:6+ 用例(adjust + 流水 / 售罄置 sold_out / 低于阈值发事件 / 阈值修改 / 跨商家 → FORBIDDEN / 负库存 → INVALID)
- **依赖**:T01,T06

### T08 merchant-promotion 模块

- **输入**:DESIGN § 3.11、§ 4.1 promotions 接口、ALIGNMENT § 4.5、§ 4.13。
- **产出**:
  - `apps/server/src/modules/merchant-promotion/{*.module,*.service,*.controller,*.dto}.ts`
  - 3 接口:`POST /m/promotions` / `GET /m/promotions` / `PATCH /m/promotions/:id/status`
  - 创建时校验 productIds 与现有 active/scheduled 不重叠(R-03)
  - rules JSON 校验(@IsTimeLimitedRules / @IsSingleFullOffRules)
- **约束**:
  - status 转换:draft→scheduled→active→ended;active→paused→active(暂停恢复);任意→ended(立即结束)
  - paused / ended 时不影响 product.price(已经回滚由 PromoEndJob)
- **验收**:
  - jest:5+ 用例(限时折扣创建 / 满减创建 / productId 重叠 → INVALID / status 暂停恢复 / 跨店访问 → FORBIDDEN)
- **依赖**:T01,T06

### T09 admin-merchant 模块

- **输入**:DESIGN § 4.2、§ 5.1、§ 7。
- **产出**:
  - `apps/server/src/modules/admin-merchant/{*.module,*.service,*.controller,*.dto}.ts`
  - 4 接口:`GET /admin/merchants/applications` / `GET /admin/merchants/applications/:id` / `POST /admin/merchants/:applicationId/audit` / `GET/PATCH /admin/merchants/stores[/:id/business-status]`
  - 详情接口返回字段全 @Mask(legalPerson、idCardNo、licenseNo、foodPermitNo)
  - audit:幂等(已审核状态再调返当前结果不重发事件);通过时发 domain.merchant.approved
- **约束**:
  - 全部 controller 挂 AdminJwtGuard + RequirePermission('admin:merchants:view' 或 'admin:merchants:manage')
  - audit + business-status 写 @Audit
- **验收**:
  - jest:7+ 用例(列表筛选 / 详情含资质 url / 审核通过 + 事件 / 审核驳回 + reason / 审核幂等 / 强制 paused / Customer-Token 调 → FORBIDDEN)
- **依赖**:T01,T04,T05

## 第 D 组:定时任务 + 领域事件(T10、T11)

### T10 5 个定时任务

- **输入**:DESIGN § 8。
- **产出**:
  - `apps/server/src/scheduler/jobs/{license-expiry-reminder,stock-alert-scan,promo-start,promo-end,sold-out-auto-off-shelf}.job.ts` 5 文件
  - 全部继承 BaseJob,锁与 cron 与 DESIGN § 8 表一致
  - 注册到 scheduler.module.ts + scheduler.controller.ts(扩展 dev-trigger)
- **约束**:
  - PromoStartJob / PromoEndJob 内事务;失败不重复操作(用 status 状态判断)
  - StockAlertScanJob 发事件后置 product 临时标记防短期重复触发(可选,本阶段简化为不防重)
- **验收**:
  - jest:每 job 1 主流程 + 1 锁竞争 = 10 用例
  - 手动:`POST /admin/scheduler/trigger/<job>` 5 个全部能调
- **依赖**:T05,T06,T07,T08

### T11 6 领域事件 + 4 订阅器

- **输入**:DESIGN § 9。
- **产出**:
  - 扩展 `apps/server/src/events/events.ts` EventName + 6 payload 接口
  - `apps/server/src/events/subscribers/{merchant-submitted,merchant-approved,store-status-changed,stock-low}.subscriber.ts` 4 文件(其余 2 事件无订阅器)
  - **MerchantApprovedSubscriber** 是关键:dataSource.transaction{INSERT store(business_status=offline)+ INSERT product_category("未分类")+ UPDATE merchant_account.approved_store_id}
  - 在 T04/T05/T06/T09 service 中嵌 publish 事件
- **约束**:
  - MerchantApprovedSubscriber 失败走 retry job,管理端可手动 dispatch 重试
  - 订阅器抛错被 bus 捕获,不阻塞主流程
- **验收**:
  - jest:每事件 1 发布 + 关键订阅器执行 = 8+ 用例
  - DB:`SELECT * FROM domain_event WHERE name LIKE 'domain.merchant.%' OR LIKE 'domain.store.%' OR LIKE 'domain.product.%' OR LIKE 'domain.stock.%'` 6 类全部 status=done
- **依赖**:T04,T05,T06,T07,T09

## 第 E 组:商家 APP 页面(T12 ~ T17)

### T12 商家 APP 登录 2 页 + auth store + build 配置

- **输入**:DESIGN § 10.1、ALIGNMENT § 4.1(D-1)。
- **产出**:
  - `apps/merchant-app/src/pages/login/{index,verify}.vue`
  - `apps/merchant-app/src/stores/auth.ts`(复刻 customer-app 模式,token namespace `o2o:merchant`)
  - `apps/merchant-app/src/utils/request.ts` 改造 401 自动 refresh(同 customer-app 模式)
  - `apps/merchant-app/src/components/common/{MobileInput,SmsCodeInput}.vue`(独立)
  - `apps/merchant-app/src/api/index.ts` 加商家端接口常量与 DTO
  - `apps/merchant-app/package.json` build script 改 `"build": "uni build -p app"`(per D-1);保留 dev:h5 / dev:app
- **约束**:
  - 错误码走 contracts 错误码映射(stage 0 已有 getErrorMessage)
  - account_status='pending' 的 token 也存,verify 页面跳入驻申请
- **验收**:
  - vitest:auth store 13+ 用例;倒计时 + 401 refresh
  - `pnpm --filter @o2o/merchant-app build` 跑 `uni build -p app` 通过
- **依赖**:T03

### T13 商家 APP 入驻申请 2 页

- **输入**:DESIGN § 10.1。
- **产出**:
  - `apps/merchant-app/src/pages/onboarding/{apply,progress}.vue`
  - `apps/merchant-app/src/components/common/UploadField.vue`(走 stage 0 /pub/files/upload,bizType 参数化)
  - api 常量 `submitApplication` / `getOnboardingStatus`
- **约束**:
  - 多步表单(资质 → 法人 → 店铺基本信息),每步本地校验后才能下一步
  - 已 verified 用户 onLoad → 直接显示状态 + canResubmit 时显示重提按钮
- **验收**:
  - vitest:UploadField 上传 / 多步切换 / 提交 / 状态加载
- **依赖**:T04,T12

### T14 商家 APP 店铺设置/营业开关/配送范围 3 页

- **输入**:DESIGN § 10.1。
- **产出**:
  - `apps/merchant-app/src/pages/store/{settings,business-status,delivery-area}.vue`
  - `apps/merchant-app/src/components/common/{BusinessHoursEditor,DeliveryAreaPicker}.vue`
  - api 常量 `getStore` / `updateStoreSettings` / `setBusinessStatus`
- **约束**:
  - DeliveryAreaPicker 用 stage 0 MapView 占位(本阶段不真实多边形绘制,留 placeholder + JSON 文本编辑)
  - 营业开关切换前后弹确认对话框
- **验收**:
  - vitest:settings 表单提交 / 营业开关切换 / 配送范围 JSON 校验
- **依赖**:T05,T12

### T15 商家 APP 商品分类 + 列表 + 编辑 3 页

- **输入**:DESIGN § 10.1。
- **产出**:
  - `apps/merchant-app/src/pages/products/{categories,list,edit}.vue`
  - `apps/merchant-app/src/components/common/{SkuEditor,ProductCard,CategoryItem}.vue`
  - api 常量 categories CRUD / products CRUD / batch
- **约束**:
  - 列表分页 + 筛选(分类/状态/关键字)
  - 编辑页支持 hasSku=0/1 切换;有 SKU 时禁用 product 表自身的 price/stock 输入
- **验收**:
  - vitest:分类增删 / 商品列表 / 编辑 SKU 切换 / 上下架
- **依赖**:T06,T12

### T16 商家 APP 库存预警 1 页

- **输入**:DESIGN § 10.1。
- **产出**:
  - `apps/merchant-app/src/pages/stock/alerts.vue`
  - `StockAlertCard.vue`
  - api 常量 stock-alerts / stock-threshold
- **验收**:vitest:预警列表 / 调阈值
- **依赖**:T07,T12

### T17 商家 APP 促销活动 2 页

- **输入**:DESIGN § 10.1。
- **产出**:
  - `apps/merchant-app/src/pages/promotions/{list,edit}.vue`
  - `PromoRulesEditor.vue`
  - api 常量 promotions CRUD
- **约束**:
  - 创建时本地校验 productIds 不为空 + 时间合法
- **验收**:vitest:列表 / 创建限时 / 创建满减 / 暂停
- **依赖**:T08,T12

## 第 F 组:平台 Web 页面(T18)

### T18 平台 Web 商家审核 3 页 + 1 弹窗

- **输入**:DESIGN § 4.2、§ 10.2。
- **产出**:
  - `apps/admin-web/src/views/merchants/{audit,detail,stores}.vue`
  - `apps/admin-web/src/views/merchants/components/{AuditDialog,LicensePreview}.vue`
  - `apps/admin-web/src/router/index.ts` 注册 3 路由
  - `apps/admin-web/src/api/admin-merchants.ts`(5 接口)
- **约束**:
  - 列表 keyword + auditStatus + 分页
  - 详情 LicensePreview 用 `<img>`(image)/ `<embed>`(pdf)按文件 contentType 切
  - 审核按钮 v-permission 控显隐
- **验收**:
  - vitest:列表筛选 / 详情加载 / 审核提交
  - 浏览器:SUPER_ADMIN 可审核;AUDITOR 看不到审核按钮
- **依赖**:T09

## 第 G 组:用户端公开骨架接口(T19)

### T19 公开 store / product 只读 3 接口

- **输入**:DESIGN § 4.3。
- **产出**:
  - `apps/server/src/modules/public-store-readonly/{*.module,*.service,*.controller,*.dto}.ts`
  - 3 接口:`GET /api/v1/pub/stores`(分页;过滤 business_status='online' AND merchant_account.account_status='active')/ `GET /api/v1/pub/stores/:id`(详情含营业时间 + 配送范围)/ `GET /api/v1/pub/stores/:id/products`(过滤 sale_status='on_shelf' + 分页 + categoryId 筛选)
  - 全部 @Public,无 token
- **约束**:
  - 不返回 commission_rate / merchant 内部字段
  - 字段名与商家端一致(price 单位分)
- **验收**:
  - jest:3 接口冒烟 + 关闭店铺/下架商品过滤验证
- **依赖**:T05,T06

## 第 H 组:测试 + 验收收尾(T20 ~ T27)

### T20 后端 jest 用例 ≥ 80 净增

- **输入**:T03~T11、T19。
- **产出**:
  - 各模块对应 spec(累计 ≥80 用例)
  - 端隔离扩展:`merchant-auth.cross-scope.spec.ts`(Customer/Admin/Rider Token 调 /m/auth/\* → FORBIDDEN)
  - 状态机非法转换:product on_shelf → draft 抛 STATUS_INVALID;promo active → draft 抛
- **验收**:`pnpm --filter @o2o/server test` 全绿;stage 2 净增 ≥80

### T21 前端 vitest 用例 ≥ 30 净增

- **输入**:T12~T18。
- **产出**:
  - merchant-app:auth store(13)+ onboarding(3)+ store(3)+ product(4)+ stock(2)+ promotion(3)= 28
  - admin-web:audit(2)+ detail(2)+ dialog(2)= 6
- **验收**:`pnpm --filter @o2o/merchant-app test && pnpm --filter @o2o/admin-web test` 全绿;stage 2 净增 ≥30

### T22 用户端 /pub/stores 冒烟 spec

- **输入**:T19。
- **产出**:`apps/customer-app/src/api/index.spec.ts` 加 `/pub/stores` endpoint 路径校验(3 项)
- **验收**:vitest 全绿

### T23 手动审查与问题记录文档

- **输入**:T20~T22 全部产出。
- **产出**:
  - 填 `项目阶段规划/02-阶段2-.../手动审查与测试.md`(8 节带证据,P0/P1 清零;P2/P3 至少 5 行)
  - 维护 `项目阶段规划/02-阶段2-.../问题与风险记录.md`
- **验收**:文档自审 P0/P1 = 0
- **依赖**:T20,T21,T22

### T24 ACCEPTANCE\_阶段2.md

- **输入**:T23。
- **产出**:`docs/阶段2-商家入驻店铺商品/ACCEPTANCE_阶段2.md`(20+ AC + 27 任务自审 + replay 命令)
- **验收**:与 stage 1 同款格式

### T25 FINAL\_阶段2.md

- **输入**:T24。
- **产出**:`docs/阶段2-商家入驻店铺商品/FINAL_阶段2.md`(能力矩阵 + 8+ 关键决策 + 风险登记 + 文件总览 + 后续阶段入口)

### T26 TODO\_阶段2.md

- **输入**:T25。
- **产出**:`docs/阶段2-商家入驻店铺商品/TODO_阶段2.md`(stage 3 启动前 checklist + 凭证回填位置)

### T27 总闸 + 最终 commit

- **产出**:
  - `pnpm -r build / test / lint / format:check` 四绿
  - `git status` 干净后 commit:`feat(stage-2): 阶段 2 商家端 APP 入驻店铺与商品管理 完整交付(27/27 原子任务)`
- **验收**:同 stage 1 总闸标准

---

## 任务自审清单(每个 T 完成后必走)

每完成一个 Tn,要求自审:

1. **不漏项**:本任务产出与 TASK 描述列表一一勾对,无遗漏
2. **不多做**:本任务未引入 TASK 描述外的代码、接口、表、文件
3. **可独立验证**:验收标准命令真实可执行,通过后再开下一个 T
4. **依赖闭环**:依赖的前序 T 必须已完成 + 验收通过
5. **回归**:运行本任务相关 test,确保未破坏 stage 0/1 已有测试(stage 0+1 应保持 148 测试通过)
6. **追加自审记录**:在 ACCEPTANCE\_阶段2.md(T24 时统一汇总)记录本 T 自审条目

## 风险与回滚

- 任何 T 卡住 > 30 min 仍未解时,中断并记录到 `项目阶段规划/02-.../问题与风险记录.md`,由用户决策
- migration 失败:`pnpm --filter @o2o/server typeorm:migration:revert` 后修 entity 重出
- 第三方 mock 行为冲突:在 ALIGNMENT 中追加澄清,不擅自变更
- MerchantApprovedSubscriber 失败:管理端手动 `POST /admin/events/dispatch-retry/:eventId`(stage 11+ 接口,本阶段先靠 retry job 兜底)
