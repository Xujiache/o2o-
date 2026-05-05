<script setup lang="ts">
import { onMounted } from 'vue';

import { useOrderStore } from '@/stores/order';
import { labelOrderStatus } from '@/utils/food-order-status';

const store = useOrderStore();

onMounted(() => store.refresh());

function go(orderId: string): void {
  uni.navigateTo({ url: `/pages/orders/detail?orderId=${orderId}` });
}

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}
</script>

<template>
  <view class="pending">
    <view class="pending__header">
      <text>待接单 ({{ store.total }})</text>
      <text class="pending__refresh" @tap="store.refresh()">刷新</text>
    </view>
    <view v-if="store.loading" class="pending__msg">加载中...</view>
    <view v-else-if="store.pending.length === 0" class="pending__msg">暂无待接单</view>
    <view v-else>
      <view v-for="o in store.pending" :key="o.orderId" class="pending__card" @tap="go(o.orderId)">
        <view class="pending__row">
          <text class="pending__no">{{ o.orderNo }}</text>
          <text class="pending__status">{{ labelOrderStatus(o.status) }}</text>
        </view>
        <view class="pending__row">
          <text class="pending__amt">¥{{ fmt(o.payableAmountCents) }}</text>
          <text class="pending__remark">{{ o.userRemark || '-' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pending {
  background: #f5f5f5;
  min-height: 100vh;
}
.pending__header {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  font-size: 28rpx;
}
.pending__refresh {
  color: #ffb400;
}
.pending__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.pending__card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.pending__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.pending__no {
  font-size: 26rpx;
  color: #444;
}
.pending__status {
  font-size: 22rpx;
  color: #ffb400;
}
.pending__amt {
  font-size: 32rpx;
  font-weight: 600;
  color: #d33;
}
.pending__remark {
  font-size: 24rpx;
  color: #888;
  max-width: 60%;
  overflow: hidden;
}
</style>
