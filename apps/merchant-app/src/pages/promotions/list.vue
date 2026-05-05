<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { listPromotions, setPromoStatus, type PromotionItemVo } from '@/api';

const list = ref<PromotionItemVo[]>([]);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listPromotions();
    if (r.code === '0' && r.data) list.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function onAdd(): void {
  uni.navigateTo({ url: '/pages/promotions/edit' });
}

async function onPause(p: PromotionItemVo): Promise<void> {
  await setPromoStatus(p.promoId, 'paused');
  await load();
}

async function onResume(p: PromotionItemVo): Promise<void> {
  await setPromoStatus(p.promoId, 'active');
  await load();
}

async function onEnd(p: PromotionItemVo): Promise<void> {
  await setPromoStatus(p.promoId, 'ended');
  await load();
}
</script>

<template>
  <view class="promo">
    <view class="promo__bar">
      <view class="promo__title">促销活动</view>
      <button class="promo__btn" @click="onAdd">+ 新建</button>
    </view>
    <view v-if="loading">加载中...</view>
    <view v-else>
      <view v-for="p in list" :key="p.promoId" class="promo__item">
        <view class="promo__main">
          <text class="promo__name">{{ p.name }}</text>
          <text class="promo__meta">{{ p.promoType }} / {{ p.status }}</text>
        </view>
        <view class="promo__acts">
          <button v-if="p.status === 'active'" class="promo__act" @click="onPause(p)">暂停</button>
          <button v-else-if="p.status === 'paused'" class="promo__act" @click="onResume(p)">恢复</button>
          <button v-if="p.status !== 'ended'" class="promo__act promo__act--danger" @click="onEnd(p)">结束</button>
        </view>
      </view>
      <view v-if="list.length === 0" class="promo__empty">无促销活动</view>
    </view>
  </view>
</template>

<style scoped>
.promo {
  padding: 32rpx;
}
.promo__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.promo__title {
  font-size: 36rpx;
  font-weight: 600;
}
.promo__btn {
  background: #4c84ff;
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
}
.promo__item {
  background: #fff;
  padding: 24rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.promo__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.promo__name {
  font-size: 28rpx;
}
.promo__meta {
  font-size: 22rpx;
  color: #888;
}
.promo__acts {
  display: flex;
  gap: 8rpx;
}
.promo__act {
  font-size: 22rpx;
  padding: 12rpx 16rpx;
  border-radius: 6rpx;
  background: #f0f0f0;
}
.promo__act--danger {
  background: #ff4d4f;
  color: #fff;
}
.promo__empty {
  text-align: center;
  color: #888;
  padding: 64rpx 0;
}
</style>
