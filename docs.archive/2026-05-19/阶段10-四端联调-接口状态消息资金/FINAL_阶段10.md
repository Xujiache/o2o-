# 阶段 10 — 四端联调 · 接口状态消息资金 · FINAL(总结)

## 1. 完成情况

13/13 原子任务全部完成,5 commits 提交。指标 stage 9 末 → stage 10 末:

- modules 84 → 88 (+4)
- 数据表 83 → 84 (+1)
- HTTP 接口 146 → 155 (+9)
- 权限点 74 → 76 (+2)
- 总用例 1068 → 1082 (+14)

## 2. 范围严格审查 ✅

✅ 9 接口契约 1:1 实现(0 多 / 0 少)
✅ 1 新表 push_device(0 多 / 0 少)
✅ 0 event / 0 job / 0 subscriber 新增(规划要求)
✅ 0 admin-web 页面新增(本阶段为后端联调)
✅ 0 客户端代码改动(本仓库无 mp/app)
✅ 商家 Web / 商家小程序 红线零越界
✅ 外卖 / 跑腿订单独立模型,timeline 分别走 order_timeline / errand_timeline

## 3. 关键架构决策

1. **callback 路径整改保旧**:`/callback/wxpay` 旧路径保留,`/callback/payments/wxpay` 契约路径并存,转发到同 service。stage 11 真接时再废旧。
2. **push-device 三 token 共用**:用 `AnyScopeJwtGuard`(已存在)+ service 层校验 scope 非 admin + appType=scope,原子且安全。
3. **timeline 数据源拆分**:外卖走 `order_timeline`,跑腿走 `errand_timeline`(独立状态机要求)。骑手任务时间线按 bizType 分发。
4. **admin/orders/timeline 4 logs 聚合**:timeline + operatorLogs(sys_audit_log) + dispatchLogs(manual_dispatch_log) + paymentLogs(payment_order)
5. **payment c GET 越权检查**:不直接查 customerId,而通过 bizType+bizId 反查 food_order/errand_order 校验归属

## 4. 与 stage 9 联动

- 复用 stage 9 RefundOrder + AdminRefundService → 加 handleProviderCallback
- 复用 stage 9 SysAuditLog → admin-orders 聚合 operatorLogs

## 5. 准入门(stage 11 进入条件)

- ✅ P0 清零
- ✅ P1 清零
- ✅ 接口审查无阻塞
- ✅ 四端边界(Token/scope)无违规
- 待人工:接口冒烟测试 / 四端联动测试(P0/P1 in TODO)
