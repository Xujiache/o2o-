# FINAL — 生鲜商城与溯源 交付报告

> 任务名:生鲜商城与溯源
> 起止:2026-05-13 → 2026-05-14
> 模式:6A 流程(Align→Architect→Atomize→Approve→Automate→Assess)
> 跑腿/rider-app 零改动;外卖路由 410 软下线 + 旧表 90 天归档窗口

---

## 一、交付概览

### 一句话总结

将既有"外卖点餐 + 骑手配送"整体替换为"生鲜商城 + 到店自提",并新增带防伪签名的商品溯源能力,完整覆盖四端 UI + 后端 + 数据迁移 + 权限种子。

### 数字

| 维度               | 数量                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| 新增/修改 entity   | 9 新 + 5 改(product/cart_item/coupon_rule/payment_order/refund_order)                                    |
| 新增 migration     | 2                                                                                                        |
| 新增后端模块       | 7(pickup-point / grocery-product / grocery-order / pickup-verify / grocery-weigh / trace + payment 扩展) |
| 新增 Scheduler Job | 1(grocery-order-expire)                                                                                  |
| 新增 API 端点      | 35+                                                                                                      |
| 新增前端页面       | customer-app 10+ / merchant-app 9 / admin-web 7                                                          |
| 新增权限点         | 5(admin:menu:trace + 4 button)                                                                           |
| 新增 Jest spec     | 4(grocery-order / grocery-weigh / pickup-verify / trace)                                                 |
| 文档输出           | 5(ALIGNMENT/CONSENSUS/DESIGN/TASK/TODO/ACCEPTANCE/FINAL)                                                 |
| Git commits        | 3(后端 + UI + Wave7 收尾)                                                                                |

---

## 二、关键设计决策回顾

### 2.1 不变量(贯穿全程)

- **金额 bigint 分;时间 bigint ms** — 与项目既有约定 100% 一致
- **库存沿用 stock_lock + DB 事务** — 不引入 Redis Lua,降低心智负担
- **payment FOOD/ERRAND 既有分支不动** — 仅追加 GROCERY case
- **跑腿与 rider-app 零改动** — git diff 可证

### 2.2 业务规则

- 商品双模式:fixed(份)/ weighed(斤,服务端按 g/500 算分)
- 称重结算:**预估预付 + 多退少补**;±10% 浮动免打扰,超额自动退款 / 客户扫码补付
- 提货码 6 位明文 + sha256(code+salt) 入库;详情仅本人返回明文
- 溯源 HMAC-SHA256 短签 16chr 入 URL,匿名可访问 + 同 IP 30/min 限流
- 自提点独立表;每个商户 N 个自提点;时段商家完全自定义

### 2.3 隔离与回滚

- 物理隔离:grocery_order vs food_order vs errand_order 三套主表
- 路由隔离:`/c/grocery/*` `/m/pickup/*` `/admin/trace/*` `/c/trace/*`
- 旧外卖路由 410(可通过 `FOOD_ROUTES_GONE=false` 临时回滚)
- 旧外卖表 90 天归档窗口(deploy/sql/rename-food-tables.sql 含回滚 SQL)

---

## 三、用户视角的"能做什么"

### 客户(顾客)

1. 进入"生鲜商城",浏览商品,加购物车
2. 散装称重商品输入预估克数(如 500g),系统按 单价 × g/500 算分
3. 选自提点 + 提货时段,试算预付
4. 到店出示 6 位提货码或 QR 给店员核销
5. 店员称重后,实际金额比预付浮动 ≤10% 自动通过;若多了在小程序补付;若少了原路退款
6. 收到货后可评价(复用现有 OrderReview)
7. 扫一扫包装上的二维码 → 看到完整产地/批次/检测报告/流转链路

### 商家

1. 在"商城"Tab 上传商品(定价或称重),配置自提点 + 7 天时段
2. 工作台一眼看到今日待发货 / 待核销 / 已核销
3. 顾客到店:扫码或手输 6 位码核销 → 称重 → 确认结算
4. 三路自动分流:无差额直接出货 / 少退给客户 / 多需客户补付(等待页轮询)
5. 备货页按时段聚合,看本店今日需要备多少 SKU

### 平台运营(admin)

1. 进入"溯源中心",建立批次(关联生鲜商品 + 数量 + 生产日期 + 供应商)
2. 一键异步生成 N 个唯一二维码,实时看进度
3. 下载 CSV 索引(qr_code + short_sig + URL),批量出 PNG 贴包装
4. 用扫码枪定位单个 QR,逐节点录入产地/加工/检测/仓储/物流(支持附件)
5. 看批次扫码统计,识别异常流量

### 骑手

零改动。跑腿一切照旧。

---

## 四、技术亮点

1. **HMAC 短签防伪**:服务端 SECRET 仅 .env 不入库;URL 中 sig 截前 16chr,等量信息空间足够防爬而不暴露完整签名
2. **双阶段支付状态机**:同一 payment_order callback 自动识别主单 vs 差价,无需额外字段
3. **称重容差结算**:±10% 浮动免打扰,既保护商家口碑也避免频繁催客户补几毛钱
4. **redis preview snapshot**:试算单 5min TTL,服务端价格重算后再提交,前端价格仅用于显示,从根上断后端价被前端篡改路径
5. **lint-staged + prettier auto-commit**:保证 commit 前自动格式化、零 ESLint 警告

---

## 五、剩余技术债与建议

| #   | 项                                                 | 严重度 | 建议处理时机                                                  |
| --- | -------------------------------------------------- | ------ | ------------------------------------------------------------- |
| 1   | 二维码 PNG 暂未后端打 ZIP,仅 CSV 索引;商家自己出图 | 低     | 装 qrcode+archiver 后启用,后台 1 行调用                       |
| 2   | 优惠券对生鲜的折扣 preview 计算未接入              | 中     | 抽 coupon-customer.service 公共方法挪入 grocery-order.preview |
| 3   | 称重物品到店后店员收银台必须有秤具                 | 业务流 | 不属于代码;运营培训                                           |
| 4   | 商家端"商城订单列表"暂用核销流水聚合               | 中     | 补一个 `m/grocery/orders` 后端接口提升精度                    |
| 5   | 自提点距离排序为内存计算                           | 低     | 单城市规模可承受,数十万自提点后改 MySQL SPATIAL               |
| 6   | 平台 admin 视角的商品/订单管理未做                 | 中     | 后台运营手动维护商家数据;后续若有平台直营再做                 |

---

## 六、用户立即可做的事

```bash
# 1. 配 .env
echo "PICKUP_CODE_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
echo "TRACE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# 2. 跑迁移
cd apps/server && pnpm typeorm migration:run

# 3. 启动后端 + 各端,验证 demo
pnpm -F server dev
pnpm -F customer-app dev:h5
pnpm -F merchant-app dev:h5
pnpm -F admin-web dev

# 4. 临时回滚外卖 410(开发期需要旧外卖 e2e 时)
# 在 .env 加 FOOD_ROUTES_GONE=false

# 5. 90 天后归档外卖旧表
mysql -u root -p o2o < deploy/sql/rename-food-tables.sql
```

---

## 七、致谢与署名

实现:Claude Opus 4.7 + 3 个 sub-agent(customer / merchant / admin)
约定遵循:CLAUDE.md 全局规则 + 项目阶段规划/ 各阶段交付清单
共审:用户(wlwj54188@gmail.com)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
