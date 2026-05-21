<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { getMerchantOrderDetail, type MerchantOrderDetailVo } from '@/api/merchant-orders';
import { useOrderStore } from '@/stores/order';
import { labelOrderActor, labelOrderStatus } from '@/utils/food-order-status';

const orderStore = useOrderStore();
const orderId = ref('');
const detail = ref<MerchantOrderDetailVo | null>(null);
const loading = ref(false);
const submitting = ref(false);
const showReject = ref(false);
const showReady = ref(false);
const rejectReason = ref('');
const readyRemark = ref('');

const allowedActions = computed<string[]>(() => detail.value?.allowedMerchantActions ?? []);
const canAccept = computed(() => allowedActions.value.includes('ACCEPT'));
const canReject = computed(() => allowedActions.value.includes('REJECT'));
const canReady = computed(() => allowedActions.value.includes('READY'));

/** 仅在后端返回了至少一个真实坐标(store/delivery/riderLocation)时才渲染地图，
 *  避免默认 116.4/39.9(天安门)误导商家。零坐标视为缺失。 */
function isRealPoint(p?: { lng: number; lat: number } | null): boolean {
  return !!p && (Number(p.lng) !== 0 || Number(p.lat) !== 0);
}
const hasMap = computed(() => {
  const map = detail.value?.map;
  return !!map && (isRealPoint(map.store) || isRealPoint(map.delivery) || isRealPoint(map.riderLocation));
});

const mapCenter = computed(() => {
  const map = detail.value?.map;
  // 兜底 0,0：仅在 hasMap=false 时使用，此时 <map> 不会渲染。
  return map?.riderLocation ?? map?.delivery ?? map?.store ?? { lng: 0, lat: 0 };
});

const mapMarkers = computed(() => {
  const map = detail.value?.map;
  if (!map) return [];
  const markers = [
    {
      id: 1,
      latitude: map.store.lat,
      longitude: map.store.lng,
      title: '商家位置',
      callout: { content: '商家', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    },
  ];
  if (map.delivery) {
    markers.push({
      id: 2,
      latitude: map.delivery.lat,
      longitude: map.delivery.lng,
      title: '收货位置',
      callout: { content: '收货', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    });
  }
  if (map.riderLocation) {
    markers.push({
      id: 3,
      latitude: map.riderLocation.lat,
      longitude: map.riderLocation.lng,
      title: '骑手实时位置',
      callout: { content: '骑手', display: 'ALWAYS', color: '#172033', fontSize: 12 },
    });
  }
  return markers;
});

const mapPolyline = computed(() => {
  const map = detail.value?.map;
  if (!map?.delivery) return [];
  return [
    {
      points: [
        { latitude: map.store.lat, longitude: map.store.lng },
        { latitude: map.delivery.lat, longitude: map.delivery.lng },
      ],
      color: '#2e9c5d',
      width: 4,
      dottedLine: true,
    },
  ];
});

function fmtYuan(cents: string | number): string {
  return `${(Number(cents || 0) / 100).toFixed(2)} 元`;
}

function fmtTime(ms: number | null | undefined): string {
  if (!ms) return '--';
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const r = await getMerchantOrderDetail(orderId.value);
    if (r.code === '0' && r.data) {
      detail.value = r.data;
    } else {
      uni.showToast({ title: r.message ?? '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function accept(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.accept(orderId.value);
    uni.showToast({ title: ok ? '已接单' : '操作失败', icon: ok ? 'success' : 'none' });
    if (ok) await load();
  } finally {
    submitting.value = false;
  }
}

async function reject(): Promise<void> {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请填写拒单原因', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await orderStore.reject(orderId.value, rejectReason.value.trim());
    if (ok) {
      showReject.value = false;
      rejectReason.value = '';
      uni.showToast({ title: '已拒单', icon: 'success' });
      await load();
    }
  } finally {
    submitting.value = false;
  }
}

async function markReady(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.markReady(orderId.value, readyRemark.value || undefined);
    if (ok) {
      showReady.value = false;
      readyRemark.value = '';
      uni.showToast({ title: '已出餐', icon: 'success' });
      await load();
    }
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});

onMounted(load);
</script>

<template>
  <view class="order">
    <view v-if="loading && !detail" class="order__loading">加载中...</view>

    <template v-else-if="detail">
      <view class="hero">
        <view>
          <text class="hero__status">{{ labelOrderStatus(detail.status) }}</text>
          <text class="hero__sub">订单号 {{ detail.orderNo }}</text>
        </view>
        <view class="hero__amount">{{ fmtYuan(detail.payableAmountCents) }}</view>
      </view>

      <view v-if="hasMap" class="map-card">
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
          <text>商家位置</text>
          <text>收货位置</text>
          <text>{{ detail.map.riderLocation ? '骑手实时位置' : '暂无骑手位置' }}</text>
        </view>
      </view>

      <view v-if="detail.address" class="card">
        <view class="card-title">收货信息</view>
        <view class="address-row">
          <text class="address-row__name">{{ detail.address.consignee }}</text>
          <text class="address-row__mobile">{{ detail.address.mobileMasked }}</text>
        </view>
        <text class="address-detail">{{ detail.address.detail }}</text>
      </view>

      <view v-if="detail.userRemark" class="card card--note">
        <view class="card-title">客户备注</view>
        <text class="note">{{ detail.userRemark }}</text>
      </view>

      <view class="card">
        <view class="card-title">商品明细</view>
        <view v-for="(item, index) in detail.items" :key="item.skuId + index" class="line">
          <view class="line__main">
            <text class="line__name">{{ item.name }}</text>
            <text v-if="item.spec && item.spec !== '默认'" class="line__spec">{{ item.spec }}</text>
          </view>
          <text class="line__qty">x{{ item.quantity }}</text>
          <text class="line__price">{{ fmtYuan(item.subTotalCents) }}</text>
        </view>
      </view>

      <view class="card">
        <view class="amount-row"
          ><text>商品金额</text><text>{{ fmtYuan(detail.goodsAmountCents) }}</text></view
        >
        <view class="amount-row"
          ><text>配送费</text><text>{{ fmtYuan(detail.deliveryFeeCents) }}</text></view
        >
        <view v-if="Number(detail.discountAmountCents) > 0" class="amount-row">
          <text>优惠</text><text>-{{ fmtYuan(detail.discountAmountCents) }}</text>
        </view>
        <view class="amount-row amount-row--total"
          ><text>实收</text><text>{{ fmtYuan(detail.payableAmountCents) }}</text></view
        >
      </view>

      <view v-if="detail.timeline.length" class="card">
        <view class="card-title">订单进度</view>
        <view v-for="(item, index) in detail.timeline" :key="index" class="timeline">
          <view class="timeline__dot" :class="{ 'timeline__dot--active': index === detail.timeline.length - 1 }" />
          <view class="timeline__main">
            <text class="timeline__title">{{ labelOrderStatus(item.toStatus) }}</text>
            <text class="timeline__time">{{ fmtTime(item.at) }} · {{ labelOrderActor(item.actor) }}</text>
            <text v-if="item.reason" class="timeline__reason">{{ item.reason }}</text>
          </view>
        </view>
      </view>

      <view v-if="canAccept || canReject || canReady" class="actions">
        <button v-if="canReject" class="actions__btn actions__btn--ghost" @tap="showReject = true">拒单</button>
        <button v-if="canAccept" class="actions__btn actions__btn--primary" :loading="submitting" @tap="accept">
          接单
        </button>
        <button v-if="canReady" class="actions__btn actions__btn--primary" @tap="showReady = true">出餐</button>
      </view>
    </template>

    <view v-if="showReject" class="dialog">
      <view class="dialog__mask" @tap="showReject = false" />
      <view class="dialog__panel">
        <view class="dialog__title">拒单原因</view>
        <textarea
          v-model="rejectReason"
          class="dialog__textarea"
          placeholder="请填写原因，将同步给客户"
          maxlength="255"
        />
        <view class="dialog__actions">
          <button class="actions__btn actions__btn--ghost" @tap="showReject = false">取消</button>
          <button class="actions__btn actions__btn--danger" :loading="submitting" @tap="reject">确认拒单</button>
        </view>
      </view>
    </view>

    <view v-if="showReady" class="dialog">
      <view class="dialog__mask" @tap="showReady = false" />
      <view class="dialog__panel">
        <view class="dialog__title">出餐确认</view>
        <textarea v-model="readyRemark" class="dialog__textarea" placeholder="可填写给骑手的取餐提示" maxlength="255" />
        <view class="dialog__actions">
          <button class="actions__btn actions__btn--ghost" @tap="showReady = false">取消</button>
          <button class="actions__btn actions__btn--primary" :loading="submitting" @tap="markReady">确认出餐</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.order {
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
  background: #fff;
  box-sizing: border-box;
}
.order__loading {
  padding: 160rpx 0;
  text-align: center;
  color: var(--text-muted);
}
.hero {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 34rpx 30rpx;
  border-radius: 24rpx;
  background: #172033;
  color: #fff;
  box-shadow: 0 18rpx 42rpx rgba(23, 32, 51, 0.18);
}
.hero__status,
.hero__amount {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}
.hero__sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}
.hero__amount {
  align-self: flex-start;
  white-space: nowrap;
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
.address-row {
  display: flex;
  gap: 16rpx;
  align-items: baseline;
}
.address-row__name {
  color: var(--text-primary);
  font-size: 30rpx;
  font-weight: 700;
}
.address-row__mobile,
.address-detail,
.note {
  color: var(--text-secondary);
  font-size: 26rpx;
  line-height: 1.5;
}
.address-detail {
  display: block;
  margin-top: 8rpx;
}
.card--note {
  border: 2rpx solid rgba(255, 122, 69, 0.18);
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
  background: rgba(255, 122, 69, 0.18);
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
  box-shadow: 0 0 0 8rpx rgba(255, 122, 69, 0.14);
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
