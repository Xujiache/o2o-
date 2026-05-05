<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useFoodCartStore } from '@/stores/food-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useFoodCartStore();
const storeId = ref('');
const loading = ref(false);

const items = computed(() => cart.cart?.items ?? []);
const totalAmount = computed(() => cart.cart?.totalAmount ?? '0');

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

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  storeId.value = (opts.query?.storeId ?? cart.currentStoreId ?? '') as string;
});
</script>

<template>
  <view class="cart">
    <view class="cart__title">购物车 ({{ storeId }})</view>
    <view v-if="items.length === 0" class="cart__empty">购物车为空</view>
    <view v-else>
      <view v-for="it in items" :key="it.cartItemId" class="cart__row">
        <view class="cart__name">{{ it.name }} {{ it.specValue }}</view>
        <view class="cart__qty">
          <button size="mini" :disabled="loading" @tap="changeQty(it.skuId, -1, it.quantity)">-</button>
          <text>{{ it.quantity }}</text>
          <button size="mini" :disabled="loading" @tap="changeQty(it.skuId, 1, it.quantity)">+</button>
        </view>
        <view class="cart__sub">¥ {{ formatYuan(it.subTotal) }}</view>
      </view>
      <view class="cart__footer">
        <text>合计 ¥ {{ formatYuan(totalAmount) }}</text>
        <button type="warn" @tap="gotoConfirm">去结算</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.cart {
  padding: 20rpx;
}
.cart__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.cart__empty {
  text-align: center;
  padding: 80rpx 0;
  color: #888;
}
.cart__row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16rpx;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.cart__qty {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cart__sub {
  color: #ff6633;
}
.cart__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  margin-top: 20rpx;
  border-radius: 12rpx;
}
</style>
