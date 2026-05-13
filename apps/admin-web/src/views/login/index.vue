<script setup lang="ts">
/**
 * 登录页 — 双栏:左侧品牌展示,右侧表单。
 * 登录页表单、验证码和会话写入。
 */
import { Lock, Picture, User } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
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

const yearText = computed<string>(() => String(new Date().getFullYear()));

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
    <aside class="login__brand">
      <div class="login__brand-bg">
        <div class="orb orb-1" />
        <div class="orb orb-2" />
        <div class="grid-overlay" />
      </div>
      <div class="login__brand-content">
        <div class="brand-logo">
          <el-icon><Promotion /></el-icon>
        </div>
        <div class="brand-name">O2O Platform</div>
        <div class="brand-tag">外卖 · 跑腿 · 运营调度</div>

        <ul class="brand-bullets">
          <li><span class="dot" /> 四端统一调度,实时订单与轨迹</li>
          <li><span class="dot" /> 商家入驻审核 · 骑手考核 · 异常仲裁</li>
          <li><span class="dot" /> 财务结算 · 退款执行 · 报表导出</li>
        </ul>

        <div class="brand-foot">© {{ yearText }} O2O Console · v1.0</div>
      </div>
    </aside>

    <main class="login__panel">
      <div class="login__form">
        <h1 class="login__form-title">登录管理后台</h1>
        <p class="login__form-sub">请输入账号信息以继续</p>

        <el-form size="large" @submit.prevent="submit">
          <el-form-item>
            <el-input v-model="username" placeholder="用户名" autocomplete="username" :prefix-icon="User" />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="password"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              show-password
              :prefix-icon="Lock"
            />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <el-input v-model="captcha" placeholder="验证码" maxlength="16" :prefix-icon="Picture" />
              <div class="captcha-img" :title="captchaSvg ? '点击刷新' : ''" @click="reloadCaptcha()">
                <img v-if="captchaSvg" :src="captchaSvg" alt="captcha" />
                <span v-else>加载中</span>
              </div>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" class="login__submit" @click="submit"> 登录 </el-button>
          </el-form-item>
        </el-form>

        <div class="login__hint">请输入管理员账号、密码和验证码。</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(440px, 480px);
  min-height: 100vh;
  background: var(--bg-canvas);
}

.login__brand {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(80% 60% at 20% 10%, rgba(59, 130, 246, 0.22), transparent 60%),
    radial-gradient(60% 70% at 90% 90%, rgba(99, 102, 241, 0.16), transparent 60%),
    linear-gradient(135deg, #0a1a3a 0%, #0b1228 60%, #070a15 100%);
  color: #e6edf7;
  padding: 56px 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.login__brand-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
}
.orb-1 {
  width: 360px;
  height: 360px;
  background: #3b82f6;
  top: -80px;
  left: -60px;
}
.orb-2 {
  width: 280px;
  height: 280px;
  background: #6366f1;
  bottom: -60px;
  right: -40px;
}
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%);
}

.login__brand-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: grid;
  place-items: center;
  font-size: 26px;
  color: white;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 12px 32px -8px rgba(59, 130, 246, 0.6);
}
.brand-name {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-top: 8px;
}
.brand-tag {
  font-size: 14px;
  color: #98a3b6;
  letter-spacing: 2px;
}
.brand-bullets {
  list-style: none;
  padding: 0;
  margin: 32px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brand-bullets li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #c2cbda;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
}
.brand-foot {
  position: relative;
  z-index: 1;
  font-size: 11px;
  color: #5b6577;
  letter-spacing: 1px;
}

.login__panel {
  background: var(--bg-canvas);
  display: grid;
  place-items: center;
  padding: 48px;
  border-left: 1px solid var(--border-default);
}
.login__form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.login__form-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--fg-primary);
  margin: 0;
}
.login__form-sub {
  font-size: 13px;
  color: var(--fg-secondary);
  margin: 0 0 24px;
}
.captcha-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.captcha-img {
  width: 120px;
  flex-shrink: 0;
  height: 40px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s;
}
.captcha-img:hover {
  border-color: var(--brand-500);
}
.captcha-img img {
  max-width: 100%;
  max-height: 100%;
}
.captcha-img span {
  font-size: 11px;
  color: var(--fg-muted);
}
.login__submit {
  width: 100%;
  height: 42px;
  font-size: 15px;
  font-weight: 500;
}
.login__hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--fg-muted);
  line-height: 1.7;
  text-align: center;
}
.login__hint code {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  color: var(--fg-secondary);
}

@media (max-width: 880px) {
  .login {
    grid-template-columns: 1fr;
  }
  .login__brand {
    display: none;
  }
  .login__panel {
    border-left: none;
  }
}
</style>
