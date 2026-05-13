<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { type FoodProduct, type FoodStoreProductsVo, getStoreProducts } from '@/api/food-products';
import { type PublicStoreDetailVo, getPublicStoreDetail } from '@/api/food-stores';
import { useFoodCartStore } from '@/stores/food-cart';
import { formatYuan } from '@/utils/format-price';
import { formatWeight } from '@/utils/format-weight';

const storeId = ref('');
const data = ref<FoodStoreProductsVo | null>(null);
const storeInfo = ref<PublicStoreDetailVo | null>(null);
const loading = ref(false);
const cart = useFoodCartStore();

const activeCategoryId = ref<string>('');
const scrollTarget = ref<string>('');
let suppressScrollUpdate = false;
let unsuppressTimer: ReturnType<typeof setTimeout> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let observer: any = null;

const skuPickerOpen = ref(false);
const pickerProduct = ref<FoodProduct | null>(null);
const pickerSelectedSkuId = ref<string>('');
const pickerQuantity = ref<number>(1);
const pickerRemark = ref<string>('');
const pickerSubmitting = ref(false);
const storeAvatarLoadFailed = ref(false);

/** 半屏购物车 sheet 开关 */
const cartSheetOpen = ref(false);
const cartItemBusy = ref(false);

/** skuId → product 的映射,用于在购物车里反查商品图片 */
const productBySkuId = computed<Map<string, FoodProduct>>(() => {
  const m = new Map<string, FoodProduct>();
  if (!data.value) return m;
  for (const p of data.value.products) {
    for (const s of p.skus) m.set(s.skuId, p);
  }
  return m;
});

const productsByCategory = computed<Record<string, FoodProduct[]>>(() => {
  const map: Record<string, FoodProduct[]> = {};
  if (!data.value) return map;
  for (const c of data.value.categories) map[c.categoryId] = [];
  for (const p of data.value.products) {
    if (map[p.categoryId]) map[p.categoryId]!.push(p);
  }
  return map;
});

const cartCount = computed<number>(() =>
  cart.cart?.storeId === storeId.value ? cart.cart.items.reduce((s, i) => s + i.quantity, 0) : 0,
);
const cartTotal = computed<string>(() => (cart.cart?.storeId === storeId.value ? cart.cart.totalAmount : '0'));
const storeName = computed<string>(() => storeInfo.value?.name ?? `店铺 ${storeId.value}`);
const storeAvatarUrl = computed<string>(() => (storeAvatarLoadFailed.value ? '' : (storeInfo.value?.avatarUrl ?? '')));
const isStoreResting = computed<boolean>(() => !!storeInfo.value && storeInfo.value.businessStatus !== 'online');
const restRegisteredAt = computed<string>(() => formatDateTime(storeInfo.value?.statusUpdatedAt));
const minOrderHint = computed<string>(() => {
  const info = storeInfo.value;
  if (!info) return '加载中…';
  if (isStoreResting.value) return '店铺目前休息中';
  return `¥${formatYuan(info.minOrderAmount)} 起送 · ¥${formatYuan(info.deliveryFee)} 配送费`;
});

function formatDateTime(ms?: number | null): string {
  if (!ms) return '--';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [productsRes, storeRes] = await Promise.all([
      getStoreProducts(storeId.value),
      getPublicStoreDetail(storeId.value),
    ]);
    if (storeRes.code === '0' && storeRes.data) {
      storeInfo.value = storeRes.data;
      storeAvatarLoadFailed.value = false;
    }
    if (productsRes.code === '0' && productsRes.data) {
      data.value = productsRes.data;
      if (productsRes.data.categories[0]) activeCategoryId.value = productsRes.data.categories[0].categoryId;
      await nextTick();
      setupObserver();
    }
  } finally {
    loading.value = false;
  }
}

function setupObserver(): void {
  if (!data.value) return;
  const instance = getCurrentInstance();
  if (!instance) return;
  if (observer) {
    try {
      observer.disconnect();
    } catch {
      /* ignore */
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observer = uni.createIntersectionObserver(instance.proxy as any, { thresholds: [0, 0.01] }) as any;
  observer.relativeTo('.store__main', { top: 0, bottom: -80 });
  for (const cat of data.value.categories) {
    observer.observe(`#cat-${cat.categoryId}`, (res: { intersectionRatio: number }) => {
      if (suppressScrollUpdate) return;
      if (res.intersectionRatio > 0) {
        activeCategoryId.value = cat.categoryId;
      }
    });
  }
}

function onTabClick(catId: string): void {
  if (activeCategoryId.value === catId) return;
  suppressScrollUpdate = true;
  activeCategoryId.value = catId;
  scrollTarget.value = `cat-${catId}`;
  if (unsuppressTimer) clearTimeout(unsuppressTimer);
  unsuppressTimer = setTimeout(() => {
    suppressScrollUpdate = false;
  }, 600);
}

/** 该 product 在购物车中所有 sku 的数量总和 */
function productCartCount(p: FoodProduct): number {
  if (!cart.cart || cart.cart.storeId !== storeId.value) return 0;
  const skuIds = new Set(p.skus.map((s) => s.skuId));
  return cart.cart.items.reduce((sum, it) => (skuIds.has(it.skuId) ? sum + it.quantity : sum), 0);
}

/** 该 product 在购物车里第一个有数量的 sku(用于卡片直接加减时定位) */
function firstActiveSku(p: FoodProduct): { skuId: string; quantity: number } | null {
  if (!cart.cart || cart.cart.storeId !== storeId.value) return null;
  const skuIds = new Set(p.skus.map((s) => s.skuId));
  const it = cart.cart.items.find((x) => skuIds.has(x.skuId) && x.quantity > 0);
  return it ? { skuId: it.skuId, quantity: it.quantity } : null;
}

/** 用户点商品卡 / 商品卡 + 按钮:始终弹 picker(单/多规格统一) */
function onProductTap(p: FoodProduct): void {
  if (isStoreResting.value) {
    uni.showToast({ title: '店铺目前休息中，暂不可下单', icon: 'none' });
    return;
  }
  if (p.saleStatus !== 'on_shelf') {
    uni.showToast({ title: '已售罄', icon: 'none' });
    return;
  }
  if (p.skus.length === 0) {
    uni.showToast({ title: '商品暂未配置规格,请联系商家', icon: 'none' });
    return;
  }
  pickerProduct.value = p;
  pickerSelectedSkuId.value = p.skus[0]!.skuId;
  pickerQuantity.value = 1;
  pickerRemark.value = '';
  skuPickerOpen.value = true;
}

/** picker 内点 - / + 调数量 */
function pickerDec(): void {
  if (pickerQuantity.value > 1) pickerQuantity.value--;
}
function pickerInc(): void {
  const sku = pickerProduct.value?.skus.find((s) => s.skuId === pickerSelectedSkuId.value);
  if (sku && pickerQuantity.value >= sku.availableStock) {
    uni.showToast({ title: '已达库存上限', icon: 'none' });
    return;
  }
  pickerQuantity.value++;
}

async function ensureCanWriteCart(): Promise<boolean> {
  if (isStoreResting.value) {
    uni.showToast({ title: '店铺目前休息中，暂不可加购', icon: 'none' });
    return false;
  }
  if (cart.canSwitchStore(storeId.value)) return true;
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '切换店铺',
      content: '加车将清空当前其他店铺购物车,继续吗?',
      success: (r) => resolve(!!r.confirm),
    });
  });
  if (!ok) return false;
  cart.clear();
  return true;
}

/** picker 提交 — 把 picker 数量加到购物车(累加在原 sku 数量上) */
async function pickerSubmit(): Promise<void> {
  if (!pickerProduct.value || pickerSubmitting.value) return;
  if (!pickerSelectedSkuId.value) {
    uni.showToast({ title: '请选择规格', icon: 'none' });
    return;
  }
  if (!(await ensureCanWriteCart())) return;
  pickerSubmitting.value = true;
  try {
    const existing =
      cart.cart?.storeId === storeId.value
        ? (cart.cart.items.find((x) => x.skuId === pickerSelectedSkuId.value)?.quantity ?? 0)
        : 0;
    const target = existing + pickerQuantity.value;
    const r = await cart.upsert(storeId.value, pickerSelectedSkuId.value, target);
    if (r) {
      uni.showToast({ title: '已加入购物车', icon: 'success' });
      skuPickerOpen.value = false;
    }
  } finally {
    pickerSubmitting.value = false;
  }
}

/** 卡片右下角 +:仅在 productCartCount > 0 时由加减控件触发 */
async function quickInc(p: FoodProduct, evt?: Event): Promise<void> {
  evt?.stopPropagation?.();
  if (isStoreResting.value) {
    uni.showToast({ title: '店铺目前休息中，暂不可加购', icon: 'none' });
    return;
  }
  // 多规格商品的卡片 + 走 picker(避免歧义)
  if (p.skus.length > 1) {
    onProductTap(p);
    return;
  }
  const sku = firstActiveSku(p);
  if (!sku || !p.skus[0]) return;
  if (p.skus[0].availableStock <= sku.quantity) {
    uni.showToast({ title: '已达库存上限', icon: 'none' });
    return;
  }
  if (!(await ensureCanWriteCart())) return;
  await cart.upsert(storeId.value, sku.skuId, sku.quantity + 1);
}

/** 卡片右下角 -:数量 -1,到 0 删除 */
async function quickDec(p: FoodProduct, evt?: Event): Promise<void> {
  evt?.stopPropagation?.();
  if (isStoreResting.value) return;
  const sku = firstActiveSku(p);
  if (!sku) return;
  // 多规格剩多个 sku 时不直接减(交给购物车页处理)
  const skuIds = new Set(p.skus.map((s) => s.skuId));
  const linesOfThisProduct = (cart.cart?.items ?? []).filter((x) => skuIds.has(x.skuId) && x.quantity > 0);
  if (p.skus.length > 1 && linesOfThisProduct.length > 1) {
    uni.showToast({ title: '多规格请到购物车修改', icon: 'none' });
    return;
  }
  await cart.upsert(storeId.value, sku.skuId, sku.quantity - 1);
}

/** 点底部购物车浮条:打开半屏 sheet(不再 navigate 到全屏页) */
function goCart(): void {
  if (isStoreResting.value) {
    uni.showToast({ title: '店铺目前休息中，暂不可结算', icon: 'none' });
    return;
  }
  if (cartCount.value === 0) {
    uni.showToast({ title: '购物车空,先选点商品吧', icon: 'none' });
    return;
  }
  cartSheetOpen.value = true;
}

/** sheet 内调数量(共享 cart store) */
async function cartChangeQty(skuId: string, currentQty: number, delta: number): Promise<void> {
  if (cartItemBusy.value) return;
  cartItemBusy.value = true;
  try {
    await cart.upsert(storeId.value, skuId, Math.max(0, currentQty + delta));
  } finally {
    cartItemBusy.value = false;
  }
}

async function cartClearAll(): Promise<void> {
  const r = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '清空购物车',
      content: '确定要移除所有商品吗?',
      success: (m) => resolve(!!m.confirm),
    });
  });
  if (!r || !cart.cart) return;
  cartItemBusy.value = true;
  try {
    for (const it of [...cart.cart.items]) {
      await cart.upsert(storeId.value, it.skuId, 0);
    }
    cartSheetOpen.value = false;
  } finally {
    cartItemBusy.value = false;
  }
}

/** 关闭 sheet 并跳确认订单页 */
function goConfirm(): void {
  if (isStoreResting.value) {
    uni.showToast({ title: '店铺目前休息中，暂不可结算', icon: 'none' });
    return;
  }
  if (cartCount.value === 0) return;
  cartSheetOpen.value = false;
  uni.navigateTo({ url: `/pages/food/order/confirm?storeId=${storeId.value}` });
}

const COVER_PALETTE: Array<[string, string]> = [
  ['#FFB75E', '#ED8F03'],
  ['#FF6B6B', '#EE0979'],
  ['#11998E', '#38EF7D'],
  ['#4776E6', '#8E54E9'],
  ['#F7971E', '#FFD200'],
  ['#56AB2F', '#A8E063'],
  ['#FA709A', '#FEE140'],
  ['#30CFD0', '#330867'],
];

function coverStyle(productId: string): string {
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  const pair = COVER_PALETTE[h % COVER_PALETTE.length] ?? COVER_PALETTE[0]!;
  return `background: linear-gradient(135deg, ${pair[0]}, ${pair[1]});`;
}

function firstChar(name: string): string {
  return name ? name.slice(0, 1) : '店';
}

function onStoreAvatarError(): void {
  storeAvatarLoadFailed.value = true;
}

/** 商品卡显示用:单规格直接取该 sku 重量;多规格取最小→最大范围 */
function productWeightLabel(p: FoodProduct): string {
  const valid = p.skus.map((s) => s.weightGrams).filter((g): g is number => typeof g === 'number' && g > 0);
  if (valid.length === 0) return '';
  if (valid.length === 1) return formatWeight(valid[0]!);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return formatWeight(min);
  return `${formatWeight(min)} - ${formatWeight(max)}`;
}

function fakeMonthlySold(productId: string): number {
  return ((productId.charCodeAt(0) || 0) % 80) + 20;
}

watch(
  () => data.value?.categories.map((c) => c.categoryId).join(','),
  () => {
    nextTick(setupObserver);
  },
);

onLoad((options) => {
  storeId.value = (options?.storeId as string) ?? '20001';
});

onMounted(() => {
  void load();
});

onUnmounted(() => {
  if (unsuppressTimer) clearTimeout(unsuppressTimer);
  if (observer) {
    try {
      observer.disconnect();
    } catch {
      /* ignore */
    }
  }
});
</script>

<template>
  <view class="store">
    <view v-if="loading" class="store__loading">加载中…</view>

    <template v-else-if="data">
      <!-- 顶部店铺信息卡 -->
      <view class="store__header" :class="{ 'store__header--resting': isStoreResting }">
        <view class="store__avatar">
          <image
            v-if="storeAvatarUrl"
            :src="storeAvatarUrl"
            class="store__avatar-img"
            mode="aspectFill"
            @error="onStoreAvatarError"
          />
          <text v-else>{{ firstChar(storeName) }}</text>
        </view>
        <view class="store__head-main">
          <view class="store__name-row">
            <text class="store__name">{{ storeName }}</text>
            <text v-if="isStoreResting" class="store__rest-tag">休息中</text>
          </view>
          <view class="store__meta">
            <view class="store__meta-rating">
              <SvgIcon name="star" :size="20" color="#f7971e" />
              <text class="store__meta-item">4.8</text>
            </view>
            <text class="store__meta-dot">·</text>
            <text class="store__meta-item">月售 1200+</text>
            <text class="store__meta-dot">·</text>
            <text class="store__meta-item">30 分钟</text>
          </view>
          <view class="store__notice">{{ minOrderHint }}</view>
          <view v-if="isStoreResting" class="store__rest-alert">
            店铺目前休息中，平台登记时间为{{ restRegisteredAt }}
          </view>
          <view v-if="storeInfo?.notice" class="store__notice store__notice--tip">公告:{{ storeInfo.notice }}</view>
        </view>
      </view>

      <!-- 主体:左 tab + 右商品 -->
      <view class="store__body">
        <scroll-view scroll-y class="store__sidebar" :show-scrollbar="false">
          <view
            v-for="cat in data.categories"
            :key="cat.categoryId"
            class="store__tab"
            :class="{ 'store__tab--active': activeCategoryId === cat.categoryId }"
            @tap="onTabClick(cat.categoryId)"
          >
            <view v-if="activeCategoryId === cat.categoryId" class="store__tab-bar" />
            <text class="store__tab-text">{{ cat.name }}</text>
          </view>
        </scroll-view>

        <scroll-view
          scroll-y
          class="store__main"
          :scroll-into-view="scrollTarget"
          scroll-with-animation
          :show-scrollbar="false"
        >
          <view
            v-for="cat in data.categories"
            :id="`cat-${cat.categoryId}`"
            :key="cat.categoryId"
            class="store__section"
          >
            <view class="store__section-h">
              <text class="store__section-name">{{ cat.name }}</text>
              <text class="store__section-count">{{ (productsByCategory[cat.categoryId] || []).length }} 款</text>
            </view>
            <view
              v-for="p in productsByCategory[cat.categoryId] || []"
              :key="p.productId"
              class="store__product"
              :class="{ 'store__product--out': p.saleStatus !== 'on_shelf' || isStoreResting }"
              @tap="onProductTap(p)"
            >
              <view class="store__cover" :style="p.imageUrl ? '' : coverStyle(p.productId)">
                <image v-if="p.imageUrl" :src="p.imageUrl" class="store__cover-img" mode="aspectFill" />
                <text v-else class="store__cover-letter">{{ firstChar(p.name) }}</text>
                <view v-if="isStoreResting" class="store__cover-mask">休息中</view>
                <view v-else-if="p.saleStatus !== 'on_shelf'" class="store__cover-mask">已售罄</view>
              </view>
              <view class="store__product-info">
                <view class="store__product-top">
                  <view class="store__product-name-row">
                    <text class="store__product-name">{{ p.name }}</text>
                    <text v-if="productWeightLabel(p)" class="store__weight-tag">⚖ {{ productWeightLabel(p) }}</text>
                  </view>
                  <text v-if="p.description" class="store__product-desc">{{ p.description }}</text>
                  <view class="store__product-meta">
                    <text class="store__product-stat">月售 {{ fakeMonthlySold(p.productId) }}</text>
                    <text class="store__product-stat-dot">·</text>
                    <text class="store__product-stat">好评 98%</text>
                  </view>
                </view>
                <view class="store__product-bottom">
                  <view class="store__product-price-wrap">
                    <text class="store__product-price">¥{{ formatYuan(p.basePrice) }}</text>
                    <text v-if="p.originalPrice" class="store__product-orig">¥{{ formatYuan(p.originalPrice) }}</text>
                  </view>
                  <!-- 已加车:加减控件;未加车:+ 按钮(点击弹 picker) -->
                  <template v-if="productCartCount(p) > 0 && !isStoreResting">
                    <view class="store__qty">
                      <view class="store__qty-btn store__qty-btn--minus" @tap.stop="quickDec(p, $event)">
                        <text>−</text>
                      </view>
                      <text class="store__qty-num">{{ productCartCount(p) }}</text>
                      <view class="store__qty-btn store__qty-btn--plus" @tap.stop="quickInc(p, $event)">
                        <text>+</text>
                      </view>
                    </view>
                  </template>
                  <view
                    v-else
                    class="store__product-add"
                    :class="{ 'store__product-add--disabled': isStoreResting }"
                    @tap.stop="onProductTap(p)"
                  >
                    <text class="store__product-add-icon">+</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-if="(productsByCategory[cat.categoryId] || []).length === 0" class="store__section-empty">
              该分类暂无商品
            </view>
          </view>
          <view class="store__main-tail" />
        </scroll-view>
      </view>

      <!-- 底部购物车浮条(fixed,始终悬停) -->
      <view class="store__cart-bar" :class="{ 'store__cart-bar--disabled': isStoreResting }" @tap="goCart">
        <view class="store__cart-icon" :class="{ 'store__cart-icon--active': cartCount > 0 }">
          <SvgIcon name="shopping-cart" :size="40" color="#fff" />
          <view v-if="cartCount > 0" class="store__cart-badge">{{ cartCount }}</view>
        </view>
        <view class="store__cart-stats">
          <text v-if="cartCount > 0" class="store__cart-total">¥{{ formatYuan(cartTotal) }}</text>
          <text v-else class="store__cart-empty">未选购商品</text>
          <text class="store__cart-tip">{{ minOrderHint }}</text>
        </view>
        <view class="store__cart-go" :class="{ 'store__cart-go--active': cartCount > 0 && !isStoreResting }">
          {{ isStoreResting ? '休息中' : cartCount > 0 ? '去结算' : '去看看' }}
        </view>
      </view>
    </template>

    <!-- SKU 选择抽屉(半屏) -->
    <view v-if="skuPickerOpen && pickerProduct" class="sku">
      <view class="sku__mask" @tap="skuPickerOpen = false" />
      <view class="sku__panel">
        <view class="sku__head">
          <view class="sku__cover" :style="pickerProduct.imageUrl ? '' : coverStyle(pickerProduct.productId)">
            <image
              v-if="pickerProduct.imageUrl"
              :src="pickerProduct.imageUrl"
              class="sku__cover-img"
              mode="aspectFill"
            />
            <text v-else class="sku__cover-letter">{{ firstChar(pickerProduct.name) }}</text>
          </view>
          <view class="sku__head-main">
            <text class="sku__title">{{ pickerProduct.name }}</text>
            <text v-if="pickerProduct.description" class="sku__desc">{{ pickerProduct.description }}</text>
            <view class="sku__price-row">
              <text class="sku__base-price">¥{{ formatYuan(pickerProduct.basePrice) }} 起</text>
              <text v-if="productWeightLabel(pickerProduct)" class="sku__head-weight"
                >⚖ {{ productWeightLabel(pickerProduct) }}</text
              >
            </view>
          </view>
          <text class="sku__close" @tap="skuPickerOpen = false">×</text>
        </view>

        <!-- 多规格才显示规格选择 -->
        <view v-if="pickerProduct.skus.length > 1" class="sku__section">
          <text class="sku__section-title">规格</text>
          <view class="sku__specs">
            <view
              v-for="s in pickerProduct.skus"
              :key="s.skuId"
              class="sku__spec"
              :class="{
                'sku__spec--active': pickerSelectedSkuId === s.skuId,
                'sku__spec--out': s.availableStock <= 0,
              }"
              @tap="pickerSelectedSkuId = s.skuId"
            >
              <view class="sku__spec-name-row">
                <text class="sku__spec-name">{{ s.specValue || '默认' }}</text>
                <text v-if="s.weightGrams" class="sku__spec-weight">{{ formatWeight(s.weightGrams) }}</text>
              </view>
              <text class="sku__spec-price">¥{{ formatYuan(s.price) }}</text>
            </view>
          </view>
        </view>

        <!-- 数量调节 -->
        <view class="sku__section">
          <text class="sku__section-title">数量</text>
          <view class="sku__qty">
            <view class="sku__qty-btn" :class="{ 'sku__qty-btn--disabled': pickerQuantity <= 1 }" @tap="pickerDec"
              >−</view
            >
            <text class="sku__qty-num">{{ pickerQuantity }}</text>
            <view class="sku__qty-btn" @tap="pickerInc">+</view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="sku__section">
          <text class="sku__section-title">备注(选填)</text>
          <textarea
            v-model="pickerRemark"
            class="sku__remark"
            placeholder="如:不要香菜、少糖等(下单后生效)"
            maxlength="100"
          />
        </view>

        <view v-if="pickerProduct.skus.length === 0" class="sku__empty">该商品暂无可选规格</view>

        <!-- 提交按钮 -->
        <view v-if="pickerProduct.skus.length > 0" class="sku__bar">
          <view class="sku__bar-info">
            <text class="sku__bar-label">合计</text>
            <text class="sku__bar-amount">
              ¥{{
                formatYuan(
                  String(
                    Number(
                      pickerProduct.skus.find((s) => s.skuId === pickerSelectedSkuId)?.price ?? pickerProduct.basePrice,
                    ) * pickerQuantity,
                  ),
                )
              }}
            </text>
          </view>
          <button class="sku__bar-cta" :disabled="pickerSubmitting || isStoreResting" @tap="pickerSubmit">
            {{ isStoreResting ? '店铺休息中' : pickerSubmitting ? '加入中…' : '加入购物车' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 半屏购物车 sheet (2/3 视口高) -->
    <view v-if="cartSheetOpen" class="cs">
      <view class="cs__mask" @tap="cartSheetOpen = false" />
      <view class="cs__panel">
        <!-- 头部 -->
        <view class="cs__head">
          <view class="cs__head-main">
            <text class="cs__title">购物车</text>
            <text class="cs__count">共 {{ cartCount }} 件商品</text>
          </view>
          <view v-if="cartCount > 0" class="cs__clear" @tap="cartClearAll">
            <text>🗑</text>
            <text>清空</text>
          </view>
        </view>

        <!-- 列表(可滚) -->
        <scroll-view scroll-y class="cs__list" :show-scrollbar="false">
          <view v-for="it in cart.cart?.items ?? []" :key="it.cartItemId" class="cs__item">
            <view
              class="cs__item-cover"
              :style="
                productBySkuId.get(it.skuId)?.imageUrl
                  ? ''
                  : coverStyle(productBySkuId.get(it.skuId)?.productId ?? it.skuId)
              "
            >
              <image
                v-if="productBySkuId.get(it.skuId)?.imageUrl"
                :src="productBySkuId.get(it.skuId)?.imageUrl"
                class="cs__item-img"
                mode="aspectFill"
              />
              <text v-else class="cs__item-letter">{{ firstChar(it.name) }}</text>
            </view>
            <view class="cs__item-main">
              <text class="cs__item-name">{{ it.name }}</text>
              <view class="cs__item-meta">
                <text v-if="it.specValue" class="cs__item-spec">{{ it.specValue }}</text>
                <text
                  v-if="formatWeight(productBySkuId.get(it.skuId)?.skus.find((s) => s.skuId === it.skuId)?.weightGrams)"
                  class="cs__item-weight"
                >
                  ⚖
                  {{ formatWeight(productBySkuId.get(it.skuId)?.skus.find((s) => s.skuId === it.skuId)?.weightGrams) }}
                </text>
              </view>
              <view class="cs__item-priceline">
                <text class="cs__item-price">¥{{ formatYuan(it.subTotal) }}</text>
                <text class="cs__item-unit">¥{{ formatYuan(it.unitPrice) }} × {{ it.quantity }}</text>
              </view>
            </view>
            <view class="cs__item-qty">
              <view
                class="cs__qty-btn cs__qty-btn--minus"
                :class="{ 'cs__qty-btn--disabled': cartItemBusy }"
                @tap="cartChangeQty(it.skuId, it.quantity, -1)"
                >−</view
              >
              <text class="cs__qty-num">{{ it.quantity }}</text>
              <view
                class="cs__qty-btn cs__qty-btn--plus"
                :class="{ 'cs__qty-btn--disabled': cartItemBusy }"
                @tap="cartChangeQty(it.skuId, it.quantity, 1)"
                >+</view
              >
            </view>
          </view>
        </scroll-view>

        <!-- 底部:合计 + 去结算 -->
        <view class="cs__bar">
          <view class="cs__bar-info">
            <text class="cs__bar-label">合计</text>
            <text class="cs__bar-amount">¥{{ formatYuan(cartTotal) }}</text>
            <text class="cs__bar-tip">{{ minOrderHint }}</text>
          </view>
          <button class="cs__bar-cta" :disabled="isStoreResting" @tap="goConfirm">
            {{ isStoreResting ? '店铺休息中' : `去结算(${cartCount})` }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* ========== Layout shell ========== */
.store {
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.store__loading {
  text-align: center;
  padding: 120rpx 0;
  color: #8a94a6;
}

/* ========== Header (sticky-feeling, no overlap hack) ========== */
.store__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx 32rpx 36rpx;
  background: linear-gradient(135deg, #ff7a45 0%, #ffb020 100%);
  color: #fff;
}
.store__avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  color: #ff6b35;
  font-size: 52rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.14);
  overflow: hidden;
}
.store__avatar-img {
  width: 100%;
  height: 100%;
}
.store__header--resting {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
}
.store__head-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.store__name {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.2;
}
.store__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.store__rest-tag {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.store__rest-alert {
  margin-top: 6rpx;
  padding: 10rpx 14rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22rpx;
  line-height: 1.4;
}
.store__meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.92);
}
.store__meta-dot {
  opacity: 0.55;
}
.store__notice {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.86);
}
.store__notice--tip {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.78);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== Body: flex:1 fills remaining viewport, inner uses 100% height ========== */
.store__body {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #fff;
  border-top-left-radius: 28rpx;
  border-top-right-radius: 28rpx;
  margin-top: -20rpx;
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.store__sidebar {
  width: 184rpx;
  height: 100%;
  background: #fff;
  flex-shrink: 0;
  border-top-left-radius: 28rpx;
}
.store__tab {
  position: relative;
  padding: 28rpx 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #5a6275;
}
.store__tab--active {
  background: #fff;
  color: #172033;
  font-weight: 600;
}
.store__tab-bar {
  position: absolute;
  left: 0;
  top: 28rpx;
  bottom: 28rpx;
  width: 6rpx;
  background: #ff6b35;
  border-radius: 0 6rpx 6rpx 0;
}
.store__tab-text {
  display: inline-block;
}
.store__main {
  flex: 1;
  height: 100%;
  background: #fff;
  padding: 0 24rpx;
}

/* ========== Section ========== */
.store__section {
  padding-top: 8rpx;
}
.store__section-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 20rpx 8rpx 16rpx;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}
.store__section-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.store__section-count {
  font-size: 22rpx;
  color: #8a94a6;
}
.store__section-empty {
  text-align: center;
  font-size: 24rpx;
  color: #c5c9d2;
  padding: 32rpx 0;
}

/* ========== Product card: cover + info column with bottom-anchored price row ========== */
.store__product {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.store__product:last-child {
  border-bottom: none;
}
.store__product--out {
  filter: grayscale(1);
  opacity: 0.52;
}
.store__cover {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 18rpx rgba(31, 41, 55, 0.1);
}
.store__cover-img {
  width: 100%;
  height: 100%;
}
.store__cover-letter {
  font-size: 64rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.18);
}
.store__cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.store__product-info {
  flex: 1;
  min-width: 0;
  height: 168rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.store__product-top {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.store__product-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}
.store__product-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #172033;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.store__weight-tag {
  flex-shrink: 0;
  background: rgba(247, 151, 30, 0.12);
  color: #b7791f;
  font-size: 18rpx;
  font-weight: 700;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  line-height: 1.4;
}
.store__product-desc {
  font-size: 22rpx;
  color: #8a94a6;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.store__product-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 20rpx;
  color: #8a94a6;
}
.store__product-stat-dot {
  opacity: 0.5;
}
.store__product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.store__product-price-wrap {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  min-width: 0;
}
.store__product-price {
  color: #ff4d4f;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1;
}
.store__product-orig {
  color: #c5c9d2;
  font-size: 22rpx;
  text-decoration: line-through;
}
.store__product-add {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 18rpx rgba(255, 107, 53, 0.32);
}
.store__product-add--disabled {
  background: #c5c9d2;
  box-shadow: none;
}
.store__product-add-icon {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1;
}

/* 卡片内加减控件(已加车时显示) */
.store__qty {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
}
.store__qty-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1;
}
.store__qty-btn--minus {
  background: #fff;
  color: #ff6b35;
  border: 2rpx solid #ff7a45;
}
.store__qty-btn--plus {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  box-shadow: 0 8rpx 18rpx rgba(255, 107, 53, 0.32);
}
.store__qty-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  min-width: 36rpx;
  text-align: center;
}

/* tail spacer 留出购物车条高度,防止最后一行被遮 */
.store__main-tail {
  height: 200rpx;
}

/* ========== Cart Bar — fixed, always at viewport bottom ========== */
.store__cart-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 18rpx 14rpx 14rpx;
  background: #1f2937;
  color: #fff;
  border-radius: 999rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 41, 55, 0.32);
}
.store__cart-bar--disabled {
  background: #6b7280;
}
.store__cart-icon {
  position: relative;
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #2a3344;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.store__cart-icon--active {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
}
.store__cart-emoji {
  font-size: 38rpx;
}
.store__cart-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border: 2rpx solid #1f2937;
}
.store__cart-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.store__cart-total {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.2;
}
.store__cart-empty {
  font-size: 26rpx;
  color: #c5c9d2;
  line-height: 1.2;
}
.store__cart-tip {
  font-size: 20rpx;
  color: #8a94a6;
  margin-top: 4rpx;
}
.store__cart-go {
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: #2a3344;
  color: #c5c9d2;
  font-size: 26rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.store__cart-go--active {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
}

/* ========== SKU Picker ========== */
.sku {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.sku__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}
.sku__panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(env(safe-area-inset-bottom, 0rpx) + 32rpx);
  max-height: 70vh;
  overflow-y: auto;
}
.sku__head {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}
.sku__cover {
  width: 140rpx;
  height: 140rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.sku__cover-img {
  width: 100%;
  height: 100%;
}
.sku__cover-letter {
  font-size: 56rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}
.sku__head-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.sku__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #172033;
}
.sku__desc {
  font-size: 22rpx;
  color: #8a94a6;
}
.sku__base-price {
  margin-top: 6rpx;
  font-size: 30rpx;
  color: #ff4d4f;
  font-weight: 700;
}
.sku__close {
  font-size: 56rpx;
  color: #c5c9d2;
  line-height: 1;
  padding: 0 12rpx;
}
.sku__list {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.sku__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.sku__row-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sku__row-spec {
  font-size: 26rpx;
  color: #172033;
}
.sku__row-stock {
  font-size: 20rpx;
  color: #8a94a6;
}
.sku__row-price {
  color: #ff4d4f;
  font-size: 28rpx;
  font-weight: 700;
}
.sku__row-add {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  padding: 0 24rpx;
}
.sku__empty {
  text-align: center;
  font-size: 24rpx;
  color: #8a94a6;
  padding: 40rpx 0;
}

/* picker 新结构:section + specs + qty + remark + bar */
.sku__section {
  margin-top: 24rpx;
}
.sku__section-title {
  display: block;
  font-size: 24rpx;
  color: #5a6275;
  font-weight: 600;
  margin-bottom: 14rpx;
}
.sku__specs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.sku__spec {
  padding: 14rpx 22rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 120rpx;
  border: 2rpx solid transparent;
}
.sku__spec--active {
  background: rgba(255, 122, 69, 0.08);
  border-color: #ff7a45;
}
.sku__spec--out {
  opacity: 0.4;
}
.sku__spec-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.sku__spec-weight {
  background: rgba(247, 151, 30, 0.12);
  color: #b7791f;
  font-size: 18rpx;
  font-weight: 700;
  padding: 1rpx 10rpx;
  border-radius: 999rpx;
}
.sku__price-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 4rpx;
  flex-wrap: wrap;
}
.sku__head-weight {
  background: rgba(247, 151, 30, 0.12);
  color: #b7791f;
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.sku__spec-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #172033;
}
.sku__spec-price {
  font-size: 22rpx;
  color: #ff4d4f;
  font-weight: 700;
}

.sku__qty {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.sku__qty-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #fff;
  color: #172033;
  font-size: 36rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.sku__qty-btn--disabled {
  color: #c5c9d2;
}
.sku__qty-num {
  font-size: 36rpx;
  font-weight: 700;
  min-width: 64rpx;
  text-align: center;
}

.sku__remark {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #172033;
  box-sizing: border-box;
}

.sku__bar {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
}
.sku__bar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.sku__bar-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.sku__bar-amount {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff4d4f;
}
.sku__bar-cta {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 20rpx 48rpx;
  box-shadow: 0 12rpx 28rpx rgba(255, 107, 53, 0.32);
}
.sku__bar-cta[disabled] {
  opacity: 0.6;
}

/* ========== 半屏购物车 sheet ========== */
.cs {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.cs__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.cs__panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 67vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* head */
.cs__head {
  display: flex;
  align-items: center;
  padding: 28rpx 28rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
  flex-shrink: 0;
}
.cs__head-main {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}
.cs__title {
  font-size: 32rpx;
  font-weight: 800;
  color: #172033;
}
.cs__count {
  font-size: 22rpx;
  color: #8a94a6;
}
.cs__clear {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(217, 51, 51, 0.08);
  color: #d33;
  font-size: 22rpx;
  font-weight: 600;
}

/* list */
.cs__list {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #fff;
}
.cs__item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.04);
}
.cs__item-cover {
  position: relative;
  width: 132rpx;
  height: 132rpx;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cs__item-img {
  width: 100%;
  height: 100%;
}
.cs__item-letter {
  font-size: 56rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}
.cs__item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.cs__item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs__item-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}
.cs__item-spec {
  font-size: 22rpx;
  color: #8a94a6;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cs__item-weight {
  background: rgba(247, 151, 30, 0.12);
  color: #b7791f;
  font-size: 18rpx;
  font-weight: 700;
  padding: 1rpx 10rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.cs__item-priceline {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  margin-top: 4rpx;
  flex-wrap: wrap;
}
.cs__item-price {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff4d4f;
  line-height: 1;
}
.cs__item-unit {
  font-size: 20rpx;
  color: #c5c9d2;
}

/* qty */
.cs__item-qty {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.cs__qty-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1;
}
.cs__qty-btn--minus {
  background: #fff;
  color: #ff6b35;
  border: 2rpx solid #ff7a45;
}
.cs__qty-btn--plus {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  box-shadow: 0 8rpx 18rpx rgba(255, 107, 53, 0.32);
}
.cs__qty-btn--disabled {
  opacity: 0.5;
}
.cs__qty-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  min-width: 36rpx;
  text-align: center;
}

/* bar */
.cs__bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 16rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.06);
  flex-shrink: 0;
}
.cs__bar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}
.cs__bar-label {
  font-size: 20rpx;
  color: #8a94a6;
}
.cs__bar-amount {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff4d4f;
  line-height: 1.1;
}
.cs__bar-tip {
  font-size: 20rpx;
  color: #c5c9d2;
}
.cs__bar-cta {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  padding: 22rpx 44rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 14rpx 32rpx rgba(255, 107, 53, 0.34);
}
</style>
