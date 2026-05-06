# 阶段 10 — 四端联调 · TODO(待办)

## P0 — 用户必须执行

- [ ] **9 接口冒烟**(参考 ACCEPTANCE § 1.1):

  ```
  # 用户端
  GET /api/v1/c/orders/FOOD/510001/timeline      Customer-Token
  GET /api/v1/c/orders/ERRAND/610001/timeline    Customer-Token
  GET /api/v1/c/payments/{payOrderId}            Customer-Token
  POST /api/v1/pub/push/devices                  Customer-Token
  # 商家 APP
  GET /api/v1/m/food-orders/{orderId}/timeline   Merchant-Token
  POST /api/v1/pub/push/devices                  Merchant-Token
  # 骑手 APP
  GET /api/v1/r/tasks/{taskId}/timeline          Rider-Token
  POST /api/v1/pub/push/devices                  Rider-Token
  # 平台 Web
  GET /api/v1/admin/orders/FOOD/510001/timeline  Admin-Token
  GET /api/v1/admin/payments/{payOrderId}        Admin-Token
  # 第三方
  POST /api/v1/callback/payments/wxpay           回调验签
  POST /api/v1/callback/refunds/wxpay            回调验签
  ```

- [ ] **数据库迁移**:`pnpm migrate:run`(应用 Stage10Init,1 张新表)
- [ ] **权限 seed**:`pnpm seed:run`(同步 admin:order:timeline:view + admin:payment:view + AUDITOR 绑定)

## P1 — 用户应当执行

- [ ] **四端联动场景验证**(规划手动审查与测试 § 5):
  - 平台仲裁 → 退款执行 → 消息推送
  - 优惠券发布 → 用户领券
  - 费率变更 → 不追改已结算订单
  - 异常订单监控 → 人工派单
  - 数据大屏 → 报表导出

## P2 — 后续补

- [ ] admin-web 暴露 timeline / payment 详情(stage 11 浏览器联调时按需补)

## P3 — stage 11 性能安全兼容补

- [ ] **P3-01** 真 wxpay 退款执行(refund-callback.controller 当前 mock 验签 + 占位)
- [ ] **P3-02** 真 minio 上传(stage 9 沿用)
- [ ] **P3-03** 真智能调度(stage 9 沿用)
- [ ] **P3-04** 真对账(stage 9 沿用)
- [ ] **P3-09** callback 旧路径 `/callback/wxpay` `/callback/alipay` 待 stage 11 切换后废弃
- [ ] **P3-10** push-device 写入后挂 getui adapter 异步注册(本阶段仅落库,推送 stage 11)

## 操作指引

```bash
# 应用本阶段迁移
pnpm migrate:run

# 重新 seed 权限
pnpm seed:run

# server 启动
pnpm dev:server

# admin-web 启动(本阶段未改 admin-web,无新页)
pnpm dev:admin
```
