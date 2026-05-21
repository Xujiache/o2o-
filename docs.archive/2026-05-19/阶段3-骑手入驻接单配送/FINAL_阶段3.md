# 阶段 3 — 骑手端 APP 入驻接单与配送基础 · 项目总结(FINAL)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 1. 总览

| 维度             | 数据                                                     |
| ---------------- | -------------------------------------------------------- |
| 原子任务         | 27/27                                                    |
| 后端模块         | 6 业务                                                   |
| 数据表           | 8                                                        |
| HTTP 接口        | 16(契约 6 + 扩展 10)                                     |
| 领域事件         | 5(全部 `domain.rider.*` 前缀)                            |
| 定时任务         | 4                                                        |
| 权限点           | 5 + 1 菜单                                               |
| 骑手 APP 页面    | 10(login×2 + onboarding×5 + workbench + tasks + profile) |
| 平台 Web 页面    | 4(audit + detail + status + delivery-area)+ 2 组件       |
| 后端 jest 测试   | 274(stage 3 净增 80)                                     |
| 前端 vitest 测试 | rider-app 28 + admin-web 22 = 50(stage 3 净增 31)        |

## 2. 能力矩阵

| 能力                                 | 端       | 入口                                                     | 后端模块                                     | 状态 |
| ------------------------------------ | -------- | -------------------------------------------------------- | -------------------------------------------- | ---- |
| 骑手手机号登录(自动注册)             | 骑手 APP | `/pages/login/{index,verify}`                            | rider-auth + sms 复用                        | ✓    |
| Token 刷新(401 自动)                 | 骑手 APP | utils/request 注入 setRefreshHandler                     | rider-auth refresh + Redis                   | ✓    |
| 登出(jti 黑名单)                     | 骑手 APP | profile 退出按钮                                         | rider-auth + jti:revoked:                    | ✓    |
| 入驻 5 步表单 + 资质上传             | 骑手 APP | `/pages/onboarding/{apply,face,health,vehicle,progress}` | rider-onboarding + 5 cert + verifyFace mock  | ✓    |
| 入驻状态查询 + 重提                  | 骑手 APP | `/pages/onboarding/progress`                             | rider-onboarding                             | ✓    |
| 平台审核入驻                         | 平台 Web | `/admin/riders/audit` + 详情弹窗                         | admin-rider + RiderAuditDialog               | ✓    |
| 自动建关联(status + area + 权威字段) | 后端     | RiderApprovedSubscriber                                  | events + dataSource.transaction              | ✓    |
| 个人资料 + 编辑车辆                  | 骑手 APP | `/pages/profile/index`                                   | rider-profile @Mask                          | ✓    |
| 上线 / 下线 + 心跳                   | 骑手 APP | `/pages/workbench/index`                                 | rider-location + getui.bindDevice mock       | ✓    |
| 位置批量上报 ≤50                     | 骑手 APP | workbench 30s 定时                                       | rider-location.batch                         | ✓    |
| 心跳超时被动下线                     | 后端     | RiderHeartbeatTimeoutOfflineJob                          | scheduler 每分钟                             | ✓    |
| 健康证到期 reminder + 强制下线       | 后端     | RiderHealthCertExpiryReminderJob                         | 每日 8:00                                    | ✓    |
| 接单大厅(只读骨架)                   | 骑手 APP | `/pages/tasks/available`                                 | rider-task-pool 返 {items:[], total:0}       | ✓    |
| 平台账号管控(启停)                   | 平台 Web | `/admin/riders/status`                                   | admin-rider.updateStatus + 强制下线          | ✓    |
| 平台配送区域配置                     | 平台 Web | `/admin/riders/delivery-area`                            | admin-rider.updateServiceArea + GeoJSON 校验 | ✓    |
| 端 Token 隔离(4 端)                  | 全端     | RiderJwtGuard + 8 cross-scope 测试                       | auth                                         | ✓    |
| 实名人脸核验 mock                    | 后端     | onboarding 异步调                                        | realname.adapter.verifyFace                  | ✓    |
| 推送设备绑定 mock                    | 后端     | online 时 + offline 时                                   | getui.adapter.bindDevice/unbindDevice        | ✓    |
| 位置点 7 天清理                      | 后端     | RiderLocationArchiveJob                                  | 每日 3:00                                    | ✓    |

## 3. 关键决策(用户已锁定)

### D-1 实名人脸核验 → 复用 realname.adapter,新增 verifyFace()

mock 行为:idCardNo.length==18 且 faceFileId 非空 且 realName 首字汉字 → success;否则 reason='人脸核验未通过'。`provider='ali-realname'` 不增枚举(与 stage 2 verifyEnterprise 同款风格)。

### D-2 APP 推送设备绑定 → 复用 getui.adapter,新增 bindDevice/unbindDevice

mock 行为:接收非空入参 → success,写 integration_request_log。RiderOfflineSubscriber 在所有下线场景调 unbindDevice。

### D-3 骑手位置上报 → MySQL rider_location 表 + 7 天清理

本阶段简化方案:rider_id + lng/lat + accuracy + reported_at:bigint + 组合索引 (rider_id, reported_at) + 全表索引 reported_at。stage 8 升级 Redis ZSET 实时位置 + MongoDB 长期归档。

### D-4 接单大厅 → 只读骨架,返空数组

VO 字段齐全(taskId / bizType / distance / reward / deadline / pickupAddress / deliveryAddress),实际查询返 `{items:[], total:0}`。校验 rider 必须 approved + active + online + 有 service_area。stage 5/6 真订单出来后填充。

## 4. 11 项业务自动决策(已落地)

| ID   | 决策                                                    | 落地位置                                   |
| ---- | ------------------------------------------------------- | ------------------------------------------ |
| 5.1  | BIGINT 时间戳                                           | 8 表 entity 全部                           |
| 5.2  | 主键 `<table>_id`                                       | 全 entity                                  |
| 5.3  | 事件命名 `domain.rider.*` 全小写                        | events.ts                                  |
| 5.4  | 1 骑手 1 account 1 application 1 status                 | rider_account/status/area UNIQUE           |
| 5.5  | audit_status 4 状态(pending/approved/rejected/disabled) | enum + DESIGN § 6.1                        |
| 5.6  | online_status 3 状态(本阶段不用 busy)                   | enum + DESIGN § 6.2                        |
| 5.7  | 位置批量 ≤50                                            | rider-location.dto + spec                  |
| 5.8  | 资质字段位置(application 快照 vs account 权威)          | RiderApprovedSubscriber 写入               |
| 5.9  | service area GeoJSON Polygon                            | rider_service_area + admin-rider validator |
| 5.10 | 健康证到期 reminder + 强制下线                          | RiderHealthCertExpiryReminderJob           |
| 5.11 | rider_audit_log 业务日志                                | 多事件类型 + 全模块写入                    |
| 5.12 | 装饰器约定                                              | 全模块 controller                          |
| 5.13 | 5 权限点                                                | role-permission.seed.ts                    |
| 5.14 | 6+ cross-scope 测试                                     | rider-auth.cross-scope.spec.ts(8 测试)     |

## 5. 文件总览(主要新增)

```
apps/server/src/
├ database/entities/         + 8 stage 3 entities
├ database/migrations/       + 1714867500000-Stage3Init.ts
├ database/seeds/            修改 role-permission.seed.ts(+5 权限)
├ events/                    events.ts +5 EventName + payloads
├ events/subscribers/        + 5 stage 3 subscribers + RiderApprovedSubscriber.spec
├ scheduler/jobs/            + 4 stage 3 jobs;scheduler.module 累加到 17 jobs
├ modules/rider-auth/        5 文件 + cross-scope.spec
├ modules/rider-onboarding/  4 文件 + spec
├ modules/rider-profile/     4 文件 + spec
├ modules/rider-location/    4 文件 + spec
├ modules/rider-task-pool/   4 文件 + spec
├ modules/admin-rider/       4 文件 + spec
└ modules/integration-gateway/adapters/{realname,getui}.adapter.ts  扩展 verifyFace + bindDevice/unbindDevice + spec

apps/rider-app/src/
├ api/index.ts               重写,加 stage 3 14 endpoints + DTO 类型
├ stores/auth.ts             新建 Pinia store + spec
├ utils/request.ts           改造 401 自动 refresh + setRefreshHandler
├ main.ts                    注入 refreshHandler
├ components/common/         + MobileInput / SmsCodeInput / IdCardInput / UploadField + 2 spec
├ pages/login/               + index.vue 重写 + verify.vue
├ pages/onboarding/          + apply / face / health / vehicle / progress
├ pages/workbench/index.vue  新建(上线下线 + 心跳)
├ pages/tasks/available.vue  新建(空骨架)
├ pages/profile/index.vue    新建(资料 + 编辑车辆 + logout)
└ pages.json                 注册 11 路由
package.json                 + pinia 2.0.36 依赖 + build → build:app

apps/admin-web/src/
├ api/admin-riders.ts        新建 + spec
├ views/riders/              audit / detail / status / delivery-area + components/{RiderAuditDialog,RiderHealthCertPreview} + 1 spec
└ router/index.ts            注册 4 新路由(累计 11)
```

## 6. 风险 & 已知问题

| ID           | 严重度 | 描述                             | 处理                                  |
| ------------ | ------ | -------------------------------- | ------------------------------------- |
| 阶段 3 P3-01 | P3     | 心跳坐标 mock 固定北京           | stage 8 接 uni.getLocation + 高德定位 |
| 阶段 3 P3-02 | P3     | 配送区域仅 textarea 编辑 GeoJSON | stage 8 接高德 polygon-editor         |
| 阶段 3 P3-03 | P3     | 位置 7 天直接 DELETE 不归档      | stage 8 升级 MongoDB 归档             |
| 阶段 3 P3-04 | P3     | 接单大厅返空骨架                 | stage 5/6 真订单出来后填充过滤逻辑    |

## 7. 后续阶段(stage 4 入口)

**stage 4** = 平台管理端 Web 审核管控与基础配置。依赖本阶段:

- admin-merchant + admin-rider 模式可类比扩展
- @Mask + v-permission + dictStore + 路由模式已就位
- AUDITOR / SUPER_ADMIN 角色绑定模板已固化

stage 4 启动前 checklist 见 `TODO_阶段3.md`。

## 8. 提交记录

```
f8017db docs(stage-3): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)
cec99de feat(stage-3): T01-T02 schema migration + adapter face/push extensions
30c7784 feat(stage-3): T03-T05 rider-auth + onboarding + profile
de33c2a feat(stage-3): T06-T08 location + task-pool + admin-rider
febea7a feat(stage-3): T09-T10 scheduler jobs + 5 rider domain events
6c47218 feat(stage-3): T11-T16 rider-app 10 pages + auth store + components
24f39c4 feat(stage-3): T17 admin-web riders management 4 views + 2 components
<下一> feat(stage-3): 阶段 3 骑手端 APP 入驻接单与配送基础 完整交付(27/27 原子任务)
```

## 9. 总结

阶段 3 严格按 6A 流程交付(用户授意"走完整 6A"):

- **Align**:14 项业务自动决策固定到 ALIGNMENT;4 个核心决策(D-1~D-4)由用户在 plan mode 选定。
- **Architect**:DESIGN 含 8 表 schema + 16 接口契约 + 5 sequence + 状态机 + 5 事件 + 4 任务设计。
- **Atomize**:TASK 27 任务拆 7 组,依赖图清晰。
- **Approve**:用户两次"开工"信号(plan 4 docs 后 + Phase B 启动)。
- **Automate**:7 commits 串行,每完一波跑测试 + 构建,关键节点提 commit。
- **Assess**:8 节手动审查 + 23 AC + 27 任务自审记。

阶段 3 上线后,**骑手可用 APP 完成入驻 → 等审核 → 上线接单 → 心跳维持位置 → 看接单大厅(空)**;**平台 Web 可审核骑手 / 启停账号 / 配置配送区域**;**所有事件 / 任务 / 流水都已就位**。stage 4 起平台 Web 可在此基础上扩展高级管控与基础配置。
