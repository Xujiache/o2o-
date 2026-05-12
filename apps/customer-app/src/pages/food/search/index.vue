<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { readStoredFoodCity, resolveFoodCityName } from '@/utils/food-city';

const HOT_KEYWORDS = ['炸鸡', '奶茶', '盖饭', '米粉', '咖啡', '汉堡', '烧烤', '轻食', '面条', '水果'];
const HISTORY_KEY = 'food:search-history';

const storedCity = readStoredFoodCity();
const cityCode = ref(storedCity.code);
const cityName = ref(storedCity.name);
const routeCityCode = ref('');
const keyword = ref('');
const history = ref<string[]>([]);
const hotIndex = ref(0);
let hotTimer: ReturnType<typeof setInterval> | null = null;

const activeHot = computed(() => HOT_KEYWORDS[hotIndex.value % HOT_KEYWORDS.length] ?? HOT_KEYWORDS[0]!);
const searchPlaceholder = computed(() => (keyword.value.trim() ? '搜索店铺/菜品' : `大家都在搜：${activeHot.value}`));

function syncCity(): void {
  if (routeCityCode.value) {
    cityCode.value = routeCityCode.value;
    cityName.value = resolveFoodCityName(routeCityCode.value);
    return;
  }
  const city = readStoredFoodCity();
  cityCode.value = city.code;
  cityName.value = city.name;
}

function readHistory(): void {
  const stored = uni.getStorageSync(HISTORY_KEY);
  history.value = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [];
}

function saveHistory(value: string): void {
  const next = [value, ...history.value.filter((item) => item !== value)].slice(0, 10);
  history.value = next;
  uni.setStorageSync(HISTORY_KEY, next);
}

function clearHistory(): void {
  history.value = [];
  uni.removeStorageSync(HISTORY_KEY);
}

function submitSearch(value?: string): void {
  const nextKeyword = (value ?? keyword.value).trim() || activeHot.value;
  keyword.value = nextKeyword;
  saveHistory(nextKeyword);
  uni.navigateTo({
    url: `/pages/food/search/result?cityCode=${cityCode.value}&keyword=${encodeURIComponent(nextKeyword)}`,
  });
}

function startHotTimer(): void {
  stopHotTimer();
  hotTimer = setInterval(() => {
    if (!keyword.value.trim()) hotIndex.value = (hotIndex.value + 1) % HOT_KEYWORDS.length;
  }, 5000);
}

function stopHotTimer(): void {
  if (hotTimer) {
    clearInterval(hotTimer);
    hotTimer = null;
  }
}

onLoad((options) => {
  routeCityCode.value = (options?.cityCode as string | undefined) ?? '';
  const kw = (options?.keyword as string | undefined) ?? '';
  syncCity();
  readHistory();
  if (kw) {
    submitSearch(decodeURIComponent(kw));
  }
});

onShow(() => {
  syncCity();
  readHistory();
  startHotTimer();
});

onHide(stopHotTimer);
onUnload(stopHotTimer);
</script>

<template>
  <view class="search-page">
    <view class="search-bar">
      <view class="search-bar__box">
        <text class="search-bar__icon">⌕</text>
        <input
          v-model="keyword"
          class="search-bar__input"
          :placeholder="searchPlaceholder"
          confirm-type="search"
          @confirm="submitSearch()"
        />
      </view>
      <button class="search-bar__btn" @tap="submitSearch()">搜索</button>
    </view>

    <view class="city-row">
      <text class="city-row__name">{{ cityName }}</text>
      <text class="city-row__code">{{ cityCode }}</text>
    </view>

    <view class="hot-ticker" @tap="submitSearch(activeHot)">
      <text class="hot-ticker__label">实时热点</text>
      <text class="hot-ticker__word">{{ activeHot }}</text>
    </view>

    <view class="section">
      <view class="section__head">
        <text class="section__title">搜索热点</text>
      </view>
      <view class="chip-grid">
        <view v-for="(item, index) in HOT_KEYWORDS" :key="item" class="hot-chip" @tap="submitSearch(item)">
          <text class="hot-chip__rank">{{ index + 1 }}</text>
          <text class="hot-chip__text">{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section__head">
        <text class="section__title">历史搜索</text>
        <text v-if="history.length" class="section__action" @tap="clearHistory">清空</text>
      </view>
      <view v-if="history.length" class="history-list">
        <view v-for="item in history" :key="item" class="history-chip" @tap="submitSearch(item)">
          {{ item }}
        </view>
      </view>
      <view v-else class="empty-history">暂无历史搜索</view>
    </view>
  </view>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 24rpx;
  background: #fff;
  box-sizing: border-box;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.search-bar__box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  border: 1rpx solid #edf0f5;
}

.search-bar__icon {
  color: #8a94a6;
  font-size: 34rpx;
  line-height: 1;
}

.search-bar__input {
  flex: 1;
  height: 76rpx;
  font-size: 28rpx;
  color: #172033;
}

.search-bar__btn {
  width: 118rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.search-bar__btn::after {
  border: 0;
}

.city-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 20rpx 0 18rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

.city-row__name {
  color: #172033;
  font-weight: 700;
}

.city-row__code {
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
}

.hot-ticker {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fff4ed, #fff9f2);
  border: 1rpx solid #ffe2d3;
}

.hot-ticker__label {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}

.hot-ticker__word {
  color: #172033;
  font-size: 30rpx;
  font-weight: 800;
}

.section {
  margin-top: 34rpx;
}

.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.section__title {
  color: #172033;
  font-size: 30rpx;
  font-weight: 800;
}

.section__action {
  color: #8a94a6;
  font-size: 24rpx;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.hot-chip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  border: 1rpx solid #edf0f5;
  border-radius: 18rpx;
  background: #fff;
}

.hot-chip__rank {
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  text-align: center;
  border-radius: 10rpx;
  background: #ffefe8;
  color: #ff6b35;
  font-size: 22rpx;
  font-weight: 800;
}

.hot-chip__text {
  color: #172033;
  font-size: 27rpx;
  font-weight: 700;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.history-chip {
  max-width: 100%;
  padding: 14rpx 20rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #172033;
  font-size: 25rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-history {
  padding: 32rpx 0;
  color: #a1a8b5;
  font-size: 25rpx;
}
</style>
