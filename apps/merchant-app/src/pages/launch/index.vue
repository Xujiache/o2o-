<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

import { useAuthStore } from '@/stores/auth';

onLoad(() => {
  const auth = useAuthStore();
  let target = '/pages/login/index';
  if (auth.isLoggedIn) {
    if (auth.accountStatus === 'active') target = '/pages/workbench/index';
    else if (auth.accountStatus === 'pending') target = '/pages/onboarding/progress';
  }
  uni.reLaunch({ url: target });
});
</script>

<template>
  <view class="launch">
    <text class="launch__hint">正在进入...</text>
  </view>
</template>

<style scoped>
.launch {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.launch__hint {
  font-size: 28rpx;
  color: #8a94a6;
}
</style>
