<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { batchSetSaleStatus, listProducts, setSaleStatus, type ProductItemVo } from '@/api';

const list = ref<ProductItemVo[]>([]);
const total = ref(0);
const loading = ref(false);
const checked = ref<string[]>([]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listProducts({ pageNo: 1, pageSize: 50 });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function toggleCheck(id: string): void {
  const i = checked.value.indexOf(id);
  if (i >= 0) checked.value.splice(i, 1);
  else checked.value.push(id);
}

async function onSingleToggle(p: ProductItemVo): Promise<void> {
  const target = p.saleStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf';
  await setSaleStatus(p.productId, target);
  await load();
}

async function onBatchOn(): Promise<void> {
  if (checked.value.length === 0) return;
  await batchSetSaleStatus(checked.value, 'on_shelf');
  checked.value = [];
  await load();
}

async function onBatchOff(): Promise<void> {
  if (checked.value.length === 0) return;
  await batchSetSaleStatus(checked.value, 'off_shelf');
  checked.value = [];
  await load();
}

function onAdd(): void {
  uni.navigateTo({ url: '/pages/products/edit' });
}
</script>

<template>
  <view class="plist">
    <view class="plist__title">商品列表(共 {{ total }})</view>
    <view class="plist__bar">
      <button class="plist__btn" @click="onBatchOn">批量上架</button>
      <button class="plist__btn" @click="onBatchOff">批量下架</button>
      <button class="plist__btn plist__btn--primary" @click="onAdd">新增商品</button>
    </view>
    <view v-if="loading">加载中...</view>
    <view v-else>
      <view v-for="p in list" :key="p.productId" class="plist__item">
        <checkbox :checked="checked.includes(p.productId)" @click="toggleCheck(p.productId)" />
        <view class="plist__main">
          <text class="plist__name">{{ p.name }}</text>
          <text class="plist__meta">价格 {{ p.price }} 分 / 库存 {{ p.stock }} / {{ p.saleStatus }}</text>
        </view>
        <button class="plist__act" @click="onSingleToggle(p)">
          {{ p.saleStatus === 'on_shelf' ? '下架' : '上架' }}
        </button>
      </view>
      <view v-if="list.length === 0" class="plist__empty">暂无商品</view>
    </view>
  </view>
</template>

<style scoped>
.plist {
  padding: 32rpx;
}
.plist__title {
  font-size: 32rpx;
  font-weight: 600;
}
.plist__bar {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 0;
}
.plist__btn {
  background: #fff;
  border: 1rpx solid #ddd;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
}
.plist__btn--primary {
  background: #4c84ff;
  color: #fff;
  border: none;
  margin-left: auto;
}
.plist__item {
  background: #fff;
  padding: 24rpx;
  margin-top: 12rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.plist__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.plist__name {
  font-size: 28rpx;
  font-weight: 500;
}
.plist__meta {
  font-size: 22rpx;
  color: #888;
}
.plist__act {
  font-size: 22rpx;
  background: #4c84ff;
  color: #fff;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
}
.plist__empty {
  text-align: center;
  color: #999;
  padding: 64rpx 0;
}
</style>
