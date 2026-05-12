<script setup lang="ts">
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { type FoodStoreItem, listFoodStores, type ListStoresQuery } from '@/api/food-stores';
import { readStoredFoodCity, resolveFoodCityName } from '@/utils/food-city';
import { formatYuan } from '@/utils/format-price';

type StoreSort = NonNullable<ListStoresQuery['sort']>;
type StatusFilter = 'all' | 'online' | 'resting';
type FeeFilter = 'all' | 'free' | 'low';
type MinOrderFilter = 'all' | 'low' | 'mid';

const HISTORY_KEY = 'food:search-history';
const PAGE_SIZE = 20;

const storedCity = readStoredFoodCity();
const cityCode = ref(storedCity.code);
const cityName = ref(storedCity.name);
const keyword = ref('');
const sort = ref<StoreSort>('recent');
const statusFilter = ref<StatusFilter>('all');
const feeFilter = ref<FeeFilter>('all');
const minOrderFilter = ref<MinOrderFilter>('all');
const stores = ref<FoodStoreItem[]>([]);
const total = ref(0);
const pageNo = ref(1);
const loading = ref(false);
const finished = ref(false);

const sortOptions: Array<{ label: string; value: StoreSort }> = [
  { label: '综合', value: 'recent' },
  { label: '距离', value: 'distance' },
  { label: '销量', value: 'sales' },
  { label: '评分', value: 'rating' },
];

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: '全部', value: 'all' },
  { label: '营业中', value: 'online' },
  { label: '含休息', value: 'resting' },
];

const feeOptions: Array<{ label: string; value: FeeFilter }> = [
  { label: '配送费', value: 'all' },
  { label: '免配送费', value: 'free' },
  { label: '低配送费', value: 'low' },
];

const minOrderOptions: Array<{ label: string; value: MinOrderFilter }> = [
  { label: '起送价', value: 'all' },
  { label: '20元内', value: 'low' },
  { label: '20-50元', value: 'mid' },
];

const filteredStores = computed(() => {
  return [...stores.value]
    .filter((store) => {
      if (statusFilter.value === 'online') return !isResting(store);
      if (statusFilter.value === 'resting') return true;
      return true;
    })
    .filter((store) => {
      const fee = amountCents(store.deliveryFee);
      if (feeFilter.value === 'free') return fee === 0;
      if (feeFilter.value === 'low') return fee > 0 && fee <= 500;
      return true;
    })
    .filter((store) => {
      const minOrder = amountCents(store.minOrderAmount);
      if (minOrderFilter.value === 'low') return minOrder <= 2000;
      if (minOrderFilter.value === 'mid') return minOrder > 2000 && minOrder <= 5000;
      return true;
    })
    .sort((a, b) => Number(isResting(a)) - Number(isResting(b)));
});

const leftStores = computed(() => filteredStores.value.filter((_, index) => index % 2 === 0));
const rightStores = computed(() => filteredStores.value.filter((_, index) => index % 2 === 1));

function amountCents(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isResting(store: FoodStoreItem): boolean {
  return store.businessStatus !== 'online';
}

function fmtDistance(meters: number | null): string {
  if (meters == null) return '距离待同步';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function firstChar(name: string): string {
  return name.trim().slice(0, 1) || '店';
}

function storeCoverStyle(storeId: string): string {
  const palettes = [
    ['#ff7a45', '#ffd7bd'],
    ['#14b8a6', '#c7f6ed'],
    ['#4776e6', '#d9e5ff'],
    ['#f59e0b', '#fff0c2'],
  ];
  const index = Math.abs(hash(storeId)) % palettes.length;
  const [a, b] = palettes[index]!;
  return `background: linear-gradient(135deg, ${a}, ${b});`;
}

function hash(input: string): number {
  return input.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function saveHistory(value: string): void {
  const stored = uni.getStorageSync(HISTORY_KEY);
  const history = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [];
  const next = [value, ...history.filter((item) => item !== value)].slice(0, 10);
  uni.setStorageSync(HISTORY_KEY, next);
}

async function fetchStores(reset = false): Promise<void> {
  if (loading.value) return;
  if (!reset && finished.value) return;
  if (reset) {
    pageNo.value = 1;
    finished.value = false;
    stores.value = [];
  }

  loading.value = true;
  try {
    const r = await listFoodStores({
      cityCode: cityCode.value,
      keyword: keyword.value || undefined,
      sort: sort.value,
      pageNo: pageNo.value,
      pageSize: PAGE_SIZE,
    });
    if (r.code === '0' && r.data) {
      const list = r.data.list ?? [];
      stores.value = reset ? list : stores.value.concat(list);
      total.value = r.data.total;
      finished.value = stores.value.length >= r.data.total || list.length < PAGE_SIZE;
      pageNo.value += 1;
    }
  } finally {
    loading.value = false;
  }
}

function changeSort(value: StoreSort): void {
  if (sort.value === value) return;
  sort.value = value;
  void fetchStores(true);
}

function applyFilter(): void {
  void fetchStores(true);
}

function submitSearch(): void {
  const nextKeyword = keyword.value.trim();
  if (!nextKeyword) {
    uni.showToast({ title: '请输入搜索内容', icon: 'none' });
    return;
  }
  keyword.value = nextKeyword;
  saveHistory(nextKeyword);
  void fetchStores(true);
}

function gotoStore(storeId: string): void {
  uni.navigateTo({ url: `/pages/food/store/detail?storeId=${storeId}` });
}

onLoad((options) => {
  const routeCityCode = (options?.cityCode as string | undefined) || storedCity.code;
  cityCode.value = routeCityCode;
  cityName.value = routeCityCode ? resolveFoodCityName(routeCityCode) : storedCity.name;
  keyword.value = decodeURIComponent((options?.keyword as string | undefined) ?? '');
  if (keyword.value) saveHistory(keyword.value);
  void fetchStores(true);
});

onReachBottom(() => {
  void fetchStores(false);
});

onPullDownRefresh(async () => {
  await fetchStores(true);
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="result-page">
    <view class="search-shell">
      <view class="search-shell__box">
        <text class="search-shell__icon">⌕</text>
        <input
          v-model="keyword"
          class="search-shell__input"
          confirm-type="search"
          placeholder="搜索店铺/菜品"
          @confirm="submitSearch"
        />
      </view>
      <button class="search-shell__btn" @tap="submitSearch">搜索</button>
    </view>

    <view class="summary">
      <view>
        <text class="summary__title">{{ keyword || '搜索结果' }}</text>
        <text class="summary__sub">{{ cityName }} · 共 {{ total }} 个结果</text>
      </view>
      <text class="summary__tag">休息店铺置底展示</text>
    </view>

    <view class="filter-bar">
      <scroll-view scroll-x class="filter-bar__scroll" show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="item in sortOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ 'filter-chip--active': sort === item.value }"
            @tap="changeSort(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
      <scroll-view scroll-x class="filter-bar__scroll" show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="item in statusOptions"
            :key="item.value"
            class="filter-chip filter-chip--soft"
            :class="{ 'filter-chip--active': statusFilter === item.value }"
            @tap="
              statusFilter = item.value;
              applyFilter();
            "
          >
            {{ item.label }}
          </view>
          <view
            v-for="item in feeOptions"
            :key="item.value"
            class="filter-chip filter-chip--soft"
            :class="{ 'filter-chip--active': feeFilter === item.value }"
            @tap="
              feeFilter = item.value;
              applyFilter();
            "
          >
            {{ item.label }}
          </view>
          <view
            v-for="item in minOrderOptions"
            :key="item.value"
            class="filter-chip filter-chip--soft"
            :class="{ 'filter-chip--active': minOrderFilter === item.value }"
            @tap="
              minOrderFilter = item.value;
              applyFilter();
            "
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="filteredStores.length" class="waterfall">
      <view class="waterfall__column">
        <view
          v-for="store in leftStores"
          :key="store.storeId"
          class="store-card"
          :class="{ 'store-card--resting': isResting(store) }"
          @tap="gotoStore(store.storeId)"
        >
          <view class="store-card__cover" :style="!store.iconUrl ? storeCoverStyle(store.storeId) : ''">
            <image v-if="store.iconUrl" :src="store.iconUrl" mode="aspectFill" class="store-card__image" />
            <text v-else class="store-card__letter">{{ firstChar(store.name) }}</text>
            <view class="store-card__status" :class="{ 'store-card__status--rest': isResting(store) }">
              {{ isResting(store) ? '休息中' : '营业中' }}
            </view>
          </view>
          <view class="store-card__body">
            <text class="store-card__name">{{ store.name }}</text>
            <text v-if="store.intro" class="store-card__intro">{{ store.intro }}</text>
            <view class="store-card__meta">
              <text>评分 {{ store.rating || '5.0' }}</text>
              <text>月售 {{ store.sales || 0 }}</text>
            </view>
            <view class="store-card__meta">
              <text>{{ fmtDistance(store.distance) }}</text>
              <text>配送 {{ formatYuan(store.deliveryFee) }} 元</text>
            </view>
            <text class="store-card__price">起送 {{ formatYuan(store.minOrderAmount) }} 元</text>
          </view>
        </view>
      </view>

      <view class="waterfall__column">
        <view
          v-for="store in rightStores"
          :key="store.storeId"
          class="store-card"
          :class="{ 'store-card--resting': isResting(store) }"
          @tap="gotoStore(store.storeId)"
        >
          <view class="store-card__cover" :style="!store.iconUrl ? storeCoverStyle(store.storeId) : ''">
            <image v-if="store.iconUrl" :src="store.iconUrl" mode="aspectFill" class="store-card__image" />
            <text v-else class="store-card__letter">{{ firstChar(store.name) }}</text>
            <view class="store-card__status" :class="{ 'store-card__status--rest': isResting(store) }">
              {{ isResting(store) ? '休息中' : '营业中' }}
            </view>
          </view>
          <view class="store-card__body">
            <text class="store-card__name">{{ store.name }}</text>
            <text v-if="store.intro" class="store-card__intro">{{ store.intro }}</text>
            <view class="store-card__meta">
              <text>评分 {{ store.rating || '5.0' }}</text>
              <text>月售 {{ store.sales || 0 }}</text>
            </view>
            <view class="store-card__meta">
              <text>{{ fmtDistance(store.distance) }}</text>
              <text>配送 {{ formatYuan(store.deliveryFee) }} 元</text>
            </view>
            <text class="store-card__price">起送 {{ formatYuan(store.minOrderAmount) }} 元</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="loading" class="state">正在加载</view>
    <view v-else class="state">暂无匹配结果</view>
    <view v-if="filteredStores.length && loading" class="state state--small">加载中</view>
    <view v-if="filteredStores.length && finished" class="state state--small">没有更多了</view>
  </view>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  padding: 20rpx 20rpx 44rpx;
  background: #fff;
  box-sizing: border-box;
}

.search-shell {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.search-shell__box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 74rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  border: 1rpx solid #edf0f5;
}

.search-shell__icon {
  color: #8a94a6;
  font-size: 34rpx;
}

.search-shell__input {
  flex: 1;
  height: 74rpx;
  color: #172033;
  font-size: 27rpx;
}

.search-shell__btn {
  width: 118rpx;
  height: 74rpx;
  line-height: 74rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 27rpx;
  font-weight: 700;
}

.search-shell__btn::after {
  border: 0;
}

.summary {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18rpx;
  margin: 24rpx 0 18rpx;
}

.summary__title,
.summary__sub {
  display: block;
}

.summary__title {
  color: #172033;
  font-size: 34rpx;
  font-weight: 900;
}

.summary__sub {
  color: #8a94a6;
  font-size: 23rpx;
  margin-top: 6rpx;
}

.summary__tag {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #6b7280;
  font-size: 22rpx;
}

.filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 -20rpx 18rpx;
  padding: 14rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #edf0f5;
}

.filter-bar__scroll {
  width: 100%;
  white-space: nowrap;
}

.filter-row {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.filter-chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #172033;
  font-size: 24rpx;
  font-weight: 700;
}

.filter-chip--soft {
  font-weight: 600;
  color: #6b7280;
}

.filter-chip--active {
  background: #ff6b35;
  color: #fff;
}

.waterfall {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18rpx;
}

.waterfall__column {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  min-width: 0;
}

.store-card {
  overflow: hidden;
  border-radius: 20rpx;
  border: 1rpx solid #edf0f5;
  background: #fff;
  box-shadow: 0 8rpx 22rpx rgba(31, 41, 55, 0.04);
}

.store-card--resting {
  filter: grayscale(1);
  opacity: 0.72;
}

.store-card__cover {
  position: relative;
  height: 192rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6f8;
}

.store-card__image {
  width: 100%;
  height: 100%;
}

.store-card__letter {
  color: #fff;
  font-size: 58rpx;
  font-weight: 900;
}

.store-card__status {
  position: absolute;
  left: 12rpx;
  top: 12rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(20, 184, 166, 0.92);
  color: #fff;
  font-size: 20rpx;
  font-weight: 800;
}

.store-card__status--rest {
  background: rgba(23, 32, 51, 0.72);
}

.store-card__body {
  padding: 16rpx;
}

.store-card__name {
  display: block;
  color: #172033;
  font-size: 27rpx;
  font-weight: 900;
  line-height: 1.35;
}

.store-card__intro {
  display: block;
  margin-top: 6rpx;
  color: #8a94a6;
  font-size: 21rpx;
  line-height: 1.35;
}

.store-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 21rpx;
}

.store-card__price {
  display: block;
  margin-top: 12rpx;
  color: #ff6b35;
  font-size: 23rpx;
  font-weight: 800;
}

.state {
  padding: 80rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
}

.state--small {
  padding: 28rpx 0;
  font-size: 23rpx;
}
</style>
