<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: tab === t.value }"
        @click="switchTab(t.value)"
        >{{ t.label }}</view
      >
    </view>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="orders.length === 0" class="empty">暂无订单</view>
    <view v-else>
      <view v-for="o in orders" :key="o.orderId" class="card" @click="goDetail(o.orderId)">
        <view class="card-head">
          <text class="card-title">{{ typeLabel(o.typeCode) }} · {{ o.orderNo }}</text>
          <text class="card-status">{{ statusLabel(o.status) }}</text>
        </view>
        <view class="card-body">
          <text>{{ o.deliveryAddress }}</text>
        </view>
        <view class="card-foot">
          <text class="amount">¥{{ formatYuan(o.payableAmount) }}</text>
          <text class="urgent">{{ urgentLabel(o.urgentLevel) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

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

onMounted(load);
</script>

<style scoped>
.page {
  padding: 12px;
}
.tabs {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  overflow-x: auto;
}
.tab {
  padding: 6px 12px;
  border-radius: 16px;
  background: #f5f5f5;
  font-size: 14px;
}
.tab.active {
  background: #1a73e8;
  color: #fff;
}
.empty {
  padding: 40px 0;
  text-align: center;
  color: #888;
}
.card {
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
}
.card-head {
  display: flex;
  justify-content: space-between;
}
.card-title {
  font-weight: bold;
}
.card-status {
  color: #1a73e8;
  font-size: 13px;
}
.card-body {
  padding: 8px 0;
  font-size: 14px;
  color: #444;
}
.card-foot {
  display: flex;
  justify-content: space-between;
}
.amount {
  font-weight: bold;
  color: #ed6c02;
}
.urgent {
  font-size: 13px;
  color: #888;
}
</style>
