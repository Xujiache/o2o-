# 阶段 8 — 骑手端 APP 调度轨迹收益考核 · 共识文档(CONSENSUS)

> 锁定 ALIGNMENT 阶段所有结论,本阶段后续 DESIGN / TASK / 编码均以本文为准。

## 1. 锁定的需求范围

### 1.1 后端

- **8 业务模块**(其中 rider-location stage 3 已建,本阶段扩展)
  - dispatch
  - rider-task
  - rider-location(扩 batch 上传/心跳)
  - track
  - rider-earning
  - rider-withdrawal
  - rider-assessment
  - violation
- **2 admin 监控模块**:admin-dispatch / admin-track-replay
- **8 数据表**(rider_location 已建,本阶段扩 + 7 新表)
  - dispatch_task
  - rider_task
  - track_point
  - rider_earning
  - rider_withdrawal
  - rider_assessment
  - rider_violation
  - rider_location(扩字段)
- **7 领域事件**
  - DispatchStarted
  - RiderTaskAccepted
  - RiderArrivedPickup
  - RiderPickedUp
  - RiderDelivered
  - RiderExceptionReported
  - RiderEarningGenerated
- **5 新 jobs + 1 复用**
  - 复用 stage 3 `rider-heartbeat-timeout-offline.job`
  - 新建:dispatch-timeout-retry / track-compress / delivery-timeout-mark / rider-earning-daily-settle / rider-violation-deduct
- **7 r/\* 核心接口** + **4 补充**(GET /r/withdrawals / GET /r/assessment / GET /r/violations / GET /r/tasks/{id} 详情)= **11**
- **4 admin/\* 监控接口**:GET /admin/dispatch-tasks / GET /admin/dispatch-tasks/{id} / GET /admin/track-replay / GET /admin/violations

  合计 **15 接口**(7 r 端核心 + 4 r 端补充 + 4 admin 监控)。

### 1.2 前端

- **rider-app** 15 新页(注册到 pages.json)
  - workbench/index(增强:今日任务/今日收益/快捷入口)
  - dispatch-modal(组件,非独立路由)
  - tasks/hall(接单大厅)
  - tasks/current(当前任务)
  - tasks/pickup-food(外卖取货核验)
  - tasks/pickup-errand(跑腿取件核验)
  - tasks/navigate(导航页)
  - tasks/delivering(配送中)
  - tasks/delivered(送达确认)
  - tasks/exception(异常报备)
  - earnings/index(收益中心)
  - withdrawals/form(提现)
  - withdrawals/records(提现记录)
  - assessment/index(考核中心:准时/接单/投诉/评分/榜单/奖励)
  - violations/index(违规记录)
- **customer-app** 现有 track 页 2 个扩展(累计页面数不变)
  - pages/food/order/track.vue 加骑手位置/轨迹折线/异常提示
  - pages/errand/order/track/index.vue 加骑手位置/轨迹折线/异常提示
- **admin-web** 2 新增页(累计 21 → 23)
  - views/dispatch/index.vue(调度监控 + 详情抽屉)
  - views/track-replay/index.vue(轨迹回放页)
  - 同时新增 violations 列表(纳入既有 admin-web 菜单 stage 9 仲裁,本阶段做只读)

### 1.3 权限点(累计 +5)

- rider:task:own-or-available(已存,沿用)
- admin:menu:dispatch / admin:dispatch:view
- admin:menu:track-replay / admin:track-replay:view
- admin:menu:violations / admin:violations:view

### 1.4 测试目标

| 套件                | stage 7 末               | stage 8 末目标 | 增量                |
| ------------------- | ------------------------ | -------------- | ------------------- |
| server jest         | 689 / 93s                | ≥780 / ≥110s   | ≥+91                |
| customer-app vitest | 64 / 22s                 | ≥69 / ≥24s     | ≥+5(扩展轨迹页测试) |
| rider-app vitest    | 0 / 0s(stage 3 已建基建) | ≥45 / ≥10s     | ≥+45                |
| admin-web vitest    | 80 / 29s                 | ≥90 / ≥31s     | ≥+10                |
| **合计**            | **833**                  | **≥984**       | **≥+151**           |

## 2. 验收标准

### 2.1 功能验收

- [ ] dispatch job 扫 food_order READY_FOR_PICKUP / errand_task PENDING → 创 dispatch_task → 推送骑手 → emit DispatchStarted。
- [ ] 骑手在线时,接单大厅可见可接任务;离线时大厅返回空。
- [ ] 骑手 accept → 创 rider_task + food_order/errand_task 状态推进 → emit RiderTaskAccepted。
- [ ] arrive-pickup → rider_task.status PICKED_UP_PENDING → emit RiderArrivedPickup。
- [ ] pickup → rider_task.status PICKED_UP + food_order.status PICKED_UP → emit RiderPickedUp。
- [ ] delivered → rider_task.status DELIVERED + food_order.status DELIVERED → emit RiderDelivered。
- [ ] exception 上报 → 写 rider_violation + emit RiderExceptionReported,platformHandleRequired=true 转 stage 9。
- [ ] GET /r/earnings 聚合骑手收益(总收入 + 订单数 + 奖励 + 扣款)。
- [ ] POST /r/withdrawals 实名 + 限额 + sms 校验,与 stage 7 商家提现套路一致。
- [ ] T+1 收益日结 job 生成 rider_earning 日级行 + emit RiderEarningGenerated。
- [ ] 违规扣款 job 处理已仲裁的 violation → 扣 rider_earning。
- [ ] customer-app 轨迹页可见骑手实时位置 + 历史轨迹折线 + 异常提示。
- [ ] admin-web /admin/dispatch 可见派单流水 + 详情;/admin/track-replay 可回放任意 rider_task 的轨迹。

### 2.2 接口验收

- [ ] 11 r/_ 接口 + 4 admin/_ 监控接口符合契约。
- [ ] 写接口全部 @Idempotent + @Audit。
- [ ] 数据归属:rider 只能访问自己的 task / earning / withdrawal / assessment / violation。

### 2.3 数据验收

- [ ] 7 张新表 entity + Stage8Init.ts migration 建表通过(rider_location 扩 device_token / online_at 字段)。
- [ ] sys_config seed:`rider.withdrawal.limit` / `rider.earning.formula` / `rider.assessment.thresholds` 等 ≥3 条。
- [ ] sys_permission +5 条 + AUDITOR 绑定。

### 2.4 测试验收

- [ ] 见 § 1.4 目标用例数。
- [ ] 关键路径 100% 覆盖:dispatch / accept / arrive-pickup / pickup / delivered / exception / earnings 聚合 / withdrawal / 5 jobs。

### 2.5 文档验收

- [ ] ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE/FINAL/TODO 7 文档齐全。
- [ ] 项目阶段规划/08-.../手动审查与测试.md 自动可填项填齐。
- [ ] 项目阶段规划/08-.../问题与风险记录.md 列 P3 项 ≥4(amap / wxpay / 推送语音 / merchant-app 轨迹细化)。
- [ ] 阶段交付清单全部勾选(P0/P1 清零 + 边界复核)。

## 3. 任务边界

### 3.1 本阶段做

- 8 模块 + 8 表(7 新 + 1 扩) + 7 events + 5 jobs + 15 接口 + rider-app 15 页 + customer-app 2 页扩展 + admin-web 2 页。

### 3.2 本阶段不做

- 商家 Web/小程序(按规划禁止)。
- 真 amap key 配置 / 真 wxpay 提现到账(stage 11)。
- 平台主动仲裁(stage 9)。
- 骑手新人奖励 / 跨区调度 / 骑手分级(规划未列,stage 9-10 配)。
- 真 push 推送语音/弹窗(stage 11)。
- merchant-app 查看骑手轨迹的细化 UI(规划只说"商家端同步出餐",不要求骑手位置可视化,本阶段不做)。

## 4. 技术约束

- NestJS 10 + TypeORM,所有时间 BIGINT 毫秒,所有金额 BIGINT 分。
- 装饰器 `@Idempotent({ttlSeconds:60}) + @Audit + @RequirePermission('rider:self')`。
- 事件总线 DomainEventBus,subscriber 走 audit + push/sms。
- jobs 用 BaseJob + DistributedLockService。
- rider-app:Vue3 + uni-app + Pinia(stage 3 已建)。
- customer-app:扩 stage 5/6 既有套路。
- admin-web:Vue3 + ElementPlus + Pinia(stage 4)。

## 5. 风险登记

| 风险                                                         | 等级 | 处理                                                                         |
| ------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------- |
| food_order/errand_task 状态机扩展可能影响 stage 5/6/7 老测试 | 高   | rider-task service 调用 stage 5/6 既有 service 方法(不直接改状态机),向前兼容 |
| dispatch 算法的智能派单未明确(就近/评分?)                    | 中   | 本阶段简化为"按 service-area 内在线骑手第一个可派",真智能调度 stage 11 接    |
| rider 收益公式复杂(基础酬劳 + 距离 + 时效 - 扣款)            | 中   | 走 sys_config rider.earning.formula JSON,seed 默认值,服务端按公式计算        |
| 真 amap 路线 → 真 GPS 上报 → 真路线展示                      | 高   | P3 登记 stage 11 接,本阶段保持 mock(返回点位列表)                            |

## 6. 一致同意

- A1-A10 全部按推荐项。
- 4 GET 补充接口在 问题与风险记录 P3 登记。
- 48 → 55 EventName(+7)。
- 4 闸门必绿。
