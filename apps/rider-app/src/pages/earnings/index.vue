<script setup lang="ts">
import { onMounted } from 'vue';

import { useEarningStore } from '@/stores/earning';
import { fmtCents } from '@/utils/earning-formula';

const store = useEarningStore();

onMounted(() => store.load());
</script>

<template>
  <view class="ec">
    <view class="ec__title">收益中心</view>
    <view v-if="store.data" class="ec__summary">
      <view class="ec__cell"
        ><text>总收入</text><text class="ec__amt">¥{{ fmtCents(store.data.totalIncome) }}</text></view
      >
      <view class="ec__row"
        ><text>订单数</text><text>{{ store.data.orderCount }}</text></view
      >
      <view class="ec__row"
        ><text>奖励</text><text>¥{{ fmtCents(store.data.rewardAmount) }}</text></view
      >
      <view class="ec__row"
        ><text>扣款</text><text>-¥{{ fmtCents(store.data.deductAmount) }}</text></view
      >
    </view>
    <view class="ec__list">
      <view v-for="i in store.data?.items" :key="i.earningId" class="ec__item">
        <view class="ec__row"
          ><text>{{ i.settleDate }}</text
          ><text>¥{{ fmtCents(i.totalAmount) }}</text></view
        >
        <view class="ec__row sub"
          ><text>{{ i.orderCount }} 单</text><text>{{ i.status }}</text></view
        >
      </view>
    </view>
  </view>
</template>

<style scoped>
.ec {
  padding: 24rpx;
}
.ec__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.ec__summary {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.ec__cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.ec__cell .ec__amt {
  font-size: 40rpx;
  font-weight: 600;
  color: #d33;
}
.ec__row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
}
.ec__row.sub {
  color: #888;
  font-size: 22rpx;
}
.ec__list {
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
}
.ec__item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
</style>
