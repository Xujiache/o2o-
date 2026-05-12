<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { getTaskDetail, type RiderTaskDetailVo, type RiderTaskLocation } from '@/api/rider-tasks';
import { locationService } from '@/services/location';
import { useTaskStore } from '@/stores/task';
import { labelRiderTaskStatus } from '@/utils/rider-task-status';

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  width?: number;
  height?: number;
  callout?: {
    content: string;
    color: string;
    fontSize: number;
    borderRadius: number;
    bgColor: string;
    padding: number;
    display: 'ALWAYS' | 'BYCLICK';
  };
}

const store = useTaskStore();
const taskId = ref('');
const phase = ref<'pickup' | 'delivery'>('pickup');
const task = ref<RiderTaskDetailVo | null>(null);
const loading = ref(false);
const submitting = ref(false);
const currentLng = ref<number | null>(null);
const currentLat = ref<number | null>(null);
const fallbackTarget = ref<RiderTaskLocation | null>(null);
const locationError = ref('');

const pickupLocation = computed(() => task.value?.pickupLocation ?? null);
const deliveryLocation = computed(() => task.value?.deliveryLocation ?? null);
const targetLocation = computed(() => {
  if (phase.value === 'pickup') return pickupLocation.value ?? fallbackTarget.value;
  return deliveryLocation.value ?? fallbackTarget.value;
});

const mapLongitude = computed(
  () => currentLng.value ?? targetLocation.value?.lng ?? pickupLocation.value?.lng ?? 116.4,
);
const mapLatitude = computed(() => currentLat.value ?? targetLocation.value?.lat ?? pickupLocation.value?.lat ?? 39.9);

const mapMarkers = computed<MapMarker[]>(() => {
  const markers: MapMarker[] = [];
  if (currentLng.value != null && currentLat.value != null) {
    markers.push(makeMarker(1, currentLng.value, currentLat.value, '骑手当前位置', '#14b8a6'));
  }
  if (pickupLocation.value) {
    markers.push(
      makeMarker(
        2,
        pickupLocation.value.lng,
        pickupLocation.value.lat,
        pickupLocation.value.name || '取货点',
        '#f97316',
      ),
    );
  }
  if (deliveryLocation.value) {
    markers.push(
      makeMarker(
        3,
        deliveryLocation.value.lng,
        deliveryLocation.value.lat,
        deliveryLocation.value.name || '送达点',
        '#2563eb',
      ),
    );
  }
  if (markers.length === 1 && fallbackTarget.value) {
    markers.push(
      makeMarker(
        4,
        fallbackTarget.value.lng,
        fallbackTarget.value.lat,
        fallbackTarget.value.name || '目的地',
        '#2563eb',
      ),
    );
  }
  return markers;
});

const phaseTitle = computed(() => (phase.value === 'pickup' ? '前往取货点' : '前往送达点'));
const targetTitle = computed(() => targetLocation.value?.name || (phase.value === 'pickup' ? '取货点' : '送达点'));

function makeMarker(id: number, lng: number, lat: number, title: string, color: string): MapMarker {
  return {
    id,
    longitude: lng,
    latitude: lat,
    title,
    width: 28,
    height: 28,
    callout: {
      content: title,
      color,
      fontSize: 12,
      borderRadius: 8,
      bgColor: '#ffffff',
      padding: 8,
      display: 'ALWAYS',
    },
  };
}

async function loadDetail(): Promise<void> {
  if (!taskId.value) return;
  loading.value = true;
  try {
    const r = await getTaskDetail(taskId.value);
    if (r.code === '0' && r.data) {
      task.value = r.data;
      store.current = r.data;
    }
  } finally {
    loading.value = false;
  }
}

async function arriveHere(): Promise<void> {
  if (!taskId.value) return;
  submitting.value = true;
  try {
    const point = await getCurrentPoint();
    if (!point) return;
    const ok = await store.arrivePickup(taskId.value, point.lng, point.lat);
    if (ok) {
      uni.showToast({ title: '已到店', icon: 'success' });
      await loadDetail();
      setTimeout(() => uni.switchTab({ url: '/pages/tasks/current' }), 600);
    }
  } finally {
    submitting.value = false;
  }
}

function openNativeNavigation(): void {
  const target = targetLocation.value;
  if (!target) {
    uni.showToast({ title: '缺少目的地坐标', icon: 'none' });
    return;
  }
  uni.openLocation({
    longitude: target.lng,
    latitude: target.lat,
    name: target.name || targetTitle.value,
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

onMounted(async () => {
  const opts = readOptions();
  taskId.value = opts.taskId ?? '';
  phase.value = (opts.phase === 'delivery' ? 'delivery' : 'pickup') as 'pickup' | 'delivery';
  if (opts.lng && opts.lat) {
    fallbackTarget.value = {
      lng: Number(opts.lng),
      lat: Number(opts.lat),
      name: opts.name ?? '',
    };
  }
  await Promise.all([loadDetail(), getCurrentPoint()]);
});
</script>

<template>
  <view class="nav-page">
    <view class="nav-hero">
      <view>
        <text class="nav-hero__label">{{ task?.bizType === 'ERRAND' ? '跑腿任务' : '外卖配送' }}</text>
        <text class="nav-hero__title">{{ phaseTitle }}</text>
      </view>
      <text class="nav-hero__status">{{ labelRiderTaskStatus(task?.status ?? '') }}</text>
    </view>

    <view class="route-card">
      <view class="route-card__line">
        <view class="route-card__dot route-card__dot--pickup" />
        <view>
          <text class="route-card__name">{{ pickupLocation?.name || '取货点待同步' }}</text>
          <text class="route-card__sub">商家/取件位置</text>
        </view>
      </view>
      <view class="route-card__line">
        <view class="route-card__dot route-card__dot--delivery" />
        <view>
          <text class="route-card__name">{{ deliveryLocation?.name || '送达点待同步' }}</text>
          <text class="route-card__sub">收货/送达位置</text>
        </view>
      </view>
    </view>

    <view class="map-card">
      <map
        class="map-card__map"
        :longitude="mapLongitude"
        :latitude="mapLatitude"
        :markers="mapMarkers"
        :scale="14"
        show-location
      />
      <view v-if="loading" class="map-card__mask">正在同步任务位置</view>
      <view v-else-if="!targetLocation" class="map-card__mask">暂无目的地坐标，请刷新任务后再导航</view>
    </view>

    <view class="info-panel">
      <view class="info-panel__item">
        <text class="info-panel__label">当前位置</text>
        <text class="info-panel__value">
          {{
            currentLng != null && currentLat != null
              ? `${currentLng.toFixed(6)}, ${currentLat.toFixed(6)}`
              : locationError || '定位中'
          }}
        </text>
      </view>
      <view class="info-panel__item">
        <text class="info-panel__label">当前目的地</text>
        <text class="info-panel__value">{{ targetTitle }}</text>
      </view>
    </view>

    <view class="actions">
      <button class="actions__btn actions__btn--ghost" @tap="getCurrentPoint">重新定位</button>
      <button class="actions__btn actions__btn--primary" :disabled="!targetLocation" @tap="openNativeNavigation">
        打开系统导航
      </button>
      <button
        v-if="phase === 'pickup'"
        class="actions__btn actions__btn--success"
        :loading="submitting"
        @tap="arriveHere"
      >
        已到店
      </button>
    </view>
  </view>
</template>

<style scoped>
.nav-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  background: #fff;
  box-sizing: border-box;
}

.nav-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  box-shadow: 0 18rpx 44rpx rgba(20, 184, 166, 0.22);
}

.nav-hero__label,
.nav-hero__title {
  display: block;
}

.nav-hero__label {
  font-size: 24rpx;
  opacity: 0.82;
  margin-bottom: 8rpx;
}

.nav-hero__title {
  font-size: 40rpx;
  font-weight: 800;
}

.nav-hero__status {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 24rpx;
  flex-shrink: 0;
}

.route-card,
.info-panel {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #fff;
  border: 1rpx solid #edf0f5;
}

.route-card__line {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  padding: 12rpx 0;
}

.route-card__dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.route-card__dot--pickup {
  background: #f97316;
}

.route-card__dot--delivery {
  background: #2563eb;
}

.route-card__name,
.route-card__sub,
.info-panel__label,
.info-panel__value {
  display: block;
}

.route-card__name {
  color: #172033;
  font-size: 28rpx;
  font-weight: 700;
}

.route-card__sub {
  color: #8a94a6;
  font-size: 23rpx;
  margin-top: 4rpx;
}

.map-card {
  position: relative;
  overflow: hidden;
  margin-top: 20rpx;
  border-radius: 24rpx;
  border: 1rpx solid #edf0f5;
  background: #f8fafc;
}

.map-card__map {
  width: 100%;
  height: 540rpx;
}

.map-card__mask {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(23, 32, 51, 0.72);
  color: #fff;
  font-size: 24rpx;
  text-align: center;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.info-panel__item {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.info-panel__label {
  color: #8a94a6;
  font-size: 24rpx;
  flex-shrink: 0;
}

.info-panel__value {
  color: #172033;
  font-size: 24rpx;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 24rpx;
}

.actions__btn {
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.actions__btn::after {
  border: 0;
}

.actions__btn--ghost {
  color: #0f766e;
  background: #eefcf9;
}

.actions__btn--primary {
  color: #fff;
  background: #0f766e;
}

.actions__btn--success {
  grid-column: 1 / -1;
  color: #fff;
  background: #14b8a6;
}

.actions__btn[disabled] {
  opacity: 0.52;
}
</style>
