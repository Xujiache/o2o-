# 阶段 1 — 用户端账号地址与基础框架 · 对齐文档(ALIGNMENT)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目特性规范(继承自阶段 0)

- **业务**:O2O 平台,外卖 + 跑腿两条独立业务线。
- **端**:用户端(微信小程序+Android+iOS,Uni-app)/ 商家端(仅 Android+iOS,Uni-app)/ 骑手端(Android+iOS,Uni-app)/ 平台管理端(Web,Vue3+Vite)。
- **后端**:NestJS 单体模块化;MySQL 8 主存储 + Redis 缓存/会话/分布式锁 + MongoDB 审计明细。
- **强约束**:外卖与跑腿独立订单/状态机/计价/退款;4 端 Token 物理隔离;统一响应包;`Idempotency-Key` 写幂等;关键写操作 `@Audit` 审计。

## 2. 阶段 1 原始需求(摘自 `项目阶段规划/01-阶段1-用户端-账号地址与基础框架/` 9 份文档)

### 2.1 阶段目标(`阶段规划.md`)

完成用户端小程序 + Android APP + iOS APP 的:

- 手机号验证码登录、微信快捷登录、新用户自动注册、退出登录、token 刷新
- 持久化登录、异地登录提醒、敏感操作短信验证
- 实名认证(姓名+身份证),未实名限制高价值跑腿和大额代办
- LBS 定位、城市切换、地址增删改查、默认地址、历史地址
- 个人中心基础信息、订单/收藏/优惠券/积分/钱包/消息设置入口

平台 Web 提供:用户查询、实名状态查看、账号禁用/启用、消费记录占位、敏感信息脱敏展示。

### 2.2 本阶段不做(`阶段规划.md`)

不开发:外卖下单、跑腿下单、支付、商家入驻、骑手入驻。

### 2.3 接口(`接口契约清单.md` 共 7 个)

| #   | 方法 | 路径                        | Token    | 用途           |
| --- | ---- | --------------------------- | -------- | -------------- |
| 1   | POST | /api/v1/c/auth/sms-code     | 无       | 发送短信验证码 |
| 2   | POST | /api/v1/c/auth/login        | 无       | 手机号登录     |
| 3   | POST | /api/v1/c/auth/wechat-login | 无       | 微信快捷登录   |
| 4   | POST | /api/v1/c/realname/verify   | Customer | 提交实名认证   |
| 5   | GET  | /api/v1/c/addresses         | Customer | 地址列表       |
| 6   | POST | /api/v1/c/addresses         | Customer | 新增/编辑地址  |
| 7   | GET  | /api/v1/admin/customers     | Admin    | 后台用户查询   |

### 2.4 后端模块(`后端数据任务事件.md` 共 7 个)

`customer-auth / user-profile / address / realname / sms / message-setting / admin-user`

### 2.5 数据表(`后端数据任务事件.md` 共 8 张)

`customer_user / customer_profile / customer_address / realname_record / sms_code / login_device / message_setting / risk_user_tag`

### 2.6 定时任务(`后端数据任务事件.md` 共 4 个)

- 验证码过期清理
- 异地登录检测和提醒
- 实名核验结果补偿查询
- 默认地址唯一性校正

### 2.7 领域事件(`后端数据任务事件.md` 共 5 个)

`CustomerRegistered / CustomerLoggedIn / RealnameVerified / AddressChanged / AccountDisabled`

### 2.8 用户端页面(`前端页面与接口对接.md` 共 11 页)

登录页、验证码页、微信授权页、实名页、城市选择、地址列表、地址编辑、地图选点、个人中心、账号安全、消息设置。

### 2.9 平台 Web 页面(`前端页面与接口对接.md` 共 4 项)

用户列表、用户详情、实名记录、账号禁用弹窗。

### 2.10 第三方依赖(`阶段规划.md`)

- 微信登录(jscode2session)
- 短信验证码(阿里云 SMS)
- 实名核验(阿里云实名)
- 地图定位 + 逆地理编码(高德)

### 2.11 业务规则(`状态机与业务规则.md`)

- 未登录访问个人信息必须跳转登录
- 默认地址同一用户只能有一个
- 实名失败原因可展示但不得泄露第三方原始报文
- 后台手机号、身份证、地址详情必须脱敏
- 验证码 / 登录 / 实名 限频(短信场景 60s 间隔、单日 10 条)

## 3. 边界确认

### 3.1 阶段 1 做什么

#### 后端

- 7 个业务模块完整实现(customer-auth/user-profile/address/realname/sms/message-setting/admin-user)
- 8 张数据表(entity + migration + 必要种子)
- **12 个接口**:7 个规划必列 + 2 个 token 接口(refresh/logout) + 3 个平台 Web 拓展(详情/实名记录/账号状态)
- 4 个定时任务(沿用阶段 0 `BaseJob` 与 `DistributedLockService`)
- 5 个领域事件(沿用阶段 0 `DomainEventBus` 与重试机制)
- 第三方适配扩展:在 `integration-gateway` 中追加 `ali-sms` / `ali-realname` / `wxlogin` mock 实现(本阶段不真连)

#### 用户端(11 页)

- 登录 / 验证码 / 微信授权 3 页 + token 持久化 + 自动注册标记
- 实名页(身份证 OCR 留空 / 文本输入即可)
- 城市选择(消费阶段 0 已有 `/pub/cities`)
- 地址列表 / 地址编辑 / 地图选点(高德 SDK / 阶段 0 amap mock 适配)
- 个人中心 / 账号安全 / 消息设置

#### 平台 Web(4 页)

- 用户列表(列表 + 关键字筛选 + 实名/账号状态筛选)
- 用户详情(基础信息 + 实名状态 + 消费占位)
- 实名记录(单用户实名历史)
- 账号禁用弹窗(启用/禁用切换)

#### 测试与文档

- 后端 jest 覆盖:12 接口 + 4 任务 + 5 事件 + 权限 + 幂等
- 前端 vitest 覆盖:用户端 11 页关键路径 + 平台 Web 4 页
- `项目阶段规划/01-阶段1-.../{手动审查与测试,问题与风险记录}.md` 填写证据
- `docs/阶段1-用户账号地址/{ALIGNMENT,CONSENSUS,DESIGN,TASK,ACCEPTANCE,FINAL,TODO}_阶段1.md` 7 份产出

### 3.2 阶段 1 不做(明确划界)

- 外卖下单、跑腿下单、支付、商家入驻、骑手入驻、订单状态机、运费计算、抢单调度。
- 微信支付 / 支付宝 / 个推 / OSS 真接入(留 stage 4+ 与 stage 11)。
- 钱包流水、优惠券、积分、收藏(列表入口在个人中心仅占位,不接接口)。
- 第三方真实凭证接入(阿里云 SMS/实名、微信登录、高德 — 本阶段全 mock,见决策 1/2)。
- 地址 DELETE 接口(规划接口契约清单未明列,登记到 `问题与风险记录.md` P3,**不擅自实现**)。

### 3.3 商家端 / 骑手端

- 本阶段不新增功能。
- 仅复核 Token 隔离边界(无回归);仅消费接口时按 `Merchant-Token` / `Rider-Token` 走对应路径。

## 4. 需求理解

### 4.1 customer-auth 模块

- 短信验证码登录 + 微信快捷登录 + 新用户自动注册(首次登录自动 INSERT customer_user)。
- token 体系:access(2h)+ refresh(30d);refresh 持久化在 `login_device` 表。
- 退出登录:吊销 access(写 jti 黑名单)+ 删除 login_device 记录。
- 异地登录检测(定时任务):检测同一 user 跨城市登录,推送告警事件 `CustomerLoggedIn` payload 含 ip/city。
- 敏感操作短信验证:实名等 scene 复用 sms 模块;`scene` 枚举:`login / realname / change-mobile / sensitive`。

### 4.2 user-profile 模块

- 维护 `customer_profile` 表(昵称、头像、性别、生日)。
- 阶段 1 不暴露 GET/PATCH 接口(接口契约清单未列),仅供模块内部读写(由 customer-auth 自动注册触发 INSERT,实名通过后回写)。
- 个人中心页面所需基础信息从 `/c/auth/login` 响应或 `customer_user.profileCompleted` 字段判断;详细 profile 留 stage 1+ 接口(本阶段不开)。

### 4.3 address 模块

- GET 列表(分页,默认 isDefault 排前)。
- POST 新增/编辑(addressId 可选,不传即新增;`isDefault=true` 自动把同 user 其他地址的 isDefault 置 0)。
- 默认地址唯一性:写入时事务保证 + 定时任务每日补偿。
- LBS 定位与逆地理在前端调高德 SDK,后端 `/c/addresses` 不调地图(规划接口契约未列地图 API)。

### 4.4 realname 模块

- 三要素:realName + idCardNo + smsCode(scene=realname)。
- 提交后 `realname_record` 状态:`pending → success / failed`。
- 失败 reason 仅返回标准化文案(`内容不符 / 三要素不一致 / 三方不可用`),不透传第三方原文。
- 实名成功 → 回写 `customer_user.realnameStatus=verified` + 发布 `RealnameVerified` 事件。
- 第三方失败的补偿:定时任务对 pending 超过 5 分钟的 record 重新查 status。

### 4.5 sms 模块

- POST /c/auth/sms-code 公开接口,无 Token。
- 防爆破:同一手机 60s 内 1 次、同 IP 1min 内 5 次、同手机 1 天 10 次(用 Redis 计数 + Throttler)。
- 验证码 6 位,5 分钟过期,使用 1 次后失效。
- captchaToken 字段保留(本阶段不强校验,留滑块/图形验证码 stage 11 加)。
- 模板与签名走 `sys_dict` 配置(`dictType=sms_template`)。

### 4.6 message-setting 模块

- 维护 `message_setting` 表(订单通知、活动推送、短信开关)。
- 阶段 1 不暴露 GET/PATCH 接口(规划接口契约未列),仅供 service 内部使用 + 个人中心展示默认值。
- 用户首次登录时自动 INSERT 默认设置。

### 4.7 admin-user 模块

- GET /admin/customers 列表(关键字 / realnameStatus / accountStatus 筛选,手机号脱敏)。
- GET /admin/customers/:id 详情(决策 3 新增)。
- GET /admin/customers/:id/realname-records 实名记录(决策 3 新增)。
- POST /admin/customers/:id/status 启用/禁用(决策 3 新增,operation=enable/disable + reason)。
- 权限点:`admin:customers:view` / `admin:customers:disable`(后者新增)。
- 关键写操作均挂 `@Audit`;禁用动作发布 `AccountDisabled` 事件。

### 4.8 4 个定时任务

- `SmsCodeExpiredCleanupJob`:每 5 分钟,删除 `sms_code` 已过期 + 已使用记录,保留 7 天审计。
- `LoginAnomalyDetectionJob`:每 10 分钟,扫描 `login_device` 最近 1h 异地登录,发布 `CustomerLoggedIn` 告警 payload。
- `RealnameRetryJob`:每 1 分钟,对 `realname_record` 状态 pending 超 5 分钟的重查第三方(mock 直接落地 success/failed)。
- `DefaultAddressUniquenessJob`:每天 03:30,扫描 `customer_address` group by userId,若多于 1 条 isDefault=1 则保留最新一条,告警事件。

### 4.9 5 个领域事件

| 事件               | 触发时机               | payload                                    | 默认订阅器                                             |
| ------------------ | ---------------------- | ------------------------------------------ | ------------------------------------------------------ |
| CustomerRegistered | 首次登录自动建号       | userId, mobile, registerSource, deviceId   | 写 customer_profile + message_setting 默认值           |
| CustomerLoggedIn   | 每次登录成功           | userId, deviceId, ip, city, scene          | 更新 login_device(异地检测在定时任务)                  |
| RealnameVerified   | 实名认证成功           | userId, realName, idCardMasked, verifiedAt | 回写 customer_user.realnameStatus + 解锁高额跑腿(占位) |
| AddressChanged     | 地址新增/编辑/默认切换 | userId, addressId, action                  | 审计落库(已通过 `@Audit` 覆盖,事件订阅器在阶段 5+ 用)  |
| AccountDisabled    | 后台禁用账号           | userId, operatorId, reason                 | 吊销该用户全部 access token + login_device 软删        |

## 5. 疑问澄清(用户已拍板)

### Q1:阿里云短信 / 实名 / 微信登录是否真连?

**用户答**:阶段 1 不真连。
**落地方案**:`integration-gateway` 中三个 provider 仅出 mock 实现 + real-stub(占位 throw "not configured")。`INTEGRATION_MODE=mock`(默认)。`.env` 占位写入但不校验。

### Q2:高德定位 / 逆地理是否真连?

**用户答**:阶段 1 不真连。
**落地方案**:用户端地图选点页前端调用 amap H5 SDK 但传 mock key(展示北京样板地图);后端 `/c/addresses` 不依赖地图。地图 mock 行为:固定返回北京坐标 + "北京市朝阳区某路 1 号"。

### Q3:平台 Web 用户详情 / 实名记录 / 账号禁用接口规划文档未列,如何处理?

**用户答**:可以直接加进来。
**落地方案**:新增 3 个接口:

- `GET /api/v1/admin/customers/:id`
- `GET /api/v1/admin/customers/:id/realname-records`
- `POST /api/v1/admin/customers/:id/status`(operation=enable/disable + reason)

并在 `项目阶段规划/01-阶段1-.../接口契约清单.md` 之外,**补登记到 `docs/阶段1-用户账号地址/DESIGN_阶段1.md` 与 `TASK_阶段1.md` 的接口表**,验收时同步在 ACCEPTANCE 中标注"规划文档外补足项"。

### Q4:token refresh / logout 在接口契约清单未明列,如何处理?

**用户答**:怎么方便怎么来,不漏项不多开发。
**落地方案**:作为 customer-auth 模块内置接口实现,共 2 个:

- `POST /api/v1/c/auth/refresh`(请求:refreshToken;响应:新 accessToken + 新 refreshToken)
- `POST /api/v1/c/auth/logout`(请求:无 body,Header `Customer-Token`;响应:`{ok:true}`)

理由:《阶段规划.md》明列"退出登录、token 刷新"功能;不实现则前端无法满足"持久化登录、异地登录提醒"业务规则。属于"补足规划自身缺漏",非越界。

## 6. 关键假设与已确认事项

- [x] 阶段 0 的 4 端 Token 机制 / 幂等 / 审计 / 限流 / 事件总线 已完整可用(已验证)。
- [x] `INTEGRATION_MODE=mock` 仍可作为本阶段默认配置,无需新增配置项。
- [x] 阶段 0 已有 `/pub/cities` `/pub/dictionaries` 接口,城市选择与字典直接消费,不重复实现。
- [x] 阶段 0 的 `DomainEventBus` 持久化 + 重试已就绪,5 个新事件直接定义类型即可发布。
- [x] 阶段 0 的 `DistributedLockService` + `BaseJob` 已就绪,4 个新定时任务直接继承即可。
- [x] 阶段 0 的 admin-web 已有路由权限守卫 + `v-permission` 指令 + 用户管理菜单占位,本阶段填充 4 页内容即可。
- [x] 阶段 0 的 customer-app 已有 token/trace/format/request 4 件套 + Pinia + 3 共用组件,本阶段直接消费。
- [x] 商家端 / 骑手端阶段 1 不新增功能,只在 `按端实施范围.md` 标注"不涉及"。

## 7. 边界审查清单(阶段 1 准入门禁)

- [ ] 接口数量 12 个(7 必列 + 2 token + 3 admin 拓展);商家端 / 骑手端 0 接口。
- [ ] 后端模块 7 个;数据表 8 张;定时任务 4 个;领域事件 5 个 — 与规划文档 1:1。
- [ ] 用户端页面 11 个 + 平台 Web 4 页 — 与规划文档 1:1。
- [ ] 第三方全部 mock 模式;不动 stage 0 的真接口配置。
- [ ] 商家端无 Web、无小程序边界复核通过;跑腿不进入商家流程。
- [ ] 4 端 Token 物理隔离不破坏(用户端 jwt secret 与 admin secret 独立)。
- [ ] 金额/距离/时间字段单位与全局规范一致(本阶段无金额,有距离/时间)。
