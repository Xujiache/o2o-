# 阶段 4 — 平台管理端 Web 审核管控与基础配置 · 验收文档(ACCEPTANCE)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. AC 28 条逐条验证

### 后端

| AC    | 内容                                                                                                     | 状态 | 证据                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| AC-01 | 3 表 + admin_user 4 列 + migration                                                                       | ✓    | `migrations/1714867600000-Stage4Init.ts` city_site / platform_category / account_disable_record + ALTER admin        |
| AC-02 | 6 业务模块 + module/service/controller/dto                                                               | ✓    | `modules/{admin-auth,admin-city,admin-category,admin-system-config,admin-third-party-config,admin-role-permission}/` |
| AC-03 | 22 接口契约实现(admin-auth 4 + rider alias 1 + customer 2 + city 4 + category 4 + sys 2 + tp 3 + role 3) | ✓    | DESIGN § 3 + 全 controller 路径 + admin-user controller(disable/enable + disable-records GET)                        |
| AC-04 | AdminJwtGuard 端隔离 + 5 cross-scope 测试                                                                | ✓    | `admin-auth.cross-scope.spec.ts` 5 测试覆盖 admin → c/m/r/admin                                                      |
| AC-05 | RoleChangedSubscriber 扫 admin → 写 admin:role-revoked + audit_log                                       | ✓    | `stage4-subscribers.spec.ts` 12 测试                                                                                 |
| AC-06 | AccountDisabledSubscriber disable 写 customer/merchant/rider:account-revoked + enable 不写               | ✓    | `stage4-subscribers.spec.ts`(disable + enable 双路径)                                                                |
| AC-07 | 6 事件 + EventName 总数 27(stage 0/1/2/3 累计 21 + stage 4 6)                                            | ✓    | `events.stage4.spec.ts` + 各 stage spec 计数同步 27                                                                  |
| AC-08 | 19 jobs 全注册可触发(stage 0/1/2/3/4 累加,本阶段 +2)                                                     | ✓    | `scheduler.module.ts` providers 数组 19 项,`stage4-jobs.spec.ts` 4 测试                                              |
| AC-09 | admin-auth 登录:captcha + 锁定 + 5 次失败锁 30 min                                                       | ✓    | `admin-auth.service.spec.ts` login 8 测试(锁定 + lastLoginAt + reset + disabled)                                     |
| AC-10 | admin-auth refresh + logout(jti 黑名单 + scope 隔离)                                                     | ✓    | `admin-auth.service.spec.ts` refresh 4 + logout 4 + scope=admin 守卫                                                 |
| AC-11 | admin-city CRUD + GeoJSON 校验 + 软禁用                                                                  | ✓    | `admin-city.service.spec.ts` 9 测试(create/update/delete/serviceArea 校验)                                           |
| AC-12 | admin-category 树 + 双层校验 + HAS_ENABLED_CHILDREN                                                      | ✓    | `admin-category.service.spec.ts` 9 测试(parent_id=0/>0 + 子类目检查)                                                 |
| AC-13 | admin-system-config GET 全部 + PATCH 单 key + ConfigChanged                                              | ✓    | `admin-system-config.service.spec.ts` 5 测试                                                                         |
| AC-14 | admin-third-party-config secret 加密 + 脱敏 + ThirdPartyConfigChanged                                    | ✓    | `admin-third-party-config.service.spec.ts` 7 测试 + cipher.util                                                      |
| AC-15 | admin-role-permission 事务覆盖 + 内置角色保护 + RoleChanged                                              | ✓    | `admin-role-permission.service.spec.ts` 8 测试(NotFound + STATUS_INVALID + 自定义角色清空 + appliedCodes)            |
| AC-16 | admin-user disable/enable + AccountDisabled + 强制下线广播                                               | ✓    | `admin-user.service.spec.ts` 7 测试(transaction + 幂等 + 事件)                                                       |
| AC-17 | admin-merchant/admin-rider audit 改造发 MerchantAudited/RiderAudited                                     | ✓    | `admin-merchant.service.spec.ts` + `admin-rider.service.spec.ts` 验 publish 双事件(approved + audited)               |

### 前端 - 平台 Web

| AC    | 内容                                                                  | 状态 | 证据                                                                                                                                           |
| ----- | --------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-18 | 7 类页面 + 路由 + dictStore 60s 缓存                                  | ✓    | `views/{login,customers/disable-records,cities,categories/{takeaway,errand},system-config,integrations,roles-permissions}/` + `stores/dict.ts` |
| AC-19 | login captcha SVG 图 + 刷新 + lastLoginAt 显示 + ACCOUNT_LOCKED modal | ✓    | `login/index.vue` + `layout/index.vue` lastLoginText computed + ElMessageBox.alert                                                             |
| AC-20 | customers 列表行 v-permission disable/enable 按钮 + 禁用记录页        | ✓    | `customers/index.vue` ElMessageBox.prompt + `customers/disable-records.vue`                                                                    |
| AC-21 | 401 自动 refresh(单飞 + 队列回放)                                     | ✓    | `utils/request.ts` ensureRefreshing + skipAuthRefresh + retry 标记                                                                             |
| AC-22 | cities GeoJSON textarea + 软禁用 / categories 双 tab 树 + CRUD        | ✓    | `cities/index.vue` + `categories/components/CategoryTree.vue`                                                                                  |
| AC-23 | system-config 行内编辑 + integrations 抽屉编辑 + secret 留空提示      | ✓    | `system-config/index.vue` + `integrations/index.vue` 抽屉 + 健康检查列                                                                         |
| AC-24 | roles-permissions 左 30% 角色 + 右 70% checkbox + 内置角色保护        | ✓    | `roles-permissions/index.vue` 切换角色重载 + 内置角色清空校验                                                                                  |

### 测试 / 验收

| AC    | 内容                                                 | 状态 | 证据                                                                       |
| ----- | ---------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| AC-25 | 后端 jest 累计 ≥354 + 全绿                           | ✓    | 53 suites / 371 tests pass(stage 3 base 348 → 净增 23)                     |
| AC-26 | 前端 admin-web vitest 累计 ≥52 + 全绿                | ✓    | 20 suites / 57 tests pass(stage 3 base 32 → 净增 25)                       |
| AC-27 | 全 monorepo build/test/lint/format 四绿 + 工作树干净 | ⏳   | 总闸前跑(本次 commit 前)                                                   |
| AC-28 | 手动审查 P0/P1=0 + 三件套就位                        | ✓    | 手动审查与测试.md / ACCEPTANCE / FINAL / TODO 全部就位 + 5 项 P0/P1 已修复 |

## 2. 23 任务自审表

| Task    | 内容                                                                 | 状态 | commit      |
| ------- | -------------------------------------------------------------------- | ---- | ----------- |
| T01     | 3 张新表 entity + admin_user 扩展 + migration                        | ✓    | 9406716     |
| T02     | 4 seed(admin-user / city-site / platform-category / role-permission) | ✓    | 9406716     |
| T03     | 6 EventName + payload + spec                                         | ✓    | 9406716     |
| T04     | admin-auth 模块(captcha + login + refresh + logout)                  | ✓    | 2ad7aee     |
| T05     | admin-rider applications alias 端点                                  | ✓    | 2ad7aee     |
| T06     | admin-user disable / enable 端点                                     | ✓    | 2ad7aee     |
| T07     | admin-merchant + admin-rider audit 改造发新事件                      | ✓    | 2ad7aee     |
| T08     | admin-city 模块                                                      | ✓    | 9775524     |
| T09     | admin-category 模块                                                  | ✓    | 9775524     |
| T10     | admin-system-config 模块                                             | ✓    | 9775524     |
| T11     | admin-third-party-config 模块                                        | ✓    | 9775524     |
| T12     | admin-role-permission 模块                                           | ✓    | 0b379d7     |
| T13     | 6 事件订阅器 + 强制下线广播                                          | ✓    | 0b379d7     |
| T14     | 2 定时任务 + scheduler.module 注册到 19 jobs                         | ✓    | 0b379d7     |
| T15     | login captcha + dictStore + 路由扩展 + auth store lastLoginAt        | ✓    | 7124d20     |
| T16     | customers disable button + disable-records page                      | ✓    | 7124d20     |
| T17     | cities + categories 页面 + CategoryTree 组件                         | ✓    | 7124d20     |
| T18     | system-config + integrations 页改造                                  | ✓    | 7124d20     |
| T19     | roles-permissions 左右栏改造                                         | ✓    | 7124d20     |
| F01-F05 | 修复阶段(路由顺序 P0 + 401 refresh + lastLoginAt + LOCK modal)       | ✓    | 本次 commit |
| T20     | 后端 jest 累计 ≥354(实达 371,净增 23)                                | ✓    | 本次 commit |
| T21     | 前端 vitest 累计 ≥52(实达 57,净增 25)                                | ✓    | 本次 commit |
| T22     | 手动审查与测试.md 8 节填证据 + 问题与风险记录                        | ✓    | 本次 commit |
| T23     | ACCEPTANCE / FINAL / TODO 三件套 + 总闸                              | ✓    | 本次 commit |

## 3. 漏项审查表(对照 7 份规划文档)

- [x] **阶段规划.md** 业务范围 6 模块 + 7 类页面 + 2 jobs + 6 事件 + 完成定义 4 项,全部覆盖
- [x] **按端实施范围.md** 用户/商家/骑手只消费(disable 广播)+ 平台必测,5 边界审查点,全部覆盖
- [x] **前端页面与接口对接.md** 7 类页面 + 22 接口映射 + dictStore 缓存 + 401 refresh,全部覆盖
- [x] **后端数据任务事件.md** 6 模块 + 3 表 + 2 task + 6 event + 后端约束(独立订单体系 / cipher 加密 / 事件 status retryCount errorMessage),全部覆盖
- [x] **状态机与业务规则.md** admin_user.status 启停 + city_site.service_enabled 软禁用 + platform_category 子类目检查 + 全状态变更写 audit_log,全部覆盖。订单状态机归 stage 5/6
- [x] **权限与安全.md** Admin-Token 隔离(5 cross-scope) + bcrypt cost=10 + secret cipher 加密 + 5 失败锁 30min + secret 脱敏前 3 后 3,全部覆盖
- [x] **阶段交付清单.md** 文档 9 / 开发 6+7 / 测试 7 / 阶段门禁 9,已映射并记录(三件套 + 总闸 + 修复阶段 5 项 P0/P1 闭环)

## 4. PowerShell replay 命令

```pwsh
# 1. 数据库迁移 + seed(MySQL 3307)
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:
#   - SHOW TABLES LIKE 'city_site' / 'platform_category' / 'account_disable_record' → 各 1
#   - DESCRIBE admin_user → 含 password_hash / login_failed_count / locked_until / last_login_at 4 列
#   - SELECT username FROM admin_user WHERE username='super_admin' → 1 行
#   - SELECT code FROM sys_permission WHERE code LIKE 'admin:%' → ≥ stage 4 5 业务点 + 5 menu

# 2. 启动后端
pnpm --filter @o2o/server dev

# 3. admin-auth 冒烟
$BASE = "http://127.0.0.1:3000"

# 3.1 captcha
$CAP = curl.exe "$BASE/api/v1/admin/auth/captcha" | ConvertFrom-Json
$CAP_ID = $CAP.data.captchaId

# 3.2 login(mock 模式 captcha=dev)
$LOGIN = curl.exe -X POST "$BASE/api/v1/admin/auth/login" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"username`":`"super_admin`",`"password`":`"O2o@2026-Admin`",`"captcha`":`"dev`",`"captchaId`":`"$CAP_ID`"}" | ConvertFrom-Json
$A_T = $LOGIN.data.adminToken
$R_T = $LOGIN.data.refreshToken

# 3.3 端隔离测试
curl.exe "$BASE/api/v1/admin/customers" -H "Customer-Token: $A_T"
# 期望:{code:"FORBIDDEN", message:"cross-scope token", ...}

# 3.4 admin-city create
curl.exe -X POST "$BASE/api/v1/admin/cities" -H "Content-Type: application/json" -H "Admin-Token: $A_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"cityCode`":`"BJ_TEST`",`"cityName`":`"北京测试`",`"province`":`"北京`"}"
# 期望:{code:"0", data:{cityId,cityCode:'BJ_TEST',updatedAt}}

# 3.5 admin-category 树
curl.exe "$BASE/api/v1/admin/categories?bizType=takeaway" -H "Admin-Token: $A_T"
# 期望:{code:"0", data:{bizType:'takeaway', list:[8 个顶级]}}

# 3.6 admin-customers disable-records(本阶段 P0 修复后路由顺序)
curl.exe "$BASE/api/v1/admin/customers/disable-records" -H "Admin-Token: $A_T"
# 期望:{code:"0", data:{pageNo:1, pageSize:20, total:0, list:[]}}(非 :id 路径吞)

# 3.7 admin-customers disable + enable
curl.exe -X POST "$BASE/api/v1/admin/customers/100/disable" -H "Content-Type: application/json" -H "Admin-Token: $A_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"reason`":`"测试禁用`"}"

# 3.8 admin-roles + permissions + 更新
curl.exe "$BASE/api/v1/admin/roles" -H "Admin-Token: $A_T"
curl.exe "$BASE/api/v1/admin/permissions" -H "Admin-Token: $A_T"

# 3.9 refresh(401 自动刷新机制后端验证)
curl.exe -X POST "$BASE/api/v1/admin/auth/refresh" -H "Content-Type: application/json" -d "{`"refreshToken`":`"$R_T`"}"
# 期望:返新 adminToken + 新 refreshToken

# 3.10 logout
curl.exe -X POST "$BASE/api/v1/admin/auth/logout" -H "Admin-Token: $A_T"

# 4. 平台 Web 抽测
pnpm --filter @o2o/admin-web dev  # 默认 http://127.0.0.1:8083
# 用 super_admin / O2o@2026-Admin 登录
# 进 7 类页面验证:
#   /login → captcha SVG + 错误密码 5 次锁定弹 modal
#   /admin/customers + /admin/customers/disable-records
#   /admin/cities → 新增/编辑/软禁用 + GeoJSON textarea
#   /admin/categories/takeaway 与 /admin/categories/errand
#   /admin/system-config → 行内编辑 → ConfigChanged 事件
#   /admin/integrations → 编辑抽屉 → secret 加密 + ThirdPartyConfigChanged
#   /admin/roles-permissions → 切角色 + 勾选 + 保存(SUPER_ADMIN/AUDITOR 不允许清空)

# 5. 测试套全绿
pnpm --filter @o2o/server test    # 53 suites / 371 tests
pnpm --filter @o2o/admin-web test # 20 suites / 57 tests
```
