<script setup lang="ts">
import { ref } from 'vue';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const loggingOut = ref(false);

async function onLogout(): Promise<void> {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
    uni.reLaunch({ url: '/pages/login/index' });
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <view class="security">
    <view class="security__title">账号安全</view>

    <view class="security__row">
      <text>实名状态</text>
      <text class="security__hint">前往实名页查看</text>
    </view>

    <view class="security__row">
      <text>修改手机号</text>
      <text class="security__chev">›</text>
    </view>

    <button class="security__logout" :disabled="loggingOut" @click="onLogout">
      {{ loggingOut ? '登出中...' : '退出登录' }}
    </button>
  </view>
</template>

<style scoped>
.security {
  padding: 32rpx;
  background: #f5f5f5;
  min-height: 100vh;
}
.security__title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.security__row {
  background: #fff;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
}
.security__hint {
  color: #999;
  font-size: 24rpx;
}
.security__chev {
  color: #ccc;
  font-size: 36rpx;
}
.security__logout {
  margin-top: 64rpx;
  background: #ff4d4f;
  color: #fff;
  border-radius: 12rpx;
}
.security__logout[disabled] {
  background: #ffb1b1;
}
</style>
