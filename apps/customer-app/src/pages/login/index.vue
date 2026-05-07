<script setup lang="ts">
import { computed, ref } from 'vue';

import MobileInput from '@/components/common/MobileInput.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const mobile = ref('');
const sending = ref(false);
const errorMsg = ref('');

const canSend = computed(() => /^1[3-9]\d{9}$/.test(mobile.value) && !sending.value);

async function onSendSms(): Promise<void> {
  errorMsg.value = '';
  sending.value = true;
  try {
    await auth.sendSms(mobile.value, 'login');
    uni.navigateTo({ url: `/pages/login/verify?mobile=${mobile.value}` });
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '验证码发送失败';
  } finally {
    sending.value = false;
  }
}

function onWechat(): void {
  uni.navigateTo({ url: '/pages/login/wechat' });
}
</script>

<template>
  <view class="login">
    <view class="login__hero">
      <text class="login__badge">Customer Portal</text>
      <view class="login__title">欢迎回来</view>
      <text class="login__hint">手机号登录后可管理外卖、跑腿、地址与售后</text>
    </view>

    <view class="login__panel">
      <MobileInput v-model="mobile" />

      <button class="login__btn" :disabled="!canSend" @click="onSendSms">
        {{ sending ? '发送中...' : '获取验证码' }}
      </button>

      <text v-if="errorMsg" class="login__error">{{ errorMsg }}</text>

      <view class="login__divider">其他登录方式</view>
      <button class="login__btn login__btn--ghost" @click="onWechat">微信授权登录</button>
    </view>
  </view>
</template>

<style scoped>
.login {
  padding: 56rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.login__hero {
  padding: 54rpx 36rpx;
  border-radius: 36rpx;
  color: #fff;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  box-shadow: 0 24rpx 64rpx rgba(255, 107, 53, 0.28);
}
.login__badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  font-size: 22rpx;
  letter-spacing: 1rpx;
}
.login__title {
  margin-top: 24rpx;
  font-size: 54rpx;
  font-weight: 800;
}
.login__hint {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}
.login__panel {
  padding: 32rpx;
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.login__btn {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
.login__btn[disabled] {
  background: #ffd7c2;
}
.login__btn--ghost {
  background: #fff;
  color: #ff6b35;
  border: 1rpx solid rgba(255, 107, 53, 0.3);
  box-shadow: none;
}
.login__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
.login__divider {
  text-align: center;
  font-size: 22rpx;
  color: #999;
  margin-top: 32rpx;
}
</style>
