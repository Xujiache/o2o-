# O2O API 契约

## 端口/前缀/Token Header

| 端         | Base                 | 前缀                  | Token Header            |
| ---------- | -------------------- | --------------------- | ----------------------- |
| 用户端     | `http://server:3000` | `/api/v1/c/**`        | `Customer-Token: <jwt>` |
| 商家端 APP | `http://server:3000` | `/api/v1/m/**`        | `Merchant-Token: <jwt>` |
| 骑手端 APP | `http://server:3000` | `/api/v1/r/**`        | `Rider-Token: <jwt>`    |
| 平台 Web   | `http://server:3000` | `/api/v1/admin/**`    | `Admin-Token: <jwt>`    |
| 公开       | `http://server:3000` | `/api/v1/pub/**`      | 无(可选 token)          |
| 第三方回调 | `http://server:3000` | `/api/v1/callback/**` | 验签强制                |

JWT scope 与 Token Header 必须一一对应,跨端持错 token 一律 `FORBIDDEN`。

## 统一响应

所有业务接口返回:

```json
{
  "code": "0",
  "message": "OK",
  "data": <T | null>,
  "traceId": "1716077400000-abc123def4",
  "timestamp": 1716077400000
}
```

- 成功 `code = "0"`
- 业务错误 `code` 为 ErrorCode 字符串(见下)
- `data` 业务数据(分页用 `{pageNo,pageSize,total,list}`)
- `traceId` 从请求 `X-Trace-Id` 透传或服务端生成

## ErrorCode(`packages/contracts/src/error-codes.ts`)

| Code                  | 含义                | HTTP 推荐   |
| --------------------- | ------------------- | ----------- |
| `0`                   | OK                  | 200         |
| `INVALID_PARAM`       | 参数校验失败        | 400         |
| `UNAUTHORIZED`        | 未登录或 token 过期 | 401         |
| `FORBIDDEN`           | 无权限/跨端误用     | 403         |
| `DATA_NOT_FOUND`      | 资源不存在          | 404         |
| `STATUS_INVALID`      | 非法状态跳转        | 422         |
| `DUPLICATE_REQUEST`   | 幂等冲突或重复请求  | 409         |
| `THIRD_PARTY_ERROR`   | 三方调用失败        | 502/503/504 |
| `RATE_LIMIT_EXCEEDED` | 限流命中            | 429         |
| `INTERNAL_ERROR`      | 服务端兜底错误      | 500         |

前端遇 `UNAUTHORIZED` → 走 refresh token,失败再清 token 跳登录。

## 通用请求头

| Header                           | 必填         | 说明                              |
| -------------------------------- | ------------ | --------------------------------- |
| `<Scope>-Token`                  | 鉴权接口必填 | JWT,见上表                        |
| `Content-Type: application/json` | 写接口必填   | —                                 |
| `Idempotency-Key`                | 写接口必填   | 客户端生成 nanoid(10),用于幂等    |
| `X-Trace-Id`                     | 选填         | 客户端自带便于排错,缺则服务端生成 |
| `X-Device-Id`                    | 选填         | 设备标识(审计)                    |
| `X-Client-Version`               | 选填         | 兼容性追踪                        |

## 字段命名/格式

- 字段:`camelCase`(后端 fastjson2 默认,前端 TS interface 必须对齐)
- 金额:整型分,字符串落库,number 返回前端
- 距离:米,number
- 时间:毫秒时间戳,字符串落库,number 返回
- 手机号:11 位字符串,前端不加 +86
- 身份证:18 位字符串,展示掩码 `XXXX**********XXXX`

## 写接口幂等

- 客户端必须为每个写接口生成 **唯一且稳定** 的 `Idempotency-Key`(同一业务意图重试需用同 key)
- 服务端用 `@Idempotent({ scope, ttlSeconds })` 装饰
- 同 key 命中:返回上次成功响应(状态 200)或返回 `DUPLICATE_REQUEST`(状态 409)

幂等 scope 列表见各 controller。

## 状态机响应字段

订单类响应包含 `status`(枚举字符串)+ `actions` 数组(允许的下一步操作)。

例 FoodOrder:

```json
{
  "foodOrderId": "F202605191234",
  "status": "PREPARING",
  "actions": ["CANCEL"],
  "...": "..."
}
```

权威状态定义在 `packages/contracts/src/status/{takeaway,errand}.ts`。

## 核心接口清单(按链路)

### 用户认证

```
POST /api/v1/c/auth/sms/send                  发送验证码
POST /api/v1/c/auth/login-mobile              手机号+短信登录
POST /api/v1/c/auth/login-wechat              微信 jscode 登录
POST /api/v1/c/auth/refresh                   换 access token
POST /api/v1/c/auth/logout                    退出
GET  /api/v1/c/profile                        个人资料
PATCH /api/v1/c/profile                       更新资料
POST /api/v1/c/profile/realname-cert          实名认证
```

### 地址

```
GET  /api/v1/c/addresses                      地址列表
POST /api/v1/c/addresses                      新增
PATCH /api/v1/c/addresses/:id                 修改
DELETE /api/v1/c/addresses/:id                删除
```

### 外卖下单

```
POST /api/v1/c/food/cart/items                upsert 购物车项
GET  /api/v1/c/food/cart                      购物车
POST /api/v1/c/food/orders/preview            预览(锁价+锁券)
POST /api/v1/c/food/orders                    下单
GET  /api/v1/c/food/orders                    列表
GET  /api/v1/c/food/orders/:orderId           详情
POST /api/v1/c/food/orders/:orderId/cancel    取消
POST /api/v1/c/food/orders/:orderId/reviews   评价
```

### 跑腿下单

```
POST /api/v1/c/errand/quotes                  报价
POST /api/v1/c/errand/orders                  下单
GET  /api/v1/c/errand/orders                  列表
GET  /api/v1/c/errand/orders/:orderId         详情
POST /api/v1/c/errand/orders/:orderId/cancel  取消
POST /api/v1/c/errand/orders/:orderId/urgent  升级加急
PATCH /api/v1/c/errand/orders/:orderId/remark 补充备注+附件
GET  /api/v1/c/errand/orders/:orderId/track   跟踪(骑手位置)
```

### 生鲜下单

```
GET  /api/v1/c/grocery/categories             分类
GET  /api/v1/c/grocery/products               商品列表
GET  /api/v1/c/grocery/products/:id           商品详情
GET  /api/v1/c/pickup-points                  自提点列表
POST /api/v1/c/grocery/orders                 下单(预付预估)
GET  /api/v1/c/grocery/orders                 列表
GET  /api/v1/c/grocery/orders/:orderId        详情
POST /api/v1/c/grocery/orders/:orderId/cancel 取消
```

### 支付

```
POST /api/v1/c/payments/prepay                预下单(返回 wxpay/alipay 拉起参数)
GET  /api/v1/c/payments/:payOrderId           支付状态查询
POST /api/v1/callback/payments/wxpay          微信支付回调(验签强制)
POST /api/v1/callback/payments/alipay         支付宝回调(验签强制)
POST /api/v1/callback/refunds/wxpay           微信退款回调
POST /api/v1/callback/refunds/alipay          支付宝退款回调
```

### 商家(m/\*\*)

```
POST /api/v1/m/auth/login                     密码或短信登录
GET  /api/v1/m/stores/my                      我的店铺
PATCH /api/v1/m/stores/my                     更新店铺
POST /api/v1/m/stores/status                  营业状态切换
GET  /api/v1/m/food-orders/pending            待处理订单(轮询/WS)
POST /api/v1/m/food-orders/:id/accept         接单
POST /api/v1/m/food-orders/:id/reject         拒单
POST /api/v1/m/food-orders/:id/ready          出餐完成
GET  /api/v1/m/products                       商品列表
POST /api/v1/m/products                       创建
PATCH /api/v1/m/products/:id                  修改
POST /api/v1/m/products/:id/sale-status       上下架
GET  /api/v1/m/grocery/picking                生鲜拣货列表
POST /api/v1/m/grocery/orders/:id/weigh-items 称重
POST /api/v1/m/grocery/orders/:id/settle      结算(多退少补)
POST /api/v1/m/grocery/orders/:id/ready       拣货完成
POST /api/v1/m/grocery/orders/:id/verify-pickup 核销提货
GET  /api/v1/m/after-sales                    售后列表
POST /api/v1/m/after-sales/:id/accept         同意退款
POST /api/v1/m/after-sales/:id/reject         拒绝
GET  /api/v1/m/settlements                    结算记录
POST /api/v1/m/withdrawals                    申请提现
GET  /api/v1/m/reviews                        评价列表
POST /api/v1/m/reviews/:id/reply              回复评价
GET  /api/v1/m/statistics                     统计(today/yesterday/week/month)
```

### 骑手(r/\*\*)

```
POST /api/v1/r/auth/login                     登录
POST /api/v1/r/online-status                  上线/下线
POST /api/v1/r/locations/batch                批量上报位置
GET  /api/v1/r/tasks/available                可接单大厅
GET  /api/v1/r/tasks/my-current               当前任务
GET  /api/v1/r/tasks/my-in-progress           进行中任务(<=20)
GET  /api/v1/r/tasks/:taskId                  任务详情
GET  /api/v1/r/tasks/:taskId/timeline         任务时间线
POST /api/v1/r/tasks/:taskId/accept           接单(从 dispatch_task)
POST /api/v1/r/tasks/:taskId/arrive-pickup    到达取件
POST /api/v1/r/tasks/:taskId/pickup           取件确认(核验取件码)
POST /api/v1/r/tasks/:taskId/delivered        送达(核验收货码)
POST /api/v1/r/tasks/:taskId/exception        异常上报
GET  /api/v1/r/earnings                       收益查询(by 日期段)
POST /api/v1/r/withdrawals                    申请提现
GET  /api/v1/r/assessment                     考核数据
```

### Admin(admin/\*\*)

```
POST /api/v1/admin/auth/login                 账密+验证码登录
GET  /api/v1/admin/customers                  用户管理
GET  /api/v1/admin/merchants                  商家审核
POST /api/v1/admin/merchants/:id/audit        审核通过/拒绝
GET  /api/v1/admin/riders                     骑手审核
POST /api/v1/admin/riders/:id/audit           审核
GET  /api/v1/admin/food-orders                外卖订单监控
GET  /api/v1/admin/errand-orders              跑腿订单监控
GET  /api/v1/admin/orders/:bizType/:id/timeline 订单全时间线(含 dispatch+payment)
GET  /api/v1/admin/after-sales                售后列表
GET  /api/v1/admin/after-sales/:id            售后详情
POST /api/v1/admin/after-sales/:id/arbitrate  平台仲裁(decision=APPROVE/REJECT/PARTIAL)
GET  /api/v1/admin/refunds                    退款列表
GET  /api/v1/admin/settlements                结算列表
GET  /api/v1/admin/withdrawals                提现列表
POST /api/v1/admin/withdrawals/:id/approve    审批
POST /api/v1/admin/dispatch-tasks/:id/manual-assign 人工派单
GET  /api/v1/admin/track-replay/:taskId       轨迹回放
GET  /api/v1/admin/violations                 违章记录
GET  /api/v1/admin/categories                 平台分类
GET  /api/v1/admin/cities                     城市配置
GET  /api/v1/admin/coupons                    优惠券管理
GET  /api/v1/admin/system-config              系统配置
GET  /api/v1/admin/third-party-config         三方配置
GET  /api/v1/admin/roles                      角色权限
GET  /api/v1/admin/audit-logs                 审计日志
```

### 文件上传

```
POST /api/v1/pub/files/upload                 multipart/form-data,需 token(任意 scope)
```

### 字典 / 公开

```
GET  /api/v1/pub/dicts                        系统字典
GET  /api/v1/pub/cities                       城市列表
GET  /api/v1/pub/stores                       公开店铺列表
```

## WebSocket(实时推送)

详见 `docs/ARCHITECTURE.md` 实时推送章节 + `docs/STATUS.md` 客户端接入示例。

## 完整契约源

- **响应/错误码/headers**:`packages/contracts/src/`
- **状态枚举**:`packages/contracts/src/status/*`
- **DTO/VO 类型**:各 module 的 `*.dto.ts`
- **OpenAPI Swagger**:启动后 `http://server:3000/swagger`(`SWAGGER_ENABLED=true` 时)
