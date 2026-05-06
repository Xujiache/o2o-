<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const deliveryProof = ref('');
const submitting = ref(false);

const lng = 116.4 + Math.random() * 0.01;
const lat = 39.9 + Math.random() * 0.01;

async function submit(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await store.delivered(taskId.value, {
      deliveryProof: deliveryProof.value || undefined,
      lng,
      lat,
    });
    if (ok) {
      uni.showToast({ title: '已送达', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: '/pages/workbench/index' }), 600);
    } else {
      uni.showToast({ title: '操作失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
});
</script>

<template>
  <view class="d">
    <view class="d__title">送达确认</view>
    <view class="d__row">
      <text>送达凭证(选填)</text>
      <input v-model="deliveryProof" placeholder="例:photo:9001" />
    </view>
    <button type="primary" :loading="submitting" @tap="submit">确认送达</button>
  </view>
</template>

<style scoped>
.d {
  padding: 24rpx;
}
.d__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.d__row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 16rpx 0;
}
.d__row input {
  background: #fff;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
}
</style>
