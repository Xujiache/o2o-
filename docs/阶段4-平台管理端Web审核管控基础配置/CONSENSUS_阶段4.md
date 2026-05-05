# 阶段 4 — 平台管理端 Web 审核管控与基础配置 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 明确的需求描述

完成平台管理端 Web 的"管理员真实登录 → 审核管控 → 基础配置"全闭环。具体包含 6 个新建后端模块 + 3 个扩展模块 + 14 类页面 + 22 接口 + 6 事件 + 2 定时任务 + 3 张新表 + 1 张表扩展。

依赖矩阵:

| 模块                      | 依赖(stage 0/1/2/3)                      | 依赖(本阶段内)                        |
| ------------------------- | ---------------------------------------- | ------------------------------------- |
| admin-auth                | auth.service / AdminJwtGuard / Redis     | T01 admin_user 加列 + T02 admin seed  |
| admin-city                | GeoJSON 校验复用(stage 3)                | T01 city_site 表 + T02 city seed      |
| admin-category            | -                                        | T01 platform_category + T02 seed      |
| admin-system-config       | sys_config(stage 0)                      | T02 seed 已写 keys 不需扩             |
| admin-third-party-config  | third_party_config(stage 0)+ cipher util | -                                     |
| admin-role-permission     | sys_role / sys_permission(stage 0)       | T02 seed 加 stage 4 权限点            |
| admin-user 扩展           | customer-auth jti 黑名单(stage 1)        | T01 account_disable_record + T03 事件 |
| admin-rider applications  | admin-rider.service(stage 3)             | -                                     |
| admin-merchant audit 事件 | admin-merchant.service(stage 2)          | T03 事件                              |

## 2. 验收标准(AC)

### 2.1 后端接口 AC(22 接口)

| AC ID    | 接口                                | 验收点                                                                                                                  |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC-T04-1 | GET /admin/auth/captcha             | 返 `{captchaId, svgImage}`;Redis SET 5min TTL;每次新 captchaId                                                          |
| AC-T04-2 | POST /admin/auth/login              | 验 captcha + bcrypt password + lock 策略;返 adminToken + menus + permissions + lastLoginAt;mock 模式 captcha='dev' 放行 |
| AC-T04-3 | POST /admin/auth/refresh            | 复刻 stage 1/2/3 模式 + Optional Redis hash + jti 旧失效                                                                |
| AC-T04-4 | POST /admin/auth/logout             | jti 黑名单 + 清 refresh hash                                                                                            |
| AC-T05   | GET /admin/riders/applications      | alias to admin-rider.service.list;默认 audit_status in (pending, rejected);字段精简版                                   |
| AC-T06-1 | POST /admin/customers/:id/disable   | 入参 reason;事务写 customer_account.account_status='disabled' + account_disable_record + 发事件                         |
| AC-T06-2 | POST /admin/customers/:id/enable    | 事务回滚 account_status='active' + 发事件 AccountDisabled (reason='enabled')                                            |
| AC-T07-1 | admin-merchant audit 改造           | approved + rejected 两路径都发 `domain.merchant.audited` 事件(approved 老事件兼容保留)                                  |
| AC-T07-2 | admin-rider audit 改造              | 同上,发 `domain.rider.audited`                                                                                          |
| AC-T08-1 | POST /admin/cities                  | UNIQUE city_code;GeoJSON Polygon 校验(可空);@Idempotent + @Audit                                                        |
| AC-T08-2 | GET /admin/cities                   | 分页 + 关键字 + 启停过滤;返完整字段                                                                                     |
| AC-T08-3 | PATCH /admin/cities/:code           | 部分字段更新;city_code 不可改                                                                                           |
| AC-T08-4 | DELETE /admin/cities/:code          | 软禁用 service_enabled=false;不物理删                                                                                   |
| AC-T08-5 | GET /pub/cities 切到 city_site      | system.service.listCities 改读 city_site;返已开通城市                                                                   |
| AC-T09-1 | POST /admin/categories              | bizType 必填;UNIQUE(bizType, parentId, name);parent 校验存在                                                            |
| AC-T09-2 | GET /admin/categories?bizType=      | 树状返(顶级 + 二级);bizType 必填                                                                                        |
| AC-T09-3 | PATCH /admin/categories/:id         | 不可改 bizType;name 重名校验                                                                                            |
| AC-T09-4 | DELETE /admin/categories/:id        | 软禁用 enabled=false                                                                                                    |
| AC-T10-1 | GET /admin/system-config            | 返全部 sys_config 行;value 已脱敏(若 isSecret=true)                                                                     |
| AC-T10-2 | PATCH /admin/system-config/:key     | 校验 key 存在;新 key 报 SYSTEM_CONFIG_KEY_UNKNOWN;发 ConfigChanged(stage 0 既有事件)                                    |
| AC-T11-1 | GET /admin/integrations             | 列表所有 provider;secret 字段返脱敏                                                                                     |
| AC-T11-2 | GET /admin/integrations/:provider   | 详情;secret 脱敏                                                                                                        |
| AC-T11-3 | PATCH /admin/integrations/:provider | secret 加密存储;发 ThirdPartyConfigChanged                                                                              |
| AC-T12-1 | GET /admin/roles                    | 返 sys_role 列表 + 关联 permissionCodes                                                                                 |
| AC-T12-2 | GET /admin/permissions              | 返权限点 seed 树(分组 customer/merchant/rider/admin)                                                                    |
| AC-T12-3 | PUT /admin/roles/:id/permissions    | 事务覆盖式重建;不允许删 SUPER_ADMIN/AUDITOR;发 RoleChanged                                                              |

### 2.2 状态机与事件 AC

| AC ID   | 验收点                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| AC-EV-1 | EventName 共 27 个(stage 4 +6),events.stage4.spec 验全部以 `domain.<biz>.<verb>` 命名                            |
| AC-EV-2 | AdminLoggedInSubscriber log + audit_log append;不强制下线                                                        |
| AC-EV-3 | RoleChangedSubscriber 扫该 role 绑定的 admin_user → jti 黑名单广播 + audit_log                                   |
| AC-EV-4 | AccountDisabledSubscriber 扫 customer/merchant/rider 各端 jti 黑名单 + audit_log + 触发 token broadcast job 加速 |
| AC-EV-5 | MerchantAuditedSubscriber 包装 stage 2 既有 approved 事件路径,补 rejected 路径,写 audit_log                      |
| AC-EV-6 | RiderAuditedSubscriber 同上                                                                                      |
| AC-EV-7 | ThirdPartyConfigChangedSubscriber 写 audit_log + 触发 IntegrationGatewayService 重新加载配置缓存                 |

### 2.3 定时任务 AC

| AC ID  | 任务                                 | 验收点                                                                                |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------- |
| AC-J-1 | config-change-aggregate.job          | 每小时聚合 sys_audit_log 配置类事件 → 写聚合摘要(便于审计追溯);DistributedLock 防并发 |
| AC-J-2 | disabled-account-token-broadcast.job | 每 5min 扫 account_disable_record 新条目 → Redis SADD jti 黑名单(冗余 subscriber)     |

### 2.4 前端 AC

| AC ID  | 页面                         | 验收点                                                                                   |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| AC-P-1 | login                        | captcha 图刷新按钮;登录失败 5 次锁定提示;成功后写 token + lastLoginAt                    |
| AC-P-2 | customers index              | 加 disable / enable 按钮;disable 弹窗输入 reason;v-permission='admin:customers:disable'  |
| AC-P-3 | customers/disable-records    | 列表展示 account_disable_record;关联 customer 信息脱敏                                   |
| AC-P-4 | cities                       | 列表 + 编辑 Dialog(GeoJSON textarea);保存调 POST/PATCH                                   |
| AC-P-5 | categories/takeaway + errand | 双 tab 共用 CategoryTree 组件;props.bizType 区分;支持新增 / 编辑 / 启停                  |
| AC-P-6 | system-config                | 表格内联编辑;只允许编辑 value;PATCH 后刷新                                               |
| AC-P-7 | integrations                 | 列表 + 详情抽屉;secret 脱敏显示;编辑保存;健康检查按钮                                    |
| AC-P-8 | roles-permissions            | 左角色列表 + 右权限树 checkbox;选角色 → 加载权限;保存 PUT;dictStore 缓存 permission tree |
| AC-P-9 | dictStore                    | 4 字典:cities / categories / operatorTypes / auditStatus;60s 缓存                        |

### 2.5 测试 AC

| AC ID   | 范围                  | 验收点                                                                    |
| ------- | --------------------- | ------------------------------------------------------------------------- |
| AC-TS-1 | 后端 jest             | server 用例 ≥354(stage 3 274 + 净增 ≥80)                                  |
| AC-TS-2 | 前端 vitest admin-web | ≥52(stage 3 22 + 净增 ≥30)                                                |
| AC-TS-3 | cross-scope 端隔离    | adminToken 调 /c/** /m/** /r/\*\* 全部 FORBIDDEN(spec)                    |
| AC-TS-4 | 总闸                  | `pnpm -r build` / `pnpm -r test` / `pnpm lint` / `pnpm format:check` 全绿 |

## 3. 技术约束

### 3.1 通用约束(沿用 stage 0/1/2/3)

- BIGINT 毫秒时间戳
- 主键 `<table>_id`
- 事件命名 `domain.<biz>.<verb>` 全小写
- 装饰器 @Idempotent / @Audit / @Mask / @RequirePermission 按 ALIGNMENT § 5.7 配齐
- 4 端 Token 隔离(ScopeJwtGuard 已就位)
- Optional Redis(开发模式无 Redis 也能跑)
- ApiResponse 统一包装(`{code:"0", data, message}`)+ AllExceptionsFilter
- INTEGRATION_MODE=mock|real 切换

### 3.2 stage 4 新增约束

- 依赖 `svg-captcha` 库版本 `^1.4.0`(纯 SVG,零原生依赖,与 Node 兼容)
- bcrypt cost=10(stage 0 已有 bcrypt 依赖)
- captcha Redis key `admin:captcha:<captchaId>` TTL=300s
- admin login lock:5 次失败锁 30min;admin_user.login_failed_count + locked_until 列
- third_party_config.secret_encrypted 列存 cipher 密文(stage 0 cipher util)
- platform_category 双层(parent_id=0 顶级 / >0 二级);不允许 3 层
- city_site.service_area JSON GeoJSON Polygon(可空)
- account_disable_record 不删旧(物理保留作为审计证据)
- @Idempotent key 选择:login=username+ip,disable=customerId,role-permission=roleId

### 3.3 严格不允许

- 前端硬编码状态文案(必须走 dictStore 或后端 enum mapping)
- 前端散写 URL(必须走 api/\* 模块)
- 后端不写 audit_log 的 admin 写接口
- 物理 DELETE city_site / platform_category(违反 ALIGNMENT § 5.4)
- 用 DELETE 替代 PATCH soft-disable
- @Mask 字段在前端 store 持久化(脱敏数据存到 localStorage)
- 第三方 secret 明文写前端

## 4. 集成方案

### 4.1 与 stage 0/1/2/3 衔接

| stage 4 接口                      | 与既有的关系                                            |
| --------------------------------- | ------------------------------------------------------- |
| POST /admin/auth/login            | 取代 admin-web 现有 mock token;auth.service 直接复用    |
| GET /admin/customers              | stage 1 既有,本阶段不改                                 |
| POST /customers/:id/disable       | stage 1 GET /customers/:id 详情已脱敏,加 disable 写接口 |
| GET /admin/merchants/applications | stage 2 既有,本阶段在 audit 完成时补 audited 事件       |
| GET /admin/riders/applications    | 新 alias,内部复用 stage 3 admin-rider.service.list      |
| POST /admin/cities + 4 接口       | system.service.listCities 改源到 city_site              |
| GET/PATCH /admin/integrations     | 既有 health check 沿用,加 list/detail/PATCH             |

### 4.2 admin-web 路由整理(stage 4 后)

```
/login                           (改造 with captcha)
/                                (workbench dashboard)
/customers                       (stage 1 + disable button)
/customers/:id                   (stage 1)
/customers/disable-records       (新)
/customers/realname-records      (stage 1)
/merchants/applications          (stage 2)
/merchants/:id                   (stage 2)
/merchants/stores                (stage 2)
/riders/applications             (stage 3, alias 新接口)
/riders/:id                      (stage 3)
/riders/status                   (stage 3)
/riders/delivery-area            (stage 3)
/cities                          (新)
/categories/takeaway             (新)
/categories/errand               (新)
/system-config                   (改造可编辑)
/integrations                    (改造列表+抽屉)
/roles-permissions               (改造左右栏)
/audit-logs                      (stage 0 既有)
```

### 4.3 dictStore 数据源

| 字典 key           | 数据源                                 | 用途                                 |
| ------------------ | -------------------------------------- | ------------------------------------ |
| cities             | GET /pub/cities                        | 商家 / 骑手等表单城市选择            |
| takeawayCategories | GET /admin/categories?bizType=takeaway | 商家选品 / 用户筛选(stage 5 启用)    |
| errandCategories   | GET /admin/categories?bizType=errand   | 跑腿场景(stage 6 启用)               |
| operatorTypes      | 枚举本地常量                           | sys_audit_log operator_type 映射中文 |
| auditStatus        | 枚举本地常量                           | merchant/rider audit_status 映射中文 |
| permissions        | GET /admin/permissions                 | 角色编辑右栏权限树                   |

## 5. 验收门禁

- [ ] 4 项核心决策(D-1~D-4)按 ALIGNMENT 实现,无偏离
- [ ] 12 项业务自动决策(§ 5.1~5.12)全部落地
- [ ] 22 接口 + 6 事件 + 2 任务的 AC 全部通过
- [ ] 跨端 Token 隔离 spec 包含 admin scope
- [ ] migration 1714867600000 + seed 4 个全跑
- [ ] 总闸 4 项(build / test / lint / format)全绿
- [ ] `项目阶段规划/04-阶段4-.../手动审查与测试.md` P0/P1=0
- [ ] `git status` 干净
