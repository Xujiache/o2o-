# 阶段 3 — 骑手端 APP 入驻接单与配送基础 · 原子任务清单(TASK)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 任务总览

共 **27 个原子任务**,分为 7 组:

| 组  | 范围                | 任务      |
| --- | ------------------- | --------- |
| A   | 数据层              | T01       |
| B   | 第三方适配          | T02       |
| C   | 后端业务模块        | T03 ~ T08 |
| D   | 定时任务 + 领域事件 | T09、T10  |
| E   | 骑手 APP 页面       | T11 ~ T16 |
| F   | 平台 Web 页面       | T17       |
| G   | 测试 + 验收收尾     | T18 ~ T27 |

## 任务依赖图

```mermaid
flowchart TB
    T01[T01 8表 entity+migration+seed] --> T02[T02 realname.verifyFace + getui.bindDevice]
    T01 --> T03[T03 rider-auth]
    T02 --> T04[T04 rider-onboarding]
    T01 --> T04
    T03 --> T04
    T01 --> T05[T05 rider-profile]
    T04 --> T05
    T01 --> T06[T06 rider-location]
    T03 --> T06
    T02 --> T06
    T01 --> T07[T07 rider-task-pool]
    T06 --> T07
    T01 --> T08[T08 admin-rider]
    T04 --> T08
    T06 --> T09[T09 4 定时任务]
    T08 --> T09
    T04 --> T10[T10 5 事件 + 5 订阅器]
    T06 --> T10
    T08 --> T10
    T03 --> T11[T11 rider-app login 2页 + auth store]
    T04 --> T12[T12 rider-app onboarding 5页]
    T11 --> T12
    T06 --> T13[T13 rider-app workbench 1页]
    T11 --> T13
    T07 --> T14[T14 rider-app tasks/available 1页]
    T11 --> T14
    T05 --> T15[T15 rider-app profile 1页]
    T11 --> T15
    T08 --> T16[T16 rider-app integration test pre-check]
    T08 --> T17[T17 平台Web 骑手管理 4页+2组件]
    T03~T10 --> T18[T18 后端 jest ≥80]
    T11~T17 --> T19[T19 前端 vitest ≥30]
    T18 & T19 --> T20[T20 手动审查文档]
    T20 --> T21[T21 ACCEPTANCE 阶段 3]
    T21 --> T22[T22 FINAL 阶段 3]
    T22 --> T23[T23 TODO 阶段 3]
    T23 --> T24[T24 总闸 + lint + format]
    T24 --> T25[T25 端隔离回归测试]
    T25 --> T26[T26 漏项审查表逐条勾]
    T26 --> T27[T27 最终 commit]
```

---

## 第 A 组:数据层(T01)

### T01 8 张业务表 entity + migration + seed

- **输入**:DESIGN § 3。
- **产出**:
  - `apps/server/src/database/entities/` 8 个新 entity:`rider-account / rider-application / rider-certificate / rider-vehicle / rider-service-area / rider-status / rider-location / rider-audit-log`
  - `apps/server/src/database/entities/index.ts` 加 8 export
  - `apps/server/src/database/migrations/1714867500000-Stage3Init.ts`(8 表 + 索引 + 4 个新 sys_permission seed:`rider:public` / `rider:self` / `admin:menu:riders` / `admin:riders:view` / `admin:riders:manage`)
  - `role-permission.seed.ts` 扩展角色绑定(RIDER → rider:public+self;SUPER_ADMIN → admin:riders:\*;AUDITOR → admin:riders:view + menu)
- **约束**:
  - 时间戳 BIGINT 毫秒
  - 主键命名 `<table>_id`
  - `rider_account.mobile` UNIQUE
  - `rider_status.rider_id` UNIQUE(1:1)
  - `rider_service_area.rider_id` UNIQUE(1:1)
  - `rider_certificate(application_id, cert_type)` UNIQUE
  - `rider_location` 组合索引 `(rider_id, reported_at)`
- **验收**:
  - `pnpm --filter @o2o/server typeorm:migration:show` 显示 `Stage3Init1714867500000`
  - 跑 `migrate:run` 后 `SHOW TABLES LIKE 'rider_%'` 出现 8 张
  - `SELECT code FROM sys_permission WHERE code LIKE 'rider:%' OR code LIKE 'admin:riders:%' OR code='admin:menu:riders'` 至少 5 行
- **依赖**:无

## 第 B 组:第三方适配(T02)

### T02 realname.adapter 加 verifyFace + getui.adapter 加 bindDevice/unbindDevice

- **输入**:DESIGN § 4.2 / § 4.4 / § 5.5、ALIGNMENT D-1 / D-2。
- **产出**:
  - `apps/server/src/modules/integration-gateway/adapters/realname.adapter.ts` 加 `verifyFace()` 接口方法 + Mock + Real-stub
  - `apps/server/src/modules/integration-gateway/adapters/getui.adapter.ts` 加 `bindDevice()` / `unbindDevice()` 接口方法 + Mock + Real-stub
  - 各加 spec(verifyFace 3 测试 / bindDevice + unbindDevice 各 2 测试)
- **约束**:
  - `realname.adapter` provider='ali-realname'(不增枚举)
  - `getui.adapter` provider='getui'(不增枚举)
  - mock verifyFace:idCardNo.length==18 且 faceFileId 非空 且 realName 首字汉字 → success;否则 reason='人脸核验未通过'
  - mock bindDevice / unbindDevice:接收非空入参 → success,写 integration_request_log
- **验收**:
  - jest 单测全绿
  - `pnpm --filter @o2o/server build` 全绿
- **依赖**:T01

## 第 C 组:后端业务模块(T03 ~ T08)

### T03 rider-auth 模块

- **输入**:DESIGN § 4.1、§ 5.1。
- **产出**:`modules/rider-auth/{module,service,controller,dto,constants}.ts`
  - 4 端点:sms-code / login / refresh / logout
  - 复刻 merchant-auth 模式;Redis refresh hash 前缀 `rider:refresh:`;jti 黑名单前缀 `jti:revoked:`
  - 复用 stage 1 sms.service / customer-auth 模式
  - login 自动注册 rider_account(account_status='active')
- **约束**:
  - sms-code @Public + @Idempotent(60s, mobile+scene)
  - login @Public + @Idempotent + @Audit
  - refresh @Public + @Idempotent
  - logout RiderJwtGuard + @Audit + @Idempotent
- **验收**:rider-auth.spec.ts ≥ 12 测试(发码 / 登录新 / 登录老 / refresh / logout / cross-scope 6)
- **依赖**:T01

### T04 rider-onboarding 模块

- **输入**:DESIGN § 4.2、§ 5.2。
- **产出**:`modules/rider-onboarding/{module,service,controller,dto}.ts`
  - submit:事务 INSERT rider_application + 5 rider_certificate + 1 rider_vehicle;同步调 verifyFace mock(失败不阻塞,reason 写 audit_log);发布 `domain.rider.submitted`
  - status:返 hasApplication / canResubmit / latest
- **约束**:
  - submit RiderJwtGuard + @RequirePermission('rider:self') + @Idempotent + @Audit
  - status RiderJwtGuard + @RequirePermission('rider:self')
  - certificates 数组必须包含 5 种 cert_type 全部
- **验收**:rider-onboarding.spec.ts ≥ 10 测试
- **依赖**:T02、T03

### T05 rider-profile 模块

- **输入**:DESIGN § 4.3。
- **产出**:`modules/rider-profile/{module,service,controller,dto}.ts`
  - GET 详情(@Mask mobile)
  - PATCH 仅 vehicle 字段(real_name / id_card 由审核结果写入,不可改)
- **验收**:rider-profile.spec.ts ≥ 6 测试
- **依赖**:T01、T04

### T06 rider-location 模块

- **输入**:DESIGN § 4.4、§ 5.3。
- **产出**:`modules/rider-location/{module,service,controller,dto}.ts`
  - PATCH /online-status:校验 approved + healthCert + active;调 getui.bindDevice mock;发布 online/offline 事件
  - POST /location/batch:数组 1~50;事务 INSERT;UPDATE rider_status.last_heartbeat_at;发布 1 个 location-updated 事件
- **约束**:
  - online-status @Idempotent + @Audit;状态机校验(违反返 STATUS_INVALID)
  - batch @Idempotent(key=batchId);校验 points.length 1~50
- **验收**:rider-location.spec.ts ≥ 12 测试
- **依赖**:T02、T03

### T07 rider-task-pool 模块

- **输入**:DESIGN § 4.5、ALIGNMENT D-4。
- **产出**:`modules/rider-task-pool/{module,service,controller,dto}.ts`
  - GET /tasks/available:接口骨架 + VO 字段齐全 + 校验 rider approved+online+有 service area
  - 当前实现返 `{items:[], total:0}`(预留接入 stage 5/6 真订单 service)
- **约束**:
  - RiderJwtGuard + @RequirePermission('rider:self')
- **验收**:rider-task-pool.spec.ts ≥ 4 测试(approved+online 返空 / 未 approved 返 STATUS_INVALID / 未上线返空 / 字段定义)
- **依赖**:T06

### T08 admin-rider 模块

- **输入**:DESIGN § 4.6。
- **产出**:`modules/admin-rider/{module,service,controller,dto}.ts`
  - 5 端点:GET 列表 / GET 详情 / POST audit / POST status(启停) / PATCH service-area
  - 响应 mobile/idCardNo/realName/healthCertNo @Mask
  - audit 幂等(已是目标态返当前结果不重发事件)
  - service-area 走 @IsGeoJsonPolygon 校验
- **约束**:
  - 全部 AdminJwtGuard
  - 列表 / 详情 @RequirePermission('admin:riders:view')
  - audit / status / service-area @RequirePermission('admin:riders:manage') + @Idempotent + @Audit
- **验收**:admin-rider.spec.ts ≥ 14 测试
- **依赖**:T04、T06

## 第 D 组:定时任务 + 领域事件(T09、T10)

### T09 4 定时任务

- **输入**:DESIGN § 8。
- **产出**:`scheduler/jobs/{rider-heartbeat-timeout-offline,rider-health-cert-expiry-reminder,rider-audit-timeout-reminder,rider-location-archive}.job.ts`
  - 全部继承 BaseJob
  - 锁前缀 `lock:scheduler:`
  - 注册到 scheduler.module.ts(累加到 stage 0 4 + stage 1 4 + stage 2 5 + stage 3 4 = **17 jobs**)
- **验收**:dev 模式 4 job 各能 trigger;`SchedulerController.trigger` 17 个全部通
- **依赖**:T06、T08

### T10 5 事件订阅器

- **输入**:DESIGN § 7。
- **产出**:
  - `events/events.ts` EventName 加 5 个 + EventPayloadMap 加 5
  - `events/subscribers/{rider-submitted,rider-approved,rider-online,rider-offline,rider-location-updated}.subscriber.ts` 5 个
  - RiderApprovedSubscriber 在事务中创建 rider_status + rider_service_area + UPDATE rider_account 权威字段
  - RiderOfflineSubscriber 调 getui.unbindDevice mock(失败 warn 日志)
  - RiderLocationUpdatedSubscriber 本阶段空实现 + warn 日志(留 stage 8 调度匹配)
- **约束**:
  - 订阅器幂等(已建关联跳过)
  - 事件命名 `domain.rider.*` 全小写连字符
- **验收**:5 订阅器 spec 各 ≥ 1 测试;`SELECT * FROM domain_event WHERE name LIKE 'domain.rider.%'` 5 类全部 status=done
- **依赖**:T04、T06、T08

## 第 E 组:骑手 APP 页面(T11 ~ T16)

### T11 stores/auth.ts + login 2 页

- **输入**:DESIGN § 9.2、CONSENSUS AC-15。
- **产出**:
  - `apps/rider-app/src/stores/auth.ts`(Pinia,复刻 merchant-app)
  - `apps/rider-app/src/api/index.ts`(stage 3 接口常量)
  - `apps/rider-app/src/utils/request.ts`(401 自动 refresh,setRefreshHandler)
  - `pages/login/{index,verify}.vue`
  - `components/common/{MobileInput,SmsCodeInput}.vue`
- **约束**:登录后:有 application 跳 progress;无 application 跳 onboarding/apply
- **验收**:vitest spec ≥ 4(login / verify / store / request)
- **依赖**:T03

### T12 onboarding 5 页(apply / face / health / vehicle / progress)

- **输入**:DESIGN § 4.2、CONSENSUS AC-14。
- **产出**:
  - `pages/onboarding/{apply,face,health,vehicle,progress}.vue`
  - `components/common/{IdCardInput,UploadField}.vue`
  - apply:身份证号 + 真实姓名 + 上传身份证正/反 → 下一步 face
  - face:上传人脸视频 / 照片 → 下一步 health
  - health:健康证号 + 到期日期 + 上传健康证 → 下一步 vehicle
  - vehicle:车辆类型 + 车牌 + 上传驾驶证 + 行驶证 → 提交
  - progress:展示 auditStatus / rejectReason / canResubmit;canResubmit=true 显示"重新提交"按钮跳 apply
- **约束**:每页保存 draft 到 storage;最后一页提交时统一调 onboarding/applications
- **验收**:vitest spec ≥ 5(每页 1)
- **依赖**:T04、T11

### T13 工作台 1 页

- **输入**:DESIGN § 4.4。
- **产出**:`pages/workbench/index.vue`
  - 上线下线按钮(根据 GET /onboarding/status 与 GET /profile 校验:approved + healthCert valid + active 才可点)
  - 信用分 / 接单量 / 评分 占位展示(本阶段无业务规则)
  - 上线后启动定位定时任务调 location/batch(30s 一次,前端 setInterval)
- **约束**:定位权限关闭时 toast 提示"无法接单"
- **验收**:vitest spec ≥ 2
- **依赖**:T06、T11

### T14 接单大厅 1 页

- **输入**:DESIGN § 4.5、ALIGNMENT D-4。
- **产出**:`pages/tasks/available.vue`
  - 调 GET /r/tasks/available
  - 列表展示 bizType / distance / reward / deadline / 地址(本阶段返空)
  - 空状态 + loading + pull-refresh
- **约束**:不引入 mock 假订单
- **验收**:vitest spec ≥ 1(空状态展示)
- **依赖**:T07、T11

### T15 个人资料 1 页

- **输入**:DESIGN § 4.3。
- **产出**:`pages/profile/index.vue`
  - 调 GET /r/profile 展示
  - 编辑车辆入口(简单 form,调 PATCH)
- **验收**:vitest spec ≥ 1
- **依赖**:T05、T11

### T16 rider-app 集成预检

- **产出**:
  - `apps/rider-app/package.json` 加 pinia 依赖(若未有)
  - `pages.json` 注册 11 路由
  - `pnpm install --filter @o2o/rider-app` 跑通
  - `pnpm --filter @o2o/rider-app build:app` 构建通过(只 build:app per 沿用 stage 2 D-1)
- **验收**:build 全绿
- **依赖**:T11~T15

## 第 F 组:平台 Web 页面(T17)

### T17 平台 Web 骑手管理 4 页 + 2 组件

- **输入**:DESIGN § 9.3、CONSENSUS AC-18 / AC-19。
- **产出**:
  - `apps/admin-web/src/views/riders/{audit,detail,status,delivery-area}.vue`
  - `apps/admin-web/src/views/riders/components/{RiderAuditDialog,RiderHealthCertPreview}.vue`
  - `apps/admin-web/src/api/admin-riders.ts`(列表 / 详情 / audit / status / service-area)
  - `router/index.ts` 注册 4 新路由(累加 10 路由)
  - audit 弹窗 校验 reason 非空(rejected 时);v-permission 控审核 / 启停按钮
  - 健康证预览(图片 / PDF embed,复用 stage 2 LicensePreview 模式)
- **约束**:状态走 dictStore 中文映射
- **验收**:vitest spec ≥ 4(audit / detail / status / RiderAuditDialog)
- **依赖**:T08

## 第 G 组:测试 + 验收收尾(T18 ~ T27)

### T18 后端 jest 用例 ≥ 80

- **输入**:T03~T10 全部代码。
- **产出**:6 模块 + 4 jobs + 5 subscribers + adapters 扩展 各 spec;cross-scope 6+ 测试;状态机非法流转 5+;audit 幂等;位置 50 上限;心跳超时下线;健康证过期。
- **验收**:`pnpm --filter @o2o/server test` 全绿;新增 ≥ 80 用例
- **依赖**:T03~T10

### T19 前端 vitest 用例 ≥ 30

- **产出**:rider-app 8+ spec + admin-web 4+ spec
- **验收**:`pnpm --filter @o2o/rider-app test && pnpm --filter @o2o/admin-web test` 全绿
- **依赖**:T11~T17

### T20 手动审查文档

- **产出**:填 `项目阶段规划/03-阶段3-.../手动审查与测试.md` 8 节(每条带 curl/SQL/截图证据,P0/P1=0);追加 `问题与风险记录.md`
- **依赖**:T18、T19

### T21 ACCEPTANCE\_阶段3.md

- **产出**:`docs/阶段3-骑手入驻接单配送/ACCEPTANCE_阶段3.md`
  - 23 AC 逐条验证记录
  - 27 任务自审表
  - PowerShell replay 命令
- **依赖**:T20

### T22 FINAL\_阶段3.md

- **产出**:`docs/阶段3-骑手入驻接单配送/FINAL_阶段3.md`
  - 总览 / 能力矩阵 / 关键决策 / 文件总览 / 风险已知 / stage 4 启动 checklist / 提交记录 / 总结
- **依赖**:T21

### T23 TODO\_阶段3.md

- **产出**:`docs/阶段3-骑手入驻接单配送/TODO_阶段3.md`
  - 必做(stage 4 启动前)4 抽测条款
  - 可选(stage 4 不阻塞):凭证回填 / 真高德 / 真 OCR / 真接入推送 / Redis ZSET 升级
- **依赖**:T22

### T24 总闸 + lint + format

- **产出**:`pnpm -r build / test / lint / format:check` 四绿;`git status` 干净
- **依赖**:T23

### T25 端隔离回归测试

- **产出**:启动 server,curl 测试:
  - Customer-Token 调 `/r/**` → FORBIDDEN
  - Merchant-Token 调 `/r/**` → FORBIDDEN
  - Admin-Token 调 `/r/**` → FORBIDDEN
  - Rider-Token 调 `/c/**` / `/m/**` / `/admin/**` → FORBIDDEN
- **依赖**:T24

### T26 漏项审查表逐条勾

- **产出**:对照规划文档 7 份逐项打勾 + 对照 TASK 27 任务逐项打勾,确认 0 漏项;在 ACCEPTANCE 末尾追加审查表
- **依赖**:T25

### T27 最终汇总 commit

- **产出**:`git commit -m "feat(stage-3): 阶段 3 骑手端 APP 入驻接单与配送基础 完整交付(27/27 原子任务)"`
- **依赖**:T26

---

## 提交节奏(commit 编排)

| commit | 范围                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| 1      | docs(stage-3): ALIGNMENT/CONSENSUS/DESIGN/TASK 4 文档(待人审)                |
| 2      | feat(stage-3): T01-T02 schema migration + adapter face/push extensions       |
| 3      | feat(stage-3): T03-T05 rider-auth + onboarding + profile                     |
| 4      | feat(stage-3): T06-T08 location + task-pool + admin-rider                    |
| 5      | feat(stage-3): T09-T10 scheduler jobs + 5 rider domain events                |
| 6      | feat(stage-3): T11-T16 rider-app 10 pages + auth store + components          |
| 7      | feat(stage-3): T17 admin-web riders management 4 views                       |
| 8      | test(stage-3): T18-T19 backend + frontend test suites                        |
| 9      | feat(stage-3): 阶段 3 骑手端 APP 入驻接单与配送基础 完整交付(27/27 原子任务) |

## 漏项审查机制(用户特别强调)

每波结束在对应 commit message 末尾附带 ✅ 审查表:

```
✅ 漏项审查
- [x] TASK 文档列出的子任务全部完成
- [x] 接口契约 16 个全部实现(列接口名)
- [x] 状态机 nextStates / 非法流转 STATUS_INVALID 已覆盖
- [x] 端隔离测试已写
- [x] @Idempotent / @Audit / @Mask 装饰器组合按规划文档配齐
- [x] 规划文档 7 份均无未覆盖条款
```

Phase B 末尾在 `ACCEPTANCE_阶段3.md` 用 27 行表格逐任务逐条 AC 自审。
