<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useSettlementStore } from '@/stores/settlement';
import { STATUS_LABEL_SETTLEMENT } from '@/utils/after-sale-status';

const settlementId = ref('');
const store = useSettlementStore();

const item = computed(() => store.settlements.find((s) => s.settlementId === settlementId.value));

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  settlementId.value = (opts.query?.settlementId ?? '') as string;
  if (store.settlements.length === 0) void store.refreshSettlements();
});
</script>

<template>
  <view class="d">
    <view v-if="item" class="d__card">
      <view class="d__row"
        ><text>结算单号</text><text>{{ item.settlementNo }}</text></view
      >
      <view class="d__row"
        ><text>状态</text><text>{{ STATUS_LABEL_SETTLEMENT[item.status] }}</text></view
      >
      <view class="d__row"
        ><text>结算周期</text><text>{{ fmtDate(item.periodStart) }} ~ {{ fmtDate(item.periodEnd) }}</text></view
      >
      <view class="d__row"
        ><text>订单数</text><text>{{ item.orderCount }}</text></view
      >
      <view class="d__row"
        ><text>毛收入</text><text>¥{{ fmt(item.grossCents) }}</text></view
      >
      <view class="d__row"
        ><text>佣金</text><text>-¥{{ fmt(item.commissionCents) }}</text></view
      >
      <view class="d__row"
        ><text>支付通道费</text><text>-¥{{ fmt(item.feeCents) }}</text></view
      >
      <view class="d__row d__row--total"
        ><text>实结</text><text class="d__amt">¥{{ fmt(item.netCents) }}</text></view
      >
    </view>
    <view v-else class="d__msg">未找到结算单</view>
  </view>
</template>

<style scoped>
.d {
  padding: 16rpx;
}
.d__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.d__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.d__row:last-child {
  border-bottom: none;
}
.d__row--total {
  font-size: 32rpx;
  font-weight: 600;
}
.d__amt {
  color: #d33;
}
.d__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
</style>
