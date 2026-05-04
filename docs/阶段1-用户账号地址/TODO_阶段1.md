# 阶段 1 — TODO(stage 2 启动前 checklist)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 必做(stage 2 启动前要完成)

### 1. 数据库迁移 + 种子(本机)

```pwsh
# 确保 MySQL 3307 跑着(参见 MEMORY:Windows MySQL 占 3306,本项目用 3307 容器)
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:
#   - SHOW TABLES LIKE 'customer_%'  → 4 张
#   - SHOW TABLES IN (sms_code, login_device, message_setting, risk_user_tag, realname_record) → 4 张
#   - SELECT code FROM sys_permission WHERE code LIKE 'admin:customers:%'  → 至少 2 行
#   - SELECT code FROM sys_permission WHERE code IN ('customer:public','customer:self') → 2 行
```

**操作指引**:

```pwsh
# 如果 MySQL 容器未起,从 deploy/ 目录起(stage 0 留的 docker-compose):
docker compose -f deploy/docker-compose.dev.yml up -d mysql redis mongo
# 等 ~30 秒让服务就绪,再跑 migrate
```

### 2. 12 接口 curl 冒烟

```pwsh
$BASE = "http://127.0.0.1:3000"
pnpm --filter @o2o/server dev  # 单独终端

# sms-code(无 token)
curl.exe -X POST "$BASE/api/v1/c/auth/sms-code" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"mobile":"13800000001","scene":"login"}'
# 期望:{code:"0", data:{sendResult:true, expireSeconds:300, requestId:"mock-..."}}
# 控制台日志:[sms-mock] scene=login 138****0001 code=XXXXXX  → 拷贝 code 用于下一步

# 登录(替换 code)
$LOGIN = curl.exe -X POST "$BASE/api/v1/c/auth/login" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"mobile":"13800000001","code":"<填上一步 code>","deviceId":"dev-curl","platform":"h5"}' `
  | ConvertFrom-Json
$T = $LOGIN.data.customerToken
$RT = $LOGIN.data.refreshToken

# 端隔离(关键):Customer-Token 调 admin → FORBIDDEN
curl.exe "$BASE/api/v1/admin/customers" -H "Customer-Token: $T"
# 期望:{code:"FORBIDDEN", message:"cross-scope token", ...}

# logout
curl.exe -X POST "$BASE/api/v1/c/auth/logout" -H "Customer-Token: $T" -H "X-Device-Id: dev-curl" -H "Idempotency-Key: $([guid]::NewGuid())"
# 期望:{code:"0", data:{ok:true}}
```

### 3. 平台 Web 浏览器抽测

```pwsh
# 1) 启 admin-web dev
pnpm --filter @o2o/admin-web dev  # 默认 http://127.0.0.1:8083

# 2) 浏览器登录,用 SUPER_ADMIN mock token(stage 0 已有 mockLogin)
# 3) 进 /admin/customers,验证:
#    - 关键字搜索手机号
#    - realnameStatus / accountStatus 三筛选生效
#    - 列表 mobile 列为 138****0001 格式(脱敏)
# 4) 点详情进 /admin/customers/<id>:
#    - 看到禁用按钮(SUPER_ADMIN 有 admin:customers:disable)
#    - 切换到 AUDITOR token,刷新页面 → 禁用按钮消失
# 5) 点禁用按钮 → 弹窗填原因 → 提交 → 用户列表 accountStatus 变 disabled
```

### 4. 用户端 H5 抽测

```pwsh
pnpm --filter @o2o/customer-app dev:h5
# 浏览器打开,或手机扫码
# 用例:
#  - /pages/login/index 输手机 → 60s 倒计时
#  - /pages/login/verify 输 6 位码(看后端日志取 mock code)→ 跳 /pages/me/index
#  - /pages/profile/realname 输姓名 + 18 位身份证 + sms code → success/failed
#  - /pages/address/list 列表 + 新增 + 设默认 → 默认排前
#  - /pages/me/security 登出 → 清 token + 跳登录页
```

## 可选(stage 2 不阻塞,但建议本周内补)

### 5. 凭证回填位置(.env)

本阶段全用 mock。生产前需配凭证:

```
# 短信(阿里云)
ALI_SMS_ACCESS_KEY_ID=...
ALI_SMS_ACCESS_KEY_SECRET=...
ALI_SMS_SIGN_NAME=O2O平台

# 实名(阿里云三要素)
ALI_REALNAME_ACCESS_KEY_ID=...
ALI_REALNAME_ACCESS_KEY_SECRET=...

# 微信小程序登录
WX_LOGIN_APP_ID=wx...
WX_LOGIN_APP_SECRET=...

# 切换 mock → real
INTEGRATION_MODE=real
```

凭证到位前保持 `INTEGRATION_MODE=mock`(默认值)。

### 6. realname-internal sms 接口(P3-04)

当前 realname 页要求前端从 storage 读 mobile 再调 sms-code,容易失效。建议 stage 11 加:

```
POST /api/v1/c/sms-code/internal
- Token: Customer-Token
- 不带 mobile,后端从 customer_user 取
- scene 限 realname / sensitive / change-mobile
```

### 7. login_device 表清理(P3-03)

`SmsCodeExpiredCleanupJob` 只清 sms_code。需在 stage 11 加:

- `DELETE FROM login_device WHERE status='revoked' AND last_active_at < NOW()-30d`

### 8. LoginAnomalyDetectionJob 上线告警(P3-05)

当前仅落 logger.warn。需 stage 11:

- 写 `risk_user_tag` 自动加 `suspect_fraud` 标签
- 触发 customer.account-suspect 领域事件 → 营销/客服订阅

### 9. 微信完整绑定流程(P3-02)

当前 wechat-login + bindMobileRequired=true 时,前端跳 `/pages/login/index?bindWechat=1` 让用户输手机号 + 验证码,然后调 `/c/auth/login` 完成注册。完整逻辑(把 wechat openId 和新建用户绑一起)需要新增:

```
POST /api/v1/c/auth/bind-wechat
- 入参:wechatJsCode(从 wechat-login 拿)+ mobile + smsCode + deviceId
- 后端在自动注册事务中同时写 wechat_open_id
```

stage 11 排期。

## 阶段 1 提交后建议

1. `git push origin main`(用户人工触发)
2. 清掉本机 `node_modules`(可选)+ 重新 `pnpm install`,确认 fresh checkout 可构建。
3. stage 2 开始前,请用户先 ping 我确认本 TODO 中的 #1~#4 已抽测通过。
