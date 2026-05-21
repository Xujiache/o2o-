# 阶段0 — 项目初始化与全局契约 · 共识文档(CONSENSUS)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 明确需求

按 ALIGNMENT 第 3 节边界,本阶段交付:**Monorepo 工程骨架 + 后端 9 模块基线 + 5 个公共接口 + 9 张系统表 + 4 端前端骨架 + 全局中间件 + Docker Compose + CI**,不实现具体业务页面/订单逻辑。

## 2. 技术方案(已固化)

| 类别      | 选型                                                                    | 备注                                       |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| 包管理    | **pnpm 9** + workspace                                                  | Monorepo                                   |
| 后端框架  | **NestJS 10** + TypeScript 5(strict 全开)                               |                                            |
| 后端 ORM  | **TypeORM 0.3**(DataMapper 模式)                                        | 配 MySQL 8                                 |
| MongoDB   | **Mongoose 8**                                                          | 轨迹/审计明细/操作日志                     |
| Redis     | **ioredis 5**                                                           | 会话/限流/分布式锁/幂等                    |
| 鉴权      | **@nestjs/jwt + Passport**(4 Strategy:Customer/Merchant/Rider/Admin)    | Token 内含 `sub/role/scope/jti/iat/exp`    |
| 校验      | **class-validator + class-transformer**                                 | 全局 ValidationPipe                        |
| API 文档  | **@nestjs/swagger**                                                     | dev 环境暴露 `/api-docs`                   |
| 日志      | **pino**(JSON)+ traceId                                                 | dev 用 pino-pretty                         |
| 限流      | **@nestjs/throttler + Redis store**                                     |                                            |
| 测试      | **Jest 29**(后端单测/e2e)                                               |                                            |
| 平台 Web  | **Vue 3 + Vite 5 + TypeScript + Pinia 2 + Vue Router 4 + Element Plus** | 暂定 Element Plus,如需 Ant Design Vue 可换 |
| Uni-app   | **Uni-app Vue 3 + TypeScript + Pinia + uview-plus**                     | 用户/商家/骑手三端统一栈                   |
| 共享包    | `@o2o/contracts` `@o2o/api-client` `@o2o/ui-kit`                        | TS 类型                                    |
| 容器      | **Docker Compose**(MySQL 8 / Redis 7 / MongoDB 7 / MinIO)               | dev 一键起                                 |
| 文件存储  | **MinIO**(S3 兼容,部署在用户自有服务器)                                 | 暂定 MinIO,**待用户确认是否换**            |
| 第三方    | 高德 / 微信支付 / 支付宝 / 个推 / 阿里云短信 / 阿里云实名认证           | 阶段0 全部 Mock 实现,接口契约就位          |
| Lint      | ESLint(typescript-eslint + @vue/eslint-config-typescript)+ Prettier     |                                            |
| Git Hooks | Husky + lint-staged + commitlint(Conventional Commits)                  |                                            |
| CI        | GitHub Actions(lint + typecheck + test;PR 触发)                         |                                            |
| Node 版本 | **Node 20 LTS**                                                         | 锁版本 `package.json#engines`              |

### 2.1 第三方凭证管理

- 阶段0 不需要真实凭证,适配层全部 **Mock**,启动时根据 `.env` 中的 `INTEGRATION_MODE=mock|real` 切换。
- `.env.example` 列出所有键名(不含值),真实 `.env` 加入 `.gitignore`。

### 2.2 待用户确认事项(不阻塞 Stage 0,可先按默认推进)

- **Q7** Web UI 库:默认 **Element Plus**,如换 Ant Design Vue 后续 1-2 小时可替换。
- **Q8** Uni-app UI 库:默认 **uview-plus**。
- **Q9** 文件存储:默认 **MinIO**(自建,部署在用户服务器);如用户已有 S3 兼容服务,只需改 `.env` 中的 endpoint/bucket。
- **Q13** 短信:默认 **阿里云**(腾讯云适配类似,后续可加 Strategy)。
- **Q14** 实名:默认 **阿里云人脸/身份证核验**。
- **Q11** 凭证提供时点:在 Stage 1+ 接到具体业务前提供即可。

## 3. 任务边界

### 3.1 Stage 0 IN

- 工程骨架 + 9 后端模块 + 5 接口 + 9 表 + 全局中间件 + 4 端前端骨架 + Docker Compose + CI + ESLint/Prettier/Husky + 文档同步。
- 跨端 Token 隔离的鉴权守卫与单测。
- 第三方适配 **接口定义 + Mock 实现**(地图/支付/短信/推送/实名/文件存储)。
- 6A 的 ACCEPTANCE/FINAL/TODO 文档收尾。

### 3.2 Stage 0 OUT(留给后续阶段)

- 任何具体业务页面与业务表(订单、店铺、商品、地址、配送任务等)。
- 真实第三方接入(凭证、回调、对账)。
- iOS 真机打包 / Android 应用商店上架。
- 生产环境部署、备份、容灾、Nginx/SSL。
- 性能压测 / 安全渗透。

## 4. 接口契约(本阶段 5 个)

按 `项目阶段规划/00-阶段0-...` 的 `接口契约清单.md` **完全照搬**,共 5 个,见 ALIGNMENT 第 2.4 节。

## 5. 数据契约(本阶段 9 张表)

| 表                   | 用途                                     | 关键字段                                                        |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `sys_dict`           | 字典(状态枚举、性别、订单类型等)         | `dict_type/code/label/sort/enabled`                             |
| `sys_config`         | 系统参数(超时阈值、结算周期、限流阈值等) | `key/value/description/scope`                                   |
| `sys_error_code`     | 错误码表(供后台维护文案)                 | `code/i18n/level/description`                                   |
| `sys_role`           | 平台角色                                 | `code/name/scope`(scope ∈ admin/merchant/rider/customer)        |
| `sys_permission`     | 权限点                                   | `code/name/scope/menu/button`                                   |
| `sys_audit_log`      | 审计日志                                 | 见 ALIGNMENT 2.1 字段集                                         |
| `file_object`        | 文件元信息                               | `file_id/biz_type/owner_type/owner_id/url/size/expire_at`       |
| `third_party_config` | 第三方配置                               | `provider/env/encrypted_secret/last_health_at/status`           |
| `idempotency_record` | 幂等记录                                 | `idempotency_key/scope/request_hash/response_payload/expire_at` |

种子数据:字典(状态枚举来自全局状态机)、4 端基础角色、阶段0 涉及权限点、错误码表、3 个种子城市(便于后续测试)。

## 6. 全局规范(强制)

- **统一响应**:`{ code: string, message: string, data: any | null, traceId: string, timestamp: number }`
- **错误码**:本阶段固化 `INVALID_PARAM` `UNAUTHORIZED` `FORBIDDEN` `DATA_NOT_FOUND` `STATUS_INVALID` `DUPLICATE_REQUEST` `THIRD_PARTY_ERROR` `INTERNAL_ERROR` `RATE_LIMIT_EXCEEDED`;`code` 字段为字符串(便于扩展子码)。
- **traceId**:Gateway 入口生成或透传 `X-Trace-Id`,贯穿日志/响应/审计。
- **幂等**:写接口装饰器 `@Idempotent({ scope, ttl })` + Redis 存储 `idempotency_record`,24h TTL。
- **审计**:装饰器 `@Audit({ targetType })`,拦截器自动记录 `before/after`。
- **限流**:每 IP 每端独立桶,`pub` 较松,`admin` 严格,可配置。
- **金额**:`integer` 分;响应/请求字段名 `*Amount` `*Fee` `*Price`。
- **时间**:`number` 毫秒时间戳。
- **距离**:`number` 米。
- **字段命名**:camelCase,前端展示层做格式化。

## 7. 验收标准(可测试)

| #    | 标准                                                                                               | 验证方式                                        |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| AC1  | `pnpm install` 安装全部依赖,无 peer 冲突                                                           | `pnpm install` 退出码 0                         |
| AC2  | `docker compose -f deploy/docker-compose.dev.yml up -d` 拉起 4 个服务(MySQL/Redis/Mongo/MinIO)健康 | `docker compose ps` 全部 healthy                |
| AC3  | 后端启动后 `GET /api/v1/pub/health` 返回 `code=0` 且 traceId 不为空                                | curl                                            |
| AC4  | 9 张表迁移成功,种子数据存在                                                                        | 连 MySQL 查 `SELECT count(*) FROM sys_dict` ≥10 |
| AC5  | 5 个 stage-0 接口在 Swagger 中可见且能调通                                                         | 访问 `/api-docs`,Try it out                     |
| AC6  | 4 类 Token 跨端调用返回 `FORBIDDEN`(用 Customer-Token 调 `/admin/**` 等)                           | 单测 + e2e                                      |
| AC7  | 同一 `Idempotency-Key` 重复请求返回相同 body 不重复落库                                            | e2e                                             |
| AC8  | 写接口在 `sys_audit_log` 留痕(traceId、operatorType、targetType、before/after)                     | DB 查                                           |
| AC9  | 4 端前端 dev server 启动成功,首页可见;调用 `/pub/dictionaries` 渲染状态标签组件                    | 浏览器/HBuilderX                                |
| AC10 | 全局错误演示:Customer-Token 调 `/m/**` → 提示文案 + 跳转登录                                       | 浏览器                                          |
| AC11 | CI:lint + typecheck + 单测全绿                                                                     | GitHub Actions                                  |
| AC12 | 商家端工程不含 Web/小程序产物                                                                      | 文件清单审查                                    |
| AC13 | `手动审查与测试.md`(Stage 0)逐项填写,P0/P1 清零                                                    | 人工审查                                        |

## 8. 与现有规划对齐情况

- ✅ 复用 `项目阶段规划/00-阶段0-...` 全部清单,无替换、无遗漏。
- ✅ 全局接口契约规范、全局状态机与业务规则被引用而非重写。
- ✅ 商家端边界:仅 Uni-app(打包 Android/iOS),代码内无 Web/小程序入口。
- ✅ 外卖/跑腿独立性:Stage 0 不涉及订单,但状态机文件已分两套常量,留给阶段5/6 直接使用。

## 9. 风险与缓解

| 风险                                          | 缓解                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Uni-app Vue3 小程序与 Android 端 API 兼容差异 | 使用 `uni.*` 抽象 + 条件编译;先验证 H5/微信小程序两端,Android/iOS 包延后 |
| MinIO 在用户自有服务器的网络/磁盘瓶颈         | 阶段0 仅本地 dev,生产部署用 Nginx 反代 + 加密 URL                        |
| iOS 包需要 Mac + 证书                         | 不阻塞;阶段0 跑通工程,真机打包延后                                       |
| 凭证未到位导致第三方真实回调测不了            | Mock 适配 + 接口契约前置;凭证到位后切换                                  |

---

**共识结论**:本阶段技术方案已确定;Element Plus / uview-plus / MinIO / 阿里云短信 / 阿里云实名 为暂定默认,可在 Stage 1 之前替换。可进入 DESIGN 阶段。
