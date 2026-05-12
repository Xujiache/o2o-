<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { batchSetSaleStatus, listProducts, type ProductItemVo, setSaleStatus } from '@/api';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const list = ref<ProductItemVo[]>([]);
const total = ref(0);
const loading = ref(false);
const checked = ref<string[]>([]);
const selectMode = ref(false);

type Filter = 'all' | 'on_shelf' | 'off_shelf';
const filter = ref<Filter>('all');

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'on_shelf', label: '在售中' },
  { key: 'off_shelf', label: '未上架 / 售罄' },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listProducts({ pageNo: 1, pageSize: 50 });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});

function enterSelectMode(): void {
  selectMode.value = true;
}
function exitSelectMode(): void {
  selectMode.value = false;
  checked.value = [];
}

function toggleCheck(id: string): void {
  const i = checked.value.indexOf(id);
  if (i >= 0) checked.value.splice(i, 1);
  else checked.value.push(id);
}

async function onSingleToggle(p: ProductItemVo): Promise<void> {
  const target = p.saleStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf';
  await setSaleStatus(p.productId, target);
  await load();
}

async function onBatchOn(): Promise<void> {
  if (checked.value.length === 0) return;
  await batchSetSaleStatus(checked.value, 'on_shelf');
  uni.showToast({ title: `已上架 ${checked.value.length} 个`, icon: 'success' });
  exitSelectMode();
  await load();
}

async function onBatchOff(): Promise<void> {
  if (checked.value.length === 0) return;
  await batchSetSaleStatus(checked.value, 'off_shelf');
  uni.showToast({ title: `已下架 ${checked.value.length} 个`, icon: 'success' });
  exitSelectMode();
  await load();
}

function onAdd(): void {
  uni.navigateTo({ url: '/pages/products/edit' });
}

function onEdit(productId: string): void {
  uni.navigateTo({ url: `/pages/products/edit?productId=${productId}` });
}

function onCardTap(p: ProductItemVo): void {
  if (selectMode.value) toggleCheck(p.productId);
  else onEdit(p.productId);
}

function fmtYuan(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function statusLabel(s: string): string {
  return ({ on_shelf: '在售', off_shelf: '已下架', sold_out: '售罄', draft: '草稿' } as Record<string, string>)[s] ?? s;
}

function firstChar(name: string): string {
  return name ? name.slice(0, 1) : '品';
}

const onShelfCount = computed<number>(() => list.value.filter((p) => p.saleStatus === 'on_shelf').length);
const offShelfCount = computed<number>(() => list.value.filter((p) => p.saleStatus !== 'on_shelf').length);

const filteredList = computed<ProductItemVo[]>(() => {
  if (filter.value === 'all') return list.value;
  if (filter.value === 'on_shelf') return list.value.filter((p) => p.saleStatus === 'on_shelf');
  return list.value.filter((p) => p.saleStatus !== 'on_shelf');
});
</script>

<template>
  <view class="plist">
    <!-- 顶部:简洁 header,无渐变 -->
    <view class="plist__header">
      <view class="plist__header-l">
        <text class="plist__title">商品管理</text>
        <text class="plist__subtitle">共 {{ total }} 个商品</text>
      </view>
      <view class="plist__header-r">
        <view v-if="!selectMode" class="plist__btn plist__btn--ghost" @tap="enterSelectMode">批量管理</view>
        <view v-else class="plist__btn plist__btn--ghost" @tap="exitSelectMode">取消</view>
        <view class="plist__btn plist__btn--primary" @tap="onAdd">
          <SvgIcon name="plus" :size="22" color="#fff" />
          <text>新增商品</text>
        </view>
      </view>
    </view>

    <!-- 状态汇总条 -->
    <view class="plist__summary">
      <view class="plist__summary-item">
        <text class="plist__summary-val">{{ onShelfCount }}</text>
        <text class="plist__summary-label">在售中</text>
      </view>
      <view class="plist__summary-divider" />
      <view class="plist__summary-item">
        <text class="plist__summary-val">{{ offShelfCount }}</text>
        <text class="plist__summary-label">未上架 / 售罄</text>
      </view>
      <view class="plist__summary-divider" />
      <view class="plist__summary-item">
        <text class="plist__summary-val">{{ total }}</text>
        <text class="plist__summary-label">总数</text>
      </view>
    </view>

    <!-- 上架 tab -->
    <view class="plist__tabs">
      <view
        v-for="t in FILTERS"
        :key="t.key"
        class="plist__tab"
        :class="{ 'plist__tab--active': filter === t.key }"
        @tap="filter = t.key"
        >{{ t.label }}</view
      >
    </view>

    <view v-if="loading && list.length === 0" class="plist__msg">加载中…</view>
    <view v-else-if="filteredList.length === 0" class="plist__empty">
      <SvgIcon name="package" :size="120" color="#dde2ea" />
      <text class="plist__empty-text">{{ filter === 'all' ? '还没有商品' : '当前筛选下暂无商品' }}</text>
      <view v-if="filter === 'all'" class="plist__btn plist__btn--primary" @tap="onAdd">
        <SvgIcon name="plus" :size="22" color="#fff" />
        <text>新增第一个商品</text>
      </view>
    </view>

    <!-- 两列 grid -->
    <view v-else class="plist__grid">
      <view
        v-for="p in filteredList"
        :key="p.productId"
        class="plist__card"
        :class="{
          'plist__card--off': p.saleStatus !== 'on_shelf',
          'plist__card--checked': selectMode && checked.includes(p.productId),
        }"
        @tap="onCardTap(p)"
      >
        <!-- 封面 -->
        <view class="plist__cover">
          <image v-if="p.imageUrl" :src="p.imageUrl" class="plist__cover-img" mode="aspectFill" />
          <view v-else class="plist__cover-fallback">
            <text class="plist__cover-letter">{{ firstChar(p.name) }}</text>
          </view>

          <view v-if="selectMode" class="plist__check">
            <view class="plist__check-box" :class="{ 'plist__check-box--on': checked.includes(p.productId) }">
              <SvgIcon v-if="checked.includes(p.productId)" name="check" :size="22" color="#fff" />
            </view>
          </view>

          <view class="plist__status" :class="`plist__status--${p.saleStatus}`">
            {{ statusLabel(p.saleStatus) }}
          </view>

          <view v-if="p.saleStatus !== 'on_shelf'" class="plist__cover-mask">
            <text>{{ statusLabel(p.saleStatus) }}</text>
          </view>
        </view>

        <view class="plist__info">
          <text class="plist__name">{{ p.name }}</text>
          <view class="plist__price-row">
            <text class="plist__price"><text class="plist__price-symbol">¥</text>{{ fmtYuan(p.price) }}</text>
            <text v-if="p.hasSku === 1" class="plist__sku-tag">多规格</text>
          </view>
          <view class="plist__meta">
            <text class="plist__meta-stock">库存 {{ p.stock }}</text>
          </view>

          <view v-if="!selectMode" class="plist__actions">
            <view class="plist__act plist__act--ghost" @tap.stop="onEdit(p.productId)">编辑</view>
            <view
              class="plist__act"
              :class="p.saleStatus === 'on_shelf' ? 'plist__act--off' : 'plist__act--on'"
              @tap.stop="onSingleToggle(p)"
              >{{ p.saleStatus === 'on_shelf' ? '下架' : '上架' }}</view
            >
          </view>
        </view>
      </view>
    </view>

    <!-- 批量底部 fixed bar -->
    <view v-if="selectMode" class="plist__bar">
      <view class="plist__bar-info">
        <text class="plist__bar-checked">已选 {{ checked.length }}</text>
        <text class="plist__bar-total">/ {{ total }}</text>
      </view>
      <view class="plist__bar-btn plist__bar-btn--ghost" @tap="onBatchOff">批量下架</view>
      <view class="plist__bar-btn plist__bar-btn--primary" @tap="onBatchOn">批量上架</view>
    </view>
    <FloatTabBar v-if="!selectMode" active="products" />
  </view>
</template>

<style scoped>
.plist {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}

/* 顶部 header */
.plist__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx 18rpx;
}
.plist__header-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.plist__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  letter-spacing: 0.5rpx;
}
.plist__subtitle {
  font-size: 22rpx;
  color: #8a94a6;
}
.plist__header-r {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

/* btn */
.plist__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.plist__btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.plist__btn--primary {
  background: #b7791f;
  color: #fff;
}

/* 状态汇总 */
.plist__summary {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 16rpx;
}
.plist__summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.plist__summary-val {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
  font-feature-settings: 'tnum';
}
.plist__summary-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.plist__summary-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* tab */
.plist__tabs {
  display: flex;
  gap: 0;
  margin-top: 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  padding: 4rpx;
}
.plist__tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: #5a6275;
  border-radius: 8rpx;
}
.plist__tab--active {
  background: #172033;
  color: #fff;
  font-weight: 700;
}

/* Empty / loading */
.plist__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.plist__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22rpx;
  padding: 120rpx 0 60rpx;
}
.plist__empty-text {
  font-size: 26rpx;
  color: #8a94a6;
}

/* 两列 grid */
.plist__grid {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
}
.plist__card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s;
}
.plist__card--checked {
  border-color: #b7791f;
  border-width: 2rpx;
}
.plist__card--off {
  opacity: 0.85;
}

/* 封面 */
.plist__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f6f8;
}
.plist__cover-img {
  width: 100%;
  height: 100%;
}
.plist__cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f1f3;
}
.plist__cover-letter {
  font-size: 84rpx;
  font-weight: 800;
  color: #c5c9d2;
}
.plist__cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  color: #5a6275;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plist__check {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  z-index: 2;
}
.plist__check-box {
  width: 40rpx;
  height: 40rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid #d8dde4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plist__check-box--on {
  background: #b7791f;
  border-color: #b7791f;
}

.plist__status {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
  font-weight: 700;
  z-index: 2;
  background: rgba(255, 255, 255, 0.96);
  color: #5a6275;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
}
.plist__status--on_shelf {
  background: #e9f7ef;
  color: #11865c;
  border-color: rgba(17, 134, 92, 0.2);
}
.plist__status--off_shelf {
  background: #f0f1f3;
  color: #5a6275;
}
.plist__status--sold_out {
  background: #fdecea;
  color: #c0392b;
  border-color: rgba(192, 57, 43, 0.2);
}
.plist__status--draft {
  background: #fff7e0;
  color: #b7791f;
  border-color: rgba(183, 121, 31, 0.2);
}

.plist__info {
  padding: 16rpx 16rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  border-top: 1rpx solid #f0f1f3;
}
.plist__name {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.plist__price-row {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.plist__price {
  font-size: 30rpx;
  font-weight: 800;
  color: #c0392b;
  line-height: 1;
  font-feature-settings: 'tnum';
}
.plist__price-symbol {
  font-size: 22rpx;
  font-weight: 700;
  margin-right: 2rpx;
}
.plist__sku-tag {
  background: #fff7e0;
  color: #b7791f;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 700;
  border: 1rpx solid rgba(183, 121, 31, 0.2);
}
.plist__meta {
  font-size: 20rpx;
  color: #8a94a6;
}
.plist__actions {
  margin-top: 8rpx;
  display: flex;
  gap: 6rpx;
}
.plist__act {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  padding: 10rpx 0;
  border-radius: 6rpx;
  font-weight: 600;
}
.plist__act--ghost {
  background: #f5f6f8;
  color: #5a6275;
  border: 1rpx solid #e6e9ee;
}
.plist__act--on {
  background: #b7791f;
  color: #fff;
}
.plist__act--off {
  background: #fff;
  color: #c0392b;
  border: 1rpx solid rgba(192, 57, 43, 0.3);
}

/* 批量底部 fixed bar */
.plist__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 14rpx);
  background: #fff;
  border-top: 1rpx solid #e6e9ee;
  z-index: 50;
}
.plist__bar-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.plist__bar-checked {
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
}
.plist__bar-total {
  font-size: 22rpx;
  color: #8a94a6;
}
.plist__bar-btn {
  padding: 16rpx 26rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.plist__bar-btn--ghost {
  background: #fff;
  color: #c0392b;
  border: 1rpx solid rgba(192, 57, 43, 0.3);
}
.plist__bar-btn--primary {
  background: #b7791f;
  color: #fff;
}
</style>
