<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { listPickupPoints, type PickupPoint } from '@/api/pickup-points';

type Tab = 'list' | 'map';

const tab = ref<Tab>('list');
const keyword = ref('');
const points = ref<PickupPoint[]>([]);
const loading = ref(false);
const location = ref<{ lng: number; lat: number } | null>(null);

/** 是否回选模式;若来自结算页,返回选择 */
const returnMode = ref(false);

const mapCenter = computed(() => {
  if (location.value) return location.value;
  if (points.value[0]) return { lng: points.value[0].lng, lat: points.value[0].lat };
  return { lng: 116.4, lat: 39.9 };
});
const mapMarkers = computed(() =>
  points.value.slice(0, 30).map((p, idx) => ({
    id: idx + 1,
    latitude: p.lat,
    longitude: p.lng,
    title: p.name,
    callout: { content: p.name, display: 'BYCLICK', color: '#172033', fontSize: 12 },
  })),
);

async function tryGetLocation(): Promise<void> {
  try {
    const res = await new Promise<{ longitude: number; latitude: number }>((resolve, reject) => {
      uni.getLocation({ type: 'gcj02', success: resolve, fail: reject });
    });
    location.value = { lng: res.longitude, lat: res.latitude };
  } catch {
    location.value = null;
  }
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Parameters<typeof listPickupPoints>[0] = {};
    if (location.value) {
      params.lng = location.value.lng;
      params.lat = location.value.lat;
    }
    if (keyword.value) params.keyword = keyword.value;
    const r = await listPickupPoints(params);
    if (r.code === '0' && r.data) points.value = r.data;
  } finally {
    loading.value = false;
  }
}

function fmtDistance(distanceM?: number): string {
  if (distanceM == null) return '';
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

function onSelect(p: PickupPoint): void {
  if (returnMode.value) {
    try {
      uni.setStorageSync('o2o:customer:grocery-pick-result', JSON.stringify(p));
    } catch {
      /* ignore */
    }
    uni.navigateBack();
    return;
  }
  uni.showModal({
    title: p.name,
    content: `${p.address}\n电话:${p.phone}`,
    showCancel: false,
  });
}

function onSearch(): void {
  void load();
}

onMounted(async () => {
  const pages = (getCurrentPages?.() ?? []) as Array<{ options?: { from?: string } }>;
  const from = pages[pages.length - 1]?.options?.from;
  returnMode.value = from === 'checkout';
  await tryGetLocation();
  await load();
});
</script>

<template>
  <view class="page">
    <view class="topbar">
      <view class="search">
        <SvgIcon name="search" :size="26" color="#8a94a6" />
        <input
          v-model="keyword"
          class="search__input"
          placeholder="搜索自提点名称/地址"
          confirm-type="search"
          @confirm="onSearch"
        />
      </view>
      <view class="tabs">
        <view class="tab-chip" :class="{ 'tab-chip--active': tab === 'list' }" @tap="tab = 'list'">列表</view>
        <view class="tab-chip" :class="{ 'tab-chip--active': tab === 'map' }" @tap="tab = 'map'">地图</view>
      </view>
    </view>

    <view v-if="tab === 'map'" class="map-wrap">
      <map class="map" :latitude="mapCenter.lat" :longitude="mapCenter.lng" :markers="mapMarkers" :scale="13" />
    </view>

    <scroll-view v-else scroll-y class="list">
      <view v-if="loading && points.length === 0" class="empty">加载中...</view>
      <view v-else-if="points.length === 0" class="empty">附近暂无自提点</view>
      <view v-for="p in points" :key="p.pickupPointId" class="card" @tap="onSelect(p)">
        <view class="card__head">
          <text class="card__name">{{ p.name }}</text>
          <text v-if="p.distanceM != null" class="card__distance">{{ fmtDistance(p.distanceM) }}</text>
        </view>
        <view class="card__row">
          <SvgIcon name="location-pin" :size="22" color="#8a94a6" />
          <text class="card__text">{{ p.province }}{{ p.city }}{{ p.district }} {{ p.address }}</text>
        </view>
        <view class="card__row">
          <SvgIcon name="phone" :size="22" color="#8a94a6" />
          <text class="card__text">{{ p.phone }}</text>
        </view>
        <view v-if="returnMode" class="card__cta">点击选择此自提点 ›</view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.topbar {
  padding: 18rpx 24rpx 14rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.04);
}
.search {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.search__input {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
}
.tabs {
  display: flex;
  gap: 14rpx;
}
.tab-chip {
  padding: 8rpx 28rpx;
  font-size: 24rpx;
  color: #5a6275;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.tab-chip--active {
  background: #11998e;
  color: #fff;
}
.map-wrap {
  flex: 1;
}
.map {
  width: 100%;
  height: 100%;
}
.list {
  flex: 1;
  padding: 18rpx 24rpx 40rpx;
}
.empty {
  padding: 140rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
}
.card {
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
}
.card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}
.card__name {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.card__distance {
  font-size: 22rpx;
  color: #11998e;
  font-weight: 700;
}
.card__row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 8rpx;
}
.card__text {
  font-size: 24rpx;
  color: #5a6275;
  flex: 1;
}
.card__cta {
  margin-top: 14rpx;
  text-align: right;
  color: #11998e;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
