<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useWithdrawalStore } from '@/stores/withdrawal';
import { fmtCents } from '@/utils/earning-formula';
import { STATUS_LABEL_WITHDRAWAL } from '@/utils/rider-task-status';

const store = useWithdrawalStore();

type TabKey = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED';
const tab = ref<TabKey>('ALL');

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '审核中' },
  { key: 'COMPLETED', label: '已到账' },
  { key: 'FAILED', label: '失败' },
];

function fmtTime(ms: number | null): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function statusVariant(status: string): string {
  if (status === 'COMPLETED') return 'r__status--ok';
  if (status === 'FAILED' || status === 'REJECTED') return 'r__status--fail';
  if (status === 'APPROVED') return 'r__status--info';
  return 'r__status--warn';
}

const filteredList = computed(() => {
  if (tab.value === 'ALL') return store.items;
  if (tab.value === 'PENDING') return store.items.filter((w) => w.status === 'PENDING' || w.status === 'APPROVED');
  if (tab.value === 'COMPLETED') return store.items.filter((w) => w.status === 'COMPLETED');
  return store.items.filter((w) => w.status === 'FAILED' || w.status === 'REJECTED');
});

// 统计
const monthAmount = computed<string>(() => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const ms = start.getTime();
  const cents = store.items
    .filter((w) => w.submittedAt >= ms && w.status === 'COMPLETED')
    .reduce((a, w) => a + Number(w.amountCents || 0), 0);
  return (cents / 100).toFixed(2);
});

const totalCompleted = computed<string>(() => {
  const cents = store.items.filter((w) => w.status === 'COMPLETED').reduce((a, w) => a + Number(w.amountCents || 0), 0);
  return (cents / 100).toFixed(2);
});

const pendingCount = computed<number>(
  () => store.items.filter((w) => w.status === 'PENDING' || w.status === 'APPROVED').length,
);

function gotoForm(): void {
  uni.navigateTo({ url: '/pages/withdrawals/form' });
}

onMounted(() => store.refresh());
</script>

<template>
  <view class="r">
    <!-- 统计条 -->
    <view class="r__stats">
      <view class="r__stat">
        <text class="r__stat-val">¥{{ monthAmount }}</text>
        <text class="r__stat-label">本月已到账</text>
      </view>
      <view class="r__stat-divider" />
      <view class="r__stat">
        <text class="r__stat-val">¥{{ totalCompleted }}</text>
        <text class="r__stat-label">累计已到账</text>
      </view>
      <view class="r__stat-divider" />
      <view class="r__stat">
        <text class="r__stat-val">{{ pendingCount }}</text>
        <text class="r__stat-label">审核中</text>
      </view>
    </view>

    <!-- 状态 tab -->
    <view class="r__tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="r__tab"
        :class="{ 'r__tab--active': tab === t.key }"
        @tap="tab = t.key"
        >{{ t.label }}</view
      >
    </view>

    <view v-if="store.loading && store.items.length === 0" class="r__msg">加载中…</view>
    <view v-else-if="filteredList.length === 0" class="r__empty">
      <SvgIcon name="credit-card" :size="100" color="#dde2ea" />
      <text class="r__empty-text">{{ tab === 'ALL' ? '暂无提现记录' : '该状态下暂无记录' }}</text>
      <view class="r__empty-btn" @tap="gotoForm">去发起提现</view>
    </view>

    <view v-else class="r__list">
      <view v-for="w in filteredList" :key="w.withdrawalId" class="r__card">
        <view class="r__card-head">
          <view class="r__card-head-l">
            <SvgIcon name="credit-card" :size="20" color="#8a94a6" />
            <text class="r__card-no">{{ w.withdrawalNo }}</text>
          </view>
          <text class="r__status" :class="statusVariant(w.status)">
            {{ STATUS_LABEL_WITHDRAWAL[w.status] || w.status }}
          </text>
        </view>

        <view class="r__card-body">
          <view class="r__card-amount-row">
            <text class="r__card-amount-label">提现金额</text>
            <text class="r__card-amount"
              >¥<text class="r__card-amount-num">{{ fmtCents(w.amountCents) }}</text></text
            >
          </view>
          <view class="r__card-row">
            <text class="r__card-row-label">提交时间</text>
            <text class="r__card-row-val">{{ fmtTime(w.submittedAt) }}</text>
          </view>
          <view v-if="w.completedAt" class="r__card-row">
            <text class="r__card-row-label">到账时间</text>
            <text class="r__card-row-val">{{ fmtTime(w.completedAt) }}</text>
          </view>
        </view>

        <view v-if="w.failReason" class="r__card-fail">
          <SvgIcon name="alert-triangle" :size="18" color="#ff4d4f" />
          <text>{{ w.failReason }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.r {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  background: #f5f6f8;
}

/* 统计条 */
.r__stats {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 16rpx;
}
.r__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.r__stat-val {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-feature-settings: 'tnum';
  letter-spacing: -0.5rpx;
}
.r__stat-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.r__stat-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* 状态 tab */
.r__tabs {
  display: flex;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  padding: 4rpx;
  margin-top: 16rpx;
}
.r__tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-radius: 8rpx;
}
.r__tab--active {
  background: var(--brand-primary);
  color: #fff;
  font-weight: 700;
}

/* empty / loading */
.r__msg {
  text-align: center;
  padding: 80rpx 0;
  color: var(--text-muted);
  font-size: 24rpx;
}
.r__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.r__empty-text {
  font-size: 24rpx;
  color: var(--text-muted);
}
.r__empty-btn {
  margin-top: 12rpx;
  padding: 18rpx 44rpx;
  background: var(--brand-gradient-reverse);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 12rpx;
  box-shadow: 0 12rpx 28rpx rgba(46, 156, 93, 0.36);
}

/* 卡 */
.r__list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 16rpx;
}
.r__card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
}
.r__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 22rpx;
  background: #fafbfc;
  border-bottom: 1rpx solid #f0f1f3;
}
.r__card-head-l {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.r__card-no {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-feature-settings: 'tnum';
}
.r__status {
  font-size: 22rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
.r__status--ok {
  color: var(--brand-primary);
  background: #e9f7ef;
}
.r__status--info {
  color: var(--brand-primary);
  background: #e6f0ff;
}
.r__status--warn {
  color: #b7791f;
  background: #fff7e0;
}
.r__status--fail {
  color: var(--price-color);
  background: #fdecea;
}

.r__card-body {
  padding: 16rpx 22rpx 18rpx;
}
.r__card-amount-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8rpx 0 12rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.r__card-amount-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.r__card-amount {
  font-size: 22rpx;
  color: var(--price-color);
  font-weight: 700;
}
.r__card-amount-num {
  font-size: 36rpx;
  font-weight: 800;
  margin-left: 2rpx;
  font-feature-settings: 'tnum';
}
.r__card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}
.r__card-row-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.r__card-row-val {
  font-size: 22rpx;
  color: var(--text-primary);
  font-feature-settings: 'tnum';
}
.r__card-fail {
  margin: 0 22rpx 18rpx;
  padding: 12rpx 14rpx;
  background: #fdecea;
  border-left: 4rpx solid #ef4444;
  border-radius: 0 6rpx 6rpx 0;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--price-color);
  line-height: 1.5;
}
</style>
