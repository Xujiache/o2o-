<template>
  <view class="page">
    <text class="title">配送轨迹</text>
    <view v-if="!track">加载中...</view>
    <view v-else>
      <view class="row">
        <text class="label">订单状态</text><text>{{ statusLabel(track.status) }}</text>
      </view>
      <view v-if="track.route" class="row">
        <text class="label">总距离</text><text>{{ track.route.totalDistanceMeters }} m</text>
      </view>
      <view v-if="track.eta != null" class="row">
        <text class="label">预计送达</text><text>{{ formatTime(track.eta) }}</text>
      </view>
      <view v-else class="hint">骑手未接单或位置未知,等待派单</view>
      <view v-if="track.trackPoints.length > 0" class="track">
        <text class="track-title">轨迹点 ({{ track.trackPoints.length }})</text>
        <view v-for="(p, i) in track.trackPoints" :key="i" class="point">
          <text>{{ p.lng.toFixed(4) }}, {{ p.lat.toFixed(4) }} ({{ p.distanceFromStart }}m)</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getErrandTrack, type ErrandTrackVo } from '@/api/errand-track';
import { statusLabel } from '@/utils/errand-status';

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
});
</script>

<style scoped>
.page {
  padding: 16px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 12px;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.label {
  color: #666;
}
.hint {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  color: #888;
  margin-top: 12px;
}
.track {
  margin-top: 16px;
}
.track-title {
  font-weight: bold;
  display: block;
}
.point {
  padding: 4px 0;
  font-size: 12px;
  color: #555;
}
</style>
