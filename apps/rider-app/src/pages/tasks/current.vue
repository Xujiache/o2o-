<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

import type { RiderTaskDetailVo } from '@/api/rider-tasks';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useTaskStore } from '@/stores/task';
import { labelRiderTaskStatus } from '@/utils/rider-task-status';

const store = useTaskStore();
const refreshing = ref(false);

const STATUS_TIPS: Record<string, string> = {
  ASSIGNED: '前往取货点',
  ARRIVED_PICKUP: '到店核对货品',
  PICKED_UP: '配送到客户',
  DELIVERED: '已送达',
};

async function refresh(): Promise<void> {
  refreshing.value = true;
  try {
    await store.loadInProgress();
  } finally {
    refreshing.value = false;
  }
}

function fmtTime(ms: number | null): string {
  if (!ms) return '-';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function bizLabel(t: RiderTaskDetailVo): string {
  if (t.bizType === 'FOOD') return '外卖';
  if (t.errandTypeCode === 'BUY') return '代买';
  if (t.errandTypeCode === 'DELIVER') return '代送';
  if (t.errandTypeCode === 'HELP') return '代办';
  if (t.errandTypeCode === 'CUSTOM') return '跑腿';
  return '跑腿';
}

function pickupLabel(t: RiderTaskDetailVo): string {
  return t.bizType === 'FOOD' ? '取餐' : '取货';
}

function gotoNavigate(t: RiderTaskDetailVo, phase: 'pickup' | 'delivery'): void {
  uni.navigateTo({ url: `/pages/tasks/navigate?taskId=${t.taskId}&phase=${phase}` });
}

function gotoPickup(t: RiderTaskDetailVo): void {
  // 切到对应任务作为 current,让后续页面用 store.current
  store.current = t;
  const url =
    t.bizType === 'FOOD'
      ? `/pages/tasks/pickup-food?taskId=${t.taskId}`
      : `/pages/tasks/pickup-errand?taskId=${t.taskId}`;
  uni.navigateTo({ url });
}

function gotoDelivered(t: RiderTaskDetailVo): void {
  store.current = t;
  uni.navigateTo({ url: `/pages/tasks/delivered?taskId=${t.taskId}` });
}

function gotoException(t: RiderTaskDetailVo): void {
  store.current = t;
  uni.navigateTo({ url: `/pages/tasks/exception?taskId=${t.taskId}` });
}

function gotoHall(): void {
  uni.switchTab({ url: '/pages/tasks/hall' });
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void refresh();
});
</script>

<template>
  <view class="cur">
    <!-- Hero -->
    <view class="cur__hero">
      <view class="cur__head">
        <view class="cur__head-main">
          <text class="cur__title">我的任务</text>
          <text class="cur__sub">
            {{ store.inProgress.length > 0 ? `进行中 ${store.inProgress.length} 单` : '去接单大厅抢一单吧' }}
          </text>
        </view>
        <text class="cur__refresh" @tap="refresh">{{ refreshing ? '加载中…' : '刷新' }}</text>
      </view>
    </view>

    <!-- 任务列表 -->
    <view v-if="store.inProgress.length > 0" class="cur__list">
      <view v-for="t in store.inProgress" :key="t.taskId" class="cur__item">
        <view class="cur__item-head">
          <view class="cur__badge" :class="`cur__badge--${t.bizType.toLowerCase()}`">
            {{ bizLabel(t) }}
          </view>
          <text class="cur__order-no">#{{ t.bizOrderId }}</text>
          <text class="cur__status">{{ labelRiderTaskStatus(t.status) }}</text>
        </view>

        <text class="cur__tip">{{ STATUS_TIPS[t.status] ?? '配送中' }}</text>

        <view class="cur__times">
          <view class="cur__time">
            <text class="cur__time-label">抢单</text>
            <text class="cur__time-val">{{ fmtTime(t.acceptedAt) }}</text>
          </view>
          <view v-if="t.arrivedPickupAt" class="cur__time">
            <text class="cur__time-label">到店</text>
            <text class="cur__time-val">{{ fmtTime(t.arrivedPickupAt) }}</text>
          </view>
          <view v-if="t.pickedUpAt" class="cur__time">
            <text class="cur__time-label">{{ pickupLabel(t) }}</text>
            <text class="cur__time-val">{{ fmtTime(t.pickedUpAt) }}</text>
          </view>
        </view>

        <view class="cur__actions">
          <view v-if="t.status === 'ASSIGNED'" class="cur__btn cur__btn--primary" @tap="gotoNavigate(t, 'pickup')">
            <SvgIcon name="motorcycle" :size="28" color="#fff" />
            <text>前往{{ pickupLabel(t) }}点</text>
          </view>
          <view v-if="t.status === 'ASSIGNED'" class="cur__btn cur__btn--ghost" @tap="gotoPickup(t)">
            已到店,直接{{ pickupLabel(t) }}
          </view>
          <view v-if="t.status === 'ARRIVED_PICKUP'" class="cur__btn cur__btn--primary" @tap="gotoPickup(t)">
            <SvgIcon name="package" :size="28" color="#fff" />
            <text>确认{{ pickupLabel(t) }}</text>
          </view>
          <view v-if="t.status === 'PICKED_UP'" class="cur__btn cur__btn--primary" @tap="gotoNavigate(t, 'delivery')">
            <SvgIcon name="motorcycle" :size="28" color="#fff" />
            <text>前往送达</text>
          </view>
          <view v-if="t.status === 'PICKED_UP'" class="cur__btn cur__btn--ghost" @tap="gotoDelivered(t)">
            <SvgIcon name="check-circle" :size="28" color="#0f766e" />
            <text>确认送达</text>
          </view>
          <view class="cur__btn cur__btn--warn" @tap="gotoException(t)">
            <SvgIcon name="alert-triangle" :size="26" color="#d33" />
            <text>异常报备</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="cur__empty">
      <SvgIcon name="utensils" :size="120" color="#c5c9d2" />
      <text class="cur__empty-text">暂无进行中任务</text>
      <view class="cur__empty-btn" @tap="gotoHall">去接单大厅</view>
    </view>

    <!-- 继续抢单浮条(有任务时也能再去抢) -->
    <view v-if="store.inProgress.length > 0" class="cur__hall-bar" @tap="gotoHall">
      <text class="cur__hall-icon">＋</text>
      <text>继续抢单</text>
    </view>
    <FloatTabBar active="tasks" />
  </view>
</template>

<style scoped>
.cur {
  padding: 24rpx 24rpx 240rpx;
  min-height: 100vh;
  background: #f5f6f8;
}

.cur__hero {
  padding: 32rpx 28rpx;
  border-radius: 28rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 18rpx 40rpx rgba(20, 184, 166, 0.22);
  margin-bottom: 20rpx;
}
.cur__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}
.cur__head-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.cur__title {
  font-size: 38rpx;
  font-weight: 800;
}
.cur__sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
}
.cur__refresh {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
  flex-shrink: 0;
}

/* 列表 */
.cur__list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.cur__item {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.cur__item-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.cur__badge {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  color: #fff;
  flex-shrink: 0;
}
.cur__badge--food {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
}
.cur__badge--errand {
  background: linear-gradient(135deg, #4776e6, #8e54e9);
}
.cur__order-no {
  flex: 1;
  font-size: 22rpx;
  color: #8a94a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cur__status {
  font-size: 24rpx;
  font-weight: 700;
  color: #14b8a6;
  flex-shrink: 0;
}
.cur__tip {
  display: block;
  font-size: 26rpx;
  color: #172033;
  margin-bottom: 12rpx;
}
.cur__times {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}
.cur__time {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  font-size: 22rpx;
}
.cur__time-label {
  color: #8a94a6;
}
.cur__time-val {
  color: #172033;
  font-weight: 600;
}

.cur__actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-top: 4rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.05);
  margin-top: 8rpx;
}
.cur__btn {
  text-align: center;
  border-radius: 999rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 700;
  margin-top: 10rpx;
}
.cur__btn--primary {
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(20, 184, 166, 0.28);
}
.cur__btn--ghost {
  background: #fff;
  color: #0f766e;
  border: 2rpx solid rgba(15, 118, 110, 0.18);
}
.cur__btn--warn {
  background: #fff;
  color: #d33;
  border: 2rpx solid rgba(217, 51, 51, 0.18);
}

/* 空态 */
.cur__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.cur__empty-icon {
  font-size: 96rpx;
  opacity: 0.4;
  margin-bottom: 24rpx;
}
.cur__empty-text {
  font-size: 28rpx;
  color: #8a94a6;
  margin-bottom: 32rpx;
}
.cur__empty-btn {
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  padding: 18rpx 48rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

/* 继续抢单悬浮条 */
.cur__hall-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom, 0rpx) + 160rpx);
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  border-radius: 999rpx;
  padding: 22rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 16rpx 40rpx rgba(20, 184, 166, 0.36);
  z-index: 50;
}
.cur__hall-icon {
  font-size: 36rpx;
  font-weight: 300;
  line-height: 1;
}
</style>
