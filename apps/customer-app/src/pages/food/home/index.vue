<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { type FoodHomeVo, getFoodHome } from '@/api/food-home';
import { listErrandTypes, type ErrandTypeVo } from '@/api/errand-types';
import { readStoredFoodCity } from '@/utils/food-city';
import { formatYuan } from '@/utils/format-price';

type Mode = 'food' | 'errand';

interface ModeMeta {
  key: Mode;
  label: string;
}
const MODES: ModeMeta[] = [
  { key: 'food', label: '外卖' },
  { key: 'errand', label: '跑腿' },
];
const mode = ref<Mode>('food');

const storedCity = readStoredFoodCity();
const cityCode = ref(storedCity.code);
const cityName = ref(storedCity.name);
const home = ref<FoodHomeVo | null>(null);
const loading = ref(false);
const error = ref('');
let lastLoadedCityCode = '';

const errandTypes = ref<ErrandTypeVo[]>([]);

const ERRAND_FORM_PATH: Record<string, string> = {
  BUY: '/pages/errand/form/buy',
  DELIVER: '/pages/errand/form/deliver',
  HELP: '/pages/errand/form/help',
  CUSTOM: '/pages/errand/form/custom',
};

const ERRAND_TYPE_META: Record<string, { icon: string; gradient: string }> = {
  BUY: { icon: 'shopping-cart', gradient: 'var(--brand-gradient)' },
  DELIVER: { icon: 'truck', gradient: 'var(--brand-gradient)' },
  HELP: { icon: 'bell', gradient: 'var(--brand-gradient)' },
  CUSTOM: { icon: 'sparkles', gradient: 'var(--brand-gradient)' },
};

const decoratedErrand = computed(() =>
  errandTypes.value.map((t) => ({
    ...t,
    icon: ERRAND_TYPE_META[t.typeCode]?.icon ?? 'package',
    gradient: ERRAND_TYPE_META[t.typeCode]?.gradient ?? 'var(--brand-gradient)',
  })),
);

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
  icon: string;
  label: string;
  color: string;
  action: 'errand-mode' | 'search-keyword' | 'address' | 'orders';
  keyword?: string;
}
const QUICK_ENTRIES: QuickEntry[] = [
  { key: 'errand', icon: 'motorcycle', label: '跑腿代办', color: '#4776E6', action: 'errand-mode' },
  {
    key: 'fried',
    icon: 'drumstick',
    label: '炸鸡专区',
    color: 'var(--brand-primary)',
    action: 'search-keyword',
    keyword: '炸鸡',
  },
  { key: 'rice', icon: 'utensils', label: '盖饭套餐', color: '#56AB2F', action: 'search-keyword', keyword: '套餐' },
  { key: 'drink', icon: 'cup-soda', label: '饮料解渴', color: '#11998E', action: 'search-keyword', keyword: '饮料' },
  { key: 'soup', icon: 'soup', label: '靓汤滋补', color: '#A17359', action: 'search-keyword', keyword: '汤' },
  { key: 'cold', icon: 'salad', label: '凉菜小食', color: '#FA709A', action: 'search-keyword', keyword: '凉菜' },
  { key: 'addr', icon: 'location-pin', label: '我的地址', color: '#F7971E', action: 'address' },
  { key: 'orders', icon: 'clipboard', label: '我的订单', color: '#8E54E9', action: 'orders' },
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

async function loadErrandTypes(): Promise<void> {
  if (errandTypes.value.length > 0) return;
  const r = await listErrandTypes();
  if (r.code === '0' && r.data) {
    errandTypes.value = r.data.list;
  }
}

function setMode(m: Mode): void {
  if (mode.value === m) return;
  mode.value = m;
  if (m === 'errand') {
    void loadErrandTypes();
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
    case 'errand-mode':
      setMode('errand');
      return;
    case 'search-keyword':
      if (e.keyword) gotoSearch(e.keyword);
      return;
    case 'address':
      uni.navigateTo({ url: '/pages/address/list' });
      return;
    case 'orders':
      uni.switchTab({ url: '/pages/grocery/order/list' });
      return;
  }
}

function gotoErrandForm(typeCode: string): void {
  uni.navigateTo({ url: ERRAND_FORM_PATH[typeCode] ?? '/pages/errand/form/custom' });
}
function gotoErrandOrders(): void {
  uni.setStorageSync('order-list-default-mode', 'errand');
  uni.switchTab({ url: '/pages/grocery/order/list' });
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

onMounted(() => {
  void loadHome();
});

onShow(() => {
  uni.hideTabBar({ animation: false });
  syncCity();
  if (!home.value || lastLoadedCityCode !== cityCode.value) {
    lastLoadedCityCode = cityCode.value;
    void loadHome();
  }
  if (mode.value === 'errand') void loadErrandTypes();
});
</script>

<template>
  <view class="food-home" :class="`food-home--${mode}`">
    <!-- segment 切换 -->
    <view class="segment">
      <view
        v-for="m in MODES"
        :key="m.key"
        class="segment__item"
        :class="{ 'segment__item--active': mode === m.key }"
        @tap="setMode(m.key)"
      >
        <text class="segment__label">{{ m.label }}</text>
        <view v-if="mode === m.key" class="segment__indicator" />
      </view>
    </view>

    <!-- 顶部:城市 + 搜索 -->
    <view class="topbar">
      <view class="topbar__city" @tap="gotoCityPicker">
        <SvgIcon
          name="location-pin"
          :size="30"
          :color="mode === 'food' ? 'var(--brand-primary)' : 'var(--brand-primary)'"
        />
        <text class="topbar__city-name">{{ cityName }}</text>
        <SvgIcon name="chevron-down" :size="20" color="var(--text-secondary)" />
      </view>
      <view class="topbar__search" @tap="gotoSearch()">
        <SvgIcon name="search" :size="26" color="var(--text-muted)" />
        <text class="topbar__search-tip">
          {{ mode === 'food' ? '搜索商家 / 菜品' : '搜索跑腿服务' }}
        </text>
      </view>
    </view>

    <!-- ============ 外卖 mode ============ -->
    <template v-if="mode === 'food'">
      <!-- Hero -->
      <view class="hero hero--food">
        <view class="hero__greet">
          <SvgIcon :name="greetingIcon" :size="22" color="rgba(255,255,255,0.92)" />
          <text class="hero__greet-text">{{ greeting }}</text>
        </view>
        <view class="hero__row">
          <text class="hero__title">同城速达</text>
          <view class="hero__pill">
            <view class="hero__pill-dot" />
            <text class="hero__pill-text">30 分钟必达</text>
          </view>
        </view>
        <text class="hero__sub">外卖 · 跑腿 · 实时追踪 · 售后无忧</text>
        <view class="hero__deco hero__deco--1" />
        <view class="hero__deco hero__deco--2" />
      </view>

      <!-- 快捷入口 -->
      <view class="quick">
        <view v-for="e in QUICK_ENTRIES" :key="e.key" class="quick__item" @tap="gotoQuickEntry(e)">
          <view class="quick__icon" :style="`background: ${e.color}1f;`">
            <SvgIcon :name="e.icon" :size="38" :color="e.color" />
          </view>
          <text class="quick__label">{{ e.label }}</text>
        </view>
      </view>

      <view v-if="loading" class="msg">加载中…</view>
      <view v-else-if="error" class="msg msg--err">{{ error }}</view>

      <template v-else-if="home">
        <view v-if="home.categories.length > 0" class="cats">
          <view v-for="c in home.categories" :key="c.categoryId" class="cats__item" @tap="gotoCategory(c.name)">
            <text class="cats__text">{{ c.name }}</text>
          </view>
        </view>

        <view class="section-h">
          <view class="section-h__line section-h__line--food" />
          <text class="section-h__title">为你推荐</text>
          <text class="section-h__tip">优选品质好店</text>
        </view>

        <view v-if="home.recommendedStores.length === 0" class="msg">
          <SvgIcon name="store" :size="80" color="#c5c9d2" />
          <text>暂无推荐店铺,稍后再试</text>
        </view>

        <view v-else class="stores">
          <view v-for="s in home.recommendedStores" :key="s.storeId" class="store" @tap="gotoStore(s.storeId)">
            <view class="store__cover" :style="!s.iconUrl ? storeCoverStyle(s.storeId) : ''">
              <image v-if="s.iconUrl" :src="s.iconUrl" class="store__img" mode="aspectFill" />
              <text v-else class="store__letter">{{ firstChar(s.name) }}</text>
              <view v-if="s.businessStatus === 'online'" class="store__tag">营业中</view>
              <view v-else class="store__mask">休息中</view>
            </view>
            <view class="store__main">
              <text class="store__name">{{ s.name }}</text>
              <view class="store__meta">
                <view class="store__rating">
                  <SvgIcon name="star" :size="16" color="#F7971E" />
                  <text class="store__rating-num">{{ s.rating || '5.0' }}</text>
                </view>
                <text class="store__dot">·</text>
                <text class="store__stat">月售 {{ s.sales || 0 }}</text>
                <text v-if="s.distance != null" class="store__dot">·</text>
                <text v-if="s.distance != null" class="store__stat">{{ fmtDistance(s.distance) }}</text>
              </view>
              <view class="store__foot">
                <text class="store__foot-stat">起送 ¥{{ formatYuan(s.minOrderAmount) }}</text>
                <text class="store__foot-dot">·</text>
                <text class="store__foot-stat">配送 ¥{{ formatYuan(s.deliveryFee) }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </template>

    <!-- ============ 跑腿 mode ============ -->
    <template v-else>
      <view class="hero hero--errand">
        <view class="hero__greet">
          <SvgIcon name="motorcycle" :size="22" color="rgba(255,255,255,0.92)" />
          <text class="hero__greet-text">骑手就在身边</text>
        </view>
        <view class="hero__row">
          <text class="hero__title">跑腿服务</text>
          <view class="hero__pill">
            <view class="hero__pill-dot" />
            <text class="hero__pill-text">最快 30 分钟送达</text>
          </view>
        </view>
        <text class="hero__sub">代买、代送、代办,一键发布需求</text>
        <view class="hero__deco hero__deco--1 hero__deco--errand" />
        <view class="hero__deco hero__deco--2 hero__deco--errand" />
      </view>

      <view class="section-h">
        <view class="section-h__line section-h__line--errand" />
        <text class="section-h__title">选择服务类型</text>
        <text class="section-h__tip">需要什么,告诉我</text>
      </view>

      <view class="errand-grid">
        <view v-for="t in decoratedErrand" :key="t.typeCode" class="errand-card" @tap="gotoErrandForm(t.typeCode)">
          <view class="errand-card__icon" :style="{ background: t.gradient }">
            <SvgIcon :name="t.icon" :size="40" color="#fff" />
          </view>
          <text class="errand-card__title">{{ t.name }}</text>
          <text class="errand-card__desc">{{ t.description }}</text>
        </view>
      </view>

      <view v-if="decoratedErrand.length === 0" class="msg">
        <SvgIcon name="motorcycle" :size="80" color="#c5c9d2" />
        <text>暂无可用的跑腿服务</text>
      </view>

      <view class="errand-entry" @tap="gotoErrandOrders">
        <view class="errand-entry__icon">
          <SvgIcon name="clipboard" :size="34" color="var(--brand-primary)" />
        </view>
        <view class="errand-entry__main">
          <text class="errand-entry__title">我的跑腿订单</text>
          <text class="errand-entry__desc">查看订单状态、轨迹与历史</text>
        </view>
        <text class="errand-entry__arrow">›</text>
      </view>
    </template>

    <FloatTabBar active="home" />
  </view>
</template>

<style scoped>
.food-home {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 0 24rpx 200rpx;
  transition: background 280ms ease;
}
.food-home--food {
  background: #fff;
}
.food-home--errand {
  background: #fff;
}

/* ===== 顶部 ===== */
.topbar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.topbar__city {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}
.topbar__city-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.topbar__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #fff;
  border-radius: 999rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(31, 41, 55, 0.06);
}
.topbar__search-tip {
  font-size: 26rpx;
  color: var(--text-muted);
}

/* ===== segment 切换 ===== */
.segment {
  display: flex;
  gap: 48rpx;
  padding: 20rpx 12rpx 12rpx;
  margin-bottom: 16rpx;
}
.segment__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding-bottom: 16rpx;
  opacity: 0.55;
  transition: opacity 200ms ease;
}
.segment__item--active {
  opacity: 1;
}
.segment__label {
  font-size: 38rpx;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 1rpx;
}
.segment__indicator {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 56rpx;
  height: 8rpx;
  border-radius: 999rpx;
}
.food-home--food .segment__indicator {
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 12rpx rgba(46, 156, 93, 0.36);
}
.food-home--errand .segment__indicator {
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 12rpx rgba(46, 156, 93, 0.36);
}

/* ===== Hero ===== */
.hero {
  position: relative;
  color: #fff;
  border-radius: 32rpx;
  padding: 36rpx 32rpx 40rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}
.hero--food {
  background: var(--brand-gradient);
  box-shadow: 0 20rpx 44rpx rgba(46, 156, 93, 0.28);
}
.hero--errand {
  background: var(--brand-gradient);
  box-shadow: 0 20rpx 44rpx rgba(46, 156, 93, 0.28);
}
.hero__greet {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.hero__greet-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 0.5rpx;
}
.hero__row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 12rpx;
}
.hero__title {
  font-size: 52rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.hero__pill {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.22);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.hero__pill-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 4rpx rgba(255, 255, 255, 0.24);
}
.hero__pill-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}
.hero__sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 0.5rpx;
}
.hero__deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: none;
}
.hero__deco--1 {
  width: 200rpx;
  height: 200rpx;
  right: -60rpx;
  top: -40rpx;
}
.hero__deco--2 {
  width: 140rpx;
  height: 140rpx;
  right: 100rpx;
  bottom: -60rpx;
}

/* ===== 快捷入口 ===== */
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx 18rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.05);
}
.quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.quick__icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick__label {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 分类 ===== */
.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.cats__item {
  background: #fff;
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  box-shadow: 0 4rpx 12rpx rgba(31, 41, 55, 0.04);
}
.cats__text {
  font-weight: 500;
}

/* ===== 标题区 ===== */
.section-h {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx 4rpx 20rpx;
}
.section-h__line {
  width: 8rpx;
  height: 30rpx;
  border-radius: 4rpx;
}
.section-h__line--food {
  background: linear-gradient(180deg, var(--brand-primary), var(--brand-primary-light));
}
.section-h__line--errand {
  background: linear-gradient(180deg, var(--brand-primary), var(--brand-primary-light));
}
.section-h__title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 0.5rpx;
}
.section-h__tip {
  font-size: 22rpx;
  color: var(--text-muted);
}

/* ===== 通用消息区 ===== */
.msg {
  text-align: center;
  padding: 80rpx 0;
  color: var(--text-muted);
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.msg--err {
  color: #d33;
}

/* ===== 店铺卡 ===== */
.stores {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.store {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 28rpx rgba(31, 41, 55, 0.06);
}
.store__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.store__img {
  width: 100%;
  height: 100%;
}
.store__letter {
  font-size: 96rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.96);
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.18);
}
.store__tag {
  position: absolute;
  top: 14rpx;
  left: 14rpx;
  background: rgba(17, 153, 142, 0.95);
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-weight: 700;
}
.store__mask {
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
.store__main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 18rpx 16rpx;
  min-width: 0;
}
.store__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.store__meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.2;
}
.store__rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.store__rating-num {
  color: #f7971e;
  font-weight: 700;
  font-size: 22rpx;
}
.store__stat {
  color: var(--text-secondary);
  font-size: 22rpx;
}
.store__dot {
  color: #c5c9d2;
}
.store__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
  margin-top: 4rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
}
.store__foot-stat {
  color: var(--text-secondary);
  font-size: 20rpx;
}
.store__foot-dot {
  color: #c5c9d2;
  font-size: 20rpx;
}

/* ===== 跑腿卡片 grid ===== */
.errand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.errand-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  align-items: flex-start;
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 10rpx 28rpx rgba(31, 41, 55, 0.06);
  overflow: hidden;
}
.errand-card__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.18);
}
.errand-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.errand-card__desc {
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ===== 跑腿订单入口 ===== */
.errand-entry {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 26rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.errand-entry__icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, rgba(46, 156, 93, 0.14), rgba(95, 190, 125, 0.14));
  display: flex;
  align-items: center;
  justify-content: center;
}
.errand-entry__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.errand-entry__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.errand-entry__desc {
  font-size: 22rpx;
  color: var(--text-muted);
}
.errand-entry__arrow {
  color: #c5c9d2;
  font-size: 40rpx;
}
</style>
