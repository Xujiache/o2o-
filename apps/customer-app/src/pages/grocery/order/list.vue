<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { type GroceryOrderVo, listGroceryOrders, statusLabel, statusTheme } from '@/api/grocery-orders';

const loading = ref(true);
const orders = ref<GroceryOrderVo[]>([]);

function yuan(cents?: string | null): string {
  return (Number(cents ?? 0) / 100).toFixed(2);
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const r = await listGroceryOrders({ pageSize: 50 });
    if (r.code === '0' && r.data) {
      orders.value = r.data.list;
    }
  } finally {
    loading.value = false;
  }
}

function gotoDetail(o: GroceryOrderVo): void {
  uni.navigateTo({ url: `/pages/grocery/order/detail?orderId=${o.orderId}` });
}

function gotoErrandTab(): void {
  uni.navigateTo({ url: '/pages/errand/order/list' });
}

onMounted(() => void loadData());
onShow(() => void loadData());
</script>

<template>
  <view class="list">
    <view class="list__tabs">
      <view class="list__tab list__tab--active"><text>生鲜</text></view>
      <view class="list__tab" @click="gotoErrandTab"><text>跑腿</text></view>
    </view>

    <view v-if="loading" class="list__empty">加载中...</view>
    <view v-else-if="orders.length === 0" class="list__empty">暂无订单</view>

    <view v-else class="list__items">
      <view v-for="o in orders" :key="o.orderId" class="list__card" @click="gotoDetail(o)">
        <view class="list__card-head">
          <text class="list__card-num">订单 #{{ o.orderId }}</text>
          <text class="list__card-status" :class="`list__card-status--${statusTheme(o.status)}`">{{
            statusLabel(o.status)
          }}</text>
        </view>
        <view v-for="it in o.items" :key="it.itemId" class="list__card-item">
          <text class="list__card-item-name">{{ it.productNameSnapshot }}</text>
          <text class="list__card-item-portion"
            >× {{ it.portions }} ({{ (it.estimatedWeightGrams / 500).toFixed(2) }} 斤)</text
          >
        </view>
        <view class="list__card-foot">
          <view>
            <text class="list__card-foot-label">{{
              o.finalAmountCents !== null && o.finalAmountCents !== undefined ? '实付' : '预付'
            }}</text>
            <text class="list__card-foot-val">¥ {{ yuan(o.finalAmountCents ?? o.estimatedAmountCents) }}</text>
          </view>
          <text v-if="o.pickupCode" class="list__card-pickup">自提码 {{ o.pickupCode }}</text>
        </view>
      </view>
    </view>
    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.list {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100rpx;
}
.list__tabs {
  display: flex;
  background: #fff;
  padding: 16rpx 24rpx;
  gap: 16rpx;
  border-bottom: 1rpx solid rgba(23, 32, 51, 0.06);
}
.list__tab {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  border-radius: 999rpx;
}
.list__tab--active {
  background: var(--brand-primary);
  color: #fff;
  font-weight: 700;
}
.list__empty {
  padding: 120rpx 0;
  text-align: center;
  color: #94a3b8;
}
.list__items {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.list__card {
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.list__card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.list__card-num {
  font-size: 22rpx;
  color: #94a3b8;
}
.list__card-status {
  font-size: 24rpx;
  font-weight: 700;
}
.list__card-status--warn {
  color: var(--brand-primary);
}
.list__card-status--ok {
  color: var(--brand-primary);
}
.list__card-status--err {
  color: var(--price-color);
}
.list__card-status--info {
  color: #2563eb;
}
.list__card-item {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
}
.list__card-item-name {
  font-size: 28rpx;
  color: var(--text-primary);
  font-weight: 700;
}
.list__card-item-portion {
  font-size: 24rpx;
  color: var(--text-secondary);
}
.list__card-foot {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(23, 32, 51, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.list__card-foot-label {
  font-size: 22rpx;
  color: #94a3b8;
}
.list__card-foot-val {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--price-color);
  margin-left: 8rpx;
}
.list__card-pickup {
  padding: 6rpx 16rpx;
  background: #ecfdf5;
  color: var(--brand-primary);
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 999rpx;
  letter-spacing: 4rpx;
}
</style>
