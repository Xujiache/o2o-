<script setup lang="ts">
/**
 * 商家经营统计 — 数据全部来自 GET /api/v1/m/statistics
 *
 * 后端 StatisticsVo 真实字段:
 *   - orderCount    订单数
 *   - grossCents    营业额(分)
 *   - refundCents   退款金额(分)
 *   - netCents      净收入(分)
 *   - storeRating   店铺评分("0.00"~"5.00")
 *   - topItems      热销 Top5 [{productId, productName, qty, grossCents}]
 *
 * 不展示后端没有的字段(折线图、复购率)— 避免假数据.
 * 客单价由 grossCents/orderCount 派生纯展示。
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { useStatisticsStore } from '@/stores/statistics';

const store = useStatisticsStore();

type RangeKey = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';
const range = ref<RangeKey>('TODAY');
const refreshing = ref(false);

const RANGE_TABS: Array<{ key: RangeKey; label: string }> = [
  { key: 'TODAY', label: '今日' },
  { key: 'YESTERDAY', label: '昨日' },
  { key: 'WEEK', label: '近 7 天' },
  { key: 'MONTH', label: '本月' },
];

const rangeLabel = computed<string>(() => RANGE_TABS.find((t) => t.key === range.value)?.label ?? '今日');

function fmtYuan(cents: string | undefined): string {
  if (!cents) return '0.00';
  return (Number(cents) / 100).toFixed(2);
}

/** 客单价(派生):净收入 / 订单数 */
const avgOrderYuan = computed<string>(() => {
  const oc = store.data?.orderCount ?? 0;
  if (oc === 0) return '0.00';
  return (Number(store.data?.netCents ?? 0) / 100 / oc).toFixed(2);
});

const maxTopQty = computed<number>(() => {
  if (!store.data?.topItems?.length) return 1;
  return Math.max(...store.data.topItems.map((t) => t.qty), 1);
});

const ratingValue = computed<number>(() => Number(store.data?.storeRating ?? 0));
const ratingStars = computed<string[]>(() => {
  const v = ratingValue.value;
  return [1, 2, 3, 4, 5].map((i) => (v >= i ? '★' : v >= i - 0.5 ? '⯪' : '☆'));
});

async function load(): Promise<void> {
  refreshing.value = true;
  try {
    await store.load(range.value);
  } finally {
    refreshing.value = false;
  }
}

async function pickRange(r: RangeKey): Promise<void> {
  if (range.value === r) return;
  range.value = r;
  await load();
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});
</script>

<template>
  <view class="stat">
    <!-- Hero:大数字营业额 -->
    <view class="stat__hero">
      <view class="stat__hero-head">
        <view class="stat__hero-eyebrow">
          <text class="stat__hero-tag">{{ rangeLabel }}</text>
          <text class="stat__hero-label">营业额</text>
        </view>
        <text class="stat__refresh" @tap="load">{{ refreshing ? '加载中…' : '刷新' }}</text>
      </view>
      <view class="stat__hero-amount">
        <text class="stat__hero-symbol">¥</text>
        <text class="stat__hero-num">{{ fmtYuan(store.data?.grossCents) }}</text>
      </view>
      <view class="stat__hero-meta">
        <view class="stat__hero-meta-item">
          <text class="stat__hero-meta-val">{{ store.data?.orderCount ?? 0 }}</text>
          <text class="stat__hero-meta-label">订单数</text>
        </view>
        <view class="stat__hero-meta-divider" />
        <view class="stat__hero-meta-item">
          <text class="stat__hero-meta-val">¥{{ avgOrderYuan }}</text>
          <text class="stat__hero-meta-label">客单价</text>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="stat__tabs">
      <view
        v-for="t in RANGE_TABS"
        :key="t.key"
        class="stat__tab"
        :class="{ 'stat__tab--active': range === t.key }"
        @tap="pickRange(t.key)"
      >
        {{ t.label }}
      </view>
    </view>

    <!-- 关键数据 2x2 -->
    <view class="stat__grid">
      <view class="stat__card stat__card--ok">
        <view class="stat__card-icon">💰</view>
        <text class="stat__card-label">净收入</text>
        <text class="stat__card-value">¥{{ fmtYuan(store.data?.netCents) }}</text>
        <text class="stat__card-tip">扣除退款与平台费</text>
      </view>
      <view class="stat__card stat__card--warn">
        <view class="stat__card-icon">↩️</view>
        <text class="stat__card-label">退款金额</text>
        <text class="stat__card-value">¥{{ fmtYuan(store.data?.refundCents) }}</text>
        <text class="stat__card-tip">售后退款总额</text>
      </view>
      <view class="stat__card">
        <view class="stat__card-icon">🛍️</view>
        <text class="stat__card-label">订单数</text>
        <text class="stat__card-value">{{ store.data?.orderCount ?? 0 }}</text>
        <text class="stat__card-tip">含已完成订单</text>
      </view>
      <view class="stat__card stat__card--rating">
        <view class="stat__card-icon">⭐</view>
        <text class="stat__card-label">店铺评分</text>
        <text class="stat__card-value">{{ ratingValue.toFixed(2) }}</text>
        <view class="stat__rating-stars">
          <text v-for="(s, i) in ratingStars" :key="i" class="stat__rating-star">{{ s }}</text>
        </view>
      </view>
    </view>

    <!-- 热销商品 -->
    <view class="stat__section">
      <view class="stat__section-head">
        <text class="stat__section-title">热销商品</text>
        <text class="stat__section-tip">Top 5 · 按销量</text>
      </view>

      <view v-if="!store.data || store.data.topItems.length === 0" class="stat__empty">
        <text class="stat__empty-icon">🍱</text>
        <text class="stat__empty-text">{{ rangeLabel }}暂无销售数据</text>
      </view>

      <view v-else class="stat__top">
        <view v-for="(t, i) in store.data.topItems" :key="t.productId" class="stat__top-item">
          <view class="stat__top-rank" :class="`stat__top-rank--${i + 1}`">{{ i + 1 }}</view>
          <view class="stat__top-main">
            <view class="stat__top-row">
              <text class="stat__top-name">{{ t.productName }}</text>
              <text class="stat__top-amount">¥{{ fmtYuan(t.grossCents) }}</text>
            </view>
            <view class="stat__top-bar">
              <view class="stat__top-bar-fill" :style="`width: ${(t.qty / maxTopQty) * 100}%;`" />
            </view>
            <text class="stat__top-qty">{{ t.qty }} 份</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据来源说明 -->
    <view class="stat__hint">
      <text class="stat__hint-icon">ℹ️</text>
      <text class="stat__hint-text">数据按日聚合,每日 00:30 系统快照生成。当日数据次日早上完整。</text>
    </view>
    <FloatTabBar active="statistics" />
  </view>
</template>

<style scoped>
.stat {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero */
.stat__hero {
  padding: 36rpx 28rpx 56rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  color: #fff;
}
.stat__hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat__hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.stat__hero-tag {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  font-size: 22rpx;
  font-weight: 600;
}
.stat__hero-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.78);
}
.stat__refresh {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22rpx;
}
.stat__hero-amount {
  margin-top: 24rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.stat__hero-symbol {
  font-size: 36rpx;
  font-weight: 600;
}
.stat__hero-num {
  font-size: 88rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
  line-height: 1;
}
.stat__hero-meta {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.stat__hero-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.stat__hero-meta-val {
  font-size: 30rpx;
  font-weight: 700;
}
.stat__hero-meta-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}
.stat__hero-meta-divider {
  width: 2rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.24);
}

/* Tabs */
.stat__tabs {
  margin: -28rpx 24rpx 0;
  padding: 8rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  gap: 4rpx;
  position: relative;
  z-index: 2;
  box-shadow: 0 14rpx 38rpx rgba(31, 41, 55, 0.08);
}
.stat__tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: #5a6275;
}
.stat__tab--active {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  font-weight: 700;
}

/* 关键数据卡 */
.stat__grid {
  margin: 24rpx 24rpx 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.stat__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-height: 220rpx;
}
.stat__card-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: rgba(31, 41, 55, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  margin-bottom: 6rpx;
}
.stat__card-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.stat__card-value {
  font-size: 40rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1.2;
  letter-spacing: -1rpx;
}
.stat__card-tip {
  font-size: 20rpx;
  color: #c5c9d2;
  margin-top: auto;
  padding-top: 8rpx;
}
.stat__card--ok .stat__card-value {
  color: #11998e;
}
.stat__card--ok .stat__card-icon {
  background: rgba(17, 153, 142, 0.12);
}
.stat__card--warn .stat__card-value {
  color: #ed6c02;
}
.stat__card--warn .stat__card-icon {
  background: rgba(237, 108, 2, 0.12);
}
.stat__card--rating .stat__card-icon {
  background: rgba(247, 151, 30, 0.12);
}
.stat__card--rating .stat__card-value {
  color: #f7971e;
}
.stat__rating-stars {
  margin-top: 6rpx;
  display: flex;
  gap: 2rpx;
}
.stat__rating-star {
  font-size: 22rpx;
  color: #f7971e;
}

/* 热销商品 */
.stat__section {
  margin: 32rpx 24rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.stat__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.stat__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.stat__section-tip {
  font-size: 22rpx;
  color: #8a94a6;
}

.stat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 60rpx 0;
}
.stat__empty-icon {
  font-size: 80rpx;
  opacity: 0.4;
}
.stat__empty-text {
  font-size: 24rpx;
  color: #8a94a6;
}

.stat__top {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.stat__top-item {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
}
.stat__top-rank {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
  background: #f5f6f8;
  color: #8a94a6;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.stat__top-rank--1 {
  background: linear-gradient(135deg, #ffb400, #b7791f);
  color: #fff;
}
.stat__top-rank--2 {
  background: linear-gradient(135deg, #c5cad3, #94a0b0);
  color: #fff;
}
.stat__top-rank--3 {
  background: linear-gradient(135deg, #d29365, #a0623c);
  color: #fff;
}
.stat__top-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.stat__top-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
}
.stat__top-name {
  flex: 1;
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat__top-amount {
  font-size: 26rpx;
  font-weight: 700;
  color: #ed6c02;
  flex-shrink: 0;
}
.stat__top-bar {
  height: 10rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  overflow: hidden;
}
.stat__top-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1f2937, #b7791f);
  border-radius: 999rpx;
  transition: width 0.3s;
}
.stat__top-qty {
  font-size: 20rpx;
  color: #8a94a6;
}

/* 提示 */
.stat__hint {
  margin: 24rpx 24rpx 0;
  padding: 18rpx 24rpx;
  background: rgba(91, 95, 248, 0.06);
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.stat__hint-icon {
  font-size: 24rpx;
}
.stat__hint-text {
  flex: 1;
  font-size: 20rpx;
  color: #5a6275;
  line-height: 1.5;
}
</style>
