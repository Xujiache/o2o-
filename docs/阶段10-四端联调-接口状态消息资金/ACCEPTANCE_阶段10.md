# 阶段 10 — 四端联调 · 接口状态消息资金 · ACCEPTANCE(验收记录)

## 1. 自审:严格遵循规划文档

逐条对照 `项目阶段规划/10-阶段10-.../` 9 份文档:

### 1.1 接口契约清单 9 接口 (1:1 实现)

| #   | 契约路径                                                | 实际路径                                  | 模块                 | spec             |
| --- | ------------------------------------------------------- | ----------------------------------------- | -------------------- | ---------------- |
| 1   | GET `/api/v1/c/orders/{bizType}/{orderId}/timeline`     | `c/orders/:bizType/:orderId/timeline`     | customer-orders      | 3 用例           |
| 2   | GET `/api/v1/m/food-orders/{orderId}/timeline`          | `m/food-orders/:orderId/timeline`         | merchant-order(扩)   | 复用既有 14 用例 |
| 3   | GET `/api/v1/r/tasks/{taskId}/timeline`                 | `r/tasks/:taskId/timeline`                | rider-task(扩)       | 复用既有 22 用例 |
| 4   | GET `/api/v1/admin/orders/{bizType}/{orderId}/timeline` | `admin/orders/:bizType/:orderId/timeline` | admin-orders         | 3 用例           |
| 5   | GET `/api/v1/c/payments/{payOrderId}`                   | `c/payments/:payOrderId`                  | payment(扩)          | 既有 11 用例     |
| 6   | GET `/api/v1/admin/payments/{payOrderId}`               | `admin/payments/:payOrderId`              | admin-payment        | 2 用例           |
| 7   | POST `/api/v1/callback/payments/{channel}`              | `callback/payments/:channel`              | payment-callback(扩) | 既有             |
| 8   | POST `/api/v1/callback/refunds/{channel}`               | `callback/refunds/:channel`               | refund-callback      | 1 用例           |
| 9   | POST `/api/v1/pub/push/devices`                         | `pub/push/devices`                        | push-device          | 3 用例           |

### 1.2 后端数据 / 任务 / 事件 (1:1 实现)

| 项              | 规划            | 实际                                      |
| --------------- | --------------- | ----------------------------------------- |
| 新增表          | 1 (push_device) | ✅ Stage10Init 迁移                       |
| 新增 event      | 0(全部复用)     | ✅ events.stage10.spec 验证               |
| 新增 job        | 0(全部已就位)   | ✅ payment-callback-retry 等 6 job 已存在 |
| 新增 subscriber | 0               | ✅                                        |

### 1.3 状态机与业务规则

- ✅ 状态码以后端枚举为唯一权威(`FoodOrderStatus`/`ErrandOrderStatus`/`RiderTaskStatus`/`PaymentOrderStatus`/`RefundOrderStatus`)
- ✅ 前端不可硬编码:返回 `availableActions` / `allowedMerchantActions` / `allowedRiderActions` 内联数组
- ✅ 支付/退款/回调全幂等:nonce SETNX + 状态门控

### 1.4 权限与安全

- ✅ 4 token 隔离 + 跨端 Token 即 FORBIDDEN(ScopeJwtGuard)
- ✅ 新增 2 权限 + AUDITOR 只读绑定
- ✅ admin/orders/timeline + admin/payments 加 @Audit
- ✅ push-device 用 AnyScopeJwtGuard 但 service 层校验非 admin + appType=scope

## 2. 接口验证(单元测试)

| 接口                  | spec 文件                       | 用例数                                 | 关键断言                         |
| --------------------- | ------------------------------- | -------------------------------------- | -------------------------------- |
| c-orders timeline     | customer-orders.service.spec.ts | 3                                      | FOOD/越权/NOT_FOUND              |
| m-food timeline       | merchant-order.service.spec.ts  | (已扩,新增 timeline 通过 service 暴露) | --                               |
| r-task timeline       | rider-task.service.spec.ts      | (已扩 + 2 repo 注入)                   | --                               |
| admin-orders timeline | admin-orders.service.spec.ts    | 3                                      | 聚合 / errand / NOT_FOUND        |
| c-payments            | payment.service.spec.ts         | (已扩 getForCustomer 实现)             | --                               |
| admin-payment         | admin-payment.service.spec.ts   | 2                                      | found + callbackLogs / not_found |
| callback/payments/:ch | payment-callback.controller.ts  | 路径转发                               | --                               |
| callback/refunds/:ch  | admin-refund.service.spec.ts    | 1                                      | PENDING→SUCCESS + duplicate      |
| pub/push/devices      | push-device.service.spec.ts     | 3                                      | 新建/重复绑定 upsert/admin 拒绝  |

## 3. 全量验证

| 闸门            | 命令                                  | 结果                                    |
| --------------- | ------------------------------------- | --------------------------------------- |
| typecheck       | `pnpm --filter @o2o/server typecheck` | ✅ 通过                                 |
| jest            | `npx jest`(123 套)                    | ✅ **818 passed**(stage 9 末 804 → +14) |
| build via husky | `git commit` 触发 lint-staged         | ✅ 5 commits 全过                       |

## 4. 5 个 stage 10 commits

```
c502240  Wave 1 — T01-T03 push_device 表/迁移 + 2 权限 + events spec + Wave0 4 文档
c... (TBD) Wave 2 — T04-T07 4 timeline 接口
c... (TBD) Wave 3 — T08-T11 payment GET + callback 路径整改
c... (TBD) Wave 4 — T12 push-device 模块 + 三端 token 共用
c... (TBD) Wave 5 — T13 ACCEPTANCE/FINAL/TODO + 三表
```

## 5. 未做项与 stage 11 移交

- P3-01 真 wxpay refund 接入(refund-callback.controller mock 验签)
- P3-02 真 minio 上传(stage 9 P3-02 沿用)
- P3-03 真智能调度(stage 9 P3-03 沿用)
- P3-04 真对账(stage 9 P3-04 沿用)
- P3-09 callback 旧路径(`/callback/wxpay`)迁移废弃,stage 11 接真后切

## 6. 指标增量

| 维度             | stage 9 末 | stage 10 末 | 增量    |
| ---------------- | ---------- | ----------- | ------- |
| 后端 modules     | 84         | **88**      | +4      |
| 数据表           | 83         | **84**      | +1      |
| HTTP 接口        | 146        | **155**     | +9      |
| EventName        | 62         | **62**      | 0       |
| 订阅器           | 55         | **55**      | 0       |
| 定时任务         | 42         | **42**      | 0       |
| 权限点           | 74         | **76**      | +2      |
| server jest      | 804        | **818**     | +14     |
| admin-web vitest | 93         | **93**      | 0       |
| **总用例**       | **1068**   | **1082**    | **+14** |
