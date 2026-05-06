<script setup lang="ts">
import { onMounted } from 'vue';

import { useWithdrawalStore } from '@/stores/withdrawal';
import { fmtCents } from '@/utils/earning-formula';
import { STATUS_LABEL_WITHDRAWAL } from '@/utils/rider-task-status';

const store = useWithdrawalStore();

function fmtTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : '-';
}

onMounted(() => store.refresh());
</script>

<template>
  <view class="r">
    <view v-if="store.loading" class="r__msg">加载中...</view>
    <view v-else-if="store.items.length === 0" class="r__msg">暂无提现记录</view>
    <view v-for="w in store.items" :key="w.withdrawalId" class="r__card">
      <view class="r__row"
        ><text>{{ w.withdrawalNo }}</text
        ><text>{{ STATUS_LABEL_WITHDRAWAL[w.status] || w.status }}</text></view
      >
      <view class="r__row"
        ><text class="r__amt">¥{{ fmtCents(w.amountCents) }}</text
        ><text>{{ fmtTime(w.submittedAt) }}</text></view
      >
      <view v-if="w.failReason" class="r__row r__row--err"
        ><text>失败原因</text><text>{{ w.failReason }}</text></view
      >
    </view>
  </view>
</template>

<style scoped>
.r {
  padding-top: 16rpx;
  background: #f5f5f5;
  min-height: 100vh;
}
.r__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.r__card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.r__row {
  display: flex;
  justify-content: space-between;
  padding: 6rpx 0;
}
.r__amt {
  font-size: 30rpx;
  font-weight: 600;
  color: #d33;
}
.r__row--err {
  color: #d33;
  font-size: 22rpx;
}
</style>
