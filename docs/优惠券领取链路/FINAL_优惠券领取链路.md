# FINAL — 优惠券领取链路 交付总结

## 1. 完成的链路

```
admin/marketing/coupons 发布券  →  coupon_rule(remain_stock)
                                       ↑
                                       │ 原子扣减
                                       │
客户端 me 入口 → coupons.vue → /c/coupons/available 列可领的(带 alreadyClaimed)
                              → /c/coupons/claim/:id 事务领取(写 user_coupon)
                              → /c/coupons/my       列我的(运行时算 EXPIRED)
```

## 2. 不变式与并发保证

- **单用户限领 1 张**:`uk_user_coupon_customer_rule (customer_id, coupon_rule_id)` 唯一索引兜底;service 层先查 + 拒
- **库存不超卖**:`UPDATE coupon_rule SET remain_stock = remain_stock - 1 WHERE coupon_rule_id = ? AND remain_stock > 0`,affected=0 即 STOCK_DEPLETED
- **EXPIRED 实时计算**:不写离线 job;`listMy` 查询时按 `valid_to <= now` 把 UNUSED 翻成 EXPIRED 返给前端
- **领取幂等**:controller 上挂 `@Idempotent({ scope: 'c-coupon:claim', ttlSeconds: 60 })`,客户端在 60s 内重发同 key 直接返回首次结果

## 3. 文件清单

新增 9 个 / 修改 4 个:

| 文件                                                              | 类型 | 说明                                 |
| ----------------------------------------------------------------- | ---- | ------------------------------------ |
| `apps/server/src/database/entities/user-coupon.entity.ts`         | 新   | UserCoupon 实体                      |
| `apps/server/src/database/migrations/1717979300000-UserCoupon.ts` | 新   | CREATE TABLE user_coupon             |
| `apps/server/src/database/entities/index.ts`                      | 改   | re-export UserCoupon                 |
| `apps/server/src/modules/coupon/coupon-customer.dto.ts`           | 新   | c 端 DTO/VO                          |
| `apps/server/src/modules/coupon/coupon-customer.service.ts`       | 新   | listAvailable / claim / listMy       |
| `apps/server/src/modules/coupon/coupon-customer.service.spec.ts`  | 新   | 10 个用例                            |
| `apps/server/src/modules/coupon/coupon-customer.controller.ts`    | 新   | `c/coupons` 三接口                   |
| `apps/server/src/modules/coupon/coupon.module.ts`                 | 改   | 注册新 service/controller/Repository |
| `apps/customer-app/src/api/coupons.ts`                            | 新   | 3 个 request 封装                    |
| `apps/customer-app/src/api/coupons.spec.ts`                       | 新   | 3 个用例                             |
| `apps/customer-app/src/pages/me/coupons.vue`                      | 新   | 我的优惠券页(双 segment)             |
| `apps/customer-app/src/pages.json`                                | 改   | 注册路由                             |
| `apps/customer-app/src/pages/me/index.vue`                        | 改   | 入口启用 + navigateTo                |

文档:`docs/优惠券领取链路/{ALIGNMENT, DESIGN, ACCEPTANCE, FINAL, TODO}.md`

## 4. 已知边界(已大部分在 wave2 中关闭)

- ~~**下单时使用优惠券抵扣** 仍未接通~~ — **已在 wave2 交付**(见 `ACCEPTANCE_wave2_使用环节.md`):food-order preview/submit/cancel + payment 支付成功核销 + wait-pay-timeout 自动释券全链路打通;客户端 confirm.vue 加入选择 UI
- **EXPIRED 仅查询时计算**,DB 里 user_coupon.status 长期是 UNUSED;若未来需要按状态拉取冷数据可补一个 cron 把过期的 UNUSED 改成 EXPIRED
- **优惠券类型 DISCOUNT(折扣)** 前端显示假定 `discount` 字段是千分位 ‰(如 850 = 8.5 折);若后端实际是百分比需对齐口径(目前 admin 发布也是约定 ‰,见 marketing.dto)
- 客户端 me 页"我的优惠券"入口已直通 `/pages/me/coupons`;旧的"敬请期待"toast 仅剩占位入口在未来其他功能用

## 5. 测试与质量门控

- ✅ `pnpm --filter @o2o/server typecheck` — 0 错
- ✅ `pnpm --filter @o2o/server test -- --testPathPattern coupon` — 14 / 14 通过
- ✅ `pnpm --filter @o2o/customer-app exec vitest run src/api/coupons.spec.ts` — 3 / 3 通过
- ✅ `pnpm migrate:run` — applied 1 migration(UserCoupon1717979300000)

## 6. 与规划文档的对齐

满足 `docs/阶段10-四端联调-接口状态消息资金/TODO_阶段10.md` P1 第 2 项 "优惠券发布 → 用户领券" 的"用户领券"半侧。"优惠券发布"已由 `admin/marketing/coupons` 接口在 stage 9 实现,本期把链路向 c 端打通到了"领取 + 查看"。
