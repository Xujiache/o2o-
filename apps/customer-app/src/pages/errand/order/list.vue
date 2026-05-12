<script setup lang="ts">
import { onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { type ListStatusTab } from '@/api/errand-orders';
import { useErrandOrderStore } from '@/stores/errand-order';
import { statusLabel, typeLabel, urgentLabel } from '@/utils/errand-status';
import { formatYuan } from '@/utils/format-price';

const store = useErrandOrderStore();
const tab = ref<ListStatusTab>('ALL');
const loading = ref(true);
const orders = ref(store.list);

const tabs: Array<{ label: string; value: ListStatusTab }> = [
  { label: '全部', value: 'ALL' },
  { label: '待支付', value: 'WAIT_PAY' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];

async function load(): Promise<void> {
  loading.value = true;
  await store.refresh(tab.value, 1, 10);
  orders.value = store.list;
  loading.value = false;
}

async function switchTab(v: ListStatusTab): Promise<void> {
  tab.value = v;
  await load();
}

function goDetail(orderId: string): void {
  uni.navigateTo({ url: `/pages/errand/order/detail?orderId=${orderId}` });
}

function statusVariant(status: string): string {
  if (status === 'COMPLETED') return 'list__status--ok';
  if (status === 'CANCELLED') return 'list__status--mute';
  if (status === 'WAIT_PAY') return 'list__status--warn';
  return 'list__status--active';
}

onMounted(load);
</script>

<template>
  <view class="list">
    <!-- Tab 栏 -->
    <view class="list__tabs">
      <scroll-view scroll-x :show-scrollbar="false" class="list__tabs-scroll">
        <view class="list__tabs-inner">
          <view
            v-for="t in tabs"
            :key="t.value"
            class="list__tab"
            :class="{ 'list__tab--active': tab === t.value }"
            @click="switchTab(t.value)"
          >
            {{ t.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="loading" class="list__empty">加载中…</view>
    <view v-else-if="orders.length === 0" class="list__empty">
      <SvgIcon name="package" :size="120" color="#c5c9d2" />
      <text class="list__empty-text">暂无订单</text>
    </view>

    <view v-else class="list__items">
      <view v-for="o in orders" :key="o.orderId" class="list__card" @click="goDetail(o.orderId)">
        <view class="list__head">
          <view class="list__type">
            <text class="list__type-tag">{{ typeLabel(o.typeCode) }}</text>
            <text class="list__order-no">{{ o.orderNo }}</text>
          </view>
          <text class="list__status" :class="statusVariant(o.status)">{{ statusLabel(o.status) }}</text>
        </view>

        <view class="list__body">
          <SvgIcon name="location-pin" :size="22" color="#ff6b35" />
          <text class="list__addr">{{ o.deliveryAddress }}</text>
        </view>

        <view class="list__foot">
          <view class="list__urgent">
            <SvgIcon name="rocket" :size="20" color="#fa709a" />
            <text>{{ urgentLabel(o.urgentLevel) }}</text>
          </view>
          <text class="list__amount">¥{{ formatYuan(o.payableAmount) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.list {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 40rpx;
}

/* Tabs */
.list__tabs {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.list__tabs-scroll {
  white-space: nowrap;
}
.list__tabs-inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}
.list__tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 26rpx;
  color: #5a6275;
  flex-shrink: 0;
}
.list__tab--active {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 8rpx 20rpx rgba(91, 95, 248, 0.3);
}

/* Empty / loading */
.list__empty {
  padding: 160rpx 40rpx;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.list__empty-icon {
  font-size: 96rpx;
}
.list__empty-text {
  font-size: 28rpx;
}

/* Cards */
.list__items {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.list__card {
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.list__type {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}
.list__type-tag {
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #ebecff, #e0f7fa);
  color: #5b5ff8;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 8rpx;
}
.list__order-no {
  font-size: 22rpx;
  color: #8a94a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list__status {
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.list__status--active {
  color: #5b5ff8;
}
.list__status--ok {
  color: #11998e;
}
.list__status--warn {
  color: #ff8c42;
}
.list__status--mute {
  color: #8a94a6;
}

.list__body {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid rgba(31, 41, 55, 0.05);
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.list__addr-icon {
  font-size: 22rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.list__addr {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
  line-height: 1.4;
}

.list__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.list__urgent {
  font-size: 22rpx;
  color: #8a94a6;
}
.list__amount {
  font-size: 32rpx;
  font-weight: 800;
  color: #ff4d4f;
}
</style>
