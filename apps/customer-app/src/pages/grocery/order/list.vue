<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { listGroceryOrders, type GroceryOrderListItem, type GroceryOrderStatus } from '@/api/grocery-orders';
import { formatYuan } from '@/utils/format-price';

type Mode = 'grocery' | 'errand';
const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'grocery', label: '商城订单' },
  { key: 'errand', label: '跑腿订单' },
];
const mode = ref<Mode>('grocery');

type Tab = 'all' | 'WAIT_PAY' | 'progress' | 'COMPLETED';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'WAIT_PAY', label: '待支付' },
  { key: 'progress', label: '进行中' },
  { key: 'COMPLETED', label: '已完成' },
];
const tab = ref<Tab>('all');

const list = ref<GroceryOrderListItem[]>([]);
const loading = ref(false);

const STATUS_LABEL: Record<GroceryOrderStatus, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_PICKUP: '待自提',
  SETTLING: '称重结算中',
  DIFF_PAYING: '差价待补付',
  PICKED_UP: '已提货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const PROGRESS_SET = new Set<GroceryOrderStatus>(['PAID_WAIT_PICKUP', 'SETTLING', 'DIFF_PAYING', 'PICKED_UP']);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const status = tab.value === 'all' || tab.value === 'progress' ? undefined : (tab.value as GroceryOrderStatus);
    const r = await listGroceryOrders({ status, pageNo: 1, pageSize: 20 });
    if (r.code === '0' && r.data) {
      let arr = r.data.items;
      if (tab.value === 'progress') arr = arr.filter((o) => PROGRESS_SET.has(o.status));
      list.value = arr;
    }
  } finally {
    loading.value = false;
  }
}

function onTabChange(t: Tab): void {
  if (tab.value === t) return;
  tab.value = t;
  void load();
}

function switchMode(m: Mode): void {
  mode.value = m;
  if (m === 'errand') {
    uni.navigateTo({ url: '/pages/errand/order/list' });
  } else {
    void load();
  }
}

function goDetail(orderId: string): void {
  uni.navigateTo({ url: `/pages/grocery/order/detail?orderId=${orderId}` });
}

function fmtSlot(date: string, start: number, end: number): string {
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${date} ${fmt(start)}-${fmt(end)}`;
}

function statusVariant(s: GroceryOrderStatus): string {
  if (s === 'COMPLETED' || s === 'PICKED_UP') return 'list__status--ok';
  if (s === 'CANCELLED') return 'list__status--mute';
  if (s === 'WAIT_PAY' || s === 'DIFF_PAYING') return 'list__status--warn';
  return 'list__status--active';
}

function goShop(): void {
  uni.switchTab({ url: '/pages/grocery/home' });
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});
</script>

<template>
  <view class="page">
    <view class="modes">
      <view
        v-for="m in MODES"
        :key="m.key"
        class="mode-chip"
        :class="{ 'mode-chip--active': mode === m.key }"
        @tap="switchMode(m.key)"
      >
        {{ m.label }}
      </view>
    </view>

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ 'tab--active': tab === t.key }"
        @tap="onTabChange(t.key)"
      >
        {{ t.label }}
      </view>
    </view>

    <scroll-view scroll-y class="list">
      <view v-if="loading && list.length === 0" class="empty">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">
        <SvgIcon name="clipboard" :size="80" color="#c5c9d2" />
        <text class="empty__hint">还没有订单,去逛逛吧</text>
        <button class="empty__btn" @tap="goShop">去商城</button>
      </view>
      <view v-for="o in list" :key="o.groceryOrderId" class="order-card" @tap="goDetail(o.groceryOrderId)">
        <view class="order-card__head">
          <text class="order-card__no">订单 {{ o.orderNo }}</text>
          <text class="order-card__status" :class="statusVariant(o.status)">{{ STATUS_LABEL[o.status] }}</text>
        </view>
        <view class="order-card__items">
          <text v-for="(it, idx) in o.itemsPreview.slice(0, 3)" :key="idx" class="order-card__item">
            {{ it.productName }} × {{ it.quantity }}
          </text>
          <text v-if="o.itemsPreview.length > 3" class="order-card__item--more">
            等 {{ o.itemsPreview.length }} 件
          </text>
        </view>
        <view class="order-card__foot">
          <text class="order-card__slot">{{ fmtSlot(o.pickupDate, o.pickupStartMinute, o.pickupEndMinute) }}</text>
          <text class="order-card__amount">¥{{ formatYuan(o.finalPayableAmount ?? o.estimatedPayableAmount) }}</text>
        </view>
      </view>
    </scroll-view>

    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  padding-bottom: 200rpx;
}
.modes {
  padding: 18rpx 24rpx 8rpx;
  display: flex;
  gap: 14rpx;
  background: #fff;
}
.mode-chip {
  flex: 1;
  text-align: center;
  padding: 14rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #5a6275;
  background: #f5f6f8;
  border-radius: 16rpx;
}
.mode-chip--active {
  background: #11998e;
  color: #fff;
}
.tabs {
  padding: 12rpx 24rpx 18rpx;
  display: flex;
  gap: 12rpx;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.04);
}
.tab {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #5a6275;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.tab--active {
  background: #172033;
  color: #fff;
  font-weight: 700;
}
.list {
  flex: 1;
  padding: 18rpx 24rpx;
}
.empty {
  padding: 140rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.empty__hint {
  color: #8a94a6;
  font-size: 26rpx;
}
.empty__btn {
  margin-top: 12rpx;
  padding: 0 60rpx;
  height: 76rpx;
  line-height: 76rpx;
  background: #11998e;
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 800;
}
.order-card {
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
}
.order-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}
.order-card__no {
  font-size: 22rpx;
  color: #8a94a6;
}
.order-card__status {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
}
.list__status--ok {
  background: rgba(17, 153, 142, 0.12);
  color: #11998e;
}
.list__status--mute {
  background: #f5f6f8;
  color: #8a94a6;
}
.list__status--warn {
  background: rgba(255, 107, 53, 0.12);
  color: #ff6b35;
}
.list__status--active {
  background: rgba(91, 95, 248, 0.12);
  color: #5b5ff8;
}
.order-card__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin: 6rpx 0 14rpx;
}
.order-card__item {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #5a6275;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.order-card__item--more {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #8a94a6;
}
.order-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.order-card__slot {
  font-size: 22rpx;
  color: #5a6275;
}
.order-card__amount {
  font-size: 30rpx;
  font-weight: 800;
  color: #ff6b35;
}
</style>
