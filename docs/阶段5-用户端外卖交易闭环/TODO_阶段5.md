# 阶段 5 — 用户端外卖交易闭环 · 待办与缺失配置(TODO)

## 1. 必做(进入 stage 6 前由人工抽测确认)

- [ ] **MySQL migration + seed**:`MYSQL_PORT=3307 pnpm --filter @o2o/server migrate:run && pnpm --filter @o2o/server seed:run`
  - 验证 9 张新表(food_order / food_order_item / cart_item / order_price_snapshot / payment_order / coupon_lock / stock_lock / order_timeline / order_review)
  - 验证 product_sku.stock_locked 列(ALTER 已落库)
  - role-permission seed 验证 +admin:menu:food-orders + admin:food-orders:view 已就位
- [ ] **curl 17 接口冒烟**:按 ACCEPTANCE\_阶段5.md § 4 PowerShell 命令逐条跑
- [ ] **customer-app 真机 / H5 抽测**:`pnpm --filter @o2o/customer-app dev:h5` 或 HBuilderX 真机
  - 主流程:首页 → 店铺 → 加车 → 试算 → 提交 → 支付(mock) → 详情 → 取消 / 评价
  - 跨店切换提示
  - 售罄置灰
  - 倒计时显示(WAIT_PAY 订单)
- [ ] **admin-web 浏览器抽测**:`pnpm --filter @o2o/admin-web dev`
  - super_admin 登录 → 进 /admin/food-orders → 验证 5 张统计卡 + 列表筛选 + 详情抽屉 timeline
- [ ] **测试套全绿**:`pnpm -r test`(server 510 + admin-web 62 + customer-app 49 + merchant-app 21 + rider-app 28)

## 2. 缺失配置 / 环境变量

- [ ] `apps/server/.env`:
  - `INTEGRATION_MODE=mock`(stage 5 wxpay/alipay 仍为 mock,真接 stage 8)
  - `GATEWAY_PUBLIC_BASE_URL=http://127.0.0.1:3000`(payment.notifyUrl 拼接基址)
  - 真接生产时设:`WXPAY_APP_ID / WXPAY_MCH_ID / WXPAY_API_V3_KEY / ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY`

## 3. 可选(stage 6+ 跟进)

- [ ] **P3-01 真实路径渲染**(stage 8):接高德地图 polygon + 路线规划,替换 track-query 简化骨架
- [ ] **P3-02 wxpay/alipay Real adapter**(stage 8):真验签 SDK + 沙箱凭证;parseCallback 真解析
- [ ] **P3-03 rider-task-pool 接单**(stage 8):新增接单 / 取餐 / 送达接口 + 状态机推进
- [ ] **P3-04 sms 真用户 mobile**(stage 11):food-order-paid.subscriber 改为查 customer_user.mobile

## 4. 端隔离回归

- [x] stage 1-3 cross-scope.spec 已覆盖 c/m/r/admin 4 端;stage 5 c 端接口走 CustomerJwtGuard,callback 走 @Public,admin 走 AdminJwtGuard,不破坏既有隔离
- [ ] 加新 admin 接口 / m 端接口时,必须 `@UseGuards(AdminJwtGuard / MerchantJwtGuard, PermissionGuard)`,不能漏

## 5. 文档同步

- [x] `项目阶段规划/05-阶段5-.../手动审查与测试.md` 已填证据
- [x] `项目阶段规划/05-阶段5-.../问题与风险记录.md` P0/P1=0 + P3 4 项延后
- [x] `docs/阶段5-用户端外卖交易闭环/{ALIGNMENT,CONSENSUS,DESIGN,TASK,ACCEPTANCE,FINAL,TODO}_阶段5.md` 全部就位
