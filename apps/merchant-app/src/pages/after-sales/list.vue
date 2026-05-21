<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useAfterSaleStore } from '@/stores/after-sale';
import { labelAfterSaleStatus } from '@/utils/after-sale-status';

const store = useAfterSaleStore();
const filter = ref<string | undefined>(undefined);

async function applyFilter(s: string | undefined): Promise<void> {
  filter.value = s;
  store.filterStatus = s;
  await store.refresh();
}

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function go(id: string): void {
  uni.navigateTo({ url: `/pages/after-sales/detail?afterSaleId=${id}` });
}

onMounted(() => store.refresh());
</script>

<template>
  <view class="list">
    <view class="list__filter">
      <text :class="{ on: !filter }" @tap="applyFilter(undefined)">全部</text>
      <text :class="{ on: filter === 'PENDING_MERCHANT' }" @tap="applyFilter('PENDING_MERCHANT')">待审核</text>
      <text :class="{ on: filter === 'APPROVED_BY_MERCHANT' }" @tap="applyFilter('APPROVED_BY_MERCHANT')">已通过</text>
      <text :class="{ on: filter === 'REJECTED_BY_MERCHANT' }" @tap="applyFilter('REJECTED_BY_MERCHANT')">已驳回</text>
    </view>
    <view v-if="store.loading" class="list__msg">加载中...</view>
    <view v-else-if="store.items.length === 0" class="list__msg">暂无售后单</view>
    <view v-else>
      <view v-for="a in store.items" :key="a.afterSaleId" class="list__card" @tap="go(a.afterSaleId)">
        <view class="list__row"
          ><text>{{ a.orderId }}</text
          ><text>{{ labelAfterSaleStatus(a.status) }}</text></view
        >
        <view class="list__row"
          ><text>¥{{ fmt(a.amountCents) }}</text
          ><text class="list__reason">{{ a.reason }}</text></view
        >
      </view>
    </view>
  </view>
</template>

<style scoped>
.list {
  background: #f5f5f5;
  min-height: 100vh;
}
.list__filter {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  background: #fff;
}
.list__filter text {
  padding: 8rpx 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  font-size: 24rpx;
}
.list__filter text.on {
  background: var(--brand-primary);
  color: #fff;
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
.list__reason {
  color: #888;
  font-size: 22rpx;
  max-width: 60%;
}
</style>
