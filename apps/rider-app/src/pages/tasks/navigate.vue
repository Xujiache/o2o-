<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { locationService } from '@/services/location';
import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const phase = ref<'pickup' | 'delivery'>('pickup');
const submitting = ref(false);
const currentLng = ref<number | null>(null);
const currentLat = ref<number | null>(null);
const targetLng = ref<number | null>(null);
const targetLat = ref<number | null>(null);
const targetName = ref('');
const locationError = ref('');

async function arriveHere(): Promise<void> {
  submitting.value = true;
  try {
    const point = await getCurrentPoint();
    if (!point) return;
    const ok = await store.arrivePickup(taskId.value, point.lng, point.lat);
    if (ok) {
      uni.showToast({ title: '已到店', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/tasks/current' }), 600);
    }
  } finally {
    submitting.value = false;
  }
}

function openNativeNavigation(): void {
  if (targetLng.value == null || targetLat.value == null) {
    uni.showToast({ title: '缺少目的地坐标', icon: 'none' });
    return;
  }
  uni.openLocation({
    longitude: targetLng.value,
    latitude: targetLat.value,
    name: targetName.value || (phase.value === 'pickup' ? '取货点' : '送达点'),
    scale: 16,
  });
}

async function getCurrentPoint(): Promise<{ lng: number; lat: number } | null> {
  locationError.value = '';
  try {
    const point = await locationService.getOnce();
    currentLng.value = point.longitude;
    currentLat.value = point.latitude;
    return { lng: point.longitude, lat: point.latitude };
  } catch (err) {
    locationError.value = err instanceof Error ? err.message : '定位失败';
    uni.showToast({ title: locationError.value, icon: 'none' });
    return null;
  }
}

function readOptions(): Record<string, string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = (getCurrentPages?.() as any[])?.at(-1);
  return (page?.options ?? {}) as Record<string, string | undefined>;
}

onMounted(() => {
  const opts = readOptions();
  taskId.value = opts.taskId ?? '';
  phase.value = (opts.phase ?? 'pickup') as 'pickup' | 'delivery';
  targetLng.value = opts.lng ? Number(opts.lng) : null;
  targetLat.value = opts.lat ? Number(opts.lat) : null;
  targetName.value = opts.name ?? '';
  void getCurrentPoint();
});
</script>

<template>
  <view class="nav">
    <view class="nav__title">{{ phase === 'pickup' ? '导航至取货点' : '导航至送达点' }}</view>
    <view class="nav__map">
      <text>使用系统原生定位与地图打开能力;缺少目的地坐标时不展示模拟路线。</text>
      <text v-if="currentLng != null && currentLat != null"
        >当前位置:{{ currentLng.toFixed(6) }}, {{ currentLat.toFixed(6) }}</text
      >
      <text v-else>当前位置:{{ locationError || '定位中...' }}</text>
      <text v-if="targetLng != null && targetLat != null"
        >目的地:{{ targetLng.toFixed(6) }}, {{ targetLat.toFixed(6) }}</text
      >
      <text v-else>目的地坐标未随任务下发,暂无法打开系统导航。</text>
    </view>
    <button :disabled="targetLng == null || targetLat == null" @tap="openNativeNavigation">打开系统导航</button>
    <button v-if="phase === 'pickup'" class="nav__primary" :loading="submitting" @tap="arriveHere">已到店</button>
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
.nav button[disabled] {
  opacity: 0.55;
}
.nav__primary {
  background: #14b8a6;
  color: #fff;
}
</style>
