# ALIGNMENT — 优惠券领取链路(细化自 stage 10 P1 #2)

## 1. 上下文与原始需求

- **来源**:用户在 me 页面要求"把优惠券链路做完整"
- **规划锚点**:`docs/阶段10-四端联调-接口状态消息资金/TODO_阶段10.md` P1 第 2 项 — "优惠券发布 → 用户领券"
- **历史决策**(stage 5 CONSENSUS A6 甲方案):仅建 `coupon_lock` 表;真实发券与抵扣延后 stage 6/7;实际代码现状是 `lockCoupons` 仍 throw INVALID_PARAM —— 即"用户领券"未实现

## 2. 现状摸底

| 层              | 已有                                                                                                                     | 缺口                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 实体            | `coupon_rule`(后台发布的券模板) / `coupon_lock`(下单锁定记录)                                                            | **`user_coupon`** 用户领取关系表未建           |
| 后端 service    | `MarketingService.publishCoupon / list`(admin) / `CouponService.lockCoupons / releaseCoupons / consumeCoupons`(下单链路) | C 端的 listAvailable / claim / listMy 三个方法 |
| 后端 controller | `admin/marketing/coupons`(发布+列表)                                                                                     | **c 端 controller 缺失**                       |
| 客户端 API      | 无                                                                                                                       | `api/coupons.ts` 需新建                        |
| 客户端页面      | 无                                                                                                                       | `pages/me/coupons.vue` 需新建                  |
| 客户端入口      | me/index.vue 有占位,`enabled: false`                                                                                     | 改 `true` + 跳转                               |

## 3. 范围界定

### 包含

- 后端 user_coupon 实体 + 迁移
- C 端三接口:`GET /c/coupons/available`、`POST /c/coupons/claim/:couponRuleId`、`GET /c/coupons/my`
- 防超额领取(remainStock 原子扣减 + 单用户每券限领 1 张)
- 客户端 API 封装 + 页面 + 入口
- service 单测 + api 单测

### 不包含(留 stage 11 或后续 wave)

- 下单时优惠券抵扣(CouponService.lockCoupons 仍占位,不动)
- 优惠券核销与订单结算耦合
- 优惠券权益分类(满减/折扣的细化校验,只做展示)
- 领券中心的运营位推荐(本期等同于"可领取列表")
- admin 后台已有的发券接口不动

## 4. 关键决策

- **限领规则**:同一用户对同一 couponRuleId 最多 1 张(简单粗暴,符合 MVP);后续可扩展 perUserLimit
- **过期处理**:`listMy` 时实时按 `validTo < now` 判定 EXPIRED(不写离线 job)
- **状态机**:UNUSED / USED / EXPIRED;USED 在 stage 6+ 接抵扣时再驱动,本期 listMy 只读
- **领取并发**:用 DB 事务 + 行锁,保证 remainStock 不超卖
- **路径**:`/api/v1/c/coupons/*`,沿用现有 c 前缀
- **客户端两段式 UI**:同一页 segment 切「我的券 / 领券中心」

## 5. 验收基线

- AC1:可领取列表能拉到 admin 已发布的 ACTIVE 券
- AC2:领取后 user_coupon 写入 + remainStock -1;再领同张 422 ALREADY_CLAIMED
- AC3:库存 0 时领取 422 STOCK_DEPLETED
- AC4:我的优惠券页能按状态分 tab 展示
- AC5:点击入口能进入页面,默认显示"我的券"未使用 tab
- AC6:三个 c 端接口在 Customer-Token guard 下可用,无 token 401
- AC7:`pnpm typecheck` 通过、新增 spec 通过、迁移可执行
