<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
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
const searchPlaceholder = computed(() => (keyword.value.trim() ? '搜索店铺/菜品' : activeHot.value));

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

function goBack(): void {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({ url: '/pages/grocery/home/index' });
}

function goCity(): void {
  uni.navigateTo({ url: '/pages/food/city-picker/index' });
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
    <view class="search-head">
      <view class="search-head__back" @tap="goBack">
        <SvgIcon name="chevron-left" :size="42" color="#172033" />
      </view>
      <view class="search-bar__box">
        <SvgIcon name="search" :size="30" color="#8a94a6" />
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

    <view class="city-card" @tap="goCity">
      <view class="city-card__main">
        <SvgIcon name="location-pin" :size="34" color="#ff6b35" />
        <view class="city-card__text">
          <text class="city-card__label">当前城市</text>
          <text class="city-card__name">{{ cityName }}</text>
        </view>
      </view>
      <SvgIcon name="chevron-right" :size="30" color="#8a94a6" />
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
  min-width: 0;
}

.search-bar__input {
  flex: 1;
  height: 76rpx;
  font-size: 28rpx;
  color: #172033;
  min-width: 0;
}

.search-bar__btn {
  width: 112rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 27rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.search-bar__btn::after {
  border: 0;
}

.city-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 22rpx;
  border: 1rpx solid #edf0f5;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(31, 41, 55, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.city-card__main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.city-card__text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.city-card__label {
  color: #8a94a6;
  font-size: 22rpx;
}

.city-card__name {
  color: #172033;
  font-size: 31rpx;
  font-weight: 800;
}

.section {
  margin-top: 36rpx;
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
  padding: 8rpx 0 8rpx 24rpx;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.history-chip {
  max-width: 100%;
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #172033;
  font-size: 25rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-history {
  padding: 42rpx 0;
  color: #a1a8b5;
  font-size: 25rpx;
}
</style>
