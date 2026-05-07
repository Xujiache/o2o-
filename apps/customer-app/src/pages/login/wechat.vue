<script setup lang="ts">
import { ref } from 'vue';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const submitting = ref(false);
const errorMsg = ref('');

async function onAuthorize(): Promise<void> {
  errorMsg.value = '';
  submitting.value = true;
  try {
    // uni.login 在小程序内取 jsCode;H5 / vitest 用占位
    let jsCode = '';
    try {
      const r = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject });
      });
      jsCode = r.code;
    } catch {
      jsCode = `mock-jscode-${Date.now()}`;
    }
    const { bindMobileRequired } = await auth.loginByWechat(jsCode);
    if (bindMobileRequired) {
      uni.redirectTo({ url: '/pages/login/index?bindWechat=1' });
    } else {
      uni.switchTab({ url: '/pages/me/index' });
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '微信授权失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="wechat">
    <view class="wechat__title">微信授权登录</view>
    <text class="wechat__hint">将获取你的微信 OpenID 用于绑定账号。首次登录需绑定手机号。</text>
    <button class="wechat__btn" :disabled="submitting" @click="onAuthorize">
      {{ submitting ? '授权中...' : '一键授权登录' }}
    </button>
    <text v-if="errorMsg" class="wechat__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.wechat {
  padding: 80rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.wechat__title {
  font-size: 48rpx;
  font-weight: 600;
}
.wechat__hint {
  font-size: 26rpx;
  color: #666;
}
.wechat__btn {
  margin-top: 32rpx;
  background: #1aad19;
  color: #fff;
  border-radius: 12rpx;
}
.wechat__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
