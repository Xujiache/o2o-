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
    await auth.sendSms(mobile.value);
    uni.navigateTo({ url: `/pages/login/verify?mobile=${mobile.value}` });
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '验证码发送失败';
  } finally {
    sending.value = false;
  }
}

function onApply(): void {
  uni.navigateTo({ url: '/pages/onboarding/apply' });
}
</script>

<template>
  <view class="login">
    <view class="login__title">商家登录</view>
    <text class="login__hint">未入驻商家请先提交资料</text>

    <MobileInput v-model="mobile" />

    <button class="login__btn" :disabled="!canSend" @click="onSendSms">
      {{ sending ? '发送中...' : '获取验证码' }}
    </button>

    <text v-if="errorMsg" class="login__error">{{ errorMsg }}</text>

    <button class="login__btn login__btn--ghost" @click="onApply">提交入驻申请</button>
  </view>
</template>

<style scoped>
.login {
  padding: 80rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.login__title {
  font-size: 48rpx;
  font-weight: 600;
}
.login__hint {
  font-size: 26rpx;
  color: #888;
}
.login__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.login__btn[disabled] {
  background: #c5d4ff;
}
.login__btn--ghost {
  background: #fff;
  color: #4c84ff;
  border: 1rpx solid #4c84ff;
}
.login__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
