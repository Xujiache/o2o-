# ACCEPTANCE — 优惠券领取链路

## 1. 落地清单

### 后端

- [x] 新增实体 `user_coupon`(`apps/server/src/database/entities/user-coupon.entity.ts`)
- [x] 迁移 `1717979300000-UserCoupon.ts`(已通过 `pnpm migrate:run` 落库)
- [x] 在 entities/index.ts 中导出 UserCoupon
- [x] `coupon-customer.dto.ts` — 4 个 query + 4 个 VO
- [x] `coupon-customer.service.ts` — `listAvailable / claim / listMy`,claim 走 DataSource 事务 + 原子 remainStock 扣减
- [x] `coupon-customer.controller.ts` — `c/coupons/available`、`c/coupons/claim/:id`、`c/coupons/my`(均挂 `CustomerJwtGuard` + Customer-Token 文档,claim 加 `@Idempotent`)
- [x] `coupon.module.ts` 注册新 service / controller / Repository(CouponRule + UserCoupon)
- [x] 单测 10 个 — listAvailable 2、claim 6(happy / 不存在 / 非 ACTIVE / 已过期 / ALREADY_CLAIMED / STOCK_DEPLETED)、listMy 2(EXPIRED 运行时计算)

### 客户端

- [x] `api/coupons.ts` — 类型 + 3 个 request 封装
- [x] `api/coupons.spec.ts` — 3 个用例,验证 URL + method
- [x] `pages/me/coupons.vue` — 双 segment(我的 / 领券中心) + 状态 chips + 优惠券卡(左侧色块面值,右侧名称/有效期/状态/库存,领券中心右侧"领取"按钮)
- [x] `pages.json` 注册 `pages/me/coupons`
- [x] `pages/me/index.vue` 入口启用 + 跳转

## 2. 验证记录

| AC  | 描述                                                 | 结果                                                                                              |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| AC1 | 可领取列表能拉到 ACTIVE 券                           | ✅ service 测试覆盖                                                                               |
| AC2 | 领取后写入 + remainStock -1;再领 422 ALREADY_CLAIMED | ✅ 测试覆盖 + 唯一索引兜底                                                                        |
| AC3 | 库存 0 时 422 STOCK_DEPLETED                         | ✅ 测试覆盖(affected=0 分支)                                                                      |
| AC4 | 我的优惠券页按状态分 tab                             | ✅ 页面实现 + UNUSED/USED/EXPIRED 分类                                                            |
| AC5 | 入口点击进入页面                                     | ✅ me/index.vue 已启用                                                                            |
| AC6 | 三接口在 CustomerJwtGuard 下可用                     | ✅ controller 已挂 guard                                                                          |
| AC7 | typecheck / 测试 / 迁移通过                          | ✅ server typecheck 0 错;coupon 测试 14/14 通过;api 测试 3/3 通过;迁移 `+UserCoupon1717979300000` |

## 3. 测试输出摘录

```
PASS src/modules/coupon/coupon.service.spec.ts (8.293 s)
PASS src/modules/coupon/coupon-customer.service.spec.ts (8.701 s)
Tests:       14 passed, 14 total

src/api/coupons.spec.ts (3 tests) 6ms
Test Files  1 passed (1)
     Tests  3 passed (3)

[migrate] applied 1 migration(s):
  + UserCoupon1717979300000
```

## 4. 阻塞项

- **server 进程需重启**:当前运行的是 `node dist/main`(prod 构建产物);新增的 c 端 controller 在源码中,需要由用户执行重启操作才能生效。具体方案见 TODO 文档。
