<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

import { useAuthStore } from '@/stores/auth';
import { useDictStore } from '@/stores/dict';

onLoad(() => {
  void useDictStore().load(['order_takeaway_status', 'order_errand_status']);
  const target = useAuthStore().isLoggedIn ? '/pages/index/index' : '/pages/login/index';
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
