# 阶段 3 — 骑手端 APP 入驻接单与配送基础 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

> 本文以 ALIGNMENT\_阶段3.md 中所有决策(D-1/D-2/D-3/D-4 + 14 项自动决策)为基础。如用户调整任一决策,刷本文同步。

## 1. 验收标准(AC)

### 后端

- **AC-01**:8 张业务表 entity + migration + 4 权限点 seed 全部就位。`pnpm --filter @o2o/server typeorm:migration:show` 显示 `Stage3Init1714867500000` 已 applied;`SHOW TABLES LIKE 'rider_%'` 出现 8 张。
- **AC-02**:6 模块上线。`apps/server/src/modules/{rider-auth,rider-onboarding,rider-profile,rider-location,rider-task-pool,admin-rider}/` 6 个目录;每个有 `*.module.ts` 注册到 `app.module.ts`。
- **AC-03**:16 接口契约实现(rider 端 11 + admin 端 5)。前后端字段名一致(timestamps 单位毫秒;距离单位米;金额单位分)。
- **AC-04**:`RiderJwtGuard` 端隔离生效。Customer/Merchant/Admin Token 调 `/api/v1/r/**` → FORBIDDEN(cross-scope token);Rider Token 调 `/api/v1/m/**` / `/c/**` / `/admin/**` → FORBIDDEN。新增 ≥ 6 个 cross-scope 测试。
- **AC-05**:骑手入驻自动建关联流程。`RiderApprovedSubscriber` 在事务中创建 `rider_status`(online_status='offline')+ 默认空 `rider_service_area` 1 行 + UPDATE `rider_account` 权威字段(realName / idCardNo / healthCertNo / healthCertExpiry / approvedAt),任一失败回滚,事件总线走 retry job。
- **AC-06**:5 领域事件 100% `domain.rider.*` 前缀。`Object.values(EventName)` 共 21 个(stage 0 五 + stage 1 五 + stage 2 六 + stage 3 五)。
- **AC-07**:4 定时任务可手动触发。`POST /admin/scheduler/trigger/<job>` 4 个新 job 名 + stage 0/1/2 已有 13 个 = **17 个全部可触发**。
- **AC-08**:心跳超时下线机制。`RiderHeartbeatTimeoutOfflineJob` 每分钟扫描 `last_heartbeat_at < now()-60s` 且 `online_status='online'` 的 rider,UPDATE 为 offline + 发布 `domain.rider.offline` reason='heartbeat-timeout'。
- **AC-09**:健康证到期下线。`RiderHealthCertExpiryReminderJob` 每日 8:00 扫描 expiry 在 7 天内或已过期 → 写 `rider_audit_log` reminder 行;过期则强制下线(发 offline 事件)。
- **AC-10**:位置批量上报。`POST /api/v1/r/location/batch` 接收数组(≤50 点),事务 INSERT;同步刷新 `rider_status.last_heartbeat_at`;触发 `domain.rider.location-updated`(批粒度 1 事件,payload 含 batchSize)。
- **AC-11**:平台审核完整流程。`POST /api/v1/admin/riders/:applicationId/audit` 写 audit_status + 通过时发布 `domain.rider.approved` + 自动建关联(订阅器);驳回时填 reject_reason + 写 rider_audit_log;同步幂等(已是目标态返当前结果不重发事件)。
- **AC-12**:admin-rider 详情接口 mobile / idCardNo / realName / healthCertNo 走 @Mask 脱敏。
- **AC-13**:接单大厅骨架。`GET /api/v1/r/tasks/available` 返回 `{items:[], total:0}`;校验:rider 必须 approved + online + 在 service area 内才走过滤逻辑(无源订单则返空)。

### 前端 - 骑手 APP

- **AC-14**:骑手 APP 10 页(11 路由含 onboarding 5 页)交付。`pages.json` 注册 11 路由;`pnpm --filter @o2o/rider-app build:app` 构建通过。
- **AC-15**:骑手 APP `auth store` 复刻 merchant-app 模式(refresh / logout / 倒计时持久化 / jti 黑名单);共用组件 `MobileInput` / `SmsCodeInput` / `IdCardInput` / `UploadField` 独立创建(避免跨 app 依赖)。
- **AC-16**:骑手 APP build 脚本只留 `build:app`(沿用 stage 2 D-1 同款约束);H5/小程序仅 dev 用,README 说明。
- **AC-17**:工作台上线按钮按规则禁用:未审核 / 健康证过期 / 定位权限关闭 → 按钮禁用 + 文案提示。

### 前端 - 平台 Web

- **AC-18**:平台 Web 骑手管理 4 页交付。4 路由(`/admin/riders/audit` / `/admin/riders/:id` / `/admin/riders/status` / `/admin/riders/delivery-area`)注册;`router/index.ts` 累计注册 10 路由(stage 1 customers 3 + stage 2 merchants 3 + stage 3 riders 4)。
- **AC-19**:`v-permission` 控审核 / 启停按钮显隐;无 `admin:riders:manage` 权限完全不渲染按钮。AUDITOR 默认能查不能审。

### 测试 / 验收

- **AC-20**:后端 jest 净增 ≥ 80(预估)。`pnpm --filter @o2o/server test` 全绿;含端隔离 6 测试 + 状态机非法流转 + audit 幂等 + 位置批量 50 上限 + 心跳超时下线 + 健康证过期。
- **AC-21**:前端 vitest 净增 ≥ 30。rider-app 8+ spec + admin-web 4+ spec;全绿。
- **AC-22**:全 monorepo 总闸 `pnpm -r build / test / lint / format:check` 四绿;`git status` 干净。
- **AC-23**:`项目阶段规划/03-阶段3-.../手动审查与测试.md` 8 节填证据,P0/P1=0;`docs/阶段3-骑手入驻接单配送/{ACCEPTANCE,FINAL,TODO}_阶段3.md` 三件套就位。

## 2. 技术约束(沿用 stage 0/1/2)

| 约束          | 实现方式                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| 时间戳列类型  | 全部 `BIGINT` 毫秒(沿用 stage 0/1/2)                                                                          |
| 主键命名      | `<table>_id`                                                                                                  |
| 事件命名      | `domain.<biz>.<verb>` 全小写连字符                                                                            |
| 距离单位      | 米(integer);DTO/VO 同名 `distance`                                                                            |
| 金额单位      | 分(BIGINT);DTO/VO 同名 `reward` / `price`                                                                     |
| 服务区几何    | `JSON` 类型 GeoJSON Polygon(沿用 stage 2 D-3)                                                                 |
| 第三方适配器  | 扩展 `realname.adapter.ts` `verifyFace`(per D-1);扩展 `getui.adapter.ts` `bindDevice`/`unbindDevice`(per D-2) |
| 第三方枚举    | `ThirdPartyProvider` **不动**(沿用 ali-realname / getui)                                                      |
| 文件 bizType  | `RIDER_REALNAME` / `RIDER_HEALTH` 已就位(stage 0),无需扩枚举                                                  |
| 骑手 APP 打包 | `build:app` 唯一 production 命令(沿用 stage 2 D-1 同款约束)                                                   |
| jti 黑名单    | 复用 stage 1 ScopeJwtGuard 的 Optional Redis 检查;rider logout 写 `jti:revoked:*`,prefix 区分 `rider:`        |
| 自动建关联    | 全部走 `RiderApprovedSubscriber` + dataSource.transaction(per AC-05)                                          |
| 位置存储      | MySQL `rider_location` 表 + 7 天清理 job(per D-3);**不**上 Redis ZSET / MongoDB                               |
| 接单大厅      | 只读骨架返空数组(per D-4);字段定义齐全等 stage 5/6                                                            |

## 3. 集成方案

### 3.1 与 stage 0 集成

| 集成点                                 | stage 0 提供     | stage 3 使用                                                       |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| RiderJwtGuard                          | 已实现           | T03~T08 全部 controller 挂                                         |
| @RequirePermission + PermissionGuard   | 已实现           | T03~T08 全部 controller 挂 `rider:self` 等                         |
| Idempotency / Audit / Mask 装饰器      | 已实现           | 全模块                                                             |
| ResponseInterceptor + ApiResponse      | 已实现           | controller 透明                                                    |
| IntegrationGatewayService + 8 adapters | 已实现           | T02 加 verifyFace + bindDevice + unbindDevice                      |
| BaseJob + DistributedLockService       | 已实现           | T09 4 job 继承                                                     |
| DomainEventBus                         | 已实现           | T10 加 5 EventName + 5 订阅器                                      |
| FileObject + /pub/files/upload         | 已实现           | T04 上传 5 资质文件(身份证正/反 + 人脸 + 健康证 + 驾驶证 + 行驶证) |
| 数据源 + 迁移 + 种子                   | 已实现           | T01 加 1 migration + 扩 seed                                       |
| ScopeTokenHeader / PathPrefix          | contracts 已就位 | 所有 controller / DTO                                              |

### 3.2 与 stage 1 / 2 集成

| 集成点                                   | 来源         | stage 3 借鉴                              |
| ---------------------------------------- | ------------ | ----------------------------------------- |
| sms.service                              | stage 1      | T03 rider-auth 直接复用(mobile + scene)   |
| customer-auth → merchant-auth 模板       | stage 1/2    | T03 rider-auth 同款复刻并改前缀 `/r/auth` |
| merchant-onboarding 模板                 | stage 2      | T04 rider-onboarding 同款复刻             |
| MerchantApprovedSubscriber 事务模板      | stage 2      | T10 RiderApprovedSubscriber 同款          |
| admin-merchant 5 接口模板                | stage 2      | T08 admin-rider 同款复刻                  |
| Pinia auth store 模式                    | merchant-app | T11 rider-app/stores/auth.ts 复刻         |
| MobileInput / SmsCodeInput / UploadField | merchant-app | T11 复制(命名空间 rider)                  |
| admin-web v-permission + dictStore       | stage 1      | T15 admin-web 骑手页直接用                |
| api/admin-merchants.ts 模板              | stage 2      | T15 api/admin-riders.ts 同款结构          |
| @IsGeoJsonPolygon 自定义验证器           | stage 2      | T08 service-area 配置接口直接用           |

## 4. 任务边界限制

### 严格不做

- 完整配送闭环(stage 5 外卖、stage 6 跑腿)
- 骑手收益 / 提现 / 结算(stage 8)
- 复杂调度规则 / 订单匹配算法(stage 8)
- 真第三方 SDK 接入(stage 11)
- APP 推送实际发送(只 mock providerRequestId)
- Redis ZSET 实时位置 / MongoDB 轨迹归档(stage 8 升级)
- 信用分计算 / 服务等级 / 评分(本阶段字段就位但无业务规则)

### stage 3 必做的扩展接口(规划文档未显式列,但 DESIGN 中显式定义)

为支撑前端页面正常运转,DESIGN 里要补齐:

- `POST /api/v1/r/auth/sms-code` + `POST /r/auth/login` + `POST /r/auth/refresh` + `POST /r/auth/logout`(rider-auth 4 接口,与 merchant-auth 同款但前缀 `/r/auth`)
- `GET /api/v1/r/profile`(查自己资料)+ `PATCH /api/v1/r/profile`(更新)
- `GET /api/v1/admin/riders`(列表 + 分页 + 筛选)+ `GET /admin/riders/:id`(详情)
- `POST /api/v1/admin/riders/:id/status`(启停 enable/disable)
- (可选)`PATCH /api/v1/admin/riders/:id/service-area`(配送区域配置 - SUPER_ADMIN)

总接口数:**契约 6 + 扩展 10 = 16 个**(rider 端 11:auth 4 + onboarding 2 + profile 2 + location 2 + task-pool 1;admin 端 5:list + detail + audit + status + service-area;公开 0;callback 留 stage 11)。

## 5. 不确定性已解决清单

- ✅ stage 0/1/2 基建复用范围(见 §3.1 / §3.2)
- ✅ D-1/D-2/D-3/D-4 四个核心决策(见 ALIGNMENT §4.1~4.4)
- ✅ 14 项自动决策(见 ALIGNMENT §5)
- ✅ AC 23 条(本文 §1)
- ✅ 隐含扩展接口(本文 §4)
- ⏳ 待 DESIGN 阶段:8 表 schema 详细字段、14 接口 DTO 字段、5 事件 payload、4 任务 cron 与 lock key、状态机详细转换矩阵、5 sequence 数据流图

## 6. 阶段 3 完成定义(Done = 全部勾选)

- [ ] AC-01 ~ AC-23 全部 verified
- [ ] `pnpm -r build` ✓
- [ ] `pnpm -r test` ✓
- [ ] `git status` 干净 + 1 个最终汇总 commit
- [ ] `项目阶段规划/03-.../手动审查与测试.md` P0/P1 = 0
- [ ] `docs/阶段3-骑手入驻接单配送/{ACCEPTANCE,FINAL,TODO}_阶段3.md` 三件套就位
- [ ] 用户人工抽测(MySQL 跑通 migration + 14 接口 curl + 平台 Web 浏览器抽测 + 骑手 APP HBuilderX 真机抽测)→ 留 TODO
