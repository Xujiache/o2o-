# 阶段 3 — 骑手端 APP 入驻接单与配送基础 · 对齐文档(ALIGNMENT)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目上下文

### 1.1 stage 0/1/2 已交付的可复用基建

| 类别            | 资产                                                                                    | stage 3 复用方式                                                                |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 4 端守卫        | `ScopeJwtGuard` 抽象 + 4 子类(Customer/Merchant/Rider/Admin)+ Optional Redis jti 黑名单 | T03 rider-auth 直接挂 `RiderJwtGuard`(已就位,无需扩展)                          |
| 权限            | `@RequirePermission` + `PermissionGuard` + sys_role / sys_permission                    | T01 seed 加 4 新权限点;预置角色 `RIDER` 在 stage 0 已就位                       |
| 装饰器          | `@Idempotent` / `@Audit` / `@Mask` / `@RequirePermission`                               | 全模块沿用                                                                      |
| 响应            | `ResponseInterceptor` ApiResponse 包装 + `AllExceptionsFilter`                          | controller 透明继承                                                             |
| 第三方网关      | `IntegrationGatewayService` + 8 adapter + `integration_request_log` 表                  | T02 扩展 `realname.adapter.verifyFace()` + `getui.adapter.bindDevice()`         |
| 调度            | `BaseJob` + `DistributedLockService` + `SchedulerController` + dev-mode trigger         | T09 4 个新 job 注册                                                             |
| 事件总线        | `DomainEventBus.publish` + `domain_event` 表 + `DomainEventRetryJob`                    | T10 加 5 EventName + 5 订阅器                                                   |
| 文件 bizType    | `FileBizType.RIDER_REALNAME` / `RIDER_HEALTH` 已就位(stage 0)                           | T04 onboarding 直接用,无需扩枚举                                                |
| 自动建关联      | stage 2 `MerchantApprovedSubscriber` 事务模板                                           | T10 `RiderApprovedSubscriber` 同款,事务建 `rider_status` + `rider_service_area` |
| auth store 模板 | `apps/merchant-app/src/stores/auth.ts`(Pinia + 持久化 + refresh + jti 黑名单)           | T11 rider-app/stores/auth.ts 复刻                                               |

### 1.2 当前 monorepo 状态

- commit `698be9b` (stage 2 final)
- `pnpm -r test` 全绿(server 194 / customer-app 25 / merchant-app 21 / admin-web 15 / rider-app 4 / api-client 3)
- `pnpm -r build` 全绿
- MySQL 3307 / Redis 6379 / Mongo 27017
- `apps/rider-app/` 是 stage 0 留的 Uni-app 占位项目(`pages/login/index.vue` 占位 + `pages/permission/location.vue`)

### 1.3 stage 3 要交付的范围(规划文档点名,不多做不少做)

| 维度       | 数量 / 内容                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 后端模块   | 6:`rider-auth` / `rider-onboarding` / `rider-profile` / `rider-location` / `rider-task-pool` / `admin-rider`                                                   |
| 数据表     | 8:`rider_account` / `rider_application` / `rider_certificate` / `rider_vehicle` / `rider_service_area` / `rider_status` / `rider_location` / `rider_audit_log` |
| 定时任务   | 4:骑手心跳超时下线 / 健康证到期提醒 / 审核超时提醒 / 位置点清理或归档                                                                                          |
| 领域事件   | 5:`RiderSubmitted` / `RiderApproved` / `RiderOnline` / `RiderOffline` / `RiderLocationUpdated`                                                                 |
| 骑手 APP   | 10 页:登录 / 入驻认证 / 人脸核验 / 健康证上传 / 车辆信息 / 审核进度 / 工作台 / 上线下线按钮 / 接单大厅 / 个人资料                                              |
| 平台 Web   | 4 页:骑手审核列表 / 骑手审核详情 / 骑手账号状态 / 配送区域配置                                                                                                 |
| HTTP 接口  | 16:rider-auth 4 + onboarding 2 + profile 2 + location 2 + task-pool 1 + admin-rider 5(list+detail+audit+status+service-area)                                   |
| 第三方依赖 | 4:实名人脸核验(扩 realname.adapter)/ 地图定位(stage 0 amap.adapter 已有)/ 文件上传(stage 0 已有)/ APP 推送设备绑定(扩 getui.adapter)                           |

## 2. 原始需求(来自 `项目阶段规划/03-阶段3-骑手端APP-入驻接单与配送基础/`)

- **阶段规划.md**:骑手 APP 入驻、审核、上线下线、接单大厅、定位上报。本阶段不做完整配送闭环、收益提现、复杂调度规则。
- **按端实施范围.md**:骑手端 Android/iOS APP 为主,平台 Web 提供审核和启停,用户/商家端只消费骑手基础状态。
- **前端页面与接口对接.md**:页面与 6 关键接口映射(submit / status / online-status / location/batch / tasks/available / admin audit)+ rider-auth 4 + admin-rider 列表/详情。
- **后端数据任务事件.md**:6 模块、8 表、4 task、5 event。
- **状态机与业务规则.md**:未审核不可上线、被禁用强制下线、定位关闭提示、接单大厅仅展示服务区内可接订单。状态码以后端枚举为唯一权威。
- **权限与安全.md**:Token 端隔离;骑手只访问自己任务/轨迹/收益/提现;敏感字段后台脱敏;关键写操作记审计。
- **阶段交付清单.md**:文档 9 + 开发 7 + 测试 7 + 阶段门禁 9 共 32 勾。

## 3. 边界确认

### 3.1 范围内

- 骑手手机号注册 + 身份证+人脸实名 + 健康证 + 车辆信息 + 配送区域 全流程入驻
- 审核进度查询 + 失败重提 + 资质到期提醒
- 骑手上线 / 下线、心跳维持、心跳超时被动下线
- 接单大厅(只读骨架,返回字段齐全;真订单留 stage 5/6)
- 定位批量上报 + 7 天后清理或归档
- 平台 Web 骑手审核 + 账号启停 + 配送区域配置 + 信用分(骨架字段)
- 设备绑定(getui mock,走 integration_request_log 流水)

### 3.2 严格不做(违反规划)

- ❌ 商家 Web 后台 / 商家小程序(全周期不做)
- ❌ 完整配送闭环 / 接单成功 / 取餐 / 送达流程(stage 5 外卖 + stage 6 跑腿)
- ❌ 骑手收益 / 提现 / 结算 / 处罚(stage 8)
- ❌ 复杂调度规则 / 订单匹配算法 / 分区调度(stage 8)
- ❌ 真第三方 SDK 接入(全 mock,凭证留 stage 11)
- ❌ APP 推送 / 短信通知 实际发送(只 mock providerRequestId)
- ❌ 骑手端订单页面 / 接单确认页面(stage 5/6 + 8)
- ❌ Redis ZSET 实时位置 / MongoDB 轨迹归档(stage 8 升级)
- ❌ 骑手与商家直接对接(全部走平台调度,stage 8 实现)

## 4. 4 个用户拍板决策(2026-05-05 已锁定)

### 4.1 [D-1 已锁] 实名人脸核验适配器

**决策**:扩展 stage 1 `realname.adapter.ts`,在 RealnameAdapter 接口加方法:

```ts
verifyFace(opts: {
  idCardNo: string;          // 18 位身份证号
  realName: string;          // 真实姓名
  faceFileId: string;        // 人脸视频/照片文件 ID (file_object 表)
}): Promise<RealnameVerifyResult>;
```

mock 行为:`idCardNo` 长度 == 18 且 `faceFileId` 非空且 `realName` 首字汉字 → success;否则 → failed reason='人脸核验未通过'。`provider` 仍标 `ali-realname`(不在 ThirdPartyProvider 加新枚举)。

**原因**:与 stage 2 D-2(verifyEnterprise)同款,沿用第三方网关层的"按方法分场景"模式。stage 11 真接入时是同一阿里云 SDK 包(子接口区分)。

### 4.2 [D-2 已锁] APP 推送设备绑定适配器

**决策**:扩展 stage 0 `getui.adapter.ts`,加方法:

```ts
bindDevice(opts: { riderId: string; deviceToken: string; platform: 'android' | 'ios' }): Promise<{ success: boolean; providerRequestId: string }>;
unbindDevice(opts: { riderId: string; deviceToken: string }): Promise<{ success: boolean; providerRequestId: string }>;
```

mock 行为:接收任意非空入参 → success,写 `integration_request_log`。**不**新增 ThirdPartyProvider 枚举(`getui` 已存在)。

**原因**:同一第三方供应商的不同方法应在同 adapter 内,与 D-1 一致。

### 4.3 [D-3 已锁] 骑手位置上报存储

**决策**:本阶段用 MySQL `rider_location` 表(`rider_id` / `lng` / `lat` / `accuracy` / `batch_id` / `reported_at:bigint`,组合索引 `(rider_id, reported_at)`)+ 位置点清理 job(每日凌晨清 7 天前的明细)。

**不做**:Redis ZSET 实时位置缓存、MongoDB 轨迹归档。这些留 stage 8(骑手端调度轨迹收益)升级:rider_location 转 MongoDB / Redis 实时 + ClickHouse 长期归档。

**原因**:本阶段位置只用于"在线维持心跳"+"接单大厅距离过滤(stage 5/6 才用)",不需要实时调度。过早引入 Redis ZSET 是过度设计。

### 4.4 [D-4 已锁] 接单大厅本阶段返回内容

**决策**:`GET /api/v1/r/tasks/available` 接口骨架就位,VO 字段齐全(`taskId / bizType / distance / reward / deadline / pickupAddress / deliveryAddress`),实际查询返回 `{items:[], total:0}`。

**做**:rider 服务区域 + 在线状态 + 距离过滤逻辑写好,只是没源订单可过滤(stage 5/6 出真订单后填充)。
**不做**:内置 mock 假订单。

**原因**:与 stage 2 `public-store-readonly` 模式一致(只读骨架,等下一阶段填数据);避免污染前端联调状态。

## 5. 11 项业务自动决策

### 5.1 时间戳列类型

**约定**:全部 `BIGINT` 毫秒(沿用 stage 0/1/2 既有约定)。

### 5.2 主键命名

**约定**:`<table>_id`(`rider_id` / `application_id` / `certificate_id` / `vehicle_id` / `service_area_id` / `location_id` / `audit_log_id`),与 stage 1/2 一致。

### 5.3 领域事件命名

**约定**:`domain.<biz>.<verb>` 全小写连字符:`domain.rider.submitted` / `domain.rider.approved` / `domain.rider.online` / `domain.rider.offline` / `domain.rider.location-updated`。EventName key 用 `RiderSubmitted` / `RiderApproved` / `RiderOnline` / `RiderOffline` / `RiderLocationUpdated`。

### 5.4 骑手:account 关系

**约定**:1 骑手 1 account 1 application 1 status。`rider_account.mobile` UNIQUE。审核通过后自动建 `rider_status`(默认 offline)+ 默认空 `rider_service_area`。重提机制同 stage 2:`canResubmit` = 最新申请 status='rejected' 时为 true。

### 5.5 入驻审核 4 状态

**约定**:`audit_status` 枚举 `pending / approved / rejected / disabled`(`disabled` 用于审核通过后被平台主动禁用,与 stage 2 商家共享枚举概念)。

### 5.6 骑手在线状态

**约定**:`rider_status.online_status` 枚举 `online / offline / busy`(busy 留 stage 5/6 接单中);本阶段只用 `online` / `offline`。`last_heartbeat_at:bigint` 维护心跳;心跳超时 job(默认 60s)将 `online_status` 改回 `offline` + 发布 `domain.rider.offline` 事件,reason='heartbeat-timeout'。

### 5.7 位置上报频率与批量

**约定**:批量上报接口最多接受 50 个位置点;后端事务 INSERT;上报时同步刷新 `rider_status.last_heartbeat_at`(单条上报 = 心跳)。前端轮询频率前端约定(本阶段 30s 一次)。

### 5.8 资质字段位置

**约定**:`rider_application` 主表只存"提交时的快照字段(姓名 / 身份证号 / 健康证号 / 车牌)";`rider_certificate` 表存"文件指针"(file_object_id + cert_type:enum)。审核通过后写到 `rider_account` 的"权威字段"(realName / idCardNo / healthCertNo / healthCertExpiry)。

### 5.9 服务区域与配送区域

**约定**:`rider_service_area.geometry` 用 GeoJSON Polygon JSON(沿用 stage 2 D-3);本阶段平台 Web 提供 textarea 编辑 JSON,真拖拽留 stage 8。

### 5.10 健康证到期提醒

**约定**:`rider_health_cert_expiry_reminder.job` 每日 8:00 扫描 `health_cert_expiry` 在 7 天内或已过期的 rider,发布 `domain.rider.offline` 强制下线 + 写 `rider_audit_log`。

### 5.11 审计日志

**约定**:`rider_audit_log` 记录骑手生命周期关键操作(submitted / approved / rejected / disabled / online / offline / location-batch);由 service 层统一写入(不同于 sys_audit_log,后者由装饰器写)。

### 5.12 装饰器约定

**约定**:`@Idempotent` 用于:`POST /r/auth/sms-code` (60s key=mobile+scene)/ `POST /r/auth/login` / `POST /r/auth/logout` / `POST /r/onboarding/applications` / `POST /r/location/batch`(key=batchId)/ `POST /admin/riders/:id/audit`。`@Audit` 用于:除 `refresh` 和 `tasks/available` 之外所有写接口。`@Mask` 用于:admin-rider 详情接口的 mobile / idCardNo / realName / healthCertNo。

### 5.13 权限点

**约定**:`packages/contracts` 不动。`apps/server/src/database/seeds/role-permission.seed.ts` 加 4 新 sys_permission:

- `rider:public`(骑手端公开,sms-code / login / refresh)
- `rider:self`(骑手端登录后访问自己资源,onboarding / profile / location / online-status / tasks)
- `admin:menu:riders`(平台菜单)
- `admin:riders:view`(平台查骑手列表与详情;AUDITOR + SUPER_ADMIN)
- `admin:riders:manage`(平台审核 / 启停 / 配送区域;SUPER_ADMIN)

绑定:`RIDER` 角色 → `rider:public` + `rider:self`;`SUPER_ADMIN` → 全部 admin:riders:\*;`AUDITOR` → admin:riders:view + admin:menu:riders。

### 5.14 端隔离测试

**约定**:复刻 stage 2 cross-scope 测试模式;Customer/Merchant/Admin Token 调 `/api/v1/r/**` → FORBIDDEN,Rider Token 调 `/api/v1/m/**` 或 `/api/v1/c/**` 或 `/api/v1/admin/**` → FORBIDDEN。新增至少 6 个 cross-scope 测试。

## 6. 已识别风险预制

| 编号        | 级别 | 风险                                                                 | 应对(将在 DESIGN 落地)                                                      |
| ----------- | ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 阶段 3 R-01 | P2   | 心跳并发竞争(多设备同时上报心跳)                                     | rider_status 行锁 UPDATE last_heartbeat_at;deviceId 唯一对应 last_active_at |
| 阶段 3 R-02 | P2   | RiderApprovedSubscriber 自动建关联失败 → 骑手卡 approved 但无 status | 订阅器事务 + DomainEventRetryJob 兜底;管理端可手动重发事件                  |
| 阶段 3 R-03 | P2   | 位置点暴增 / 表膨胀                                                  | 7 天清理 job + (rider_id, reported_at) 索引;stage 8 升级 MongoDB            |
| 阶段 3 R-04 | P3   | 健康证到期未及时下线 → 违规上线                                      | 定时 job 8:00 扫 + 即时校验(online-status 接口判 expiry)                    |
| 阶段 3 R-05 | P2   | service area JSON GeoJSON 输入校验                                   | 复用 stage 2 `@IsGeoJsonPolygon()` 自定义验证器                             |
| 阶段 3 R-06 | P3   | 设备绑定 mock 失败 → 上线失败导致骑手卡顿                            | 上线接口对 push.bindDevice 失败做 warn 日志,不阻塞;真接入留 stage 11        |

## 7. 术语表

| 术语     | 定义                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| 入驻     | 骑手提交资料 → 平台审核 → 通过后自动建 rider_status + 默认空 service_area + rider_account.realName 等权威字段写入 |
| 在线状态 | rider_status.online_status: `online`(可接单)/ `offline`(休息)/ `busy`(接单中,留 stage 5/6)                        |
| 心跳     | 骑手 APP 调 location/batch 时刷新 last_heartbeat_at;>60s 无心跳被 job 强制下线 reason='heartbeat-timeout'         |
| 服务区   | rider_service_area.geometry GeoJSON Polygon;本阶段配置不影响接单大厅过滤(因无真订单)                              |
| 资质     | rider_certificate:身份证正/反 / 人脸视频 / 健康证 / 驾驶证 / 行驶证(file_object_id + cert_type 区分)              |
| 审核     | merchant_application 同款机制:pending → approved/rejected;rejected 可重提;approved 后可被 disabled                |
| 接单大厅 | rider 端拉取可接订单列表(本阶段返回空骨架,字段齐全;真订单 stage 5/6)                                              |
| 设备绑定 | rider 上线时调 push.bindDevice mock 写流水;下线时 unbindDevice                                                    |
