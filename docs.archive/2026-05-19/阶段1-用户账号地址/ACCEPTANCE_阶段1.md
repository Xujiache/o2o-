# 阶段 1 — 用户端账号地址与基础框架 · 验收文档(ACCEPTANCE)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 阶段范围

- 后端 7 个业务模块(sms / customer-auth / user-profile / address / realname / message-setting / admin-user)+ 1 个适配器扩展(integration-gateway 加 wxlogin)
- 8 张 MySQL 业务表(customer_user / customer_profile / customer_address / realname_record / sms_code / login_device / message_setting / risk_user_tag)
- 12 个 HTTP 接口(用户端 8 + 平台 Web 4)
- 5 个领域事件(domain.customer.\*)+ 4 个订阅器(address-changed 不写订阅器)
- 4 个定时任务(sms 清理 / 异地登录 / 实名补查 / 默认地址唯一性)
- 4 个新权限点(customer:public / customer:self / admin:customers:view / admin:customers:disable)+ 1 个菜单(admin:menu:customers)
- 11 个用户端页面(login×3 + profile + address×4 + me×3)
- 4 个平台 Web 页面(customers index/detail/realname-records + DisableDialog)

## 任务完成度

| Wave | 任务                               | 状态 | 关键产出                                                                                           |
| ---- | ---------------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| 1    | T01 8 表 entity + migration + seed | ✓    | 8 entity + `1714867300000-Stage1Init.ts` + 4 权限点                                                |
| 1    | T02 3 适配器 mock 扩展             | ✓    | `sms.adapter` / `realname.adapter` 重写 + `wxlogin.adapter` 新建                                   |
| 2    | T03 sms 模块                       | ✓    | `POST /c/auth/sms-code` + 限频 60s/mobile/1, IP/5, day/10                                          |
| 2    | T04 customer-auth 模块             | ✓    | login/wechat-login/refresh/logout 4 接口 + 自动注册 3 表事务 + jti 黑名单                          |
| 2    | T05 user-profile 模块              | ✓    | 内部 service `createDefault/getById/markCompleted`                                                 |
| 2    | T06 address 模块                   | ✓    | GET/POST `/c/addresses` + 默认地址事务 + mobile @Mask                                              |
| 2    | T07 realname 模块                  | ✓    | `POST /c/realname/verify` + 失败原因标准化                                                         |
| 2    | T08 message-setting 模块           | ✓    | 内部 service `createDefault/getByUserId`                                                           |
| 2    | T09 admin-user 模块                | ✓    | `/admin/customers` 4 接口 + @Mask 全字段脱敏 + 幂等 disable                                        |
| 3    | T10 4 定时任务                     | ✓    | sms-code-expired-cleanup / login-anomaly-detection / realname-retry / default-address-uniqueness   |
| 3    | T11 5 事件 + 4 订阅器              | ✓    | EventName 加 5 个;customer-registered/logged-in/realname-verified/account-disabled 4 订阅器        |
| 4    | T12 用户端登录 3 页 + auth store   | ✓    | login/index, login/verify, login/wechat + Pinia auth store + MobileInput / SmsCodeInput            |
| 4    | T13 用户端实名页                   | ✓    | profile/realname.vue + IdCardInput(本地校验位校验)                                                 |
| 4    | T14 用户端地址 4 页                | ✓    | address/{city,list,edit,map}.vue + AddressCard                                                     |
| 4    | T15 用户端个人中心 3 页            | ✓    | me/{index,security,notification}.vue                                                               |
| 5    | T16 平台 Web 用户管理 4 页         | ✓    | views/customers/{index,detail,realname-records}.vue + DisableDialog;3 路由注册;v-permission 控按钮 |
| 6    | T17 后端 jest ≥60                  | ✓    | 19 suite / 108 tests(stage 1 净增 61)                                                              |
| 6    | T18 前端 vitest ≥20                | ✓    | customer-app 21 + admin-web 8 = 29(stage 1 净增 20)                                                |
| 6    | T19 手动审查文档                   | ✓    | `项目阶段规划/01-.../手动审查与测试.md` 8 节填写,P0/P1=0                                           |
| 6    | T20 阶段验收 3 文档                | ✓    | 本文 + FINAL + TODO                                                                                |

## 验收标准(13 条)

1. **AC-01**:8 张表 migration 文件存在 + 实体导出。`apps/server/src/database/migrations/1714867300000-Stage1Init.ts` 存在;`pnpm --filter @o2o/server build` 全绿。
2. **AC-02**:4 个权限点 seed 已写。`role-permission.seed.ts` 包含 customer:public / customer:self / admin:customers:view / admin:customers:disable;SUPER_ADMIN 默认全量,AUDITOR 仅 view。
3. **AC-03**:12 接口路径与契约一致 — 见 `customer-app/src/api/index.ts:Endpoints` + `admin-web/src/api/admin-customers.ts:CustomerEndpoints`。
4. **AC-04**:端隔离生效 — `customer-auth.cross-scope.spec.ts` 7 用例全绿(Customer-Token 调 admin → FORBIDDEN)。
5. **AC-05**:自动注册 3 表事务 — `customer-auth.service.ts:autoRegister` 用 `dataSource.transaction`,内调 `profileService.createDefault(em)` + `messageSettingService.createDefault(em)`。
6. **AC-06**:sms 限频生效 — `sms.service.spec.ts` "限频:同手机号 60s 第二次 → RATE_LIMIT_EXCEEDED" + IP/day 测试。
7. **AC-07**:实名失败原因标准化 — `realname.service.spec.ts` "失败 reason=内容不符" 不含原文姓名 / "三方不可用"。
8. **AC-08**:默认地址唯一性事务 — `address.service.spec.ts` "设默认时旧默认被清 0";`DefaultAddressUniquenessJob` 兜底。
9. **AC-09**:5 事件全部 `domain.customer.*` 前缀 — `events.stage1.spec.ts` 验证;Object.values(EventName) 共 10 个(stage 0 五 + stage 1 五)。
10. **AC-10**:4 任务可手动触发 — `SchedulerController` 注册 8 个 job(stage 0 四 + stage 1 四)。
11. **AC-11**:平台 Web 禁用按钮权限隐藏 — `customers/detail.vue` v-if `userStore.has('admin:customers:disable')`;disable 走 `DisableDialog` 弹窗 + `changeCustomerStatus` 接口。
12. **AC-12**:全 monorepo 构建通过 — `pnpm -r build` ✓(server / customer-app / admin-web / merchant-app / rider-app / contracts / api-client / ui-kit)。
13. **AC-13**:全 monorepo 测试通过 — `pnpm -r test` 共 148 测试通过(server 108 + customer-app 21 + admin-web 8 + merchant-app 4 + rider-app 4 + api-client 3)。

## 自审记录(每个 T 完成后必走 6 项)

| T       | 不漏项                                      | 不多做                    | 可独立验证            | 依赖闭环              | 回归 stage 0                     | 自审记                                  |
| ------- | ------------------------------------------- | ------------------------- | --------------------- | --------------------- | -------------------------------- | --------------------------------------- |
| T01     | ✓ 8 entity + index 全部 export              | ✓ 未引入计划外字段        | ✓ build 通过          | ✓ 无依赖              | ✓ stage 0 47 测试不退化          | spec 验证表存在                         |
| T02     | ✓ 3 adapter 全有 mock + real-stub           | ✓ 不动 amap/wxpay/alipay  | ✓ 14 测试             | ✓ 依赖 T01            | ✓                                | sms.spec / realname.spec / wxlogin.spec |
| T03     | ✓ controller + service + dto + constants    | ✓ 不挂 @Audit             | ✓ 6 测试              | ✓ T01+T02             | ✓                                | 限频 + 第三方失败覆盖                   |
| T04     | ✓ 4 接口 + 自动注册事务 + jti 黑名单        | ✓ 不接微信支付            | ✓ 8 测试              | ✓ T01+T02+T03         | ✓ scope-jwt 20 测试不退化        | cross-scope 7 测试                      |
| T05/T08 | ✓ 内部 service,无 controller                | ✓ 未暴露 HTTP             | ✓ 通过 T04 验证       | ✓ T04 间接            | ✓                                | createDefault 在 autoRegister 中调      |
| T06     | ✓ list+upsert+@Mask                         | ✓ 无 DELETE 接口          | ✓ 4 测试              | ✓ T01+T04             | ✓                                | 默认事务 + 越权 + 排序                  |
| T07     | ✓ submit + 标准化失败 + 事件                | ✓ mobile 不从 req 取      | ✓ 5 测试              | ✓ T01+T02+T03+T04     | ✓                                | 已 verified 重复 + 第三方抛错           |
| T09     | ✓ 4 接口 + @Mask + 幂等                     | ✓ enable 不发事件         | ✓ 7 测试              | ✓ T04+T07             | ✓                                | 幂等已是目标态 + revoke 设备            |
| T10     | ✓ 4 job + 注册 SchedulerController          | ✓ 锁 key 与 DESIGN 一致   | ✓ 8 测试              | ✓ T03+T04+T06+T07     | ✓ stage 0 4 job 不退化           | 锁竞争 + 主流程双覆盖                   |
| T11     | ✓ EventName + 4 subscriber                  | ✓ AddressChanged 不写订阅 | ✓ 4 测试              | ✓ T03+T04+T06+T07+T09 | ✓                                | events.stage1.spec 类型层面             |
| T12     | ✓ 3 页 + auth store + 2 共用组件            | ✓ 未接订单/钱包           | ✓ 13 store 测试       | ✓ T03+T04             | ✓ format.spec 5 不退化           | 401 自动 refresh + 倒计时持久化         |
| T13     | ✓ 1 页 + IdCardInput                        | ✓ 未接 SDK                | ✓ 校验位本地          | ✓ T07                 | ✓                                | 失败 reason 显示                        |
| T14     | ✓ 4 页 + AddressCard 复用 MapView           | ✓ 无 LRU 历史             | ✓ build 通过          | ✓ T06                 | ✓                                | 默认排前                                |
| T15     | ✓ 3 页 + 6 入口仅消息可点                   | ✓ 无订单/钱包接口         | ✓ build 通过          | ✓ T05+T08             | ✓                                | logout 跳登录                           |
| T16     | ✓ 4 页 + DisableDialog + 3 路由 + admin api | ✓ 未接其他 admin 模块     | ✓ 4 admin-web 测试    | ✓ T09                 | ✓ admin-web stage 0 4 测试不退化 | v-permission 控按钮                     |
| T17     | ✓ 19 suite 108 测试 全绿                    | ✓ 不擅自加 stage 2+ 测试  | ✓ 端隔离专项          | ✓ T03~T11             | ✓                                | stage 1 净增 61 ≥ 60                    |
| T18     | ✓ 21 + 8 = 29 测试                          | ✓ 不引 e2e 浏览器         | ✓ 全绿                | ✓ T12~T16             | ✓                                | stage 1 净增 20                         |
| T19     | ✓ 8 节填写带证据                            | ✓ 不擅自标"通过"          | ✓ P0/P1=0             | ✓ T17+T18             | —                                | P2 1 项已修+复测                        |
| T20     | ✓ ACCEPTANCE/FINAL/TODO 三件套              | ✓ 不重复 stage 0 内容     | ✓ 本文 + FINAL + TODO | ✓ T19                 | —                                | git status 干净后提 commit              |

## Replay 命令(留给 stage 2 回放)

```pwsh
# 1. 准备数据库(MySQL 3307,见 MEMORY)
$env:MYSQL_HOST="127.0.0.1"; $env:MYSQL_PORT="3307"; $env:MYSQL_USER="o2o"; $env:MYSQL_PASSWORD="<dev>"; $env:MYSQL_DATABASE="o2o"

# 2. 跑迁移 + 种子
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run

# 3. 全量构建 + 测试
pnpm -r build
pnpm -r test

# 4. 启动后端 dev
pnpm --filter @o2o/server dev

# 5. 启动用户端 H5(单独终端)
pnpm --filter @o2o/customer-app dev:h5

# 6. 启动平台 Web(单独终端)
pnpm --filter @o2o/admin-web dev

# 7. 12 接口 curl 冒烟(替换 BASE)
$BASE = "http://127.0.0.1:3000"
$IDEM = [guid]::NewGuid()
curl.exe -X POST "$BASE/api/v1/c/auth/sms-code" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" -H "X-Trace-Id: t-1" -d '{"mobile":"13800000001","scene":"login"}'

# 8. 端隔离冒烟:Customer-Token 调 admin → 应返 FORBIDDEN
$T = (curl.exe -X POST "$BASE/api/v1/c/auth/login" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d '{"mobile":"13800000001","code":"123456","deviceId":"d1","platform":"h5"}' | ConvertFrom-Json).data.customerToken
curl.exe "$BASE/api/v1/admin/customers" -H "Customer-Token: $T"  # → {code: 'FORBIDDEN', ...}

# 9. dev 触发定时任务(NODE_ENV != production)
$ADMIN = (...生成 admin token,见 token:dev 脚本)
curl.exe -X POST "$BASE/api/v1/admin/scheduler/trigger/sms-code-expired-cleanup" -H "Admin-Token: $ADMIN"
```

## 验收结论

**有条件通过** — 代码 / 单测 / 构建全绿;真机抽测留待人工(MySQL+Redis 跑通 migration、curl 12 接口、浏览器看 admin 列表)。
