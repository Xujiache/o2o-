# 阶段 6 — 用户端跑腿交易闭环 · 待办清单(TODO)

> 自动交付已完成 32/32 原子任务,以下为**用户侧待办**(本工具无法触发):

## 1. 数据库迁移(P0)

```bash
# 1.1 启动本地 MySQL(端口 3307,与 Windows MySQL 共存)
docker compose up -d mysql

# 1.2 执行 stage 6 migration
pnpm --filter @o2o/server typeorm migration:run

# 1.3 跑 seeds(errand_type 4 条 / errand_pricing 1 条 / prohibited_item 10 条 / +2 权限)
pnpm --filter @o2o/server seed
```

## 2. 接口冒烟(P1)

启动 server `pnpm --filter @o2o/server start:dev`,然后用 curl 验证 9+3 接口(curl 模板见 stage 5 TODO,改 path 即可):

```bash
# 公开接口
curl -X GET 'http://127.0.0.1:3000/api/v1/c/errand/service-types?cityCode=GLOBAL'

# 需要 Customer-Token(先走 stage 1 登录拿 token)
TOKEN=<customer-token>
# 报价
curl -X POST http://127.0.0.1:3000/api/v1/c/errand/quotes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Idempotency-Key: q-1' \
  -H 'Content-Type: application/json' \
  -d '{"typeCode":"BUY","pickupAddress":{"address":"A","lng":116.4,"lat":39.9},"deliveryAddress":{"address":"B","lng":116.42,"lat":39.9},"urgentLevel":"standard","budget":5000,"itemDesc":"咖啡"}'

# 提交、列表、详情、取消、加急、备注、轨迹
# (参见 docs/阶段6-用户端跑腿交易闭环/DESIGN_阶段6.md § 4)
```

## 3. customer-app 真机测试(P1)

```bash
pnpm --filter @o2o/customer-app dev:h5
# 浏览器开 http://127.0.0.1:5173/#/pages/errand/home/index
# 走通:首页 → 选 BUY → 填表 → 报价 → 确认 → 收银台 mock → 详情 → 加急/备注 → 轨迹 → 售后入口
```

## 4. admin-web 浏览器测试(P1)

```bash
pnpm --filter @o2o/admin-web dev
# 浏览器开 http://127.0.0.1:5174,SUPER_ADMIN 登录
# 菜单"跑腿订单" → 列表 + 8 张统计卡 + 筛选 + 详情抽屉
```

## 5. 已知 P3(stage 7-11 接)

- **P3-01 真 amap 路线规划**: 当前 `amap.adapter.route()` mock 直线 + 7m/s 估算 eta,stage 8 接真高德
- **P3-02 真 wxpay/alipay 支付**: 沿用 stage 5 MockAdapter,stage 8 接真凭证 + 真验签
- **P3-03 真售后流程**: stage 6 跑腿订单详情 → 售后按钮跳 stage 5 占位页,stage 7 接商家/骑手端真售后
- **P3-04 真 sms**: `errand-paid.subscriber` / `errand-no-rider-cancelled.subscriber` 中 sms.send(customerId, ...) 占位 mobile,stage 11 改查 customer_user.mobile
- **P3-05 真定位**: customer-app `address-picker/index.vue` 当前仅文字输入,stage 8 接 amap SDK 真定位 + POI 搜索
- **P3-06 真图片上传**: customer-app `image-upload/index.vue` 当前仅记录 fileId 占位,stage 8 接真上传(走 stage 0 file 模块)
- **P3-07 计价 / 违禁配置 UI**: errand_pricing / prohibited_item 仅 seed,stage 9 平台运营页

## 6. 文档触发(P2)

- 更新 `项目阶段规划/06-阶段6-用户端-跑腿交易闭环/手动审查与测试.md`:
  - § 4 接口审查 Checklist:每接口"待填写" → 走完冒烟后改"通过"
  - § 5 四端联动测试:用户端必测,骑手/平台 Web 只读消费,商家端不涉及
  - § 6 第三方联调:地图(mock)/ 支付(mock)/ 短信(mock)/ 推送(mock)各项填"必测但本阶段 mock"
  - § 7 问题清单:本阶段无 P0/P1
  - § 8 复核签字

## 7. 进入下一阶段的预备

- 用户拍板"进入 stage 7" 后,我会按 6A 流程读 `项目阶段规划/07-阶段7-商家端APP-订单售后结算数据/` 9 份文档,产出 ALIGNMENT/CONSENSUS/DESIGN/TASK 4 份文档,等待你拍板关键决策。
- stage 7 主要范围预测(据规划目录):商家端订单接单/拒单 + 售后处理 + 结算数据。
