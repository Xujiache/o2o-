<script setup lang="ts">
/**
 * 登录占位页(stage 0):提供 2 个 mock 身份按钮 + 自定义 token 输入。
 * 完整登录(账号/密码、二次校验) 留给 stage 4。
 *
 * 因为 stage 0 后端只校验 Admin-Token JWT 与权限点(读 sys_role_permission),
 * 这里的 token 必须用 dev tool 生成的真 admin token,否则后端 /admin/** 会 401。
 *   生成命令:`pnpm --filter @o2o/server token:dev admin`
 */
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const tokenInput = ref<string>('');

const SUPER_ADMIN_PERMS = [
  'admin:audit:logs:view',
  'admin:integrations:view',
  'admin:system:config:view',
  'admin:roles:permissions:view',
];
const AUDITOR_PERMS = ['admin:integrations:view'];

function loginAs(role: 'SUPER_ADMIN' | 'AUDITOR'): void {
  if (!tokenInput.value.trim()) {
    alert('请先粘贴 Admin-Token(用 pnpm --filter @o2o/server token:dev admin 生成)');
    return;
  }
  const perms = role === 'SUPER_ADMIN' ? SUPER_ADMIN_PERMS : AUDITOR_PERMS;
  userStore.mockLogin({
    token: tokenInput.value.trim(),
    principal: { principalId: '40001', scope: 'admin', roles: [role] },
    permissions: perms,
  });
  const redirect = (route.query.redirect as string) || '/workbench';
  void router.replace(redirect);
}
</script>

<template>
  <div class="login">
    <div class="login__box">
      <div class="login__title">O2O 平台管理 — 登录(stage 0 占位)</div>
      <div class="login__hint">
        本端阶段 0 仅占位。粘贴 dev admin token,然后选择身份进入。<br />
        生成命令: <code>pnpm --filter @o2o/server token:dev admin</code>
      </div>
      <el-input
        v-model="tokenInput"
        type="textarea"
        :rows="3"
        placeholder="将 dev token 粘贴在这里(eyJhbGciOi...)"
        class="login__token"
      />
      <div class="login__actions">
        <el-button type="primary" @click="loginAs('SUPER_ADMIN')">以 SUPER_ADMIN 登录(全权限)</el-button>
        <el-button @click="loginAs('AUDITOR')">以 AUDITOR 登录(无审计日志权限)</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #1f3b73, #2a5298);
}
.login__box {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  width: 480px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.login__title {
  font-size: 20px;
  font-weight: 600;
}
.login__hint {
  font-size: 12px;
  color: #888;
  line-height: 1.6;
}
.login__token :deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 12px;
}
.login__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
