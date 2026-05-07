<script setup lang="ts">
import { FOOD_CITIES, type FoodCity, writeStoredFoodCity } from '@/utils/food-city';

const cities = FOOD_CITIES;

function pick(city: FoodCity): void {
  writeStoredFoodCity(city);
  uni.navigateBack();
}
</script>

<template>
  <view class="city">
    <view class="city__title">选择城市</view>
    <view v-for="c in cities" :key="c.code" class="city__item" @tap="pick(c)">
      <text>{{ c.name }}</text>
      <text class="city__code">{{ c.code }}</text>
    </view>
  </view>
</template>

<style scoped>
.city {
  padding: 20rpx;
}
.city__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.city__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.city__code {
  color: #999;
  font-size: 24rpx;
}
</style>
