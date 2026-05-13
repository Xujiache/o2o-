<script setup lang="ts">
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { type FoodStoreItem, listFoodStores, type ListStoresQuery } from '@/api/food-stores';
import SvgIcon from '@/components/common/SvgIcon.vue';
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
const pageReady = ref(false);
const imageErrors = ref<Record<string, boolean>>({});

const topSortOptions: Array<{ label: string; value: StoreSort }> = [
  { label: '综合推荐', value: 'recent' },
  { label: '销量', value: 'sales' },
];

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: '全部', value: 'all' },
  { label: '营业中', value: 'online' },
  { label: '休息中', value: 'resting' },
];

const feeOptions: Array<{ label: string; value: FeeFilter }> = [
  { label: '免配送费', value: 'free' },
  { label: '低配送费', value: 'low' },
];

const minOrderOptions: Array<{ label: string; value: MinOrderFilter }> = [
  { label: '20元内起送', value: 'low' },
  { label: '20-50元起送', value: 'mid' },
];

const filterActive = computed(
  () => statusFilter.value !== 'all' || feeFilter.value !== 'all' || minOrderFilter.value !== 'all',
);

const filteredStores = computed(() => {
  return [...stores.value]
    .filter((store) => {
      if (statusFilter.value === 'online') return !isResting(store);
      if (statusFilter.value === 'resting') return isResting(store);
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

function storeHasImage(store: FoodStoreItem): boolean {
  return Boolean(store.iconUrl && !imageErrors.value[store.storeId]);
}

function markImageError(storeId: string): void {
  imageErrors.value = { ...imageErrors.value, [storeId]: true };
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
    imageErrors.value = {};
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

function goBack(): void {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({ url: '/pages/food/home/index' });
}

function goCity(): void {
  uni.navigateTo({ url: '/pages/food/city-picker/index' });
}

function changeSort(value: StoreSort): void {
  if (sort.value === value) return;
  sort.value = value;
  void fetchStores(true);
}

function setStatus(value: StatusFilter): void {
  statusFilter.value = value;
}

function setFee(value: FeeFilter): void {
  feeFilter.value = feeFilter.value === value ? 'all' : value;
}

function setMinOrder(value: MinOrderFilter): void {
  minOrderFilter.value = minOrderFilter.value === value ? 'all' : value;
}

function resetFilters(): void {
  statusFilter.value = 'all';
  feeFilter.value = 'all';
  minOrderFilter.value = 'all';
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
  pageReady.value = true;
  void fetchStores(true);
});

onShow(() => {
  if (!pageReady.value) return;
  const city = readStoredFoodCity();
  if (city.code !== cityCode.value) {
    cityCode.value = city.code;
    cityName.value = city.name;
    void fetchStores(true);
  }
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
    <view class="search-head">
      <view class="search-head__back" @tap="goBack">
        <SvgIcon name="chevron-left" :size="42" color="#172033" />
      </view>
      <view class="search-shell__box">
        <SvgIcon name="search" :size="30" color="#8a94a6" />
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
      <text class="summary__tag">休息店铺置底</text>
    </view>

    <view class="filter-panel">
      <view class="filter-panel__top">
        <view class="filter-panel__city" @tap="goCity">
          <SvgIcon name="location-pin" :size="31" color="#5a6275" />
          <text class="filter-panel__city-text">{{ cityName }}</text>
          <SvgIcon name="chevron-down" :size="22" color="#8a94a6" />
        </view>
        <view
          v-for="item in topSortOptions"
          :key="item.value"
          class="filter-panel__sort"
          :class="{ 'filter-panel__sort--active': sort === item.value }"
          @tap="changeSort(item.value)"
        >
          <text>{{ item.label }}</text>
          <SvgIcon v-if="item.value === 'recent'" name="chevron-down" :size="20" color="currentColor" />
        </view>
        <view class="filter-panel__sort" :class="{ 'filter-panel__sort--active': filterActive }" @tap="resetFilters">
          <text>筛选</text>
          <SvgIcon name="sliders-horizontal" :size="28" color="currentColor" />
        </view>
      </view>

      <scroll-view scroll-x class="filter-panel__chips" :show-scrollbar="false">
        <view class="filter-panel__chip-row">
          <view
            class="filter-chip"
            :class="{ 'filter-chip--active': sort === 'distance' }"
            @tap="changeSort('distance')"
          >
            距离优先
          </view>
          <view class="filter-chip" :class="{ 'filter-chip--active': sort === 'rating' }" @tap="changeSort('rating')">
            评分优先
          </view>
          <view
            v-for="item in statusOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ 'filter-chip--active': statusFilter === item.value }"
            @tap="setStatus(item.value)"
          >
            {{ item.label }}
          </view>
          <view
            v-for="item in feeOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ 'filter-chip--active': feeFilter === item.value }"
            @tap="setFee(item.value)"
          >
            {{ item.label }}
          </view>
          <view
            v-for="item in minOrderOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ 'filter-chip--active': minOrderFilter === item.value }"
            @tap="setMinOrder(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="filteredStores.length" class="waterfall">
      <view
        v-for="store in filteredStores"
        :key="store.storeId"
        class="store-card"
        :class="{ 'store-card--resting': isResting(store) }"
        @tap="gotoStore(store.storeId)"
      >
        <view class="store-card__cover" :style="storeHasImage(store) ? '' : storeCoverStyle(store.storeId)">
          <image
            v-if="storeHasImage(store)"
            :src="store.iconUrl || ''"
            mode="aspectFill"
            class="store-card__image"
            @error="markImageError(store.storeId)"
          />
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

.search-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.search-head__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  min-width: 0;
}

.search-shell__input {
  flex: 1;
  height: 74rpx;
  color: #172033;
  font-size: 27rpx;
  min-width: 0;
}

.search-shell__btn {
  width: 112rpx;
  height: 74rpx;
  line-height: 74rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 27rpx;
  font-weight: 700;
  flex-shrink: 0;
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

.filter-panel {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 -20rpx 18rpx;
  padding: 18rpx 20rpx 16rpx;
  background: #fff;
  border-top: 1rpx solid #edf0f5;
  border-bottom: 1rpx solid #edf0f5;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.04);
}

.filter-panel__top {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.9fr);
  align-items: center;
  gap: 12rpx;
}

.filter-panel__city,
.filter-panel__sort {
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #5a6275;
  font-size: 27rpx;
  font-weight: 800;
  min-width: 0;
}

.filter-panel__city {
  justify-content: flex-start;
}

.filter-panel__city-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-panel__sort--active {
  color: #172033;
}

.filter-panel__chips {
  width: 100%;
  white-space: nowrap;
  margin-top: 14rpx;
}

.filter-panel__chip-row {
  display: inline-flex;
  gap: 14rpx;
  padding: 2rpx 0 4rpx;
}

.filter-chip {
  padding: 14rpx 22rpx;
  border-radius: 12rpx;
  background: #f5f6f8;
  color: #172033;
  font-size: 25rpx;
  font-weight: 800;
}

.filter-chip--active {
  background: #ff6b35;
  color: #fff;
}

.waterfall {
  column-count: 2;
  column-gap: 18rpx;
}

.store-card {
  overflow: hidden;
  break-inside: avoid;
  display: inline-block;
  width: 100%;
  margin-bottom: 18rpx;
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
  height: 202rpx;
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
