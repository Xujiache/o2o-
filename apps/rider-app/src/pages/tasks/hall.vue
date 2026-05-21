<script setup lang="ts">
import { onHide, onShow } from '@dcloudio/uni-app';
import { onUnmounted, ref } from 'vue';

import { acceptTask } from '@/api/rider-tasks';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { request } from '@/utils/request';

const POLL_INTERVAL_MS = 5000;

interface AvailableTask {
  taskId: string;
  bizType: 'takeaway' | 'errand';
  distance: number;
  reward: number;
  priceIncreaseCents: number;
  urgent: boolean;
  waitedMinutes: number;
  deadline: number;
  pickupAddress: { lng: number; lat: number; text: string };
  deliveryAddress: { lng: number; lat: number; text: string };
}

const tasks = ref<AvailableTask[]>([]);
const loading = ref(false);
const accepting = ref<string | null>(null);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const r = await request<{ items: AvailableTask[]; total: number }>({
      url: '/api/v1/r/tasks/available',
      method: 'GET',
    });
    if (r.code === '0' && r.data) {
      tasks.value = (r.data as { items: AvailableTask[] }).items ?? [];
    } else {
      uni.showToast({ title: r.message ?? '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function accept(taskId: string): Promise<void> {
  if (accepting.value) return;
  accepting.value = taskId;
  try {
    const r = await acceptTask(taskId);
    if (r.code === '0') {
      // 乐观移除:立刻从列表里 filter 掉,即使轮询慢一秒也不会闪显已抢单的任务
      tasks.value = tasks.value.filter((t) => t.taskId !== taskId);
      uni.showToast({ title: '抢单成功,可继续抢', icon: 'success' });
      // 留在大厅,允许并发抢单;骑手可随时切到"我的任务"看进行中列表
    } else {
      uni.showToast({ title: r.message ?? '抢单失败', icon: 'none' });
      void refresh();
    }
  } finally {
    accepting.value = null;
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(): void {
  stopPolling();
  // TODO(WS): 订阅 rider:hall:${cityCode}，替换轮询。W3 已建 ws-gateway，详见 docs/ARCHITECTURE.md
  pollTimer = setInterval(() => {
    if (!loading.value && !accepting.value) void refresh();
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function fmtDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function fmtYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

function fmtRemaining(deadlineMs: number): string {
  const remaining = Math.max(0, deadlineMs - Date.now());
  const min = Math.floor(remaining / 60000);
  const sec = Math.floor((remaining % 60000) / 1000);
  if (min <= 0) return `${sec} 秒后过期`;
  return `${min} 分 ${sec} 秒后过期`;
}

function bizLabel(bizType: 'takeaway' | 'errand'): string {
  return bizType === 'takeaway' ? '外卖' : '跑腿';
}

// onShow 既覆盖首次进入,也覆盖切回 tab 时立即刷新
onShow(() => {
  uni.hideTabBar({ animation: false });
  void refresh();
  startPolling();
});

// 切走 tab 时停止轮询,节省流量
onHide(stopPolling);

onUnmounted(stopPolling);
</script>

<template>
  <view class="hall">
    <view class="hall__head">
      <view class="hall__head-main">
        <text class="hall__title">接单大厅</text>
        <text class="hall__sub">附近 {{ tasks.length }} 个可接任务</text>
      </view>
      <text class="hall__refresh" @tap="refresh">{{ loading ? '加载中…' : '刷新' }}</text>
    </view>

    <view v-if="loading && tasks.length === 0" class="hall__msg">加载中…</view>
    <view v-else-if="tasks.length === 0" class="hall__msg">
      <SvgIcon name="motorcycle" :size="120" color="#c5c9d2" />
      <text>当前无可接任务,稍后再试</text>
    </view>

    <view v-for="t in tasks" :key="t.taskId" class="hall__card" :class="{ 'hall__card--urgent': t.urgent }">
      <view v-if="t.urgent" class="hall__urgent-bar">
        <SvgIcon name="zap" :size="24" color="#fff" />
        <text class="hall__urgent-text"
          >加急 · 已等待 {{ t.waitedMinutes }} 分钟,平台补贴 +¥{{ fmtYuan(t.priceIncreaseCents) }}</text
        >
      </view>
      <view class="hall__card-head">
        <view class="hall__badge" :class="`hall__badge--${t.bizType}`">{{ bizLabel(t.bizType) }}</view>
        <view class="hall__amount">
          ¥{{ fmtYuan(t.reward) }}
          <text v-if="t.priceIncreaseCents > 0" class="hall__amount-sub"
            >含补贴 +¥{{ fmtYuan(t.priceIncreaseCents) }}</text
          >
        </view>
        <view class="hall__distance">{{ fmtDistance(t.distance) }}</view>
      </view>

      <view class="hall__route">
        <view class="hall__route-row">
          <view class="hall__dot hall__dot--pickup" />
          <view class="hall__route-main">
            <text class="hall__route-label">取{{ t.bizType === 'takeaway' ? '餐' : '货' }}</text>
            <text class="hall__route-text">{{ t.pickupAddress.text }}</text>
          </view>
        </view>
        <view class="hall__route-line" />
        <view class="hall__route-row">
          <view class="hall__dot hall__dot--delivery" />
          <view class="hall__route-main">
            <text class="hall__route-label">送达</text>
            <text class="hall__route-text">{{ t.deliveryAddress.text }}</text>
          </view>
        </view>
      </view>

      <view class="hall__card-foot">
        <text class="hall__deadline">{{ fmtRemaining(t.deadline) }}</text>
        <view class="hall__accept" :class="{ 'hall__accept--loading': accepting === t.taskId }" @tap="accept(t.taskId)">
          {{ accepting === t.taskId ? '抢单中…' : '立即抢单' }}
        </view>
      </view>
    </view>
    <FloatTabBar active="hall" />
  </view>
</template>

<style scoped>
.hall {
  padding: 24rpx 24rpx 200rpx;
  min-height: 100vh;
  background: #f5f6f8;
}
.hall__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 28rpx;
  border-radius: 28rpx;
  color: #fff;
  background: var(--brand-gradient-reverse);
  box-shadow: 0 18rpx 40rpx rgba(46, 156, 93, 0.22);
  margin-bottom: 16rpx;
}
.hall__head-main {
  flex: 1;
}
.hall__title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}
.hall__sub {
  display: block;
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 24rpx;
}
.hall__refresh {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 24rpx;
}
.hall__msg {
  text-align: center;
  padding: 100rpx 0;
  color: var(--text-muted);
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.hall__empty-icon {
  font-size: 80rpx;
  opacity: 0.4;
}

.hall__card {
  background: #fff;
  margin-bottom: 16rpx;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
  position: relative;
}
.hall__card--urgent {
  border: 2rpx solid #ff4d4f;
  box-shadow: 0 8rpx 28rpx rgba(255, 77, 79, 0.18);
  animation: urgentPulse 2s infinite;
}
@keyframes urgentPulse {
  0%,
  100% {
    box-shadow: 0 8rpx 28rpx rgba(255, 77, 79, 0.18);
  }
  50% {
    box-shadow: 0 8rpx 36rpx rgba(255, 77, 79, 0.4);
  }
}
.hall__urgent-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(90deg, #ff4d4f, #ff7a45);
  color: #fff;
  padding: 10rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 14rpx;
  font-size: 22rpx;
  font-weight: 700;
}
.hall__urgent-icon {
  font-size: 26rpx;
}
.hall__urgent-text {
  flex: 1;
}
.hall__amount-sub {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: var(--price-color);
  font-weight: 600;
}
.hall__card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.hall__badge {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  color: #fff;
}
.hall__badge--takeaway {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
}
.hall__badge--errand {
  background: var(--brand-gradient-reverse);
}
.hall__amount {
  flex: 1;
  font-size: 36rpx;
  font-weight: 800;
  color: #d33;
}
.hall__distance {
  font-size: 24rpx;
  color: var(--text-muted);
  background: #f5f6f8;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.hall__route {
  position: relative;
  padding: 4rpx 0;
}
.hall__route-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 8rpx 0;
}
.hall__dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-top: 6rpx;
  flex-shrink: 0;
}
.hall__dot--pickup {
  background: var(--brand-primary-light);
  box-shadow: 0 0 0 1rpx #5fbe7d;
}
.hall__dot--delivery {
  background: var(--price-color);
  box-shadow: 0 0 0 1rpx #ff4d4f;
}
.hall__route-line {
  width: 2rpx;
  height: 24rpx;
  background: rgba(31, 41, 55, 0.15);
  margin-left: 15rpx;
}
.hall__route-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}
.hall__route-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.hall__route-text {
  font-size: 26rpx;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hall__card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.05);
}
.hall__deadline {
  font-size: 22rpx;
  color: #ff6b35;
}
.hall__accept {
  background: var(--brand-gradient);
  color: #fff;
  padding: 14rpx 36rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 24rpx rgba(46, 156, 93, 0.32);
}
.hall__accept--loading {
  opacity: 0.7;
}
</style>
