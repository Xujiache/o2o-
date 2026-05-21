# TODO — 优惠券领取链路 待办

## P0 — 必须执行才能用上新功能

### 重启 server(我没有终止已运行进程的权限,需要你来做)

当前后端跑的是 `node dist/main`(prod 构建产物 PID 50276,端口 3000);新增的 c 端 controller 在 ts 源码里,需要重启后才会被 nest 路由表识别。

**方案 A — 推荐:dev watch 模式**(后续改动可热加载)

```powershell
# 1. 停掉当前 prod server
Stop-Process -Id 50276 -Force   # 或者你已知的 PID

# 2. 用 dev 模式重启(nest start --watch)
pnpm dev:server
```

**方案 B — 继续用 prod 构建**

```powershell
Stop-Process -Id 50276 -Force
pnpm --filter @o2o/server build
pnpm --filter @o2o/server start
```

## P1 — 冒烟验证(server 起来后)

获取一个 Customer-Token(开发期):

```powershell
pnpm --filter @o2o/server exec ts-node -P tsconfig.json src/database/run-dev-token.ts
```

冒烟三接口:

```powershell
# 1. 可领取列表
curl -H "Authorization: Bearer <Customer-Token>" `
     http://localhost:3000/api/v1/c/coupons/available

# 2. 领取(把 :couponRuleId 换成实际 id,可从上一步拿)
curl -X POST -H "Authorization: Bearer <Customer-Token>" `
     http://localhost:3000/api/v1/c/coupons/claim/901

# 3. 我的优惠券
curl -H "Authorization: Bearer <Customer-Token>" `
     http://localhost:3000/api/v1/c/coupons/my
```

如果数据库 `coupon_rule` 表是空的,可以先用 admin 接口发布一张:

```powershell
# 假设 ADMIN-Token 已有
curl -X POST -H "Authorization: Bearer <Admin-Token>" `
     -H "Content-Type: application/json" `
     -d '{"couponName":"满50减10","couponType":"AMOUNT","bizType":"FOOD","threshold":"5000","discount":"1000","totalStock":100,"validFrom":1715000000000,"validTo":1735689600000}' `
     http://localhost:3000/api/v1/admin/marketing/coupons
```

或在 admin-web 控制台发布。

## P2 — 客户端验证

刷新客户端 H5(http://localhost:8081/customer/),进入「我的」→ 点击「我的优惠券」:

- 默认显示「我的优惠券」segment,空列表显示「这里还没有优惠券,去领券中心看看 ›」
- 切到「领券中心」能看到刚发布的券,点「领取」→ toast「领取成功」+ 按钮变「已领取」
- 切回「我的优惠券」能看到刚领的券,在效期内显示「未使用」徽章

## P3 — 后续 wave 可补

| 项                     | 状态 / 说明                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ~~下单抵扣~~           | ✅ wave2 已完成                                                                                                            |
| 跑腿订单抵扣           | 本波只做 FOOD;ERRAND preview/submit/cancel 同模式接入即可                                                                  |
| 过期 cron              | 想要 DB 状态准确而非运行时计算,可补一个 daily job 把 `UNUSED + valid_to < now` 改成 EXPIRED                                |
| 折扣类型 DISCOUNT 校验 | 当前 marketing 发布只校验是 AMOUNT/DISCOUNT,没有限制 `discount` 范围;若需要严格 ‰ 范围(0–1000),在 admin DTO 加 `@Min/@Max` |
| 推荐位                 | 领券中心目前是平铺所有 ACTIVE 券,后续按 bizType 或店铺关联做运营位推荐                                                     |
| 实体单测覆盖           | service 测试已覆盖核心分支;e2e 测试可后续在 stage 11 联调时补一个 supertest 用例                                           |
| 下单页主动提示         | 进 confirm 页时主动 toast"你有 X 张可用券",目前只在用户点击时加载                                                          |
