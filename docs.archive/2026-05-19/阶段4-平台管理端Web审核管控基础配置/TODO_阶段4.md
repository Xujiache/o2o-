# 阶段 4 — 平台管理端 Web 审核管控与基础配置 · 待办与缺失配置(TODO)

## 1. 必做(进入 stage 5 前由人工抽测确认)

- [ ] **MySQL migration 真跑 + seed**:`MYSQL_PORT=3307 pnpm --filter @o2o/server migrate:run && pnpm --filter @o2o/server seed:run`,验证 `city_site / platform_category / account_disable_record` 各 1 表 + admin_user 4 新列 + super_admin 默认账号(O2o@2026-Admin)+ 4 城市 4+8 类目 seed 落库。
- [ ] **首次部署后修改 super_admin 默认密码**:bcrypt cost=10 已生效,默认密码 `O2o@2026-Admin` 仅供初始化,生产必须立即改。
- [ ] **admin-web 浏览器抽测**:`pnpm --filter @o2o/admin-web dev`(默认 http://127.0.0.1:8083)
  - 登录:captcha SVG 显示 + 输入错 5 次锁 30 min(STATUS_INVALID modal)+ 输入 dev 跳过校验
  - 7 类页面进入流转:customers / disable-records / cities / categories takeaway/errand / system-config / integrations / roles-permissions
  - 401 自动 refresh 验证:停 admin-token 后续请求(刷新 access)→ 不弹回登录页
  - 内置角色权限保存清空校验:SUPER_ADMIN / AUDITOR 不允许清空全部
- [ ] **curl 22 接口冒烟**:按 `ACCEPTANCE_阶段4.md § 4` 的 PowerShell replay 命令逐条跑。
- [ ] **测试套全绿验证**:`pnpm --filter @o2o/server test`(53 suites / 371 tests)+ `pnpm --filter @o2o/admin-web test`(20 suites / 57 tests)。

## 2. 缺失配置 / 环境变量

- [ ] `apps/server/.env`:
  - `INTEGRATION_MODE=mock`(本阶段第三方仍走 mock,第三方 secret 字段虽支持 cipher 加密但实际不会用真凭证)
  - `JWT_ADMIN_SECRET`(stage 0 已有,确认与 c/m/r 各异)
  - `BCRYPT_COST=10`(默认 10,无需改)
- [ ] `apps/admin-web/.env`(可选):
  - `VITE_API_BASE_URL=http://127.0.0.1:3000`(默认指向本机后端)

## 3. 可选(stage 5+ 跟进)

- [ ] **P3-01 cities 页 GeoJSON 真渲染**(stage 8):接高德地图 polygon editor,替代 textarea 录入。
- [ ] **P3-02 RoleChanged 真撤销 jti**(stage 5+):当前仅写 `admin:role-revoked:<adminId>:<changedAt>` 标记,老 access token 仍可用直至自然过期(默认 2h)。stage 5+ 接 access token iat 比对实现真强制重登。
- [ ] **P3-03 third-party reloadConfig 真热更新**(stage 8):当前仅事件发布 + audit_log,真热加载需 IntegrationGateway 监听 ThirdPartyConfigChanged 并 reload adapter 实例。
- [ ] **DisableDialog 与 customers/index 整合**(P2):当前 customers/index.vue 用 ElMessageBox.prompt 简化版,DisableDialog.vue 仅 detail 页用,可统一改为组件化 Dialog 提升 UX(功能等价,不阻塞)。

## 4. 端隔离回归

- [x] admin-auth.cross-scope.spec.ts 已覆盖 5 个端隔离场景,后续 stage 加新模块时,所有 admin 模块 controller 必须 `@UseGuards(AdminJwtGuard, PermissionGuard)`,不能漏。

## 5. 文档同步

- [x] `项目阶段规划/04-阶段4-.../手动审查与测试.md` 已填证据
- [x] `项目阶段规划/04-阶段4-.../问题与风险记录.md` 已记录 5 项 P0/P1 修复 + 3 项 P3 延后
- [x] `docs/阶段4-平台管理端Web审核管控基础配置/{ALIGNMENT,CONSENSUS,DESIGN,TASK,ACCEPTANCE,FINAL,TODO}_阶段4.md` 全部就位
