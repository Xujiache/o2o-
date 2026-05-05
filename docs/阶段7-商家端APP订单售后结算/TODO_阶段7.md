# 阶段 7 — 商家端 APP 订单售后结算数据 · 待办事项(TODO)

> 阶段交付完成后必须由用户(运维 / 测试 / 业务负责人)手动触发的项目,自动化代码无法替代。

## P0 上线前必做(用户触发)

### 1. MySQL 真实数据库 migration

```bash
# 1. 启动 MySQL(或确认已启动)
docker compose -f deploy/docker-compose.dev.yml up -d mysql

# 2. 跑 stage 7 migration(增量,不影响 stage 0-6 已建表)
pnpm migrate:run

# 3. 跑 seed(stage 7 sys_config 4 条 + role-permission 6 条)
pnpm seed:run
```

校验:`SHOW TABLES LIKE '%after_sale%'` / `%merchant_settlement%` / `%merchant_withdrawal%` / `%review_reply%` 应有 7 张新表;`food_order` 表应有 `accepted_at / expected_ready_at / ready_at / reject_reason` 4 个新字段。

### 2. curl 接口冒烟(11 m 端 + 2 c 端 + 7 admin = 20 接口)

获取 token:

```bash
# 商家 token
pnpm token:dev merchant 30001

# 用户 token
pnpm token:dev customer 10001

# 平台 token
pnpm token:dev admin 40001
```

11 m 端核心:

```bash
curl -H "Merchant-Token: $M_TOKEN" http://localhost:3000/api/v1/m/food-orders/pending
curl -X POST -H "Merchant-Token: $M_TOKEN" http://localhost:3000/api/v1/m/food-orders/<orderId>/accept -d '{"expectedReadyMinutes":15}'
# ... reject / ready / after-sales / review / reviews/reply / statistics / settlements / withdrawals(GET/POST)
```

2 c 端补充:

```bash
curl -X POST -H "Customer-Token: $C_TOKEN" http://localhost:3000/api/v1/c/reviews -d '{"orderId":"...","rating":5}'
curl -X POST -H "Customer-Token: $C_TOKEN" http://localhost:3000/api/v1/c/after-sales -d '{"orderId":"...","type":"REFUND","reason":"...","amountCents":100}'
```

7 admin:

```bash
curl -H "Admin-Token: $A_TOKEN" http://localhost:3000/api/v1/admin/after-sales
curl -H "Admin-Token: $A_TOKEN" http://localhost:3000/api/v1/admin/settlements
curl -H "Admin-Token: $A_TOKEN" http://localhost:3000/api/v1/admin/withdrawals
curl -H "Admin-Token: $A_TOKEN" http://localhost:3000/api/v1/admin/merchant-statistics
# + 3 detail
```

## P1 真机/浏览器测试

### 3. customer-app 真机测试

```bash
pnpm dev:customer:h5
```

测试路径:

- 订单详情 → 点击"评价" → /pages/food/review/submit → 提交
- 订单详情 → 点击"申请售后" → /pages/food/order/after-sale-apply → 提交

### 4. merchant-app 真机测试(H5 模式)

```bash
pnpm dev:merchant
```

测试路径:

- 工作台 16 入口
- 待接单列表 → 接单 / 拒单
- 出餐确认
- 售后列表 → 详情 → APPROVE/REJECT
- 经营统计(日/周/月)
- 结算记录 / 详情
- 提现(实名 + 短信)
- 提现记录
- 数据导出(CSV 复制到剪贴板)
- 评价回复
- 个人中心 / 退出登录

### 5. admin-web 浏览器测试

```bash
pnpm dev:admin
```

打开 `http://localhost:5173/admin/after-sales` / `/admin/settlements` / `/admin/withdrawals` 三个新菜单,分别核对:

- 列表渲染 / 状态筛选 / storeId 筛选 / 分页
- 详情抽屉数据完整

## P2 待补强(本阶段记录,可分阶段处理)

- **P2-01 server jest 用例数边际差**:CONSENSUS § 1.4 目标 ≥698 用例,实际 689。**差 9**。stage 8 可补 e2e 集成测试做最终覆盖。
- **总用例数 -2**:CONSENSUS 目标合计 ≥886,实际 884。同前。

## P3 stage 11 真接入(已登记)

- **P3-01 push.adapter 真接入**:商家工作台语音 + 弹窗推送(stage 11 接 getui / 小米 / 华为 OEM)
- **P3-02 wxpay/alipay refund 真接入**:商家拒单 / 售后退款实退实付(本阶段仅 audit 记录 mock)
- **P3-03 实名认证 真接入**:商家提现走 realname.adapter.verify,而非简单读 merchant_account.account_status='active'
- **P3-04 sms 真接入**:订单接单/拒单通知用户、提现通知商家
- **P3-05 merchant-app 真机适配**:启动屏 / 推送 SDK / 离线缓存 / 性能优化(stage 11 真上线前)
- **P3-06 契约清单 v2**:本阶段 13 业务接口 + 7 admin 接口 = 20,超过契约清单原定 8 接口,需要在 stage 9 文档审查时补充契约清单 v2

## 配置确认

- **MERCHANT_WITHDRAWAL_LIMIT**:JSON `{"single":1000000,"daily":5000000}`(单笔 ¥10000 / 单日 ¥50000),如需调整通过平台后台 sys_config 修改
- **AFTER_SALE_WINDOW_DAYS**:7(订单 DELIVERED 后 7 天可申请售后)
- **MERCHANT_COMMISSION_RATE**:JSON `{"food":500}`(外卖 5% 佣金)
- **MERCHANT_PAYMENT_FEE_RATE**:60(0.6% 支付通道费)

如平台政策调整,通过 `/admin/system-config` 直接修改即可。
