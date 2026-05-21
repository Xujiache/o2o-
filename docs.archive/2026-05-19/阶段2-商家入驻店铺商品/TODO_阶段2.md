# 阶段 2 — TODO(stage 3 启动前 checklist)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 必做(stage 3 启动前要完成)

### 1. 数据库迁移(本机 MySQL 3307)

```pwsh
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:
#   - SHOW TABLES LIKE 'merchant_%' → 3 张
#   - SHOW TABLES LIKE 'store%' → 3 张
#   - SHOW TABLES LIKE 'product%' → 3 张
#   - SHOW TABLES IN (stock_record, merchant_promotion) → 2 张
#   - SELECT code FROM sys_permission WHERE code LIKE 'merchant:%' OR code LIKE 'admin:merchants:%' → 至少 5 行
#   - 商家 MERCHANT 角色绑 merchant:store:own
```

### 2. 25 接口 curl 冒烟

```pwsh
$BASE = "http://127.0.0.1:3000"
pnpm --filter @o2o/server dev  # 单独终端

# 商家入驻冒烟(替换 file id 为真实 /pub/files/upload 返回值)
$IDEM = [guid]::NewGuid()
$MOBILE = "13900000001"

# 1) 商家 sms-code(无 token)
curl.exe -X POST "$BASE/api/v1/m/auth/sms-code" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" -d "{\"mobile\":\"$MOBILE\",\"scene\":\"login\"}"
# → 控制台日志取 mock code

# 2) 上传 5+ 文件(用 stage 0 文件接口,需 customer 或 merchant token)
# 简化:用 customer-token(stage 1 已有)上传,bizType=merchant-license

# 3) 提交入驻
$APP = curl.exe -X POST "$BASE/api/v1/m/onboarding/applications" `
  -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"mobile":"13900000001","smsCode":"<mock>","licenseFileId":"<f1>",...}' | ConvertFrom-Json

# 4) 商家 login → 拿 token
$LOGIN = curl.exe -X POST "$BASE/api/v1/m/auth/login" `
  -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d "{\"mobile\":\"$MOBILE\",\"code\":\"<mock>\",\"deviceId\":\"dev-curl\",\"platform\":\"app-android\"}" | ConvertFrom-Json
$M_T = $LOGIN.data.merchantToken

# 5) 端隔离:商家 token 调 admin → FORBIDDEN
curl.exe "$BASE/api/v1/admin/merchants/applications" -H "Merchant-Token: $M_T"
# 期望:{code:"FORBIDDEN", message:"cross-scope token", ...}

# 6) 商家查 status
curl.exe "$BASE/api/v1/m/onboarding/status" -H "Merchant-Token: $M_T"
# 期望:auditStatus=pending, canResubmit=false

# 7) 平台审核(用 admin token,stage 0 的 token:dev 脚本生成)
$ADMIN_T = (...)
curl.exe -X POST "$BASE/api/v1/admin/merchants/$($APP.data.applicationId)/audit" `
  -H "Admin-Token: $ADMIN_T" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"auditResult":"approved","commissionRate":0.05}'
# 期望:auditStatus=approved + 后端日志 [merchant.approved] + auto-create store

# 8) 商家查 store(已自动建)
curl.exe "$BASE/api/v1/m/store" -H "Merchant-Token: $M_T"

# 9) 创建商品(无 SKU)
curl.exe -X POST "$BASE/api/v1/m/products" -H "Merchant-Token: $M_T" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"categoryId":"<auto-created-1>","name":"测试商品","hasSku":0,"price":1500,"stock":10,"saleStatus":"on_shelf"}'

# 10) 公开列表(无 token)
curl.exe "$BASE/api/v1/pub/stores"
# 期望:store 已 online?(business_status 默认 offline,需 PATCH /m/store/business-status 切 online 才出现)
```

### 3. 平台 Web 浏览器抽测

```pwsh
pnpm --filter @o2o/admin-web dev  # 默认 http://127.0.0.1:8083

# 1) 用 SUPER_ADMIN mock token 登录
# 2) 进 /admin/merchants/audit:
#    - 列表显示脱敏 mobile / 法人 / 营业执照
#    - keyword 搜店名 / 法人 / 商家ID
#    - auditStatus 筛选生效
# 3) 点详情:
#    - 看到资质文件预览(图片直显 / PDF embed)
#    - SUPER_ADMIN 看到"审核"按钮
#    - 切 AUDITOR token,刷新 → "审核"按钮消失
# 4) SUPER_ADMIN 点审核 → 弹窗选 approved + commissionRate 0.05 → 提交
# 5) 进 /admin/merchants/stores → 强制暂停店铺
```

### 4. 商家 APP 真机抽测(HBuilderX)

```pwsh
pnpm --filter @o2o/merchant-app dev:app
# HBuilderX 打开生成的 dist/dev/app 目录,真机或 Android 模拟器调试
# 关键流程:
#  - /pages/login/index 输手机 → 60s 倒计时
#  - /pages/login/verify 输 6 位码 → 跳 /pages/onboarding/progress(pending)
#  - /pages/onboarding/apply 多步表单 + 上传 5 文件 → 提交
#  - 平台审核通过后 → 商家 login → 跳 /pages/workbench/index
#  - /pages/store/settings 编辑 + 保存
#  - /pages/products/edit 创建商品(SKU 切换)
#  - /pages/stock/alerts 调阈值
```

## 可选(stage 3 不阻塞)

### 5. 凭证回填(.env)

```
# 阿里云企业资质核验
ALI_REALNAME_ENTERPRISE_API=...
ALI_ENTERPRISE_APP_ID=...
ALI_ENTERPRISE_APP_SECRET=...

# 真接入时切 INTEGRATION_MODE=real
```

### 6. 配送范围真拖拽(P3-01)

stage 5+ 接高德地图:

- 加 `apps/merchant-app/src/components/common/MapPolygonEditor.vue`(uni.createMapContext + 自定义 marker 拖拽)
- pages/store/delivery-area.vue 替换 textarea 为 MapPolygonEditor

### 7. 资质 OCR(P3-02)

stage 11+ 接阿里 OCR / 腾讯 OCR,自动从营业执照图片识别 license_no / legal_person。

### 8. 商家多端登录(P3-03)

stage 11+ 加 merchant_login_device 表(参考 stage 1 login_device),支持单商家多端登录与设备粒度 logout。

### 9. 单品满减下单逻辑(P3-04)

stage 5 订单模块时,在订单提交时遍历 active 满减 promo,匹配 productIds 算最高档位优惠。

## 阶段 2 提交后建议

1. `git push origin main`(用户人工触发)
2. stage 3 开始前,请确认 #1~#4 已抽测通过
3. 准备 stage 3 入口:
   - 复刻 `merchant-auth` 模式建 `rider-auth`
   - 复刻 `merchant-onboarding` 建 `rider-onboarding`(资质 = 健康证 / 骑手照片)
   - 接 `domain.rider.submitted` / `domain.rider.approved`
