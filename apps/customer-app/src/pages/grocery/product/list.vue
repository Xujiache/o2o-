<script setup lang="ts">
import { onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { listGroceryProducts, type GroceryProductItem, type GroceryProductSort } from '@/api/grocery-products';
import { formatYuan } from '@/utils/format-price';

const SORTS: Array<{ key: GroceryProductSort; label: string }> = [
  { key: 'new', label: '上新' },
  { key: 'sales', label: '热销' },
  { key: 'price_asc', label: '价低' },
  { key: 'price_desc', label: '价高' },
];

const keyword = ref('');
const sort = ref<GroceryProductSort>('new');
const list = ref<GroceryProductItem[]>([]);
const loading = ref(false);
const pageNo = ref(1);
const pageSize = 20;
const total = ref(0);

async function load(reset = false): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  if (reset) pageNo.value = 1;
  try {
    const r = await listGroceryProducts({
      keyword: keyword.value || undefined,
      sort: sort.value,
      pageNo: pageNo.value,
      pageSize,
    });
    if (r.code === '0' && r.data) {
      total.value = r.data.total;
      list.value = reset ? r.data.items : [...list.value, ...r.data.items];
    }
  } finally {
    loading.value = false;
  }
}

function onSort(s: GroceryProductSort): void {
  if (sort.value === s) return;
  sort.value = s;
  void load(true);
}

function onSearch(): void {
  void load(true);
}

function loadMore(): void {
  if (list.value.length >= total.value) return;
  pageNo.value += 1;
  void load(false);
}

function goDetail(productId: string): void {
  uni.navigateTo({ url: `/pages/grocery/product/detail?productId=${productId}` });
}

function priceLabel(p: GroceryProductItem): string {
  if (p.pricingMode === 'weighed') return `¥${formatYuan(p.unitPricePerJin ?? '0')} /斤`;
  return `¥${formatYuan(p.price)}`;
}

onMounted(() => void load(true));
</script>

<template>
  <view class="page">
    <view class="topbar">
      <view class="topbar__search">
        <SvgIcon name="search" :size="26" color="#8a94a6" />
        <input
          v-model="keyword"
          class="topbar__input"
          placeholder="搜索商品名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="topbar__clear" @tap="((keyword = ''), onSearch())">清除</text>
      </view>
      <view class="topbar__sorts">
        <view
          v-for="s in SORTS"
          :key="s.key"
          class="sort-chip"
          :class="{ 'sort-chip--active': sort === s.key }"
          @tap="onSort(s.key)"
        >
          {{ s.label }}
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" @scrolltolower="loadMore">
      <view v-if="list.length === 0 && !loading" class="empty">没有匹配的商品</view>
      <view class="grid">
        <view v-for="p in list" :key="p.productId" class="card" @tap="goDetail(p.productId)">
          <view class="card__image">
            <image
              v-if="p.coverImageFileId"
              class="card__img"
              :src="`/api/v1/pub/files/${p.coverImageFileId}`"
              mode="aspectFill"
            />
            <view v-else class="card__placeholder">
              <SvgIcon name="apple" :size="44" color="#c5c9d2" />
            </view>
            <view v-if="p.pricingMode === 'weighed'" class="card__badge">称重</view>
          </view>
          <view class="card__body">
            <text class="card__name">{{ p.name }}</text>
            <view class="card__price-row">
              <text class="card__price">{{ priceLabel(p) }}</text>
              <text class="card__stock">库存 {{ p.stock }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="loading" class="more">加载中...</view>
      <view v-else-if="list.length >= total && total > 0" class="more">没有更多了</view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.topbar {
  padding: 18rpx 24rpx 12rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.04);
}
.topbar__search {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.topbar__input {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
}
.topbar__clear {
  font-size: 22rpx;
  color: #8a94a6;
}
.topbar__sorts {
  display: flex;
  gap: 12rpx;
}
.sort-chip {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #5a6275;
  font-size: 24rpx;
  font-weight: 600;
}
.sort-chip--active {
  background: #11998e;
  color: #fff;
}
.scroll {
  flex: 1;
  padding: 18rpx 24rpx 40rpx;
  box-sizing: border-box;
}
.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
}
.card__image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f0f2f6;
}
.card__img {
  width: 100%;
  height: 100%;
}
.card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card__badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  background: rgba(91, 95, 248, 0.92);
  color: #fff;
  border-radius: 999rpx;
}
.card__body {
  padding: 14rpx 16rpx 18rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.card__name {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.card__price {
  font-size: 28rpx;
  font-weight: 800;
  color: #11998e;
}
.card__stock {
  font-size: 20rpx;
  color: #8a94a6;
}
.more {
  padding: 30rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 22rpx;
}
</style>
