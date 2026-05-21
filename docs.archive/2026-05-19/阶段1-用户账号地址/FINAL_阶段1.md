# 阶段 1 — 用户端账号地址与基础框架 · 项目总结(FINAL)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 总览

阶段 1 在 ~6 波 20 个原子任务节奏下完整交付了用户端账号体系与平台 Web 用户管理。后端 7 模块 8 表 12 接口 5 事件 4 任务全部上线,前端 11 + 4 = 15 页全部可构建。

| 维度              | 数据                             |
| ----------------- | -------------------------------- |
| 原子任务          | 20/20                            |
| 后端模块          | 7                                |
| 数据表            | 8                                |
| HTTP 接口         | 12                               |
| 领域事件          | 5(全部 `domain.customer.*` 前缀) |
| 定时任务          | 4                                |
| 权限点            | 4 + 1 菜单 = 5                   |
| 用户端页面        | 11                               |
| 平台 Web 页面     | 4                                |
| jest 测试(server) | 108(stage 1 净增 61)             |
| vitest 测试(前端) | 29(stage 1 净增 20)              |

## 2. 能力矩阵

| 能力                 | 端           | 入口                                    | 后端模块                                       | 状态                            |
| -------------------- | ------------ | --------------------------------------- | ---------------------------------------------- | ------------------------------- |
| 手机号验证码登录     | 用户端       | `/pages/login/{index,verify}`           | sms + customer-auth                            | ✓                               |
| 微信小程序登录       | 用户端       | `/pages/login/wechat`                   | customer-auth + wxlogin adapter                | ✓                               |
| 自动注册 3 表事务    | 用户端       | login 触发                              | customer-auth + user-profile + message-setting | ✓                               |
| Token 刷新           | 用户端       | 401 自动 + 显式 refresh                 | customer-auth                                  | ✓                               |
| 登出                 | 用户端       | `/pages/me/security`                    | customer-auth + jti 黑名单                     | ✓                               |
| 实名认证             | 用户端       | `/pages/profile/realname`               | realname + ali-realname mock                   | ✓                               |
| 收件地址 CRUD(无 D)  | 用户端       | `/pages/address/{list,edit,city,map}`   | address                                        | ✓                               |
| 默认地址唯一性       | 用户端       | upsert 事务 + 定时兜底                  | address + DefaultAddressUniquenessJob          | ✓                               |
| 个人中心             | 用户端       | `/pages/me/index`                       | 仅消息设置可点,其他 toast                      | ✓                               |
| 消息设置(本地)       | 用户端       | `/pages/me/notification`                | 3 开关 localStorage                            | ✓                               |
| 用户列表查询         | 平台 Web     | `/admin/customers`                      | admin-user                                     | ✓                               |
| 用户详情 + 实名记录  | 平台 Web     | `/admin/customers/:id`(+ /realname)     | admin-user + realname                          | ✓                               |
| 启用/禁用账号        | 平台 Web     | DisableDialog                           | admin-user + AccountDisabled 事件              | ✓                               |
| 端 Token 隔离        | 全端         | ScopeJwtGuard                           | auth                                           | ✓(7 cross-scope 测试)           |
| jti 黑名单           | 后端         | logout / 禁用账号                       | scope-jwt + Redis                              | ✓                               |
| 限频(Redis)          | sms          | 60s/mobile/1 + 60s/IP/5 + 10/mobile/day | sms                                            | ✓                               |
| 标准化失败原因(实名) | realname     | "内容不符 / 三要素不一致 / 三方不可用"  | realname                                       | ✓                               |
| 第三方调用日志       | sms+realname | integration_request_log 落库            | integration-gateway                            | ✓                               |
| 异地登录检测         | 后端         | LoginAnomalyDetectionJob \*/10min       | scheduler                                      | ✓(占位日志,stage 11 起触发风控) |
| 实名补查             | 后端         | RealnameRetryJob \*/1min                | scheduler                                      | ✓                               |

## 3. 关键决策

### D-1:时间戳类型 — BIGINT 而非 DATETIME(3)

DESIGN 文档字面写 `DATETIME(3)`,但 stage 0 全 14 entity 统一 `bigint` 毫秒时间戳。决策:**沿用 stage 0 BIGINT**,所有 stage 1 entity 与 migration 统一。理由:精度无损 + 避免时区歧义 + 跨 stage 一致性。已在 ACCEPTANCE 留档。

### D-2:领域事件命名 — `domain.customer.*` 前缀

stage 0 events.ts 注释明确"`domain.<biz>.<verb>` 风格"(`domain.config.changed` 等)。stage 1 沿用,5 事件统一 `domain.customer.registered` / `logged-in` / `realname-verified` / `address-changed` / `account-disabled`。EventName key 用大驼峰(`CustomerRegistered`)。

### D-3:第三方适配器复用,不新建 ali- 文件

stage 0 已建 `sms.adapter.ts` / `realname.adapter.ts`(stub)。stage 1 决策:**重写 mock 行为而非新建 ali-sms.adapter.ts** — TASK 字面"新建 ali-sms.adapter.ts"被覆盖。`wxlogin.adapter.ts` 是 stage 1 真新建。`ThirdPartyProvider` 加 `WXLOGIN`(`ALI_SMS / ALI_REALNAME` 已存在)。

### D-4:jti 黑名单走 Optional Redis 注入

ScopeJwtGuard 改为 `@Optional() @Inject(REDIS_CLIENT)`,canActivate 返回 `boolean | Promise<boolean>`。无 Redis 时同步 true(兼容已有测试);有 Redis 且 jti 命中 `jti:revoked:*` 时抛 UnauthorizedException。CurrentPrincipal 暴露 jti / exp 让 logout 写黑名单时算 TTL。

### D-5:packages/contracts 双产物(CJS + ESM)

stage 0 遗留:contracts CJS dist 让 admin-web vite 静态分析失败。stage 1 修复:加 `tsconfig.esm.json`(module=ESNext, moduleResolution=Bundler, outDir=dist/esm)+ package.json 条件 exports(`import` → ESM, `require` → CJS)。server CJS / admin-web ESM 均工作。

### D-6:微信首次登录 bindMobileRequired 流程

DESIGN 表 4.1.3 wechat-login 接口需返 `bindMobileRequired`。决策:**首次微信登录无 mobile 时不预创账号**,返 placeholder access token + bindMobileRequired=true,前端跳手机号绑定页。真正注册仍走 `loginByMobile`。避免半成品账号污染数据。

### D-7:realname mobile 不从请求传

T07 严格遵守"mobile 来自 customer_user 表"。RealnameService 内 `userRepo.findOne({ where: { userId } })` 取 mobile,然后传给 `smsService.verifyCode(user.mobile, 'realname', code)`。前端 DTO 不带 mobile 字段。

### D-8:平台 Web 禁用按钮 v-if 而非 disabled

DESIGN 要求"无权限隐藏",决策用 `v-if="userStore.has('admin:customers:disable')"` 完全不渲染按钮(而非 disable 灰显)。AUDITOR 角色看不到禁用按钮即"无权感知该能力存在"。

## 4. 文件总览(主要新增)

```
apps/server/src/
├ database/entities/         + 8 stage 1 entities
├ database/migrations/       + 1714867300000-Stage1Init.ts
├ database/seeds/            修改 role-permission.seed.ts(+5 权限点)
├ events/                    events.ts +5 EventName + payloads
├ events/subscribers/        + 4 customer-* subscribers
├ modules/sms/               7 文件(module/service/controller/dto/constants/specs×2)
├ modules/customer-auth/     7 文件(+constants/cross-scope spec)
├ modules/user-profile/      2 文件(无 controller)
├ modules/address/           5 文件
├ modules/realname/          5 文件
├ modules/message-setting/   2 文件(无 controller)
├ modules/admin-user/        5 文件
├ modules/integration-gateway/adapters/  改写 sms / realname,新建 wxlogin
├ modules/auth/guards/       scope-jwt.guard.ts 改造支持 jti 黑名单
└ scheduler/jobs/            + 4 stage 1 jobs

apps/customer-app/src/
├ api/index.ts               + 7 stage 1 endpoints + DTO
├ stores/auth.ts             新建 Pinia store
├ utils/request.ts           改造 401 自动 refresh
├ main.ts                    注入 refreshHandler
├ components/common/         + MobileInput / SmsCodeInput / IdCardInput / AddressCard
├ pages/login/               + verify / wechat;index 重写
├ pages/profile/realname.vue 新建
├ pages/address/{city,list,edit,map}.vue  4 新建
├ pages/me/{index,security,notification}.vue  3 新建
└ pages.json                 注册 11 路由

apps/admin-web/src/
├ api/admin-customers.ts     新建
├ views/customers/           index / detail / realname-records + components/DisableDialog
├ router/index.ts            注册 3 路由
└ vite.config.ts             加 commonjsOptions.transformMixedEsModules

packages/contracts/
├ tsconfig.esm.json          新建
├ package.json               双产物 exports
└ src/enums/index.ts         ThirdPartyProvider 加 WXLOGIN
```

## 5. 风险 & 已知问题

| ID           | 严重度 | 描述                                            | 处理                                                                                                |
| ------------ | ------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 阶段 1 P2-01 | P2     | contracts CJS dist 让 admin-web vite build 失败 | **已修**(双产物 dist)                                                                               |
| 阶段 1 P3-01 | P3     | 无地址 DELETE 接口                              | 规划接口契约清单未列 — 留给 stage 5+ 决策                                                           |
| 阶段 1 P3-02 | P3     | 微信小程序 mobile 绑定流程仅占位                | wechat-login + bindMobileRequired 后跳手机绑定页,完整自动化绑定留 stage 11                          |
| 阶段 1 P3-03 | P3     | login_device 表无清理                           | SmsCodeExpiredCleanupJob 仅清 sms,login_device revoked 行不清 — 待 stage 11 LRU                     |
| 阶段 1 P3-04 | P3     | 实名场景下 sms-code 接口仍要求 mobile 传入      | 前端从 storage 读最近 mobile,非完美;留 stage 11 增 `/c/sms-code/realname-internal` 不带 mobile 接口 |
| 阶段 1 P3-05 | P3     | LoginAnomalyDetectionJob 仅落日志               | 风控告警 / 短信通知留 stage 11                                                                      |

## 6. 后续阶段(stage 2 入口)

**stage 2** = 商家端 APP 入驻 + 店铺商品。依赖本阶段:

- `customer_user` 表无关 → 商家用 `merchant_user` 表(stage 2 建)
- `integration-gateway` adapters 已就绪(地图 amap, 文件 minio, 实名 ali-realname)
- 4 端 ScopeJwtGuard 已支持 merchant scope
- @Audit / @Idempotent / @Mask 全部装饰器可复用

需 stage 2 启动前完成的 TODO 详见 `TODO_阶段1.md`。

## 7. 提交记录

```
138d4a0 feat(stage-1): T01-T11 后端 8 表 + 7 模块 + 4 任务 + 5 事件
<下一commit> feat(stage-1): T12-T20 前端 + 测试 + 验收 (完整阶段 1 交付)
```

## 8. 总结

阶段 1 严格按 6A 流程交付:

- **Align**:固定 3 个 DESIGN 与 stage 0 现状冲突点(BIGINT / domain.customer.\* / 适配器复用),写入 TASK 与本 FINAL。
- **Architect/Atomize**:沿用 stage 0 既定 DESIGN/TASK,无擅自变更。
- **Approve**:用户"按计划走",未中断澄清。
- **Automate**:6 波串行,每完一波跑测试 + 构建 + 提交。
- **Assess**:8 节手动审查文档 + 13 AC + 20 任务自审记。

阶段 1 上线后,**用户端可注册登录、做实名、维护地址;平台 Web 可查询用户与禁用违规账号**。stage 2 起,商家入驻流程可在此账号体系上叠加。
