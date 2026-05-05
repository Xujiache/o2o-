<script setup lang="ts">
/** 商家 APP 工作台 — 入口聚合页(stage 2 简化骨架) */
import { onMounted, ref } from 'vue';

import { getStore, type StoreVo } from '@/api';

const store = ref<StoreVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getStore();
    if (r.code === '0' && r.data) store.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const entries = [
  { label: '待接单', url: '/pages/orders/pending' },
  { label: '售后申请', url: '/pages/after-sales/list' },
  { label: '评价回复', url: '/pages/reviews/list' },
  { label: '经营统计', url: '/pages/statistics/index' },
  { label: '结算记录', url: '/pages/settlements/list' },
  { label: '提现', url: '/pages/withdrawals/form' },
  { label: '提现记录', url: '/pages/withdrawals/records' },
  { label: '数据导出', url: '/pages/exports/index' },
  { label: '店铺设置', url: '/pages/store/settings' },
  { label: '营业开关', url: '/pages/store/business-status' },
  { label: '配送范围', url: '/pages/store/delivery-area' },
  { label: '商品分类', url: '/pages/products/categories' },
  { label: '商品列表', url: '/pages/products/list' },
  { label: '库存预警', url: '/pages/stock/alerts' },
  { label: '促销活动', url: '/pages/promotions/list' },
  { label: '个人中心', url: '/pages/me/index' },
];

function go(url: string): void {
  uni.navigateTo({ url });
}
</script>

<template>
  <view class="workbench">
    <view class="workbench__header">
      <view v-if="loading" class="workbench__loading">加载中...</view>
      <view v-else-if="store" class="workbench__store">
        <text class="workbench__store-name">{{ store.name }}</text>
        <text class="workbench__store-status">{{ store.businessStatus }}</text>
      </view>
      <view v-else class="workbench__empty">暂无店铺(等待审核通过)</view>
    </view>

    <view class="workbench__menu">
      <view v-for="e in entries" :key="e.url" class="workbench__item" @click="go(e.url)">
        <text>{{ e.label }}</text>
        <text class="workbench__chev">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.workbench {
  background: #f5f5f5;
  min-height: 100vh;
}
.workbench__header {
  background: #fff;
  padding: 48rpx 32rpx;
}
.workbench__store {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.workbench__store-name {
  font-size: 36rpx;
  font-weight: 600;
}
.workbench__store-status {
  font-size: 22rpx;
  color: #888;
}
.workbench__empty,
.workbench__loading {
  font-size: 28rpx;
  color: #888;
}
.workbench__menu {
  background: #fff;
  margin-top: 16rpx;
}
.workbench__item {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
}
.workbench__chev {
  color: #ccc;
  font-size: 36rpx;
}
</style>
