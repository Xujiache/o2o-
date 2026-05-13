<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { listGroceryProducts, type GroceryProductItem } from '@/api/grocery-products';
import { useGroceryCartStore } from '@/stores/grocery-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useGroceryCartStore();
const products = ref<GroceryProductItem[]>([]);
const loading = ref(false);

const banners = [
  { title: '本地直采 · 当日新鲜', sub: '凌晨 5 点入仓,午前到柜', tone: 'a' },
  { title: '扫码可溯源', sub: '产地 · 检测 · 物流全可追', tone: 'b' },
];

const quickEntries = [
  { key: 'list', icon: 'list', label: '全部商品', tone: '#11998e' },
  { key: 'pickup', icon: 'location-pin', label: '自提点', tone: '#5b5ff8' },
  { key: 'trace', icon: 'radio-tower', label: '扫码溯源', tone: '#ff6b35' },
  { key: 'orders', icon: 'clipboard', label: '我的订单', tone: '#fa709a' },
];

const cartTotalCount = computed(() => cart.totalCount);
const cartTotalCents = computed(() => cart.estimatedAmountCents);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listGroceryProducts({ pageNo: 1, pageSize: 20, sort: 'new' });
    if (r.code === '0' && r.data) {
      products.value = r.data.items;
    }
  } finally {
    loading.value = false;
  }
}

function goList(): void {
  uni.navigateTo({ url: '/pages/grocery/product/list' });
}

function goDetail(productId: string): void {
  uni.navigateTo({ url: `/pages/grocery/product/detail?productId=${productId}` });
}

function goPickup(): void {
  uni.navigateTo({ url: '/pages/grocery/pickup-point/list' });
}

function goTrace(): void {
  uni.navigateTo({ url: '/pages/trace/scan' });
}

function goOrders(): void {
  uni.switchTab({ url: '/pages/grocery/order/list' });
}

function goCart(): void {
  uni.navigateTo({ url: '/pages/grocery/cart' });
}

function onQuickTap(key: string): void {
  if (key === 'list') goList();
  else if (key === 'pickup') goPickup();
  else if (key === 'trace') goTrace();
  else if (key === 'orders') goOrders();
}

function priceLabel(p: GroceryProductItem): string {
  if (p.pricingMode === 'weighed') {
    return `¥${formatYuan(p.unitPricePerJin ?? '0')} /斤`;
  }
  return `¥${formatYuan(p.price)}`;
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__top">
        <text class="hero__title">生鲜商城</text>
        <view class="hero__search" @tap="goList">
          <SvgIcon name="search" :size="26" color="#8a94a6" />
          <text class="hero__search-text">搜索新鲜蔬果、肉禽、海鲜...</text>
        </view>
      </view>
      <scroll-view class="banner-row" scroll-x>
        <view v-for="(b, i) in banners" :key="i" class="banner-item" :class="`banner-item--${b.tone}`">
          <text class="banner-item__title">{{ b.title }}</text>
          <text class="banner-item__sub">{{ b.sub }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="quick-grid">
      <view v-for="q in quickEntries" :key="q.key" class="quick-item" @tap="onQuickTap(q.key)">
        <view class="quick-item__icon" :style="{ background: `${q.tone}1f`, color: q.tone }">
          <SvgIcon :name="q.icon" :size="32" :color="q.tone" />
        </view>
        <text class="quick-item__label">{{ q.label }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section__head">
        <text class="section__title">每日上新</text>
        <text class="section__more" @tap="goList">查看全部 ›</text>
      </view>
      <view v-if="loading" class="section__loading">加载中...</view>
      <view v-else-if="products.length === 0" class="section__empty">暂无商品,稍后再看看</view>
      <view v-else class="product-grid">
        <view v-for="p in products" :key="p.productId" class="product-card" @tap="goDetail(p.productId)">
          <view class="product-card__image">
            <image
              v-if="p.coverImageFileId"
              class="product-card__img"
              :src="`/api/v1/pub/files/${p.coverImageFileId}`"
              mode="aspectFill"
            />
            <view v-else class="product-card__placeholder">
              <SvgIcon name="apple" :size="48" color="#c5c9d2" />
            </view>
            <view v-if="p.pricingMode === 'weighed'" class="product-card__badge">称重</view>
          </view>
          <view class="product-card__body">
            <text class="product-card__name">{{ p.name }}</text>
            <view class="product-card__price-row">
              <text class="product-card__price">{{ priceLabel(p) }}</text>
              <text class="product-card__stock">库存 {{ p.stock }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="cartTotalCount > 0" class="cart-fab" @tap="goCart">
      <view class="cart-fab__icon">
        <SvgIcon name="shopping-cart" :size="34" color="#fff" />
        <view class="cart-fab__badge">{{ cartTotalCount }}</view>
      </view>
      <view class="cart-fab__main">
        <text class="cart-fab__amount">¥{{ formatYuan(cartTotalCents) }}</text>
        <text class="cart-fab__hint">已选 {{ cartTotalCount }} 件</text>
      </view>
      <text class="cart-fab__cta">去结算</text>
    </view>

    <FloatTabBar active="grocery" />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 0 24rpx 240rpx;
  box-sizing: border-box;
  background: #fafbfc;
}
.hero {
  margin: 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  box-shadow: 0 18rpx 48rpx rgba(17, 153, 142, 0.22);
}
.hero__top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.hero__title {
  font-size: 38rpx;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.hero__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 20rpx;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999rpx;
}
.hero__search-text {
  font-size: 24rpx;
  color: #8a94a6;
}
.banner-row {
  margin-top: 22rpx;
  white-space: nowrap;
}
.banner-item {
  display: inline-flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 22rpx 24rpx;
  margin-right: 14rpx;
  border-radius: 20rpx;
  min-width: 380rpx;
  background: rgba(255, 255, 255, 0.16);
}
.banner-item--a {
  background: rgba(255, 255, 255, 0.18);
}
.banner-item--b {
  background: rgba(0, 0, 0, 0.16);
}
.banner-item__title {
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
.banner-item__sub {
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  padding: 22rpx 12rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.quick-item__icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-item__label {
  font-size: 24rpx;
  color: #172033;
  font-weight: 700;
}

.section {
  margin-top: 24rpx;
  padding: 22rpx 22rpx 22rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
}
.section__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.section__more {
  font-size: 24rpx;
  color: #11998e;
  font-weight: 600;
}
.section__loading,
.section__empty {
  text-align: center;
  color: #8a94a6;
  font-size: 25rpx;
  padding: 60rpx 0;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.product-card {
  background: #fafbfc;
  border-radius: 20rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.product-card__image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f0f2f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-card__img {
  width: 100%;
  height: 100%;
}
.product-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-card__badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  background: rgba(91, 95, 248, 0.92);
  color: #fff;
  border-radius: 999rpx;
}
.product-card__body {
  padding: 14rpx 16rpx 18rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.product-card__name {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-card__price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.product-card__price {
  font-size: 28rpx;
  font-weight: 800;
  color: #11998e;
}
.product-card__stock {
  font-size: 20rpx;
  color: #8a94a6;
}

.cart-fab {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: 130rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: #172033;
  color: #fff;
  z-index: 80;
  box-shadow: 0 18rpx 48rpx rgba(23, 32, 51, 0.32);
}
.cart-fab__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #11998e;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.cart-fab__badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  font-size: 20rpx;
  color: #fff;
  background: #ff4d4f;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-fab__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.cart-fab__amount {
  font-size: 30rpx;
  font-weight: 800;
}
.cart-fab__hint {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.72);
}
.cart-fab__cta {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #11998e;
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
}
</style>
