# 阶段 3 — TODO(stage 4 启动前 checklist)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 必做(stage 4 启动前要完成)

### 1. 数据库迁移(本机 MySQL 3307)

```pwsh
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run
# 期望:
#   - SHOW TABLES LIKE 'rider_%' → 8 张
#   - SHOW TABLES → 累计 stage 0+1+2+3 表(老 14 + 8 + 11 + 8 = 41)
#   - SELECT code FROM sys_permission WHERE code LIKE 'rider:%' OR code LIKE 'admin:riders:%' OR code='admin:menu:riders' → 5 行
#   - 角色绑定 RIDER → rider:self;AUDITOR → admin:riders:view + admin:menu:riders
```

### 2. 16 接口 curl 冒烟

```pwsh
$BASE = "http://127.0.0.1:3000"
pnpm --filter @o2o/server dev  # 单独终端

$IDEM = [guid]::NewGuid()
$MOBILE = "13900001234"

# 1) 骑手 sms-code(无 token)
curl.exe -X POST "$BASE/api/v1/r/auth/sms-code" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" -d "{`"mobile`":`"$MOBILE`",`"scene`":`"login`"}"
# → 控制台日志取 mock code

# 2) 骑手 login(自动注册)→ 拿 token
$LOGIN = curl.exe -X POST "$BASE/api/v1/r/auth/login" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"mobile`":`"$MOBILE`",`"code`":`"<mock>`",`"deviceId`":`"dev-curl`",`"platform`":`"app-android`"}" | ConvertFrom-Json
$R_T = $LOGIN.data.riderToken
# 期望:isNewUser=true,hasApplication=false

# 3) 端隔离:骑手 token 调 admin → FORBIDDEN
curl.exe "$BASE/api/v1/admin/riders" -H "Rider-Token: $R_T"
# 期望:{code:"FORBIDDEN", message:"cross-scope token", ...}

# 4) 上传 5+ 资质文件(用 stage 0 文件接口,bizType=rider-realname / rider-health)
# 简化:用 customer-token 或者 rider-token 上传,获取 fileObjectId

# 5) 提交入驻
$APP = curl.exe -X POST "$BASE/api/v1/r/onboarding/applications" -H "Content-Type: application/json" -H "Rider-Token: $R_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"realName`":`"骑手测试`",`"idCardNo`":`"110105194912310029`",`"healthCertNo`":`"HC202501001`",`"healthCertExpiry`":1830000000000,`"vehicle`":{`"vehicleType`":`"electric_bike`",`"plateNo`":`"京A12345`"},`"certificates`":[{`"certType`":`"id_card_front`",`"fileObjectId`":`"<f1>`"},{`"certType`":`"id_card_back`",`"fileObjectId`":`"<f2>`"},{`"certType`":`"face_video`",`"fileObjectId`":`"<f3>`"},{`"certType`":`"health_cert`",`"fileObjectId`":`"<f4>`"},{`"certType`":`"driver_license`",`"fileObjectId`":`"<f5>`"}]}" | ConvertFrom-Json

# 6) 骑手查 status
curl.exe "$BASE/api/v1/r/onboarding/status" -H "Rider-Token: $R_T"
# 期望:hasApplication=true, auditStatus=pending, canResubmit=false

# 7) 平台审核(用 admin token,stage 0 token:dev 脚本生成)
$ADMIN_T = (...)
curl.exe -X POST "$BASE/api/v1/admin/riders/$($APP.data.applicationId)/audit" -H "Admin-Token: $ADMIN_T" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"auditResult`":`"approved`"}"
# 期望:auditStatus=approved + 后端日志 [rider.approved] auto-create rider_status + service_area + UPDATE rider_account 权威字段

# 8) 骑手查 profile(approved 后 realName 已写入)
curl.exe "$BASE/api/v1/r/profile" -H "Rider-Token: $R_T"

# 9) 上线
curl.exe -X PATCH "$BASE/api/v1/r/online-status" -H "Rider-Token: $R_T" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"targetStatus`":`"online`",`"deviceToken`":`"dev-curl`",`"platform`":`"android`"}"
# 期望:riderStatus=online + 日志 RiderOnline + getui.bindDevice mock 写 integration_request_log

# 10) 位置批量上报
curl.exe -X POST "$BASE/api/v1/r/location/batch" -H "Rider-Token: $R_T" -H "Content-Type: application/json" -H "Idempotency-Key: B1" -d "{`"batchId`":`"B1`",`"points`":[{`"lng`":116.4,`"lat`":39.9,`"reportedAt`":1714867500000}]}"
# 期望:acceptedCount=1 + last_heartbeat_at 已刷新

# 11) 接单大厅(返空骨架)
curl.exe "$BASE/api/v1/r/tasks/available" -H "Rider-Token: $R_T"
# 期望:{items:[], total:0}

# 12) 下线
curl.exe -X PATCH "$BASE/api/v1/r/online-status" -H "Rider-Token: $R_T" -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" -d "{`"targetStatus`":`"offline`"}"
# 期望:RiderOffline + getui.unbindDevice mock
```

### 3. 平台 Web 浏览器抽测

```pwsh
pnpm --filter @o2o/admin-web dev  # 默认 http://127.0.0.1:8083

# 1) 用 SUPER_ADMIN mock token 登录
# 2) 进 /admin/riders/audit:
#    - 列表显示脱敏 mobile / 姓名 / 身份证
#    - keyword 搜姓名 / 手机 / 身份证
#    - auditStatus 筛选生效
# 3) 点详情:
#    - 看到资质文件预览(图片直显 / PDF embed,6 cert_type)
#    - SUPER_ADMIN 看到"审核"按钮(pending 时)
#    - 切 AUDITOR token,刷新 → "审核"按钮消失
# 4) SUPER_ADMIN 点审核 → 弹窗选 approved → 提交
# 5) 进 /admin/riders/status → 启停骑手账号(disabled 时验证强制下线)
# 6) 进 /admin/riders/delivery-area → 输 GeoJSON Polygon → 保存
```

### 4. 骑手 APP 真机抽测(HBuilderX)

```pwsh
pnpm --filter @o2o/rider-app dev:app
# HBuilderX 打开生成的 dist/dev/app 目录,真机或 Android 模拟器调试
# 关键流程:
#  - /pages/login/index 输手机 → 60s 倒计时
#  - /pages/login/verify 输 6 位码 → 已 hasApplication 跳 progress;否则跳 onboarding/apply
#  - 入驻 5 步表单 + 上传资质 → 提交
#  - 平台审核通过后 → 骑手 login → 跳 progress 看 approved → 进 workbench
#  - workbench:上线按钮(检查 approved+health+active);上线后 30s 心跳调 location/batch
#  - tasks/available:看到空状态 + "等 stage 5/6 真订单"提示
#  - profile:展示资料 + 编辑车辆 + logout
```

## 可选(stage 4 不阻塞)

### 5. 凭证回填(.env)

```
# 阿里云人脸核验
ALI_REALNAME_FACE_API=...
ALI_REALNAME_APP_ID=...
ALI_REALNAME_APP_SECRET=...

# 个推 APP 推送
GETUI_APP_ID=...
GETUI_APP_KEY=...
GETUI_MASTER_SECRET=...

# 真接入时切 INTEGRATION_MODE=real
```

### 6. 真定位(P3-01)

stage 8+ 接高德 SDK:

- 加 `apps/rider-app/src/services/location-amap.ts`(uni.getLocation + 高德逆地理)
- pages/workbench/index.vue 心跳坐标改用 amap 定位
- 添加定位权限拒绝 → 强制下线提示

### 7. 配送范围真拖拽(P3-02)

stage 8+ 接高德地图:

- 加 `apps/admin-web/src/views/riders/components/MapPolygonEditor.vue`(高德 SDK + AMap.MouseTool)
- views/riders/delivery-area.vue 替换 textarea 为 MapPolygonEditor

### 8. 位置归档 MongoDB(P3-03)

stage 8+ 升级:

- 加 `apps/server/src/modules/rider-trajectory/`(MongoDB Schema + Service)
- RiderLocationArchiveJob 改为复制到 MongoDB 后 DELETE
- 新增 GET /api/v1/r/location/history 用户端轨迹回放接口

### 9. 接单大厅真订单(P3-04)

stage 5/6 订单模块出来后:

- rider-task-pool.service.listAvailable 接 OrderModule(stage 5 外卖订单 + stage 6 跑腿订单)
- 距离过滤:rider 当前位置到 pickup 点距离 ≤ radius(用 amap.distance)
- 服务区过滤:点在多边形内(ray-cast)
- 排序:distance ASC + deadline ASC

## 阶段 3 提交后建议

1. `git push origin main`(用户人工触发)
2. stage 4 开始前,请确认 #1~#4 已抽测通过
3. 准备 stage 4 入口:
   - admin-merchant + admin-rider + admin-user 模式可类比扩展
   - 系统配置 / 字典 / 角色权限管控页面
   - 审计日志查询 / 第三方配置健康检查
   - 信用分计算规则 / 投诉处理 / 仲裁流程 等
