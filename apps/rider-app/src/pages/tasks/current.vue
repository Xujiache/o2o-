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
  ASSIGNED: '请尽快前往取货点，保持手机定位开启',
  ARRIVED_PICKUP: '已到达取货点，请核对货品并完成取货',
  PICKED_UP: '货品已取出，请按时送达收货位置',
  DELIVERING: '正在配送中，请关注路线和客户备注',
  DELIVERED: '任务已送达',
  EXCEPTION: '异常处理中，请等待平台处理',
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

function routeTargetName(t: RiderTaskDetailVo, phase: 'pickup' | 'delivery'): string {
  const target = phase === 'pickup' ? t.pickupLocation : t.deliveryLocation;
  return target?.name || (phase === 'pickup' ? '取货点待同步' : '送达点待同步');
}

function gotoNavigate(t: RiderTaskDetailVo, phase: 'pickup' | 'delivery'): void {
  uni.navigateTo({ url: `/pages/tasks/navigate?taskId=${t.taskId}&phase=${phase}` });
}

function gotoPickup(t: RiderTaskDetailVo): void {
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
    <view class="cur__hero">
      <view class="cur__head">
        <view class="cur__head-main">
          <text class="cur__title">当前任务</text>
          <text class="cur__sub">
            {{ store.inProgress.length > 0 ? `进行中 ${store.inProgress.length} 单` : '暂无配送任务' }}
          </text>
        </view>
        <text class="cur__refresh" @tap="refresh">{{ refreshing ? '刷新中' : '刷新' }}</text>
      </view>
    </view>

    <view v-if="store.inProgress.length > 0" class="cur__list">
      <view v-for="t in store.inProgress" :key="t.taskId" class="task-card">
        <view class="task-card__top">
          <view class="task-card__badge" :class="`task-card__badge--${t.bizType.toLowerCase()}`">
            {{ bizLabel(t) }}
          </view>
          <text class="task-card__order">#{{ t.bizOrderId }}</text>
          <text class="task-card__status">{{ labelRiderTaskStatus(t.status) }}</text>
        </view>

        <text class="task-card__tip">{{ STATUS_TIPS[t.status] ?? '任务状态更新中' }}</text>

        <view class="route">
          <view class="route__item">
            <view class="route__dot route__dot--pickup" />
            <text class="route__name">{{ routeTargetName(t, 'pickup') }}</text>
          </view>
          <view class="route__item">
            <view class="route__dot route__dot--delivery" />
            <text class="route__name">{{ routeTargetName(t, 'delivery') }}</text>
          </view>
        </view>

        <view class="time-row">
          <view class="time-row__item">
            <text class="time-row__label">接单</text>
            <text class="time-row__value">{{ fmtTime(t.acceptedAt) }}</text>
          </view>
          <view v-if="t.arrivedPickupAt" class="time-row__item">
            <text class="time-row__label">到店</text>
            <text class="time-row__value">{{ fmtTime(t.arrivedPickupAt) }}</text>
          </view>
          <view v-if="t.pickedUpAt" class="time-row__item">
            <text class="time-row__label">{{ pickupLabel(t) }}</text>
            <text class="time-row__value">{{ fmtTime(t.pickedUpAt) }}</text>
          </view>
        </view>

        <view class="actions">
          <view
            v-if="t.status === 'ASSIGNED'"
            class="actions__btn actions__btn--primary"
            @tap="gotoNavigate(t, 'pickup')"
          >
            <SvgIcon name="motorcycle" :size="28" color="#fff" />
            <text>前往{{ pickupLabel(t) }}点</text>
          </view>
          <view v-if="t.status === 'ASSIGNED'" class="actions__btn actions__btn--ghost" @tap="gotoPickup(t)">
            已到店，直接{{ pickupLabel(t) }}
          </view>
          <view v-if="t.status === 'ARRIVED_PICKUP'" class="actions__btn actions__btn--primary" @tap="gotoPickup(t)">
            <SvgIcon name="package" :size="28" color="#fff" />
            <text>确认{{ pickupLabel(t) }}</text>
          </view>
          <view
            v-if="t.status === 'PICKED_UP' || t.status === 'DELIVERING'"
            class="actions__btn actions__btn--primary"
            @tap="gotoNavigate(t, 'delivery')"
          >
            <SvgIcon name="motorcycle" :size="28" color="#fff" />
            <text>前往送达点</text>
          </view>
          <view
            v-if="t.status === 'PICKED_UP' || t.status === 'DELIVERING'"
            class="actions__btn actions__btn--ghost"
            @tap="gotoDelivered(t)"
          >
            <SvgIcon name="check-circle" :size="28" color="#2e9c5d" />
            <text>确认送达</text>
          </view>
          <view class="actions__btn actions__btn--warn" @tap="gotoException(t)">
            <SvgIcon name="alert-triangle" :size="26" color="#d33" />
            <text>异常报备</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <SvgIcon name="utensils" :size="120" color="#c5c9d2" />
      <text class="empty__text">暂无进行中的任务</text>
      <view class="empty__btn" @tap="gotoHall">去接单大厅</view>
    </view>

    <view v-if="store.inProgress.length > 0" class="hall-bar" @tap="gotoHall">
      <text>继续接单</text>
    </view>
    <FloatTabBar active="tasks" />
  </view>
</template>

<style scoped>
.cur {
  min-height: 100vh;
  padding: 24rpx 24rpx 240rpx;
  background: #fff;
  box-sizing: border-box;
}

.cur__hero {
  padding: 32rpx 28rpx;
  border-radius: 26rpx;
  color: #fff;
  background: var(--brand-gradient-reverse);
  box-shadow: 0 18rpx 40rpx rgba(46, 156, 93, 0.22);
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

.cur__list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.task-card {
  padding: 24rpx;
  border: 1rpx solid #edf0f5;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}

.task-card__top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.task-card__badge {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  color: #fff;
  flex-shrink: 0;
}

.task-card__badge--food {
  background: #ff7a45;
}

.task-card__badge--errand {
  background: var(--brand-primary);
}

.task-card__order {
  flex: 1;
  color: var(--text-muted);
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card__status {
  color: var(--brand-primary);
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.task-card__tip {
  display: block;
  color: var(--text-primary);
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.45;
  margin-bottom: 18rpx;
}

.route {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
}

.route__item {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.route__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.route__dot--pickup {
  background: #f97316;
}

.route__dot--delivery {
  background: var(--brand-primary);
}

.route__name {
  color: var(--text-primary);
  font-size: 24rpx;
  line-height: 1.35;
}

.time-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin: 18rpx 0 8rpx;
}

.time-row__item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 7rpx 14rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.time-row__label {
  color: var(--text-muted);
}

.time-row__value {
  color: var(--text-primary);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-top: 10rpx;
}

.actions__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-height: 80rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.actions__btn--primary {
  background: var(--brand-primary);
  color: #fff;
}

.actions__btn--ghost {
  background: #e8f5ee;
  color: var(--brand-primary);
}

.actions__btn--warn {
  background: #fff5f5;
  color: #d33;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty__text {
  font-size: 28rpx;
  color: var(--text-muted);
  margin: 18rpx 0 32rpx;
}

.empty__btn {
  background: var(--brand-primary);
  color: #fff;
  padding: 18rpx 48rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.hall-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom, 0rpx) + 160rpx);
  background: var(--brand-primary);
  color: #fff;
  border-radius: 999rpx;
  padding: 22rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 16rpx 40rpx rgba(46, 156, 93, 0.28);
  z-index: 50;
}
</style>
