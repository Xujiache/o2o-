# ACCEPTANCE — 优惠券使用环节(wave 2)

承接 wave1(领取链路),本波打通**下单时使用 + 抵扣 + 状态机闭环**。

## 1. 落地清单

### 后端 — coupon 模块

- [x] 重写 `CouponService` 三个方法,接受 `EntityManager` 参数,与订单事务一体:
  - `lockCoupons(em, orderId, userCouponId, customerId)` — UNUSED → USED + 写 coupon_lock(`coupon_id` 字段复用为 `user_coupon_id`)
  - `releaseCoupons(em, orderId)` — coupon_lock active → released + user_coupon USED → UNUSED
  - `consumeCoupons(em, orderId)` — coupon_lock active → consumed(user_coupon 保持 USED)
- [x] `CouponCustomerService` 新增 `validateForOrder(customerId, userCouponId, orderBizType, goodsAmountCents)`:校验归属/状态/在效期/bizType/门槛 + 计算 discount

### 后端 — 订单链路接入

- [x] `food-order.service.preview`:**删除硬拒** `couponId`,改为调用 `validateForOrder` 算出 discount 并写入 snapshot
- [x] `food-order.service.submit`:事务内调用 `couponService.lockCoupons`
- [x] `food-order.service.cancel`:事务内调用 `couponService.releaseCoupons`
- [x] `OrderPriceSnapshotPayload` 增加 `userCouponId / couponName` 字段
- [x] `food-order.dto.ts`:`couponId` 注释从"stage 5 任意值返 INVALID_PARAM"改为"用户已领取的优惠券实例 id"

### 后端 — 支付与超时

- [x] `payment.service.applyFoodPaid`:支付成功事务内 `consumeCoupons` 核销
- [x] `wait-pay-timeout-close.job`:15min 未付自动关单时 `releaseCoupons` 退还

### 后端 — 模块装配

- [x] `food-order.module` import `CouponModule`
- [x] `payment.module` import `CouponModule`
- [x] `scheduler.module` import `CouponModule`(给 wait-pay-timeout-close 注入 CouponService 用)

### 后端 — 单测

- [x] `coupon.service.spec.ts` 重写 — 11 个用例覆盖 lock/release/consume 三件事
- [x] `food-order.service.spec.ts`、`payment.service.spec.ts`、`stage5-jobs.spec.ts` 同步构造函数参数

### 客户端

- [x] `food/order/confirm.vue`:加优惠券选择 UI
  - 「优惠券」行可点击 → `pickCoupon()` 加载 UNUSED 券 → `uni.showActionSheet` 选择
  - 选中后立即重新 `previewOrder` 触发后端抵扣计算
  - 错误时(过期/被占)自动清掉选择,允许无券下单

## 2. 验证记录

| 检查                                                                      | 结果                            |
| ------------------------------------------------------------------------- | ------------------------------- |
| `pnpm --filter @o2o/server typecheck`                                     | ✅ 0 错                         |
| `pnpm --filter @o2o/server test`                                          | ✅ 124 suites, 837 tests passed |
| `pnpm --filter @o2o/customer-app exec vitest run src/api/coupons.spec.ts` | ✅ 3/3 通过                     |

## 3. 状态机闭环

```
              领取                  下单(submit)
   ┌─────────┐  →  ┌───────────┐  →  ┌──────┐
   │ (无券)  │     │  UNUSED   │     │ USED │
   └─────────┘     └───────────┘     └──────┘
                       ↑                │
                       │ release        │ consume(支付成功)
                       │                │
                       ▼                ▼
                  (撤回到 UNUSED)    (永久 USED)

   并行触发 release 的场景:
    - 用户主动取消订单(WAIT_PAY → CANCELLED)
    - 15 分钟未付自动关单(wait-pay-timeout-close job)
```

## 4. 与规划文档的对齐

完成 `docs/阶段5-用户端外卖交易闭环/CONSENSUS_阶段5.md` § A6 当时延后的"真实抵扣"逻辑,完整对接 `docs/阶段10-四端联调-接口状态消息资金/TODO_阶段10.md` P1 § 2 "优惠券发布 → 用户领券 → 使用"。

## 5. 未做

- **跑腿订单(ERRAND)抵扣**:本波只做 FOOD;ERRAND preview 仍未接 validateForOrder(其他场景未触发该需求,客户端跑腿下单页也未加 UI)。下波可以同模式补 1~2 处即可
- **下单页的"可用券气泡提示"**:用户进 confirm 页时主动提示"你有 X 张可用券"——可选增强,本波只在用户点击时加载
- **多张券叠加**:本波单券单订单,不做组合
