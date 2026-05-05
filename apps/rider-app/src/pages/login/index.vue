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
    <view class="login__title">骑手登录</view>
    <view class="login__desc">输入手机号,接收 6 位验证码登录</view>
    <MobileInput v-model="mobile" />
    <button class="login__btn" :disabled="!valid || sending" @click="onSendSms">
      {{ sending ? '发送中...' : '发送验证码' }}
    </button>
  </view>
</template>

<style scoped>
.login {
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.login__title {
  font-size: 48rpx;
  font-weight: 600;
}
.login__desc {
  font-size: 26rpx;
  color: #666;
}
.login__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.login__btn[disabled] {
  background: #aac4ff;
  color: #fff;
}
</style>
