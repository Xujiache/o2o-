<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { type FoodProduct, type FoodStoreProductsVo, getStoreProducts } from '@/api/food-products';
import { useFoodCartStore } from '@/stores/food-cart';
import { formatYuan } from '@/utils/format-price';

const storeId = ref('');
const data = ref<FoodStoreProductsVo | null>(null);
const loading = ref(false);
const cart = useFoodCartStore();
const skuPickerOpen = ref(false);
const pickerProduct = ref<FoodProduct | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getStoreProducts(storeId.value);
    if (r.code === '0' && r.data) data.value = r.data;
  } finally {
    loading.value = false;
  }
}

function openSkuPicker(p: FoodProduct): void {
  if (p.saleStatus !== 'on_shelf') {
    uni.showToast({ title: '已售罄', icon: 'none' });
    return;
  }
  pickerProduct.value = p;
  skuPickerOpen.value = true;
}

async function addToCart(skuId: string, quantity: number): Promise<void> {
  if (!cart.canSwitchStore(storeId.value)) {
    const ok = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '切换店铺',
        content: '加车将清空当前其他店铺购物车,继续吗?',
        success: (r) => resolve(!!r.confirm),
      });
    });
    if (!ok) return;
    cart.clear();
  }
  const r = await cart.upsert(storeId.value, skuId, quantity);
  if (r) {
    uni.showToast({ title: '已加入购物车', icon: 'success' });
    skuPickerOpen.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  storeId.value = (opts.query?.storeId ?? '20001') as string;
  void load();
});
</script>

<template>
  <view class="store">
    <view v-if="loading" class="store__loading">加载中…</view>
    <view v-else-if="data">
      <view class="store__title">店铺 {{ storeId }}</view>
      <view v-for="cat in data.categories" :key="cat.categoryId" class="store__cat">
        <view class="store__cat-name">{{ cat.name }}</view>
        <view
          v-for="p in data.products.filter((x) => x.categoryId === cat.categoryId)"
          :key="p.productId"
          class="store__product"
          :class="{ 'store__product--out': p.saleStatus !== 'on_shelf' }"
          @tap="openSkuPicker(p)"
        >
          <view class="store__product-name">{{ p.name }}</view>
          <view class="store__product-price">¥ {{ formatYuan(p.basePrice) }}</view>
          <view v-if="p.saleStatus !== 'on_shelf'" class="store__sold-out">已售罄</view>
        </view>
      </view>
      <view class="store__footer" @tap="uni.navigateTo({ url: '/pages/food/cart/index?storeId=' + storeId })">
        🛒 去购物车
      </view>
    </view>

    <view v-if="skuPickerOpen && pickerProduct" class="store__sku-picker">
      <view class="store__sku-mask" @tap="skuPickerOpen = false" />
      <view class="store__sku-modal">
        <view class="store__sku-title">{{ pickerProduct.name }}</view>
        <view v-for="sku in pickerProduct.skus" :key="sku.skuId" class="store__sku-row">
          <text>{{ sku.specValue }} (¥ {{ formatYuan(sku.price) }} / 库存 {{ sku.availableStock }})</text>
          <button size="mini" @tap="addToCart(sku.skuId, 1)">加 1</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.store {
  padding: 20rpx;
}
.store__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.store__cat-name {
  margin: 20rpx 0 12rpx;
  font-weight: 600;
}
.store__product {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  position: relative;
}
.store__product--out {
  opacity: 0.5;
}
.store__product-name {
  font-weight: 500;
}
.store__product-price {
  color: #ff6633;
  margin-top: 8rpx;
}
.store__sold-out {
  position: absolute;
  right: 24rpx;
  top: 24rpx;
  background: #999;
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
.store__loading {
  text-align: center;
  padding: 80rpx 0;
  color: #888;
}
.store__footer {
  position: fixed;
  bottom: 30rpx;
  right: 30rpx;
  background: #ff6633;
  color: #fff;
  padding: 16rpx 30rpx;
  border-radius: 40rpx;
}
.store__sku-picker {
  position: fixed;
  inset: 0;
}
.store__sku-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.store__sku-modal {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 30rpx;
  border-radius: 20rpx 20rpx 0 0;
}
.store__sku-title {
  font-weight: 600;
  margin-bottom: 16rpx;
}
.store__sku-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}
</style>
