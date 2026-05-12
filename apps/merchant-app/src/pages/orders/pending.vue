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
  status: string | undefined;
}

const TABS: TabDef[] = [
  { key: 'pending', label: '待接单', status: undefined },
  { key: 'preparing', label: '备货中', status: 'MERCHANT_ACCEPTED,PREPARING' },
  { key: 'ready', label: '配送中', status: 'READY_FOR_PICKUP,RIDER_ASSIGNED,PICKED_UP,DELIVERING' },
  { key: 'all', label: '全部', status: 'ALL' },
];

const activeTab = ref<TabKey>('pending');
const soundEnabled = ref(uni.getStorageSync(SOUND_ENABLED_KEY) !== '0');
let pollTimer: ReturnType<typeof setInterval> | null = null;
let hydrated = false;
let audio: UniApp.InnerAudioContext | null = null;

const isPendingTab = computed(() => activeTab.value === 'pending');
const isPreparingTab = computed(() => activeTab.value === 'preparing');

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
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
}

/** 待接单剩余时间(秒)。后端字段 acceptDeadline 为 ms 时间戳 */
function deadlineLeft(deadline: number): string {
  const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  if (left === 0) return '已超时';
  const m = Math.floor(left / 60);
  const s = left % 60;
  if (m > 0) return `${m}分${String(s).padStart(2, '0')}秒`;
  return `${s}秒`;
}

function statusColorClass(status: string): string {
  if (['PAID_WAIT_MERCHANT'].includes(status)) return 'card__status--warn';
  if (['MERCHANT_ACCEPTED', 'PREPARING'].includes(status)) return 'card__status--info';
  if (['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERING'].includes(status))
    return 'card__status--primary';
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 'card__status--ok';
  if (['CANCELLED', 'REFUNDED'].includes(status)) return 'card__status--mute';
  return 'card__status--default';
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

// ===== 行操作:接单 / 拒单 / 出餐 =====
const rejectingId = ref<string | null>(null);
const rejectReason = ref('');
const submitting = ref(false);

async function onAccept(orderId: string): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const ok = await store.accept(orderId);
    uni.showToast({ title: ok ? '已接单' : '接单失败', icon: ok ? 'success' : 'none' });
    if (ok) await refreshWithNotice(true);
  } finally {
    submitting.value = false;
  }
}

function openReject(orderId: string): void {
  rejectingId.value = orderId;
  rejectReason.value = '';
}

function closeReject(): void {
  rejectingId.value = null;
  rejectReason.value = '';
}

async function submitReject(): Promise<void> {
  const id = rejectingId.value;
  if (!id) return;
  const reason = rejectReason.value.trim();
  if (!reason) {
    uni.showToast({ title: '请填写拒单原因', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.reject(id, reason);
    uni.showToast({ title: ok ? '已拒单' : '拒单失败', icon: ok ? 'success' : 'none' });
    if (ok) {
      closeReject();
      await refreshWithNotice(true);
    }
  } finally {
    submitting.value = false;
  }
}

async function onReady(orderId: string): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const ok = await store.markReady(orderId);
    uni.showToast({ title: ok ? '已标记出餐' : '操作失败', icon: ok ? 'success' : 'none' });
    if (ok) await refreshWithNotice(true);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="orders">
    <!-- 顶部 -->
    <view class="orders__head">
      <view class="orders__head-l">
        <text class="orders__title">订单管理</text>
        <text class="orders__sub">{{ TABS.find((t) => t.key === activeTab)?.label }} · 共 {{ store.total }} 笔</text>
      </view>
      <view class="orders__head-r">
        <view class="orders__head-btn" @tap="refreshWithNotice(true)">
          <SvgIcon name="refresh" :size="20" color="#5a6275" />
          <text>刷新</text>
        </view>
        <view v-if="isPendingTab" class="orders__head-btn" @tap="toggleSound">
          <SvgIcon name="bell" :size="20" :color="soundEnabled ? '#b7791f' : '#8a94a6'" />
          <text>{{ soundEnabled ? '声音开' : '声音关' }}</text>
        </view>
      </view>
    </view>

    <!-- 自动刷新提示 -->
    <view v-if="isPendingTab" class="orders__poll">
      <view class="orders__poll-dot" />
      <text>{{ POLL_INTERVAL_MS / 1000 }} 秒自动刷新</text>
    </view>

    <!-- 状态 tabs (京东风 underline) -->
    <view class="orders__tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="orders__tab"
        :class="{ 'orders__tab--active': activeTab === t.key }"
        @tap="switchTab(t.key)"
      >
        <text class="orders__tab-text">{{ t.label }}</text>
        <view v-if="activeTab === t.key" class="orders__tab-bar" />
      </view>
    </view>

    <view v-if="store.loading && store.pending.length === 0" class="orders__msg">加载中…</view>
    <view v-else-if="store.pending.length === 0" class="orders__empty">
      <SvgIcon name="clipboard" :size="120" color="#dde2ea" />
      <text class="orders__empty-text">{{ isPendingTab ? '暂无待接单订单' : '该状态下暂无订单' }}</text>
    </view>

    <view v-else class="orders__list">
      <view v-for="o in store.pending" :key="o.orderId" class="card" @tap="go(o.orderId)">
        <!-- head: 单号 + 状态 -->
        <view class="card__head">
          <view class="card__head-l">
            <SvgIcon name="clipboard" :size="20" color="#8a94a6" />
            <text class="card__no">{{ o.orderNo }}</text>
          </view>
          <text class="card__status" :class="statusColorClass(o.status)">
            {{ labelOrderStatus(o.status) }}
          </text>
        </view>

        <!-- 倒计时(仅待接单) -->
        <view v-if="isPendingTab" class="card__deadline">
          <SvgIcon name="clock" :size="18" color="#c0392b" />
          <text class="card__deadline-text">接单倒计时 {{ deadlineLeft(o.acceptDeadline) }}</text>
        </view>

        <!-- body: 金额 + 时间 + 备注 -->
        <view class="card__body">
          <view class="card__body-row">
            <text class="card__body-label">下单时间</text>
            <text class="card__body-val">{{ fmtTime(o.createdAt) }}</text>
          </view>
          <view class="card__body-row">
            <text class="card__body-label">订单金额</text>
            <text class="card__amount"
              >¥<text class="card__amount-num">{{ fmt(o.payableAmountCents) }}</text></text
            >
          </view>
          <view v-if="o.userRemark" class="card__remark">
            <SvgIcon name="file-edit" :size="18" color="#b7791f" />
            <text class="card__remark-text">{{ o.userRemark }}</text>
          </view>
        </view>

        <!-- 行操作 -->
        <view v-if="isPendingTab" class="card__act">
          <view class="card__act-btn card__act-btn--ghost" @tap.stop="openReject(o.orderId)">拒单</view>
          <view class="card__act-btn card__act-btn--primary" @tap.stop="onAccept(o.orderId)">立即接单</view>
        </view>
        <view v-else-if="isPreparingTab" class="card__act">
          <view class="card__act-btn card__act-btn--primary" @tap.stop="onReady(o.orderId)">标记已出餐</view>
        </view>
      </view>
    </view>

    <!-- 拒单弹层 -->
    <view v-if="rejectingId" class="modal">
      <view class="modal__mask" @tap="closeReject" />
      <view class="modal__panel">
        <text class="modal__title">拒单原因</text>
        <textarea
          v-model="rejectReason"
          class="modal__input"
          placeholder="如:商品售罄 / 不在配送范围 / 暂停营业"
          maxlength="200"
        />
        <view class="modal__btns">
          <view class="modal__btn modal__btn--ghost" @tap="closeReject">取消</view>
          <view
            class="modal__btn modal__btn--danger"
            :class="{ 'modal__btn--disabled': submitting || !rejectReason.trim() }"
            @tap="submitReject"
            >{{ submitting ? '提交中…' : '确认拒单' }}</view
          >
        </view>
      </view>
    </view>
    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.orders {
  padding: 24rpx 24rpx 200rpx;
  min-height: 100vh;
  background: #f5f6f8;
}

/* 顶部 */
.orders__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 4rpx 8rpx;
}
.orders__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.orders__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  letter-spacing: 0.5rpx;
}
.orders__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.orders__head-r {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.orders__head-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
  border-radius: 8rpx;
  background: #fff;
  font-size: 22rpx;
  color: #5a6275;
  border: 1rpx solid #e6e9ee;
}

.orders__poll {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 12rpx;
  margin-top: 6rpx;
  background: rgba(17, 134, 92, 0.06);
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #11865c;
  border: 1rpx solid rgba(17, 134, 92, 0.16);
  align-self: flex-start;
  display: inline-flex;
}
.orders__poll-dot {
  width: 10rpx;
  height: 10rpx;
  background: #11865c;
  border-radius: 50%;
}

/* tabs 京东风 underline */
.orders__tabs {
  display: flex;
  margin-top: 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  padding: 0 12rpx;
}
.orders__tab {
  flex: 1;
  position: relative;
  padding: 22rpx 0 18rpx;
  text-align: center;
}
.orders__tab-text {
  font-size: 26rpx;
  color: #5a6275;
}
.orders__tab--active .orders__tab-text {
  color: #b7791f;
  font-weight: 700;
}
.orders__tab-bar {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 44rpx;
  height: 6rpx;
  border-radius: 3rpx 3rpx 0 0;
  background: #b7791f;
}

/* empty / loading */
.orders__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.orders__empty {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.orders__empty-text {
  font-size: 24rpx;
  color: #8a94a6;
}

/* 列表 */
.orders__list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 16rpx;
}

/* 订单卡片 */
.card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  padding: 0;
  overflow: hidden;
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx;
  border-bottom: 1rpx solid #f0f1f3;
  background: #fafbfc;
}
.card__head-l {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.card__no {
  font-size: 24rpx;
  color: #5a6275;
  font-feature-settings: 'tnum';
}
.card__status {
  font-size: 22rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
.card__status--warn {
  color: #c0392b;
  background: #fdecea;
}
.card__status--info {
  color: #2563eb;
  background: #e6f0ff;
}
.card__status--primary {
  color: #b7791f;
  background: #fff7e0;
}
.card__status--ok {
  color: #11865c;
  background: #e9f7ef;
}
.card__status--mute {
  color: #8a94a6;
  background: #f0f1f3;
}
.card__status--default {
  color: #5a6275;
  background: #f0f1f3;
}

.card__deadline {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 14rpx 22rpx 0;
  padding: 10rpx 14rpx;
  background: #fdecea;
  border-radius: 6rpx;
}
.card__deadline-text {
  font-size: 22rpx;
  color: #c0392b;
  font-weight: 700;
}

.card__body {
  padding: 14rpx 22rpx 18rpx;
}
.card__body-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 0;
}
.card__body-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.card__body-val {
  font-size: 24rpx;
  color: #172033;
  font-feature-settings: 'tnum';
}
.card__amount {
  font-size: 22rpx;
  color: #c0392b;
  font-weight: 700;
}
.card__amount-num {
  font-size: 32rpx;
  font-weight: 800;
  font-feature-settings: 'tnum';
  margin-left: 2rpx;
}
.card__remark {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  background: #fff7e0;
  border-left: 4rpx solid #b7791f;
  border-radius: 0 6rpx 6rpx 0;
}
.card__remark-text {
  flex: 1;
  font-size: 22rpx;
  color: #5a6275;
  line-height: 1.5;
}

.card__act {
  display: flex;
  gap: 12rpx;
  padding: 0 22rpx 18rpx;
}
.card__act-btn {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 700;
}
.card__act-btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.card__act-btn--primary {
  background: #c0392b;
  color: #fff;
}

/* 拒单弹层 */
.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
.modal__panel {
  position: relative;
  width: 80%;
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx;
}
.modal__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.modal__input {
  width: 100%;
  height: 200rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #172033;
  box-sizing: border-box;
}
.modal__btns {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}
.modal__btn {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 700;
}
.modal__btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.modal__btn--danger {
  background: #c0392b;
  color: #fff;
}
.modal__btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
