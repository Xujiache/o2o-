# 阶段 2 — 商家端 APP 入驻店铺与商品管理 · 对齐文档(ALIGNMENT)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目上下文

### 1.1 stage 1 已交付的可复用基建

| 类别              | 资产                                                                                                                          | 复用方式                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 4 端守卫          | `ScopeJwtGuard` 抽象 + 4 个子类(Customer/Merchant/Rider/AdminJwtGuard)+ Optional Redis jti 黑名单                             | T03 merchant-auth 直接挂 `MerchantJwtGuard`;不需要再扩展                      |
| 权限              | `@RequirePermission` + `PermissionGuard` + sys_role + sys_permission + sys_role_permission                                    | T01 seed 加 2 新权限点;角色 `MERCHANT` 已存(stage 0 预置)                     |
| 装饰器            | `@Idempotent` / `@Audit` / `@Mask`                                                                                            | 全模块沿用                                                                    |
| 响应              | `ResponseInterceptor` ApiResponse 包装 + `AllExceptionsFilter` HTTP→ErrorCode 映射                                            | controller 透明继承                                                           |
| 第三方网关        | `IntegrationGatewayService` + `realname/sms/wxlogin/amap/wxpay/alipay/getui/storage` 8 adapter + `integration_request_log` 表 | T02 扩展 realname adapter `verifyEnterprise()`                                |
| 调度              | `BaseJob` + `DistributedLockService` + `SchedulerController` + dev-mode trigger                                               | T10 5 个新 job 注册                                                           |
| 事件总线          | `DomainEventBus.publish` + `domain_event` 表 + `DomainEventRetryJob`                                                          | T11 加 6 EventName + 4 订阅器                                                 |
| 文件              | `/pub/files/upload` + `file_object` + `FileBizScopeMap`                                                                       | T02 扩 `FileBizType` 枚举(MERCHANT_FOOD_PERMIT / STORE_PHOTO / PRODUCT_IMAGE) |
| 自动注册 3 表事务 | `customer-auth.service.autoRegister` + `dataSource.transaction(em => ...)`                                                    | T04 onboarding 提交也走事务模板;T11 MerchantApprovedSubscriber 也走事务       |
| @Mask 在 DTO      | `customer-app/admin-web` 已验证 mobile/idcard 脱敏在 `instanceToPlain` 时触发                                                 | T05 admin-merchant 详情 `legalName` / `idCardNo` 加 @Mask                     |

### 1.2 当前 monorepo 状态

- commit `def9fb5` (stage 1 final)
- `pnpm -r test` 全绿 148 测试(server 108 / customer-app 21 / admin-web 8 / merchant-app 4 / rider-app 4 / api-client 3)
- `pnpm -r build` 全绿(`packages/contracts` 双产物 CJS+ESM 已修)
- MySQL 3307 容器 / Redis 6379 / Mongo 27017(deploy/docker-compose.dev.yml)
- `apps/merchant-app/` 是 stage 0 留的 Uni-app 占位项目(launch / audit/pending / error 几个页面骨架),本阶段大量新增

## 2. 原始需求(来自 `项目阶段规划/02-...`)

- **后端 7 模块**:merchant-auth / merchant-onboarding / store / product / stock / merchant-promotion / admin-merchant
- **数据 11 表**:merchant_account / merchant_application / merchant_license / store / store_business_hour / store_delivery_area / product_category / product / product_sku / stock_record / merchant_promotion
- **HTTP 接口(契约清单显式列 7 个)**:POST onboarding/applications, GET onboarding/status, PATCH store/settings, PATCH store/business-status, POST products, PATCH products/:id/sale-status, POST admin/merchants/:id/audit
- **领域事件 6 个**:MerchantSubmitted / MerchantApproved / StoreStatusChanged / ProductCreated / ProductOnSale / StockLow
- **定时任务 4~5 个**:资质到期提醒 / 库存预警扫描 / 限时折扣开始 / 限时折扣结束 / 售罄自动下架
- **第三方依赖**:实名/企业资质核验 / 文件存储 / 地图配送范围 / APP 推送
- **商家 APP 页面**:登录页 / 入驻资料页 / 证照上传页 / 审核进度页 / 店铺设置页 / 营业状态页 / 配送范围页 / 商品分类页 / 商品列表页 / 商品编辑页 / 库存预警页(11 页)
- **平台 Web 页面**:商家审核列表 / 商家审核详情 / 资质预览 / 驳回弹窗 / 店铺状态管理(4 页 + 1 弹窗)
- **用户端**:只消费"营业且已审核"的店铺和商品的只读接口(本阶段交付**只读接口骨架**,不出新页面)

## 3. 边界确认

### 3.1 范围内

- 商家入驻完整流程(申请 → 平台审核 → 通过自动建店 → 设置店铺 → 上架商品)
- 店铺设置(基本信息 / 营业时间 / 配送范围 / 起送价 / 配送费)
- 营业状态切换(在线 / 休业)
- 商品分类增删改 + 商品 CRUD + SKU + 上下架(单条 / 批量)
- 库存增减(stock_record 写流水)+ 售罄自动下架
- 限时折扣 + 单品满减(merchant_promotion 表)
- 平台 Web:商家审核 + 资质预览 + 驳回 + 店铺强制上下线 + 佣金率配置
- 用户端公开接口:`GET /api/v1/pub/stores`(分页店铺) + `GET /api/v1/pub/stores/:id/products`(店内商品列表) — **只读骨架**,字段在 DESIGN 中给出

### 3.2 严格不做(违反规划)

- ❌ 商家 Web 后台 / 商家小程序
- ❌ 商家端订单履约 / 售后处理 / 财务提现 / 结算
- ❌ 平台 Web 替代商家做商品维护或接单
- ❌ 跑腿订单进入商家端
- ❌ 用户端新页面(店铺/商品列表 UI 留 stage 5)
- ❌ 真第三方 SDK 接入(全 mock,凭证留 stage 11)
- ❌ 商家入驻短信通知(短信只用 mock,真接入留 stage 11)
- ❌ 推送(APP 推送只 mock providerRequestId,不真发)

## 4. 11 项需求理解与决策(自动 + 标注)

> 自动决策的依据是 stage 0/1 的既定模式 + 行业共识。任一条用户读完 ALIGNMENT 想改,告知即可,我同步刷 4 份文档。

### 4.1 [D-1 已锁] 商家端出包策略

**决策**:`apps/merchant-app/package.json` build 脚本只留 `build:app`(`uni build -p app`);保留 `dev:h5` / `dev:app` / `dev:mp-weixin` 给本地开发预览。`manifest.json` 的小程序配置 **不主动删除**(防止误打小程序时直接报"未配置")。

**原因**:Uni-app 项目同源多端,配置删了反而隐患更大。打包 release 时只跑 `build:app`,manifest 自然不影响。README 标明"H5 仅本地开发用,生产不出 H5 包"。

### 4.2 [D-2 已锁] 企业资质核验适配器

**决策**:扩展 stage 1 `realname.adapter.ts`,在 RealnameAdapter 接口加方法:

```ts
verifyEnterprise(opts: {
  licenseNo: string;            // 营业执照号
  legalName: string;            // 法人姓名
  legalIdCardNo: string;        // 法人身份证
  foodPermitNo?: string;        // 食品许可证号(餐饮类必填)
}): Promise<RealnameVerifyResult>;
```

mock 行为:`licenseNo` 长度 == 18 且 `legalName` 首字汉字 → success;否则 → failed reason='企业资质不一致'。`provider` 仍标 `ali-realname`(不在 ThirdPartyProvider 加新枚举)。

**原因**:第三方网关层不需要为同一个供应商分两个 adapter;mock 行为差别只是参数不同。stage 11 真接入时也是同一个阿里云 SDK 包(子接口区分)。

### 4.3 [D-3 已锁] 配送范围几何形状

**决策**:`store_delivery_area.geometry` 用 **GeoJSON Polygon JSON 字段**(MySQL `JSON` 类型)。schema 形如:

```json
{
  "type": "Polygon",
  "coordinates": [[[lng1,lat1],[lng2,lat2],...,[lng1,lat1]]]
}
```

后端"判断点在区内"用 ray-cast 算法(本阶段不需要,留 stage 5 路由匹配时实现);本阶段只需存取。前端高德 SDK 原生支持 GeoJSON 多边形,可直接显示与编辑。

**原因**:GeoJSON 是 OGC 标准,工具链成熟,与高德/百度/MapBox 兼容。圆心+半径方案不能表达不规则区域。

### 4.4 [自动决策] SKU 与 product 表的价格/库存优先级

**约定**:

- **有 SKU 时**:`product.price` = `MIN(skus[].price)` 作为展示起价 / `product.stock` = `SUM(skus[].stock)`(由后端聚合,前端展示);商家在编辑页改的是各 SKU 的 price/stock,product 表的 price/stock 由 service 聚合写入
- **无 SKU 时**:product 表的 `price` / `stock` 是权威字段;`product_sku` 表无对应行(`product.has_sku=0`)
- product 表加 `has_sku TINYINT default 0`(0=无规格 / 1=多规格)+ `original_price BIGINT NULL`(限时折扣前缓存)

### 4.5 [自动决策] 限时折扣 vs 单品满减表设计

**约定**:统一 `merchant_promotion` 单表,`promo_type` 枚举区分两类:

- `promo_type='time_limited'`(限时折扣):`rules JSON` = `{discountType:'percent'|'fixed', discountValue:number, productIds:[...]}`,生效时把 `product.price` 临时改为折扣价
- `promo_type='single_full_off'`(单品满减):`rules JSON` = `{tiers:[{minAmount:number,offAmount:number}], productIds:[...]}`,本阶段**不影响 product.price**(满减下单时算,本阶段订单未做,只存配置)
- promo `status` 枚举:`draft / scheduled / active / paused / ended`

### 4.6 [自动决策] 库存预警阈值字段位置

**约定**:`product` 表加 `stock_alert_threshold INT NULL DEFAULT 5`(每个商品独立阈值);商家可在商品编辑页或库存预警页调整。无阈值字段(NULL)的商品按 5 兜底。stage 11 起可加 `store_setting.default_stock_threshold` 全店默认值。

### 4.7 [自动决策] 入驻审核重提次数

**约定**:不限重提次数(规划文档无明确限制);`merchant_application` 表通过 `submitted_at` 倒序 + `audit_status` 区分历史 / 最新一次。`canResubmit` 规则:**最新申请 status=REJECTED 时为 true**,其他 status 为 false。stage 11+ 可加风控限制(同一手机号 30 天内 ≤ 3 次失败)。

### 4.8 [自动决策] 商家:店铺关系

**约定**:本阶段 **1 商家 : 1 店铺**(merchant_application 审核通过后自动建 1 个 store)。`store.merchant_id` 上加 UNIQUE 索引,数据库层强制约束。store 表 schema 留 `merchant_id` FK 不变,以便 stage 11+ 扩展为 1:N(连锁店)。

### 4.9 [自动决策] 价格字段命名

**约定**:DTO/VO 字段名 `price`(数值,单位 = 分),通过 ApiProperty / 注释说明"分,前端 ÷100 显示元"。**不用 `priceFen` 后缀**(stage 1 客户端 `formatAmountFen` 工具已有,展示层处理)。原因:接口契约简洁性优先,单位由文档约定。

### 4.10 [自动决策] 入驻审核 4 状态

**约定**:`audit_status` 枚举 `pending / approved / rejected / disabled`(`disabled` 用于审核通过后被平台主动禁用,与商品 disabled 共享 status 概念)。规划文档隐含 4 状态(状态机 J 列出),固化在 entity ENUM。

### 4.11 [自动决策] 文件 bizType 扩展

**约定**:`packages/contracts/src/enums/index.ts` `FileBizType` 加 3 个:

- `MERCHANT_FOOD_PERMIT: 'merchant-food-permit'`(食品许可证;stage 0 已有 `MERCHANT_LICENSE` 营业执照)
- `STORE_PHOTO: 'store-photo'`(门店实拍图)
- `PRODUCT_IMAGE: 'product-image'`(商品图)

`FileBizScopeMap` 同步增 3 行:`MERCHANT_FOOD_PERMIT: [MERCHANT]` / `STORE_PHOTO: [MERCHANT]` / `PRODUCT_IMAGE: [MERCHANT]`。

### 4.12 [自动决策] 平台佣金粒度

**约定**:本阶段佣金按**店铺级**(`store.commission_rate DECIMAL(5,4) NULL`,精度到 0.0001 = 万分位,例如 0.0500 = 5%)。审核通过时由平台填写一次,后续可通过 admin 接口修改(本阶段不做修改接口,留 stage 7)。无阶梯(订单金额维度的差别费率留 stage 7)。

### 4.13 [自动决策] 限时折扣价格回滚机制

**约定**:`PromoStartJob` 触发时,把 `product.price` 写入 `product.original_price`(若 `original_price` 为空),同时把 `product.price` 改为折扣价。`PromoEndJob` 触发时,把 `product.price = original_price` + `original_price = NULL`。商家在 promo 期间手改商品价格,我们**禁止**(controller 层校验 product 是否在 active promo 中,在则 STATUS_INVALID)。

### 4.14 [自动决策] 平台资质文件预览

**约定**:走 stage 0 已有的 `/pub/files/upload` 返回的 `url` 字段(MinIO 预签名 URL),前端 `<img>` 直接展示。PDF 用浏览器原生预览(`<embed src="..."/>` 或新窗口跳转)。stage 11 起替换为强类型 viewer(image-viewer.vue / pdf-viewer.vue 组件)。

## 5. 待人审清单(用户读完此文档可批量调整)

| ID   | 事项                      | 我的决策                           | 替代方案                                               |
| ---- | ------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 4.4  | SKU 与 product 价格优先级 | MIN(SKU price) 聚合                | (a) AVG / (b) 由商家手填一个独立 product.display_price |
| 4.5  | 限时折扣 vs 满减表        | 单表 + promo_type 区分             | 分两表 promotion_time_limited / promotion_single_off   |
| 4.6  | 库存阈值位置              | product 表字段                     | (a) 单独 product_setting / (b) store 级全店默认        |
| 4.7  | 重提次数                  | 不限                               | 30 天内 ≤ 3 次                                         |
| 4.8  | 商家:店铺                 | 1:1 强约束                         | 1:N(连锁)                                              |
| 4.9  | 价格字段名                | `price`                            | `priceFen`                                             |
| 4.10 | 入驻 4 状态               | pending/approved/rejected/disabled | 加 `cancelled` 共 5 状态                               |
| 4.11 | 文件 bizType              | 加 3 个                            | 把 STORE_PHOTO 与 MERCHANT_LICENSE 合并                |
| 4.12 | 佣金粒度                  | 店铺级 + 4 位小数                  | 商家级 / 阶梯式                                        |
| 4.13 | 折扣回滚                  | product.original_price 缓存        | 不缓存,promo 表存原价                                  |
| 4.14 | 资质预览                  | 直接 `<img>` / `<embed>`           | 加 viewer 组件                                         |

## 6. 已识别风险预制

| 编号        | 级别 | 风险                                                          | 应对(将在 DESIGN 落地)                                                                              |
| ----------- | ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 阶段 2 R-01 | P2   | SKU 价格聚合一致性(并发改 SKU 时 product.price 不同步)        | service 层用 dataSource.transaction 包 SKU upsert + product 聚合,行级锁 product 行                  |
| 阶段 2 R-02 | P2   | MerchantApprovedSubscriber 自动建 store 失败 → 商家审核态卡死 | 订阅器内 dataSource.transaction;失败走 DomainEventRetryJob 兜底;管理端可手动重发事件                |
| 阶段 2 R-03 | P3   | 限时折扣并发开始(同一 product 落入多个 active promo)          | controller 创建 promo 时校验 productIds 与现有 active/scheduled promo 无重叠                        |
| 阶段 2 R-04 | P3   | 资质 OCR 误识别                                               | 本阶段不做 OCR,商家手填 + 平台人审;留 stage 11                                                      |
| 阶段 2 R-05 | P2   | 配送范围 GeoJSON 输入校验                                     | DTO 用 class-validator 自定义验证器 `@IsGeoJsonPolygon()`,确保 type=Polygon + 至少 4 个点(首尾闭合) |

## 7. 术语表

| 术语            | 定义                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| 入驻            | 商家提交资料 → 平台审核 → 通过后自动建 merchant_account + store + product_category(默认)                |
| 营业状态        | store.business_status: `online`(可下单) / `offline`(休业)/ `paused`(平台强制下线)                       |
| 上架            | product.sale_status: `on_shelf` / `off_shelf` / `sold_out`(系统自动)                                    |
| 资质            | merchant_license:营业执照、食品经营许可证、法人身份证(分行存,通过 license_type 区分)                    |
| 起送价 / 配送费 | store.min_order_amount / store.delivery_fee(单位:分,1 元 = 100 分)                                      |
| 限时折扣        | merchant_promotion 表 promo_type='time_limited',改 product 价格                                         |
| 单品满减        | merchant_promotion 表 promo_type='single_full_off',下单时算,不改商品价                                  |
| Open store      | 店铺 business_status='online' AND merchant_application 最新 status='approved'(用户端公开接口的过滤条件) |
