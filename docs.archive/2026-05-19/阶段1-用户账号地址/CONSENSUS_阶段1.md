# 阶段 1 — 用户端账号地址与基础框架 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 明确需求描述

阶段 1 在阶段 0 全局契约骨架之上,实现 **用户端账号体系完整闭环 + 平台 Web 用户管理**:

- 用户能用手机号 / 微信完成登录与自动注册,持久化登录,主动登出,access token 过期后用 refresh 续签。
- 用户能完成实名认证(三要素 mock),失败给出标准化文案。
- 用户能维护多个收件地址,默认地址唯一,基于浏览器/小程序定位选点。
- 用户能查看个人中心、账号安全、消息设置(列表入口 + 默认值,接口在 stage 1+ 补)。
- 平台 Web 管理员能查询、查看详情、查看实名记录、启用/禁用用户账号。
- 全部第三方走 mock(SMS/实名/微信登录/高德),凭证到位后改 `INTEGRATION_MODE=real`。

## 2. 技术实现方案

### 2.1 后端

| 模块            | 职责                                                           | 关键依赖                                                                  |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| customer-auth   | sms/wechat 登录、token refresh、logout、登录设备记录、自动注册 | sms 模块、integration-gateway.wxlogin、events.CustomerRegistered/LoggedIn |
| user-profile    | customer_profile 表读写,昵称/头像/性别/生日 默认值维护         | customer-auth 自动注册时调用                                              |
| address         | 地址 CRUD(本阶段仅 GET/POST)、默认地址唯一性、城市校验         | events.AddressChanged                                                     |
| realname        | 三要素 mock、状态机、失败补偿                                  | sms 模块、integration-gateway.ali-realname、events.RealnameVerified       |
| sms             | 验证码发送/校验、限频、模板配置                                | integration-gateway.ali-sms、`sys_dict`                                   |
| message-setting | 消息开关默认值维护                                             | customer-auth 自动注册时调用                                              |
| admin-user      | 后台用户查询/详情/实名记录/状态切换                            | events.AccountDisabled、auth.PermissionGuard                              |

### 2.2 数据(8 张新表)

- `customer_user`(主表):userId / mobile / wechatOpenId / accountStatus / realnameStatus / profileCompleted / registerSource / createdAt
- `customer_profile`:userId(PK) / nickname / avatar / gender / birthday / updatedAt
- `customer_address`:addressId / userId / receiverName / mobile(脱敏存) / cityCode / detail / lng / lat / isDefault / createdAt
- `realname_record`:recordId / userId / realName(脱敏存) / idCardNo(脱敏存) / status / failedReason / verifiedAt / providerRequestId
- `sms_code`:codeId / mobile / scene / code / expireAt / usedAt / clientIp
- `login_device`:loginId / userId / deviceId / platform / loginIp / loginCity / refreshToken(hash) / loginAt / lastActiveAt / status
- `message_setting`:userId(PK) / orderNotify / activityNotify / smsNotify
- `risk_user_tag`:tagId / userId / tagType(`high_value_blocked` 等) / reason / createdBy / createdAt

### 2.3 第三方适配(全部 mock)

在 `apps/server/src/modules/integration-gateway/adapters/` 追加 3 个 provider:

- `ali-sms.adapter.ts`(send/verify mock,固定返回 `{success:true, providerRequestId:'mock-xxx'}`)
- `ali-realname.adapter.ts`(verify mock,姓名首字非汉字 → failed,其他 → success)
- `wxlogin.adapter.ts`(jscode2session mock,固定返回 openId=`mock-openid-${jscode.slice(-6)}`)

### 2.4 前端

| 端       | 工程                                   | 关键依赖                                                           |
| -------- | -------------------------------------- | ------------------------------------------------------------------ |
| 用户端   | `apps/customer-app/`(Uni-app vue3)     | 阶段 0 已有 token/trace/request/format 4 件套 + Pinia + 3 共用组件 |
| 平台 Web | `apps/admin-web/`(Vue3+Vite+EP+UnoCSS) | 阶段 0 已有路由权限守卫 + v-permission + 4 预留页                  |

### 2.5 测试

- 后端 jest:每个接口 1 happy + 2 边界 + 1 权限/幂等;每个事件 1 发布 + 1 订阅器;每个定时任务 1 主流程 + 1 锁竞争。
- 前端 vitest:核心交互(登录提交、地址默认切换、admin 列表筛选)+ 路由权限。

## 3. 技术约束

- 沿用阶段 0 全部基础设施,不引入新依赖(除非规划文档强制要求)。
- 4 端 Token 物理隔离不变;新接口必须挂 `@Scope` 守卫 + 必要时 `@RequirePermission`。
- 写接口必须挂 `@Idempotent`;关键写接口必须挂 `@Audit`。
- 手机号 / 身份证 / 真实姓名 字段必须经 `@Mask` 装饰器或 `pino redaction` 在响应/日志中脱敏。
- 任何新表 entity 必须配 migration;不允许 `synchronize:true`。
- 不允许散落第三方 SDK;sms/realname/wxlogin 三方调用必须经过 `integration-gateway`。
- 时间字段:DB 用 `DATETIME(3)`,接口/前端用毫秒时间戳。
- 金额字段:本阶段无金额。距离用米(地址选点不存距离;后续阶段使用)。
- 字段命名:camelCase;DB 列名 snake_case;TypeORM `naming.SnakeNamingStrategy`。

## 4. 集成方案

### 4.1 与阶段 0 的对接

- `auth.module`:扩展 4 端守卫无需改动;customer-auth 模块复用 `AuthService.signAccessToken`。
- `integration-gateway`:已有 6 provider 框架,本阶段追加 3 个 provider 文件,自动按 `INTEGRATION_MODE` 注入。
- `audit-log` + `events`:本阶段新模块通过 `@Audit` + `DomainEventBus.publish` 接入,无需改基建。
- `scheduler`:4 个新定时任务继承 `BaseJob`,自动注册到 `SchedulerModule`。

### 4.2 与未来阶段的对接

- 阶段 4(用户端外卖闭环)依赖本阶段 `customer_user.realnameStatus` 字段做高额订单限制。
- 阶段 5(用户端跑腿闭环)依赖本阶段 `customer_address` 表做收发件地址。
- 阶段 9(平台 Web 运营)在本阶段 admin-user 基础上扩展消费记录、风控等。
- `risk_user_tag` 表本阶段仅创建 + 提供 tagType=`high_value_blocked`,真正打标在风控阶段。

## 5. 任务边界限制(再次明确"不做")

- 不做地址 DELETE 接口(规划接口契约清单未明列;登记 `问题与风险记录.md` P3)。
- 不做地址历史(LRU 最近 5 条)接口(同上)。
- 不做 user-profile / message-setting 的 GET/PATCH 接口(规划接口契约清单未明列)。
- 不做钱包 / 优惠券 / 积分 / 收藏接口(本阶段不开发);个人中心仅显示入口 + 默认值。
- 不做支付密码 / 设备绑定二次校验(留 stage 11 安全)。
- 不做敏感操作短信验证强制弹窗;实名场景内嵌 sms 校验即可。
- 不做用户头像上传 UI(后端复用 stage 0 `/pub/files/upload`,前端不接入,留 stage 1+)。
- 不做异地登录推送(只发布事件 + 定时任务记录,推送通道留 stage 3)。

## 6. 验收标准

### 6.1 接口 12 项

每个接口必须满足:

- 符合 `全局接口契约规范.md`(前缀 + Token + 统一响应)
- 请求/响应字段、错误码、幂等、审计与 `接口契约清单.md` 或本阶段拓展声明一致
- 5xx 与 4xx 通过 `AllExceptionsFilter` 统一返回 `{code, message}`
- 全部接口在 jest 中至少 1 happy + 1 异常 + 1 权限/幂等 用例

### 6.2 数据表 8 张

- entity 与 migration 一一对应
- 必要索引齐全(mobile / userId / addressId / status)
- migration 可 `up/down` 双向运行
- 必要种子(`risk_user_tag` 占位空表 / `message_setting` 默认值)

### 6.3 定时任务 4 项

- 每个 job 继承 `BaseJob`,带分布式锁、metrics、try/catch
- 每个 job 在 `dev` 模式可通过 `POST /admin/scheduler/trigger/:job` 手动触发
- 每个 job 至少 1 个 jest 测试覆盖主流程

### 6.4 领域事件 5 项

- 每个事件在 `events.ts` 注册类型 + payload 接口
- 每个事件至少 1 个默认订阅器或显式标注"无订阅器,留 stage X"
- 重试机制使用阶段 0 已有 `DomainEventRetryJob`

### 6.5 前端页面 11+4

- 用户端每页处理 loading / 空 / 错误 / token 失效
- 平台 Web 每页处理 loading / 空 / 错误 + 权限受限提示
- 全部接口走 API 常量,不允许散写 URL
- 状态展示引用后端枚举,不允许中文文案判断

### 6.6 文档

- `项目阶段规划/01-阶段1-.../手动审查与测试.md` 全部 P0/P1 项填证据,P0/P1 清零
- `项目阶段规划/01-阶段1-.../问题与风险记录.md` 维护(本阶段已知 1 项 P3:地址 DELETE)
- `docs/阶段1-用户账号地址/{ALIGNMENT,CONSENSUS,DESIGN,TASK,ACCEPTANCE,FINAL,TODO}` 7 份完整

## 7. 不确定性已解决

- [x] Q1 第三方真连?— mock(用户拍板)
- [x] Q2 高德真连?— mock(用户拍板)
- [x] Q3 admin 详情/实名记录/禁用补?— 补 3 个接口(用户拍板)
- [x] Q4 refresh/logout 接口?— 补 2 个接口(用户拍板)
- [x] 地址 DELETE / 历史地址 / user-profile 接口 — 不做,登记 P3
- [x] 阶段 0 基建完整可用,无需重做

无遗留不确定性,可进入 DESIGN 与 TASK 阶段。
