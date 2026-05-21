<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import MapView from '@/components/common/MapView.vue';
import NavBar from '@/components/common/NavBar.vue';

const STORAGE_COORDS = 'o2o:customer:picked-coords';
const STORAGE_LOCATION = 'o2o:customer:picked-location';

const lng = ref<number | null>(null);
const lat = ref<number | null>(null);
const name = ref('');
const address = ref('');
const errorMsg = ref('');

const hasCoords = computed(() => lng.value != null && lat.value != null);
const displayLng = computed(() => lng.value ?? 0);
const displayLat = computed(() => lat.value ?? 0);

function onConfirm(): void {
  if (!hasCoords.value) {
    uni.showToast({ title: '请先选择位置', icon: 'none' });
    return;
  }
  const payload = { lng: lng.value, lat: lat.value, name: name.value, address: address.value };
  uni.setStorageSync(STORAGE_COORDS, JSON.stringify({ lng: lng.value, lat: lat.value }));
  uni.setStorageSync(STORAGE_LOCATION, JSON.stringify(payload));
  uni.navigateBack();
}

function chooseLocation(): void {
  errorMsg.value = '';
  uni.chooseLocation({
    latitude: lat.value ?? undefined,
    longitude: lng.value ?? undefined,
    success(res) {
      lng.value = res.longitude;
      lat.value = res.latitude;
      name.value = res.name ?? '';
      address.value = res.address ?? '';
    },
    fail(err) {
      errorMsg.value = err.errMsg || '当前平台不支持原生地图选点';
    },
  });
}

function onRegionChange(pos: { latitude: number; longitude: number }): void {
  lat.value = pos.latitude;
  lng.value = pos.longitude;
}

function restorePickedLocation(): void {
  try {
    const raw = uni.getStorageSync(STORAGE_LOCATION) as string;
    if (!raw) return;
    const parsed = JSON.parse(raw) as { lng?: number; lat?: number; name?: string; address?: string };
    if (typeof parsed.lng === 'number' && typeof parsed.lat === 'number') {
      lng.value = parsed.lng;
      lat.value = parsed.lat;
      name.value = parsed.name ?? '';
      address.value = parsed.address ?? '';
    }
  } catch {
    // ignore invalid legacy storage
  }
}

onMounted(restorePickedLocation);
</script>

<template>
  <view class="addr-map">
    <NavBar title="地图选点" />
    <view class="addr-map__title">地图选点</view>
    <text class="addr-map__hint">优先使用系统原生选点;平台不支持时保留清晰降级,不写入模拟坐标。</text>
    <button class="addr-map__btn" @click="chooseLocation">使用系统地图选点</button>
    <MapView
      v-if="hasCoords"
      :longitude="displayLng"
      :latitude="displayLat"
      :markers="[{ id: 1, longitude: displayLng, latitude: displayLat, title: name || '已选位置' }]"
      @region-change="onRegionChange"
    />
    <view v-else class="addr-map__fallback">暂未选择位置。请点击上方按钮打开系统地图。</view>
    <view v-if="hasCoords" class="addr-map__coords">
      <text>当前坐标:{{ displayLng.toFixed(6) }}, {{ displayLat.toFixed(6) }}</text>
      <text v-if="name || address">{{ name || address }}</text>
      <text v-if="name && address">{{ address }}</text>
    </view>
    <text v-if="errorMsg" class="addr-map__error">{{ errorMsg }}</text>
    <button class="addr-map__btn" :disabled="!hasCoords" @click="onConfirm">确认选点</button>
  </view>
</template>

<style scoped>
.addr-map {
  padding: 24rpx;
}
.addr-map__title {
  font-size: 36rpx;
  font-weight: 600;
}
.addr-map__hint {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 16rpx;
  display: block;
}
.addr-map__coords {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #555;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.addr-map__fallback {
  margin-top: 20rpx;
  padding: 48rpx 24rpx;
  border-radius: 12rpx;
  background: #fff;
  color: #888;
  text-align: center;
}
.addr-map__error {
  display: block;
  margin-top: 16rpx;
  color: var(--price-color);
  font-size: 24rpx;
}
.addr-map__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.addr-map__btn[disabled] {
  background: #c5d4ff;
}
</style>
