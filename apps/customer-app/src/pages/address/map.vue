<script setup lang="ts">
import { ref } from 'vue';

import MapView from '@/components/common/MapView.vue';

const lng = ref(116.4074);
const lat = ref(39.9042);

function onConfirm(): void {
  uni.setStorageSync('o2o:customer:picked-coords', JSON.stringify({ lng: lng.value, lat: lat.value }));
  uni.navigateBack();
}
</script>

<template>
  <view class="addr-map">
    <view class="addr-map__title">地图选点</view>
    <text class="addr-map__hint">本阶段为占位;后续 stage 5+ 接入高德地图拖动选点</text>
    <MapView :longitude="lng" :latitude="lat" />
    <view class="addr-map__coords">
      <text>当前坐标:{{ lng.toFixed(4) }}, {{ lat.toFixed(4) }}</text>
    </view>
    <button class="addr-map__btn" @click="onConfirm">确认选点</button>
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
}
.addr-map__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
</style>
