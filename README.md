# O2O 外卖 + 跑腿系统

> ⚠️ **强制边界**:商家端仅 Android APP / iOS APP,**禁止**规划商家 Web 后台、商家小程序。外卖订单与跑腿订单必须**独立**订单体系、独立状态机、独立计价、独立退款规则。

## 工程结构

```
o2o-platform/
├── apps/
│   ├── server/              # NestJS 后端(单体,模块化)
│   ├── customer-app/        # 用户端 Uni-app(微信小程序 + Android + iOS)
│   ├── merchant-app/        # 商家端 Uni-app(仅 Android + iOS)
│   ├── rider-app/           # 骑手端 Uni-app(Android + iOS)
│   └── admin-web/           # 平台管理 Web(Vue 3 + Vite + Element Plus)
├── packages/
│   ├── contracts/           # 共享:错误码、状态枚举、响应类型、Header 常量
│   ├── api-client/          # HTTP 客户端封装(axios + uni-request)
│   └── ui-kit/              # 4 端可能复用的小组件
├── deploy/
│   ├── docker-compose.dev.yml
│   └── Dockerfile.server
├── docs/                    # 6A 流程产物
├── 项目阶段规划/             # 全阶段规划(只读权威)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 技术栈

| 类别   | 选型                                                                       |
| ------ | -------------------------------------------------------------------------- |
| 后端   | Node 20 + NestJS 10 + TypeScript 5(strict)+ TypeORM + Mongoose + ioredis   |
| 数据   | MySQL 8 / Redis 7 / MongoDB 7 / MinIO                                      |
| 前端   | Uni-app(Vue 3 + TS + Pinia + uview-plus)/ Vue 3 + Vite 5 + Element Plus    |
| 第三方 | 高德地图 / 微信支付 / 支付宝 / 个推 / 阿里云短信 / 阿里云实名              |
| 工程   | pnpm 9 workspace + ESLint + Prettier + Husky + commitlint + GitHub Actions |

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施(MySQL/Redis/Mongo/MinIO)
pnpm docker:dev

# 3. 后端迁移 + 种子
pnpm migrate:run
pnpm seed:run

# 4. 启动各端
pnpm dev:server         # 后端 :3000
pnpm dev:admin          # 平台 Web :8083
pnpm dev:customer:h5    # 用户端 H5 :8080
pnpm dev:merchant       # 商家端(只能 Android/iOS,需 HBuilderX)
pnpm dev:rider:h5       # 骑手端 H5 :8082
```

## 接口前缀与 Token

| 端         | 路径前缀              | Token Header     |
| ---------- | --------------------- | ---------------- |
| 用户端     | `/api/v1/c/**`        | `Customer-Token` |
| 商家端 APP | `/api/v1/m/**`        | `Merchant-Token` |
| 骑手端 APP | `/api/v1/r/**`        | `Rider-Token`    |
| 平台 Web   | `/api/v1/admin/**`    | `Admin-Token`    |
| 公开       | `/api/v1/pub/**`      | 无或可选         |
| 第三方回调 | `/api/v1/callback/**` | 验签             |

**Token 严格端隔离**,跨端调用返回 `FORBIDDEN`。

## 全局规范

- **统一响应**:`{ code, message, data, traceId, timestamp }`
- **错误码**:字符串(`INVALID_PARAM` `UNAUTHORIZED` `FORBIDDEN` `DATA_NOT_FOUND` `STATUS_INVALID` `DUPLICATE_REQUEST` `THIRD_PARTY_ERROR` `INTERNAL_ERROR` `RATE_LIMIT_EXCEEDED`)
- **字段命名**:camelCase
- **金额**:整型分;**距离**:米;**时间**:毫秒时间戳
- **写接口**:必带 `Idempotency-Key`,自动幂等
- **关键写**:自动审计日志

## 6A 开发流程

每阶段产物存放在 `docs/阶段N-...` 下:`ALIGNMENT → CONSENSUS → DESIGN → TASK → ACCEPTANCE → FINAL → TODO`。

阶段规划文档(只读权威)在 `项目阶段规划/`。
