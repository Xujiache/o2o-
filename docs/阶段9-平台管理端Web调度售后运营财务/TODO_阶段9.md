# 阶段 9 — 平台管理端 Web · 调度售后运营财务 · 待办(TODO)

## P0 — 用户必须执行

- [ ] **接口冒烟**:14 接口 curl 调通(参考 ACCEPTANCE § 2)
  ```
  # 拿 admin token(参考 stage 8 TODO)
  POST /api/v1/admin/marketing/coupons          # 发布优惠券
  GET  /api/v1/admin/marketing/coupons          # 列表
  PATCH /api/v1/admin/rate-rules                # 配置费率
  GET  /api/v1/admin/rate-rules
  GET  /api/v1/admin/dashboard/overview         # 大屏
  POST /api/v1/admin/exports + GET /:id         # 导出
  GET  /api/v1/admin/refunds + /:id
  GET  /api/v1/admin/risk/exceptions
  POST /api/v1/admin/dispatch/tasks/:id/assign  # 人工派单
  POST /api/v1/admin/after-sales/:id/arbitrate  # 仲裁
  GET  /api/v1/admin/food-orders/export
  GET  /api/v1/admin/errand-orders/export
  ```

## P1 — 用户应当执行

- [ ] **admin-web 浏览器测试**:登录 super_admin → 6 新页 + 4 既有页扩按钮 全部点开核验
  - 新页:dashboard / refunds / exceptions / rate-rules / marketing/coupons / exports
  - 既有页扩:food-orders 加 export 按钮 / errand-orders 加 export 按钮 / after-sales 加 仲裁 / dispatch 加 人工派单(实际 manualAssign API 已就绪,可由 dispatch 详情页或新增 dialog 触发)

## P2 — 边际差,可后续补

- admin-web vitest 93 < 计划 97(-4 用例),建议在使用页面时补 e2e

## P3 — stage 11 性能安全兼容补

- 真 wxpay 退款执行(refund_order 状态接真 mock 改 SUCCESS)
- 真 minio 上传(export-task-process.job 当前是 mock URL)
- 真智能调度(dispatch_rule 表已建,接口 CRUD 待 stage 11)
- 真对账(reconciliation.job 当前只统计,stage 11 接 wxpay 对账下载)
- dispatch-rules 物理页(本阶段动态延后,接口契约未列)
- 投诉举报 / 评价审核 / banner / 弹窗 / 积分细化 / 秒杀 / 拼团 等无契约接口的页面(规划列页名,延后)

## 操作指引

```bash
# 应用本阶段迁移(已完成)
pnpm migrate:run
pnpm seed:run

# 启动 server
pnpm dev:server

# 启动 admin-web
pnpm dev:admin
# 访问 http://localhost:5173,super_admin / O2o@2026-Admin
```
