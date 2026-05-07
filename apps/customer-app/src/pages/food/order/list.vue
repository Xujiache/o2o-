<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { type FoodOrderStatus, listOrders, type OrderListItem } from '@/api/food-orders';
import { formatYuan } from '@/utils/format-price';

type TabKey = 'all' | 'WAIT_PAY' | 'progress' | 'COMPLETED';
const tab = ref<TabKey>('all');
const list = ref<OrderListItem[]>([]);
const total = ref(0);
const loading = ref(false);

const STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '等商家接单',
  MERCHANT_ACCEPTED: '商家已接单',
  PREPARING: '备餐中',
  READY_FOR_PICKUP: '待取餐',
  RIDER_ASSIGNED: '已派骑手',
  PICKED_UP: '已取餐',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  AFTER_SALE: '售后中',
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    const status =
      tab.value === 'all' ? undefined : tab.value === 'progress' ? undefined : (tab.value as FoodOrderStatus);
    const r = await listOrders({ status, pageNo: 1, pageSize: 20 });
    if (r.code === '0' && r.data) {
      let arr = r.data.list;
      if (tab.value === 'progress') {
        const set = new Set([
          'PAID_WAIT_MERCHANT',
          'MERCHANT_ACCEPTED',
          'PREPARING',
          'READY_FOR_PICKUP',
          'RIDER_ASSIGNED',
          'PICKED_UP',
          'DELIVERING',
        ]);
        arr = arr.filter((o) => set.has(o.status));
      }
      list.value = arr;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function gotoDetail(orderId: string): void {
  uni.navigateTo({ url: '/pages/food/order/detail?orderId=' + orderId });
}

onMounted(load);
onShow(() => uni.hideTabBar({ animation: false }));
</script>

<template>
  <view class="orders">
    <view class="orders__hero">
      <text class="orders__eyebrow">Order Center</text>
      <text class="orders__title">我的订单</text>
      <text class="orders__subtitle">外卖订单状态、售后与配送详情统一追踪</text>
    </view>
    <view class="orders__tabs">
      <text
        v-for="t in ['all', 'WAIT_PAY', 'progress', 'COMPLETED'] as TabKey[]"
        :key="t"
        :class="{ active: tab === t }"
        @tap="
          tab = t;
          load();
        "
      >
        {{ { all: '全部', WAIT_PAY: '待支付', progress: '进行中', COMPLETED: '已完成' }[t] }}
      </text>
    </view>
    <view v-if="loading" class="orders__loading">加载中…</view>
    <view v-else-if="list.length === 0" class="orders__empty">暂无订单</view>
    <view v-else>
      <view v-for="o in list" :key="o.orderId" class="orders__row" @tap="gotoDetail(o.orderId)">
        <view class="orders__head">
          <text>{{ o.orderNo }}</text>
          <text class="orders__status">{{ STATUS_LABEL[o.status] ?? o.status }}</text>
        </view>
        <view class="orders__brief">{{ o.itemsBrief }}</view>
        <view class="orders__amount">合计 ¥ {{ formatYuan(o.payableAmount) }}</view>
      </view>
    </view>
    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.orders {
  padding: 28rpx 24rpx 200rpx;
}
.orders__hero {
  margin-bottom: 22rpx;
  padding: 34rpx;
  border-radius: 32rpx;
  color: #fff;
  background: linear-gradient(135deg, #273248, #56637a);
  box-shadow: 0 20rpx 54rpx rgba(23, 32, 51, 0.2);
}
.orders__eyebrow,
.orders__subtitle {
  display: block;
  color: rgba(255, 255, 255, 0.72);
  font-size: 23rpx;
}
.orders__title {
  display: block;
  margin: 12rpx 0 8rpx;
  font-size: 42rpx;
  font-weight: 800;
}
.orders__tabs {
  display: flex;
  justify-content: space-between;
  background: #fff;
  padding: 12rpx;
  border-radius: 999rpx;
  margin-bottom: 16rpx;
}
.orders__tabs text {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 999rpx;
  color: #7a8497;
}
.orders__tabs text.active {
  color: #fff;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  font-weight: 700;
}
.orders__row {
  background: #fff;
  padding: 28rpx;
  border-radius: 28rpx;
  margin-bottom: 16rpx;
}
.orders__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
  font-weight: 700;
}
.orders__status {
  color: #ff6b35;
}
.orders__brief {
  color: #555;
  margin-bottom: 8rpx;
}
.orders__amount {
  text-align: right;
  font-weight: 600;
}
.orders__loading,
.orders__empty {
  text-align: center;
  padding: 80rpx 0;
  color: #888;
}
</style>
