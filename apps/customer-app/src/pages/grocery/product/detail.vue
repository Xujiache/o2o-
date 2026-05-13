<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { getGroceryProduct, type GroceryProductDetail } from '@/api/grocery-products';
import { useGroceryCartStore } from '@/stores/grocery-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useGroceryCartStore();
const detail = ref<GroceryProductDetail | null>(null);
const productId = ref('');

/** fixed: 份数;weighed: 预估克数 */
const quantity = ref<number>(1);
const weightG = ref<number>(500);
const adding = ref(false);

const isWeighed = computed(() => detail.value?.pricingMode === 'weighed');
const minWeight = computed(() => detail.value?.minWeightG ?? 100);
const maxWeight = computed(() => detail.value?.maxWeightG ?? 5000);

const unitPriceCents = computed<number>(() => {
  if (!detail.value) return 0;
  if (isWeighed.value) return Number(detail.value.unitPricePerJin ?? 0);
  return Number(detail.value.price);
});

const estimatedSubtotalCents = computed<number>(() => {
  if (!detail.value) return 0;
  if (isWeighed.value) return Math.round((unitPriceCents.value * weightG.value) / 500);
  return unitPriceCents.value * quantity.value;
});

const priceLabel = computed(() => {
  if (!detail.value) return '';
  if (isWeighed.value) return `¥${formatYuan(detail.value.unitPricePerJin ?? '0')} /斤`;
  return `¥${formatYuan(detail.value.price)} /份`;
});

function getQuery(): string {
  const pages = (getCurrentPages?.() ?? []) as Array<{ options?: { productId?: string } }>;
  return pages[pages.length - 1]?.options?.productId ?? '';
}

async function load(): Promise<void> {
  productId.value = getQuery();
  if (!productId.value) return;
  const r = await getGroceryProduct(productId.value);
  if (r.code === '0' && r.data) {
    detail.value = r.data;
    if (r.data.pricingMode === 'weighed') {
      const min = r.data.minWeightG ?? 100;
      const max = r.data.maxWeightG ?? 5000;
      weightG.value = Math.min(Math.max(500, min), max);
    }
    const existing = cart.findLine(productId.value);
    if (existing) {
      if (r.data.pricingMode === 'weighed') weightG.value = existing.quantity;
      else quantity.value = existing.quantity;
    }
  }
}

function adjustQty(delta: number): void {
  const next = quantity.value + delta;
  if (next < 1) return;
  if (detail.value && next > detail.value.stock) {
    uni.showToast({ title: '超出库存', icon: 'none' });
    return;
  }
  quantity.value = next;
}

function adjustWeight(delta: number): void {
  const next = weightG.value + delta;
  if (next < minWeight.value) {
    uni.showToast({ title: `不低于 ${minWeight.value}g`, icon: 'none' });
    return;
  }
  if (next > maxWeight.value) {
    uni.showToast({ title: `不超过 ${maxWeight.value}g`, icon: 'none' });
    return;
  }
  weightG.value = next;
}

const weightGStr = computed<string>({
  get: () => String(weightG.value),
  set: (v: string) => {
    const n = parseInt(v || '0', 10);
    if (Number.isFinite(n)) weightG.value = n;
  },
});

async function addToCart(): Promise<void> {
  if (!detail.value || adding.value) return;
  adding.value = true;
  try {
    const q = isWeighed.value ? weightG.value : quantity.value;
    if (q < 1) {
      uni.showToast({ title: '请填写数量', icon: 'none' });
      return;
    }
    if (isWeighed.value) {
      if (q < minWeight.value || q > maxWeight.value) {
        uni.showToast({ title: `请填 ${minWeight.value}-${maxWeight.value}g`, icon: 'none' });
        return;
      }
    }
    cart.addOrUpdate(detail.value, q);
    uni.showToast({ title: '已加入购物车', icon: 'success' });
  } finally {
    adding.value = false;
  }
}

function goCart(): void {
  uni.navigateTo({ url: '/pages/grocery/cart' });
}

onMounted(load);
</script>

<template>
  <view class="page">
    <view v-if="!detail" class="loading">加载中...</view>
    <template v-else>
      <view class="hero">
        <image
          v-if="detail.coverImageFileId"
          class="hero__img"
          :src="`/api/v1/pub/files/${detail.coverImageFileId}`"
          mode="aspectFill"
        />
        <view v-else class="hero__placeholder">
          <SvgIcon name="apple" :size="120" color="#c5c9d2" />
        </view>
        <view v-if="isWeighed" class="hero__badge">称重商品 · 多退少补</view>
      </view>

      <view class="card">
        <text class="name">{{ detail.name }}</text>
        <view class="price-row">
          <text class="price">{{ priceLabel }}</text>
          <text class="stock">库存 {{ detail.stock }}</text>
        </view>
        <text v-if="detail.description" class="desc">{{ detail.description }}</text>
      </view>

      <view class="card">
        <text class="card__title">{{ isWeighed ? '选择重量' : '选择份数' }}</text>
        <template v-if="isWeighed">
          <view class="qty-row">
            <text class="qty-row__label">预估重量(克)</text>
            <view class="stepper">
              <view class="stepper__btn" @tap="adjustWeight(-100)">
                <SvgIcon name="minus" :size="22" color="#172033" />
              </view>
              <input v-model="weightGStr" class="stepper__input" type="number" />
              <view class="stepper__btn" @tap="adjustWeight(100)">
                <SvgIcon name="plus" :size="22" color="#172033" />
              </view>
            </view>
          </view>
          <text class="hint">支持范围 {{ minWeight }}g - {{ maxWeight }}g,实际称重后多退少补</text>
        </template>
        <template v-else>
          <view class="qty-row">
            <text class="qty-row__label">购买份数</text>
            <view class="stepper">
              <view class="stepper__btn" @tap="adjustQty(-1)">
                <SvgIcon name="minus" :size="22" color="#172033" />
              </view>
              <text class="stepper__num">{{ quantity }}</text>
              <view class="stepper__btn" @tap="adjustQty(1)">
                <SvgIcon name="plus" :size="22" color="#172033" />
              </view>
            </view>
          </view>
          <text class="hint">{{ formatYuan(detail.price) }} 元 × {{ quantity }} 份</text>
        </template>
      </view>

      <view class="card subtotal-card">
        <text class="subtotal-card__label">预估小计</text>
        <text class="subtotal-card__value">¥{{ formatYuan(estimatedSubtotalCents) }}</text>
      </view>

      <view class="action-bar">
        <view class="action-bar__cart" @tap="goCart">
          <SvgIcon name="shopping-cart" :size="32" color="#172033" />
          <text>购物车</text>
        </view>
        <button class="action-bar__btn" :disabled="adding" @tap="addToCart">加入购物车</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 200rpx;
  background: #fafbfc;
}
.loading {
  padding: 200rpx 0;
  text-align: center;
  color: #8a94a6;
}
.hero {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f0f2f6;
}
.hero__img {
  width: 100%;
  height: 100%;
}
.hero__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero__badge {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(91, 95, 248, 0.92);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
}

.card {
  margin: 16rpx 24rpx 0;
  padding: 24rpx 26rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.name {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1.35;
}
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 12rpx;
}
.price {
  font-size: 36rpx;
  font-weight: 800;
  color: #11998e;
}
.stock {
  font-size: 23rpx;
  color: #8a94a6;
}
.desc {
  display: block;
  margin-top: 16rpx;
  color: #5a6275;
  font-size: 26rpx;
  line-height: 1.5;
}
.card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
  margin-bottom: 18rpx;
}
.qty-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.qty-row__label {
  font-size: 26rpx;
  color: #5a6275;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  overflow: hidden;
}
.stepper__btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper__num {
  width: 80rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.stepper__input {
  width: 120rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

.subtotal-card {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.subtotal-card__label {
  font-size: 26rpx;
  color: #5a6275;
}
.subtotal-card__value {
  font-size: 40rpx;
  font-weight: 800;
  color: #ff6b35;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 18rpx);
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.action-bar__cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 0 16rpx;
  font-size: 22rpx;
  color: #172033;
}
.action-bar__btn {
  flex: 1;
  height: 82rpx;
  border-radius: 999rpx;
  background: #11998e;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
</style>
