<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { type CityItem, getCities } from '@/api';
import NavBar from '@/components/common/NavBar.vue';

const list = ref<CityItem[]>([]);
const keyword = ref('');
const loading = ref(false);

const filtered = computed(() => {
  if (!keyword.value) return list.value;
  const kw = keyword.value.toLowerCase();
  return list.value.filter((c) => c.cityName.toLowerCase().includes(kw) || c.cityCode.includes(kw));
});

onMounted(async () => {
  loading.value = true;
  try {
    const r = await getCities(undefined, true);
    if (r.code === '0' && r.data) list.value = r.data;
  } finally {
    loading.value = false;
  }
});

function pick(city: CityItem): void {
  // 写入临时 storage,edit 页 onShow 读取
  uni.setStorageSync('o2o:customer:picked-city', JSON.stringify(city));
  uni.navigateBack();
}
</script>

<template>
  <view class="city">
    <NavBar title="选择城市" />
    <input class="city__search" placeholder="搜索城市" v-model="keyword" />
    <view v-if="loading" class="city__loading">加载中...</view>
    <view v-else>
      <view v-for="c in filtered" :key="c.cityCode" class="city__item" @click="pick(c)">
        <text>{{ c.cityName }}</text>
        <text class="city__code">{{ c.cityCode }}</text>
      </view>
      <view v-if="filtered.length === 0" class="city__empty">无匹配城市</view>
    </view>
  </view>
</template>

<style scoped>
.city {
  padding: 24rpx;
  background: #fff;
  min-height: 100vh;
}
.city__search {
  width: 100%;
  background: #fff;
  padding: 16rpx 24rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}
.city__loading,
.city__empty {
  text-align: center;
  color: #999;
  padding: 64rpx 0;
}
.city__item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.city__code {
  color: #999;
  font-size: 22rpx;
}
</style>
