# 阶段 3 — 骑手端 APP 入驻接单与配送基础 · 验收文档(ACCEPTANCE)

## 1. AC 23 条逐条验证

### 后端

| AC    | 内容                                       | 状态 | 证据                                                                                                                       |
| ----- | ------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | 8 张表 + migration + 4+1 权限 seed         | ✓    | `migrations/1714867500000-Stage3Init.ts` + `role-permission.seed.ts` 加 5 sys_permission                                   |
| AC-02 | 6 模块 + module/service/controller/dto     | ✓    | `apps/server/src/modules/{rider-auth,rider-onboarding,rider-profile,rider-location,rider-task-pool,admin-rider}/` 6 个目录 |
| AC-03 | 16 接口契约实现(rider 端 11 + admin 5)     | ✓    | DESIGN § 4 + 全部 controller 路径                                                                                          |
| AC-04 | RiderJwtGuard 端隔离 + 6+ cross-scope 测试 | ✓    | `rider-auth.cross-scope.spec.ts` 8 测试覆盖 4 端两两组合                                                                   |
| AC-05 | RiderApprovedSubscriber 事务自动建关联     | ✓    | `rider-approved.subscriber.spec.ts` 3 测试(建 status + 建 area + UPDATE 权威字段 + 幂等)                                   |
| AC-06 | 5 事件 domain.rider.\* + EventName 计数 21 | ✓    | `events.stage3.spec.ts` + stage1/stage2 计数 spec 已同步 21                                                                |
| AC-07 | 17 jobs 全注册可触发(stage 0/1/2/3 累加)   | ✓    | `scheduler.module.ts` providers 数组 17 项                                                                                 |
| AC-08 | 心跳超时下线机制                           | ✓    | `rider-heartbeat-timeout-offline.job.ts` Cron 每分钟 + 发 RiderOffline reason='heartbeat-timeout'                          |
| AC-09 | 健康证到期下线 + reminder                  | ✓    | `rider-health-cert-expiry-reminder.job.ts` 8:00 扫 + 7 天内/已过期分支                                                     |
| AC-10 | 位置批量上报 ≤50 + 心跳 + 1 事件           | ✓    | `rider-location.service.spec.ts` 50 上限测试 + 1 RiderLocationUpdated 事件                                                 |
| AC-11 | 平台审核流程 + 幂等 + RiderApproved 事件   | ✓    | `admin-rider.service.spec.ts`(approved/rejected/已是目标态不重发)                                                          |
| AC-12 | admin-rider 详情 @Mask 脱敏                | ✓    | `admin-rider.dto.ts` mobile/idCardNo/realName/healthCertNo @Mask                                                           |
| AC-13 | 接单大厅骨架返空数组                       | ✓    | `rider-task-pool.service.spec.ts` 9 测试                                                                                   |

### 前端 - 骑手 APP

| AC    | 内容                                    | 状态 | 证据                                                                                                  |
| ----- | --------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| AC-14 | 10 页 + 11 路由 + build:app 通过        | ✓    | `pages.json` 11 业务路由 + 4 stage 0 错误占位                                                         |
| AC-15 | auth store 复刻 merchant + 共用组件独立 | ✓    | `stores/auth.ts` 11 测试 + `components/common/{MobileInput,SmsCodeInput,IdCardInput,UploadField}.vue` |
| AC-16 | build 唯一 build:app(沿用 stage 2 D-1)  | ✓    | `package.json` build = `uni build -p app`                                                             |
| AC-17 | workbench 上线按钮按规则禁用            | ✓    | `pages/workbench/index.vue` canGoOnline computed + reasonText                                         |

### 前端 - 平台 Web

| AC    | 内容                             | 状态 | 证据                                                                         |
| ----- | -------------------------------- | ---- | ---------------------------------------------------------------------------- |
| AC-18 | 4 页 + 4 路由(累计 11 路由)      | ✓    | `router/index.ts` admin/riders/{audit,applications/:id,status,delivery-area} |
| AC-19 | v-permission 控审核/启停按钮显隐 | ✓    | detail/status/delivery-area 中 `v-if="userStore.has('admin:riders:manage')"` |

### 测试 / 验收

| AC    | 内容                                                 | 状态 | 证据                                                                           |
| ----- | ---------------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| AC-20 | 后端 jest 净增 ≥80 + 全绿                            | ✓    | 41 suites / 274 tests pass(stage 2 base 194 → 净增 80)                         |
| AC-21 | 前端 vitest 净增 ≥30 + 全绿                          | ✓    | rider-app 28 + admin-web 22 = 50;stage 3 净增 31(rider-app +24 / admin-web +7) |
| AC-22 | 全 monorepo build/test/lint/format 四绿 + 工作树干净 | ⏳   | T24-T26 总闸                                                                   |
| AC-23 | 手动审查 P0/P1=0 + 三件套就位                        | ✓    | 手动审查与测试.md / ACCEPTANCE / FINAL / TODO 全部就位                         |

## 2. 27 任务自审表

| Task | 内容                                                                     | 状态 | commit                         |
| ---- | ------------------------------------------------------------------------ | ---- | ------------------------------ |
| T01  | 8 表 entity + migration + seed                                           | ✓    | cec99de                        |
| T02  | realname.verifyFace + getui.bindDevice/unbindDevice + spec               | ✓    | cec99de                        |
| T03  | rider-auth 4 端点(sms-code/login/refresh/logout)+ 7 spec                 | ✓    | 30c7784                        |
| T04  | rider-onboarding submit + status + 10 spec                               | ✓    | 30c7784                        |
| T05  | rider-profile GET/PATCH + 6 spec                                         | ✓    | 30c7784                        |
| T06  | rider-location online-status + batch + 9 spec                            | ✓    | de33c2a                        |
| T07  | rider-task-pool 骨架 + 9 spec                                            | ✓    | de33c2a                        |
| T08  | admin-rider 5 端点 + 12 spec                                             | ✓    | de33c2a                        |
| T09  | 4 定时任务 + scheduler.module 注册到 17 jobs                             | ✓    | febea7a                        |
| T10  | 5 事件订阅器 + RiderApproved 自动建关联 spec                             | ✓    | febea7a                        |
| T11  | rider-app stores/auth + login 2 页 + utils/request 401 refresh + 11 spec | ✓    | 6c47218                        |
| T12  | rider-app onboarding 5 页 + draft 持久化                                 | ✓    | 6c47218                        |
| T13  | rider-app workbench 1 页 + 30s 心跳                                      | ✓    | 6c47218                        |
| T14  | rider-app tasks/available 1 页                                           | ✓    | 6c47218                        |
| T15  | rider-app profile 1 页 + 编辑 + logout                                   | ✓    | 6c47218                        |
| T16  | pinia 安装 + pages.json 11 路由 + build:app 通过                         | ✓    | 6c47218                        |
| T17  | admin-web 4 页 + 2 组件 + api/admin-riders + 4 路由 + 7 spec             | ✓    | 24f39c4                        |
| T18  | 后端 jest ≥80(实达 80 净增)                                              | ✓    | 本次 commit                    |
| T19  | 前端 vitest ≥30(实达 31 净增)                                            | ✓    | 本次 commit                    |
| T20  | 手动审查与测试.md 8 节填证据                                             | ✓    | 本次 commit                    |
| T21  | ACCEPTANCE\_阶段3.md                                                     | ✓    | 本次 commit                    |
| T22  | FINAL\_阶段3.md                                                          | ✓    | 本次 commit                    |
| T23  | TODO\_阶段3.md                                                           | ✓    | 本次 commit                    |
| T24  | 总闸 build/test/lint/format:check 四绿                                   | ⏳   | 本次 commit 前跑               |
| T25  | 端隔离回归测试                                                           | ✓    | rider-auth.cross-scope.spec.ts |
| T26  | 漏项审查表逐条勾(本表)                                                   | ✓    | 本节                           |
| T27  | 最终汇总 commit                                                          | ⏳   | 本次                           |

## 3. 漏项审查表(对照 7 份规划文档)

- [x] **阶段规划.md** 业务范围 6 模块 + 10+4 页面 + 第三方 4 依赖 + 完成定义 4 项,全部覆盖
- [x] **按端实施范围.md** 用户/商家不涉及 + 骑手/平台必测 + 端间数据流 + 5 边界审查点,全部覆盖
- [x] **前端页面与接口对接.md** 14 页 + 6 关键接口映射 + 接口对接总则(API 常量/loading/状态枚举权威/金额分),全部覆盖
- [x] **后端数据任务事件.md** 6 模块 + 8 表 + 4 task + 5 event + 后端约束(独立订单体系 / adapter / 事件 status retryCount errorMessage),全部覆盖
- [x] **状态机与业务规则.md** 业务规则 4 + 状态审查要求(后端枚举唯一权威 / 非法流转 STATUS_INVALID / 状态变更写日志),全部覆盖。全局规则(15 分钟未支付 / 5/10 分钟接单)归 stage 5/6/8
- [x] **权限与安全.md** Token 隔离 + 数据归属 + 8 安全检查(脱敏 / 限频 / 文件类型 / 关键写审计 / 第三方密钥不前端),全部覆盖
- [x] **阶段交付清单.md** 文档 9 / 开发 7 / 测试 7 / 阶段门禁 9,已映射并记录(三件套 + 总闸)

## 4. PowerShell replay 命令

```pwsh
# 1. 数据库迁移(MySQL 3307)
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:
#   - SHOW TABLES LIKE 'rider_%' → 8 张
#   - SELECT code FROM sys_permission WHERE code LIKE 'rider:%' OR code LIKE 'admin:riders:%' OR code='admin:menu:riders' → 5 行
#   - 角色绑定 RIDER → rider:self;AUDITOR → admin:riders:view + admin:menu:riders

# 2. 启动后端
pnpm --filter @o2o/server dev

# 3. 16 接口冒烟
$BASE = "http://127.0.0.1:3000"
$IDEM = [guid]::NewGuid()
$MOBILE = "13900001234"

# 3.1 sms-code
curl.exe -X POST "$BASE/api/v1/r/auth/sms-code" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" -d "{`"mobile`":`"$MOBILE`",`"scene`":`"login`"}"

# 3.2 login(取控制台 mock code 填入)
$LOGIN = curl.exe -X POST "$BASE/api/v1/r/auth/login" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"mobile`":`"$MOBILE`",`"code`":`"<mock>`",`"deviceId`":`"dev-curl`",`"platform`":`"app-android`"}" | ConvertFrom-Json
$R_T = $LOGIN.data.riderToken

# 3.3 上传 5 资质文件(用 stage 0 公共上传接口,bizType=rider-realname/rider-health)
# ...略,按实际需要

# 3.4 onboarding submit(替换 fileId)
curl.exe -X POST "$BASE/api/v1/r/onboarding/applications" -H "Content-Type: application/json" -H "Rider-Token: $R_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{...}"

# 3.5 status
curl.exe "$BASE/api/v1/r/onboarding/status" -H "Rider-Token: $R_T"
# 期望:auditStatus=pending,canResubmit=false

# 3.6 端隔离测试
curl.exe "$BASE/api/v1/admin/riders" -H "Rider-Token: $R_T"
# 期望:{code:"FORBIDDEN", message:"cross-scope token", ...}

# 3.7 admin 审核(用 stage 0 admin token:dev 脚本 token:dev:admin)
$ADMIN_T = (...)
curl.exe -X POST "$BASE/api/v1/admin/riders/<applicationId>/audit" -H "Admin-Token: $ADMIN_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"auditResult`":`"approved`"}"
# 期望:auditStatus=approved + 后端日志 [rider.approved] auto-create rider_status + service_area

# 3.8 上线
curl.exe -X PATCH "$BASE/api/v1/r/online-status" -H "Rider-Token: $R_T" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"targetStatus`":`"online`",`"deviceToken`":`"dev-curl`",`"platform`":`"android`"}"

# 3.9 位置上报
curl.exe -X POST "$BASE/api/v1/r/location/batch" -H "Rider-Token: $R_T" -H "Content-Type: application/json" -H "Idempotency-Key: B1" -d "{`"batchId`":`"B1`",`"points`":[{`"lng`":116.4,`"lat`":39.9,`"reportedAt`":1714867500000}]}"

# 3.10 接单大厅(返空骨架)
curl.exe "$BASE/api/v1/r/tasks/available" -H "Rider-Token: $R_T"
# 期望:{items:[], total:0}

# 4. 平台 Web 抽测
pnpm --filter @o2o/admin-web dev  # 默认 http://127.0.0.1:8083
# 用 SUPER_ADMIN mock token 登录,进 /admin/riders/audit 看列表 / 详情 / 审核 / 启停 / 配送区域

# 5. 骑手 APP 抽测(HBuilderX)
pnpm --filter @o2o/rider-app dev:app
# HBuilderX 打开 dist/dev/app 真机或模拟器调试
```
