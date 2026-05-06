# 阶段 8 — 骑手端 APP 调度轨迹收益考核 · 待办事项(TODO)

> 阶段交付完成后必须由用户(运维 / 测试 / 业务负责人)手动触发的项目。

## P0 上线前必做

### 1. MySQL migration

```bash
docker compose -f deploy/docker-compose.dev.yml up -d mysql
pnpm migrate:run    # Stage8Init1716077400000
pnpm seed:run       # sys-config-stage8 + role-permission +6
```

校验:`SHOW TABLES LIKE '%dispatch_task%' OR '%rider_task%' OR '%track_point%' OR '%rider_earning%' OR '%rider_withdrawal%' OR '%rider_assessment%' OR '%rider_violation%'` 应有 7 张新表。

### 2. curl 接口冒烟(11 r + 4 admin = 15)

获取 token:`pnpm token:dev rider 30001` / `pnpm token:dev admin 40001`

11 r 端核心:

```bash
curl -H "Rider-Token: $R" http://localhost:3000/api/v1/r/tasks/RT1
curl -X POST -H "Rider-Token: $R" http://localhost:3000/api/v1/r/tasks/D1/accept -d '{"lng":116.4,"lat":39.9}'
# arrive-pickup / pickup / delivered / exception / earnings / withdrawals(GET/POST) / assessment / violations
```

4 admin:

```bash
curl -H "Admin-Token: $A" http://localhost:3000/api/v1/admin/dispatch-tasks
curl -H "Admin-Token: $A" 'http://localhost:3000/api/v1/admin/track-replay?riderTaskId=RT1'
curl -H "Admin-Token: $A" http://localhost:3000/api/v1/admin/violations
```

## P1 真机/浏览器测试

### 3. rider-app 真机测试(H5)

```bash
pnpm dev:rider:h5
```

测试路径:

- 工作台上线 + 心跳上传(每 30s 一次 mock 位置)
- 接单大厅 → 抢单
- 当前任务详情 → arrive-pickup → pickup → delivered
- 异常报备 → 跳工作台
- 收益中心 / 提现 / 提现记录 / 考核 / 违规记录

### 4. admin-web 浏览器测试

```bash
pnpm dev:admin
```

打开 `/admin/dispatch` / `/admin/track-replay` / `/admin/violations`,核对:

- 列表渲染 + 状态/类型过滤 + 分页
- dispatch 详情抽屉(候选骑手列表)
- track-replay 按 riderTaskId 查询返回点位

## P2 待补强

- **P2-01 server jest 边际差**:目标 ≥780,实际 757(差 23)。stage 9 e2e 集成测试做最终覆盖
- **总用例数边际差**:目标 ≥984,实际 1015(满足)
- **P2-02 admin-web 用例 -3**:目标 ≥90,实际 87。stage 9 补 admin 监控测试

## P3 stage 11 真接入

- **P3-01 amap 路线**:rider-app navigate 页 mock 地图,真 amap SDK stage 11 接(配合 stage 6 同 P3)
- **P3-02 wxpay/alipay 提现到账**:withdrawal-status-poll mock 推进,真支付通道 stage 11 接
- **P3-03 真 push**:DispatchModal 实际推送靠 push.adapter Mock,getui SDK stage 11 接(配合 stage 7 同 P3)
- **P3-04 真智能调度**:dispatch.service 简化为"全部在线骑手为候选",P3 接距离/评分/服务区匹配
- **P3-05 真 GPS**:rider-app 模拟 GPS,真 uni.getLocation + 后台续上报 stage 11
- **P3-06 真 sms**:withdrawal sms 验证 mock,真 aliyun-sms stage 11
- **P3-07 真实名(rider)**:rider-withdrawal 简化为 account_status='active',真 realname 比对 stage 11

## 配置确认

- **rider.withdrawal.limit**:`{"single":100000,"daily":1000000}`(单笔 ¥1000 / 单日 ¥10000)
- **rider.earning.formula**:`{"baseFood":500,"baseErrand":300,"perKmCents":50,"timelyBonus":200}`
- **rider.assessment.thresholds**:`{"onTimeRate":0.9,"acceptRate":0.8,"complaintRate":0.05}`
- **dispatch.timeout_seconds**:30

通过 `/admin/system-config` 修改即可。
