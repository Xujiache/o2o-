<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { onMounted } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { useEarningStore } from '@/stores/earning';
import { fmtCents } from '@/utils/earning-formula';

const store = useEarningStore();

onMounted(() => store.load());
onShow(() => uni.hideTabBar({ animation: false }));
</script>

<template>
  <view class="ec">
    <view class="ec__hero">
      <text class="ec__title">收益中心</text>
      <text class="ec__sub">收入、奖励、扣款与结算记录</text>
    </view>
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
    <FloatTabBar active="earnings" />
  </view>
</template>

<style scoped>
.ec {
  padding: 28rpx 24rpx 200rpx;
}
.ec__hero {
  padding: 34rpx;
  border-radius: 34rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 24rpx 64rpx rgba(20, 184, 166, 0.26);
}
.ec__title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}
.ec__sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 24rpx;
}
.ec__summary {
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin: 18rpx 0 16rpx;
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
  border-radius: 28rpx;
  padding: 24rpx;
}
.ec__item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
</style>
