<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { listViolations, type ViolationItemVo } from '@/api/rider-violations';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { fmtCents } from '@/utils/earning-formula';
import { STATUS_LABEL_VIOLATION } from '@/utils/rider-task-status';

const items = ref<ViolationItemVo[]>([]);
const loading = ref(false);

type TabKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DROPPED';
const tab = ref<TabKey>('ALL');

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '处理中' },
  { key: 'CONFIRMED', label: '已确认' },
  { key: 'DROPPED', label: '已撤销' },
];

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const r = await listViolations({ pageNo: 1, pageSize: 100 });
    if (r.code === '0' && r.data) items.value = r.data.items;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

function fmtTime(ms: number | null): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function statusVariant(status: string): string {
  if (status === 'CONFIRMED') return 'v__status--fail';
  if (status === 'DROPPED') return 'v__status--ok';
  return 'v__status--warn';
}

const filtered = computed(() => {
  if (tab.value === 'ALL') return items.value;
  if (tab.value === 'PENDING')
    return items.value.filter((i) => i.status === 'REPORTED' || i.status === 'PENDING_PLATFORM');
  if (tab.value === 'CONFIRMED') return items.value.filter((i) => i.status === 'CONFIRMED');
  return items.value.filter((i) => i.status === 'DROPPED');
});

const monthCount = computed<number>(() => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const ms = start.getTime();
  return items.value.filter((i) => i.reportedAt >= ms).length;
});

const totalDeductYuan = computed<string>(() => {
  const cents = items.value
    .filter((i) => i.status === 'CONFIRMED' && i.deductCents)
    .reduce((a, i) => a + Number(i.deductCents || 0), 0);
  return (cents / 100).toFixed(2);
});

const appealingCount = computed<number>(
  () => items.value.filter((i) => i.status === 'REPORTED' || i.status === 'PENDING_PLATFORM').length,
);

function callSupport(): void {
  uni.showModal({
    title: '违规申诉',
    content: '如对违规判定有异议,请联系骑手专线:\n400-000-0001\n或在违规详情页提交书面申诉',
    showCancel: false,
  });
}
</script>

<template>
  <view class="v">
    <!-- 统计条 -->
    <view class="v__stats">
      <view class="v__stat">
        <text class="v__stat-val">{{ monthCount }}</text>
        <text class="v__stat-label">本月违规</text>
      </view>
      <view class="v__stat-divider" />
      <view class="v__stat">
        <text class="v__stat-val v__stat-val--warn">¥{{ totalDeductYuan }}</text>
        <text class="v__stat-label">累计扣款</text>
      </view>
      <view class="v__stat-divider" />
      <view class="v__stat">
        <text class="v__stat-val v__stat-val--info">{{ appealingCount }}</text>
        <text class="v__stat-label">处理中</text>
      </view>
    </view>

    <!-- 状态 tab -->
    <view class="v__tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="v__tab"
        :class="{ 'v__tab--active': tab === t.key }"
        @tap="tab = t.key"
        >{{ t.label }}</view
      >
    </view>

    <view v-if="loading && items.length === 0" class="v__msg">加载中…</view>
    <view v-else-if="filtered.length === 0" class="v__empty">
      <SvgIcon name="check-circle" :size="100" color="#dde2ea" />
      <text class="v__empty-text">{{ tab === 'ALL' ? '太棒了,暂无违规记录' : '该状态下暂无记录' }}</text>
      <text class="v__empty-sub" v-if="tab === 'ALL'">继续保持优质服务</text>
    </view>

    <view v-else class="v__list">
      <view v-for="i in filtered" :key="i.violationId" class="v__card">
        <view class="v__card-head">
          <view class="v__card-head-l">
            <view class="v__type-chip">{{ i.type }}</view>
            <text v-if="i.riderTaskId" class="v__order-no">任务 {{ i.riderTaskId }}</text>
          </view>
          <text class="v__status" :class="statusVariant(i.status)">
            {{ STATUS_LABEL_VIOLATION[i.status] || i.status }}
          </text>
        </view>

        <text class="v__card-desc">{{ i.description || '无详细描述' }}</text>

        <view class="v__card-meta">
          <view class="v__card-meta-row">
            <text class="v__card-meta-label">上报时间</text>
            <text class="v__card-meta-val">{{ fmtTime(i.reportedAt) }}</text>
          </view>
          <view v-if="i.decidedAt" class="v__card-meta-row">
            <text class="v__card-meta-label">处理时间</text>
            <text class="v__card-meta-val">{{ fmtTime(i.decidedAt) }}</text>
          </view>
          <view v-if="i.decision" class="v__card-meta-row">
            <text class="v__card-meta-label">处理意见</text>
            <text class="v__card-meta-val">{{ i.decision }}</text>
          </view>
        </view>

        <view v-if="i.deductCents && Number(i.deductCents) > 0" class="v__deduct">
          <SvgIcon name="alert-triangle" :size="18" color="#ef4444" />
          <text class="v__deduct-label">扣款</text>
          <text class="v__deduct-val">-¥{{ fmtCents(i.deductCents) }}</text>
        </view>
      </view>
    </view>

    <!-- 申诉提示 -->
    <view v-if="items.length > 0" class="v__hint" @tap="callSupport">
      <SvgIcon name="life-buoy" :size="20" color="#2e9c5d" />
      <text class="v__hint-text">如对判定有异议,可联系客服申诉</text>
      <text class="v__hint-arrow">›</text>
    </view>
  </view>
</template>

<style scoped>
.v {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  background: #f5f6f8;
}

/* 统计条 */
.v__stats {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 16rpx;
}
.v__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.v__stat-val {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-feature-settings: 'tnum';
  letter-spacing: -0.5rpx;
}
.v__stat-val--warn {
  color: var(--price-color);
}
.v__stat-val--info {
  color: #b7791f;
}
.v__stat-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.v__stat-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* 状态 tab */
.v__tabs {
  display: flex;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  padding: 4rpx;
  margin-top: 16rpx;
}
.v__tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-radius: 8rpx;
}
.v__tab--active {
  background: var(--brand-primary);
  color: #fff;
  font-weight: 700;
}

/* empty / loading */
.v__msg {
  text-align: center;
  padding: 80rpx 0;
  color: var(--text-muted);
  font-size: 24rpx;
}
.v__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.v__empty-text {
  font-size: 26rpx;
  color: var(--brand-primary);
  font-weight: 700;
}
.v__empty-sub {
  font-size: 22rpx;
  color: var(--text-muted);
}

/* 卡 */
.v__list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 16rpx;
}
.v__card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
}
.v__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 22rpx;
  background: #fafbfc;
  border-bottom: 1rpx solid #f0f1f3;
}
.v__card-head-l {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}
.v__type-chip {
  padding: 4rpx 12rpx;
  background: rgba(192, 57, 43, 0.1);
  color: var(--price-color);
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 4rpx;
}
.v__order-no {
  font-size: 20rpx;
  color: var(--text-muted);
  font-feature-settings: 'tnum';
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.v__status {
  font-size: 22rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
.v__status--fail {
  color: var(--price-color);
  background: #fdecea;
}
.v__status--ok {
  color: var(--brand-primary);
  background: #e9f7ef;
}
.v__status--warn {
  color: #b7791f;
  background: #fff7e0;
}

.v__card-desc {
  display: block;
  padding: 16rpx 22rpx 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.5;
}
.v__card-meta {
  padding: 0 22rpx 14rpx;
}
.v__card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 0;
}
.v__card-meta-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.v__card-meta-val {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-feature-settings: 'tnum';
  max-width: 60%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v__deduct {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 0 22rpx 16rpx;
  padding: 12rpx 14rpx;
  background: #fdecea;
  border-left: 4rpx solid #ef4444;
  border-radius: 0 8rpx 8rpx 0;
}
.v__deduct-label {
  font-size: 22rpx;
  color: var(--text-secondary);
}
.v__deduct-val {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--price-color);
  margin-left: auto;
  font-feature-settings: 'tnum';
}

/* 申诉提示 */
.v__hint {
  margin-top: 16rpx;
  padding: 18rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.v__hint-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-secondary);
}
.v__hint-arrow {
  color: #c5c9d2;
  font-size: 30rpx;
}
</style>
