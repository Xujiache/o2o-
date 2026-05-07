<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useOrderStore } from '@/stores/order';
import { labelOrderStatus } from '@/utils/food-order-status';

const store = useOrderStore();
const POLL_INTERVAL_MS = 15000;
const SOUND_ENABLED_KEY = 'o2o:merchant:new-order-sound-enabled';
const SOUND_SRC_KEY = 'o2o:merchant:new-order-audio-src';

type TabKey = 'pending' | 'preparing' | 'ready' | 'all';

interface TabDef {
  key: TabKey;
  label: string;
  status: string | undefined; // undefined = 默认 PAID_WAIT_MERCHANT
}

const TABS: TabDef[] = [
  { key: 'pending', label: '待接单', status: undefined },
  { key: 'preparing', label: '备货中', status: 'MERCHANT_ACCEPTED,PREPARING' },
  { key: 'ready', label: '已出餐 / 配送中', status: 'READY_FOR_PICKUP,RIDER_ASSIGNED,PICKED_UP,DELIVERING' },
  { key: 'all', label: '全部', status: 'ALL' },
];

const activeTab = ref<TabKey>('pending');
const soundEnabled = ref(uni.getStorageSync(SOUND_ENABLED_KEY) !== '0');
let pollTimer: ReturnType<typeof setInterval> | null = null;
let hydrated = false;
let audio: UniApp.InnerAudioContext | null = null;

const isPendingTab = computed(() => activeTab.value === 'pending');

onMounted(async () => {
  await refreshWithNotice();
  startPolling();
});

onShow(() => uni.hideTabBar({ animation: false }));

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  audio?.destroy();
  audio = null;
});

function go(orderId: string): void {
  uni.navigateTo({ url: `/pages/orders/detail?orderId=${orderId}` });
}

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function currentStatus(): string | undefined {
  return TABS.find((t) => t.key === activeTab.value)?.status;
}

async function refreshWithNotice(manual = false): Promise<void> {
  const before = isPendingTab.value ? new Set(store.pending.map((o) => o.orderId)) : null;
  await store.refresh(currentStatus());
  if (before && hydrated && !manual) {
    const newOrderCount = store.pending.filter((o) => !before.has(o.orderId)).length;
    if (newOrderCount > 0) notifyNewOrder(newOrderCount);
  }
  hydrated = true;
}

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    // 只在"待接单"tab 且不在加载时自动刷新
    if (isPendingTab.value && !store.loading) void refreshWithNotice();
  }, POLL_INTERVAL_MS);
}

async function switchTab(key: TabKey): Promise<void> {
  if (activeTab.value === key) return;
  activeTab.value = key;
  hydrated = false;
  await refreshWithNotice(true);
}

function toggleSound(): void {
  soundEnabled.value = !soundEnabled.value;
  uni.setStorageSync(SOUND_ENABLED_KEY, soundEnabled.value ? '1' : '0');
}

function notifyNewOrder(count: number): void {
  uni.showToast({ title: `收到 ${count} 笔新订单`, icon: 'none' });
  if (!soundEnabled.value) return;
  uni.vibrateShort?.({});
  const src = (uni.getStorageSync(SOUND_SRC_KEY) as string) || '';
  if (!src) return;
  if (!audio) audio = uni.createInnerAudioContext();
  audio.src = src;
  audio.play();
}
</script>

<template>
  <view class="pending">
    <view class="pending__header">
      <view class="pending__head-main">
        <text class="pending__title">订单管理</text>
        <text class="pending__sub">{{ TABS.find((t) => t.key === activeTab)?.label }} · 共 {{ store.total }} 笔</text>
        <text v-if="isPendingTab" class="pending__poll"
          >每 {{ POLL_INTERVAL_MS / 1000 }} 秒自动刷新 · 提示{{ soundEnabled ? '开' : '关' }}</text
        >
      </view>
      <view class="pending__head-actions">
        <text class="pending__pill" @tap="refreshWithNotice(true)">刷新</text>
        <text v-if="isPendingTab" class="pending__pill" @tap="toggleSound">{{
          soundEnabled ? '关提示' : '开提示'
        }}</text>
      </view>
    </view>

    <!-- 状态 tab -->
    <view class="pending__tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="pending__tab"
        :class="{ 'pending__tab--active': activeTab === t.key }"
        @tap="switchTab(t.key)"
      >
        {{ t.label }}
      </view>
    </view>

    <view v-if="store.loading" class="pending__msg">加载中...</view>
    <view v-else-if="store.pending.length === 0" class="pending__msg">
      <SvgIcon name="clipboard" :size="100" color="#c5c9d2" />
      <text>{{ isPendingTab ? '暂无待接单' : '该状态下暂无订单' }}</text>
    </view>
    <view v-else>
      <view v-for="o in store.pending" :key="o.orderId" class="pending__card" @tap="go(o.orderId)">
        <view class="pending__card-row">
          <text class="pending__no">{{ o.orderNo }}</text>
          <text class="pending__status">{{ labelOrderStatus(o.status) }}</text>
        </view>
        <view class="pending__card-row">
          <text class="pending__amt">¥{{ fmt(o.payableAmountCents) }}</text>
          <text class="pending__time">{{ fmtTime(o.createdAt) }}</text>
        </view>
        <view v-if="o.userRemark" class="pending__remark">备注: {{ o.userRemark }}</view>
      </view>
    </view>
    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.pending {
  padding: 24rpx 24rpx 200rpx;
  min-height: 100vh;
  background: #f5f6f8;
}
.pending__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 28rpx;
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 40rpx rgba(31, 41, 55, 0.18);
}
.pending__head-main {
  flex: 1;
}
.pending__title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}
.pending__sub {
  display: block;
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.84);
  font-size: 24rpx;
}
.pending__poll {
  display: block;
  margin-top: 4rpx;
  color: rgba(255, 255, 255, 0.62);
  font-size: 22rpx;
}
.pending__head-actions {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex-shrink: 0;
}
.pending__pill {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22rpx;
  text-align: center;
}

/* tabs */
.pending__tabs {
  display: flex;
  margin: 16rpx 0;
  background: #fff;
  padding: 8rpx;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(31, 41, 55, 0.05);
}
.pending__tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: #5a6275;
  border-radius: 999rpx;
}
.pending__tab--active {
  background: linear-gradient(135deg, #ffb400, #b7791f);
  color: #fff;
  font-weight: 700;
}

.pending__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.pending__empty-icon {
  font-size: 80rpx;
  opacity: 0.4;
}

.pending__card {
  background: #fff;
  margin: 12rpx 0 0;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.pending__card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.pending__card-row:last-child {
  margin-bottom: 0;
}
.pending__no {
  font-size: 24rpx;
  color: #5a6275;
}
.pending__status {
  font-size: 22rpx;
  color: #b7791f;
  font-weight: 700;
  padding: 4rpx 14rpx;
  background: rgba(183, 121, 31, 0.1);
  border-radius: 999rpx;
}
.pending__amt {
  font-size: 32rpx;
  font-weight: 700;
  color: #d33;
}
.pending__time {
  font-size: 22rpx;
  color: #8a94a6;
}
.pending__remark {
  margin-top: 8rpx;
  padding: 8rpx 12rpx;
  background: rgba(255, 180, 0, 0.08);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #5a6275;
}
</style>
