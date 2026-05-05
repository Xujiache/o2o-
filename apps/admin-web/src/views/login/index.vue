<script setup lang="ts">
/**
 * 登录页(stage 4):用户名 + 密码 + svg-captcha。
 * mock 模式 captcha 输入 'dev' 跳过校验(便于开发联调)。
 */
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ErrorCode } from '@o2o/contracts';

import { fetchCaptcha, login } from '@/api/admin-auth';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const captchaId = ref('');
const captchaSvg = ref('');
const username = ref('super_admin');
const password = ref('');
const captcha = ref('');
const loading = ref(false);

async function reloadCaptcha(): Promise<void> {
  const r = await fetchCaptcha();
  if (r.code === '0' && r.data) {
    captchaId.value = r.data.captchaId;
    captchaSvg.value = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(r.data.svgImage)))}`;
  }
}

async function submit(): Promise<void> {
  if (!username.value || !password.value || !captcha.value) {
    ElMessage.warning('请填写用户名 / 密码 / 验证码');
    return;
  }
  loading.value = true;
  try {
    const r = await login({
      username: username.value.trim(),
      password: password.value,
      captcha: captcha.value.trim(),
      captchaId: captchaId.value,
    });
    if (r.code !== '0' || !r.data) {
      // 后端 STATUS_INVALID 涵盖账号锁定 / 已禁用 — 关键状态用 modal 提示;其它走轻量 toast
      if (r.code === ErrorCode.STATUS_INVALID) {
        const isLocked = r.message?.includes('锁定') ?? false;
        await ElMessageBox.alert(r.message || '账号状态异常', isLocked ? '账号已锁定' : '账号不可用', {
          confirmButtonText: '我知道了',
          type: 'error',
        }).catch(() => undefined);
      } else {
        ElMessage.error(r.message || '登录失败');
      }
      await reloadCaptcha();
      captcha.value = '';
      return;
    }
    userStore.onLoginSuccess(r.data);
    const lastLoginText = r.data.lastLoginAt ? `上次登录 ${new Date(r.data.lastLoginAt).toLocaleString()}` : '首次登录';
    ElMessage.success(`欢迎,${r.data.displayName} — ${lastLoginText}`);
    const redirect = (route.query.redirect as string) || '/workbench';
    void router.replace(redirect);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reloadCaptcha();
});
</script>

<template>
  <div class="login">
    <div class="login__box">
      <div class="login__title">O2O 平台管理 — 登录</div>
      <div class="login__hint">
        默认账号 <code>super_admin / O2o@2026-Admin</code>;mock 模式验证码可输入 <code>dev</code>。
      </div>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="username" placeholder="用户名" autocomplete="username" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" type="password" placeholder="密码" autocomplete="current-password" />
        </el-form-item>
        <el-form-item>
          <div class="login__captcha-row">
            <el-input v-model="captcha" placeholder="验证码" maxlength="16" />
            <img
              v-if="captchaSvg"
              :src="captchaSvg"
              alt="captcha"
              class="login__captcha-img"
              title="点击刷新"
              @click="reloadCaptcha()"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="login__submit" @click="submit">登录</el-button>
        </el-form-item>
      </el-form>
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
  width: 420px;
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
.login__captcha-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.login__captcha-img {
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  background: #f6f6f6;
}
.login__submit {
  width: 100%;
}
</style>
