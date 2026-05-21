<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';
/**
 * GR-2 生鲜商城首页(平台自营 · 按斤计价 · 全自提 · 一鸡一码可溯源)
 */
import { computed, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import {
  type GroceryCategoryVo,
  type GroceryProductVo,
  listGroceryCategories,
  listGroceryProducts,
} from '@/api/grocery-products';

const loading = ref(true);
const categories = ref<GroceryCategoryVo[]>([]);
const products = ref<GroceryProductVo[]>([]);
const selectedCat = ref<string>('');

const categoryIcon = (name: string): string => {
  if (name.includes('禽') || name.includes('肉') || name.includes('蛋')) return 'drumstick';
  if (name.includes('菜') || name.includes('蔬')) return 'salad';
  if (name.includes('果')) return 'apple';
  if (name.includes('海') || name.includes('鱼') || name.includes('虾')) return 'soup';
  if (name.includes('米') || name.includes('粮') || name.includes('面')) return 'croissant';
  return 'shopping-cart';
};

const productEmoji = (name: string): string => {
  if (name.includes('鸡')) return 'drumstick';
  if (name.includes('鸭')) return 'drumstick';
  if (name.includes('鱼') || name.includes('海') || name.includes('虾')) return 'soup';
  if (name.includes('蛋')) return 'croissant';
  if (name.includes('青菜') || name.includes('白菜') || name.includes('菠菜')) return 'salad';
  if (name.includes('土豆')) return 'salad';
  if (name.includes('番茄') || name.includes('西红柿')) return 'apple';
  if (name.includes('萝卜')) return 'salad';
  if (name.includes('黄瓜')) return 'salad';
  if (name.includes('玉米')) return 'croissant';
  if (name.includes('豆')) return 'salad';
  if (name.includes('菇') || name.includes('蘑')) return 'salad';
  if (name.includes('苹果')) return 'apple';
  if (name.includes('橙') || name.includes('橘')) return 'apple';
  if (name.includes('葡萄')) return 'apple';
  return 'shopping-cart';
};

const featuredProducts = computed<GroceryProductVo[]>(() =>
  products.value.filter((p) => p.hasTraceability === 1 && p.saleStatus === 'on_shelf').slice(0, 4),
);

const otherProducts = computed<GroceryProductVo[]>(() =>
  products.value.filter((p) => !featuredProducts.value.includes(p)),
);

function yuanPerJin(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const [cats, prods] = await Promise.all([
      listGroceryCategories(),
      listGroceryProducts({ categoryId: selectedCat.value || undefined, pageSize: 50 }),
    ]);
    if (cats.code === '0' && cats.data) categories.value = cats.data.list;
    if (prods.code === '0' && prods.data) products.value = prods.data.list;
  } finally {
    loading.value = false;
  }
}

function pickCategory(catId: string): void {
  selectedCat.value = selectedCat.value === catId ? '' : catId;
  void loadData();
}

function gotoDetail(p: GroceryProductVo): void {
  if (p.saleStatus !== 'on_shelf') {
    uni.showToast({ title: '该商品暂不可购买', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/grocery/product/detail?productId=${p.productId}` });
}

function gotoPickupPicker(): void {
  uni.navigateTo({ url: '/pages/grocery/pickup-point/picker' });
}

function gotoScan(): void {
  uni.navigateTo({ url: '/pages/grocery/trace/scan' });
}

function gotoErrand(): void {
  uni.navigateTo({ url: '/pages/errand/home/index' });
}

onMounted(() => void loadData());
onShow(() => void loadData());
</script>

<template>
  <view class="home">
    <!-- 顶部 hero -->
    <view class="home__hero">
      <view class="home__hero-bg">
        <view class="home__hero-glow home__hero-glow--1" />
        <view class="home__hero-glow home__hero-glow--2" />
      </view>
      <view class="home__hero-top">
        <view class="home__hero-eyebrow" style="display: flex; align-items: center; gap: 8rpx"
          ><SvgIcon name="salad" :size="32" /><text>平台自营生鲜</text></view
        >
        <text class="home__hero-title">新鲜直达 · 一鸡一码</text>
        <text class="home__hero-sub">按斤计价 · 多退少补 · 门店自提</text>
      </view>

      <view class="home__pickbar" @click="gotoPickupPicker">
        <SvgIcon name="location-pin" :size="32" class="home__pickbar-pin" />
        <view class="home__pickbar-mid">
          <text class="home__pickbar-label">选择自提点</text>
          <text class="home__pickbar-hint">按距离自动排序</text>
        </view>
        <text class="home__pickbar-arrow">›</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="home__quick">
      <view class="home__quick-item" @click="gotoScan">
        <view class="home__quick-icon home__quick-icon--scan"><SvgIcon name="image" :size="44" /></view>
        <text class="home__quick-text">扫码溯源</text>
      </view>
      <view class="home__quick-item" @click="gotoPickupPicker">
        <view class="home__quick-icon home__quick-icon--pickup"><SvgIcon name="store" :size="44" /></view>
        <text class="home__quick-text">附近自提</text>
      </view>
      <view class="home__quick-item" @click="gotoErrand">
        <view class="home__quick-icon home__quick-icon--errand"><SvgIcon name="motorcycle" :size="44" /></view>
        <text class="home__quick-text">跑腿服务</text>
      </view>
      <view class="home__quick-item" @click="gotoPickupPicker">
        <view class="home__quick-icon home__quick-icon--vip"><SvgIcon name="star" :size="44" /></view>
        <text class="home__quick-text">每日新品</text>
      </view>
    </view>

    <!-- 分类 -->
    <view v-if="categories.length" class="home__section">
      <view class="home__section-head">
        <text class="home__section-title">商品分类</text>
        <text class="home__section-tip">点击筛选</text>
      </view>
      <view class="home__cats">
        <view class="home__cat" :class="{ 'home__cat--active': selectedCat === '' }" @click="pickCategory('')">
          <SvgIcon name="sparkles" :size="32" class="home__cat-icon" />
          <text class="home__cat-text">全部</text>
        </view>
        <view
          v-for="c in categories"
          :key="c.categoryId"
          class="home__cat"
          :class="{ 'home__cat--active': selectedCat === c.categoryId }"
          @click="pickCategory(c.categoryId)"
        >
          <SvgIcon :name="categoryIcon(c.name)" :size="32" class="home__cat-icon" />
          <text class="home__cat-text">{{ c.name }}</text>
        </view>
      </view>
    </view>

    <!-- 精选可溯源 -->
    <view v-show="!loading && featuredProducts.length > 0" class="home__section">
      <view class="home__section-head">
        <view class="home__section-title" style="display: flex; align-items: center; gap: 8rpx"
          ><SvgIcon name="drumstick" :size="32" /><text>精选可溯源</text></view
        >
        <text class="home__section-tip">扫码即可查养殖档案</text>
      </view>
      <scroll-view scroll-x :scroll-left="0" class="home__feature-scroll">
        <view class="home__feature-list">
          <view v-for="p in featuredProducts" :key="p.productId" class="home__feature" @click="gotoDetail(p)">
            <view class="home__feature-emoji"
              ><SvgIcon :name="productEmoji(p.name)" :size="80" color="var(--brand-primary)"
            /></view>
            <view class="home__feature-badge">可溯源</view>
            <text class="home__feature-name">{{ p.name }}</text>
            <view class="home__feature-price">
              <text class="home__feature-cur">¥</text>
              <text class="home__feature-yuan">{{ yuanPerJin(p.unitPriceCentsPerJin) }}</text>
              <text class="home__feature-unit"> /斤</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 全部商品 -->
    <view class="home__section">
      <view class="home__section-head">
        <text class="home__section-title">为你推荐</text>
      </view>

      <view v-if="loading" class="home__empty">加载中...</view>
      <view v-else-if="products.length === 0" class="home__empty">暂无商品</view>
      <view v-else class="home__grid">
        <view
          v-for="p in otherProducts.length ? otherProducts : products"
          :key="p.productId"
          class="home__product"
          :class="{ 'home__product--off': p.saleStatus !== 'on_shelf' }"
          @click="gotoDetail(p)"
        >
          <view class="home__product-img">
            <view class="home__product-emoji"
              ><SvgIcon :name="productEmoji(p.name)" :size="100" color="var(--brand-primary)"
            /></view>
            <view v-if="p.hasTraceability === 1" class="home__product-trace">溯</view>
            <view v-if="p.saleStatus === 'sold_out'" class="home__product-mask">已售罄</view>
            <view v-else-if="p.saleStatus === 'off_shelf'" class="home__product-mask">已下架</view>
          </view>
          <view class="home__product-body">
            <text class="home__product-name">{{ p.name }}</text>
            <text v-if="p.description" class="home__product-desc">{{ p.description }}</text>
            <view class="home__product-foot">
              <view class="home__product-price">
                <text class="home__product-cur">¥</text>
                <text class="home__product-yuan">{{ yuanPerJin(p.unitPriceCentsPerJin) }}</text>
                <text class="home__product-unit"> /斤</text>
              </view>
              <view v-if="p.saleStatus === 'on_shelf'" class="home__product-buy">+ 选购</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="home__footer">
      <text>O2O 平台自营生鲜 · 安全溯源</text>
    </view>

    <FloatTabBar active="home" />
  </view>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 200rpx;
}

/* ============ 顶部 hero ============ */
.home__hero {
  position: relative;
  padding: 64rpx 32rpx 96rpx;
  background: var(--brand-gradient);
  overflow: hidden;
  color: #fff;
}
.home__hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.home__hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.4;
}
.home__hero-glow--1 {
  width: 320rpx;
  height: 320rpx;
  top: -120rpx;
  right: -80rpx;
  background: #fff;
}
.home__hero-glow--2 {
  width: 200rpx;
  height: 200rpx;
  bottom: -60rpx;
  left: -40rpx;
  background: #b6ffd0;
}
.home__hero-top {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.home__hero-eyebrow {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  align-self: flex-start;
  letter-spacing: 2rpx;
}
.home__hero-title {
  margin-top: 16rpx;
  font-size: 50rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}
.home__hero-sub {
  font-size: 24rpx;
  opacity: 0.92;
  margin-top: 4rpx;
}

.home__pickbar {
  position: relative;
  z-index: 2;
  margin-top: 32rpx;
  padding: 22rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 18rpx 40rpx rgba(31, 41, 55, 0.18);
}
.home__pickbar-pin {
  font-size: 40rpx;
}
.home__pickbar-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.home__pickbar-label {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--text-primary);
}
.home__pickbar-hint {
  font-size: 20rpx;
  color: #94a3b8;
}
.home__pickbar-arrow {
  font-size: 36rpx;
  color: #94a3b8;
}

/* ============ 快捷入口 ============ */
.home__quick {
  margin: -40rpx 24rpx 0;
  padding: 24rpx 12rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
  display: flex;
  position: relative;
  z-index: 3;
}
.home__quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.home__quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}
.home__quick-icon--scan {
  background: linear-gradient(135deg, #ddfbe7, #b6ffd0);
}
.home__quick-icon--pickup {
  background: linear-gradient(135deg, #fff7ed, #ffe2b8);
}
.home__quick-icon--errand {
  background: linear-gradient(135deg, #ddefff, #b8d8ff);
}
.home__quick-icon--vip {
  background: linear-gradient(135deg, #fde2ff, #f9c5ff);
}
.home__quick-text {
  font-size: 22rpx;
  color: var(--text-secondary);
}

/* ============ section 通用 ============ */
.home__section {
  margin: 32rpx 24rpx 0;
}
.home__section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 18rpx;
  padding: 0 4rpx;
}
.home__section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--text-primary);
}
.home__section-tip {
  font-size: 22rpx;
  color: #94a3b8;
}

/* ============ 分类 ============ */
.home__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.home__cat {
  padding: 16rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border: 1rpx solid rgba(23, 32, 51, 0.06);
}
.home__cat--active {
  background: var(--brand-gradient);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 12rpx 24rpx rgba(46, 156, 93, 0.3);
}
.home__cat-icon {
  font-size: 28rpx;
}
.home__cat-text {
  font-size: 24rpx;
  color: inherit;
}

/* ============ 精选横滑 ============ */
.home__feature-scroll {
  width: 100%;
  white-space: nowrap;
}
.home__feature-list {
  display: flex;
  gap: 20rpx;
  padding: 4rpx;
}
.home__feature {
  width: 260rpx;
  flex-shrink: 0;
  padding: 24rpx;
  background: linear-gradient(160deg, #fffbef 0%, #fff 60%);
  border-radius: 24rpx;
  border: 1rpx solid rgba(46, 156, 93, 0.18);
  box-shadow: 0 12rpx 32rpx rgba(46, 156, 93, 0.1);
  position: relative;
}
.home__feature-emoji {
  font-size: 80rpx;
  text-align: center;
}
.home__feature-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 4rpx 12rpx;
  background: var(--brand-primary);
  color: #fff;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.home__feature-name {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home__feature-price {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}
.home__feature-cur {
  font-size: 22rpx;
  color: var(--price-color);
  font-weight: 700;
}
.home__feature-yuan {
  font-size: 36rpx;
  color: var(--price-color);
  font-weight: 900;
}
.home__feature-unit {
  font-size: 20rpx;
  color: #94a3b8;
}

/* ============ 商品网格 ============ */
.home__empty {
  padding: 100rpx 0;
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
}
.home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.home__product {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
  border: 1rpx solid rgba(23, 32, 51, 0.04);
}
.home__product--off {
  opacity: 0.6;
}
.home__product-img {
  position: relative;
  width: 100%;
  height: 220rpx;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__product-emoji {
  font-size: 100rpx;
}
.home__product-trace {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 40rpx;
  height: 40rpx;
  background: var(--brand-primary);
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__product-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__product-body {
  padding: 16rpx 20rpx 20rpx;
}
.home__product-name {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--text-primary);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home__product-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home__product-foot {
  margin-top: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.home__product-price {
  display: flex;
  align-items: baseline;
}
.home__product-cur {
  font-size: 20rpx;
  color: var(--price-color);
  font-weight: 700;
}
.home__product-yuan {
  font-size: 32rpx;
  color: var(--price-color);
  font-weight: 900;
}
.home__product-unit {
  font-size: 18rpx;
  color: #94a3b8;
}
.home__product-buy {
  padding: 6rpx 16rpx;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 999rpx;
}

.home__footer {
  text-align: center;
  padding: 40rpx 0 20rpx;
  font-size: 20rpx;
  color: #cbd5e1;
}
</style>
