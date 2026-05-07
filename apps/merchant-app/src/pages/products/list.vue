<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { batchSetSaleStatus, listProducts, type ProductItemVo, setSaleStatus } from '@/api';
import FloatTabBar from '@/components/common/FloatTabBar.vue';

const list = ref<ProductItemVo[]>([]);
const total = ref(0);
const loading = ref(false);
const checked = ref<string[]>([]);
const selectMode = ref(false);

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

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});

function enterSelectMode(): void {
  selectMode.value = true;
}

function exitSelectMode(): void {
  selectMode.value = false;
  checked.value = [];
}

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
  uni.showToast({ title: `已上架 ${checked.value.length} 个`, icon: 'success' });
  exitSelectMode();
  await load();
}

async function onBatchOff(): Promise<void> {
  if (checked.value.length === 0) return;
  await batchSetSaleStatus(checked.value, 'off_shelf');
  uni.showToast({ title: `已下架 ${checked.value.length} 个`, icon: 'success' });
  exitSelectMode();
  await load();
}

function onAdd(): void {
  uni.navigateTo({ url: '/pages/products/edit' });
}

function onEdit(productId: string): void {
  uni.navigateTo({ url: `/pages/products/edit?productId=${productId}` });
}

function onCardTap(p: ProductItemVo): void {
  if (selectMode.value) toggleCheck(p.productId);
  else onEdit(p.productId);
}

function fmtYuan(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function statusLabel(s: string): string {
  return (
    {
      on_shelf: '在售',
      off_shelf: '已下架',
      sold_out: '售罄',
      draft: '草稿',
    }[s] ?? s
  );
}

function firstChar(name: string): string {
  return name ? name.slice(0, 1) : '品';
}

function coverStyle(productId: string): string {
  const palette: Array<[string, string]> = [
    ['#FFB75E', '#ED8F03'],
    ['#FF6B6B', '#EE0979'],
    ['#11998E', '#38EF7D'],
    ['#4776E6', '#8E54E9'],
    ['#F7971E', '#FFD200'],
  ];
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  const [a, b] = palette[h % palette.length] ?? palette[0]!;
  return `background: linear-gradient(135deg, ${a}, ${b});`;
}

const onShelfCount = computed<number>(() => list.value.filter((p) => p.saleStatus === 'on_shelf').length);
const offShelfCount = computed<number>(() => list.value.filter((p) => p.saleStatus !== 'on_shelf').length);
</script>

<template>
  <view class="plist">
    <!-- Hero -->
    <view class="plist__hero">
      <view class="plist__hero-row">
        <view class="plist__hero-main">
          <text class="plist__hero-eyebrow">商品管理</text>
          <text class="plist__hero-num">{{ total }} <text class="plist__hero-num-unit">个商品</text></text>
        </view>
        <view class="plist__hero-actions">
          <view v-if="!selectMode" class="plist__hero-btn" @tap="enterSelectMode">批量管理</view>
          <view v-else class="plist__hero-btn" @tap="exitSelectMode">完成</view>
          <view class="plist__hero-btn plist__hero-btn--primary" @tap="onAdd">＋ 新增</view>
        </view>
      </view>
      <view class="plist__hero-stats">
        <view class="plist__hero-stat">
          <text class="plist__hero-stat-val">{{ onShelfCount }}</text>
          <text class="plist__hero-stat-label">在售中</text>
        </view>
        <view class="plist__hero-stat-divider" />
        <view class="plist__hero-stat">
          <text class="plist__hero-stat-val">{{ offShelfCount }}</text>
          <text class="plist__hero-stat-label">未上架 / 售罄</text>
        </view>
      </view>
    </view>

    <view v-if="loading && list.length === 0" class="plist__msg">加载中…</view>
    <view v-else-if="list.length === 0" class="plist__empty">
      <text class="plist__empty-icon">📦</text>
      <text class="plist__empty-text">还没有商品</text>
      <view class="plist__empty-btn" @tap="onAdd">＋ 新增第一个商品</view>
    </view>

    <!-- 两列瀑布流 grid -->
    <view v-else class="plist__grid">
      <view
        v-for="p in list"
        :key="p.productId"
        class="plist__card"
        :class="{
          'plist__card--off': p.saleStatus !== 'on_shelf',
          'plist__card--checked': selectMode && checked.includes(p.productId),
        }"
        @tap="onCardTap(p)"
      >
        <!-- 封面 -->
        <view class="plist__cover" :style="!p.imageUrl ? coverStyle(p.productId) : ''">
          <image v-if="p.imageUrl" :src="p.imageUrl" class="plist__cover-img" mode="aspectFill" />
          <text v-else class="plist__cover-letter">{{ firstChar(p.name) }}</text>

          <view v-if="selectMode" class="plist__check">
            <view class="plist__check-box" :class="{ 'plist__check-box--on': checked.includes(p.productId) }">
              <text v-if="checked.includes(p.productId)" class="plist__check-mark">✓</text>
            </view>
          </view>

          <view class="plist__status" :class="`plist__status--${p.saleStatus}`">
            {{ statusLabel(p.saleStatus) }}
          </view>

          <view v-if="p.saleStatus !== 'on_shelf'" class="plist__cover-mask">
            <text>{{ statusLabel(p.saleStatus) }}</text>
          </view>
        </view>

        <view class="plist__info">
          <text class="plist__name">{{ p.name }}</text>
          <view class="plist__price-row">
            <text class="plist__price">¥{{ fmtYuan(p.price) }}</text>
            <text v-if="p.hasSku === 1" class="plist__sku-tag">多规格</text>
          </view>
          <view class="plist__meta">
            <text class="plist__meta-stock">库存 {{ p.stock }}</text>
          </view>

          <view v-if="!selectMode" class="plist__actions">
            <view
              class="plist__act"
              :class="p.saleStatus === 'on_shelf' ? 'plist__act--off' : 'plist__act--on'"
              @tap.stop="onSingleToggle(p)"
            >
              {{ p.saleStatus === 'on_shelf' ? '下架' : '上架' }}
            </view>
            <view class="plist__act plist__act--ghost" @tap.stop="onEdit(p.productId)">编辑</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量底部 fixed bar -->
    <view v-if="selectMode" class="plist__bar">
      <view class="plist__bar-info">
        <text class="plist__bar-checked">已选 {{ checked.length }}</text>
        <text class="plist__bar-total">/ {{ total }}</text>
      </view>
      <view class="plist__bar-btn plist__bar-btn--ghost" @tap="onBatchOff">批量下架</view>
      <view class="plist__bar-btn plist__bar-btn--primary" @tap="onBatchOn">批量上架</view>
    </view>
    <FloatTabBar v-if="!selectMode" active="products" />
  </view>
</template>

<style scoped>
.plist {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero */
.plist__hero {
  padding: 36rpx 28rpx 56rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  color: #fff;
}
.plist__hero-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.plist__hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.plist__hero-eyebrow {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  color: rgba(255, 255, 255, 0.78);
}
.plist__hero-num {
  font-size: 56rpx;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1rpx;
}
.plist__hero-num-unit {
  font-size: 24rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.86);
  margin-left: 6rpx;
}
.plist__hero-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex-shrink: 0;
}
.plist__hero-btn {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
}
.plist__hero-btn--primary {
  background: #fff;
  color: #b7791f;
  font-weight: 700;
}
.plist__hero-stats {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.plist__hero-stat {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.plist__hero-stat-val {
  font-size: 28rpx;
  font-weight: 700;
}
.plist__hero-stat-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}
.plist__hero-stat-divider {
  width: 2rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.24);
}

/* Empty / loading */
.plist__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
}
.plist__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  padding: 120rpx 0;
}
.plist__empty-icon {
  font-size: 96rpx;
  opacity: 0.5;
}
.plist__empty-text {
  font-size: 26rpx;
  color: #8a94a6;
}
.plist__empty-btn {
  margin-top: 12rpx;
  padding: 18rpx 44rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 14rpx 36rpx rgba(183, 121, 31, 0.32);
}

/* 两列 grid */
.plist__grid {
  margin: -28rpx 16rpx 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  position: relative;
  z-index: 2;
}
.plist__card {
  background: #fff;
  border-radius: 22rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.06);
  border: 2rpx solid transparent;
  transition: border-color 0.15s;
}
.plist__card--checked {
  border-color: #b7791f;
}
.plist__card--off {
  opacity: 0.78;
}

/* 封面 */
.plist__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plist__cover-img {
  width: 100%;
  height: 100%;
}
.plist__cover-letter {
  font-size: 88rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}
.plist__cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plist__check {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  z-index: 2;
}
.plist__check-box {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  border: 2rpx solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plist__check-box--on {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  border-color: transparent;
}
.plist__check-mark {
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1;
}

.plist__status {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  z-index: 2;
}
.plist__status--on_shelf {
  background: rgba(56, 239, 125, 0.95);
  color: #064f30;
}
.plist__status--off_shelf {
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
}
.plist__status--sold_out {
  background: rgba(255, 77, 79, 0.95);
  color: #fff;
}
.plist__status--draft {
  background: rgba(255, 255, 255, 0.92);
  color: #5a6275;
}

.plist__info {
  padding: 16rpx 18rpx 18rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.plist__name {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.plist__price-row {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.plist__price {
  font-size: 32rpx;
  font-weight: 800;
  color: #d33;
  line-height: 1;
}
.plist__sku-tag {
  background: rgba(183, 121, 31, 0.12);
  color: #b7791f;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 700;
}
.plist__meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 20rpx;
  color: #8a94a6;
}
.plist__actions {
  margin-top: 6rpx;
  display: flex;
  gap: 8rpx;
}
.plist__act {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  padding: 10rpx 0;
  border-radius: 12rpx;
  font-weight: 600;
}
.plist__act--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.plist__act--on {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
}
.plist__act--off {
  background: rgba(217, 51, 51, 0.1);
  color: #d33;
}

/* 批量底部 fixed bar */
.plist__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 16rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.04);
  z-index: 50;
}
.plist__bar-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.plist__bar-checked {
  font-size: 32rpx;
  font-weight: 800;
  color: #172033;
}
.plist__bar-total {
  font-size: 22rpx;
  color: #8a94a6;
}
.plist__bar-btn {
  padding: 18rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}
.plist__bar-btn--ghost {
  background: rgba(217, 51, 51, 0.08);
  color: #d33;
}
.plist__bar-btn--primary {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  box-shadow: 0 12rpx 28rpx rgba(183, 121, 31, 0.32);
}
</style>
