<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useStatisticsStore } from '@/stores/statistics';

const store = useStatisticsStore();
const range = ref<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'>('TODAY');

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

async function pickRange(r: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'): Promise<void> {
  range.value = r;
  await store.load(r);
}

onMounted(() => store.load(range.value));
</script>

<template>
  <view class="stat">
    <view class="stat__filter">
      <text :class="{ on: range === 'TODAY' }" @tap="pickRange('TODAY')">今日</text>
      <text :class="{ on: range === 'YESTERDAY' }" @tap="pickRange('YESTERDAY')">昨日</text>
      <text :class="{ on: range === 'WEEK' }" @tap="pickRange('WEEK')">本周</text>
      <text :class="{ on: range === 'MONTH' }" @tap="pickRange('MONTH')">本月</text>
    </view>
    <view v-if="store.data" class="stat__grid">
      <view class="stat__cell"
        ><text>订单数</text><text>{{ store.data.orderCount }}</text></view
      >
      <view class="stat__cell"
        ><text>营业额</text><text>¥{{ fmt(store.data.grossCents) }}</text></view
      >
      <view class="stat__cell"
        ><text>退款</text><text>¥{{ fmt(store.data.refundCents) }}</text></view
      >
      <view class="stat__cell"
        ><text>净收入</text><text>¥{{ fmt(store.data.netCents) }}</text></view
      >
      <view class="stat__cell"
        ><text>店铺评分</text><text>{{ store.data.storeRating }}</text></view
      >
    </view>
    <view v-if="store.data && store.data.topItems.length > 0" class="stat__top">
      <text class="stat__top-title">热销商品</text>
      <view v-for="t in store.data.topItems" :key="t.productId" class="stat__top-row">
        <text>{{ t.productName }}</text>
        <text>{{ t.qty }} 份</text>
        <text>¥{{ fmt(t.grossCents) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.stat {
  padding: 16rpx;
}
.stat__filter {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
}
.stat__filter text {
  flex: 1;
  text-align: center;
  padding: 12rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
}
.stat__filter text.on {
  background: #ffb400;
  color: #fff;
}
.stat__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.stat__cell {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
}
.stat__top {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
}
.stat__top-title {
  font-size: 28rpx;
  font-weight: 600;
  padding: 8rpx 0;
}
.stat__top-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 24rpx;
}
</style>
