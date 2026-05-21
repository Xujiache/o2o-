<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';
import { onMounted, ref } from 'vue';

import { getErrandTrack, type ErrandTrackVo } from '@/api/errand-track';
import { statusLabel } from '@/utils/errand-status';
import NavBar from '@/components/common/NavBar.vue';

const track = ref<ErrandTrackVo | null>(null);

function getQueryOrderId(): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const pages = (getCurrentPages?.() ?? []) as any[];
  const last = pages[pages.length - 1] as { options?: { orderId?: string } } | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return last?.options?.orderId ?? '';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

onMounted(async () => {
  const orderId = getQueryOrderId();
  if (!orderId) return;
  const r = await getErrandTrack(orderId);
  if (r.code === '0' && r.data) track.value = r.data;
  // TODO(WS): 替换轮询为 WebSocket 订阅 customer:order:${orderId},W3 agent 已建 ws-gateway 模块,接入约定见 docs/ARCHITECTURE.md
});
</script>

<template>
  <view class="track">
    <NavBar mode="float" color="#ffffff" />
    <view v-if="!track" class="track__empty">加载中…</view>

    <template v-else>
      <view class="track__hero">
        <text class="track__eyebrow">配送轨迹</text>
        <text class="track__status">{{ statusLabel(track.status) }}</text>
        <view class="track__hero-meta">
          <view v-if="track.route" class="track__hero-pill">总距离 {{ track.route.totalDistanceMeters }} m</view>
          <view v-if="track.eta != null" class="track__hero-pill">预计送达 {{ formatTime(track.eta) }}</view>
        </view>
      </view>

      <view v-if="track.eta == null" class="track__hint">
        <SvgIcon name="clock" :size="32" class="track__hint-icon" />
        <text class="track__hint-text">骑手未接单或位置未知,请耐心等待派单</text>
      </view>

      <view v-if="track.trackPoints.length > 0" class="track__card">
        <view class="track__card-head">
          <text class="track__card-title">轨迹点</text>
          <text class="track__card-count">共 {{ track.trackPoints.length }} 个</text>
        </view>
        <view class="track__points">
          <view v-for="(p, i) in track.trackPoints" :key="i" class="track__point">
            <view
              class="track__point-dot"
              :class="{
                'track__point-dot--start': i === 0,
                'track__point-dot--end': i === track.trackPoints.length - 1,
              }"
            />
            <view v-if="i < track.trackPoints.length - 1" class="track__point-line" />
            <view class="track__point-main">
              <text class="track__point-coord">{{ p.lng.toFixed(4) }}, {{ p.lat.toFixed(4) }}</text>
              <text class="track__point-dist">距起点 {{ p.distanceFromStart }} m</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.track {
  min-height: 100vh;
  padding: 0 0 60rpx;
  background: #fff;
}
.track__empty {
  padding: 160rpx 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 26rpx;
}

.track__hero {
  padding: 56rpx 32rpx 72rpx;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.track__eyebrow {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 1rpx;
}
.track__status {
  font-size: 48rpx;
  font-weight: 800;
}
.track__hero-meta {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: center;
}
.track__hero-pill {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.92);
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
}

.track__hint {
  margin: 24rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #fff8e1, #ffefc7);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.track__hint-icon {
  font-size: 36rpx;
}
.track__hint-text {
  font-size: 24rpx;
  color: #ad6800;
  flex: 1;
  line-height: 1.5;
}

.track__card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.track__card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.track__card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.track__card-count {
  font-size: 22rpx;
  color: var(--text-muted);
}

.track__points {
  padding-left: 4rpx;
}
.track__point {
  position: relative;
  padding: 14rpx 0 14rpx 32rpx;
}
.track__point-dot {
  position: absolute;
  left: 0;
  top: 22rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--brand-primary);
  border: 3rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(46, 156, 93, 0.3);
}
.track__point-dot--start {
  background: #11998e;
  box-shadow: 0 0 0 4rpx rgba(17, 153, 142, 0.18);
}
.track__point-dot--end {
  background: var(--brand-primary);
  box-shadow: 0 0 0 4rpx rgba(46, 156, 93, 0.2);
}
.track__point-line {
  position: absolute;
  left: 7rpx;
  top: 38rpx;
  bottom: -14rpx;
  width: 2rpx;
  background: rgba(46, 156, 93, 0.18);
}
.track__point-main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.track__point-coord {
  font-size: 24rpx;
  color: var(--text-primary);
  font-weight: 600;
}
.track__point-dist {
  font-size: 22rpx;
  color: var(--text-muted);
}
</style>
