<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');

function goNavigate(): void {
  uni.navigateTo({ url: `/pages/tasks/navigate?taskId=${taskId.value}&phase=delivery` });
}

function goDelivered(): void {
  uni.navigateTo({ url: `/pages/tasks/delivered?taskId=${taskId.value}` });
}

onLoad((options) => {
  taskId.value = (options?.taskId as string) ?? '';
  if (taskId.value) void store.load(taskId.value);
});
</script>

<template>
  <view class="d">
    <view class="d__title">配送中</view>
    <view v-if="store.current" class="d__card">
      <view
        ><text>订单</text><text>{{ store.current.bizOrderId }}</text></view
      >
    </view>
    <button @tap="goNavigate">导航</button>
    <button class="d__btn--primary" @tap="goDelivered">送达确认</button>
  </view>
</template>

<style scoped>
.d {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.d__title {
  font-size: 32rpx;
  font-weight: 600;
}
.d__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.d__btn--primary {
  background: var(--brand-primary);
  color: #fff;
}
</style>
