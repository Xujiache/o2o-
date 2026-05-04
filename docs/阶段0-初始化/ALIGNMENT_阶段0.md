# 阶段0 — 项目初始化与全局契约 · 对齐文档（ALIGNMENT）

> 商家端仅 Android APP / iOS APP，禁止规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须独立订单体系、独立状态机、独立计价、独立退款规则。

## 1. 项目特性规范

- **业务**：O2O 平台,提供外卖 + 跑腿两条独立业务线。
- **端**：4 端共 6 形态
  - 用户端:微信小程序 + Android APP + iOS APP(Uni-app 单源多端)
  - 商家端:**仅 Android APP + iOS APP**(Uni-app)
  - 骑手端:Android APP + iOS APP(Uni-app)
  - 平台管理端:**Web 后台**(Vue 3 + Vite)
- **后端**:Node.js 单体后端起步,NestJS 模块化拆分,后续按业务量评估是否拆分微服务。
- **数据**:MySQL 8 主存储 + Redis 缓存/会话/分布式锁 + MongoDB 轨迹/操作日志/审计明细。
- **强约束**:外卖与跑腿独立订单体系/状态机/计价/退款规则,严禁混用。

## 2. 原始需求(摘自 `项目阶段规划/00-阶段0-...`)

### 2.1 工程基线

- Monorepo 结构,后端 NestJS,前端 4 端各一工程。
- 统一前缀:`/api/v1/c/**` `/api/v1/m/**` `/api/v1/r/**` `/api/v1/admin/**` `/api/v1/pub/**` `/api/v1/callback/**`。
- 4 类 Token 严格隔离:`Customer-Token` / `Merchant-Token` / `Rider-Token` / `Admin-Token`。
- 统一响应:`{ code, message, data, traceId, timestamp }`。
- 字段约定:camelCase、金额用分、距离用米、时间用毫秒时间戳。
- 错误码:`INVALID_PARAM` `UNAUTHORIZED` `FORBIDDEN` `DATA_NOT_FOUND` `STATUS_INVALID` `DUPLICATE_REQUEST` `THIRD_PARTY_ERROR`。
- 写接口幂等(`Idempotency-Key`),关键写操作审计日志(`traceId/operatorType/operatorId/targetType/targetId/beforeStatus/afterStatus/ip/deviceId/createdAt`)。

### 2.2 后端模块(9 个)

`gateway` `auth` `common-config` `dict` `file` `integration-gateway` `audit-log` `system` `risk`。

### 2.3 核心数据表(9 张)

`sys_dict` `sys_config` `sys_error_code` `sys_role` `sys_permission` `sys_audit_log` `file_object` `third_party_config` `idempotency_record`。

### 2.4 阶段0 接口(5 个)

- `GET /api/v1/pub/dictionaries`
- `GET /api/v1/pub/cities`
- `POST /api/v1/pub/files/upload`(走当前端 Token 的业务归属)
- `GET /api/v1/admin/integrations/health`
- `GET /api/v1/admin/audit-logs`

### 2.5 第三方

- 地图:高德(定位、逆地理、距离、路线、轨迹)
- 支付:微信支付 + 支付宝(预支付、回调、退款、对账)
- 推送:个推(APP) + 微信模板消息(小程序)
- 短信:验证码 + 业务通知
- 实名:用户/骑手/商家三类
- 文件存储:用户自有服务器

### 2.6 时效规则(全局)

- 下单 15 分钟未支付自动关单
- 外卖商家 5 分钟未接单提醒、10 分钟未接单自动取消全额退款
- 跑腿 3 分钟无人接单自动加价、10 分钟仍无接单自动取消全额退款
- 默认 T+1 自动结算(可配)

### 2.7 状态机

- 外卖:`WAIT_PAY → PAID_WAIT_MERCHANT → MERCHANT_ACCEPTED → PREPARING → READY_FOR_PICKUP → RIDER_ASSIGNED → PICKED_UP → DELIVERING → DELIVERED → COMPLETED`(异常 `CANCELLED/REFUNDING/REFUNDED/AFTER_SALE`)
- 跑腿:`WAIT_PAY → PAID_WAIT_RIDER → PRICE_INCREASED → RIDER_ASSIGNED → WAIT_PICKUP → PICKED_UP → DELIVERING → WAIT_CONFIRM → COMPLETED`(异常同上)

## 3. 边界确认

### 3.1 阶段0 做什么

- Monorepo 工程骨架(后端 + 4 端前端)。
- 后端 9 模块的目录、Controller/Service/DTO/VO 占位、5 个 stage-0 接口。
- 9 张系统表的迁移脚本与种子数据(字典/角色/权限/错误码)。
- 全局中间件:JWT 鉴权(4 端隔离)、统一响应/异常、错误码、`traceId`、幂等、审计日志、限流。
- 第三方适配层骨架(地图/支付/短信/推送/实名/文件存储)以接口形式暴露,本阶段允许 `Mock` 实现并标记。
- 4 端前端骨架:Uni-app × 3 + Vue3 Web × 1,含请求封装、Token 存储、统一错误提示、登录态失效跳转、3 个共用组件(地图、文件上传、状态标签)、API 常量、占位页(启动页/授权页/登录占位/审核中/403/404/网络错误)。
- Docker Compose 一键拉起 MySQL/Redis/MongoDB 本地开发环境。
- ESLint + Prettier + Husky + commitlint + GitHub Actions CI(lint + 单测)。
- `.env.example` + 配置加载机制(密钥不入仓库)。

### 3.2 阶段0 不做

- 不实现具体业务页面(账号、地址、店铺、订单、支付、调度等全部留给后续阶段)。
- 不接入真实生产支付/真实推送/真实短信(用 Mock 适配,留接入点)。
- 不上线真实营销活动。
- 不做 iOS 真机打包(等用户提供 Apple 开发者证书后单独走打包流程)。
- 不做生产环境部署(只交付 Dockerfile 与 Compose,生产部署留到阶段11/12)。

## 4. 需求理解

### 4.1 工程架构总览

```
o2o-platform/
├── apps/
│   ├── server/              # NestJS 单体后端
│   ├── customer-app/        # 用户端 Uni-app(小程序+Android+iOS)
│   ├── merchant-app/        # 商家端 Uni-app(Android+iOS)
│   ├── rider-app/           # 骑手端 Uni-app(Android+iOS)
│   └── admin-web/           # 平台 Web(Vue3+Vite+ElementPlus)
├── packages/
│   ├── contracts/           # 共享:错误码、状态枚举、字段类型、错误消息
│   ├── api-client/          # 4 端共享的 HTTP 客户端封装
│   └── ui-kit/              # 4 端可能复用的小组件(状态标签/金额格式化等)
├── deploy/
│   ├── docker-compose.dev.yml
│   └── Dockerfile.server
├── docs/                    # 6A 文档
├── 项目阶段规划/             # 现有规划(只读)
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .env.example
```

### 4.2 后端层次

```
apps/server/src/
├── main.ts
├── app.module.ts
├── common/                # 全局过滤器/拦截器/装饰器/守卫/管道
│   ├── filters/           # 统一异常过滤器(返回标准 code/message)
│   ├── interceptors/      # 响应包装、traceId、审计日志
│   ├── guards/            # 4 端 Token 守卫
│   ├── decorators/        # @CurrentUser @RequirePermission @Idempotent
│   ├── pipes/             # 全局校验管道
│   └── middleware/        # 限流、请求日志
├── config/                # 配置加载、Swagger、TypeORM、Mongoose、Redis
├── modules/
│   ├── gateway/           # 路由聚合、健康检查
│   ├── auth/              # 4 端登录/Token 签发/续签/登出 占位
│   ├── common-config/     # sys_config 读取
│   ├── dict/              # sys_dict + GET /pub/dictionaries
│   ├── file/              # POST /pub/files/upload
│   ├── integration-gateway/ # 第三方适配(地图/支付/短信/推送/实名/存储)
│   ├── audit-log/         # GET /admin/audit-logs + 写入服务
│   ├── system/            # GET /pub/cities + 角色权限 + 第三方健康检查
│   └── risk/              # 风控骨架(限流、黑名单占位)
└── database/
    ├── migrations/        # 9 张 stage-0 表
    └── seeds/             # 字典、角色、权限、错误码、城市种子
```

### 4.3 4 端前端共性

- 都用 `@o2o/api-client` 调用,严禁裸写 URL。
- 都通过 `@o2o/contracts` 引用错误码、状态枚举,严禁硬编码中文。
- 4 端各自维护 Token storage(对应端只能存对应 Token)。
- 都有统一错误提示、登录态失效跳转、loading、空状态。
- 阶段0 仅做骨架页:启动页、授权页、登录占位、错误页;具体业务留给后续阶段。

## 5. 疑问澄清(智能决策与待确认)

| #   | 议题                         | 智能决策默认值                                                                                                                | 是否需要用户确认                                                        |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Q1  | NestJS 包管理器              | **pnpm**(monorepo workspace 性能最好)                                                                                         | 默认采用,如有偏好可改                                                   |
| Q2  | ORM 选择                     | **TypeORM + DataMapper 模式**(NestJS 生态成熟,迁移工具齐全)                                                                   | 默认采用                                                                |
| Q3  | MongoDB 客户端               | **Mongoose**(类型支持好)                                                                                                      | 默认采用                                                                |
| Q4  | Redis 客户端                 | **ioredis**(支持 Cluster/Sentinel)                                                                                            | 默认采用                                                                |
| Q5  | JWT 库                       | **@nestjs/jwt + Passport**(4 个 Strategy 区分 4 端)                                                                           | 默认采用                                                                |
| Q6  | API 文档                     | **Swagger / OpenAPI 3**(NestJS 自带)                                                                                          | 默认采用                                                                |
| Q7  | 平台 Web UI 库               | **Element Plus**(Vue3 生态,中后台主流)                                                                                        | 待确认,Ant Design Vue 也是选项                                          |
| Q8  | Uni-app UI 库                | **uview-plus**(Uni-app Vue3 主流)                                                                                             | 待确认                                                                  |
| Q9  | 文件存储具体方案             | 自建 **MinIO**(S3 兼容,部署在自有服务器,本地开发用 Docker Compose)                                                            | **需用户确认**:是 MinIO 还是直接走 nginx 静态目录?有无现成 S3 兼容服务? |
| Q10 | iOS APP 阶段0 是否打包       | **不打包**,只跑通 Uni-app HBuilderX 工程能正确编译;真机包等用户提供证书                                                       | 默认不做                                                                |
| Q11 | 第三方密钥本阶段是否真实接入 | **不接入**,适配层做 Mock 实现并打开开关切换;待用户提供 高德 Key/微信支付商户号/支付宝应用ID/个推 AppKey/短信账号 后再切到真实 | **需用户确认**:何时提供凭证?在阶段0 落地占位即可,本阶段不阻塞           |
| Q12 | 域名/HTTPS                   | 阶段0 使用 `localhost` + Docker Compose;Nginx 反向代理留到部署阶段                                                            | 默认                                                                    |
| Q13 | 短信/推送服务商              | 短信:**阿里云**;推送:**个推**(用户已确认)                                                                                     | 短信待确认,默认阿里云                                                   |
| Q14 | 实名认证服务商               | **阿里云实名认证 / 腾讯云实名核身**                                                                                           | 待确认                                                                  |
| Q15 | 日志/监控                    | 阶段0 落地 **pino + traceId**;APM 留到阶段11                                                                                  | 默认                                                                    |
| Q16 | CI/CD                        | GitHub Actions:lint + typecheck + test(后端 jest);前端阶段0 不强制 e2e                                                        | 默认                                                                    |
| Q17 | 项目本地路径                 | 当前 `C:\Users\Administrator\Desktop\o2o、\` 不动现有规划目录;新增 `apps/` `packages/` `deploy/` `docs/`                      | 默认                                                                    |
| Q18 | 是否保留 `__pycache__/`      | 看起来是误产物                                                                                                                | 加入 `.gitignore`                                                       |
| Q19 | TypeScript strict            | **全开 strict + noUncheckedIndexedAccess**                                                                                    | 默认                                                                    |
| Q20 | 开发数据库初始化方式         | TypeORM migration + 种子;首次启动自动跑                                                                                       | 默认                                                                    |

**优先级 P0 待用户回答**:Q7 / Q8 / Q9 / Q11(凭证时点) / Q13(短信) / Q14(实名)。
**P1**:Q10 (iOS 后续单独走)。
**其余**:全部按默认值推进。

## 6. 验收标准雏形(供 CONSENSUS 阶段固化)

- [ ] `pnpm install` 一键安装全部依赖。
- [ ] `pnpm dev:server` 启动后端,Swagger 可访问,健康检查通过。
- [ ] `pnpm dev:customer` / `dev:merchant` / `dev:rider` / `dev:admin` 各自能启动 dev server。
- [ ] `docker compose -f deploy/docker-compose.dev.yml up -d` 拉起 MySQL/Redis/MongoDB,后端能正常连接。
- [ ] 5 个 stage-0 接口能用 curl/Swagger 跑通,统一响应结构正确。
- [ ] 4 类 Token 跨端调用返回 `FORBIDDEN`(权限隔离测试)。
- [ ] `Idempotency-Key` 重复请求返回同一结果。
- [ ] 9 张表 + 种子数据存在;`sys_audit_log` 能记录写操作。
- [ ] CI:lint + typecheck + 单测全绿。
- [ ] 4 端前端能跑起空骨架,API 常量已定义,登录态失效能跳转。
- [ ] 商家端代码内无任何 Web/小程序产物;路由内无 `/m/**` 之外的端混用。
- [ ] `手动审查与测试.md`(Stage 0)P0/P1 全部勾选。

---

**对齐结论**:除 6 个 P0 待确认项外,需求边界、技术方案、与现有规划的对齐已完成,可在用户回答后进入 CONSENSUS 阶段。
