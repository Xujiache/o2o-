<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useFoodCartStore } from '@/stores/food-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useFoodCartStore();
const storeId = ref('');
const loading = ref(false);

const items = computed(() => cart.cart?.items ?? []);
const totalAmount = computed(() => cart.cart?.totalAmount ?? '0');
const totalCount = computed(() => items.value.reduce((s, it) => s + it.quantity, 0));

async function changeQty(skuId: string, delta: number, currentQty: number): Promise<void> {
  loading.value = true;
  try {
    await cart.upsert(storeId.value, skuId, Math.max(0, currentQty + delta));
  } finally {
    loading.value = false;
  }
}

function gotoConfirm(): void {
  if (items.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/food/order/confirm?storeId=' + storeId.value });
}

function gotoStore(): void {
  if (!storeId.value) return;
  uni.navigateTo({ url: '/pages/food/store/detail?storeId=' + storeId.value });
}

onLoad((options) => {
  storeId.value = ((options?.storeId as string) ?? cart.currentStoreId ?? '') as string;
});
</script>

<template>
  <view class="cart">
    <view class="cart__header">
      <text class="cart__title">购物车</text>
      <text v-if="totalCount > 0" class="cart__count">共 {{ totalCount }} 件</text>
    </view>

    <view v-if="items.length === 0" class="cart__empty">
      <SvgIcon name="shopping-cart" :size="120" color="#c5c9d2" />
      <text class="cart__empty-text">购物车空空如也</text>
      <button v-if="storeId" class="cart__empty-btn" @tap="gotoStore">去逛逛</button>
    </view>

    <view v-else>
      <view v-for="it in items" :key="it.cartItemId" class="cart__row">
        <view class="cart__main">
          <text class="cart__name">{{ it.name }}</text>
          <text v-if="it.specValue" class="cart__spec">{{ it.specValue }}</text>
          <text class="cart__price">¥{{ formatYuan(it.subTotal) }}</text>
        </view>
        <view class="cart__qty">
          <view
            class="cart__qty-btn cart__qty-btn--minus"
            :class="{ 'cart__qty-btn--disabled': loading }"
            @tap="changeQty(it.skuId, -1, it.quantity)"
            >−</view
          >
          <text class="cart__qty-num">{{ it.quantity }}</text>
          <view
            class="cart__qty-btn cart__qty-btn--plus"
            :class="{ 'cart__qty-btn--disabled': loading }"
            @tap="changeQty(it.skuId, 1, it.quantity)"
            >+</view
          >
        </view>
      </view>

      <view class="cart__footer">
        <view class="cart__total">
          <text class="cart__total-label">合计</text>
          <text class="cart__total-amount">¥{{ formatYuan(totalAmount) }}</text>
        </view>
        <button class="cart__checkout" @tap="gotoConfirm">去结算</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.cart {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #fff;
}
.cart__header {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  padding: 16rpx 8rpx 24rpx;
}
.cart__title {
  font-size: 38rpx;
  font-weight: 800;
  color: #172033;
}
.cart__count {
  font-size: 24rpx;
  color: #8a94a6;
}
.cart__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0 0;
}
.cart__empty-icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
  opacity: 0.4;
}
.cart__empty-text {
  font-size: 28rpx;
  color: #8a94a6;
  margin-bottom: 32rpx;
}
.cart__empty-btn {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  padding: 0 56rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.cart__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  padding: 24rpx;
  border-radius: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.cart__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.cart__name {
  font-size: 28rpx;
  color: #172033;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cart__spec {
  font-size: 22rpx;
  color: #8a94a6;
}
.cart__price {
  margin-top: 4rpx;
  font-size: 28rpx;
  color: #ff4d4f;
  font-weight: 700;
}
.cart__qty {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cart__qty-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1;
}
.cart__qty-btn--plus {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
}
.cart__qty-btn--minus {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid rgba(31, 41, 55, 0.08);
}
.cart__qty-btn--disabled {
  opacity: 0.5;
}
.cart__qty-num {
  min-width: 40rpx;
  text-align: center;
  font-size: 28rpx;
}
.cart__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.cart__total {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.cart__total-label {
  font-size: 24rpx;
  color: #5a6275;
}
.cart__total-amount {
  font-size: 38rpx;
  color: #ff4d4f;
  font-weight: 700;
}
.cart__checkout {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  padding: 0 56rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
