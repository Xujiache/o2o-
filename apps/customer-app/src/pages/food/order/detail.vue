<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { cancelOrder, getOrderDetail, type OrderDetailVo } from '@/api/food-orders';
import { formatYuan } from '@/utils/format-price';

const orderId = ref('');
const detail = ref<OrderDetailVo | null>(null);
const loading = ref(false);
const cancelOpen = ref(false);
const cancelReason = ref('');
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '等商家接单',
  MERCHANT_ACCEPTED: '商家已接单',
  PREPARING: '商家备餐中',
  READY_FOR_PICKUP: '待骑手取餐',
  RIDER_ASSIGNED: '骑手已接单',
  PICKED_UP: '已取餐',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  AFTER_SALE: '售后处理中',
};

const TRACK_STATUSES = ['RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERING'];

const canCancel = computed<boolean>(() => detail.value?.actions?.includes('cancel') ?? false);
const canPay = computed<boolean>(() => detail.value?.actions?.includes('pay') ?? false);
const canReview = computed<boolean>(() => detail.value?.actions?.includes('review') ?? false);
const canTrack = computed<boolean>(() => !!detail.value && TRACK_STATUSES.includes(detail.value.status));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getOrderDetail(orderId.value);
    if (r.code === '0' && r.data) detail.value = r.data;
    else uni.showToast({ title: r.message ?? '加载失败', icon: 'none' });
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
    uni.showToast({ title: '已取消', icon: 'success' });
    void load();
  } else {
    uni.showToast({ title: r.message ?? '取消失败', icon: 'none' });
  }
}

function gotoPay(): void {
  uni.navigateTo({ url: '/pages/payment/cashier?orderId=' + orderId.value });
}
function gotoTrack(): void {
  uni.navigateTo({ url: '/pages/food/order/track?orderId=' + orderId.value });
}
function gotoReview(): void {
  uni.navigateTo({ url: '/pages/food/review/submit?orderId=' + orderId.value });
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

function fmtTimeline(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  <view class="od">
    <view v-if="loading && !detail" class="od__loading">加载中…</view>

    <template v-else-if="detail">
      <!-- 状态卡 -->
      <view class="od__status-card">
        <view class="od__status-text">{{ STATUS_LABEL[detail.status] ?? detail.status }}</view>
        <view v-if="detail.status === 'WAIT_PAY' && countdown > 0" class="od__countdown">
          剩余支付 {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}
        </view>
        <view class="od__order-no">订单号 {{ detail.orderNo }}</view>
      </view>

      <!-- 商品 -->
      <view class="od__card">
        <view class="od__card-h">商品明细</view>
        <view v-for="(it, idx) in detail.items || []" :key="it.skuId + idx" class="od__line">
          <text class="od__line-name">
            {{ it.name }}<text v-if="it.spec" class="od__line-spec">{{ it.spec }}</text>
          </text>
          <text class="od__line-qty">× {{ it.quantity }}</text>
          <text class="od__line-sub">¥{{ formatYuan(it.subTotal) }}</text>
        </view>
      </view>

      <!-- 金额 -->
      <view class="od__card">
        <view class="od__amt"
          ><text>商品金额</text><text>¥{{ formatYuan(detail.goodsAmount) }}</text></view
        >
        <view class="od__amt"
          ><text>配送费</text><text>¥{{ formatYuan(detail.deliveryFee) }}</text></view
        >
        <view v-if="Number(detail.discountAmount) > 0" class="od__amt">
          <text>优惠</text><text>-¥{{ formatYuan(detail.discountAmount) }}</text>
        </view>
        <view class="od__amt od__amt--total">
          <text>实付</text><text class="od__amt-pay">¥{{ formatYuan(detail.payableAmount) }}</text>
        </view>
      </view>

      <!-- 时间线 -->
      <view v-if="(detail.timeline || []).length > 0" class="od__card">
        <view class="od__card-h">订单进度</view>
        <view v-for="(t, i) in detail.timeline" :key="i" class="od__t-row">
          <view class="od__t-dot" :class="{ 'od__t-dot--last': i === detail.timeline.length - 1 }" />
          <view class="od__t-main">
            <text class="od__t-name">{{ STATUS_LABEL[t.toStatus] ?? t.toStatus }}</text>
            <text class="od__t-time">{{ fmtTimeline(t.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作栏 -->
      <view v-if="canPay || canCancel || canTrack || canReview" class="od__actions">
        <view v-if="canCancel" class="od__btn od__btn--ghost" @tap="cancelOpen = true">取消订单</view>
        <view v-if="canTrack" class="od__btn od__btn--ghost" @tap="gotoTrack">查看轨迹</view>
        <view v-if="canReview" class="od__btn od__btn--primary" @tap="gotoReview">去评价</view>
        <view v-if="canPay" class="od__btn od__btn--primary" @tap="gotoPay">去支付</view>
      </view>

      <!-- 取消对话框 -->
      <view v-if="cancelOpen" class="od__dialog">
        <view class="od__mask" @tap="cancelOpen = false" />
        <view class="od__modal">
          <view class="od__modal-h">取消订单</view>
          <textarea
            class="od__modal-textarea"
            v-model="cancelReason"
            placeholder="请填写取消原因(必填)"
            maxlength="255"
          />
          <view class="od__modal-btns">
            <view class="od__btn od__btn--ghost" @tap="cancelOpen = false">再想想</view>
            <view class="od__btn od__btn--danger" @tap="confirmCancel">确认取消</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.od {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.od__loading {
  text-align: center;
  padding: 120rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
}

/* 状态卡 */
.od__status-card {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 18rpx 40rpx rgba(255, 107, 53, 0.24);
}
.od__status-text {
  font-size: 40rpx;
  font-weight: 700;
}
.od__countdown {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.92);
}
.od__order-no {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}

/* 卡片公共 */
.od__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.od__card-h {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}

/* 商品行 */
.od__line {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
  font-size: 26rpx;
}
.od__line:last-child {
  border-bottom: 0;
}
.od__line-name {
  flex: 1;
  color: #172033;
}
.od__line-spec {
  color: #8a94a6;
  font-size: 22rpx;
  margin-left: 8rpx;
}
.od__line-qty {
  color: #8a94a6;
  font-size: 24rpx;
}
.od__line-sub {
  color: #ff4d4f;
  font-size: 26rpx;
  font-weight: 600;
}

/* 金额 */
.od__amt {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #5a6275;
  padding: 8rpx 0;
}
.od__amt--total {
  margin-top: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  font-size: 30rpx;
  font-weight: 700;
  color: #172033;
}
.od__amt-pay {
  color: #ff4d4f;
  font-size: 36rpx;
}

/* 时间线 */
.od__t-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
  position: relative;
}
.od__t-row::before {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 24rpx;
  bottom: -12rpx;
  width: 2rpx;
  background: rgba(255, 107, 53, 0.18);
}
.od__t-row:last-child::before {
  display: none;
}
.od__t-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: rgba(255, 107, 53, 0.2);
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(255, 107, 53, 0.4);
  margin-top: 8rpx;
  flex-shrink: 0;
}
.od__t-dot--last {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  box-shadow:
    0 0 0 1rpx #ff7a45,
    0 0 12rpx rgba(255, 107, 53, 0.4);
}
.od__t-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.od__t-name {
  font-size: 26rpx;
  color: #172033;
  font-weight: 600;
}
.od__t-time {
  font-size: 22rpx;
  color: #8a94a6;
}

/* 操作栏 */
.od__actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.od__btn {
  flex: 1;
  text-align: center;
  border-radius: 999rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.od__btn--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.od__btn--primary {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
}
.od__btn--danger {
  background: #ff4d4f;
  color: #fff;
}

/* 对话框 */
.od__dialog {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.od__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}
.od__modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  width: 84%;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.24);
}
.od__modal-h {
  font-size: 32rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}
.od__modal-textarea {
  width: 100%;
  min-height: 160rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  padding: 18rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.od__modal-btns {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}
</style>
