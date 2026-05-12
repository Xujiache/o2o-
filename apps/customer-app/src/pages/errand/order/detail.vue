<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { cancelErrandOrder, remarkErrandOrder, urgentErrandOrder } from '@/api/errand-orders';
import { prepay, simulatePayCallback } from '@/api/food-payments';
import { getErrandTrack, type ErrandTrackVo } from '@/api/errand-track';
import { useErrandOrderStore } from '@/stores/errand-order';
import { eventLabel, statusLabel, typeLabel } from '@/utils/errand-status';
import { formatYuan } from '@/utils/format-price';

const store = useErrandOrderStore();
const detail = ref(store.detail);
const track = ref<ErrandTrackVo | null>(null);
const orderId = ref('');
const paying = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const isWaitPay = computed<boolean>(() => detail.value?.status === 'WAIT_PAY');
const canPay = computed<boolean>(() => isWaitPay.value && (detail.value?.actions.includes('pay') ?? false));

const pickupPoint = computed(() => {
  const p = track.value?.trackPoints?.[0];
  if (p) return { lng: p.lng, lat: p.lat };
  const addr = detail.value?.pickupAddressDetail as { lng?: number; lat?: number } | null | undefined;
  return addr?.lng != null && addr?.lat != null ? { lng: Number(addr.lng), lat: Number(addr.lat) } : null;
});
const deliveryPoint = computed(() => {
  const points = track.value?.trackPoints ?? [];
  const p = points[points.length - 1];
  if (p) return { lng: p.lng, lat: p.lat };
  const addr = detail.value?.deliveryAddressDetail as { lng?: number; lat?: number } | null | undefined;
  return addr?.lng != null && addr?.lat != null ? { lng: Number(addr.lng), lat: Number(addr.lat) } : null;
});
const mapCenter = computed(
  () => track.value?.riderLocation ?? deliveryPoint.value ?? pickupPoint.value ?? { lng: 116.4, lat: 39.9 },
);
const mapMarkers = computed(() => {
  const markers = [];
  if (pickupPoint.value) {
    markers.push({
      id: 1,
      latitude: pickupPoint.value.lat,
      longitude: pickupPoint.value.lng,
      title: '取货位置',
      callout: { content: '取货', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    });
  }
  if (deliveryPoint.value) {
    markers.push({
      id: 2,
      latitude: deliveryPoint.value.lat,
      longitude: deliveryPoint.value.lng,
      title: '收货位置',
      callout: { content: '收货', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    });
  }
  if (track.value?.riderLocation) {
    markers.push({
      id: 3,
      latitude: track.value.riderLocation.lat,
      longitude: track.value.riderLocation.lng,
      title: '骑手实时位置',
      callout: { content: '骑手', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    });
  }
  return markers;
});
const mapPolyline = computed(() => {
  const points = track.value?.trackPoints ?? [];
  if (points.length < 2) return [];
  return [
    {
      points: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      color: '#5b5ff8',
      width: 4,
    },
  ];
});

function getQueryOrderId(): string {
  const pages = (getCurrentPages?.() ?? []) as Array<{ options?: { orderId?: string } }>;
  return pages[pages.length - 1]?.options?.orderId ?? '';
}

async function load(): Promise<void> {
  orderId.value = getQueryOrderId();
  if (!orderId.value) return;
  const [detailVo, trackRes] = await Promise.all([
    store.loadDetail(orderId.value),
    getErrandTrack(orderId.value).catch(() => null),
  ]);
  detail.value = detailVo;
  if (trackRes?.code === '0' && trackRes.data) track.value = trackRes.data;
  startCountdown();
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

const countdownLabel = computed<string>(
  () => `${Math.floor(countdown.value / 60)}:${String(countdown.value % 60).padStart(2, '0')}`,
);

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function onCancel(): Promise<void> {
  const res = await uni.showModal({ title: '取消订单', content: '确认取消当前跑腿订单吗？' });
  if (!res.confirm) return;
  await cancelErrandOrder(orderId.value, 'USER_CANCEL');
  await load();
}

async function onUrgent(): Promise<void> {
  const res = await uni.showActionSheet({ itemList: ['加急 5 元', '特急 10 元'] });
  if (res.errMsg?.endsWith('cancel') || !detail.value) return;
  const level = res.tapIndex === 0 ? 'fast' : 'express';
  const fee = res.tapIndex === 0 ? 500 : 1000;
  const r = await urgentErrandOrder(orderId.value, { urgentLevel: level, confirmFee: fee });
  if (r.code !== '0') uni.showToast({ title: r.message ?? '加急失败', icon: 'none' });
  await load();
}

async function onRemark(): Promise<void> {
  const res = await (
    uni.showModal as unknown as (args: Record<string, unknown>) => Promise<{ confirm: boolean; content?: string }>
  )({
    title: '补充备注',
    editable: true,
    placeholderText: '请输入备注',
  });
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
    const r = await prepay({ bizType: 'ERRAND', orderId: orderId.value, payChannel: 'wxpay' });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '支付下单失败', icon: 'none' });
      return;
    }
    await simulatePayCallback('wxpay', r.data.payOrderNo, Number(detail.value.payableAmount));
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } finally {
    paying.value = false;
  }
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
    <view v-if="!detail" class="detail__loading">加载中...</view>

    <template v-else>
      <view class="hero">
        <text class="hero__type">{{ typeLabel(detail.typeCode) }}</text>
        <text class="hero__status">{{ statusLabel(detail.status) }}</text>
        <text class="hero__order">订单号 {{ detail.orderNo }}</text>
        <text v-if="isWaitPay && countdown > 0" class="hero__countdown">剩余支付 {{ countdownLabel }}</text>
      </view>

      <view class="map-card">
        <view class="card-title">配送地图</view>
        <map
          class="map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="mapMarkers"
          :polyline="mapPolyline"
          :scale="14"
        />
        <view class="map-card__legend">
          <text>取货位置</text>
          <text>收货位置</text>
          <text>{{ track?.riderLocation ? '骑手实时位置' : '暂无骑手位置' }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">地址信息</view>
        <view class="info-row"
          ><text>取货位置</text><text>{{ detail.pickupAddress ?? '无需取货地址' }}</text></view
        >
        <view class="info-row"
          ><text>收货位置</text><text>{{ detail.deliveryAddress }}</text></view
        >
        <view v-if="detail.itemDesc" class="info-row"
          ><text>物品</text><text>{{ detail.itemDesc }}</text></view
        >
        <view v-if="detail.taskDesc" class="info-row"
          ><text>任务</text><text>{{ detail.taskDesc }}</text></view
        >
      </view>

      <view v-if="detail.pickupCode || detail.deliveryCode" class="code-grid">
        <view v-if="detail.pickupCode" class="code-card">
          <text class="code-card__label">取货码</text>
          <text class="code-card__value">{{ detail.pickupCode }}</text>
        </view>
        <view v-if="detail.deliveryCode" class="code-card">
          <text class="code-card__label">收货码</text>
          <text class="code-card__value">{{ detail.deliveryCode }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">费用明细</view>
        <view class="amount-row"
          ><text>基础费</text><text>{{ formatYuan(detail.baseFee) }} 元</text></view
        >
        <view class="amount-row"
          ><text>距离费</text><text>{{ formatYuan(detail.distanceFee) }} 元</text></view
        >
        <view class="amount-row"
          ><text>加急/重量费</text><text>{{ formatYuan(detail.urgentFee) }} 元</text></view
        >
        <view class="amount-row amount-row--total"
          ><text>应付</text><text>{{ formatYuan(detail.payableAmount) }} 元</text></view
        >
      </view>

      <view class="card">
        <view class="card-title">订单进度</view>
        <view v-for="(item, index) in detail.timeline" :key="item.createdAt + index" class="timeline">
          <view class="timeline__dot" :class="{ 'timeline__dot--active': index === 0 }" />
          <view class="timeline__main">
            <text class="timeline__title">{{ eventLabel(item.eventType) }}</text>
            <text class="timeline__time">{{ fmtTime(item.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view class="actions">
        <template v-if="isWaitPay">
          <button v-if="detail.actions.includes('cancel')" class="actions__btn actions__btn--ghost" @tap="onCancel">
            取消
          </button>
          <button
            class="actions__btn actions__btn--primary"
            :disabled="!canPay || paying"
            :loading="paying"
            @tap="onPay"
          >
            {{ paying ? '支付中...' : '立即支付' }}
          </button>
        </template>
        <template v-else>
          <button v-if="detail.actions.includes('remark')" class="actions__btn actions__btn--ghost" @tap="onRemark">
            备注
          </button>
          <button v-if="detail.actions.includes('urgent')" class="actions__btn actions__btn--ghost" @tap="onUrgent">
            加急
          </button>
          <button class="actions__btn actions__btn--primary" @tap="goAfterSales">售后</button>
        </template>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
  background: #fff;
  box-sizing: border-box;
}
.detail__loading {
  padding: 160rpx 0;
  text-align: center;
  color: #8a94a6;
}
.hero {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 34rpx 30rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  box-shadow: 0 18rpx 42rpx rgba(91, 95, 248, 0.22);
}
.hero__type,
.hero__order,
.hero__countdown {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.86);
}
.hero__status {
  font-size: 40rpx;
  font-weight: 800;
}
.card,
.map-card,
.code-card {
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 28rpx rgba(31, 41, 55, 0.07);
}
.card-title {
  margin-bottom: 16rpx;
  color: #172033;
  font-size: 28rpx;
  font-weight: 800;
}
.map {
  width: 100%;
  height: 360rpx;
  border-radius: 18rpx;
  overflow: hidden;
}
.map-card__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}
.map-card__legend text {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #f5f6f8;
  color: #5a6275;
  font-size: 22rpx;
}
.info-row,
.amount-row {
  display: flex;
  justify-content: space-between;
  gap: 22rpx;
  padding: 12rpx 0;
  color: #5a6275;
  font-size: 26rpx;
}
.info-row text:last-child,
.amount-row text:last-child {
  flex: 1;
  color: #172033;
  text-align: right;
}
.amount-row--total {
  margin-top: 10rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.08);
  color: #172033;
  font-size: 32rpx;
  font-weight: 800;
}
.code-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.code-card {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.code-card__label {
  color: #8a94a6;
  font-size: 22rpx;
}
.code-card__value {
  color: #172033;
  font-family: Menlo, Consolas, monospace;
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}
.timeline {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 0;
}
.timeline__dot {
  width: 22rpx;
  height: 22rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: #c5c9d2;
  flex-shrink: 0;
}
.timeline__dot--active {
  background: #5b5ff8;
  box-shadow: 0 0 0 8rpx rgba(91, 95, 248, 0.14);
}
.timeline__main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.timeline__title {
  color: #172033;
  font-size: 26rpx;
  font-weight: 700;
}
.timeline__time {
  color: #8a94a6;
  font-size: 22rpx;
}
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 14rpx;
  padding: 18rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 18rpx);
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.actions__btn {
  flex: 1;
  height: 82rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 800;
}
.actions__btn--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.actions__btn--primary {
  background: #5b5ff8;
  color: #fff;
}
</style>
