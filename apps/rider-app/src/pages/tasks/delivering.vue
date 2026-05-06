<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');

function goNavigate(): void {
  uni.navigateTo({ url: `/pages/tasks/navigate?taskId=${taskId.value}&phase=delivery` });
}

function goDelivered(): void {
  uni.navigateTo({ url: `/pages/tasks/delivered?taskId=${taskId.value}` });
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
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
    <button type="primary" @tap="goDelivered">送达确认</button>
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
</style>
