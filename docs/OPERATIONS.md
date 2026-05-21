# O2O 部署与运维

## 本地开发

### 前置条件

- Node 20.x(`.nvmrc` 锁定)
- pnpm 9.x(`packageManager` 字段锁定)
- Docker + Docker Compose(本地起 MySQL/Redis/Mongo/MinIO)
- HBuilderX(打包 merchant-app/rider-app 真机 / 安卓 / iOS)

### 一次性初始化

```bash
pnpm install                                  # 安装所有 workspace 依赖
pnpm docker:dev                               # 起 mysql/redis/mongo/minio
pnpm --filter @o2o/server migrate:run         # 跑 TypeORM migrations
pnpm --filter @o2o/server seed:run            # 种子数据(管理员/字典/三方配置/分类)
```

### 启动各端

```bash
pnpm dev:server         # 后端 :3000
pnpm dev:admin          # 平台 Web :8083
pnpm dev:customer:h5    # 用户端 H5 :8080
pnpm dev:merchant       # 商家端(HBuilderX 打开 apps/merchant-app)
pnpm dev:rider:h5       # 骑手端 H5 :8082
```

### 默认账号

- Admin:`super_admin` / `O2o@2026-Admin`(验证码从 redis-cli 查 `captcha:<sessionId>`)

## 端口/服务

| 服务            | 端口        | 备注                                          |
| --------------- | ----------- | --------------------------------------------- |
| MySQL 8         | **3307**    | 本地宿主 3306 被 Windows MySQL 占用,故改 3307 |
| Redis 7         | 6379        | —                                             |
| MongoDB 7       | 27017       | —                                             |
| MinIO           | 9000 / 9001 | 9001 控制台                                   |
| NestJS server   | 3000        | `/api/v1/**`                                  |
| admin-web       | 8083        | Vue 3 + Vite                                  |
| customer-app H5 | 8080        | uni-app H5 模式                               |
| rider-app H5    | 8082        | uni-app H5 模式                               |

## 环境变量(`.env`)

完整模板见 `.env.example`,关键变量:

### 基础

```
NODE_ENV=development | production
PORT=3000
APP_BASE_URL=http://localhost:3000
SWAGGER_ENABLED=true                          # 生产应为 false
```

### 数据库

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_USER=o2o
MYSQL_PASSWORD=o2o
MYSQL_DATABASE=o2o
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
MONGO_URI=mongodb://localhost:27017/o2o
```

### JWT(4 套独立密钥)

```
JWT_CUSTOMER_SECRET=<32+ 随机>
JWT_MERCHANT_SECRET=<32+ 随机>
JWT_RIDER_SECRET=<32+ 随机>
JWT_ADMIN_SECRET=<32+ 随机>
JWT_ACCESS_TTL=7200                           # 秒
JWT_REFRESH_TTL=2592000                       # 30 天
```

### 加密 / 业务密钥

```
THIRD_PARTY_SECRET_KEY=<32+ 随机>             # 三方密钥落库加密(AES-256-CBC)
PICKUP_CODE_SALT=<32+ 随机>                   # 生鲜提货码 sha256 salt
TRACE_SECRET=<32+ 随机>                       # 溯源 HMAC-SHA256 salt
```

### 文件存储

```
STORAGE_PROVIDER=minio                        # 或 mock(开发)
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=o2o
MINIO_PUBLIC_BASE_URL=http://localhost:9000/o2o
```

### 三方集成模式

```
INTEGRATION_MODE=mock                         # 或 real;real 时所有 adapter 需配置凭据
```

### 第三方凭据(`real` 模式必填)

```
# 微信支付 V3
WXPAY_APP_ID=
WXPAY_MCH_ID=
WXPAY_API_V3_KEY=
WXPAY_PRIVATE_KEY_PATH=<本地 apiclient_key.pem 绝对路径>
WXPAY_CERT_SERIAL_NO=
WXPAY_NOTIFY_URL=https://<your-domain>/api/v1/callback/payments/wxpay

# 支付宝
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=<base64>
ALIPAY_PUBLIC_KEY=<base64>
ALIPAY_NOTIFY_URL=https://<your-domain>/api/v1/callback/payments/alipay

# 高德地图
AMAP_WEB_SERVICE_KEY=

# 个推
GETUI_APP_ID=
GETUI_APP_KEY=
GETUI_MASTER_SECRET=

# 阿里短信
ALI_SMS_ACCESS_KEY_ID=
ALI_SMS_ACCESS_KEY_SECRET=
ALI_SMS_SIGN_NAME=
ALI_SMS_TEMPLATE_LOGIN=

# 阿里实名
ALI_REALNAME_AK=
ALI_REALNAME_SK=

# 微信登录(小程序)
WECHAT_MP_APP_ID=
WECHAT_MP_APP_SECRET=
```

任何一个真模式 adapter 调用时,缺凭据 → 服务端立即 `MISCONFIGURED: <KEY>` 抛出,运维收到明确信号修补。

### 节流

```
THROTTLE_TTL=60                               # 秒
THROTTLE_LIMIT=60                             # 60 次/60 秒
```

### 日志

```
LOG_LEVEL=info                                # debug | info | warn | error
LOG_PRETTY=false                              # 生产关
```

## 数据库迁移

- 迁移文件:`apps/server/src/database/migrations/*`(共 12 个)
- 命令:
  ```bash
  pnpm --filter @o2o/server migrate:run         # 跑全部
  pnpm --filter @o2o/server migrate:revert      # 回退一个
  pnpm --filter @o2o/server migrate:generate -- src/database/migrations/<Name>  # 生成
  ```
- `TYPEORM_SYNCHRONIZE=false`(强制,生产 production 必关)

## 上线 checklist

### 凭据/密钥

- [ ] `.env` 中所有 `<32+ 随机>` 字段已配实际值
- [ ] `WXPAY_PRIVATE_KEY_PATH` 文件就位且 chmod 600
- [ ] 4 个 JWT\_\*\_SECRET 互不相同,每个 32+ 字符
- [ ] `THIRD_PARTY_SECRET_KEY` / `PICKUP_CODE_SALT` / `TRACE_SECRET` 已配且与历史一致
- [ ] `INTEGRATION_MODE=real`
- [ ] 7 个真三方凭据(wxpay/alipay/amap/getui/sms/realname/wxlogin)全配
- [ ] `MINIO_PUBLIC_BASE_URL` 走 CDN
- [ ] `SWAGGER_ENABLED=false`

### 数据库

- [ ] migrations 已跑(`pnpm migrate:run`)
- [ ] seed 已跑(管理员/分类/字典/系统配置)
- [ ] 备份策略已配(MySQL/Mongo)

### 性能

- [ ] Redis 持久化已开(AOF/RDB)
- [ ] MySQL 连接池 `connectionLimit` 适配实例数
- [ ] WebSocket 连接数监控(默认 `pingInterval:25s, pingTimeout:60s`)
- [ ] MinIO 文件清理策略已配(过期 fileObject 删除)

### 三方回调白名单

- [ ] WxPay 商户后台配 `WXPAY_NOTIFY_URL`
- [ ] Alipay 开放平台配 `ALIPAY_NOTIFY_URL`
- [ ] 退款回调 URL 同步

### 监控

- [ ] 日志聚合(ELK / SLS)
- [ ] traceId 全链路打点
- [ ] 关键事件告警:RefundExecuted / OrderCompleted / MerchantSettlementGenerated 数量异常
- [ ] DispatchTask TIMEOUT 异常告警

### 安全

- [ ] `helmet` 已启(已默认开)
- [ ] HTTPS 终结点(nginx/SLB)
- [ ] CORS allowlist 收紧(non-localhost)
- [ ] 限流配置生产值(默认 60/60s 太松)
- [ ] Admin 二要素或 IP allowlist

## 生产 Docker 部署

```bash
docker build -f deploy/Dockerfile.server -t o2o-server:<tag> .
docker run -d --name o2o-server \
  --env-file /opt/o2o/.env.prod \
  -p 3000:3000 \
  -v /opt/o2o/secrets:/secrets:ro \           # WXPAY_PRIVATE_KEY_PATH 指向 /secrets/apiclient_key.pem
  o2o-server:<tag>
```

admin-web 静态资源由 nginx 服务:

```bash
pnpm --filter @o2o/admin-web build            # 输出 apps/admin-web/dist/
# 上传 dist/ 到 nginx 根目录,nginx 反代 /api/v1/* → server:3000,/v1 → server:3000(WebSocket upgrade)
```

uni-app 三端通过 HBuilderX 构建为 wgt / apk / ipa,上传应用市场或自有 OTA 服务。

## 备份/灾备

- MySQL:每日全量 + binlog 增量,异地存储
- MongoDB:每日 dump,异地存储
- Redis:AOF 持久化 + 每日 RDB
- MinIO:启用版本控制 + 异地复制(S3 兼容)
- 备份保留:订单/支付类 ≥ 3 年,审计日志 ≥ 2 年

## 常用命令

```bash
pnpm -r typecheck                             # 全工程类型检查
pnpm -r test                                  # 全工程测试
pnpm -r lint                                  # 全工程 ESLint
pnpm format                                   # Prettier 全格式化

pnpm --filter @o2o/server start:debug         # 后端调试模式
pnpm --filter @o2o/admin-web preview          # admin-web 生产预览
```

## 故障排查

| 现象                          | 排查点                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| 启动报 `MISCONFIGURED: <KEY>` | 真模式凭据缺,补 `.env`                                                                       |
| 支付回调验签失败              | `INTEGRATION_MODE=real` 时无签会拒;检查支付平台回调 URL 与 `WXPAY_NOTIFY_URL` 一致           |
| 订单卡在 DELIVERED            | 检查 `order-auto-complete.job` 是否在跑(默认 30 分钟后自动 COMPLETED)                        |
| 商家收不到新单提示            | 检查 WS 连接(`merchant:store:<storeId>` 订阅)+ getui 推送配置                                |
| 骑手大厅无单                  | 检查 `dispatch.dispatch` 是否执行,`DispatchTask.status=PENDING`;`rider:hall:<cityCode>` 订阅 |
| Token 互认 FORBIDDEN          | 客户端用了错的 Token Header(应严格按端)                                                      |
| 跨端调用失败                  | scope 校验,见 `apps/server/src/modules/auth/guards/`                                         |
