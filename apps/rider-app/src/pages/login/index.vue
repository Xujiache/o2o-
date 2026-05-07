<script setup lang="ts">
import { computed, ref } from 'vue';

import MobileInput from '@/components/common/MobileInput.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const mobile = ref('');
const sending = ref(false);

const valid = computed(() => /^1[3-9]\d{9}$/.test(mobile.value));

async function onSendSms(): Promise<void> {
  if (!valid.value || sending.value) return;
  sending.value = true;
  try {
    await auth.sendSms(mobile.value);
    uni.navigateTo({ url: `/pages/login/verify?mobile=${mobile.value}` });
  } catch (e) {
    uni.showToast({ icon: 'none', title: e instanceof Error ? e.message : '发送失败' });
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <view class="login">
    <view class="login__hero">
      <text class="login__badge">Rider App</text>
      <view class="login__title">骑手登录</view>
      <view class="login__desc">输入手机号，接收 6 位验证码登录</view>
    </view>
    <view class="login__panel">
      <MobileInput v-model="mobile" />
      <button class="login__btn" :disabled="!valid || sending" @click="onSendSms">
        {{ sending ? '发送中...' : '发送验证码' }}
      </button>
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
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 24rpx 64rpx rgba(20, 184, 166, 0.26);
}
.login__badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
}
.login__title {
  margin-top: 24rpx;
  font-size: 54rpx;
  font-weight: 800;
}
.login__desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.88);
}
.login__panel {
  padding: 32rpx;
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.login__btn {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
.login__btn[disabled] {
  background: #9de3dc;
  color: #fff;
}
</style>
