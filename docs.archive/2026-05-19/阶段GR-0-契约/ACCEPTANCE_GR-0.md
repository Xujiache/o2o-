# 阶段 GR-0 · ACCEPTANCE（验收清单）

GR-0 仅产出文档，无代码改动。验收以下 5 项即可。

## 1. 文档完整性（5 项）

- [x] `docs/阶段GR-0-契约/README.md` 存在，含 6 项产品决策、7 阶段路线图、强制边界
- [x] `docs/阶段GR-0-契约/ALIGNMENT_GR-0.md` 存在，含 10 个 Q&A 决策、错误码列表、性能约束
- [x] `docs/阶段GR-0-契约/CONSENSUS_GR-0.md` 存在，含模块清单（5 新增 / 2 扩展 / 1 改造 / 4 软废弃）、表清单（8 新 / 1 扩 / N 软废弃 / N 保留）、38 个接口、12 权限点、10 事件、4 订阅器、2 Cron Job
- [x] `docs/阶段GR-0-契约/DESIGN_GR-0.md` 存在，含整体架构 mermaid、状态机 mermaid、模块分层（6 个新模块目录树）、4 个关键算法、缓存策略、Token 矩阵
- [x] `docs/阶段GR-0-契约/TASK_GR-0.md` 存在，含 GR-0 自身 5 任务 + GR-1~7 全部 96 个原子任务概览

## 2. 跨文档一致性（4 项）

- [x] ALIGNMENT § 5 错误码（7 个新增）已被 CONSENSUS 或 DESIGN 引用
- [x] CONSENSUS § 1 模块清单（5+2+1+4）与 DESIGN § 3 模块分层目录树完全对应
- [x] CONSENSUS § 3 接口表（38 个）与 DESIGN § 1 整体架构图箭头数量一致
- [x] DESIGN § 2 订单状态机 8 状态（wait_pay/paid/picking/weigh_settled/pickup_ready/picked_up/cancelled/refunded）与 CONSENSUS § 2.1 `grocery_order.status ENUM` 完全一致

## 3. 边界约束体现（4 项）

- [x] 所有文档反复强调"errand 跑腿保留不动""rider 不参与生鲜"
- [x] 所有文档明确"不复用 archive/grocery-experiment 分支"
- [x] 所有文档明确"GR-0 不写业务代码，仅文档评审"
- [x] CONSENSUS § 7 列出严格不做清单（11 项）

## 4. 关键决策可执行性（5 项）

- [x] 差额上限 ±30% 已有具体公式 + sys_config key（`grocery.delta_max_ratio`）
- [x] 二维码 code 编码已有完整正则 + checksum 实现伪代码（DESIGN § 4.3）
- [x] 运营员账号方案已定（复用 admin_user + OPERATOR 角色 + Merchant-Token scope=merchant）
- [x] 数据库迁移策略已定（叠加，不 drop）
- [x] tabBar 切换方案已定（GR-2 改 pages.json 第一项 pagePath）

## 5. 总验收

- [x] 用户已在 Plan 阶段对 6 项产品决策签字确认（跑腿保留 / 全新设计 / 全自提 / 估重复核多退少补 / 一鸡一码 / 多自提点选点）
- [x] GR-1 启动前置条件全部满足

## 评审与下一步

GR-0 验收通过后，**直接进入 GR-1 写第一行代码**。GR-1 起点：

1. 新建 migration `apps/server/src/database/migrations/1780000000000-GroceryStep1.ts`
2. 新建 entity `apps/server/src/database/entities/pickup-point.entity.ts`
3. 新建 module `apps/server/src/modules/pickup-point/`
4. 改造 `apps/server/src/modules/merchant-auth/`：登录改 username+password+OPERATOR 校验
