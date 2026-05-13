<script setup lang="ts">
/**
 * 生鲜商品列表 — 商家
 *  - 分类筛选 / 关键词搜索
 *  - 上架/下架(PATCH .../shelf)
 *  - 新建/编辑跳 product-edit
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { listCategories, type CategoryVo } from '@/api';
import { type GroceryProductItemVo, listGroceryProducts, setGroceryProductShelf } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const categories = ref<CategoryVo[]>([]);
const currentCat = ref<string>('');
const keyword = ref<string>('');
const list = ref<GroceryProductItemVo[]>([]);
const total = ref(0);
const loading = ref(false);

const catTabs = computed(() => [{ categoryId: '', name: '全部' } as CategoryVo, ...categories.value]);

onMounted(() => {
  void loadAll();
});

onShow(() => uni.hideTabBar({ animation: false }));

async function loadAll(): Promise<void> {
  await loadCategories();
  await loadList();
}

async function loadCategories(): Promise<void> {
  const r = await listCategories();
  if (r.code === '0' && r.data) categories.value = r.data;
}

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listGroceryProducts({
      categoryId: currentCat.value || undefined,
      keyword: keyword.value.trim() || undefined,
      pageNo: 1,
      pageSize: 50,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.items;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function onCatTap(catId: string): void {
  currentCat.value = catId;
  void loadList();
}

function onSearch(): void {
  void loadList();
}

function onAdd(): void {
  uni.navigateTo({ url: '/pages/grocery/product-edit' });
}

function onEdit(p: GroceryProductItemVo): void {
  // 商家端无详情接口,通过 storage 传整个商品快照给编辑页
  try {
    uni.setStorageSync(`o2o:m:grocery:product:${p.productId}`, JSON.stringify(p));
  } catch {
    // 容忍
  }
  uni.navigateTo({ url: `/pages/grocery/product-edit?productId=${p.productId}` });
}

async function onToggleShelf(p: GroceryProductItemVo, e?: Event): Promise<void> {
  // 注:无 saleStatus 字段返回,我们用 sales 无法判断,简化为始终下架/上架二选一靠按钮文案
  // 实际后端不在 item 上返回 saleStatus,但 setShelf 是幂等开关,这里默认按钮触发"下架"
  // 由于列表只查 on_shelf?其实后端 listForMerchant 返回所有状态,需要改进 UX:
  // 我们简化:点击直接尝试下架 → off_shelf
  e?.stopPropagation?.();
  const target = 'off_shelf' as const;
  const r = await setGroceryProductShelf(p.productId, target);
  if (r.code === '0') {
    uni.showToast({ title: '已下架', icon: 'success' });
    await loadList();
  }
}

async function onShelfOn(p: GroceryProductItemVo, e?: Event): Promise<void> {
  e?.stopPropagation?.();
  const r = await setGroceryProductShelf(p.productId, 'on_shelf');
  if (r.code === '0') {
    uni.showToast({ title: '已上架', icon: 'success' });
    await loadList();
  }
}

function fmtYuan(cents: string | null | undefined): string {
  if (cents == null) return '0.00';
  return (Number(cents) / 100).toFixed(2);
}

function unitLabel(unit: GroceryProductItemVo['weightUnit']): string {
  if (unit === 'jin') return '/斤';
  if (unit === 'kg') return '/公斤';
  if (unit === 'g') return '/克';
  return '/份';
}

function firstChar(n: string): string {
  return n ? n.slice(0, 1) : '生';
}

function gotoPoints(): void {
  uni.navigateTo({ url: '/pages/grocery/pickup-points' });
}
</script>

<template>
  <view class="gp">
    <view class="gp__head">
      <view class="gp__head-l">
        <text class="gp__title">生鲜商品</text>
        <text class="gp__sub">共 {{ total }} 个 SKU</text>
      </view>
      <view class="gp__head-r" @tap="gotoPoints">
        <SvgIcon name="location-pin" :size="20" color="#5a6275" />
        <text>自提点</text>
      </view>
    </view>

    <!-- 搜索 -->
    <view class="gp__search">
      <SvgIcon name="search" :size="20" color="#8a94a6" />
      <input class="gp__search-input" v-model="keyword" placeholder="搜索商品名" @confirm="onSearch" />
      <view class="gp__search-btn" @tap="onSearch">搜索</view>
    </view>

    <!-- 分类 tabs -->
    <scroll-view class="gp__cats" scroll-x>
      <view class="gp__cats-row">
        <view
          v-for="c in catTabs"
          :key="c.categoryId || 'all'"
          class="gp__cat"
          :class="{ 'gp__cat--active': currentCat === c.categoryId }"
          @tap="onCatTap(c.categoryId)"
        >
          <text>{{ c.name }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading && list.length === 0" class="gp__msg">加载中…</view>
    <view v-else-if="list.length === 0" class="gp__empty">
      <SvgIcon name="shopping-bag" :size="120" color="#dde2ea" />
      <text>当前分类下暂无商品</text>
      <view class="gp__btn-add" @tap="onAdd">
        <SvgIcon name="plus" :size="20" color="#fff" />
        <text>新建生鲜商品</text>
      </view>
    </view>

    <view v-else class="gp__list">
      <view v-for="p in list" :key="p.productId" class="gp__card" @tap="onEdit(p)">
        <view class="gp__card-cover">
          <text>{{ firstChar(p.name) }}</text>
        </view>
        <view class="gp__card-main">
          <text class="gp__card-name">{{ p.name }}</text>
          <view class="gp__card-tags">
            <text class="gp__tag" :class="p.pricingMode === 'weighed' ? 'gp__tag--w' : 'gp__tag--f'">
              {{ p.pricingMode === 'weighed' ? '称重' : '定价' }}
            </text>
            <text v-if="p.pricingMode === 'weighed' && p.weightUnit" class="gp__tag gp__tag--mute">
              {{ unitLabel(p.weightUnit) }}
            </text>
          </view>
          <view class="gp__card-price">
            <text v-if="p.pricingMode === 'weighed'" class="gp__card-amount"
              >¥{{ fmtYuan(p.unitPricePerJin) }}<text class="gp__card-unit">/斤</text></text
            >
            <text v-else class="gp__card-amount">¥{{ fmtYuan(p.price) }}<text class="gp__card-unit">/份</text></text>
            <text class="gp__card-meta">库存 {{ p.stock }} · 销量 {{ p.sales }}</text>
          </view>
        </view>
        <view class="gp__card-acts">
          <view class="gp__card-act gp__card-act--ghost" @tap.stop="onShelfOn(p, $event)">上架</view>
          <view class="gp__card-act gp__card-act--danger" @tap.stop="onToggleShelf(p, $event)">下架</view>
        </view>
      </view>
    </view>

    <!-- 浮动新建按钮 -->
    <view class="gp__fab" @tap="onAdd">
      <SvgIcon name="plus" :size="32" color="#fff" />
    </view>
  </view>
</template>

<style scoped>
.gp {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.gp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.gp__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.gp__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.gp__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.gp__head-r {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #5a6275;
}

.gp__search {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.gp__search-input {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
}
.gp__search-btn {
  padding: 8rpx 18rpx;
  background: #b7791f;
  color: #fff;
  font-size: 22rpx;
  border-radius: 6rpx;
  font-weight: 700;
}

.gp__cats {
  margin-top: 12rpx;
  white-space: nowrap;
}
.gp__cats-row {
  display: inline-flex;
  gap: 10rpx;
  padding: 4rpx 0;
}
.gp__cat {
  padding: 12rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #5a6275;
}
.gp__cat--active {
  background: #b7791f;
  color: #fff;
  border-color: #b7791f;
  font-weight: 700;
}

.gp__msg {
  padding: 100rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 24rpx;
}
.gp__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

.gp__list {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.gp__card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  padding: 18rpx;
}
.gp__card-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #fff7e0 0%, #f0e6c8 100%);
  color: #b7791f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 800;
  flex-shrink: 0;
}
.gp__card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.gp__card-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gp__card-tags {
  display: flex;
  gap: 6rpx;
}
.gp__tag {
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.gp__tag--w {
  background: #fff7e0;
  color: #b7791f;
}
.gp__tag--f {
  background: #e6f0ff;
  color: #2563eb;
}
.gp__tag--mute {
  background: #f0f1f3;
  color: #5a6275;
  font-weight: 500;
}
.gp__card-price {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.gp__card-amount {
  font-size: 30rpx;
  font-weight: 800;
  color: #c0392b;
  font-feature-settings: 'tnum';
}
.gp__card-unit {
  font-size: 20rpx;
  color: #c0392b;
  font-weight: 500;
}
.gp__card-meta {
  font-size: 20rpx;
  color: #8a94a6;
}
.gp__card-acts {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex-shrink: 0;
}
.gp__card-act {
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  text-align: center;
  font-weight: 700;
}
.gp__card-act--ghost {
  background: #fff;
  color: #11865c;
  border: 1rpx solid #11865c;
}
.gp__card-act--danger {
  background: #fff;
  color: #c0392b;
  border: 1rpx solid #c0392b;
}

.gp__btn-add {
  margin-top: 18rpx;
  padding: 18rpx 36rpx;
  background: #b7791f;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* FAB */
.gp__fab {
  position: fixed;
  right: 30rpx;
  bottom: 200rpx;
  z-index: 50;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #b7791f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(183, 121, 31, 0.4);
}
</style>
