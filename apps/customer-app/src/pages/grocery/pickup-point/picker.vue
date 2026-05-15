<script setup lang="ts">
/**
 * 生鲜自营 — 选自提点页(GR-1)
 *
 * 进入方式:
 *  1. uni.navigateTo({ url: '/pages/grocery/pickup-point/picker', events: { 'pickup:selected': (vo) => ... } })
 *  2. 用户点选某个自提点 → emit 'pickup:selected' + navigateBack
 *
 * 列表按用户位置距离升序;若取不到位置则按更新时间倒序。
 */
import { onMounted, ref } from 'vue';

import { listPickupPoints, type PickupPointVo } from '@/api/pickup-points';

const loading = ref(true);
const list = ref<PickupPointVo[]>([]);
const userLng = ref<number | null>(null);
const userLat = ref<number | null>(null);
const errorMsg = ref('');

function fmtDistance(m?: number): string {
  if (m === undefined) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

async function loadList(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await listPickupPoints({
      lng: userLng.value ?? undefined,
      lat: userLat.value ?? undefined,
      limit: 50,
    });
    if (res.code === '0' && res.data) {
      list.value = res.data.list;
    } else {
      errorMsg.value = res.message ?? '加载失败';
    }
  } catch {
    errorMsg.value = '网络错误';
  } finally {
    loading.value = false;
  }
}

function tryGetLocation(): void {
  uni.getLocation({
    type: 'wgs84',
    success: (pos) => {
      userLng.value = pos.longitude;
      userLat.value = pos.latitude;
      void loadList();
    },
    fail: () => {
      void loadList();
    },
  });
}

onMounted(() => {
  tryGetLocation();
});

function pick(p: PickupPointVo): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const page = (getCurrentPages?.() ?? []).slice(-1)[0] as { getOpenerEventChannel?: () => unknown } | undefined;
  const channel = page?.getOpenerEventChannel?.() as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (channel?.emit) {
    channel.emit('pickup:selected', p);
  }
  uni.navigateBack();
}
</script>

<template>
  <view class="picker">
    <view class="picker__hero">
      <text class="picker__title">选择自提点</text>
      <text class="picker__subtitle">{{ userLng !== null ? '已按距离排序' : '按更新时间排序' }}</text>
    </view>

    <view v-if="loading" class="picker__empty">加载中...</view>
    <view v-else-if="errorMsg" class="picker__empty picker__empty--err">{{ errorMsg }}</view>
    <view v-else-if="list.length === 0" class="picker__empty">暂无可用自提点</view>

    <view v-else class="picker__list">
      <view
        v-for="p in list"
        :key="p.pickupPointId"
        class="picker__card"
        :class="{ 'picker__card--suspended': p.status === 'suspended' }"
        @click="p.status === 'active' && pick(p)"
      >
        <view class="picker__card-head">
          <text class="picker__card-name">{{ p.name }}</text>
          <text v-if="p.distanceMeters !== undefined" class="picker__card-dist">{{
            fmtDistance(p.distanceMeters)
          }}</text>
        </view>
        <view class="picker__card-row">
          <text class="picker__card-addr">{{ p.address }}</text>
        </view>
        <view class="picker__card-row">
          <text class="picker__card-hour">营业 {{ p.businessHourStart }} - {{ p.businessHourEnd }}</text>
          <text v-if="p.contactPhone" class="picker__card-phone">{{ p.contactPhone }}</text>
        </view>
        <view v-if="p.notice" class="picker__card-notice">{{ p.notice }}</view>
        <view v-if="p.status === 'suspended'" class="picker__card-badge">临时停业</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.picker {
  min-height: 100vh;
  background: #f5f7fa;
}
.picker__hero {
  padding: 40rpx 32rpx 56rpx;
  background: linear-gradient(135deg, #5fbe7d 0%, #2e9c5d 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.picker__title {
  font-size: 40rpx;
  font-weight: 800;
}
.picker__subtitle {
  font-size: 24rpx;
  opacity: 0.9;
}
.picker__empty {
  padding: 120rpx 0;
  text-align: center;
  color: #94a3b8;
  font-size: 28rpx;
}
.picker__empty--err {
  color: #ff4d4f;
}
.picker__list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.picker__card {
  position: relative;
  padding: 28rpx 28rpx 24rpx;
  background: #fff;
  border-radius: 28rpx;
  border: 1rpx solid rgba(23, 32, 51, 0.06);
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.06);
}
.picker__card--suspended {
  opacity: 0.55;
}
.picker__card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12rpx;
}
.picker__card-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #172033;
}
.picker__card-dist {
  font-size: 24rpx;
  color: #2e9c5d;
  font-weight: 700;
}
.picker__card-row {
  display: flex;
  justify-content: space-between;
  padding: 4rpx 0;
}
.picker__card-addr {
  font-size: 26rpx;
  color: #5a6275;
  line-height: 1.5;
}
.picker__card-hour {
  font-size: 24rpx;
  color: #94a3b8;
}
.picker__card-phone {
  font-size: 24rpx;
  color: #5b5ff8;
}
.picker__card-notice {
  margin-top: 12rpx;
  padding: 8rpx 16rpx;
  background: #fff3e0;
  color: #ff8a00;
  font-size: 22rpx;
  border-radius: 12rpx;
}
.picker__card-badge {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  padding: 4rpx 14rpx;
  background: #fff3e0;
  color: #ff8a00;
  font-size: 22rpx;
  border-radius: 999rpx;
}
</style>
