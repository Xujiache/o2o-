# 阶段 4 — 平台管理端 Web 审核管控与基础配置 · 对齐文档(ALIGNMENT)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目上下文

### 1.1 stage 0/1/2/3 已交付的可复用基建

| 类别                   | 资产                                                                                    | stage 4 复用方式                                                |
| ---------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 4 端守卫               | `ScopeJwtGuard` 抽象 + 4 子类(Customer/Merchant/Rider/Admin)+ Optional Redis jti 黑名单 | 全 admin 模块挂 `AdminJwtGuard`(已就位),无需再建端隔离基建      |
| Token 签发             | `auth.service.signAccessToken({ scope:'admin' })`                                       | T04 admin-auth login 端点直接调用                               |
| 权限                   | `@RequirePermission` + `PermissionGuard` + sys_role / sys_permission                    | T02 seed 加 5 新权限点;T12 角色绑定 PUT 接口 + jti 强制下线     |
| 装饰器                 | `@Idempotent` / `@Audit` / `@Mask` / `@RequirePermission`                               | 全模块沿用                                                      |
| 响应                   | `ResponseInterceptor` ApiResponse 包装 + `AllExceptionsFilter`                          | controller 透明继承                                             |
| 第三方网关             | `IntegrationGatewayService` + 8 adapter + `integration_request_log` 表                  | T11 third-party-config 直接读写 `third_party_config` 表(已存在) |
| 调度                   | `BaseJob` + `DistributedLockService` + `SchedulerController` dev trigger                | T14 2 新 job 注册                                               |
| 事件总线               | `DomainEventBus.publish` + `domain_event` 表 + `DomainEventRetryJob`                    | T03 加 6 EventName + T13 6 订阅器                               |
| audit-log              | stage 0 `sys_audit_log` + `audit-log.service.append()` + `GET /admin/audit-logs`        | 全模块装饰器自动写;T13 部分订阅器手动 append                    |
| GeoJSON 校验           | stage 3 admin-rider `isValidGeoJsonPolygon`                                             | T08 admin-city service_area 校验直接搬                          |
| cipher util            | stage 0 加密工具(对称密钥)                                                              | T11 third-party-config secret 加密                              |
| jti 黑名单             | stage 1 / 2 / 3 各端 logout 模式                                                        | T06 disable customer 时复用;T12/T13 role-changed 强制下线       |
| Pinia + dictStore 模式 | merchant-app stage 2 `stores/dict.ts`                                                   | T15 admin-web 复刻                                              |

### 1.2 当前 monorepo 状态(2026-05-05)

- commit `3900887` (stage 3 final)
- `pnpm -r test` 全绿(server 274 / customer-app 25 / merchant-app 21 / admin-web 22 / rider-app 28 / api-client 3)
- `pnpm -r build` 全绿
- MySQL 3307 / Redis 6379 / Mongo 27017
- `apps/admin-web/` stage 0/1/2/3 已建:login(无 captcha 占位)/ workbench / customers / merchants / riders / audit-logs(stage 0 占位)/ integrations(占位)/ system-config(占位)/ roles-permissions(占位)
- `EventName` 共 21 个;`scheduler.module` 共 17 jobs;`migrations/` 共 5 个,下一编号 `1714867600000`

### 1.3 stage 4 要交付的范围(规划文档点名,不多做不少做)

| 维度       | 数量 / 内容                                                                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 后端模块   | 6 新 + 3 扩展:`admin-auth` / `admin-city` / `admin-category` / `admin-system-config` / `admin-third-party-config` / `admin-role-permission`(新);`admin-user` / `admin-merchant` / `admin-rider`(扩展)                                   |
| 数据表     | 3 新 + 1 扩展:`city_site` / `platform_category` / `account_disable_record`(新);`admin_user`(加 password_hash + last_login_at + login_failed_count + locked_until 4 列)                                                                  |
| 定时任务   | 2:配置变更聚合 / 禁用账号 token 失效广播                                                                                                                                                                                                |
| 领域事件   | 6:`AdminLoggedIn` / `RoleChanged` / `AccountDisabled` / `MerchantAudited` / `RiderAudited` / `ThirdPartyConfigChanged`                                                                                                                  |
| 平台 Web   | 14 页:登录(重写带 captcha)/ 首页 / 用户列表 / 用户详情(stage 1 已有,加 disable 按钮)/ 用户禁用记录(新)/ 商家审核 / 骑手审核 / 城市站点(新)/ 外卖类目(新)/ 跑腿类目(新)/ 角色权限(改造)/ 系统参数(改造)/ 第三方配置(改造)/ 操作日志      |
| HTTP 接口  | 22:admin-auth 4(captcha+login+refresh+logout)+ admin-rider applications alias 1 + admin-user disable/enable 2 + admin-city 4 + admin-category 4 + admin-system-config 2 + admin-third-party-config 3 + admin-role-permission 3(新增 22) |
| 第三方依赖 | 0 项新接(沿用 stage 1/2/3 已建 adapter,只动 third-party-config 数据)                                                                                                                                                                    |

## 2. 原始需求(来自 `项目阶段规划/04-阶段4-平台管理端Web-审核管控与基础配置/`)

- **阶段规划.md**:平台 Web 用户/商家/骑手审核管控 + 城市站点 + 类目 + 角色权限 + 第三方配置 + 操作日志。本阶段不做订单调度、不做售后仲裁、不做财务对账。
- **按端实施范围.md**:平台 Web 为主;用户/商家/骑手 APP 仅消费审核结果与配置,不新增端能力。
- **前端页面与接口对接.md**:平台 14 页;6 关键写接口必须接 Idempotent + Audit;状态文案不允许前端硬编码。
- **接口契约清单.md**:6 端点(admin/auth/login + admin/customers + admin/merchants/applications + admin/riders/applications + admin/cities + admin/integrations/{provider}),每个含 Token / 权限点 / 错误码 / 幂等 / 审计要求。
- **后端数据任务事件.md**:9 模块、9 数据域、3 定时任务、6 领域事件,所有写操作走流水 + 审计。
- **状态机与业务规则.md**:后台敏感数据脱敏;权限分菜单 + 按钮;审核 / 禁用 / 费率 / 第三方配置必须写日志;平台 Web 不替代商家经营。
- **权限与安全.md**:Token 端隔离;后台手机号 / 身份证 / 银行卡 / 详细地址脱敏展示;第三方密钥加密存储不写入前端。
- **阶段交付清单.md**:文档 9 + 开发 7 + 测试 7 + 阶段门禁 9 共 32 勾。

## 3. 边界确认

### 3.1 范围内

- 管理员真实登录(用户名 + 密码 + svg-captcha + 失败锁)
- 用户管理(列表 / 详情 / 禁用 / 启用 / 实名记录 / 禁用记录)
- 商家审核(沿用 stage 2 端点,补 audited 通用事件)
- 骑手审核(增 applications alias 端点,补 audited 通用事件)
- 城市站点 CRUD(GeoJSON serviceArea 文本编辑,与 stage 3 配送区域同款)
- 平台类目 CRUD(外卖 + 跑腿 双 tab,共用 platform_category 表 + bizType 区分)
- 系统参数 CRUD(只允许编辑 seed 已存在的 key)
- 第三方配置 CRUD(secret 加密存储 + 健康检查复用 stage 0)
- 角色权限管理(权限点 seed 只读 + 角色绑定权限可编辑)
- 操作日志查询(沿用 stage 0)
- 6 领域事件 + 6 订阅器(账号禁用 / 角色变更 → 强制下线 jti 广播)
- 2 定时任务(配置聚合 / token 黑名单刷新)

### 3.2 严格不做(违反规划)

- ❌ 商家 Web 后台 / 商家小程序(全周期不做)
- ❌ 订单调度 / 派单匹配算法(stage 5 + 6 + 8)
- ❌ 售后仲裁 / 投诉处理(stage 7+)
- ❌ 财务对账 / 提现 / 结算(stage 8+)
- ❌ 风控规则 / 信用分(stage 8+ 平台风控阶段)
- ❌ 真第三方 SDK 接入(继续 mock,凭证留 stage 11)
- ❌ 滑动验证码 / 第三方人机验证(本阶段 svg-captcha 即可)
- ❌ 多租户 / 城市分站隔离(`city_site` 仅作业务数据,无路由 / Token 多租户)
- ❌ 动态新建 / 删除权限点(seed 是权威源)

## 4. 4 个用户拍板决策(2026-05-05 已锁定)

### 4.1 [D-1 已锁] 管理员登录验证码 → svg-captcha + Redis

**决策**:依赖 `svg-captcha` 库;`GET /api/v1/admin/auth/captcha` 返 `{captchaId, svgImage}`(SVG XML 字符串);Redis key `admin:captcha:<captchaId>`,TTL 5min。`POST /api/v1/admin/auth/login` 请求字段:`{username, password, captcha, captchaId}`;后端校验 captcha 成功后 DEL Redis 键。

mock 行为(`INTEGRATION_MODE=mock`):captcha === 'dev' 直接放行(便于 e2e/jest 测试),real 模式严格校验。

**原因**:stage 0 已有 Redis,svg-captcha 零外部依赖;stage 8+ 真接入再加滑动验证码或第三方人机验证。

### 4.2 [D-2 已锁] 城市站点表 → 新建 `city_site` 权威表 + sys_dict 'city' 保留兼容

**决策**:`city_site` 表字段:

```sql
city_site_id BIGINT PK
city_code VARCHAR(16) UNIQUE NOT NULL
city_name VARCHAR(64) NOT NULL
province VARCHAR(64)
service_enabled BOOLEAN DEFAULT TRUE
service_area JSON  -- GeoJSON Polygon, NULL = 全城开放
display_order INT DEFAULT 0
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

`system.service.listCities()` 改读 `city_site`(过滤 service_enabled=true);`sys_dict 'city'` 数据保留(供存量代码兼容),停止维护(seed 后续不再 upsert)。

`POST/GET/PATCH /api/v1/admin/cities` + `DELETE` 软禁用(`service_enabled = false`)。GeoJSON 校验复用 stage 3 admin-rider 的 `isValidGeoJsonPolygon`。

**原因**:sys_dict 是简单 KV 表,无法承载 GeoJSON;独立 city_site 表后续扩展(站点经理 / 城市仓 / 配送时段)有空间。

### 4.3 [D-3 已锁] 类目表 → 单表 `platform_category` + bizType 字段

**决策**:`platform_category` 表字段:

```sql
category_id BIGINT PK
biz_type ENUM('takeaway','errand') NOT NULL
parent_id BIGINT DEFAULT 0  -- 0=根,>0=二级
name VARCHAR(64) NOT NULL
icon_url VARCHAR(512)
display_order INT DEFAULT 0
enabled BOOLEAN DEFAULT TRUE
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL

UNIQUE (biz_type, parent_id, name)
INDEX (biz_type, enabled, display_order)
```

stage 5 外卖商品 / stage 6 跑腿订单将通过 `bizType` 过滤同张表。**不动** stage 2 `product-category`(per-store 分类,继续用)。

**原因**:外卖类目和跑腿类目 schema 完全相同(只语义不同),双表会导致后端两套 controller/service/spec,违反 DRY;单表 + bizType 过滤是 stage 2 已经验证的模式(payment_method 等都同款)。

### 4.4 [D-4 已锁] 角色权限管理 → 权限点 seed 只读 + 角色绑定权限可编辑

**决策**:

- `GET /api/v1/admin/roles` 返当前所有 sys_role + 关联权限点 codes(@Mask 不需要;权限本身不敏感)
- `GET /api/v1/admin/permissions` 返 seed 权威权限树(分组:`customer:*` / `merchant:*` / `rider:*` / `admin:*`)
- `PUT /api/v1/admin/roles/:roleId/permissions` 入参 `{permissionCodes: string[]}`;事务删旧 sys_role_permission + 写新条目 + 发 `domain.role.changed` 事件
- 不允许动态新建 / 删除权限点(seed 是权威源,seed 重跑会覆盖)
- 不允许删除内置 SUPER_ADMIN / AUDITOR 角色;允许新建自定义角色(为 stage 8 风控角色预留)
- `domain.role.changed` 订阅器扫该角色绑定的全部 admin_user → jti 黑名单广播 → 强制重登

**原因**:seed 一直是权威源,一旦权限点可动态新增,seed 重跑就会冲突;角色与权限关系编辑可保留(运营场景需要)。

## 5. 12 项业务自动决策

### 5.1 时间戳列类型

**约定**:全部 `BIGINT` 毫秒(沿用 stage 0/1/2/3 既有约定)。

### 5.2 主键命名

**约定**:`<table>_id`(`city_site_id` / `category_id` / `account_disable_record_id`)。`admin_user` 已有 `admin_user_id`(stage 0)。

### 5.3 领域事件命名

**约定**:`domain.<biz>.<verb>` 全小写连字符。

| EventName key           | event topic                      |
| ----------------------- | -------------------------------- |
| AdminLoggedIn           | domain.admin.logged-in           |
| RoleChanged             | domain.role.changed              |
| AccountDisabled         | domain.account.disabled          |
| MerchantAudited         | domain.merchant.audited          |
| RiderAudited            | domain.rider.audited             |
| ThirdPartyConfigChanged | domain.thirdparty.config-changed |

EventName 总数从 21 升到 27。

### 5.4 软禁用 vs 物理删除

**约定**:本阶段所有 admin 删除接口走软禁用(`enabled=false` / `service_enabled=false`),不物理 DELETE。理由:历史数据可追溯 + 唯一索引(city_code / category 名)冲突可避免。例外:`PUT roles/:id/permissions` 是覆盖式重建,删除旧 role_permission 关联是必要操作(不视作软删)。

### 5.5 @Mask 字段

**约定**:

- admin-user 列表 / 详情:`mobile` 已脱敏(stage 1 已有 @Mask);新增 `disabledRecord.disabledBy` 不脱敏(显示 admin 用户名)
- admin-merchant 详情(stage 2 已有 @Mask)+ admin-rider 详情(stage 3 已有 @Mask)继续生效
- admin-third-party-config:`secret` 字段 GET 返脱敏(`xxx***xxx` 前后 3 字符)+ PATCH 接收明文加密存储
- admin-auth login response 不返 password 相关字段

### 5.6 端 Token 隔离扩展

**约定**:cross-scope.spec 加 admin scope 维度。`Admin-Token` 调 `/c/**` `/m/**` `/r/**` 全部 FORBIDDEN(stage 0 ScopeJwtGuard 已就位,本阶段补测试)。

### 5.7 装饰器约定

**约定**:

- `@Idempotent` 用于:`POST /admin/auth/login`(60s key=username+ip)/ `POST /admin/cities`(60s key=cityCode)/ `POST /admin/categories`(60s key=bizType+parentId+name)/ `PATCH /admin/system-config/:key` / `PATCH /admin/integrations/:provider` / `POST /admin/customers/:id/disable`(60s key=customerId)/ `PUT /admin/roles/:id/permissions`(60s key=roleId)
- `@Audit` 用于:除 `GET *` 和 `POST /admin/auth/captcha`(只生成 captcha,无业务变更)之外所有写接口
- `@Mask` 用于:全部 GET 详情接口的敏感字段
- `@RequirePermission` 用于:全部 admin 接口(`admin:menu:*` 用于菜单权限校验,具体业务权限点单独配)

### 5.8 权限点扩展(stage 4 新增)

`role-permission.seed.ts` 新增 5 业务权限点 + 5 菜单权限点:

| code                         | 用途           | 默认绑定                     |
| ---------------------------- | -------------- | ---------------------------- |
| `admin:cities:manage`        | 城市站点 CRUD  | SUPER_ADMIN                  |
| `admin:categories:manage`    | 平台类目 CRUD  | SUPER_ADMIN                  |
| `admin:system-config:manage` | 系统参数编辑   | SUPER_ADMIN                  |
| `admin:third-party:manage`   | 第三方配置编辑 | SUPER_ADMIN                  |
| `admin:roles:manage`         | 角色权限编辑   | SUPER_ADMIN                  |
| `admin:menu:cities`          | 城市菜单       | SUPER_ADMIN, AUDITOR(只读项) |
| `admin:menu:categories`      | 类目菜单       | SUPER_ADMIN, AUDITOR         |
| `admin:menu:system-config`   | 系统参数菜单   | SUPER_ADMIN, AUDITOR         |
| `admin:menu:third-party`     | 第三方配置菜单 | SUPER_ADMIN                  |
| `admin:menu:roles`           | 角色权限菜单   | SUPER_ADMIN                  |

stage 0/1/2/3 既有 `admin:customers:disable` 等本阶段直接绑定 SUPER_ADMIN(若未绑)。

### 5.9 系统参数白名单

**约定**:`PATCH /admin/system-config/:key` 服务层先校验 `configKey` 必须存在于 sys_config 表(seed 已写),否则返 `STATUS_INVALID code='SYSTEM_CONFIG_KEY_UNKNOWN'`。新增 key 必须走 seed 重跑。理由:防止运营误新增配置导致代码读不到。

### 5.10 third-party-config secret 加密

**约定**:数据库 `third_party_config.secret_encrypted` 列存密文(stage 0 cipher util AES-256-CBC + 内置密钥);GET 接口返 secret 脱敏字符串(前 3 + `***` + 后 3);PATCH 入参 secret 明文,服务层加密存。**密钥不出前端**。

### 5.11 admin login lock 策略

**约定**:`admin_user.login_failed_count` 默认 0;每次密码错误 +1;失败 ≥5 次 → `locked_until = now + 30min`,后续 login 校验 locked_until > now → 直接返 `code='ACCOUNT_LOCKED'` 不再查 password;成功登录后 reset failed_count = 0 + last_login_at = now。

### 5.12 admin 登录 captcha 验证流程

**约定**:

1. captcha 生成时 Redis SETEX `admin:captcha:<captchaId>` value=text TTL=300s
2. login 入参 `{username, password, captcha, captchaId}`
3. 服务层先 GET Redis 取 expectedText;不存在 → `CAPTCHA_EXPIRED`;不一致 → `CAPTCHA_INVALID`(同时 DEL 防穷举)
4. 校验通过后 DEL Redis 键(防 captcha 复用)
5. mock 模式 captcha === 'dev' 跳过 Redis 校验

## 6. 已识别风险预制

| 编号        | 级别 | 风险                                                             | 应对(将在 DESIGN 落地)                                                       |
| ----------- | ---- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 阶段 4 R-01 | P2   | bcrypt password hash 性能(login 高峰)                            | bcrypt cost=10(平衡安全 / 速度);不在循环里调用                               |
| 阶段 4 R-02 | P2   | 角色权限 PUT 后老 token 仍有效                                   | T13 RoleChangedSubscriber 扫角色绑定 admin_user → 全部 jti 失效              |
| 阶段 4 R-03 | P2   | account_disable 后用户老 token 仍有效                            | T13 AccountDisabledSubscriber 扫 customer-auth jti 黑名单                    |
| 阶段 4 R-04 | P2   | sys_dict 'city' 与 city_site 数据不一致                          | system.listCities 切到 city_site;sys_dict 仅作 legacy fallback;TODO 列出迁移 |
| 阶段 4 R-05 | P3   | platform_category 与 product_category(stage 2 per-store)概念混淆 | DESIGN 明确二者职责:platform=平台分发,product=单店内菜单分组                 |
| 阶段 4 R-06 | P3   | svg-captcha SVG XSS 风险                                         | 后端返 SVG 字符串放 `<img src=data:image/svg+xml;base64,...>`,不直接 v-html  |
| 阶段 4 R-07 | P2   | third-party-config 密文密钥泄漏                                  | cipher key 走 .env(stage 0 已就位);GET 接口脱敏返;不写前端 store 持久化      |
| 阶段 4 R-08 | P3   | admin-rider applications alias 与 admin-rider 列表逻辑漂移       | 实现层共用 admin-rider.service.list,只在 controller 包一层默认参数           |

## 7. 术语表

| 术语                   | 定义                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| city_site              | 平台运营的城市站点权威表;sys_dict 'city' 仅作 legacy fallback          |
| platform_category      | 平台级类目(外卖 + 跑腿),用于商家选品 / 用户筛选 / 跑腿场景区分         |
| product_category       | stage 2 单店内菜单分组(per-store);本阶段不动                           |
| account_disable_record | 账号禁用流水;disable 时事务写入 + 发事件 → 强制下线                    |
| 角色绑定权限           | sys_role_permission 关联表;PUT 接口覆盖式重建该角色全部条目            |
| 强制下线               | jti 黑名单广播 → 老 token verify 失败 → 401;前端跳登录                 |
| svg-captcha            | npm `svg-captcha` 库,后端生成 SVG 文本验证码,不依赖外部                |
| 软禁用                 | enabled=false / service_enabled=false 标志位,业务读时过滤;数据物理保留 |

## 8. 实现澄清(Wave 1 落地后追加)

### 8.1 密码哈希算法

DESIGN § 3.1 / ALIGNMENT § 5.11 原写"bcrypt cost=10"。**Wave 1 落地时改用 Node 内置 `crypto.scrypt`**(无原生编译依赖,Windows / 跨平台 / 测试环境零摩擦),参数 N=16384 r=8 p=1 salt=16 字节 key=32 字节,存储格式 `scrypt$<saltHex>$<hashHex>`,字段 `password_hash VARCHAR(128)` 充足容纳。`hashPassword` / `verifyPassword` 工具位于 `apps/server/src/common/utils/password.util.ts`,5 单元测试覆盖。R-01 风险等价(scrypt 与 bcrypt 安全等级相当)。

### 8.2 admin_user 表创建方式

DESIGN § 2.4 描述为"ALTER 加 4 列"。**Wave 1 实际落地时是 CREATE 整张表**(stage 0 未建 admin_user 表;原 explore 结论有误)。所以 `1714867600000-Stage4Init` migration 是 4 张 `CREATE TABLE`(admin_user / city_site / platform_category / account_disable_record),没有 ALTER。表结构与 DESIGN 字段一致(11 列 admin_user 含 4 列 lock 相关)。

### 8.3 cipher util 落地

DESIGN § 5.10 / R-07 提到 stage 0 cipher util。**Wave 3 落地时新建 `apps/server/src/common/utils/cipher.util.ts`**(stage 0 未实际实现)。算法 AES-256-CBC + sha256 hashed key,密钥源 `process.env.THIRD_PARTY_SECRET_KEY`(默认 dev key),格式 `aes256$<ivHex>$<cipherHex>`,字段 `third_party_config.encrypted_secret TEXT` 充足。`maskSecret` 工具脱敏(前 3 + \*\*\* + 后 3)。6 单元测试覆盖。

### 8.4 third_party_config 实际字段

DESIGN § 3.7 接口契约写"appId / secret / callbackUrl / configJson"。**Wave 3 实际落地按 stage 0 既有 entity 字段简化**(provider / env / encryptedSecret / status / lastHealthAt / errorMessage / updatedAt)。stage 8+ 真接入第三方时,可按需 ALTER 加 appId / callbackUrl 等字段。当前 PATCH 接口只接受 `{ secret?, status? }` 两个字段,`changedFields` 数组反映实际变更。
