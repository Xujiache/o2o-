<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { cancelOrder, getOrderDetail, type OrderDetailVo } from '@/api/food-orders';
import { getOrderTrack, type TrackVo } from '@/api/food-track';
import { formatYuan } from '@/utils/format-price';
import { actorLabel, foodStatusLabel } from '@/utils/food-order-status';
import NavBar from '@/components/common/NavBar.vue';

const orderId = ref('');
const detail = ref<OrderDetailVo | null>(null);
const track = ref<TrackVo | null>(null);
const loading = ref(false);
const cancelOpen = ref(false);
const cancelReason = ref('');
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const canCancel = computed<boolean>(() => detail.value?.actions?.includes('cancel') ?? false);
const canPay = computed<boolean>(() => detail.value?.actions?.includes('pay') ?? false);
const canReview = computed<boolean>(() => detail.value?.actions?.includes('review') ?? false);

/** 优先骑手实时位置 → 收货点 → 起点;全部缺失则返回 null,模板隐藏地图改显文字 */
const mapCenter = computed<{ lng: number; lat: number } | null>(
  () => track.value?.riderLocation ?? track.value?.end ?? track.value?.start ?? null,
);
const hasMapCenter = computed<boolean>(() => mapCenter.value != null);
const mapMarkers = computed(() => {
  if (!track.value) return [];
  const markers = [
    {
      id: 1,
      latitude: track.value.start.lat,
      longitude: track.value.start.lng,
      title: '商家位置',
      callout: { content: '商家', display: 'ALWAYS', color: 'var(--text-primary)', fontSize: 12 },
    },
    {
      id: 2,
      latitude: track.value.end.lat,
      longitude: track.value.end.lng,
      title: '收货位置',
      callout: { content: '收货', display: 'ALWAYS', color: 'var(--text-primary)', fontSize: 12 },
    },
  ];
  if (track.value.riderLocation) {
    markers.push({
      id: 3,
      latitude: track.value.riderLocation.lat,
      longitude: track.value.riderLocation.lng,
      title: '骑手实时位置',
      callout: { content: '骑手', display: 'ALWAYS', color: 'var(--text-primary)', fontSize: 12 },
    });
  }
  return markers;
});
const mapPolyline = computed(() =>
  track.value
    ? [
        {
          points: [
            { latitude: track.value.start.lat, longitude: track.value.start.lng },
            { latitude: track.value.end.lat, longitude: track.value.end.lng },
          ],
          color: 'var(--brand-primary)',
          width: 4,
          dottedLine: true,
        },
      ]
    : [],
);

const addressText = computed<string>(() => {
  const addr = detail.value?.addressSnapshot as
    | { consignee?: string; mobile?: string; province?: string; city?: string; district?: string; detail?: string }
    | null
    | undefined;
  if (!addr) return '暂无收货地址';
  return [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(' ') || '暂无收货地址';
});

const consigneeText = computed<string>(() => {
  const addr = detail.value?.addressSnapshot as { consignee?: string; mobile?: string } | null | undefined;
  if (!addr?.consignee && !addr?.mobile) return '收货人';
  return `${addr.consignee ?? '收货人'} ${addr.mobile ?? ''}`.trim();
});

const countdownLabel = computed<string>(() => {
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

async function load(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const [detailRes, trackRes] = await Promise.all([
      getOrderDetail(orderId.value),
      getOrderTrack(orderId.value).catch(() => null),
    ]);
    if (detailRes.code === '0' && detailRes.data) detail.value = detailRes.data;
    else uni.showToast({ title: detailRes.message ?? '加载失败', icon: 'none' });
    if (trackRes?.code === '0' && trackRes.data) track.value = trackRes.data;
  } finally {
    loading.value = false;
  }
}

async function confirmCancel(): Promise<void> {
  if (!cancelReason.value.trim()) {
    uni.showToast({ title: '请填写取消原因', icon: 'none' });
    return;
  }
  const r = await cancelOrder(orderId.value, cancelReason.value.trim());
  if (r.code === '0') {
    cancelOpen.value = false;
    cancelReason.value = '';
    uni.showToast({ title: '已取消', icon: 'success' });
    void load();
  } else {
    uni.showToast({ title: r.message ?? '取消失败', icon: 'none' });
  }
}

function gotoPay(): void {
  uni.navigateTo({ url: `/pages/payment/cashier?orderId=${orderId.value}` });
}

function gotoReview(): void {
  uni.navigateTo({ url: `/pages/food/review/submit?orderId=${orderId.value}` });
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

function fmtTime(ms: number | null | undefined): string {
  if (!ms) return '--';
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});

onMounted(() => {
  startCountdown();
  void load();
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
  <view class="detail">
    <NavBar mode="float" color="#ffffff" />
    <view v-if="loading && !detail" class="detail__loading">加载中...</view>

    <template v-else-if="detail">
      <view class="hero">
        <text class="hero__status">{{ foodStatusLabel(detail.status) }}</text>
        <text v-if="detail.status === 'WAIT_PAY' && countdown > 0" class="hero__countdown"
          >剩余支付 {{ countdownLabel }}</text
        >
        <text class="hero__order">订单号 {{ detail.orderNo }}</text>
      </view>

      <view class="map-card">
        <view class="card-title">配送地图</view>
        <map
          v-if="hasMapCenter && mapCenter"
          class="map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="mapMarkers"
          :polyline="mapPolyline"
          :scale="14"
        />
        <view v-else class="map-card__empty">暂无骑手位置</view>
        <view class="map-card__legend">
          <text>商家位置</text>
          <text>收货位置</text>
          <text>{{ track?.riderLocation ? '骑手实时位置' : '暂无骑手位置' }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">收货信息</view>
        <text class="address-name">{{ consigneeText }}</text>
        <text class="address-text">{{ addressText }}</text>
      </view>

      <view class="card">
        <view class="card-title">商品明细</view>
        <view v-for="(item, index) in detail.items || []" :key="item.skuId + index" class="line">
          <view class="line__main">
            <text class="line__name">{{ item.name }}</text>
            <text v-if="item.spec" class="line__spec">{{ item.spec }}</text>
          </view>
          <text class="line__qty">x{{ item.quantity }}</text>
          <text class="line__price">{{ formatYuan(item.subTotal) }} 元</text>
        </view>
      </view>

      <view class="card">
        <view class="amount-row"
          ><text>商品金额</text><text>{{ formatYuan(detail.goodsAmount) }} 元</text></view
        >
        <view class="amount-row"
          ><text>配送费</text><text>{{ formatYuan(detail.deliveryFee) }} 元</text></view
        >
        <view v-if="Number(detail.discountAmount) > 0" class="amount-row">
          <text>优惠</text><text>-{{ formatYuan(detail.discountAmount) }} 元</text>
        </view>
        <view class="amount-row amount-row--total"
          ><text>实付</text><text>{{ formatYuan(detail.payableAmount) }} 元</text></view
        >
      </view>

      <view v-if="(detail.timeline || []).length" class="card">
        <view class="card-title">订单进度</view>
        <view v-for="(item, index) in detail.timeline" :key="index" class="timeline">
          <view class="timeline__dot" :class="{ 'timeline__dot--active': index === detail.timeline.length - 1 }" />
          <view class="timeline__main">
            <text class="timeline__title">{{ foodStatusLabel(item.toStatus) }}</text>
            <text class="timeline__time">{{ fmtTime(item.createdAt) }} · {{ actorLabel(item.actorType) }}</text>
            <text v-if="item.reason" class="timeline__reason">{{ item.reason }}</text>
          </view>
        </view>
      </view>

      <view v-if="canPay || canCancel || canReview" class="actions">
        <button v-if="canCancel" class="actions__btn actions__btn--ghost" @tap="cancelOpen = true">取消订单</button>
        <button v-if="canReview" class="actions__btn actions__btn--primary" @tap="gotoReview">去评价</button>
        <button v-if="canPay" class="actions__btn actions__btn--primary" @tap="gotoPay">去支付</button>
      </view>

      <view v-if="cancelOpen" class="dialog">
        <view class="dialog__mask" @tap="cancelOpen = false" />
        <view class="dialog__panel">
          <view class="dialog__title">取消订单</view>
          <textarea v-model="cancelReason" class="dialog__textarea" placeholder="请填写取消原因" maxlength="255" />
          <view class="dialog__actions">
            <button class="actions__btn actions__btn--ghost" @tap="cancelOpen = false">再想想</button>
            <button class="actions__btn actions__btn--danger" @tap="confirmCancel">确认取消</button>
          </view>
        </view>
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
  color: var(--text-muted);
}
.hero {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 34rpx 30rpx;
  border-radius: 24rpx;
  background: var(--brand-gradient);
  color: #fff;
  box-shadow: 0 18rpx 42rpx rgba(46, 156, 93, 0.22);
}
.hero__status {
  font-size: 40rpx;
  font-weight: 800;
}
.hero__countdown,
.hero__order {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.86);
}
.card,
.map-card {
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 28rpx rgba(31, 41, 55, 0.07);
}
.card-title {
  margin-bottom: 16rpx;
  color: var(--text-primary);
  font-size: 28rpx;
  font-weight: 800;
}
.map {
  width: 100%;
  height: 360rpx;
  border-radius: 18rpx;
  overflow: hidden;
}
.map-card__empty {
  width: 100%;
  height: 360rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #f5f6f8;
  color: var(--text-muted);
  font-size: 26rpx;
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
  color: var(--text-secondary);
  font-size: 22rpx;
}
.address-name,
.address-text {
  display: block;
  color: var(--text-primary);
  font-size: 28rpx;
  font-weight: 700;
}
.address-text {
  margin-top: 8rpx;
  color: var(--text-secondary);
  font-size: 25rpx;
  font-weight: 400;
  line-height: 1.5;
}
.line {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.line:last-child {
  border-bottom: 0;
}
.line__main {
  flex: 1;
  min-width: 0;
}
.line__name {
  color: var(--text-primary);
  font-size: 27rpx;
  font-weight: 700;
}
.line__spec {
  margin-left: 8rpx;
  color: var(--text-muted);
  font-size: 22rpx;
}
.line__qty {
  color: var(--text-muted);
  font-size: 24rpx;
}
.line__price {
  color: #d33;
  font-size: 26rpx;
  font-weight: 800;
}
.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  color: var(--text-secondary);
  font-size: 26rpx;
}
.amount-row--total {
  margin-top: 10rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.08);
  color: var(--text-primary);
  font-size: 32rpx;
  font-weight: 800;
}
.timeline {
  position: relative;
  display: flex;
  gap: 16rpx;
  padding: 12rpx 0;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 34rpx;
  bottom: -12rpx;
  width: 2rpx;
  background: rgba(46, 156, 93, 0.18);
}
.timeline:last-child::before {
  display: none;
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
  background: var(--brand-primary);
  box-shadow: 0 0 0 8rpx rgba(46, 156, 93, 0.14);
}
.timeline__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4rpx;
}
.timeline__title {
  color: var(--text-primary);
  font-size: 26rpx;
  font-weight: 700;
}
.timeline__time,
.timeline__reason {
  color: var(--text-muted);
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
  color: var(--text-secondary);
}
.actions__btn--primary {
  background: var(--brand-primary);
  color: #fff;
}
.actions__btn--danger {
  background: #d33;
  color: #fff;
}
.dialog {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.dialog__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.dialog__panel {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  padding: 30rpx;
  border-radius: 24rpx;
  background: #fff;
}
.dialog__title {
  margin-bottom: 16rpx;
  color: var(--text-primary);
  font-size: 32rpx;
  font-weight: 800;
}
.dialog__textarea {
  width: 100%;
  min-height: 170rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #f5f6f8;
  box-sizing: border-box;
  font-size: 26rpx;
}
.dialog__actions {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}
</style>
