# 阶段 2 — 商家端 APP 入驻店铺与商品管理 · 验收文档(ACCEPTANCE)

> 商家端仅 Android APP / iOS APP,禁止规划商家 Web 后台、商家小程序。

## 阶段范围

- 后端 7 模块 + 1 公开只读模块 + 1 实名 adapter 扩展(共 9 个模块改动)
- 11 张 MySQL 业务表
- 25 个 HTTP 接口(商家 16 + 平台 4 + 公开 3 + 商家 auth 4 - 部分重叠)
- 6 个领域事件(domain.{merchant,store,product,stock}.\*)
- 5 个定时任务(license-expiry / stock-alert / promo-start / promo-end / sold-out)
- 5 个新权限点(merchant:public/store:own + admin:menu/view/manage:merchants)
- 11 个商家 APP 页面(login×2 + onboarding×2 + workbench + store×3 + products×3 + stock + promotions×2)
- 4 个平台 Web 页面(audit + detail + stores + AuditDialog)

## 任务完成度

| Wave | 任务                                    | 状态 | 关键产出                                                                       |
| ---- | --------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| 1    | T01 11 表 entity + migration + 5 权限点 | ✓    | 11 entity + Stage2Init.ts + role-permission.seed 扩展                          |
| 1    | T02 realname.adapter + FileBizType      | ✓    | verifyEnterprise() + 3 新 bizType                                              |
| 2    | T03 merchant-auth                       | ✓    | 4 接口 + Redis refresh + jti 黑名单                                            |
| 2    | T04 merchant-onboarding                 | ✓    | submit + status + 3 表事务 + verifyEnterprise mock                             |
| 2    | T05 store                               | ✓    | 3 接口 + GeoJSON 校验 + paused 屏蔽商家                                        |
| 2    | T06 product                             | ✓    | 9 接口(categories CRUD + products CRUD + sale-status + batch)                  |
| 2    | T07 stock                               | ✓    | adjust(TX 流水) + 售罄置 sold_out + StockLow 事件                              |
| 2    | T08 merchant-promotion                  | ✓    | 3 接口 + 状态机转换 + productIds 重叠校验                                      |
| 2    | T09 admin-merchant                      | ✓    | 5 接口 + audit 幂等 + 全字段 @Mask                                             |
| 3    | T10 5 定时任务                          | ✓    | 全注册 + scheduler.module 修复 stage 1 latent                                  |
| 3    | T11 6 事件 + 4 订阅器                   | ✓    | MerchantApprovedSubscriber 自动建店事务                                        |
| 4    | T12 商家 APP login + auth store         | ✓    | Pinia + 401 refresh + build:app only                                           |
| 4    | T13 商家 APP 入驻 2 页                  | ✓    | apply + progress + UploadField                                                 |
| 4    | T14 商家 APP 店铺 3 页                  | ✓    | settings + business-status + delivery-area                                     |
| 4    | T15 商家 APP 商品 3 页                  | ✓    | categories + list + edit(SKU)                                                  |
| 4    | T16 商家 APP 库存预警 1 页              | ✓    | alerts + 阈值编辑                                                              |
| 4    | T17 商家 APP 促销 2 页                  | ✓    | list + edit(限时/满减)                                                         |
| 5    | T18 平台 Web 商家审核                   | ✓    | audit + detail + stores + AuditDialog + LicensePreview + admin-web router 修复 |
| 6    | T19 公开 store/product 3 接口           | ✓    | online + active 商家过滤 + on_shelf 商品过滤                                   |
| 6    | T20 后端 jest ≥80                       | ✓    | 31 suite / 194 测试 / stage 2 净增 86                                          |
| 6    | T21 前端 vitest ≥30                     | ✓    | merchant 21 + admin 15 + customer 25 / stage 2 净增 30                         |
| 6    | T22 公开接口冒烟                        | ✓    | customer-app/api/public-stores.spec 4 用例                                     |
| 6    | T23 手动审查                            | ✓    | 项目阶段规划/02-.../手动审查与测试.md P0/P1/P2=0                               |
| 6    | T24 ACCEPTANCE                          | ✓    | 本文                                                                           |

## 验收标准(20 条)

1. **AC-01**:11 张表 migration 与 entity 就位 — `apps/server/src/database/migrations/1714867400000-Stage2Init.ts`;`pnpm --filter @o2o/server build` 通过。
2. **AC-02**:商家 7 模块 + 公开 1 模块上线 — 全部在 `apps/server/src/modules/` + 注册到 `app.module.ts`。
3. **AC-03**:25 接口路径与 DESIGN § 4 一致 — 见 `apps/merchant-app/src/api/index.ts:Endpoints` + `apps/admin-web/src/api/admin-merchants.ts`。
4. **AC-04**:端隔离 — `merchant-auth.cross-scope.spec.ts` 6 用例通过。
5. **AC-05**:自动建店事务 — `MerchantApprovedSubscriber` 用 `dataSource.transaction` 包 INSERT store + INSERT 默认 product_category + UPDATE merchant.approved_store_id;幂等。
6. **AC-06**:6 事件 `domain.{merchant,store,product,stock}.*` 前缀 — `events.stage2.spec.ts` 验证;Object.values(EventName) 共 16 个。
7. **AC-07**:5 任务可手动触发 — scheduler.controller.ts 注册 13 jobs(stage 0/1/2 全部)。
8. **AC-08**:售罄自动下架 — stock.adjust + SoldOutAutoOffShelfJob 兜底。
9. **AC-09**:限时折扣价格回滚 — promo-start/end TX 改 product.price + original_price;active promo 内禁改价(STATUS_INVALID)。
10. **AC-10**:平台审核流程 — POST /admin/merchants/:id/audit + 通过时发 MerchantApproved 事件 + 订阅器自动建店。
11. **AC-11**:商家端字段全 @Mask — admin-merchant 详情接口 legalPersonMasked / idCardMasked / licenseNoMasked / mobileMasked。
12. **AC-12**:商家 APP 11 页交付 — pages.json 注册 11 路由;`pnpm --filter @o2o/merchant-app build` 通过(uni build -p app)。
13. **AC-13**:Pinia auth store 复用 stage 1 模式 — refresh / logout / 60s 倒计时持久化。
14. **AC-14**:商家 APP build 仅 app — package.json `build` 与 `build:app` 一致;无 build:h5 / build:mp。
15. **AC-15**:平台 Web 商家审核 4 页 + AuditDialog 弹窗 — admin-web router 注册 3 路由;v-permission 控按钮显隐。
16. **AC-16**:`admin:merchants:manage` 控制审核按钮 — `userStore.has('admin:merchants:manage')` v-if;AUDITOR 看不到审核按钮。
17. **AC-17**:后端 jest 净增 ≥ 80 — stage 2 加 86 测试(108 → 194)。
18. **AC-18**:前端 vitest 净增 ≥ 30 — stage 2 加 30 测试(merchant +19 + admin +7 + customer +4)。
19. **AC-19**:全 monorepo `pnpm -r build / test / lint` 全绿;`git status` 干净。
20. **AC-20**:`项目阶段规划/02-.../手动审查与测试.md` P0/P1/P2 = 0。

## 自审记录(每 T 6 项)

| T       | 不漏项                                         | 不多做                             | 可独立验证                             | 依赖闭环              | 回归 stage 0/1                                            | 备注                                           |
| ------- | ---------------------------------------------- | ---------------------------------- | -------------------------------------- | --------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| T01     | ✓ 11 entity + 5 权限点                         | ✓                                  | ✓ build 通过                           | ✓ 无依赖              | ✓                                                         | bigint 时间戳沿用 stage 0/1                    |
| T02     | ✓ verifyEnterprise + 3 bizType                 | ✓ 不新建 ali-enterprise(per D-2)   | ✓ 14 测试                              | ✓ T01                 | ✓                                                         | mock licenseNo 18 + 法人首字汉字               |
| T03     | ✓ 4 接口 + jti 黑名单                          | ✓ 无自动注册                       | ✓ 7 用例                               | ✓ T01+T02             | ✓ scope-jwt 不退化                                        | Redis 存 refresh hash                          |
| T04     | ✓ submit + status + 5 license 行               | ✓                                  | ✓ 8 用例                               | ✓ T01+T02+T03         | ✓                                                         | 异步 verifyEnterprise + 重提规则               |
| T05     | ✓ 3 接口 + GeoJSON                             | ✓ paused 商家不可改                | ✓ 7 用例                               | ✓ T01+T04             | ✓                                                         | forceSetStatus 给 admin 复用                   |
| T06     | ✓ 9 接口                                       | ✓ 无 DELETE products               | ✓ 12 用例                              | ✓ T01+T05             | ✓                                                         | SKU 聚合 + active promo 拒改价                 |
| T07     | ✓ adjust + alerts + threshold                  | ✓ 内部 service                     | ✓ 7 用例                               | ✓ T01+T06             | ✓                                                         | 售罄自动 sold_out + StockLow                   |
| T08     | ✓ 3 接口 + 状态机                              | ✓ 不实现下单时算优惠               | ✓ 8 用例                               | ✓ T01+T06             | ✓                                                         | productIds 重叠校验                            |
| T09     | ✓ 5 接口 + audit 幂等                          | ✓ 不接佣金阶梯                     | ✓ 7 用例                               | ✓ T01+T04+T05         | ✓                                                         | 全字段 @Mask                                   |
| T10     | ✓ 5 jobs + 注册                                | ✓ 锁 key 与 DESIGN § 8             | ✓ 8 用例                               | ✓ T05+T06+T07+T08     | ✓ stage 0/1 jobs                                          | 修复 stage 1 latent(scheduler.module 同步注册) |
| T11     | ✓ 6 EventName + 4 订阅器                       | ✓ ProductCreated/OnSale 不写订阅器 | ✓ 5 + 2 用例                           | ✓ T04+T05+T06+T07+T09 | ✓                                                         | MerchantApprovedSubscriber 是关键事务          |
| T12     | ✓ login 2 页 + auth store + build 配置         | ✓ 不接 H5 build                    | ✓ 19 用例                              | ✓ T03                 | ✓                                                         | pinia 加入 deps                                |
| T13     | ✓ apply + progress + UploadField               | ✓ 多步表单                         | ✓ build 通过                           | ✓ T04 + T12           | ✓                                                         | bizType 参数化                                 |
| T14     | ✓ settings + business-status + delivery-area   | ✓ paused 提示                      | ✓ build 通过                           | ✓ T05 + T12           | ✓                                                         | delivery-area 占位 JSON 文本编辑               |
| T15     | ✓ categories + list + edit + SKU 编辑          | ✓                                  | ✓ build 通过                           | ✓ T06 + T12           | ✓                                                         | 批量上下架                                     |
| T16     | ✓ alerts + 阈值                                | ✓                                  | ✓ build 通过                           | ✓ T07 + T12           | ✓                                                         | 列表 + 内联编辑                                |
| T17     | ✓ list + edit                                  | ✓ 不实现优惠下单                   | ✓ build 通过                           | ✓ T08 + T12           | ✓                                                         | 限时/满减切换                                  |
| T18     | ✓ 3 页 + AuditDialog + LicensePreview + 3 路由 | ✓                                  | ✓ admin-web build 11.47s               | ✓ T09                 | ✓ admin-web stage 0/1 不退化 + 修复 stage 1 router latent |
| T19     | ✓ 3 公开接口                                   | ✓ 无 UI 出货                       | ✓ 5 用例                               | ✓ T05+T06             | ✓                                                         | 过滤 online + active 商家;商品过滤 on_shelf    |
| T20     | ✓ 86 净增测试                                  | ✓                                  | ✓ 31 suite 全绿                        | ✓ T03~T11+T19         | ✓ stage 0/1                                               | 含 cross-scope 6 + events.stage2 2             |
| T21     | ✓ 30 净增 vitest                               | ✓                                  | ✓ merchant 23 + admin 15 + customer 25 | ✓ T12~T18             | ✓ stage 0/1                                               | merchant store 13 用例                         |
| T22     | ✓ 4 公开冒烟                                   | ✓ 不写 fetch 实现                  | ✓ customer-app build                   | ✓ T19                 | ✓                                                         | path 校验                                      |
| T23     | ✓ 8 节填写                                     | ✓ 不擅自标"通过"                   | ✓ P0/P1/P2=0                           | ✓ T20+T21+T22         | —                                                         | 4 项 P3 全为后续阶段预留                       |
| T24~T26 | (本文 + FINAL + TODO)                          | ✓ stage 1 同款格式                 | ✓                                      | ✓ T23                 | —                                                         | git status 干净                                |

## Replay 命令(留给 stage 3 回放)

```pwsh
# 1. 准备数据库(MySQL 3307)+ 跑迁移
$env:MYSQL_PORT="3307"
pnpm --filter @o2o/server migrate:run
pnpm --filter @o2o/server seed:run

# 2. 全量构建 + 测试
pnpm -r build
pnpm -r test

# 3. 启动 server dev
pnpm --filter @o2o/server dev

# 4. 启动平台 Web(单独终端)
pnpm --filter @o2o/admin-web dev

# 5. 启动商家 APP(单独终端,uni dev)
pnpm --filter @o2o/merchant-app dev:app
# (HBuilderX 打开 dist/dev/app 真机调试,或用 Android 模拟器)

# 6. 商家入驻冒烟
$BASE = "http://127.0.0.1:3000"
$IDEM = [guid]::NewGuid()
$MOBILE = "13900000001"

# sms-code → 看后端日志取 mock code
curl.exe -X POST "$BASE/api/v1/m/auth/sms-code" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" -d "{\"mobile\":\"$MOBILE\",\"scene\":\"login\"}"

# 提交入驻申请(需先用 /pub/files/upload 上传 5+ 文件拿 fileId)
curl.exe -X POST "$BASE/api/v1/m/onboarding/applications" `
  -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"mobile":"...","smsCode":"...","licenseFileId":"...",...}'

# 用商家 token 调 admin → FORBIDDEN
$T = (curl.exe ... | ConvertFrom-Json).data.merchantToken
curl.exe "$BASE/api/v1/admin/merchants/applications" -H "Merchant-Token: $T"
# 期望:{code:"FORBIDDEN", ...}

# 7. 平台审核冒烟
$ADMIN_T = (..)  # 用 stage 0 的 token:dev 脚本拿
curl.exe -X POST "$BASE/api/v1/admin/merchants/100/audit" `
  -H "Admin-Token: $ADMIN_T" -H "Idempotency-Key: $([guid]::NewGuid())" `
  -d '{"auditResult":"approved","commissionRate":0.05}'

# 8. dev 触发定时任务
curl.exe -X POST "$BASE/api/v1/admin/scheduler/trigger/promo-start" -H "Admin-Token: $ADMIN_T"
```

## 验收结论

**有条件通过** — 代码 / 单测 / 构建全绿;真机 / 真接口冒烟留人工(MySQL+Redis 跑迁移、curl 25 接口、admin-web 浏览器抽测、商家 APP HBuilderX 真机)。
