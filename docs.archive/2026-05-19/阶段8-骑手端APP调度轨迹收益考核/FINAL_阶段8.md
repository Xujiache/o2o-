# 阶段 8 — 骑手端 APP 调度轨迹收益考核 · 项目总结(FINAL)

## 1. 总览

| 维度          | 数据                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 原子任务      | 32/32                                                                                                                                                           |
| 后端模块      | 10 新(dispatch / rider-task / track / rider-earning / rider-withdrawal / rider-assessment / violation / admin-dispatch / admin-track-replay / admin-violations) |
| 数据表        | 7 新                                                                                                                                                            |
| HTTP 接口     | 15(11 r + 4 admin)+ 复用 stage 5/6 既有 GET /r/tasks/available + POST /r/location/batch                                                                         |
| 领域事件      | 7 新(EventName 累计 48 → 55)                                                                                                                                    |
| 事件订阅器    | 7                                                                                                                                                               |
| 定时任务      | 5 新 + 1 复用 stage 3                                                                                                                                           |
| 权限点        | +6                                                                                                                                                              |
| 骑手端页面    | +14(workbench 增强 + 13 新) + 1 组件                                                                                                                            |
| 平台 Web 页面 | +3(dispatch / track-replay / violations)                                                                                                                        |
| 后端 jest     | 757(stage 7 末 689 → +68)                                                                                                                                       |
| 前端 vitest   | 258(customer 64 / merchant 51 / rider 56 / admin 87)                                                                                                            |
| 总 commit     | 8(2cd8be8 → 本次)                                                                                                                                               |

## 2. 能力矩阵

| 能力                                          | 端       | 入口                                       | 后端                                | 状态 |
| --------------------------------------------- | -------- | ------------------------------------------ | ----------------------------------- | ---- |
| 智能派单(扫在线骑手 + 30s 超时重试)           | 后端     | dispatch-timeout-retry.job                 | dispatch                            | ✓    |
| 抢单/接单                                     | 骑手 APP | /pages/tasks/hall + accept                 | rider-task                          | ✓    |
| 当前任务 + 状态机迁移                         | 骑手 APP | /pages/tasks/current                       | rider-task                          | ✓    |
| 外卖取餐核验                                  | 骑手 APP | /pages/tasks/pickup-food                   | rider-task.pickup                   | ✓    |
| 跑腿取件核验                                  | 骑手 APP | /pages/tasks/pickup-errand                 | rider-task.pickup                   | ✓    |
| 导航(到取货/送达)                             | 骑手 APP | /pages/tasks/navigate                      | (mock,P3 接 amap)                   | ✓    |
| 配送中                                        | 骑手 APP | /pages/tasks/delivering                    | rider-task                          | ✓    |
| 送达确认                                      | 骑手 APP | /pages/tasks/delivered                     | rider-task.delivered                | ✓    |
| 异常报备                                      | 骑手 APP | /pages/tasks/exception                     | rider-task.exception + violation    | ✓    |
| GPS 实时轨迹(批量上传 + 5min 心跳)            | 骑手 APP | (workbench 心跳)                           | rider-location(stage 3 既有)+ track | ✓    |
| 收益中心                                      | 骑手 APP | /pages/earnings/index                      | rider-earning                       | ✓    |
| 提现                                          | 骑手 APP | /pages/withdrawals/form                    | rider-withdrawal                    | ✓    |
| 提现记录                                      | 骑手 APP | /pages/withdrawals/records                 | rider-withdrawal.list               | ✓    |
| 考核中心(准时率/接单率/投诉率/评分/榜单/勋章) | 骑手 APP | /pages/assessment/index                    | rider-assessment                    | ✓    |
| 违规记录                                      | 骑手 APP | /pages/violations/index                    | violation                           | ✓    |
| 用户端轨迹页(骑手位置/送达状态)               | 用户端   | (stage 5/6 既有沿用)                       | track-query                         | ✓    |
| 平台调度监控                                  | 平台 Web | /admin/dispatch                            | admin-dispatch                      | ✓    |
| 轨迹回放                                      | 平台 Web | /admin/track-replay                        | admin-track-replay                  | ✓    |
| 违规记录监控                                  | 平台 Web | /admin/violations                          | admin-violations                    | ✓    |
| 派单超时重试                                  | 后端     | dispatch-timeout-retry.job(每 10s)         | scheduler                           | ✓    |
| 轨迹压缩                                      | 后端     | track-compress.job(每 5min)                | scheduler                           | ✓    |
| 配送超时标记                                  | 后端     | delivery-timeout-mark.job(每 1min)         | scheduler                           | ✓    |
| T+1 收益日结                                  | 后端     | rider-earning-daily-settle.job(每日 02:30) | scheduler                           | ✓    |
| 违规扣款生成                                  | 后端     | rider-violation-deduct.job(每日 03:00)     | scheduler                           | ✓    |
| 心跳超时离线(stage 3 既有)                    | 后端     | rider-heartbeat-timeout-offline.job        | scheduler                           | ✓    |

## 3. 关键决策

### 用户拍板(对齐文档 § 4 决策清单)

- **A1 rider_task vs errand_task → 甲**:新建 rider_task,errand_task(stage 6)保留,bizType 分发
- **A2 dispatch_task vs rider_task → 甲**:独立两表
- **A3 真 amap 路线 → 甲**:沿用 mock,P3 stage 11
- **A4 真 wxpay 提现 → 甲**:沿用 mock,P3 stage 11
- **A5 GET /r/tasks/available → 甲**:复用 stage 5/6,本阶段不重做
- **A6 rider-task → 食物/跑腿状态机 → 甲**:bizType 分发(单一入口)
- **A7 平台 Web 调度+回放 → 甲**:本阶段做 2 页 + 4 接口
- **A8 用户端轨迹扩展 → 甲**:扩 stage 5/6 既有页(实际既有页已显示骑手位置/eta,本阶段沿用)
- **A9 异常报备 → 甲**:写 violation + 转平台仲裁(stage 9)
- **A10 收益日结+违规扣款 → 甲**:T+1 套路

### 自动决策(沿用 stage 5/6/7 套路)

| ID   | 决策                                                                                            | 落地                                        |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 8.1  | BIGINT 时间戳 + 主键 `<table>_id` 自增                                                          | 7 entity                                    |
| 8.2  | 事件命名 domain.<biz>.<verb>                                                                    | events.ts +7                                |
| 8.3  | dispatch_no = 自增 ID,withdrawal_no = `RW`+yyyyMMdd+ms6                                         | dispatch.service / rider-withdrawal.service |
| 8.4  | rider_status(stage 3)已含 device_token/lastHeartbeatAt,本阶段不动 schema(DESIGN 表述错误已订正) | (无 schema 改动)                            |
| 8.5  | 数据归属:rider 端通过 `@CurrentUser.principalId === <entity>.riderId` 过滤                      | 全 r/\* service                             |
| 8.6  | 收益公式 sys_config rider.earning.formula JSON                                                  | rider-earning-daily-settle.job              |
| 8.7  | 提现额度 sys_config rider.withdrawal.limit JSON                                                 | rider-withdrawal.service                    |
| 8.8  | 装饰器 @Idempotent + @Audit                                                                     | 全 r/\* 写接口                              |
| 8.9  | 异常 → violation PENDING_PLATFORM,平台仲裁 stage 9 接                                           | rider-task.exception                        |
| 8.10 | DELIVERY 超时 LATE 自动 CONFIRMED + 200 cents 默认扣款                                          | delivery-timeout-mark.job                   |

## 4. 提交记录

见 ACCEPTANCE § 7。

## 5. 与 stage 7 对照

| 维度          | stage 7 末               | stage 8 末 | 增量 |
| ------------- | ------------------------ | ---------- | ---- |
| 后端 modules  | 65                       | 75         | +10  |
| 数据表        | 66                       | 73         | +7   |
| HTTP 接口     | 117                      | 132        | +15  |
| EventName     | 48                       | 55         | +7   |
| 事件订阅器    | 41                       | 48         | +7   |
| 定时任务      | 31                       | 36         | +5   |
| 骑手端页面    | 8 注册                   | 22 注册    | +14  |
| 平台 Web 页面 | 21                       | 24         | +3   |
| jest 用例     | 689                      | 757        | +68  |
| vitest 用例   | 195(含 stage 3 rider 13) | 258        | +63  |
| 总 commit     | 7                        | 8          | -    |

## 6. 后续阶段对接点

- **stage 9(平台运营财务)**:平台仲裁(rider_violation PENDING_PLATFORM → CONFIRMED/DROPPED)+ 调度算法升级 + 结算财务深度报表
- **stage 11(性能安全兼容)**:真 amap 路线 / 真 wxpay 提现到账 / 真 push 推送(getui)/ 真 GPS / 真智能调度
