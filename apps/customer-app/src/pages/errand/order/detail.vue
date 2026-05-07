<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { cancelErrandOrder, remarkErrandOrder, urgentErrandOrder } from '@/api/errand-orders';
import { prepay, simulatePayCallback } from '@/api/food-payments';
import { useErrandOrderStore } from '@/stores/errand-order';
import { statusLabel, typeLabel } from '@/utils/errand-status';
import { formatYuan } from '@/utils/format-price';

const store = useErrandOrderStore();
const detail = ref(store.detail);
const orderId = ref('');
const paying = ref(false);
const countdown = ref(0);

let countdownTimer: ReturnType<typeof setInterval> | null = null;

function getQueryOrderId(): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const pages = (getCurrentPages?.() ?? []) as any[];
  const last = pages[pages.length - 1] as { options?: { orderId?: string } } | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return last?.options?.orderId ?? '';
}

const isWaitPay = computed<boolean>(() => detail.value?.status === 'WAIT_PAY');
const heroVariant = computed<string>(() => {
  const s = detail.value?.status;
  if (s === 'WAIT_PAY') return 'detail__hero--warn';
  if (s === 'COMPLETED') return 'detail__hero--ok';
  if (s === 'CANCELLED') return 'detail__hero--mute';
  return '';
});

async function load(): Promise<void> {
  orderId.value = getQueryOrderId();
  if (!orderId.value) return;
  const d = await store.loadDetail(orderId.value);
  detail.value = d;
  startCountdown();
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function startCountdown(): void {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (!detail.value || detail.value.status !== 'WAIT_PAY') {
      countdown.value = 0;
      return;
    }
    countdown.value = Math.max(0, Math.floor((detail.value.expireAt - Date.now()) / 1000));
  }, 1000);
}

const countdownLabel = computed<string>(() => {
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

async function onCancel(): Promise<void> {
  const res = await uni.showModal({ title: '取消订单', content: '确定要取消吗?' });
  if (!res.confirm) return;
  await cancelErrandOrder(orderId.value, 'USER_CANCEL');
  await load();
}

async function onUrgent(): Promise<void> {
  const res = await uni.showActionSheet({ itemList: ['加急(+5 元)', '特急(+10 元)'] });
  if (res.errMsg.endsWith('cancel') || !detail.value) return;
  const level = res.tapIndex === 0 ? 'fast' : 'express';
  const fee = res.tapIndex === 0 ? 500 : 1000;
  const r = await urgentErrandOrder(orderId.value, { urgentLevel: level, confirmFee: fee });
  if (r.code !== '0') uni.showToast({ title: r.message ?? '加急失败', icon: 'none' });
  await load();
}

async function onRemark(): Promise<void> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const res = await (uni.showModal as any)({
    title: '补充备注',
    editable: true,
    placeholderText: '请输入备注',
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!res.confirm || !res.content) return;
  await remarkErrandOrder(orderId.value, { remark: res.content });
  await load();
}

async function onPay(): Promise<void> {
  if (!detail.value || !isWaitPay.value || paying.value) return;
  if (countdown.value === 0) {
    uni.showToast({ title: '订单已超时', icon: 'none' });
    return;
  }
  paying.value = true;
  try {
    const r = await prepay({
      bizType: 'ERRAND',
      orderId: orderId.value,
      payChannel: 'wxpay',
    });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '支付下单失败', icon: 'none' });
      return;
    }
    uni.showToast({ title: 'mock 支付中…', icon: 'loading' });
    const payable = Number(detail.value.payableAmount);
    await simulatePayCallback('wxpay', r.data.payOrderNo, payable);
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } catch (err) {
    uni.showToast({
      title: err instanceof Error ? err.message : '支付失败',
      icon: 'none',
    });
  } finally {
    paying.value = false;
  }
}

function goTrack(): void {
  uni.navigateTo({ url: `/pages/errand/track/index?orderId=${orderId.value}` });
}
function goAfterSales(): void {
  uni.navigateTo({ url: '/pages/me/aftersales-stub' });
}

onMounted(load);
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
  <view class="detail">
    <view v-if="!detail" class="detail__empty">加载中…</view>

    <template v-else>
      <!-- 头部状态卡(按状态切配色) -->
      <view class="detail__hero" :class="heroVariant">
        <text class="detail__type-tag">{{ typeLabel(detail.typeCode) }}</text>
        <text class="detail__status">{{ statusLabel(detail.status) }}</text>
        <text class="detail__order-no">订单号 {{ detail.orderNo }}</text>
        <view v-if="isWaitPay && countdown > 0" class="detail__countdown">
          <text class="detail__countdown-icon">⏱</text>
          <text>剩余支付时间 {{ countdownLabel }}</text>
        </view>
        <view v-else-if="isWaitPay && countdown === 0" class="detail__countdown detail__countdown--expired">
          <text>订单已超时,请取消后重新下单</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="detail__card">
        <text class="detail__card-title">订单信息</text>
        <view class="detail__info">
          <view class="detail__info-icon"><SvgIcon name="package" :size="32" color="#5b5ff8" /></view>
          <view class="detail__info-main">
            <text class="detail__info-label">取货地址</text>
            <text class="detail__info-value">{{ detail.pickupAddress ?? '-' }}</text>
          </view>
        </view>
        <view class="detail__info">
          <view class="detail__info-icon"><SvgIcon name="location-pin" :size="32" color="#ff6b35" /></view>
          <view class="detail__info-main">
            <text class="detail__info-label">送达地址</text>
            <text class="detail__info-value">{{ detail.deliveryAddress }}</text>
          </view>
        </view>
        <view v-if="detail.itemDesc" class="detail__info">
          <view class="detail__info-icon"><SvgIcon name="file-edit" :size="32" color="#0f766e" /></view>
          <view class="detail__info-main">
            <text class="detail__info-label">物品</text>
            <text class="detail__info-value">{{ detail.itemDesc }}</text>
          </view>
        </view>
        <view v-if="detail.taskDesc" class="detail__info">
          <view class="detail__info-icon"><SvgIcon name="clipboard" :size="32" color="#8e54e9" /></view>
          <view class="detail__info-main">
            <text class="detail__info-label">任务</text>
            <text class="detail__info-value">{{ detail.taskDesc }}</text>
          </view>
        </view>
        <view class="detail__info">
          <view class="detail__info-icon"><SvgIcon name="ruler" :size="32" color="#5a6275" /></view>
          <view class="detail__info-main">
            <text class="detail__info-label">距离</text>
            <text class="detail__info-value">{{ detail.distanceMeters }} 米</text>
          </view>
        </view>
      </view>

      <!-- 取件码 / 收货码:只有付款后(detail.deliveryCode 非空)才显示 -->
      <view v-if="detail.deliveryCode" class="detail__codes">
        <view v-if="detail.pickupCode" class="detail__code-card detail__code-card--pickup">
          <view class="detail__code-head">
            <view class="detail__code-icon"><SvgIcon name="shopping-bag" :size="40" color="#fff" /></view>
            <view class="detail__code-text">
              <text class="detail__code-title">取件码</text>
              <text class="detail__code-tip">骑手到取货点时,请出示给骑手核验</text>
            </view>
          </view>
          <text class="detail__code-num">{{ detail.pickupCode }}</text>
        </view>
        <view class="detail__code-card detail__code-card--delivery">
          <view class="detail__code-head">
            <view class="detail__code-icon"><SvgIcon name="bell" :size="40" color="#fff" /></view>
            <view class="detail__code-text">
              <text class="detail__code-title">收货码</text>
              <text class="detail__code-tip">骑手送达时,请出示给骑手核验</text>
            </view>
          </view>
          <text class="detail__code-num">{{ detail.deliveryCode }}</text>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="detail__card">
        <text class="detail__card-title">费用明细</text>
        <view class="detail__row">
          <text class="detail__row-label">基础费</text>
          <text class="detail__row-value">¥{{ formatYuan(detail.baseFee) }}</text>
        </view>
        <view class="detail__row">
          <text class="detail__row-label">距离费</text>
          <text class="detail__row-value">¥{{ formatYuan(detail.distanceFee) }}</text>
        </view>
        <view class="detail__row">
          <text class="detail__row-label">加急 / 重量费</text>
          <text class="detail__row-value">¥{{ formatYuan(detail.urgentFee) }}</text>
        </view>
        <view class="detail__row detail__row--total">
          <text class="detail__row-label">应付</text>
          <text class="detail__row-pay">¥{{ formatYuan(detail.payableAmount) }}</text>
        </view>
      </view>

      <!-- 时间线 -->
      <view class="detail__card">
        <text class="detail__card-title">订单时间线</text>
        <view class="detail__timeline">
          <view v-for="(t, i) in detail.timeline" :key="t.createdAt" class="detail__tl-item">
            <view class="detail__tl-dot" :class="{ 'detail__tl-dot--active': i === 0 }" />
            <view v-if="i < detail.timeline.length - 1" class="detail__tl-line" />
            <view class="detail__tl-main">
              <text class="detail__tl-event">{{ t.eventType }}</text>
              <text class="detail__tl-time">{{ formatTime(t.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部 fixed 操作栏(按状态分组) -->
    <view v-if="detail" class="detail__bar">
      <!-- 待支付:左金额 + 右支付按钮(中间放取消图标按钮) -->
      <template v-if="isWaitPay">
        <view class="detail__bar-info">
          <text class="detail__bar-label">应付总额</text>
          <text class="detail__bar-amount">¥{{ formatYuan(detail.payableAmount) }}</text>
        </view>
        <view v-if="detail.actions.includes('cancel')" class="detail__icon-btn" @click="onCancel">
          <SvgIcon name="x" :size="28" color="#5a6275" />
          <text class="detail__icon-btn-label">取消</text>
        </view>
        <button class="detail__bar-cta detail__bar-cta--pay" :disabled="paying || countdown === 0" @click="onPay">
          {{ paying ? '支付中…' : countdown === 0 ? '已超时' : '立即支付' }}
        </button>
      </template>

      <!-- 进行中:次按钮组 + 主按钮"查看轨迹" -->
      <template v-else-if="detail.actions.includes('track')">
        <view v-if="detail.actions.includes('cancel')" class="detail__icon-btn" @click="onCancel">
          <SvgIcon name="x" :size="28" color="#5a6275" />
          <text class="detail__icon-btn-label">取消</text>
        </view>
        <view v-if="detail.actions.includes('remark')" class="detail__icon-btn" @click="onRemark">
          <SvgIcon name="file-edit" :size="28" color="#5a6275" />
          <text class="detail__icon-btn-label">备注</text>
        </view>
        <view
          v-if="detail.actions.includes('urgent')"
          class="detail__icon-btn detail__icon-btn--accent"
          @click="onUrgent"
        >
          <SvgIcon name="rocket" :size="28" color="#fff" />
          <text class="detail__icon-btn-label">加急</text>
        </view>
        <view class="detail__icon-btn" @click="goAfterSales">
          <SvgIcon name="life-buoy" :size="28" color="#5a6275" />
          <text class="detail__icon-btn-label">售后</text>
        </view>
        <button class="detail__bar-cta detail__bar-cta--primary" @click="goTrack">查看轨迹</button>
      </template>

      <!-- 已完成 / 已取消:仅售后单按钮 -->
      <template v-else>
        <view class="detail__bar-info">
          <text class="detail__bar-label">{{ statusLabel(detail.status) }}</text>
          <text class="detail__bar-summary">订单 {{ detail.orderNo }}</text>
        </view>
        <button class="detail__bar-cta detail__bar-cta--ghost" @click="goAfterSales">申请售后</button>
      </template>
    </view>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  padding: 0 0 calc(env(safe-area-inset-bottom, 0rpx) + 200rpx);
  background: #f5f6f8;
}
.detail__empty {
  padding: 160rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 26rpx;
}

/* Hero — 默认蓝紫,按状态切色 */
.detail__hero {
  position: relative;
  z-index: 1;
  padding: 56rpx 32rpx 72rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.detail__hero--warn {
  background: linear-gradient(135deg, #ff7a45 0%, #ffb020 100%);
}
.detail__hero--ok {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}
.detail__hero--mute {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
}
.detail__type-tag {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
  letter-spacing: 1rpx;
}
.detail__status {
  font-size: 48rpx;
  font-weight: 800;
  margin-top: 8rpx;
}
.detail__order-no {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}
.detail__countdown {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}
.detail__countdown-icon {
  font-size: 24rpx;
}
.detail__countdown--expired {
  background: rgba(255, 255, 255, 0.28);
  font-weight: 700;
}

/* 卡片 */
.detail__card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
/* 第一个 card(订单信息)切入 hero */
.detail__hero + .detail__card {
  margin-top: -36rpx;
  position: relative;
  z-index: 2;
}
.detail__card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 20rpx;
}

.detail__info {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.detail__info:last-child {
  border-bottom: none;
}
.detail__info-icon {
  font-size: 28rpx;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.detail__info-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.detail__info-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.detail__info-value {
  font-size: 26rpx;
  color: #172033;
  line-height: 1.4;
}

.detail__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.detail__row:last-child {
  border-bottom: none;
}
.detail__row--total {
  margin-top: 8rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid rgba(31, 41, 55, 0.08);
  border-bottom: none;
}
.detail__row-label {
  font-size: 26rpx;
  color: #5a6275;
}
.detail__row-value {
  font-size: 28rpx;
  color: #172033;
  font-weight: 600;
}
.detail__row--total .detail__row-label {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.detail__row-pay {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff4d4f;
}

.detail__timeline {
  padding-left: 4rpx;
}
.detail__tl-item {
  position: relative;
  padding: 12rpx 0 12rpx 32rpx;
}
.detail__tl-dot {
  position: absolute;
  left: 0;
  top: 22rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #c5c9d2;
  border: 3rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(31, 41, 55, 0.1);
}
.detail__tl-dot--active {
  background: #5b5ff8;
  box-shadow: 0 0 0 4rpx rgba(91, 95, 248, 0.18);
}
.detail__tl-line {
  position: absolute;
  left: 7rpx;
  top: 36rpx;
  bottom: -12rpx;
  width: 2rpx;
  background: rgba(31, 41, 55, 0.08);
}
.detail__tl-main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.detail__tl-event {
  font-size: 26rpx;
  color: #172033;
  font-weight: 600;
}
.detail__tl-time {
  font-size: 22rpx;
  color: #8a94a6;
}

/* ========== 取件码 / 收货码 卡片 ========== */
.detail__codes {
  margin: 24rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.detail__code-card {
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.detail__code-card--pickup {
  background: linear-gradient(135deg, #fff8e1 0%, #ffe7b3 100%);
}
.detail__code-card--delivery {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
}
.detail__code-head {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
}
.detail__code-icon {
  font-size: 44rpx;
  flex-shrink: 0;
}
.detail__code-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}
.detail__code-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.detail__code-tip {
  font-size: 20rpx;
  color: #5a6275;
  line-height: 1.3;
}
.detail__code-num {
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: 8rpx;
  color: #172033;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  flex-shrink: 0;
}

/* ========== 底部 fixed 操作栏 ========== */
.detail__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 16rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.04);
  z-index: 50;
}
.detail__bar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}
.detail__bar-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.detail__bar-amount {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff4d4f;
  line-height: 1.2;
}
.detail__bar-summary {
  font-size: 22rpx;
  color: #c5c9d2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 图标式次按钮(垂直堆叠 emoji + 文字) */
.detail__icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  min-width: 96rpx;
  padding: 8rpx 12rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.detail__icon-btn:active {
  background: rgba(31, 41, 55, 0.04);
}
.detail__icon-btn-glyph {
  font-size: 32rpx;
  line-height: 1;
}
.detail__icon-btn-label {
  font-size: 20rpx;
  color: #5a6275;
}
.detail__icon-btn--accent .detail__icon-btn-label {
  color: #ff7a45;
  font-weight: 700;
}

/* 主 CTA 按钮 */
.detail__bar-cta {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 22rpx 44rpx;
  line-height: 1;
}
.detail__bar-cta--pay {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  box-shadow: 0 12rpx 28rpx rgba(255, 122, 69, 0.3);
}
.detail__bar-cta--pay[disabled] {
  background: #c5c9d2;
  box-shadow: none;
  opacity: 0.7;
}
.detail__bar-cta--primary {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  box-shadow: 0 12rpx 28rpx rgba(91, 95, 248, 0.3);
}
.detail__bar-cta--ghost {
  background: #fff;
  color: #172033;
  border: 1rpx solid rgba(31, 41, 55, 0.12);
}
</style>
