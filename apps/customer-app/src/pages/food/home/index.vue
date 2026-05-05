<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { type FoodHomeVo, getFoodHome } from '@/api/food-home';

const cityCode = ref('BJ');
const cityName = ref('北京');
const home = ref<FoodHomeVo | null>(null);
const loading = ref(false);
const error = ref('');

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
function gotoSearch(): void {
  uni.navigateTo({ url: '/pages/food/search/index?cityCode=' + cityCode.value });
}
function gotoStore(storeId: string): void {
  uni.navigateTo({ url: `/pages/food/store/detail?storeId=${storeId}` });
}

onMounted(loadHome);
</script>

<template>
  <view class="home">
    <view class="home__header">
      <view class="home__city" @tap="gotoCityPicker">{{ cityName }} ▾</view>
      <view class="home__search" @tap="gotoSearch">🔍 搜索店铺/菜品</view>
    </view>

    <view v-if="loading" class="home__loading">加载中…</view>
    <view v-else-if="error" class="home__error">{{ error }}</view>
    <template v-else-if="home">
      <view class="home__categories">
        <view v-for="c in home.categories" :key="c.categoryId" class="home__cat">
          <text>{{ c.name }}</text>
        </view>
      </view>

      <view class="home__title">推荐店铺</view>
      <view v-if="home.recommendedStores.length === 0" class="home__empty">暂无推荐店铺</view>
      <view v-else class="home__stores">
        <view v-for="s in home.recommendedStores" :key="s.storeId" class="home__store" @tap="gotoStore(s.storeId)">
          <view class="home__store-name">{{ s.name }}</view>
          <view class="home__store-meta">
            <text>评分 {{ s.rating }}</text>
            <text v-if="s.distance != null">· {{ s.distance }}m</text>
            <text>· 起送 {{ Number(s.minOrderAmount) / 100 }} 元</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.home {
  padding: 20rpx;
}
.home__header {
  display: flex;
  gap: 20rpx;
  align-items: center;
  margin-bottom: 30rpx;
}
.home__city {
  font-weight: 600;
}
.home__search {
  flex: 1;
  background: #f3f3f3;
  border-radius: 30rpx;
  padding: 12rpx 20rpx;
  color: #999;
}
.home__categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.home__cat {
  background: #fff;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 12rpx;
}
.home__title {
  font-size: 32rpx;
  font-weight: 600;
  margin: 20rpx 0;
}
.home__store {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.home__store-name {
  font-weight: 600;
  font-size: 30rpx;
  margin-bottom: 8rpx;
}
.home__store-meta {
  font-size: 24rpx;
  color: #888;
  display: flex;
  gap: 12rpx;
}
.home__loading,
.home__error,
.home__empty {
  text-align: center;
  padding: 80rpx 0;
  color: #888;
}
</style>
