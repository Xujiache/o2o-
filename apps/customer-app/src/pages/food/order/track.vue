<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import { getOrderTrack, type TrackVo } from '@/api/food-track';

const orderId = ref('');
const track = ref<TrackVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getOrderTrack(orderId.value);
    if (r.code === '0' && r.data) track.value = r.data;
  } finally {
    loading.value = false;
  }
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});

onMounted(() => {
  void load();
});
</script>

<template>
  <view class="track" v-if="track">
    <view class="track__title">配送轨迹</view>
    <view class="track__source">数据源:{{ track.source === 'real' ? '实时' : '预计' }}</view>
    <view class="track__row">起点:{{ track.start.lng }}, {{ track.start.lat }}</view>
    <view class="track__row">终点:{{ track.end.lng }}, {{ track.end.lat }}</view>
    <view v-if="track.riderLocation" class="track__row">
      骑手位置:{{ track.riderLocation.lng }}, {{ track.riderLocation.lat }} ({{
        new Date(track.riderLocation.updatedAt).toLocaleTimeString()
      }})
    </view>
    <view class="track__eta">预计 {{ track.eta }} 分钟送达</view>
    <view class="track__hint">轨迹信息会随配送状态更新。</view>
  </view>
  <view v-else-if="loading" class="track__loading">加载中…</view>
</template>

<style scoped>
.track {
  padding: 30rpx;
}
.track__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.track__source {
  color: #888;
  margin-bottom: 16rpx;
}
.track__row {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.track__eta {
  color: #ff6633;
  font-weight: 600;
  font-size: 36rpx;
  text-align: center;
  margin: 30rpx 0;
}
.track__hint {
  color: #888;
  font-size: 24rpx;
  text-align: center;
}
.track__loading {
  text-align: center;
  padding: 100rpx 0;
  color: #888;
}
</style>
