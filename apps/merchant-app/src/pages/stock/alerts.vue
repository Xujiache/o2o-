<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { listStockAlerts, setStockThreshold, type StockAlertItemVo } from '@/api';

const list = ref<StockAlertItemVo[]>([]);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listStockAlerts();
    if (r.code === '0' && r.data) list.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onChangeThreshold(p: StockAlertItemVo, value: string): Promise<void> {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return;
  await setStockThreshold(p.productId, n);
  await load();
}
</script>

<template>
  <view class="alerts">
    <view class="alerts__title">库存预警</view>
    <view v-if="loading">加载中...</view>
    <view v-else>
      <view v-for="p in list" :key="p.productId" class="alerts__item">
        <view class="alerts__main">
          <text class="alerts__name">{{ p.productName }}</text>
          <text class="alerts__meta">库存 {{ p.currentStock }} / 阈值 {{ p.threshold }}</text>
        </view>
        <input
          class="alerts__field"
          type="number"
          :value="p.threshold"
          @blur="(e: any) => onChangeThreshold(p, e.detail.value)"
        />
      </view>
      <view v-if="list.length === 0" class="alerts__empty">无预警商品</view>
    </view>
  </view>
</template>

<style scoped>
.alerts {
  padding: 32rpx;
}
.alerts__title {
  font-size: 36rpx;
  font-weight: 600;
}
.alerts__item {
  background: #fff;
  padding: 24rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.alerts__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.alerts__name {
  font-size: 28rpx;
}
.alerts__meta {
  font-size: 22rpx;
  color: #ff4d4f;
}
.alerts__field {
  width: 120rpx;
  font-size: 24rpx;
  padding: 12rpx;
  border: 1rpx solid #ddd;
  border-radius: 6rpx;
}
.alerts__empty {
  text-align: center;
  color: #888;
  padding: 64rpx 0;
}
</style>
