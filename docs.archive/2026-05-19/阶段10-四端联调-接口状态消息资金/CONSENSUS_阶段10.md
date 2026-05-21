# 阶段 10 — 四端联调 · 接口状态消息资金 · CONSENSUS(共识)

> 锁定本阶段所有交付项,严格对齐 ALIGNMENT\_阶段10.md。任何越界/遗漏在 Wave 5 自审时必须暴露。

## 1. 模块清单

| 类别 | 模块名                                    | 状态                                               |
| ---- | ----------------------------------------- | -------------------------------------------------- |
| 新增 | `push-device`                             | 新建                                               |
| 扩展 | `food-order`(已有)+ method                | 加 c-timeline                                      |
| 扩展 | `errand-order`(已有)+ method              | 加 c-timeline                                      |
| 扩展 | `merchant-order`(已有)+ method            | 加 m-timeline                                      |
| 扩展 | `rider-task`(已有)+ method                | 加 r-timeline                                      |
| 扩展 | `admin-food-order` + `admin-errand-order` | 加 admin-timeline(走 admin-orders 通用 controller) |
| 新增 | `admin-orders`(timeline 通用查询)         | 新建                                               |
| 扩展 | `payment`                                 | 加 c GET + admin GET + callback/payments/{ch} 别名 |
| 新增 | `admin-payment`                           | 新建                                               |
| 扩展 | `admin-refund`(已有 stage 9)              | 加 callback/refunds/{ch} controller                |

实际新增模块:**3 个**(push-device / admin-orders / admin-payment),其余在已有模块加 method/controller。

## 2. 数据表

| 表            | 操作       | 关键字段                                                                                                                                                                 |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `push_device` | **CREATE** | push_device_id PK / device_token UK / principal_type / principal_id / platform(ios/android) / app_type(customer/merchant/rider) / push_enabled / created_at / updated_at |

不动其他表。

## 3. 接口契约(9 个 — 与契约清单 1:1)

| #   | METHOD | PATH                                              | Token    | Idempotent                              | Audit          |
| --- | ------ | ------------------------------------------------- | -------- | --------------------------------------- | -------------- |
| 1   | GET    | `/api/v1/c/orders/:bizType/:orderId/timeline`     | Customer | 否                                      | 否(查询)       |
| 2   | GET    | `/api/v1/m/food-orders/:orderId/timeline`         | Merchant | 否                                      | 否             |
| 3   | GET    | `/api/v1/r/tasks/:taskId/timeline`                | Rider    | 否                                      | 否             |
| 4   | GET    | `/api/v1/admin/orders/:bizType/:orderId/timeline` | Admin    | 否                                      | @Audit(读敏感) |
| 5   | GET    | `/api/v1/c/payments/:payOrderId`                  | Customer | 否                                      | 否             |
| 6   | GET    | `/api/v1/admin/payments/:payOrderId`              | Admin    | 否                                      | @Audit         |
| 7   | POST   | `/api/v1/callback/payments/:channel`              | 验签     | 是(SETNX nonce + provider tradeNo 去重) | 否             |
| 8   | POST   | `/api/v1/callback/refunds/:channel`               | 验签     | 是                                      | 否             |
| 9   | POST   | `/api/v1/pub/push/devices`                        | C/M/R    | @Idempotent                             | @Audit         |

## 4. 权限点新增

| code                        | type   | 说明               |
| --------------------------- | ------ | ------------------ |
| `admin:order:timeline:view` | button | 平台订单时间线查看 |
| `admin:payment:view`        | button | 平台支付单查看     |

绑 super_admin / FINANCE / OPERATOR / AUDITOR(只读)— 共 2 个新权限。

## 5. 事件 / 订阅器 / 任务

- 事件:**0 新增**(全复用)
- Subscriber:**0 新增**
- Job:**0 新增**(stage 10 是联调,所有 job 已就位)

## 6. admin-web

- **不新增页面**(本阶段无 admin-web 文件改动)
- 留待 stage 11/12 浏览器联调时按需补 timeline / payment 详情显示

## 7. 严格不做(防越界)

- ❌ 不接真 wxpay/alipay/getui/minio
- ❌ 不实现 stage 11 范畴的"性能/安全压测"
- ❌ 不重做 stage 5/6/7/8/9 既有接口
- ❌ 不动客户端代码(本仓库无 mp/app)
- ❌ 不新增 event / subscriber / job / vitest

## 8. 验收锁定

- typecheck / jest / build 全绿
- 9 接口契约一致 + 1 表迁移可应用
- ACCEPTANCE/FINAL/TODO 三件套 + 项目阶段规划/10 三表勾选齐全
