<script setup lang="ts">
/**
 * 商家经营统计 — 数据全部来自 GET /api/v1/m/statistics
 * 后端 StatisticsVo 真实字段:
 *   orderCount    订单数
 *   grossCents    营业额(分)
 *   refundCents   退款金额(分)
 *   netCents      净收入(分)
 *   storeRating   店铺评分("0.00"~"5.00")
 *   topItems      热销 Top5 [{productId, productName, qty, grossCents}]
 *
 * 客单价由 grossCents/orderCount 派生纯展示;退款率由 refundCents/grossCents 派生。
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
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

function fmtYuan(cents: string | undefined | null): string {
  if (!cents) return '0.00';
  return (Number(cents) / 100).toFixed(2);
}

function fmtThousand(n: number): string {
  return new Intl.NumberFormat('zh-CN').format(n);
}

const avgOrderYuan = computed<string>(() => {
  const oc = store.data?.orderCount ?? 0;
  if (oc === 0) return '0.00';
  return (Number(store.data?.netCents ?? 0) / 100 / oc).toFixed(2);
});

const refundRate = computed<string>(() => {
  const g = Number(store.data?.grossCents ?? 0);
  const r = Number(store.data?.refundCents ?? 0);
  if (g === 0) return '0.0%';
  return `${((r / g) * 100).toFixed(1)}%`;
});

const maxTopQty = computed<number>(() => {
  if (!store.data?.topItems?.length) return 1;
  return Math.max(...store.data.topItems.map((t) => t.qty), 1);
});

const ratingValue = computed<number>(() => Number(store.data?.storeRating ?? 0));
const ratingStars = computed<Array<'full' | 'half' | 'empty'>>(() => {
  const v = ratingValue.value;
  return [1, 2, 3, 4, 5].map((i) => (v >= i - 0.25 ? 'full' : v >= i - 0.75 ? 'half' : 'empty'));
});

const hasData = computed<boolean>(() => (store.data?.orderCount ?? 0) > 0);

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
    <!-- 顶部:店铺经营概览 -->
    <view class="stat__head">
      <view class="stat__head-l">
        <text class="stat__head-tag">{{ rangeLabel }}</text>
        <text class="stat__head-title">经营概览</text>
      </view>
      <view class="stat__refresh" @tap="load">
        <SvgIcon name="refresh" :size="22" color="#5a6275" />
        <text>{{ refreshing ? '加载中' : '刷新' }}</text>
      </view>
    </view>

    <!-- 日期 Tabs -->
    <view class="stat__tabs">
      <view
        v-for="t in RANGE_TABS"
        :key="t.key"
        class="stat__tab"
        :class="{ 'stat__tab--active': range === t.key }"
        @tap="pickRange(t.key)"
        >{{ t.label }}</view
      >
    </view>

    <!-- 主指标 营业额 -->
    <view class="stat__primary">
      <text class="stat__primary-label">营业额(元)</text>
      <view class="stat__primary-row">
        <text class="stat__primary-symbol">¥</text>
        <text class="stat__primary-num">{{ fmtYuan(store.data?.grossCents) }}</text>
      </view>
      <view class="stat__primary-meta">
        <view class="stat__primary-item">
          <text class="stat__primary-item-label">订单数</text>
          <text class="stat__primary-item-val">{{ fmtThousand(store.data?.orderCount ?? 0) }}</text>
        </view>
        <view class="stat__primary-divider" />
        <view class="stat__primary-item">
          <text class="stat__primary-item-label">客单价</text>
          <text class="stat__primary-item-val">¥{{ avgOrderYuan }}</text>
        </view>
        <view class="stat__primary-divider" />
        <view class="stat__primary-item">
          <text class="stat__primary-item-label">退款率</text>
          <text class="stat__primary-item-val">{{ refundRate }}</text>
        </view>
      </view>
    </view>

    <!-- 核心指标 4 卡 -->
    <view class="stat__grid">
      <view class="stat__card">
        <view class="stat__card-row">
          <view class="stat__card-icon stat__card-icon--ok">
            <SvgIcon name="wallet" :size="28" color="#11998e" />
          </view>
          <text class="stat__card-label">净收入</text>
        </view>
        <text class="stat__card-val">¥{{ fmtYuan(store.data?.netCents) }}</text>
        <text class="stat__card-tip">扣除退款与平台费</text>
      </view>

      <view class="stat__card">
        <view class="stat__card-row">
          <view class="stat__card-icon stat__card-icon--warn">
            <SvgIcon name="alert-triangle" :size="28" color="#ed6c02" />
          </view>
          <text class="stat__card-label">退款金额</text>
        </view>
        <text class="stat__card-val">¥{{ fmtYuan(store.data?.refundCents) }}</text>
        <text class="stat__card-tip">售后退款总额</text>
      </view>

      <view class="stat__card">
        <view class="stat__card-row">
          <view class="stat__card-icon stat__card-icon--info">
            <SvgIcon name="shopping-bag" :size="28" color="#5b5ff8" />
          </view>
          <text class="stat__card-label">订单数</text>
        </view>
        <text class="stat__card-val">{{ fmtThousand(store.data?.orderCount ?? 0) }}</text>
        <text class="stat__card-tip">含已完成订单</text>
      </view>

      <view class="stat__card">
        <view class="stat__card-row">
          <view class="stat__card-icon stat__card-icon--rate">
            <SvgIcon name="star" :size="28" color="#f7971e" />
          </view>
          <text class="stat__card-label">店铺评分</text>
        </view>
        <text class="stat__card-val">{{ ratingValue.toFixed(2) }}</text>
        <view class="stat__card-stars">
          <SvgIcon
            v-for="(s, i) in ratingStars"
            :key="i"
            name="star"
            :size="18"
            :color="s === 'empty' ? '#dde2ea' : '#f7971e'"
          />
        </view>
      </view>
    </view>

    <!-- 热销商品 -->
    <view class="stat__section">
      <view class="stat__section-head">
        <view class="stat__section-bar" />
        <text class="stat__section-title">热销商品</text>
        <text class="stat__section-tip">Top 5 · 按销量降序</text>
      </view>

      <view v-if="!hasData || !store.data || store.data.topItems.length === 0" class="stat__empty">
        <SvgIcon name="package" :size="80" color="#dde2ea" />
        <text class="stat__empty-text">{{ rangeLabel }}暂无销售数据</text>
      </view>

      <view v-else class="stat__top">
        <view v-for="(t, i) in store.data.topItems" :key="t.productId" class="stat__top-item">
          <view class="stat__top-rank" :class="`stat__top-rank--${i + 1}`">
            <text>{{ i + 1 }}</text>
          </view>
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

    <!-- 数据说明 -->
    <view class="stat__hint">
      <SvgIcon name="lightbulb" :size="22" color="#8a94a6" />
      <text class="stat__hint-text"> 数据按日聚合,每日 00:30 由系统快照生成。当日数据次日早上完整呈现。 </text>
    </view>
    <FloatTabBar active="statistics" />
  </view>
</template>

<style scoped>
.stat {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}

/* 顶部 head */
.stat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 4rpx 16rpx;
}
.stat__head-l {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.stat__head-tag {
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: rgba(183, 121, 31, 0.1);
  color: #b7791f;
  font-size: 22rpx;
  font-weight: 700;
}
.stat__head-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #172033;
  letter-spacing: 0.5rpx;
}
.stat__refresh {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #fff;
  font-size: 22rpx;
  color: #5a6275;
  border: 1rpx solid #e6e9ee;
}

/* Tabs */
.stat__tabs {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e6e9ee;
  padding: 4rpx;
  margin-bottom: 16rpx;
}
.stat__tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #5a6275;
  border-radius: 8rpx;
}
.stat__tab--active {
  background: #172033;
  color: #fff;
  font-weight: 700;
}

/* 主指标 card */
.stat__primary {
  background: #fff;
  padding: 28rpx;
  border-radius: 14rpx;
  border: 1rpx solid #e6e9ee;
  margin-bottom: 16rpx;
}
.stat__primary-label {
  font-size: 22rpx;
  color: #8a94a6;
  letter-spacing: 0.5rpx;
}
.stat__primary-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin-top: 8rpx;
}
.stat__primary-symbol {
  font-size: 32rpx;
  font-weight: 600;
  color: #172033;
}
.stat__primary-num {
  font-size: 64rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
  letter-spacing: -1rpx;
  font-feature-settings: 'tnum';
}
.stat__primary-meta {
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #f0f1f3;
  display: flex;
  align-items: stretch;
}
.stat__primary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  align-items: center;
}
.stat__primary-item-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.stat__primary-item-val {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  font-feature-settings: 'tnum';
}
.stat__primary-divider {
  width: 1rpx;
  background: #e6e9ee;
}

/* 核心指标 4 卡 */
.stat__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.stat__card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-height: 180rpx;
}
.stat__card-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.stat__card-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 41, 55, 0.06);
  flex-shrink: 0;
}
.stat__card-icon--ok {
  background: rgba(17, 153, 142, 0.1);
}
.stat__card-icon--warn {
  background: rgba(237, 108, 2, 0.1);
}
.stat__card-icon--info {
  background: rgba(91, 95, 248, 0.1);
}
.stat__card-icon--rate {
  background: rgba(247, 151, 30, 0.1);
}
.stat__card-label {
  font-size: 24rpx;
  color: #5a6275;
  font-weight: 500;
}
.stat__card-val {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1.1;
  letter-spacing: -0.5rpx;
  font-feature-settings: 'tnum';
}
.stat__card-tip {
  font-size: 20rpx;
  color: #8a94a6;
  margin-top: auto;
}
.stat__card-stars {
  margin-top: auto;
  display: flex;
  gap: 2rpx;
}

/* 热销 section */
.stat__section {
  margin-top: 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 24rpx;
}
.stat__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 18rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.stat__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.stat__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.stat__section-tip {
  font-size: 20rpx;
  color: #8a94a6;
  margin-left: auto;
}

.stat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 60rpx 0;
}
.stat__empty-text {
  font-size: 22rpx;
  color: #8a94a6;
}

.stat__top {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 18rpx;
}
.stat__top-item {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
}
.stat__top-rank {
  width: 44rpx;
  height: 44rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
  background: #f0f1f3;
  color: #5a6275;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.stat__top-rank--1 {
  background: #b7791f;
  color: #fff;
}
.stat__top-rank--2 {
  background: #94a0b0;
  color: #fff;
}
.stat__top-rank--3 {
  background: #a0623c;
  color: #fff;
}
.stat__top-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
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
  font-size: 24rpx;
  font-weight: 700;
  color: #b7791f;
  flex-shrink: 0;
  font-feature-settings: 'tnum';
}
.stat__top-bar {
  height: 8rpx;
  background: #f0f1f3;
  border-radius: 999rpx;
  overflow: hidden;
}
.stat__top-bar-fill {
  height: 100%;
  background: #b7791f;
  border-radius: 999rpx;
  transition: width 0.3s;
}
.stat__top-qty {
  font-size: 20rpx;
  color: #8a94a6;
}

/* hint */
.stat__hint {
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.stat__hint-text {
  flex: 1;
  font-size: 22rpx;
  color: #8a94a6;
  line-height: 1.5;
}
</style>
