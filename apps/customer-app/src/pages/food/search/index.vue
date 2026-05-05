<script setup lang="ts">
import { ref } from 'vue';

import { type FoodStoreItem, listFoodStores } from '@/api/food-stores';

const cityCode = ref('BJ');
const keyword = ref('');
const sort = ref<'distance' | 'sales' | 'rating' | 'recent'>('recent');
const list = ref<FoodStoreItem[]>([]);
const total = ref(0);
const loading = ref(false);

async function search(): Promise<void> {
  loading.value = true;
  try {
    const r = await listFoodStores({
      cityCode: cityCode.value,
      keyword: keyword.value || undefined,
      sort: sort.value,
      pageNo: 1,
      pageSize: 20,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function gotoStore(storeId: string): void {
  uni.navigateTo({ url: `/pages/food/store/detail?storeId=${storeId}` });
}
</script>

<template>
  <view class="search">
    <view class="search__bar">
      <input v-model="keyword" placeholder="搜索店铺/菜品" class="search__input" @confirm="search" />
      <button size="mini" @tap="search">搜索</button>
    </view>
    <view class="search__sort">
      <text
        v-for="s in ['recent', 'distance', 'sales', 'rating']"
        :key="s"
        :class="{ active: sort === s }"
        @tap="
          sort = s as typeof sort;
          search();
        "
      >
        {{ { recent: '默认', distance: '距离', sales: '销量', rating: '评分' }[s] }}
      </text>
    </view>
    <view v-if="loading" class="search__loading">加载中…</view>
    <view v-else-if="list.length === 0" class="search__empty">暂无结果(共 {{ total }} 个)</view>
    <view v-else>
      <view v-for="s in list" :key="s.storeId" class="search__store" @tap="gotoStore(s.storeId)">
        <view class="search__name">{{ s.name }}</view>
        <view class="search__meta">评分 {{ s.rating }} · 销量 {{ s.sales }}</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.search {
  padding: 20rpx;
}
.search__bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.search__input {
  flex: 1;
  background: #fff;
  padding: 12rpx 20rpx;
  border-radius: 30rpx;
}
.search__sort {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}
.search__sort text.active {
  color: #1989fa;
  font-weight: 600;
}
.search__store {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.search__name {
  font-weight: 600;
}
.search__meta {
  color: #888;
  font-size: 24rpx;
}
.search__loading,
.search__empty {
  text-align: center;
  padding: 60rpx 0;
  color: #888;
}
</style>
