# 阶段 8 — 骑手端 APP 调度轨迹收益考核 · 对齐文档(ALIGNMENT)

> 6A 流程 "Align" 阶段:模糊需求 → 精确规范。基线为 `项目阶段规划/08-阶段8-骑手端APP-调度轨迹收益考核/` 9 份规划文档。

## 1. 项目上下文(stage 0-7 已完成基线)

| 维度         | 数值                                      |
| ------------ | ----------------------------------------- |
| 后端 modules | 65                                        |
| 数据表       | 66                                        |
| HTTP 接口    | 117                                       |
| EventName    | 48                                        |
| 事件订阅器   | 41                                        |
| 定时任务     | 31                                        |
| 后端 jest    | 689                                       |
| 前端 vitest  | 195(customer 64 + merchant 51 + admin 80) |
| commit       | 37(初始 ~ ce1c958)                        |

### 已落地的相关基础设施

- `apps/rider-app/`:uni-app + Vue3 + Pinia(stage 3),pages.json 注册 8 页(launch/login/login-verify/onboarding(2)/permission/profile/tasks/available/workbench)。
- `rider-account / rider-application / rider-certificate / rider-vehicle / rider-service-area / rider-status / rider-location / rider-audit-log` 8 张表(stage 3)。
- `rider-auth / rider-onboarding / rider-profile / rider-location` 4 模块(stage 3)。
- `rider-task-pool` 模块(stage 5/6)— GET /api/v1/r/tasks/available(扫描 food_order READY_FOR_PICKUP + errand_task PENDING)。
- `track-query` 模块(stage 5/6)— GET 用户/骑手/admin 轨迹查询。
- `errand-dispatch` 模块(stage 6)— 跑腿派单服务 + errand_task entity。
- `rider-heartbeat-timeout-offline.job`(stage 3 既有,5min 心跳超时离线)。
- `rider-location-archive.job`(stage 3 既有,轨迹归档)。

## 2. 原始需求(规划文档 § 1-2 摘要)

完成骑手 Android/iOS APP 智能派单、抢单、外卖/跑腿履约、轨迹上报、异常报备、收益、提现和考核。规划文档明确不做:平台复杂财务报表、用户下单页面。

### 业务能力清单(规划文档 §业务范围)

- **骑手端 APP**:智能派单 / 抢单 / 新订单语音提醒 / 外卖到店取货 / 跑腿取件核验 / 导航路线 / 到店确认 / 取货确认 / 配送中 / 送达确认 / GPS 实时轨迹 / 异常报备 / 收益中心 / 提现 / 提现记录 / 准时率 / 接单率 / 投诉率 / 评分 / 榜单 / 奖励 / 违规扣款。
- **用户端**:查看骑手位置、轨迹、送达状态、异常提示。
- **商家端**:同步出餐状态给骑手,查看骑手到店/取货状态(本阶段是消费,stage 7 已 emit FoodReadyForPickup 事件)。
- **平台 Web**:调度监控 / 轨迹回放 / 异常订单 / 骑手考核 / 违规扣款。

### 接口清单(契约清单 § 7 接口)

| #   | 接口                                        | 端       | 鉴权        |
| --- | ------------------------------------------- | -------- | ----------- |
| 1   | POST /api/v1/r/tasks/{taskId}/accept        | 骑手 APP | Rider-Token |
| 2   | POST /api/v1/r/tasks/{taskId}/arrive-pickup | 骑手 APP | Rider-Token |
| 3   | POST /api/v1/r/tasks/{taskId}/pickup        | 骑手 APP | Rider-Token |
| 4   | POST /api/v1/r/tasks/{taskId}/delivered     | 骑手 APP | Rider-Token |
| 5   | POST /api/v1/r/tasks/{taskId}/exception     | 骑手 APP | Rider-Token |
| 6   | GET /api/v1/r/earnings                      | 骑手 APP | Rider-Token |
| 7   | POST /api/v1/r/withdrawals                  | 骑手 APP | Rider-Token |

### 后端清单

- **8 模块**:dispatch / rider-task / rider-location(stage 3 已建,扩展)/ track / rider-earning / rider-withdrawal / rider-assessment / violation。
- **8 数据表**:dispatch_task / rider_task / rider_location(已建)/ track_point / rider_earning / rider_withdrawal / rider_assessment / rider_violation。
- **6 定时任务**:派单超时重试 / 骑手心跳检测(stage 3 已建)/ 轨迹压缩入库 / 配送超时标记 / 收益日结 / 违规扣款生成。
- **7 领域事件**:DispatchStarted / RiderTaskAccepted / RiderArrivedPickup / RiderPickedUp / RiderDelivered / RiderExceptionReported / RiderEarningGenerated。

### 状态机(规划 §状态机 + 全局状态机)

骑手任务状态(rider_task,bizType=FOOD/ERRAND):
`PENDING → ASSIGNED → ACCEPTED → ARRIVED_PICKUP → PICKED_UP → DELIVERING → DELIVERED + EXCEPTION/CANCELLED`

骑手任务推进会同步推进:

- bizType=FOOD:food_order.status → RIDER_ASSIGNED → PICKED_UP → DELIVERING → DELIVERED
- bizType=ERRAND:errand_task / errand_order.status(stage 6 已建状态机)

## 3. 边界确认

- ✅ 商家端仅 Android/iOS APP,**不开发商家 Web/小程序**。
- ✅ 跑腿订单不进入商家处理流程(stage 6 已实现,本阶段不修改 errand_order)。
- ✅ 用户端/商家端/骑手端/平台 Web Token 隔离。
- ✅ 外卖/跑腿独立计价/退款规则 — rider-task 作为统一中介,但内部按 bizType 分发到对应订单状态机,**互不混用**。
- ✅ 金额分单位 / 距离米单位 / 时间毫秒戳 / camelCase。
- ✅ 所有写接口 @Idempotent + @Audit。

## 4. 决策清单(10 项,基于推荐项执行)

### A1 rider_task 与 errand_task 的关系

- **甲(推荐)**:新建 `rider_task` 作为**统一骑手任务表**,字段 `bizType: 'FOOD' | 'ERRAND'` + `bizOrderId`(food_order_id / errand_order_id)+ `bizTaskId`(errand_task_id 时填,FOOD 时为 NULL)。errand_task(stage 6)保留为跑腿订单方面的"调度任务",rider_task 是**骑手维度**的统一任务,两者一对一关联。
- 乙:扩 errand_task 字段,合并使用。
- **结论:甲**(规划文档明确列两表 + 业务概念分离 + 不破坏 stage 6)。

### A2 dispatch_task 与 rider_task

- **甲(推荐)**:独立两表。
  - `dispatch_task`:每次派单尝试 1 行,记录候选骑手 + 派单结果(超时/成功/失败/重试),用于派单流水审计与超时重试 job。
  - `rider_task`:骑手领取后产生 1 行,生命周期到 DELIVERED/EXCEPTION 终止。
  - dispatch_task 与 rider_task 一对一(派单成功后 rider_task 创建)。
- **结论:甲**。

### A3 真 amap 路线(对应 stage 6 P3-01)

- **甲(推荐)**:沿用 stage 6 amap.adapter.route() mock(返回起点+终点+eta)。stage 11 性能/兼容专项接真 amap key 配置。
- 乙:本阶段真接入。
- **结论:甲**(避免引入 amap key 配置,P3 登记 stage 11)。

### A4 真 wxpay/alipay 提现到账

- **甲(推荐)**:沿用 stage 0 mock,提现 mock 状态机 PENDING → APPROVED(30s) → COMPLETED(30s)同 stage 7。stage 11 真接通道。
- **结论:甲**。

### A5 GET /r/tasks/available 是否新建

- **甲(推荐)**:复用 stage 5/6 既有 `rider-task-pool.controller.ts:GET /api/v1/r/tasks/available`(已扫 food_order READY_FOR_PICKUP + errand_task PENDING 两源)。本阶段不新建列表接口,只新建 7 个写接口(accept/arrive-pickup/pickup/delivered/exception/earnings/withdrawals)。
- **结论:甲**(不重复造轮子,stage 5/6 已铺好基础)。

### A6 rider-task 操作 → 食物/跑腿状态机推进

- **甲(推荐)**:`rider-task.service` 内部按 `bizType` 分发:
  - `bizType='FOOD'` → 调 food-order.service.assignToRider/markPickedUp/markDelivered 推进 food_order 状态。
  - `bizType='ERRAND'` → 调 errand-dispatch.service 或直接更新 errand_task/errand_order 状态。
- 乙:7 接口分别按 bizType 写两套实现。
- **结论:甲**(单一入口,避免重复)。

### A7 平台 Web 调度监控 + 轨迹回放

- **甲(推荐)**:本阶段做 2 页(/admin/dispatch + /admin/track-replay),约 4-6 admin 接口(dispatch-task list/detail + track 轨迹查询 + violation list)。
- **结论:甲**。

### A8 用户端轨迹页扩展

- **甲(推荐)**:扩 stage 5 customer-app `pages/food/order/track.vue` + stage 6 `pages/errand/order/track/index.vue` 加骑手实时位置 + 轨迹折线 + 异常提示。**不新建独立页**。
- **结论:甲**。

### A9 异常报备处理

- **甲(推荐)**:exception POST 写 rider_violation(type=EXCEPTION,handlingStatus=PENDING_PLATFORM)+ emit RiderExceptionReported,平台仲裁 stage 9 接 UI。本阶段仅写表 + 推送 + audit。
- **结论:甲**。

### A10 收益日结 + 违规扣款

- **甲(推荐)**:T+1 收益日结 job(每日 02:30,stage 7 daily-statistics-snapshot 同时间)聚合前一日 DELIVERED 任务 → rider_earning 行;违规扣款 job(每日 03:00)扫 rider_violation 已仲裁的 → 写入 rider_earning.deductAmount。
- **结论:甲**。

### 决策一致项(无歧义直采)

- 时间戳 BIGINT 毫秒;金额 BIGINT 分;主键 `<table>_id` BIGINT 自增;
- 全部 r/\* 写接口 `@Idempotent({ttlSeconds:60}) + @Audit`;
- 数据归属:`@CurrentRider().riderId === <entity>.riderId`;
- 事件命名 `domain.dispatch.<verb>` / `domain.rider-task.<verb>` / `domain.rider-earning.<verb>` / `domain.rider-violation.<verb>`;
- EventName 累计 48 → **55**(+7 规划)。

## 5. 疑问澄清

| 问题                       | 来源                              | 处理                                                                         |
| -------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| 接单大厅接口未列在契约清单 | 规划 § 接口契约清单仅 7 接口      | A5 决策:复用 stage 5/6 GET /r/tasks/available                                |
| rider-app 轨迹上传接口未列 | 规划文档隐含"GPS 实时轨迹上传"    | stage 3 已建 rider-location 模块 + POST /api/v1/r/locations/batch,本阶段沿用 |
| 骑手提现 GET 列表接口未列  | 规划仅列 POST /r/withdrawals      | 本阶段补 GET /r/withdrawals 列表(同 stage 7 商家提现套路),P3 登记契约清单 v2 |
| 骑手考核 GET 接口未列      | 规划仅列业务能力                  | 本阶段补 GET /r/assessment(展示准时率等 KPI),P3 登记契约清单 v2              |
| 违规记录 GET 接口未列      | 规划仅列业务能力                  | 本阶段补 GET /r/violations,P3 登记                                           |
| dispatch 接口未列          | 规划列 dispatch 模块但无 r 端接口 | 派单是后端自动行为(job 触发),无 r 端接口暴露                                 |

## 6. 阶段完成定义(参照规划 §完成定义)

- 7 个 r/\* 核心接口 + 4-5 个补充接口(GET 列表)+ admin 4-6 个监控接口上线。
- 6 jobs 工作正常(其中 1 个心跳 stage 3 已建,新增 5 个)。
- 7 events + 7 subscribers 接入。
- rider-app 15 新页(workbench 增强 + 14 新页)登记 pages.json,build:h5 通过。
- customer-app 食物 + 跑腿 track 页扩展骑手轨迹折线。
- admin-web 2 新页(dispatch / track-replay)。
- 后端 jest +90 用例(目标 ≥780)、前端 vitest +35 用例(目标 ≥230)、4 闸门绿。
- 边界审查:无商家 Web/小程序、不串跑腿、Token 隔离、外卖/跑腿独立。
