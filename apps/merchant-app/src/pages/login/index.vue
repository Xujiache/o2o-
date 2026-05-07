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
    <view class="login__hero">
      <text class="login__badge">Merchant App</text>
      <view class="login__title">商家登录</view>
      <text class="login__hint">管理订单、商品、结算与门店运营</text>
    </view>

    <view class="login__panel">
      <MobileInput v-model="mobile" />

      <button class="login__btn" :disabled="!canSend" @click="onSendSms">
        {{ sending ? '发送中...' : '获取验证码' }}
      </button>

      <text v-if="errorMsg" class="login__error">{{ errorMsg }}</text>

      <button class="login__btn login__btn--ghost" @click="onApply">提交入驻申请</button>
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
  background: linear-gradient(135deg, #1f2937, #b7791f);
  box-shadow: 0 24rpx 64rpx rgba(183, 121, 31, 0.26);
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
.login__hint {
  display: block;
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
  background: linear-gradient(135deg, #ffb400, #b7791f);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
.login__btn[disabled] {
  background: #f9dd9a;
}
.login__btn--ghost {
  background: #fff;
  color: #b7791f;
  border: 1rpx solid rgba(183, 121, 31, 0.3);
  box-shadow: none;
}
.login__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
