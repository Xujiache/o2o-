<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { type FoodHomeVo, getFoodHome } from '@/api/food-home';
import { readStoredFoodCity } from '@/utils/food-city';
import { formatYuan } from '@/utils/format-price';

const storedCity = readStoredFoodCity();
const cityCode = ref(storedCity.code);
const cityName = ref(storedCity.name);
const home = ref<FoodHomeVo | null>(null);
const loading = ref(false);
const error = ref('');
let lastLoadedCityCode = '';

const greeting = computed<string>(() => {
  const h = new Date().getHours();
  if (h < 6) return '深夜了,夜宵走起';
  if (h < 10) return '早上好,来份早餐';
  if (h < 14) return '中午好,你的午饭准备好了';
  if (h < 17) return '下午茶时间';
  if (h < 22) return '晚上好,晚餐吃啥?';
  return '深夜小馆,慢慢挑选';
});

const greetingIcon = computed<string>(() => {
  const h = new Date().getHours();
  if (h < 6 || h >= 22) return 'moon';
  if (h < 10) return 'sun';
  if (h < 17) return 'coffee';
  return 'sun';
});

interface QuickEntry {
  key: string;
  icon: string; // SvgIcon name
  label: string;
  color: string;
  action: 'errand' | 'search-keyword' | 'address' | 'orders';
  keyword?: string;
}
const QUICK_ENTRIES: QuickEntry[] = [
  { key: 'errand', icon: 'motorcycle', label: '跑腿代办', color: '#4776e6', action: 'errand' },
  {
    key: 'search-fried',
    icon: 'drumstick',
    label: '炸鸡专区',
    color: '#ff7a45',
    action: 'search-keyword',
    keyword: '炸鸡',
  },
  {
    key: 'search-rice',
    icon: 'utensils',
    label: '盖饭套餐',
    color: '#56ab2f',
    action: 'search-keyword',
    keyword: '套餐',
  },
  {
    key: 'search-drink',
    icon: 'cup-soda',
    label: '饮料解渴',
    color: '#11998e',
    action: 'search-keyword',
    keyword: '饮料',
  },
  { key: 'search-soup', icon: 'soup', label: '靓汤滋补', color: '#a17359', action: 'search-keyword', keyword: '汤' },
  { key: 'search-cold', icon: 'salad', label: '凉菜小食', color: '#fa709a', action: 'search-keyword', keyword: '凉菜' },
  { key: 'address', icon: 'location-pin', label: '我的地址', color: '#f7971e', action: 'address' },
  { key: 'orders', icon: 'clipboard', label: '我的订单', color: '#8e54e9', action: 'orders' },
];

const STORE_PALETTE: Array<[string, string]> = [
  ['#FFB75E', '#ED8F03'],
  ['#FF6B6B', '#EE0979'],
  ['#11998E', '#38EF7D'],
  ['#4776E6', '#8E54E9'],
  ['#F7971E', '#FFD200'],
  ['#56AB2F', '#A8E063'],
  ['#FA709A', '#FEE140'],
];

function syncCity(): void {
  const city = readStoredFoodCity();
  cityCode.value = city.code;
  cityName.value = city.name;
}

async function loadHome(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const r = await getFoodHome(cityCode.value);
    if (r.code === '0' && r.data) {
      home.value = r.data;
    } else {
      error.value = r.message || '加载失败';
    }
  } finally {
    loading.value = false;
  }
}

function gotoCityPicker(): void {
  uni.navigateTo({ url: '/pages/food/city-picker/index' });
}
function gotoSearch(keyword?: string): void {
  const kw = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
  uni.navigateTo({ url: `/pages/food/search/index?cityCode=${cityCode.value}${kw}` });
}
function gotoStore(storeId: string): void {
  uni.navigateTo({ url: `/pages/food/store/detail?storeId=${storeId}` });
}
function gotoCategory(name: string): void {
  gotoSearch(name);
}
function gotoQuickEntry(e: QuickEntry): void {
  switch (e.action) {
    case 'errand':
      uni.switchTab({ url: '/pages/errand/home/index' });
      return;
    case 'search-keyword':
      if (e.keyword) gotoSearch(e.keyword);
      return;
    case 'address':
      uni.navigateTo({ url: '/pages/address/list' });
      return;
    case 'orders':
      uni.switchTab({ url: '/pages/food/order/list' });
      return;
  }
}

function firstChar(name: string): string {
  return name ? name.slice(0, 1) : '店';
}

function storeCoverStyle(storeId: string): string {
  let h = 0;
  for (let i = 0; i < storeId.length; i++) h = (h * 31 + storeId.charCodeAt(i)) >>> 0;
  const pair = STORE_PALETTE[h % STORE_PALETTE.length] ?? STORE_PALETTE[0]!;
  return `background: linear-gradient(135deg, ${pair[0]}, ${pair[1]});`;
}

function fmtDistance(meters: number | null): string {
  if (meters == null) return '';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  syncCity();
  if (!home.value || lastLoadedCityCode !== cityCode.value) {
    lastLoadedCityCode = cityCode.value;
    void loadHome();
  }
});
</script>

<template>
  <view class="home">
    <!-- 顶部 -->
    <view class="home__top">
      <view class="home__city" @tap="gotoCityPicker">
        <SvgIcon name="location-pin" :size="32" color="#ff6b35" />
        <text class="home__city-name">{{ cityName }}</text>
        <SvgIcon name="chevron-down" :size="20" color="#5a6275" />
      </view>
      <view class="home__search" @tap="gotoSearch()">
        <SvgIcon name="search" :size="28" color="#8a94a6" />
        <text class="home__search-tip">搜索商家 / 菜品</text>
      </view>
    </view>

    <!-- Hero -->
    <view class="home__hero">
      <view class="home__hero-greet-row">
        <SvgIcon :name="greetingIcon" :size="24" color="rgba(255,255,255,0.92)" />
        <text class="home__hero-greet">{{ greeting }}</text>
      </view>
      <view class="home__hero-row">
        <text class="home__hero-title">同城速达</text>
        <view class="home__hero-pill">
          <text class="home__hero-pill-dot">●</text>
          <text class="home__hero-pill-text">30 分钟必达</text>
        </view>
      </view>
      <text class="home__hero-sub">外卖 · 跑腿 · 实时追踪 · 售后无忧</text>
    </view>

    <!-- 快捷入口 -->
    <view class="home__quick">
      <view v-for="e in QUICK_ENTRIES" :key="e.key" class="home__quick-item" @tap="gotoQuickEntry(e)">
        <view class="home__quick-icon" :style="`background: ${e.color}1f;`">
          <SvgIcon :name="e.icon" :size="40" :color="e.color" />
        </view>
        <text class="home__quick-label">{{ e.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="home__msg">加载中…</view>
    <view v-else-if="error" class="home__msg home__msg--err">{{ error }}</view>

    <template v-else-if="home">
      <view v-if="home.categories.length > 0" class="home__cats">
        <view v-for="c in home.categories" :key="c.categoryId" class="home__cat" @tap="gotoCategory(c.name)">
          <text class="home__cat-text">{{ c.name }}</text>
        </view>
      </view>

      <view class="home__section-h">
        <text class="home__section-title">为你推荐</text>
        <text class="home__section-tip">优选品质好店</text>
      </view>

      <view v-if="home.recommendedStores.length === 0" class="home__msg">
        <SvgIcon name="store" :size="80" color="#c5c9d2" />
        <text>暂无推荐店铺,稍后再试</text>
      </view>

      <view v-else class="home__stores">
        <view v-for="s in home.recommendedStores" :key="s.storeId" class="home__store" @tap="gotoStore(s.storeId)">
          <view class="home__store-cover" :style="!s.iconUrl ? storeCoverStyle(s.storeId) : ''">
            <image v-if="s.iconUrl" :src="s.iconUrl" class="home__store-img" mode="aspectFill" />
            <text v-else class="home__store-letter">{{ firstChar(s.name) }}</text>
            <view v-if="s.businessStatus === 'online'" class="home__store-tag">营业中</view>
            <view v-else class="home__store-mask">休息中</view>
          </view>
          <view class="home__store-main">
            <text class="home__store-name">{{ s.name }}</text>
            <view class="home__store-meta">
              <view class="home__store-rating">
                <SvgIcon name="star" :size="18" color="#f7971e" />
                <text class="home__store-rating-num">{{ s.rating || '5' }}</text>
              </view>
              <text class="home__store-dot">·</text>
              <text class="home__store-stat">月售 {{ s.sales || 0 }}</text>
              <text v-if="s.distance != null" class="home__store-dot">·</text>
              <text v-if="s.distance != null" class="home__store-stat">{{ fmtDistance(s.distance) }}</text>
            </view>
            <view class="home__store-foot">
              <text class="home__store-foot-stat">起送 ¥{{ formatYuan(s.minOrderAmount) }}</text>
              <text class="home__store-foot-dot">·</text>
              <text class="home__store-foot-stat">配送 ¥{{ formatYuan(s.deliveryFee) }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
    <FloatTabBar active="home" />
  </view>
</template>

<style scoped>
.home {
  padding: 24rpx 24rpx 200rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, #fff7ed 0%, #f5f6f8 280rpx);
}

.home__top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.home__city {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
}
.home__city-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #172033;
}
.home__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #fff;
  border-radius: 999rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(31, 41, 55, 0.06);
}
.home__search-tip {
  font-size: 26rpx;
  color: #8a94a6;
}

.home__hero {
  background: linear-gradient(135deg, #ff7a45 0%, #ffb020 100%);
  color: #fff;
  border-radius: 32rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 18rpx 40rpx rgba(255, 107, 53, 0.24);
}
.home__hero-greet-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.home__hero-greet {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.86);
}
.home__hero-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 8rpx;
}
.home__hero-title {
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.home__hero-pill {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.22);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.home__hero-pill-dot {
  font-size: 16rpx;
  color: #fff;
}
.home__hero-pill-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}
.home__hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
}

.home__quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.home__quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.home__quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__quick-label {
  font-size: 22rpx;
  color: #5a6275;
}

.home__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.home__cat {
  background: #fff;
  border-radius: 999rpx;
  padding: 10rpx 22rpx;
  font-size: 22rpx;
  color: #5a6275;
  box-shadow: 0 4rpx 12rpx rgba(31, 41, 55, 0.04);
}

.home__section-h {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  padding: 8rpx 4rpx 16rpx;
}
.home__section-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.home__section-tip {
  font-size: 22rpx;
  color: #8a94a6;
}

.home__msg {
  text-align: center;
  padding: 80rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.home__msg--err {
  color: #d33;
}

/* 店铺卡 — 两列 grid */
.home__stores {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.home__store {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.home__store-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__store-img {
  width: 100%;
  height: 100%;
}
.home__store-letter {
  font-size: 96rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.96);
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.18);
}
.home__store-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(17, 153, 142, 0.95);
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-weight: 700;
}
.home__store-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home__store-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 16rpx;
  min-width: 0;
}
.home__store-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.home__store-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: #8a94a6;
  line-height: 1.2;
}
.home__store-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.home__store-rating-num {
  color: #f7971e;
  font-weight: 700;
  font-size: 22rpx;
}
.home__store-stat {
  color: #5a6275;
  font-size: 22rpx;
}
.home__store-dot {
  color: #c5c9d2;
}
.home__store-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
  margin-top: 4rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.05);
}
.home__store-foot-stat {
  color: #5a6275;
  font-size: 20rpx;
}
.home__store-foot-dot {
  color: #c5c9d2;
  font-size: 20rpx;
}
</style>
