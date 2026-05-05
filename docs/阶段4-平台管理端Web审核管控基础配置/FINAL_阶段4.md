# 阶段 4 — 平台管理端 Web 审核管控与基础配置 · 项目总结(FINAL)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 1. 总览

| 维度             | 数据                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 原子任务         | 23/23(开发 19) + 修复 5 项(F01-F05) + 测试与文档 4(T20-T23)                                                                                                                |
| 后端模块         | 6 业务(admin-auth / city / category / system-config / third-party / role)                                                                                                  |
| 数据表           | 3 新表 + admin_user 4 列                                                                                                                                                   |
| HTTP 接口        | 22(契约 22 全数实现)                                                                                                                                                       |
| 领域事件         | 6(全部 stage 4 新增,EventName 累计 27)                                                                                                                                     |
| 事件订阅器       | 6                                                                                                                                                                          |
| 定时任务         | 2(scheduler 累计 17 → 19)                                                                                                                                                  |
| 权限点           | 5 业务 + 5 menu(本阶段新增)                                                                                                                                                |
| 平台 Web 页面    | 7 类(login + customers + disable-records + cities + categories×2 + system-config + integrations + roles-permissions)+ CategoryTree 组件 + DisableDialog 组件(stage 1 沿用) |
| 后端 jest 测试   | 371(53 suites,stage 4 净增 23)                                                                                                                                             |
| 前端 vitest 测试 | admin-web 57(20 suites,stage 4 净增 25)                                                                                                                                    |

## 2. 能力矩阵

| 能力                                     | 端       | 入口                                  | 后端模块                                        | 状态 |
| ---------------------------------------- | -------- | ------------------------------------- | ----------------------------------------------- | ---- |
| 管理员登录(captcha + bcrypt + lock)      | 平台 Web | `/login` + svg-captcha 图             | admin-auth + Redis admin:captcha:\*             | ✓    |
| 5 次失败锁 30 min + ACCOUNT_LOCKED modal | 平台 Web | login_failed_count++ + locked_until   | admin-auth + STATUS_INVALID                     | ✓    |
| Token 刷新(401 自动单飞)                 | 平台 Web | utils/request ensureRefreshing        | admin-auth refresh + Redis admin:refresh:\*     | ✓    |
| 登出(jti 黑名单)                         | 平台 Web | layout 退出按钮                       | admin-auth logout + jti:revoked                 | ✓    |
| 端隔离(admin → c/m/r FORBIDDEN)          | 全端     | AdminJwtGuard + 5 cross-scope 测试    | auth + scope-jwt.guard                          | ✓    |
| 用户禁用 / 启用 + 强制下线广播           | 平台 Web | `/admin/customers` 行操作             | admin-user + AccountDisabled 事件 + Redis 标记  | ✓    |
| 禁用流水查询                             | 平台 Web | `/admin/customers/disable-records`    | admin-user listDisableRecords                   | ✓    |
| 商家审核改造(发 MerchantAudited)         | 平台 Web | stage 2 既有页 + 新事件               | admin-merchant.audit + 双事件并存               | ✓    |
| 骑手审核改造(发 RiderAudited)            | 平台 Web | stage 3 既有页 + 新事件               | admin-rider.audit + 双事件并存                  | ✓    |
| 城市站点 CRUD + GeoJSON                  | 平台 Web | `/admin/cities`                       | admin-city + cityCode 校验 + 软禁用             | ✓    |
| 平台类目双 tab(外卖/跑腿)+ 树            | 平台 Web | `/admin/categories/{takeaway,errand}` | admin-category + 子类目检查                     | ✓    |
| 系统参数 GET 全 + PATCH 单 key           | 平台 Web | `/admin/system-config`                | admin-system-config + ConfigChanged 事件        | ✓    |
| 第三方配置 secret 加密 + 脱敏            | 平台 Web | `/admin/integrations`                 | admin-third-party-config + cipher               | ✓    |
| 第三方配置变更 → reloadConfig 钩子       | 后端     | ThirdPartyConfigChangedSubscriber     | events.subscribers + IntegrationGateway         | ✓    |
| 角色权限编辑 + 内置角色保护              | 平台 Web | `/admin/roles-permissions`            | admin-role-permission + 事务覆盖 + RoleChanged  | ✓    |
| dictStore 60s 缓存(城市/类目/权限)       | 平台 Web | `stores/dict.ts`                      | -                                               | ✓    |
| 配置变更小时聚合 + 禁用 token 5min 广播  | 后端     | scheduler stage 4 +2 jobs             | scheduler/jobs/{config-aggr,disabled-broadcast} | ✓    |

## 3. 关键决策(用户已锁定)

### D-1 captcha → svg-captcha v1.4 + Redis 5min TTL + mock 模式 'dev' 跳过

`{ size:4, ignoreChars:'0o1lI', noise:2 }` → captchaId(uuid v4)+ Redis SETEX `admin:captcha:<id>` text TTL=300。mock 模式判断 `process.env.INTEGRATION_MODE === 'mock'`,captcha 输入 `dev` 跳过 Redis 校验。

### D-2 admin 默认账号 → super_admin / O2o@2026-Admin(bcrypt cost=10)

upsert seed,首次部署后用户必须改密。lockedUntil/loginFailedCount 均 BIGINT 时间戳;5 次失败锁 30 min,锁定窗口结束后自动解锁。

### D-3 JtiBlackList 4 端独立命名空间

key:`admin:jti:revoked:<adminId>` / `customer:jti:revoked:<customerId>` / `merchant:jti:revoked:<merchantId>` / `rider:jti:revoked:<riderId>`,SADD + 7 天过期(= max refresh TTL)。本阶段先以 `admin:role-revoked:<adminId>:<changedAt>` 标记 RoleChanged 影响,真撤销 jti 留 stage 5+。

### D-4 第三方配置 secret 加密策略

入参 secret 明文 → cipher.encrypt(stage 0 既有 aes256$ 前缀) → 存 secret_encrypted。GET/list 时不返 secret_encrypted,而是返 secretMasked = `xxx***xxx`(前 3 + \*\*\* + 后 3)。stage 8 真热更新由 IntegrationGateway.reloadConfig(provider) 接管。

## 4. 12 项业务自动决策(已落地)

| ID   | 决策                                                          | 落地位置                                                                                       |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 5.1  | BIGINT 时间戳                                                 | 3 张新表 + admin_user 4 新列                                                                   |
| 5.2  | 主键 `<table>_id`                                             | city_site_id / category_id / account_disable_record_id                                         |
| 5.3  | 事件命名 `domain.<biz>.<verb>` 全小写                         | events.ts AdminLoggedIn / RoleChanged / AccountDisabled / 双 audited / ThirdPartyConfigChanged |
| 5.4  | cityCode `^[A-Z0-9_]{2,16}$` 唯一                             | city_site UNIQUE + DTO @Matches                                                                |
| 5.5  | platform_category 严格双层(parent_id=0 顶级 / >0 二级)        | admin-category service + 删除子类目检查                                                        |
| 5.6  | sys_config GET 全部 + isSecret 脱敏                           | admin-system-config service                                                                    |
| 5.7  | secret 脱敏前 3 + \*\*\* + 后 3                               | admin-third-party-config maskSecret                                                            |
| 5.8  | 5 业务权限 + 5 menu(SUPER_ADMIN 全绑 / AUDITOR menu 只读)     | role-permission.seed.ts                                                                        |
| 5.9  | account_disable_record 流水 + 操作人 + reason                 | admin-user + AccountDisabledSubscriber                                                         |
| 5.10 | merchant/rider audited 事件双发(approved 兼容 + audited 全集) | admin-merchant + admin-rider 改造                                                              |
| 5.11 | scheduler 累计 19 jobs(stage 0 5 + 1 7 + 2 4 + 3 1 + 4 2)     | scheduler.module.ts providers                                                                  |
| 5.12 | 装饰器约定 @Idempotent + @Audit + @Mask + @RequirePermission  | 全 stage 4 controller 严格约束                                                                 |
| 5.13 | dictStore 60s 缓存(城市/类目/权限/状态映射)                   | stores/dict.ts                                                                                 |
| 5.14 | 5 cross-scope 测试 admin → c/m/r/admin/伪造                   | admin-auth.cross-scope.spec.ts                                                                 |

## 5. 修复阶段(F01-F05)

本次开发自审发现 5 项规划文档明确写但实现遗漏的问题,统一修复闭环:

| 修复 | 级别 | 文件                                         | 问题                                    | 修复                                                      |
| ---- | ---- | -------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| F01  | P0   | admin-user.controller.ts                     | `:id` 在 `disable-records` 之前注册被吞 | 调换顺序,具体路径段先注册                                 |
| F02  | P1   | admin-web/src/api/admin-auth.ts              | 缺 refresh() 调用函数                   | 补 RefreshReq/Vo + refresh() 函数(skipAuthRefresh 防递归) |
| F03  | P1   | admin-web/src/utils/request.ts               | 401 不自动 refresh                      | 实现 ensureRefreshing 单飞 + 队列 + retry 标记            |
| F04  | P1   | admin-web/src/views/login/index.vue + layout | 不显示 lastLoginAt                      | 成功 toast + layout header lastLoginText                  |
| F05  | P1   | admin-web/src/views/login/index.vue          | 无 ACCOUNT_LOCKED modal                 | STATUS_INVALID → ElMessageBox.alert(锁定/禁用差异化)      |

## 6. 提交记录

```
9406716  feat(stage-4): T01-T03 schema + seeds + 6 stage4 events
2ad7aee  feat(stage-4): T04-T07 admin-auth + admin-rider/user/merchant 扩展
9775524  feat(stage-4): T08-T11 admin-city / category / system-config / third-party-config
0b379d7  feat(stage-4): T12-T14 admin-role-permission + 6 subscribers + 2 jobs
7124d20  feat(stage-4): T15-T19 admin-web 页面与 dictStore
本次     feat(stage-4): F01-F05 修复 + T20-T23 测试与验收文档
```
