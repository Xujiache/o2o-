<script setup lang="ts">
import { computed } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useGroceryCartStore, type GroceryCartLine } from '@/stores/grocery-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useGroceryCartStore();

const totalCents = computed(() => cart.estimatedAmountCents);
const lines = computed(() => cart.lines);

function lineSubtotalCents(l: GroceryCartLine): number {
  const unit = Number(l.unitPrice);
  if (!Number.isFinite(unit)) return 0;
  if (l.pricingMode === 'fixed') return unit * l.quantity;
  return Math.round((unit * l.quantity) / 500);
}

function lineUnitLabel(l: GroceryCartLine): string {
  if (l.pricingMode === 'weighed') return `¥${formatYuan(l.unitPrice)} /斤`;
  return `¥${formatYuan(l.unitPrice)} /份`;
}

function lineQuantityLabel(l: GroceryCartLine): string {
  if (l.pricingMode === 'weighed') return `${l.quantity} g`;
  return `× ${l.quantity}`;
}

function adjustLine(l: GroceryCartLine, delta: number): void {
  if (l.pricingMode === 'weighed') {
    const step = 100;
    const next = l.quantity + delta * step;
    const min = l.minWeightG ?? 100;
    const max = l.maxWeightG ?? 5000;
    if (next < min) {
      cart.remove(l.productId);
      return;
    }
    if (next > max) {
      uni.showToast({ title: `不超过 ${max}g`, icon: 'none' });
      return;
    }
    cart.updateQuantity(l.productId, next);
  } else {
    const next = l.quantity + delta;
    if (next > l.stock) {
      uni.showToast({ title: '超出库存', icon: 'none' });
      return;
    }
    cart.updateQuantity(l.productId, next);
  }
}

function removeLine(productId: string): void {
  uni.showModal({
    title: '移除商品',
    content: '确认从购物车移除该商品吗？',
    success: (r) => {
      if (r.confirm) cart.remove(productId);
    },
  });
}

function clearAll(): void {
  if (lines.value.length === 0) return;
  uni.showModal({
    title: '清空购物车',
    content: '确认清空所有商品吗？',
    success: (r) => {
      if (r.confirm) cart.clear();
    },
  });
}

function goCheckout(): void {
  if (lines.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/grocery/checkout' });
}

function goHome(): void {
  uni.switchTab({ url: '/pages/grocery/home' });
}
</script>

<template>
  <view class="page">
    <view v-if="lines.length === 0" class="empty">
      <SvgIcon name="shopping-cart" :size="100" color="#c5c9d2" />
      <text class="empty__hint">购物车空空如也</text>
      <button class="empty__btn" @tap="goHome">去逛逛</button>
    </view>

    <template v-else>
      <view class="top">
        <text class="top__title">购物车 ({{ lines.length }})</text>
        <text class="top__clear" @tap="clearAll">清空</text>
      </view>
      <view class="list">
        <view v-for="l in lines" :key="l.productId" class="line">
          <view class="line__image">
            <image
              v-if="l.coverImageFileId"
              class="line__img"
              :src="`/api/v1/pub/files/${l.coverImageFileId}`"
              mode="aspectFill"
            />
            <view v-else class="line__placeholder">
              <SvgIcon name="apple" :size="44" color="#c5c9d2" />
            </view>
          </view>
          <view class="line__main">
            <view class="line__name-row">
              <text class="line__name">{{ l.name }}</text>
              <view v-if="l.pricingMode === 'weighed'" class="line__chip">称重</view>
            </view>
            <text class="line__unit">{{ lineUnitLabel(l) }}</text>
            <view class="line__bottom">
              <view class="stepper">
                <view class="stepper__btn" @tap="adjustLine(l, -1)">
                  <SvgIcon name="minus" :size="20" color="#172033" />
                </view>
                <text class="stepper__num">{{ lineQuantityLabel(l) }}</text>
                <view class="stepper__btn" @tap="adjustLine(l, 1)">
                  <SvgIcon name="plus" :size="20" color="#172033" />
                </view>
              </view>
              <text class="line__price">¥{{ formatYuan(lineSubtotalCents(l)) }}</text>
            </view>
          </view>
          <view class="line__remove" @tap="removeLine(l.productId)">
            <SvgIcon name="x" :size="24" color="#b6bfcd" />
          </view>
        </view>
      </view>

      <view class="bar">
        <view class="bar__total">
          <text class="bar__label">预估合计</text>
          <text class="bar__value">¥{{ formatYuan(totalCents) }}</text>
        </view>
        <button class="bar__btn" @tap="goCheckout">去结算</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fafbfc;
  padding-bottom: 200rpx;
}
.empty {
  padding: 200rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.empty__hint {
  color: #8a94a6;
  font-size: 26rpx;
}
.empty__btn {
  margin-top: 18rpx;
  padding: 0 60rpx;
  height: 78rpx;
  line-height: 78rpx;
  border-radius: 999rpx;
  background: #11998e;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
.top {
  padding: 24rpx 28rpx 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.top__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.top__clear {
  font-size: 24rpx;
  color: #ff6b35;
}
.list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.line {
  display: flex;
  gap: 18rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
  position: relative;
}
.line__image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0f2f6;
  flex-shrink: 0;
}
.line__img,
.line__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.line__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.line__name-row {
  display: flex;
  gap: 10rpx;
  align-items: center;
}
.line__name {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.line__chip {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  background: rgba(91, 95, 248, 0.12);
  color: #5b5ff8;
  border-radius: 999rpx;
}
.line__unit {
  font-size: 22rpx;
  color: #8a94a6;
}
.line__bottom {
  margin-top: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stepper {
  display: flex;
  align-items: center;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  overflow: hidden;
}
.stepper__btn {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper__num {
  min-width: 90rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #172033;
}
.line__price {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff6b35;
}
.line__remove {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 18rpx);
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.bar__total {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.bar__label {
  font-size: 22rpx;
  color: #8a94a6;
}
.bar__value {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff6b35;
}
.bar__btn {
  height: 82rpx;
  padding: 0 60rpx;
  border-radius: 999rpx;
  background: #11998e;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
</style>
