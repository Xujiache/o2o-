<script setup lang="ts">
import { onMounted } from 'vue';

import { useAssessmentStore } from '@/stores/assessment';
import { fmtPercent } from '@/utils/earning-formula';

const store = useAssessmentStore();

onMounted(() => store.load());
</script>

<template>
  <view class="a">
    <view class="a__title">考核中心</view>
    <view v-if="store.data" class="a__card">
      <view class="a__row"
        ><text>考核期</text><text>{{ store.data.period }}</text></view
      >
      <view class="a__row"
        ><text>准时率</text><text>{{ fmtPercent(store.data.onTimeRate) }}</text></view
      >
      <view class="a__row"
        ><text>接单率</text><text>{{ fmtPercent(store.data.acceptRate) }}</text></view
      >
      <view class="a__row"
        ><text>投诉率</text><text>{{ fmtPercent(store.data.complaintRate) }}</text></view
      >
      <view class="a__row"
        ><text>评分</text><text>{{ store.data.avgRating }}</text></view
      >
      <view class="a__row"
        ><text>城市排名</text><text>{{ store.data.rankInCity ?? '-' }}</text></view
      >
    </view>
    <view v-if="store.data?.badges.length" class="a__badges">
      <text class="a__badges-title">勋章</text>
      <text v-for="b in store.data.badges" :key="b.code" class="a__badge">{{ b.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.a {
  padding: 24rpx;
}
.a__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.a__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.a__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.a__row:last-child {
  border-bottom: none;
}
.a__badges {
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 16rpx;
}
.a__badges-title {
  font-size: 28rpx;
  font-weight: 600;
}
.a__badge {
  display: inline-block;
  background: #ffb400;
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  margin: 8rpx;
}
</style>
