<script setup lang="ts">
import { onMounted } from 'vue';

import { useSettlementStore } from '@/stores/settlement';
import { STATUS_LABEL_SETTLEMENT } from '@/utils/after-sale-status';

const store = useSettlementStore();

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function go(id: string): void {
  uni.navigateTo({ url: `/pages/settlements/detail?settlementId=${id}` });
}

onMounted(() => store.refreshSettlements());
</script>

<template>
  <view class="list">
    <view v-if="store.loading" class="list__msg">加载中...</view>
    <view v-else-if="store.settlements.length === 0" class="list__msg">暂无结算单</view>
    <view v-for="s in store.settlements" :key="s.settlementId" class="list__card" @tap="go(s.settlementId)">
      <view class="list__row"
        ><text>{{ s.settlementNo }}</text
        ><text>{{ STATUS_LABEL_SETTLEMENT[s.status] }}</text></view
      >
      <view class="list__row"
        ><text>净收入</text><text class="list__amt">¥{{ fmt(s.netCents) }}</text></view
      >
      <view class="list__row sub"
        ><text>{{ s.orderCount }} 单</text></view
      >
    </view>
  </view>
</template>

<style scoped>
.list {
  background: #f5f5f5;
  min-height: 100vh;
  padding-top: 16rpx;
}
.list__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.list__card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.list__row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
}
.list__row.sub {
  color: #888;
  font-size: 22rpx;
}
.list__amt {
  font-weight: 600;
  color: #d33;
}
</style>
