<script setup lang="ts">
/**
 * GR-4 运营员拣货池
 */
import { onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

import { isOk } from '@o2o/contracts';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { type GroceryStatus, type PickingOrderListItemVo, listPickingOrders, statusLabel } from '@/api/grocery-orders';

const loading = ref(true);
const orders = ref<PickingOrderListItemVo[]>([]);
const filter = ref<'' | GroceryStatus>('');

const filterOptions: Array<{ value: '' | GroceryStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'paid', label: '待拣货' },
  { value: 'picking', label: '拣货中' },
  { value: 'weigh_settled', label: '已称重' },
  { value: 'pickup_ready', label: '待自提' },
];

function yuan(cents?: string | null): string {
  return (Number(cents ?? 0) / 100).toFixed(2);
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const r = await listPickingOrders({
      status: filter.value || undefined,
      pageSize: 50,
    });
    if (isOk(r)) {
      orders.value = r.data.list;
    }
  } finally {
    loading.value = false;
  }
}

function setFilter(v: '' | GroceryStatus): void {
  filter.value = v;
  void loadData();
}

function gotoDetail(o: PickingOrderListItemVo): void {
  uni.navigateTo({ url: `/pages/grocery/picking/detail?orderId=${o.orderId}` });
}

onMounted(() => void loadData());
onShow(() => void loadData());
</script>

<template>
  <view class="pool">
    <view class="pool__hero">
      <text class="pool__title">生鲜拣货池</text>
      <text class="pool__subtitle">按时间升序,先来先拣</text>
    </view>

    <view class="pool__filter">
      <view
        v-for="f in filterOptions"
        :key="f.value"
        class="pool__filter-chip"
        :class="{ 'pool__filter-chip--active': filter === f.value }"
        @click="setFilter(f.value)"
      >
        <text>{{ f.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="pool__empty">加载中...</view>
    <view v-else-if="orders.length === 0" class="pool__empty">暂无订单</view>

    <view v-else class="pool__list">
      <view
        v-for="o in orders"
        :key="o.orderId"
        class="pool__card"
        :class="`pool__card--${o.status}`"
        @click="gotoDetail(o)"
      >
        <view class="pool__card-head">
          <text class="pool__card-num">订单 #{{ o.orderId }}</text>
          <text class="pool__card-status">{{ statusLabel(o.status) }}</text>
        </view>
        <view class="pool__card-row">
          <view class="pool__card-pickup" style="display: flex; align-items: center; gap: 8rpx">
            <SvgIcon name="location-pin" :size="24" color="#5a6275" />
            <text>{{ o.pickupPointName }}</text>
          </view>
        </view>
        <view class="pool__card-row">
          <text class="pool__card-item">{{ o.itemCount }} 件商品</text>
          <text class="pool__card-amount">¥ {{ yuan(o.finalAmountCents ?? o.estimatedAmountCents) }}</text>
        </view>
        <text v-if="o.pickupCode" class="pool__card-code">自提码 {{ o.pickupCode }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pool {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100rpx;
}
.pool__hero {
  padding: 40rpx 32rpx;
  background: var(--brand-gradient);
  color: #fff;
}
.pool__title {
  font-size: 40rpx;
  font-weight: 800;
}
.pool__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}
.pool__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 24rpx;
}
.pool__filter-chip {
  padding: 12rpx 28rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  border: 1rpx solid rgba(23, 32, 51, 0.08);
}
.pool__filter-chip--active {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.pool__empty {
  padding: 120rpx 0;
  text-align: center;
  color: #94a3b8;
}
.pool__list {
  padding: 8rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.pool__card {
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
  border-left: 8rpx solid #cbd5e1;
}
.pool__card--paid {
  border-left-color: #f59e0b;
}
.pool__card--picking {
  border-left-color: #3b82f6;
}
.pool__card--weigh_settled {
  border-left-color: #8b5cf6;
}
.pool__card--pickup_ready {
  border-left-color: #2e9c5d;
}
.pool__card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.pool__card-num {
  font-size: 22rpx;
  color: #94a3b8;
}
.pool__card-status {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.pool__card-row {
  display: flex;
  justify-content: space-between;
  padding: 4rpx 0;
}
.pool__card-pickup {
  font-size: 26rpx;
  color: var(--text-secondary);
}
.pool__card-item {
  font-size: 26rpx;
  color: var(--text-secondary);
}
.pool__card-amount {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--price-color);
}
.pool__card-code {
  display: inline-block;
  margin-top: 8rpx;
  padding: 4rpx 16rpx;
  background: #ecfdf5;
  color: #2e9c5d;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 999rpx;
  letter-spacing: 4rpx;
}
</style>
