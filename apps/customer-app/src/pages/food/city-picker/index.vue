<script setup lang="ts">
import { computed, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { FOOD_CITIES, readStoredFoodCity, type FoodCity, writeStoredFoodCity } from '@/utils/food-city';

const keyword = ref('');
const currentCity = ref(readStoredFoodCity());

const hotCities = computed(() => FOOD_CITIES.slice(0, 8));
const filteredCities = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return FOOD_CITIES;
  return FOOD_CITIES.filter((city) => city.name.includes(keyword.value.trim()) || city.code.toLowerCase().includes(kw));
});

const cityGroups = computed(() => {
  const map = new Map<string, FoodCity[]>();
  for (const city of filteredCities.value) {
    const group = city.code.slice(0, 1).toUpperCase() || '#';
    const list = map.get(group) ?? [];
    list.push(city);
    map.set(group, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, list]) => ({ letter, list }));
});

function goBack(): void {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({ url: '/pages/grocery/home/index' });
}

function pick(city: FoodCity): void {
  writeStoredFoodCity(city);
  currentCity.value = city;
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({ url: '/pages/grocery/home/index' });
}
</script>

<template>
  <view class="city-page">
    <view class="city-head">
      <view class="city-head__back" @tap="goBack">
        <SvgIcon name="chevron-left" :size="42" color="#172033" />
      </view>
      <text class="city-head__title">选择城市</text>
      <view class="city-head__spacer" />
    </view>

    <view class="city-search">
      <SvgIcon name="search" :size="30" color="#8a94a6" />
      <input v-model="keyword" class="city-search__input" placeholder="输入城市名或拼音首字母" />
    </view>

    <view class="current-card">
      <view class="current-card__main">
        <view class="current-card__icon">
          <SvgIcon name="location-pin" :size="34" color="#ff6b35" />
        </view>
        <view class="current-card__text">
          <text class="current-card__label">当前城市</text>
          <text class="current-card__name">{{ currentCity.name }}</text>
        </view>
      </view>
      <view class="current-card__btn" @tap="pick(currentCity)">使用</view>
    </view>

    <view v-if="!keyword.trim()" class="section">
      <view class="section__head">
        <text class="section__title">热门城市</text>
      </view>
      <view class="hot-grid">
        <view
          v-for="city in hotCities"
          :key="city.code"
          class="hot-grid__item"
          :class="{ 'hot-grid__item--active': city.code === currentCity.code }"
          @tap="pick(city)"
        >
          {{ city.name }}
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section__head">
        <text class="section__title">{{ keyword.trim() ? '搜索结果' : '全部城市' }}</text>
        <text class="section__count">{{ filteredCities.length }} 个</text>
      </view>

      <view v-if="cityGroups.length" class="city-list">
        <view v-for="group in cityGroups" :key="group.letter" class="city-group">
          <text class="city-group__letter">{{ group.letter }}</text>
          <view
            v-for="city in group.list"
            :key="city.code"
            class="city-row"
            :class="{ 'city-row--active': city.code === currentCity.code }"
            @tap="pick(city)"
          >
            <text class="city-row__name">{{ city.name }}</text>
            <view class="city-row__right">
              <text class="city-row__code">{{ city.code }}</text>
              <SvgIcon v-if="city.code === currentCity.code" name="check" :size="28" color="#ff6b35" />
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无匹配城市</view>
    </view>
  </view>
</template>

<style scoped>
.city-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 48rpx;
  background: #fff;
  box-sizing: border-box;
}

.city-head {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.city-head__back,
.city-head__spacer {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.city-head__title {
  color: #172033;
  font-size: 32rpx;
  font-weight: 900;
}

.city-search {
  margin-top: 18rpx;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  border: 1rpx solid #edf0f5;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.city-search__input {
  flex: 1;
  height: 76rpx;
  color: #172033;
  font-size: 27rpx;
  min-width: 0;
}

.current-card {
  margin-top: 24rpx;
  padding: 26rpx;
  border-radius: 24rpx;
  border: 1rpx solid #edf0f5;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 12rpx 34rpx rgba(31, 41, 55, 0.06);
}

.current-card__main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.current-card__icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
  background: #fff1e8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-card__text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.current-card__label {
  color: #8a94a6;
  font-size: 22rpx;
}

.current-card__name {
  color: #172033;
  font-size: 32rpx;
  font-weight: 900;
}

.current-card__btn {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 24rpx;
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
  font-weight: 900;
}

.section__count {
  color: #8a94a6;
  font-size: 23rpx;
}

.hot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14rpx;
}

.hot-grid__item {
  height: 68rpx;
  border-radius: 16rpx;
  background: #f5f6f8;
  color: #172033;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hot-grid__item--active {
  background: #fff1e8;
  color: #ff6b35;
}

.city-list {
  border: 1rpx solid #edf0f5;
  border-radius: 22rpx;
  overflow: hidden;
  background: #fff;
}

.city-group__letter {
  display: block;
  padding: 16rpx 24rpx 12rpx;
  background: #f8fafc;
  color: #8a94a6;
  font-size: 23rpx;
  font-weight: 900;
}

.city-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx 24rpx;
  border-top: 1rpx solid #edf0f5;
  background: #fff;
}

.city-row--active {
  background: #fffaf6;
}

.city-row__name {
  color: #172033;
  font-size: 29rpx;
  font-weight: 800;
}

.city-row__right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.city-row__code {
  color: #8a94a6;
  font-size: 23rpx;
  font-weight: 700;
}

.empty {
  padding: 72rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
}
</style>
