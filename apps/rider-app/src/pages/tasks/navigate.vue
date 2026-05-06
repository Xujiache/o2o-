<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const phase = ref<'pickup' | 'delivery'>('pickup');
const submitting = ref(false);

// mock 当前位置(stage 11 接真定位)
const currentLng = 116.4 + Math.random() * 0.01;
const currentLat = 39.9 + Math.random() * 0.01;

async function arriveHere(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await store.arrivePickup(taskId.value, currentLng, currentLat);
    if (ok) {
      uni.showToast({ title: '已到店', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: `/pages/tasks/current?taskId=${taskId.value}` }), 600);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
  phase.value = (opts.query?.phase ?? 'pickup') as 'pickup' | 'delivery';
});
</script>

<template>
  <view class="nav">
    <view class="nav__title">{{ phase === 'pickup' ? '导航至取货点' : '导航至送达点' }}</view>
    <view class="nav__map">
      <text>(本阶段 mock 地图,stage 11 接 amap SDK)</text>
      <text>当前位置:{{ currentLng.toFixed(6) }}, {{ currentLat.toFixed(6) }}</text>
    </view>
    <button v-if="phase === 'pickup'" type="primary" :loading="submitting" @tap="arriveHere">已到店</button>
  </view>
</template>

<style scoped>
.nav {
  padding: 24rpx;
}
.nav__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.nav__map {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
  min-height: 200rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  align-items: center;
  justify-content: center;
  color: #888;
}
</style>
