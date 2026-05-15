<script setup lang="ts">
/**
 * GR-6 生鲜商品详情页(重构 + 美化版本)
 *
 * 兼容三种定价模式:
 *   - weight: 按斤 → 选份数(每份 estimated_weight_grams 克),预估总价 = unitPrice × 总克数 / 500
 *   - piece : 按件 → 选数量,总价 = unitPrice × 数量
 *   - sku   : 多规格 → 选 SKU 后按 SKU 单价 × 数量
 *
 * 价格显示规则:
 *   - starting: 「¥X 起」(weight/piece 用 unitPrice;sku 用 priceFromCents)
 *   - range   : 「¥X ~ ¥Y」(仅 sku 有效,其他降级显示)
 *   - uniform : 「¥X」单一价
 *
 * SKU 模式下单链路:本阶段(GR-6)仅 UI 完成,实际订单 API 暂不接通,
 * 立即下单时 toast 提示「规格下单暂未开放」。weight/piece 走原 confirm 流程。
 */
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

import {
  GROCERY_DELIVERY_METHOD_ICONS,
  GROCERY_DELIVERY_METHOD_LABELS,
  calcEstimatedCents,
  getGroceryProduct,
  type GroceryDeliveryMethod,
  type GroceryProductVo,
  type GrocerySkuVo,
} from '@/api/grocery-products';

const loading = ref(true);
const product = ref<GroceryProductVo | null>(null);
const portions = ref(1);
const selectedSkuId = ref<string>('');
const swiperIndex = ref(0);

const fallbackImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e2e8f0'/><text x='100' y='106' font-size='18' fill='%2394a3b8' text-anchor='middle'>暂无图</text></svg>`,
  );

const mainImages = computed<string[]>(() => {
  if (!product.value) return [];
  if (product.value.mainImageUrls.length > 0) return product.value.mainImageUrls;
  if (product.value.coverImageUrl) return [product.value.coverImageUrl];
  return [fallbackImage];
});

const detailImages = computed<string[]>(() => product.value?.detailImageUrls ?? []);

const selectedSku = computed<GrocerySkuVo | null>(() => {
  if (!product.value || product.value.pricedBy !== 'sku') return null;
  return product.value.skus.find((s) => s.skuId === selectedSkuId.value) ?? null;
});

const unitLabel = computed<string>(() => {
  if (!product.value) return '';
  if (product.value.pricedBy === 'weight') return '/斤';
  if (product.value.pricedBy === 'piece') return '/件';
  return '';
});

const totalGrams = computed<number>(() => {
  if (!product.value) return 0;
  if (product.value.pricedBy === 'weight') {
    return portions.value * product.value.estimatedWeightGrams;
  }
  if (product.value.pricedBy === 'sku') {
    const ws = selectedSku.value?.weightGrams ?? 0;
    return portions.value * ws;
  }
  return 0;
});

const estimatedYuan = computed<string>(() => {
  if (!product.value) return '0.00';
  if (product.value.pricedBy === 'weight') {
    const cents = calcEstimatedCents(product.value.unitPriceCentsPerJin, totalGrams.value);
    return (cents / 100).toFixed(2);
  }
  if (product.value.pricedBy === 'piece') {
    const cents = Number(product.value.unitPriceCentsPerJin) * portions.value;
    return (cents / 100).toFixed(2);
  }
  if (product.value.pricedBy === 'sku' && selectedSku.value) {
    const cents = Number(selectedSku.value.priceCents) * portions.value;
    return (cents / 100).toFixed(2);
  }
  return '0.00';
});

const quantityUnit = computed<string>(() => {
  if (!product.value) return '份';
  if (product.value.pricedBy === 'piece') return '件';
  return '份';
});

function yuanFromCents(cents: string | number): string {
  return (Number(cents) / 100).toFixed(2);
}

/** 渲染顶部价格(根据 priceDisplayRule + pricedBy) */
const priceDisplay = computed<{ text: string; suffix?: string }>(() => {
  if (!product.value) return { text: '—' };
  const p = product.value;
  const unit = unitLabel.value;
  if (p.pricedBy === 'sku') {
    if (p.priceDisplayRule === 'range' && p.priceFromCents && p.priceToCents && p.priceFromCents !== p.priceToCents) {
      return { text: `${yuanFromCents(p.priceFromCents)} ~ ${yuanFromCents(p.priceToCents)}` };
    }
    if (p.priceFromCents) {
      const startTxt = `${yuanFromCents(p.priceFromCents)}`;
      return p.priceDisplayRule === 'uniform' ? { text: startTxt } : { text: startTxt, suffix: '起' };
    }
    return { text: '—' };
  }
  const base = yuanFromCents(p.unitPriceCentsPerJin);
  if (p.priceDisplayRule === 'uniform') return { text: base, suffix: unit };
  if (p.priceDisplayRule === 'starting') return { text: base, suffix: `${unit} 起` };
  return { text: base, suffix: unit };
});

const deliveryItems = computed<Array<{ key: GroceryDeliveryMethod; label: string; icon: string }>>(() => {
  const list = product.value?.deliveryMethods ?? [];
  return list.map((k) => ({
    key: k,
    label: GROCERY_DELIVERY_METHOD_LABELS[k],
    icon: GROCERY_DELIVERY_METHOD_ICONS[k],
  }));
});

const ctaDisabled = computed<boolean>(() => {
  if (!product.value) return true;
  if (product.value.saleStatus !== 'on_shelf') return true;
  if (product.value.pricedBy === 'sku' && !selectedSku.value) return true;
  return false;
});

const ctaText = computed<string>(() => {
  if (!product.value) return '加载中';
  if (product.value.saleStatus === 'sold_out') return '已售罄';
  if (product.value.saleStatus === 'off_shelf') return '已下架';
  if (product.value.pricedBy === 'sku' && !selectedSku.value) return '请选择规格';
  return '立即下单';
});

function pickSku(s: GrocerySkuVo): void {
  if (Number(s.stockJin) <= 0) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' });
    return;
  }
  selectedSkuId.value = s.skuId;
}

function inc(): void {
  if (portions.value >= 50) return;
  portions.value += 1;
}

function dec(): void {
  if (portions.value <= 1) return;
  portions.value -= 1;
}

function goConfirm(): void {
  if (!product.value || ctaDisabled.value) return;
  const p = product.value;

  let unitPriceCentsPerJin = p.unitPriceCentsPerJin;
  let perPortionGrams = p.pricedBy === 'piece' ? 0 : p.estimatedWeightGrams;
  let skuId = '';
  let displayName = p.name;
  if (p.pricedBy === 'sku') {
    if (!selectedSku.value) {
      uni.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }
    unitPriceCentsPerJin = String(selectedSku.value.priceCents);
    perPortionGrams = selectedSku.value.weightGrams ?? 0;
    skuId = selectedSku.value.skuId;
    displayName = `${p.name} · ${selectedSku.value.specValue}`;
  }

  const params = new URLSearchParams({
    productId: p.productId,
    productName: encodeURIComponent(displayName),
    unitPriceCentsPerJin,
    estimatedPerPortionGrams: String(perPortionGrams),
    portions: String(portions.value),
    pricedBy: p.pricedBy,
    skuId,
  });
  uni.navigateTo({ url: `/pages/grocery/order/confirm?${params.toString()}` });
}

function onSwiperChange(e: { detail: { current: number } }): void {
  swiperIndex.value = e.detail.current;
}

async function loadProduct(productId: string): Promise<void> {
  loading.value = true;
  try {
    const r = await getGroceryProduct(productId);
    if (r.code === '0' && r.data) {
      product.value = r.data;
      if (r.data.pricedBy === 'sku' && r.data.skus.length > 0) {
        const firstInStock = r.data.skus.find((s) => Number(s.stockJin) > 0) ?? r.data.skus[0]!;
        selectedSkuId.value = firstInStock.skuId;
      }
    }
  } finally {
    loading.value = false;
  }
}

onLoad((query) => {
  const id = (query as Record<string, string | undefined> | undefined)?.productId;
  if (!id) {
    uni.showToast({ title: '参数缺失', icon: 'none' });
    return;
  }
  void loadProduct(id);
});

onMounted(() => {});
</script>

<template>
  <view class="detail">
    <view v-if="loading" class="detail__empty">加载中...</view>

    <template v-else-if="product">
      <swiper
        class="detail__swiper"
        :indicator-dots="mainImages.length > 1"
        indicator-color="rgba(255,255,255,0.55)"
        indicator-active-color="#ffffff"
        :autoplay="mainImages.length > 1"
        :interval="4000"
        :circular="true"
        @change="onSwiperChange"
      >
        <swiper-item v-for="(url, idx) in mainImages" :key="idx">
          <image :src="url" mode="aspectFill" class="detail__swiper-img" />
        </swiper-item>
      </swiper>
      <view class="detail__swiper-counter" v-if="mainImages.length > 1">
        {{ swiperIndex + 1 }} / {{ mainImages.length }}
      </view>

      <view class="detail__hero">
        <view class="detail__title-row">
          <text class="detail__name">{{ product.name }}</text>
          <view v-if="product.hasTraceability === 1" class="detail__badge">可溯源 · 一鸡一码</view>
        </view>
        <view v-if="product.tags && product.tags.length > 0" class="detail__tags">
          <text v-for="t in product.tags" :key="t" class="detail__tag">{{ t }}</text>
        </view>
      </view>

      <view class="detail__price-card">
        <view class="detail__price-row">
          <text class="detail__currency">¥</text>
          <text class="detail__yuan">{{ priceDisplay.text }}</text>
          <text v-if="priceDisplay.suffix" class="detail__unit">{{ priceDisplay.suffix }}</text>
        </view>
        <text v-if="product.pricedBy === 'weight'" class="detail__hint">
          每份预估 {{ product.estimatedWeightGrams }} 克 ≈ {{ (product.estimatedWeightGrams / 500).toFixed(2) }} 斤
        </text>
        <text v-else-if="product.pricedBy === 'piece'" class="detail__hint">按件计价,下单确认数量</text>
        <text v-else-if="product.pricedBy === 'sku'" class="detail__hint">
          多规格商品,共 {{ product.skus.length }} 种规格可选
        </text>
      </view>

      <view v-if="product.description" class="detail__desc">
        <text>{{ product.description }}</text>
      </view>

      <view v-if="deliveryItems.length > 0" class="detail__delivery">
        <text class="detail__section-label">物流方式</text>
        <view class="detail__delivery-list">
          <view v-for="m in deliveryItems" :key="m.key" class="detail__delivery-item">
            <text class="detail__delivery-icon">{{ m.icon }}</text>
            <text class="detail__delivery-text">{{ m.label }}</text>
          </view>
        </view>
      </view>

      <view v-if="product.pricedBy === 'sku' && product.skus.length > 0" class="detail__sku">
        <text class="detail__section-label">选择规格</text>
        <view class="detail__sku-list">
          <view
            v-for="s in product.skus"
            :key="s.skuId"
            class="detail__sku-chip"
            :class="{
              'is-active': s.skuId === selectedSkuId,
              'is-disabled': Number(s.stockJin) <= 0,
            }"
            @click="pickSku(s)"
          >
            <text class="detail__sku-spec">{{ s.specValue }}</text>
            <text class="detail__sku-price">¥{{ yuanFromCents(s.priceCents) }}</text>
            <text v-if="Number(s.stockJin) <= 0" class="detail__sku-sold">售罄</text>
          </view>
        </view>
      </view>

      <view class="detail__qty">
        <text class="detail__qty-label">选择{{ quantityUnit }}数</text>
        <view class="detail__qty-ctrl">
          <button class="detail__qty-btn" :disabled="portions <= 1" @click="dec">-</button>
          <text class="detail__qty-num">{{ portions }}</text>
          <button class="detail__qty-btn" :disabled="portions >= 50" @click="inc">+</button>
        </view>
      </view>

      <view class="detail__estimate">
        <text v-if="product.pricedBy === 'weight'" class="detail__estimate-label">预估总重</text>
        <text v-if="product.pricedBy === 'weight'" class="detail__estimate-val">
          {{ (totalGrams / 500).toFixed(2) }} 斤 ({{ totalGrams }} g)
        </text>
        <text class="detail__estimate-label" :style="{ marginTop: product.pricedBy === 'weight' ? '8rpx' : '0' }">
          {{ product.pricedBy === 'weight' ? '预估总价' : '合计' }}
        </text>
        <text class="detail__estimate-total">¥ {{ estimatedYuan }}</text>
        <text v-if="product.pricedBy === 'weight'" class="detail__estimate-tip">
          下单后实际重量以拣货称重为准,系统多退少补
        </text>
      </view>

      <view v-if="detailImages.length > 0" class="detail__gallery">
        <view class="detail__gallery-title">
          <text class="detail__gallery-line"></text>
          <text class="detail__gallery-text">商品详情</text>
          <text class="detail__gallery-line"></text>
        </view>
        <image v-for="(url, idx) in detailImages" :key="idx" :src="url" mode="widthFix" class="detail__gallery-img" />
      </view>

      <view class="detail__bar">
        <button class="detail__cta" :disabled="ctaDisabled" @click="goConfirm">
          {{ ctaText }}
        </button>
      </view>
    </template>

    <view v-else class="detail__empty">商品不存在</view>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 180rpx;
}
.detail__empty {
  padding: 200rpx 0;
  text-align: center;
  color: #94a3b8;
}

.detail__swiper {
  width: 100%;
  height: 750rpx;
  background: #e2e8f0;
}
.detail__swiper-img {
  width: 100%;
  height: 100%;
}
.detail__swiper-counter {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  padding: 6rpx 18rpx;
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  font-size: 22rpx;
  border-radius: 999rpx;
  backdrop-filter: blur(4px);
}

.detail__hero {
  position: relative;
  margin: -36rpx 24rpx 0;
  padding: 32rpx 28rpx 28rpx;
  background: #fff;
  border-radius: 28rpx 28rpx 24rpx 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.detail__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.detail__name {
  font-size: 40rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1.3;
  flex: 1;
}
.detail__badge {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #5fbe7d, #2e9c5d);
  color: #fff;
  border-radius: 999rpx;
  font-size: 20rpx;
  white-space: nowrap;
}
.detail__tags {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.detail__tag {
  padding: 4rpx 16rpx;
  background: #fff7ed;
  color: #b45309;
  border: 1rpx solid #fdba74;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.detail__price-card {
  margin: 16rpx 24rpx 0;
  padding: 28rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.06);
}
.detail__price-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.detail__currency {
  font-size: 28rpx;
  color: #ff4d4f;
  font-weight: 700;
}
.detail__yuan {
  font-size: 56rpx;
  color: #ff4d4f;
  font-weight: 900;
  line-height: 1;
}
.detail__unit {
  font-size: 22rpx;
  color: #94a3b8;
}
.detail__hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.detail__desc {
  margin: 16rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
  font-size: 26rpx;
  color: #5a6275;
  line-height: 1.6;
}

.detail__section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}

.detail__delivery {
  margin: 16rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.detail__delivery-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.detail__delivery-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #f1f5f9;
  border-radius: 999rpx;
}
.detail__delivery-icon {
  font-size: 26rpx;
}
.detail__delivery-text {
  font-size: 24rpx;
  color: #172033;
}

.detail__sku {
  margin: 16rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.detail__sku-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.detail__sku-chip {
  position: relative;
  padding: 14rpx 24rpx;
  background: #f1f5f9;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 160rpx;
  transition: all 0.18s;
}
.detail__sku-chip.is-active {
  background: linear-gradient(135deg, #ffedd5, #fef3c7);
  border-color: #ff7a45;
}
.detail__sku-chip.is-disabled {
  opacity: 0.4;
}
.detail__sku-spec {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.detail__sku-price {
  font-size: 24rpx;
  color: #ff4d4f;
  font-weight: 600;
}
.detail__sku-sold {
  font-size: 20rpx;
  color: #94a3b8;
}

.detail__qty {
  margin: 16rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.detail__qty-label {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.detail__qty-ctrl {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.detail__qty-btn {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  background: #f1f5f9;
  border: none;
  border-radius: 16rpx;
  color: #172033;
  font-size: 36rpx;
  padding: 0;
}
.detail__qty-btn[disabled] {
  opacity: 0.35;
}
.detail__qty-num {
  font-size: 32rpx;
  font-weight: 700;
  min-width: 56rpx;
  text-align: center;
}

.detail__estimate {
  margin: 16rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.detail__estimate-label {
  font-size: 22rpx;
  color: #92400e;
}
.detail__estimate-val {
  font-size: 30rpx;
  font-weight: 700;
  color: #b45309;
}
.detail__estimate-total {
  font-size: 44rpx;
  font-weight: 900;
  color: #b45309;
}
.detail__estimate-tip {
  font-size: 20rpx;
  color: #b45309;
  margin-top: 8rpx;
  opacity: 0.85;
}

.detail__gallery {
  margin: 24rpx 24rpx 0;
  padding: 24rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
  overflow: hidden;
}
.detail__gallery-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding-bottom: 24rpx;
}
.detail__gallery-line {
  width: 80rpx;
  height: 1rpx;
  background: #cbd5e1;
}
.detail__gallery-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  letter-spacing: 4rpx;
}
.detail__gallery-img {
  display: block;
  width: 100%;
}

.detail__bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx env(safe-area-inset-bottom);
  background: #fff;
  box-shadow: 0 -10rpx 30rpx rgba(31, 41, 55, 0.05);
}
.detail__cta {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
  font-size: 30rpx;
}
.detail__cta[disabled] {
  background: #cbd5e1;
}
</style>
